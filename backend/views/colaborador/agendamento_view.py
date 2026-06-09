from datetime import datetime, timedelta

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models.models import Agendamento, ConviteEmail, Horario, ListaEspera, Penalidade
from ...serializers.serializers import AgendamentoSerializer
from ...services import email_service
from ...services.lista_espera_service import notificar_proximo_na_fila
from ..permissions import encerrar_eventos_expirados, liberar_penalidades_expiradas
from .otp_agendamento_view import cache_key_otp


CANCELAMENTO_MINUTOS_ANTECEDENCIA = 30


def _inicio_agendamento(horario):
    inicio = datetime.combine(horario.evento.data, horario.hora_inicio)
    return timezone.make_aware(inicio, timezone.get_current_timezone())


class ReservarHorarioView(APIView):
    """
    POST /api/colaborador/eventos/<evento_id>/horarios/<horario_id>/reservar/
    Reserva um horário para o usuário autenticado.
    Utiliza select_for_update() para evitar dupla reserva concorrente.
    Um usuário pode ter apenas um agendamento ativo por evento.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, evento_id, horario_id):
        # Validar OTP antes de qualquer operação no banco
        otp_informado = (request.data.get('otp') or '').strip()
        if not otp_informado:
            return Response(
                {'erro': 'Informe o código de confirmação enviado ao seu e-mail.', 'requer_otp': True},
                status=status.HTTP_400_BAD_REQUEST,
            )

        key = cache_key_otp(request.user.id, horario_id)
        dados_otp = cache.get(key)

        if not dados_otp:
            return Response(
                {'erro': 'Código expirado. Solicite um novo código e tente novamente.', 'otp_expirado': True},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if dados_otp['tentativas'] >= 3:
            cache.delete(key)
            return Response(
                {'erro': 'Número máximo de tentativas atingido. Solicite um novo código.', 'otp_expirado': True},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        if otp_informado != dados_otp['codigo']:
            dados_otp['tentativas'] += 1
            cache.set(key, dados_otp, timeout=300)
            restantes = 3 - dados_otp['tentativas']
            return Response(
                {
                    'erro': f'Código incorreto. {restantes} tentativa{"s" if restantes != 1 else ""} restante{"s" if restantes != 1 else ""}.',
                    'otp_incorreto': True,
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # OTP válido — invalida para uso único
        cache.delete(key)

        encerrar_eventos_expirados()

        try:
            horario = (
                Horario.objects
                .select_for_update()
                .select_related('evento')
                .get(id=horario_id, evento_id=evento_id, evento__status='publicado')
            )
        except Horario.DoesNotExist:
            return Response(
                {'erro': 'Horário não encontrado ou evento não está disponível.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not horario.disponivel:
            return Response(
                {'erro': 'Este horário está lotado. Escolha outro horário disponível.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Limpa notificações vencidas antes de verificar o bloqueio.
        # Sem isso, se o prazo de 5 min expirou e ninguém cancelou,
        # o slot fica bloqueado indefinidamente com reservado_para_fila=True.
        notificar_proximo_na_fila(horario.id)

        # Recarrega disponivel após possível limpeza de expirados
        horario.refresh_from_db(fields=['vagas_disponiveis'])

        liberar_penalidades_expiradas()

        # Bloqueia reserva direta se outro usuário já foi notificado e está dentro do prazo de confirmação
        reservado_para_outro = ListaEspera.objects.filter(
            horario=horario,
            status='notificado',
        ).exclude(usuario=request.user).exists()

        if reservado_para_outro:
            return Response(
                {
                    'erro': (
                        'Este horário está reservado para confirmação de um colaborador da fila de espera. '
                        'Aguarde — se ele não confirmar em 5 minutos, a vaga será liberada novamente.'
                    ),
                    'reservado_para_fila': True,
                },
                status=status.HTTP_409_CONFLICT,
            )

        # Verificar penalidade ativa por falta em evento anterior
        penalidade = (
            Penalidade.objects
            .select_related('evento_punicao')
            .filter(usuario=request.user, ativa=True)
            .first()
        )
        if penalidade:
            # Primeiro acesso após a falta: registra este evento como o de punição
            if penalidade.evento_punicao is None:
                penalidade.evento_punicao = horario.evento
                penalidade.save(update_fields=['evento_punicao'])
            return Response(
                {
                    'erro': (
                        'Você possui uma penalidade ativa por não comparecimento em evento anterior. '
                        'Seu acesso será liberado após o encerramento do evento atual.'
                    ),
                    'penalidade': True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Bloquear agendamento direto apenas se o usuário está na fila deste slot específico.
        # Permite que o usuário reserve outro slot disponível mesmo estando na fila de um slot lotado.
        na_fila = ListaEspera.objects.filter(
            usuario=request.user,
            horario_id=horario_id,
            status__in=['aguardando', 'notificado'],
        ).exists()

        if na_fila:
            return Response(
                {
                    'erro': (
                        'Você está na fila de espera deste horário. '
                        'Aguarde ser chamado por e-mail — você terá 5 minutos para confirmar sua vaga.'
                    ),
                    'na_fila': True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        agendamento_existente = (
            Agendamento.objects
            .filter(usuario=request.user, horario__evento_id=evento_id, status='confirmado')
            .select_related('horario')
            .first()
        )

        alterar = request.data.get('alterar', False)

        if agendamento_existente and not alterar:
            hi = agendamento_existente.horario.hora_inicio.strftime('%H:%M')
            hf = agendamento_existente.horario.hora_fim.strftime('%H:%M')
            return Response(
                {'erro': f'Você já tem um agendamento confirmado neste evento ({hi} às {hf}). '
                         'Use a opção "Alterar Horário" caso queira trocar.'},
                status=status.HTTP_409_CONFLICT,
            )

        if agendamento_existente and alterar:
            agendamento_existente.status = 'cancelado'
            agendamento_existente.save(update_fields=['status', 'atualizado_em'])

        convite = ConviteEmail.objects.filter(
            usuario=request.user, evento_id=evento_id
        ).first()

        # update_or_create evita IntegrityError quando o usuário cancela e tenta
        # re-agendar o mesmo slot (unique_together usuario+horario existe no banco)
        agendamento, _ = Agendamento.objects.update_or_create(
            usuario=request.user,
            horario=horario,
            defaults={'status': 'confirmado', 'convite': convite},
        )

        # Remove o usuário da fila de espera deste evento (qualquer horário)
        ListaEspera.objects.filter(
            usuario=request.user,
            horario__evento_id=evento_id,
            status__in=['aguardando', 'notificado'],
        ).update(status='expirado')

        email_service.enviar_confirmacao_agendamento(agendamento)

        return Response(AgendamentoSerializer(agendamento).data, status=status.HTTP_201_CREATED)


class CancelarAgendamentoView(APIView):
    """
    POST /api/colaborador/agendamentos/<agendamento_id>/cancelar/
    Cancela um agendamento do usuário autenticado.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, agendamento_id):
        try:
            agendamento = (
                Agendamento.objects
                .select_related('horario__evento')
                .get(id=agendamento_id, usuario=request.user)
            )
        except Agendamento.DoesNotExist:
            return Response(
                {'erro': 'Agendamento não encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if agendamento.status == 'cancelado':
            return Response(
                {'erro': 'Este agendamento já foi cancelado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        horario = agendamento.horario
        limite_cancelamento = _inicio_agendamento(horario) - timedelta(
            minutes=CANCELAMENTO_MINUTOS_ANTECEDENCIA
        )
        if timezone.now() > limite_cancelamento:
            return Response(
                {
                    'erro': (
                        'Cancelamento permitido apenas ate 30 minutos antes '
                        'do horario agendado.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        agendamento.status = 'cancelado'
        agendamento.save(update_fields=['status', 'atualizado_em'])

        notificar_proximo_na_fila(horario.id)

        return Response({'mensagem': 'Agendamento cancelado com sucesso.'})


class MeusAgendamentosView(generics.ListAPIView):
    """
    GET /api/colaborador/agendamentos/
    Lista os agendamentos do usuário autenticado, do mais recente para o mais antigo.
    """
    serializer_class = AgendamentoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = (
            Agendamento.objects
            .filter(usuario=self.request.user, status='confirmado')
            .select_related('usuario', 'horario__evento')
            .order_by('-criado_em')
        )
        evento_id = self.request.query_params.get('evento_id')
        if evento_id:
            qs = qs.filter(horario__evento_id=evento_id)
        return qs
