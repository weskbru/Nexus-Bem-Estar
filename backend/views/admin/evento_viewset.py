import csv

from django.conf import settings
from django.http import StreamingHttpResponse
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ...models.models import Agendamento, AgendamentoManual, Evento, Horario, Penalidade


def _verificar_presencas_pendentes():
    """Retorna o primeiro evento encerrado com agendamentos sem confirmação de presença, ou None."""
    return (
        Evento.objects
        .filter(
            status='encerrado',
            horarios__agendamentos__status='confirmado',
            horarios__agendamentos__compareceu__isnull=True,
        )
        .distinct()
        .first()
    )
from ...serializers.serializers import (
    AgendamentoManualSerializer,
    AgendamentoSerializer,
    EventoAdminSerializer,
    PenalidadeSerializer,
)
from ...services import email_service
from ...services.lista_espera_service import notificar_proximo_na_fila
from ..permissions import IsAdminUsuario, encerrar_eventos_expirados


class AdminEventoViewSet(viewsets.ModelViewSet):
    """
    CRUD de eventos + ações especiais.
    GET    /api/admin/eventos/
    POST   /api/admin/eventos/
    GET    /api/admin/eventos/<id>/
    PUT    /api/admin/eventos/<id>/
    PATCH  /api/admin/eventos/<id>/
    DELETE /api/admin/eventos/<id>/
    POST   /api/admin/eventos/<id>/publicar/
    POST   /api/admin/eventos/<id>/cancelar/
    POST   /api/admin/eventos/<id>/enviar-emails/
    GET    /api/admin/eventos/<id>/exportar-csv/
    """
    queryset = Evento.objects.all().prefetch_related('horarios__agendamentos')
    serializer_class = EventoAdminSerializer
    permission_classes = [IsAdminUsuario]

    def get_queryset(self):
        encerrar_eventos_expirados()
        return super().get_queryset()

    def create(self, request, *args, **kwargs):
        pendente = _verificar_presencas_pendentes()
        if pendente:
            return Response(
                {
                    'erro': f'Confirme a lista de presença do evento "{pendente.titulo}" antes de criar um novo evento.',
                    'codigo': 'lista_presenca_pendente',
                    'evento_id': pendente.id,
                    'evento_titulo': pendente.titulo,
                },
                status=status.HTTP_409_CONFLICT,
            )
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        evento = self.get_object()
        if evento.status == 'encerrado':
            presenca_pendente = Agendamento.objects.filter(
                horario__evento=evento,
                status='confirmado',
                compareceu__isnull=True,
            ).exists()
            if presenca_pendente:
                return Response(
                    {
                        'erro': f'Preencha e salve a lista de presença do evento "{evento.titulo}" antes de excluí-lo.',
                        'codigo': 'lista_presenca_pendente',
                        'evento_id': evento.id,
                        'evento_titulo': evento.titulo,
                    },
                    status=status.HTTP_409_CONFLICT,
                )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='publicar')
    def publicar(self, request, pk=None):
        """Publica o evento, gera os slots de horário e distribui participantes pendentes."""
        evento = self.get_object()
        if evento.status == 'encerrado':
            return Response(
                {'erro': 'Eventos encerrados não podem ser publicados novamente.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if evento.status == 'publicado':
            return Response(
                {'erro': 'Este evento já está publicado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        evento.status = 'publicado'
        evento.save(update_fields=['status'])
        try:
            evento.gerar_horarios()
        except ValueError as exc:
            return Response({'erro': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        horarios = list(evento.horarios.order_by('hora_inicio'))
        pendentes = list(evento.participantes_manuais.filter(horario__isnull=True))
        if horarios and pendentes:
            for i, participante in enumerate(pendentes):
                participante.horario = horarios[i % len(horarios)]
                participante.save(update_fields=['horario'])

        return Response({
            'mensagem': 'Evento publicado com sucesso.',
            'horarios_gerados': evento.horarios.count(),
        })

    @action(detail=True, methods=['post'], url_path='cancelar')
    def cancelar(self, request, pk=None):
        """Cancela o evento, impedindo novos agendamentos, e notifica todos os inscritos."""
        evento = self.get_object()
        if evento.status != 'publicado':
            return Response(
                {'erro': 'Somente eventos publicados podem ser cancelados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        evento.status = 'cancelado'
        evento.save(update_fields=['status'])

        agendamentos_confirmados = (
            Agendamento.objects
            .filter(horario__evento=evento, status='confirmado')
            .select_related('usuario', 'horario')
        )
        email_service.enviar_cancelamento_evento(evento, agendamentos_confirmados)

        return Response({'mensagem': 'Evento cancelado com sucesso.'})

    @action(detail=True, methods=['post'], url_path='enviar-emails')
    def enviar_emails(self, request, pk=None):
        """
        Envia UM único e-mail para o endereço configurado em EMAIL_DESTINO_EVENTO
        (normalmente uma Lista de Distribuição corporativa).
        """
        pendente = _verificar_presencas_pendentes()
        if pendente:
            return Response(
                {
                    'erro': f'Confirme a lista de presença do evento "{pendente.titulo}" antes de disparar e-mails.',
                    'codigo': 'lista_presenca_pendente',
                    'evento_id': pendente.id,
                    'evento_titulo': pendente.titulo,
                },
                status=status.HTTP_409_CONFLICT,
            )

        evento = self.get_object()
        if evento.status != 'publicado':
            return Response(
                {'erro': 'Somente eventos publicados podem receber disparo de e-mails.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if evento.emails_enviados_em:
            enviado_em = evento.emails_enviados_em.strftime('%d/%m/%Y às %H:%M')
            return Response(
                {'erro': f'Os e-mails deste evento já foram enviados em {enviado_em}. Não é possível reenviar.'},
                status=status.HTTP_409_CONFLICT,
            )

        destinatarios_raw = getattr(settings, 'EMAIL_DESTINO_EVENTO', '').strip()
        if not destinatarios_raw:
            return Response(
                {'erro': 'Destinatário não configurado. Defina EMAIL_DESTINO_EVENTO no .env.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        destinatario = [d.strip() for d in destinatarios_raw.split(',') if d.strip()]

        corpo_html = evento.corpo_email or ''
        link_acesso = f"{settings.FRONTEND_URL}/evento/{evento.id}/entrar"

        if evento.palavra_chave:
            corpo_html += (
                f'<div style="margin-top:24px;padding:16px 20px;background:#fffbeb;'
                f'border-left:4px solid #f59e0b;border-radius:6px;">'
                f'<p style="margin:0 0 6px;font-size:13px;color:#92400e;font-weight:600;">'
                f'🔑 PALAVRA-CHAVE DE ACESSO</p>'
                f'<p style="margin:0;font-size:22px;font-weight:bold;letter-spacing:3px;color:#78350f;">'
                f'{evento.palavra_chave}</p>'
                f'<p style="margin:8px 0 0;font-size:12px;color:#92400e;">'
                f'Você precisará informar esta palavra-chave ao clicar no link abaixo.</p>'
                f'</div>'
            )

        corpo_html += (
            f'<p style="margin-top:24px;text-align:center;">'
            f'<a href="{link_acesso}" style="display:inline-block;padding:12px 32px;'
            f'background:#1d4ed8;color:#fff;font-size:15px;font-weight:bold;'
            f'text-decoration:none;border-radius:6px;">Acessar e Agendar</a></p>'
        )

        try:
            for dest in destinatario:
                email_service.enviar_html_evento(evento.titulo, corpo_html, dest)
            evento.emails_enviados_em = timezone.now()
            evento.save(update_fields=['emails_enviados_em'])
            return Response({
                'mensagem': f'E-mail enviado com sucesso para {destinatario}.',
                'destinatario': destinatario,
            }, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response(
                {'erro': f'Falha ao enviar e-mail: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['post'], url_path='registrar-participante')
    def registrar_participante(self, request, pk=None):
        """
        POST /api/admin/eventos/<id>/registrar-participante/
        Registra manualmente um colaborador sem e-mail corporativo.
        Body: { nome, horario_id?, matricula?, departamento? }
        """
        evento = self.get_object()
        if evento.status != 'publicado':
            return Response(
                {'erro': 'Só é possível registrar participantes em eventos publicados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nome         = request.data.get('nome', '').strip()
        horario_id   = request.data.get('horario_id')
        matricula    = request.data.get('matricula', '').strip()
        departamento = request.data.get('departamento', '').strip()

        if not nome:
            return Response(
                {'erro': 'O nome do participante é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not horario_id:
            return Response(
                {'erro': 'Selecione um horário para eventos publicados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            horario = Horario.objects.get(id=horario_id, evento=evento)
        except Horario.DoesNotExist:
            return Response(
                {'erro': 'Horário não encontrado neste evento.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        confirmados = horario.agendamentos.filter(status='confirmado').count()
        manuais = horario.participantes_manuais.count()
        if confirmados + manuais >= evento.capacidade_por_horario:
            return Response(
                {'erro': f'Horário lotado. Capacidade máxima de {evento.capacidade_por_horario} pessoa(s) atingida.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participante = AgendamentoManual.objects.create(
            evento=evento,
            horario=horario,
            nome=nome,
            matricula=matricula,
            departamento=departamento,
        )
        return Response(AgendamentoManualSerializer(participante).data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['delete'],
        url_path=r'remover-participante/(?P<participante_id>[0-9]+)',
    )
    def remover_participante(self, request, pk=None, participante_id=None):
        """
        DELETE /api/admin/eventos/<id>/remover-participante/<participante_id>/
        Remove um participante manual e notifica o próximo na fila de espera.
        """
        evento = self.get_object()
        try:
            participante = AgendamentoManual.objects.get(id=participante_id, evento=evento)
        except AgendamentoManual.DoesNotExist:
            return Response(
                {'erro': 'Participante não encontrado neste evento.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        horario_id = participante.horario_id
        participante.delete()

        if horario_id:
            notificar_proximo_na_fila(horario_id)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'], url_path='lista-presenca')
    def lista_presenca(self, request, pk=None):
        """
        GET /api/admin/eventos/<id>/lista-presenca/
        Lista consolidada de participantes agrupada por horário.
        """
        evento = self.get_object()
        horarios = evento.horarios.order_by('hora_inicio').prefetch_related(
            'agendamentos__usuario',
            'participantes_manuais',
        )

        resultado = []
        total = 0
        for horario in horarios:
            participantes = []
            for ag in horario.agendamentos.filter(status='confirmado'):
                participantes.append({
                    'agendamento_id': ag.id,
                    'nome':        ag.usuario.nome,
                    'email':       ag.usuario.email,
                    'ramal':       ag.usuario.ramal,
                    'hora_inicio': horario.hora_inicio.strftime('%H:%M'),
                    'hora_fim':    horario.hora_fim.strftime('%H:%M'),
                    'tipo':        'email',
                    'compareceu':  ag.compareceu,
                })
            for pm in horario.participantes_manuais.all():
                participantes.append({
                    'participante_id': pm.id,
                    'nome':            pm.nome,
                    'email':           '—',
                    'hora_inicio':     horario.hora_inicio.strftime('%H:%M'),
                    'hora_fim':        horario.hora_fim.strftime('%H:%M'),
                    'tipo':            'manual',
                })
            participantes.sort(key=lambda p: p['nome'])
            total += len(participantes)
            resultado.append({
                'horario_id':    horario.id,
                'hora_inicio':   horario.hora_inicio.strftime('%H:%M'),
                'hora_fim':      horario.hora_fim.strftime('%H:%M'),
                'participantes': participantes,
            })

        return Response({
            'evento': {
                'id':                evento.id,
                'titulo':            evento.titulo,
                'data':              evento.data.strftime('%d/%m/%Y'),
                'hora_inicio':       evento.hora_inicio.strftime('%H:%M'),
                'hora_fim':          evento.hora_fim.strftime('%H:%M'),
                'nome_profissional': evento.nome_profissional,
                'status':            evento.status,
            },
            'horarios': resultado,
            'total':    total,
        })

    @action(detail=True, methods=['post'], url_path='marcar-presenca')
    def marcar_presenca(self, request, pk=None):
        """
        POST /api/admin/eventos/<id>/marcar-presenca/
        Marca presença/falta dos participantes de um evento encerrado.
        Body: { presentes: [agendamento_id, ...], ausentes: [agendamento_id, ...] }
        Cria uma Penalidade para cada ausente que ainda não possua uma.
        """
        evento = self.get_object()
        if evento.status not in ('encerrado', 'publicado'):
            return Response(
                {'erro': 'Só é possível marcar presença em eventos publicados ou encerrados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        presentes_ids = request.data.get('presentes', [])
        ausentes_ids = request.data.get('ausentes', [])

        if not isinstance(presentes_ids, list) or not isinstance(ausentes_ids, list):
            return Response(
                {'erro': 'Os campos "presentes" e "ausentes" devem ser listas de IDs.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        Agendamento.objects.filter(
            id__in=presentes_ids, horario__evento=evento
        ).update(compareceu=True)

        ausentes_qs = (
            Agendamento.objects
            .filter(id__in=ausentes_ids, horario__evento=evento)
            .select_related('usuario')
        )
        ausentes_qs.update(compareceu=False)

        penalidades_criadas = 0
        for ag in ausentes_qs:
            _, created = Penalidade.objects.get_or_create(
                agendamento=ag,
                defaults={'usuario': ag.usuario, 'ativa': True},
            )
            if created:
                penalidades_criadas += 1

        return Response({
            'mensagem': (
                f'Presença registrada. '
                f'{len(presentes_ids)} presentes, {ausentes_qs.count()} ausentes. '
                f'{penalidades_criadas} penalidade(s) criada(s).'
            ),
            'penalidades_criadas': penalidades_criadas,
        })

    @action(detail=True, methods=['get'], url_path='exportar-csv')
    def exportar_csv(self, request, pk=None):
        """GET /api/admin/eventos/<id>/exportar-csv/ — Exporta agendamentos em CSV."""
        evento = self.get_object()
        agendamentos = (
            Agendamento.objects
            .filter(horario__evento=evento, status='confirmado')
            .select_related('usuario', 'horario')
            .order_by('horario__hora_inicio', 'usuario__nome')
        )

        def gerar_linhas():
            yield 'Nome,E-mail,Matrícula,Departamento,Horário Início,Horário Fim,Status\n'
            for ag in agendamentos:
                yield (
                    f'"{ag.usuario.nome}",'
                    f'"{ag.usuario.email}",'
                    f'"{ag.usuario.matricula}",'
                    f'"{ag.usuario.departamento}",'
                    f'"{ag.horario.hora_inicio.strftime("%H:%M")}",'
                    f'"{ag.horario.hora_fim.strftime("%H:%M")}",'
                    f'"{ag.status}"\n'
                )

        response = StreamingHttpResponse(gerar_linhas(), content_type='text/csv')
        nome_arquivo = evento.titulo.replace(' ', '_').replace('/', '-')
        response['Content-Disposition'] = f'attachment; filename="{nome_arquivo}.csv"'
        return response


class AdminAgendamentoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/admin/agendamentos/            — lista todos os agendamentos
    GET /api/admin/agendamentos/?evento_id= — filtra por evento
    GET /api/admin/agendamentos/?status=    — filtra por status
    GET /api/admin/agendamentos/<id>/       — detalhe
    """
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAdminUsuario]

    def get_queryset(self):
        qs = Agendamento.objects.all().select_related('usuario', 'horario__evento')
        evento_id    = self.request.query_params.get('evento_id')
        status_param = self.request.query_params.get('status')
        if evento_id:
            qs = qs.filter(horario__evento_id=evento_id)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs.order_by('-criado_em')


class AdminPenalidadeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/admin/penalidades/              — lista todas as penalidades
    GET  /api/admin/penalidades/?ativa=true   — filtra por ativas
    GET  /api/admin/penalidades/?usuario_id=  — filtra por usuário
    POST /api/admin/penalidades/<id>/revogar/ — revoga penalidade manualmente
    """
    serializer_class = PenalidadeSerializer
    permission_classes = [IsAdminUsuario]

    def get_queryset(self):
        qs = Penalidade.objects.select_related(
            'usuario', 'agendamento__horario__evento', 'evento_punicao', 'revogada_por'
        )
        ativa_param = self.request.query_params.get('ativa')
        usuario_id  = self.request.query_params.get('usuario_id')
        if ativa_param is not None:
            qs = qs.filter(ativa=ativa_param.lower() == 'true')
        if usuario_id:
            qs = qs.filter(usuario_id=usuario_id)
        return qs.order_by('-criada_em')

    @action(detail=True, methods=['post'], url_path='revogar')
    def revogar(self, request, pk=None):
        """
        POST /api/admin/penalidades/<id>/revogar/
        Body: { motivo: "..." }
        Revoga manualmente uma penalidade ativa (ex.: falta justificada).
        """
        penalidade = self.get_object()
        if not penalidade.ativa:
            return Response(
                {'erro': 'Esta penalidade já está inativa.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        motivo = request.data.get('motivo', '').strip()
        penalidade.ativa = False
        penalidade.revogada_por = request.user
        penalidade.revogada_em = timezone.now()
        penalidade.motivo_revogacao = motivo
        penalidade.save(update_fields=['ativa', 'revogada_por', 'revogada_em', 'motivo_revogacao'])
        return Response(PenalidadeSerializer(penalidade).data)
