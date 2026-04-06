from django.core.cache import cache
from django.db import transaction

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models.models import Agendamento, ConviteEmail, Horario, ListaEspera, Penalidade
from ...serializers.serializers import AgendamentoSerializer
from ...services import email_service
from ...services.lista_espera_service import notificar_proximo_na_fila
from ..permissions import encerrar_eventos_expirados
from .otp_agendamento_view import cache_key_otp


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

        # Verificar penalidade ativa por falta em evento anterior
        penalidade = (
            Penalidade.objects
            .select_related('evento_punicao')
            .filter(usuario=request.user, ativa=True)
            .first()
        )
        if penalidade:
            # Se o evento de punição já foi encerrado, libera automaticamente
            if penalidade.evento_punicao and penalidade.evento_punicao.status == 'encerrado':
                penalidade.ativa = False
                penalidade.save(update_fields=['ativa'])
            else:
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
            agendamento = Agendamento.objects.get(id=agendamento_id, usuario=request.user)
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
