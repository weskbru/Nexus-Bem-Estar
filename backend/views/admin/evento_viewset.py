import csv
from datetime import timedelta

from django.db.models import Count, Exists, OuterRef, Prefetch, Q
from django.http import StreamingHttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .agendamento_viewset import AdminAgendamentoViewSet
from .penalidade_viewset import AdminPenalidadeViewSet
from ...models.models import Agendamento, AgendamentoManual, Evento, Horario, ListaEspera, Penalidade


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
    EventoAdminListSerializer,
    EventoAdminSerializer,
)
from ...services import email_service
from ...services.evento.email_service import (
    AGENDAMENTO_EMAIL_MINIMO_MINUTOS,
    EMAIL_STATUS_AGENDADO,
    EMAIL_STATUS_ENVIADO,
    EMAIL_STATUS_FALHOU,
    MODO_ENVIO_AGENDADO,
    MODO_ENVIO_IMEDIATO,
    enviar_emails_evento,
    get_destinatarios_email_evento,
)
from ...services.lista_espera.service import notificar_proximo_na_fila
from ..permissions import IsAdminUsuario, encerrar_eventos_expirados
from ..querysets import horarios_com_disponibilidade


def validar_agendamento_email_evento(raw_agendado_para):
    if not raw_agendado_para:
        return None, Response(
            {'erro': 'Informe a data e o horario do envio agendado.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    agendado_para = parse_datetime(raw_agendado_para)
    if not agendado_para:
        return None, Response(
            {'erro': 'Data e horario de agendamento invalidos.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if timezone.is_naive(agendado_para):
        agendado_para = timezone.make_aware(agendado_para, timezone.get_current_timezone())

    minimo = timezone.now() + timedelta(minutes=AGENDAMENTO_EMAIL_MINIMO_MINUTOS)
    if agendado_para < minimo:
        return None, Response(
            {'erro': f'Agende o envio para pelo menos {AGENDAMENTO_EMAIL_MINIMO_MINUTOS} minutos no futuro.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return agendado_para, None


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
    queryset = Evento.objects.all()
    serializer_class = EventoAdminSerializer
    permission_classes = [IsAdminUsuario]

    def get_serializer_class(self):
        if self.action == 'list':
            return EventoAdminListSerializer
        return EventoAdminSerializer

    def get_queryset(self):
        encerrar_eventos_expirados()
        queryset = Evento.objects.all()

        if self.action == 'list':
            presencas_pendentes = Agendamento.objects.filter(
                horario__evento=OuterRef('pk'),
                status='confirmado',
                compareceu__isnull=True,
            )
            return (
                queryset
                .only(
                    'id',
                    'titulo',
                    'tipo',
                    'data',
                    'hora_inicio',
                    'hora_fim',
                    'imagem_url',
                    'status',
                    'nome_profissional',
                    'emails_enviados_em',
                    'emails_envio_status',
                    'emails_agendado_para',
                )
                .annotate(
                    total_agendamentos_calc=Count(
                        'horarios__agendamentos',
                        filter=Q(horarios__agendamentos__status='confirmado'),
                        distinct=True,
                    ),
                    presenca_pendente_calc=Exists(presencas_pendentes),
                )
            )

        return queryset.prefetch_related(
            Prefetch('horarios', queryset=horarios_com_disponibilidade())
        )

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
        from datetime import datetime as dt
        evento = self.get_object()

        # Bloqueia exclusão se o e-mail já foi disparado e o evento ainda está em andamento
        if evento.emails_enviados_em and evento.status == 'publicado':
            fim_evento = timezone.make_aware(
                dt.combine(evento.data, evento.hora_fim)
            )
            if timezone.now() < fim_evento:
                return Response(
                    {
                        'erro': (
                            f'Não é possível excluir o evento "{evento.titulo}" pois os e-mails de convite '
                            'já foram enviados e o horário do evento ainda não encerrou.'
                        ),
                        'codigo': 'email_enviado_evento_ativo',
                        'evento_id': evento.id,
                        'evento_titulo': evento.titulo,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        # Bloqueia exclusão se o evento já encerrou mas a lista de presença ainda não foi preenchida
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
        email_service.enviar_cancelamento_evento(
            evento,
            agendamentos_confirmados.iterator(chunk_size=200),
        )

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

        destinatario = get_destinatarios_email_evento()
        if not destinatario:
            return Response(
                {'erro': 'Destinatário não configurado. Defina EMAIL_DESTINO_EVENTO no .env.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


        modo_envio = request.data.get('modo_envio') or MODO_ENVIO_IMEDIATO
        if modo_envio not in {MODO_ENVIO_IMEDIATO, MODO_ENVIO_AGENDADO}:
            return Response(
                {'erro': 'Modo de envio invalido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if modo_envio == MODO_ENVIO_AGENDADO:
            agendado_para, erro_response = validar_agendamento_email_evento(request.data.get('agendado_para'))
            if erro_response:
                return erro_response

            evento.emails_envio_status = EMAIL_STATUS_AGENDADO
            evento.emails_agendado_para = agendado_para
            evento.emails_erro_envio = ''
            evento.save(update_fields=[
                'emails_envio_status',
                'emails_agendado_para',
                'emails_erro_envio',
                'atualizado_em',
            ])

            return Response({
                'mensagem': 'Envio de e-mails agendado com sucesso.',
                'destinatario': destinatario,
                'agendado_para': agendado_para,
            }, status=status.HTTP_200_OK)

        try:
            destinatario = enviar_emails_evento(evento)
            evento.emails_enviados_em = timezone.now()
            evento.emails_envio_status = EMAIL_STATUS_ENVIADO
            evento.emails_agendado_para = None
            evento.emails_erro_envio = ''
            evento.save(update_fields=[
                'emails_enviados_em',
                'emails_envio_status',
                'emails_agendado_para',
                'emails_erro_envio',
                'atualizado_em',
            ])
            return Response({
                'mensagem': f'E-mail enviado com sucesso para {destinatario}.',
                'destinatario': destinatario,
            }, status=status.HTTP_200_OK)
        except Exception as exc:
            evento.emails_envio_status = EMAIL_STATUS_FALHOU
            evento.emails_erro_envio = str(exc)[:1000]
            evento.save(update_fields=['emails_envio_status', 'emails_erro_envio', 'atualizado_em'])
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

        data = AgendamentoManualSerializer(participante).data
        email_verificacao = request.data.get('email_verificacao', '').strip().lower()
        if email_verificacao:
            penalidade_ativa = (
                Penalidade.objects
                .filter(usuario__email__iexact=email_verificacao, ativa=True)
                .select_related('usuario')
                .first()
            )
            if penalidade_ativa:
                data['aviso_penalidade'] = {
                    'id': penalidade_ativa.id,
                    'usuario_nome': penalidade_ativa.usuario.nome,
                }
        return Response(data, status=status.HTTP_201_CREATED)

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
            Prefetch(
                'agendamentos',
                queryset=Agendamento.objects.filter(status='confirmado').select_related('usuario'),
                to_attr='agendamentos_confirmados',
            ),
            'participantes_manuais',
        )

        resultado = []
        total = 0
        for horario in horarios:
            participantes = []
            for ag in horario.agendamentos_confirmados:
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
                    'compareceu':      pm.compareceu,
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

    @action(detail=True, methods=['get'], url_path='fila-historico')
    def fila_historico(self, request, pk=None):
        """
        GET /api/admin/eventos/<id>/fila-historico/
        Retorna a fila de espera ativa por horario e o historico de cancelamentos.
        """
        evento = self.get_object()
        horarios = evento.horarios.order_by('hora_inicio')

        filas_por_horario = []
        total_fila = 0
        for horario in horarios:
            entradas = (
                ListaEspera.objects
                .filter(
                    horario=horario,
                    status__in=['aguardando', 'notificado'],
                )
                .select_related('usuario')
                .order_by('posicao', 'criado_em')
            )
            participantes = []
            for entrada in entradas:
                participantes.append({
                    'id': entrada.id,
                    'posicao': entrada.posicao,
                    'status': entrada.status,
                    'nome': entrada.usuario.nome,
                    'email': entrada.usuario.email,
                    'ramal': entrada.usuario.ramal,
                    'matricula': entrada.usuario.matricula,
                    'departamento': entrada.usuario.departamento,
                    'criado_em': entrada.criado_em,
                    'notificado_em': entrada.notificado_em,
                    'expira_em': entrada.expira_em,
                })
            total_fila += len(participantes)
            filas_por_horario.append({
                'horario_id': horario.id,
                'hora_inicio': horario.hora_inicio.strftime('%H:%M'),
                'hora_fim': horario.hora_fim.strftime('%H:%M'),
                'total_na_fila': len(participantes),
                'participantes': participantes,
            })

        cancelamentos = []
        agendamentos_cancelados = (
            Agendamento.objects
            .filter(horario__evento=evento, status='cancelado')
            .select_related('usuario', 'horario')
            .order_by('-atualizado_em')
        )
        for ag in agendamentos_cancelados:
            cancelamentos.append({
                'agendamento_id': ag.id,
                'nome': ag.usuario.nome,
                'email': ag.usuario.email,
                'ramal': ag.usuario.ramal,
                'matricula': ag.usuario.matricula,
                'departamento': ag.usuario.departamento,
                'hora_inicio': ag.horario.hora_inicio.strftime('%H:%M'),
                'hora_fim': ag.horario.hora_fim.strftime('%H:%M'),
                'agendado_em': ag.criado_em,
                'cancelado_em': ag.atualizado_em,
            })

        return Response({
            'evento': {
                'id': evento.id,
                'titulo': evento.titulo,
                'data': evento.data.strftime('%d/%m/%Y'),
                'status': evento.status,
            },
            'horarios': filas_por_horario,
            'total_fila': total_fila,
            'cancelamentos': cancelamentos,
            'total_cancelamentos': len(cancelamentos),
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

        presentes_ids         = request.data.get('presentes', [])
        ausentes_ids          = request.data.get('ausentes', [])
        presentes_manuais_ids = request.data.get('presentes_manuais', [])
        ausentes_manuais_ids  = request.data.get('ausentes_manuais', [])

        if not all(isinstance(v, list) for v in [presentes_ids, ausentes_ids, presentes_manuais_ids, ausentes_manuais_ids]):
            return Response(
                {'erro': 'Os campos de presença devem ser listas de IDs.'},
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

        # Presença de participantes manuais — apenas registro, sem penalidade
        AgendamentoManual.objects.filter(
            id__in=presentes_manuais_ids, evento=evento
        ).update(compareceu=True)
        AgendamentoManual.objects.filter(
            id__in=ausentes_manuais_ids, evento=evento
        ).update(compareceu=False)

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
            for ag in agendamentos.iterator(chunk_size=1000):
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
