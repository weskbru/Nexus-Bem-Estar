import csv

from django.contrib.auth import authenticate
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.http import StreamingHttpResponse
from django.utils.html import strip_tags

from rest_framework import generics, viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from ..models.models import Usuario, Evento, Horario, ConviteEmail, Agendamento, AgendamentoManual
from ..serializers.serializers import (
    UsuarioSerializer,
    UsuarioCreateSerializer,
    EventoListSerializer,
    EventoDetailSerializer,
    EventoAdminSerializer,
    HorarioSerializer,
    AgendamentoSerializer,
    AgendamentoManualSerializer,
    ConviteEmailSerializer,
    AdminLoginSerializer,
)


# ---------------------------------------------------------------------------
# Permissões customizadas
# ---------------------------------------------------------------------------

class IsAdminUsuario(permissions.BasePermission):
    """Permite acesso apenas a usuários marcados como admin."""
    message = 'Acesso restrito a administradores.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_admin
        )


# ---------------------------------------------------------------------------
# AUTH VIEWS
# ---------------------------------------------------------------------------

class AdminLoginView(APIView):
    """
    POST /api/auth/login/
    Login do administrador com e-mail e senha.
    Retorna par de tokens JWT (access + refresh).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            request,
            username=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
        )
        if user is None or not user.is_admin:
            return Response(
                {'erro': 'Credenciais inválidas ou sem permissão de administrador.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'usuario': UsuarioSerializer(user).data,
        })


class AcessoViaTokenView(APIView):
    """
    GET /api/auth/acesso/<token>/
    Ponto de entrada do colaborador via link mágico do e-mail.
    Valida o token, marca o convite como utilizado e retorna um JWT.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            convite = ConviteEmail.objects.select_related('usuario', 'evento').get(token=token)
        except ConviteEmail.DoesNotExist:
            return Response(
                {'erro': 'Link inválido ou expirado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Marca como usado (registro de auditoria; não bloqueia reutilização)
        if not convite.usado:
            convite.usado = True
            convite.save(update_fields=['usado'])

        refresh = RefreshToken.for_user(convite.usuario)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'usuario': UsuarioSerializer(convite.usuario).data,
            'evento_id': convite.evento.id,
            'chave_mensagem': convite.chave_mensagem,
        })


# ---------------------------------------------------------------------------
# ADMIN — Usuários
# ---------------------------------------------------------------------------

class AdminUsuarioViewSet(viewsets.ModelViewSet):
    """
    CRUD de usuários/colaboradores.
    GET    /api/admin/usuarios/
    POST   /api/admin/usuarios/
    GET    /api/admin/usuarios/<id>/
    PUT    /api/admin/usuarios/<id>/
    DELETE /api/admin/usuarios/<id>/
    """
    queryset = Usuario.objects.all().order_by('nome')
    permission_classes = [IsAdminUsuario]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return UsuarioCreateSerializer
        return UsuarioSerializer


# ---------------------------------------------------------------------------
# ADMIN — Eventos
# ---------------------------------------------------------------------------

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
    POST   /api/admin/eventos/<id>/encerrar/
    POST   /api/admin/eventos/<id>/enviar-emails/
    GET    /api/admin/eventos/<id>/exportar-csv/
    """
    queryset = Evento.objects.all().prefetch_related('horarios__agendamentos')
    serializer_class = EventoAdminSerializer
    permission_classes = [IsAdminUsuario]

    @action(detail=True, methods=['post'], url_path='publicar')
    def publicar(self, request, pk=None):
        """Publica o evento, gera os slots de horário e distribui participantes pendentes."""
        evento = self.get_object()
        if evento.status == 'encerrado':
            return Response(
                {'erro': 'Eventos encerrados não podem ser publicados novamente.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        evento.status = 'publicado'
        evento.save(update_fields=['status'])
        try:
            evento.gerar_horarios()
        except ValueError as exc:
            return Response({'erro': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        # Auto-assign pending manual participants (saved during draft) to horarios
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

    @action(detail=True, methods=['post'], url_path='encerrar')
    def encerrar(self, request, pk=None):
        """Encerra o evento, impedindo novos agendamentos."""
        evento = self.get_object()
        evento.status = 'encerrado'
        evento.save(update_fields=['status'])
        return Response({'mensagem': 'Evento encerrado com sucesso.'})

    @action(detail=True, methods=['post'], url_path='enviar-emails')
    def enviar_emails(self, request, pk=None):
        """
        Gera um ConviteEmail para cada colaborador ativo e envia o e-mail com
        o link mágico (token UUID) e a chave de mensagem legível.
        O admin pode editar o campo `corpo_email` do evento antes de enviar.
        """
        evento = self.get_object()
        if evento.status != 'publicado':
            return Response(
                {'erro': 'Somente eventos publicados podem receber disparo de e-mails.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        colaboradores = Usuario.objects.filter(is_active=True, is_admin=False)
        if not colaboradores.exists():
            return Response(
                {'erro': 'Nenhum colaborador ativo encontrado para envio.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        corpo_template = evento.get_corpo_email()
        enviados = 0
        erros = []

        for usuario in colaboradores:
            convite, _ = ConviteEmail.objects.get_or_create(
                usuario=usuario,
                evento=evento,
            )
            link = f"{settings.FRONTEND_URL}/acesso/{convite.token}"
            try:
                corpo = corpo_template.format(
                    nome=usuario.nome,
                    titulo=evento.titulo,
                    data=evento.data.strftime('%d/%m/%Y'),
                    hora_inicio=evento.hora_inicio.strftime('%H:%M'),
                    hora_fim=evento.hora_fim.strftime('%H:%M'),
                    link=link,
                    chave=convite.chave_mensagem,
                )
            except KeyError as exc:
                return Response(
                    {'erro': f'Variável inválida no template de e-mail: {exc}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                send_mail(
                    subject=f'Convite: {evento.titulo}',
                    message=strip_tags(corpo),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[usuario.email],
                    html_message=corpo,
                    fail_silently=False,
                )
                enviados += 1
            except Exception as exc:
                erros.append({'email': usuario.email, 'erro': str(exc)})

        return Response({
            'mensagem': f'{enviados} e-mail(s) enviado(s) com sucesso.',
            'enviados': enviados,
            'erros': erros,
        })

    @action(detail=True, methods=['post'], url_path='registrar-participante')
    def registrar_participante(self, request, pk=None):
        """
        POST /api/admin/eventos/<id>/registrar-participante/
        Registra manualmente um colaborador sem e-mail corporativo.
        - Rascunho: horario_id não é necessário (participante fica pendente).
        - Publicado: horario_id obrigatório.
        Body: { nome, horario_id?, matricula?, departamento? }
        """
        evento = self.get_object()
        if evento.status == 'encerrado':
            return Response(
                {'erro': 'Não é possível registrar participantes em eventos encerrados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nome = request.data.get('nome', '').strip()
        horario_id = request.data.get('horario_id')
        matricula = request.data.get('matricula', '').strip()
        departamento = request.data.get('departamento', '').strip()

        if not nome:
            return Response(
                {'erro': 'O nome do participante é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        horario = None
        if horario_id:
            try:
                horario = Horario.objects.get(id=horario_id, evento=evento)
            except Horario.DoesNotExist:
                return Response(
                    {'erro': 'Horário não encontrado neste evento.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif evento.status == 'publicado':
            return Response(
                {'erro': 'Selecione um horário para eventos publicados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participante = AgendamentoManual.objects.create(
            evento=evento,
            horario=horario,
            nome=nome,
            matricula=matricula,
            departamento=departamento,
        )
        return Response(
            AgendamentoManualSerializer(participante).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'], url_path='lista-presenca')
    def lista_presenca(self, request, pk=None):
        """
        GET /api/admin/eventos/<id>/lista-presenca/
        Retorna lista consolidada de participantes (agendamentos + manuais)
        agrupada por horário, para conferência na portaria.
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
                    'nome':        ag.usuario.nome,
                    'matricula':   ag.usuario.matricula or '—',
                    'departamento': ag.usuario.departamento or '—',
                    'tipo':        'email',
                })

            for pm in horario.participantes_manuais.all():
                participantes.append({
                    'nome':        pm.nome,
                    'matricula':   pm.matricula or '—',
                    'departamento': pm.departamento or '—',
                    'tipo':        'manual',
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
                'id':            evento.id,
                'titulo':        evento.titulo,
                'data':          evento.data.strftime('%d/%m/%Y'),
                'hora_inicio':   evento.hora_inicio.strftime('%H:%M'),
                'hora_fim':      evento.hora_fim.strftime('%H:%M'),
                'nome_profissional': evento.nome_profissional,
                'status':        evento.status,
            },
            'horarios': resultado,
            'total':    total,
        })

    @action(detail=True, methods=['get'], url_path='exportar-csv')
    def exportar_csv(self, request, pk=None):
        """
        GET /api/admin/eventos/<id>/exportar-csv/
        Exporta a lista de agendamentos confirmados do evento em CSV (streaming).
        """
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


# ---------------------------------------------------------------------------
# ADMIN — Agendamentos (somente leitura)
# ---------------------------------------------------------------------------

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
        evento_id = self.request.query_params.get('evento_id')
        status_param = self.request.query_params.get('status')
        if evento_id:
            qs = qs.filter(horario__evento_id=evento_id)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs.order_by('-criado_em')


# ---------------------------------------------------------------------------
# ADMIN — Dashboard
# ---------------------------------------------------------------------------

class AdminDashboardView(APIView):
    """
    GET /api/admin/dashboard/
    Retorna métricas gerais: total de vagas, ocupação, taxa, agendamentos recentes.
    """
    permission_classes = [IsAdminUsuario]

    def get(self, request):
        horarios = Horario.objects.all()
        total_vagas = sum(h.vagas_disponiveis for h in horarios)
        vagas_ocupadas = Agendamento.objects.filter(status='confirmado').count()
        taxa = round((vagas_ocupadas / total_vagas * 100), 1) if total_vagas > 0 else 0.0

        agendamentos_recentes = (
            Agendamento.objects
            .select_related('usuario', 'horario__evento')
            .order_by('-criado_em')[:10]
        )

        return Response({
            'total_vagas': total_vagas,
            'vagas_ocupadas': vagas_ocupadas,
            'taxa_ocupacao': taxa,
            'total_eventos_ativos': Evento.objects.filter(status='publicado').count(),
            'agendamentos_recentes': AgendamentoSerializer(agendamentos_recentes, many=True).data,
        })


# ---------------------------------------------------------------------------
# COLABORADOR — Eventos
# ---------------------------------------------------------------------------

class EventoListView(generics.ListAPIView):
    """
    GET /api/colaborador/eventos/
    Lista eventos publicados disponíveis para agendamento.
    """
    serializer_class = EventoListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Evento.objects
            .filter(status='publicado')
            .prefetch_related('horarios__agendamentos')
        )


class EventoDetailView(generics.RetrieveAPIView):
    """
    GET /api/colaborador/eventos/<id>/
    Detalhe do evento com todos os horários e disponibilidade.
    """
    queryset = (
        Evento.objects
        .filter(status='publicado')
        .prefetch_related('horarios__agendamentos')
    )
    serializer_class = EventoDetailSerializer
    permission_classes = [permissions.IsAuthenticated]


# ---------------------------------------------------------------------------
# COLABORADOR — Agendamento
# ---------------------------------------------------------------------------

class ReservarHorarioView(APIView):
    """
    POST /api/colaborador/eventos/<evento_id>/horarios/<horario_id>/reservar/
    Reserva um horário para o usuário autenticado.
    Utiliza select_for_update() para evitar dupla reserva em caso de concorrência.
    Um usuário pode ter apenas um agendamento ativo por evento.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, evento_id, horario_id):
        # Bloqueia a linha do horário para leitura e escrita simultânea
        try:
            horario = (
                Horario.objects
                .select_for_update()
                .get(id=horario_id, evento_id=evento_id, evento__status='publicado')
            )
        except Horario.DoesNotExist:
            return Response(
                {'erro': 'Horário não encontrado ou evento não está disponível.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not horario.disponivel:
            return Response(
                {'erro': 'Este horário não possui vagas disponíveis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Garante que o usuário não tem outro agendamento ativo no mesmo evento
        ja_agendado = Agendamento.objects.filter(
            usuario=request.user,
            horario__evento_id=evento_id,
            status='confirmado',
        ).exists()
        if ja_agendado:
            return Response(
                {'erro': 'Você já possui um agendamento confirmado para este evento.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        convite = ConviteEmail.objects.filter(
            usuario=request.user, evento_id=evento_id
        ).first()

        agendamento = Agendamento.objects.create(
            usuario=request.user,
            horario=horario,
            convite=convite,
            status='confirmado',
        )

        # Envia e-mail de confirmação em background (fail_silently)
        _enviar_email_confirmacao(agendamento)

        return Response(
            AgendamentoSerializer(agendamento).data,
            status=status.HTTP_201_CREATED,
        )


class CancelarAgendamentoView(APIView):
    """
    POST /api/colaborador/agendamentos/<agendamento_id>/cancelar/
    Cancela um agendamento do usuário autenticado.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, agendamento_id):
        try:
            agendamento = Agendamento.objects.get(
                id=agendamento_id, usuario=request.user
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

        agendamento.status = 'cancelado'
        agendamento.save(update_fields=['status', 'atualizado_em'])
        return Response({'mensagem': 'Agendamento cancelado com sucesso.'})


class MeusAgendamentosView(generics.ListAPIView):
    """
    GET /api/colaborador/agendamentos/
    Lista os agendamentos do usuário autenticado, do mais recente para o mais antigo.
    """
    serializer_class = AgendamentoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Agendamento.objects
            .filter(usuario=self.request.user)
            .select_related('usuario', 'horario__evento')
            .order_by('-criado_em')
        )


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _enviar_email_confirmacao(agendamento: Agendamento) -> None:
    """Envia e-mail de confirmação ao colaborador após o agendamento ser criado."""
    horario = agendamento.horario
    evento = horario.evento
    usuario = agendamento.usuario

    mensagem = (
        f"Olá {usuario.nome},\n\n"
        f"Seu agendamento foi CONFIRMADO!\n\n"
        f"Evento: {evento.titulo}\n"
        f"Data: {evento.data.strftime('%d/%m/%Y')}\n"
        f"Horário: {horario.hora_inicio.strftime('%H:%M')} "
        f"às {horario.hora_fim.strftime('%H:%M')}\n"
        + (f"Profissional: {evento.nome_profissional}\n" if evento.nome_profissional else '')
        + f"\nAtt,\nEquipe de Bem-Estar"
    )

    try:
        send_mail(
            subject=f'Confirmação de Agendamento: {evento.titulo}',
            message=mensagem,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[usuario.email],
            fail_silently=True,
        )
    except Exception:
        pass  # Log em produção; não bloqueia o fluxo
