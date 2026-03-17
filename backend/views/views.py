import csv

from django.contrib.auth import authenticate
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.http import StreamingHttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.utils.html import strip_tags
from django.views.decorators.cache import cache_page

from rest_framework import generics, viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from ..models.models import Usuario, Evento, Horario, ConviteEmail, Agendamento, AgendamentoManual
from ..services.ldap_service import buscar_usuarios as ldap_buscar, MOCK_SENHA_PADRAO
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


class IsSuperAdmin(permissions.BasePermission):
    """Permite acesso apenas a superusuários (CTI)."""
    message = 'Acesso restrito a super-administradores (CTI).'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_superuser
        )


def _encerrar_eventos_expirados() -> int:
    """Move para encerrado os eventos publicados cujo horario final ja passou."""
    hoje = timezone.localdate()
    agora = timezone.localtime().time()
    return Evento.objects.filter(
        status='publicado'
    ).filter(
        Q(data__lt=hoje) | Q(data=hoje, hora_fim__lte=agora)
    ).update(
        status='encerrado',
        atualizado_em=timezone.now(),
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
    Se o evento não exige palavra-chave, valida o token e retorna um JWT imediatamente.
    Se exige palavra-chave, retorna apenas os dados do evento e o flag requer_palavra_chave=True.

    POST /api/auth/acesso/<token>/
    Valida a palavra-chave e, se correta, retorna o JWT.
    """
    permission_classes = [permissions.AllowAny]

    def _get_convite(self, token):
        try:
            return ConviteEmail.objects.select_related('usuario', 'evento').get(token=token)
        except ConviteEmail.DoesNotExist:
            return None

    def _emitir_jwt(self, convite):
        if not convite.usado:
            convite.usado = True
            convite.save(update_fields=['usado'])
        refresh = RefreshToken.for_user(convite.usuario)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'usuario': UsuarioSerializer(convite.usuario).data,
            'evento_id': convite.evento.id,
            'chave_mensagem': convite.chave_mensagem,
        }

    def get(self, request, token):
        convite = self._get_convite(token)
        if convite is None:
            return Response({'erro': 'Link inválido ou expirado.'}, status=status.HTTP_404_NOT_FOUND)

        evento = convite.evento
        if evento.palavra_chave:
            # Exige palavra-chave: retorna apenas dados de prévia, sem JWT
            return Response({
                'requer_palavra_chave': True,
                'evento_titulo': evento.titulo,
                'evento_tipo': evento.tipo,
                'evento_data': str(evento.data),
                'evento_hora_inicio': str(evento.hora_inicio),
                'evento_hora_fim': str(evento.hora_fim),
                'nome_profissional': evento.nome_profissional,
            })

        return Response(self._emitir_jwt(convite))

    def post(self, request, token):
        convite = self._get_convite(token)
        if convite is None:
            return Response({'erro': 'Link inválido ou expirado.'}, status=status.HTTP_404_NOT_FOUND)

        evento = convite.evento
        if not evento.palavra_chave:
            # Evento sem palavra-chave: emite JWT normalmente
            return Response(self._emitir_jwt(convite))

        palavra_chave = request.data.get('palavra_chave', '').strip()
        if not palavra_chave:
            return Response({'erro': 'Informe a palavra-chave para acessar o evento.'}, status=status.HTTP_400_BAD_REQUEST)

        if palavra_chave.lower() != evento.palavra_chave.strip().lower():
            return Response({'erro': 'Palavra-chave incorreta. Tente novamente.'}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(self._emitir_jwt(convite))


# ---------------------------------------------------------------------------
# AUTH — Acesso via e-mail + palavra-chave (fluxo lista de distribuição)
# ---------------------------------------------------------------------------

class SolicitarAcessoView(APIView):
    """
    POST /api/auth/solicitar-acesso/
    Passo 1: valida e-mail + palavra-chave, envia código OTP de 6 dígitos.
    Body: { evento_id, email, palavra_chave? }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import random
        from django.core.cache import cache
        from django.core.mail import send_mail

        evento_id     = request.data.get('evento_id')
        email         = (request.data.get('email') or '').strip().lower()
        palavra_chave = (request.data.get('palavra_chave') or '').strip()

        if not evento_id or not email:
            return Response({'erro': 'Informe o evento e o e-mail.'}, status=status.HTTP_400_BAD_REQUEST)

        if not email.endswith('@aeb.gov.br'):
            return Response(
                {'erro': 'Utilize seu e-mail corporativo (@aeb.gov.br).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from ..services.ldap_service import email_existe_no_ad
        if not email_existe_no_ad(email):
            return Response(
                {'erro': 'E-mail não encontrado na base de colaboradores da AEB.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            evento = Evento.objects.get(id=evento_id, status='publicado')
        except Evento.DoesNotExist:
            return Response({'erro': 'Evento não encontrado ou não está disponível.'}, status=status.HTTP_404_NOT_FOUND)

        if evento.palavra_chave and palavra_chave.lower() != evento.palavra_chave.strip().lower():
            return Response(
                {'erro': 'Palavra-chave incorreta. Verifique o e-mail recebido e tente novamente.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Gera e armazena OTP (10 min)
        codigo = f'{random.randint(0, 999999):06d}'
        cache_key = f'otp:{evento_id}:{email}'
        cache.set(cache_key, {'codigo': codigo, 'tentativas': 0}, timeout=600)

        # Envia OTP por e-mail
        try:
            send_mail(
                subject='Código de acesso — Agenda Bem-Estar',
                message='',
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@aeb.gov.br'),
                recipient_list=[email],
                fail_silently=False,
                html_message=f"""
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;">
                  <h2 style="color:#1d4ed8;margin-bottom:8px;">Agenda Bem-Estar</h2>
                  <p style="color:#374151;">Seu código de verificação para o evento <strong>{evento.titulo}</strong> é:</p>
                  <div style="background:#f0f9ff;border:2px solid #bae6fd;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
                    <span style="font-size:42px;font-weight:bold;letter-spacing:10px;color:#1d4ed8;">{codigo}</span>
                  </div>
                  <p style="color:#6b7280;font-size:13px;">Este código expira em <strong>10 minutos</strong> e é de uso único.<br>
                  Se você não solicitou este acesso, ignore este e-mail.</p>
                </div>""",
            )
        except Exception:
            return Response(
                {'erro': 'Não foi possível enviar o código. Tente novamente em instantes.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({'mensagem': f'Código enviado para {email}. Verifique sua caixa de entrada.'})


class VerificarCodigoView(APIView):
    """
    POST /api/auth/verificar-codigo/
    Passo 2: valida o OTP e retorna JWT.
    Body: { evento_id, email, codigo }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.core.cache import cache

        evento_id = request.data.get('evento_id')
        email     = (request.data.get('email') or '').strip().lower()
        codigo    = (request.data.get('codigo') or '').strip()

        if not evento_id or not email or not codigo:
            return Response({'erro': 'Dados incompletos.'}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = f'otp:{evento_id}:{email}'
        dados = cache.get(cache_key)

        if not dados:
            return Response(
                {'erro': 'Código expirado ou não encontrado. Solicite um novo código.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if dados['tentativas'] >= 3:
            cache.delete(cache_key)
            return Response(
                {'erro': 'Número máximo de tentativas atingido. Solicite um novo código.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        if codigo != dados['codigo']:
            dados['tentativas'] += 1
            cache.set(cache_key, dados, timeout=600)
            restantes = 3 - dados['tentativas']
            return Response(
                {'erro': f'Código incorreto. {restantes} tentativa{"s" if restantes != 1 else ""} restante{"s" if restantes != 1 else ""}.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        cache.delete(cache_key)

        try:
            evento = Evento.objects.get(id=evento_id)
        except Evento.DoesNotExist:
            return Response({'erro': 'Evento não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            usuario = Usuario.objects.get(email__iexact=email)
        except Usuario.DoesNotExist:
            nome_padrao = email.split('@')[0].replace('.', ' ').replace('-', ' ').title()
            usuario = Usuario.objects.create_user(email=email, nome=nome_padrao, password=None)

        refresh = RefreshToken.for_user(usuario)
        return Response({
            'access':    str(refresh.access_token),
            'refresh':   str(refresh),
            'usuario':   UsuarioSerializer(usuario).data,
            'evento_id': evento.id,
        })


class AcessarEventoView(APIView):
    """
    POST /api/auth/acessar-evento/  (mantido para compatibilidade)
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        evento_id    = request.data.get('evento_id')
        email        = (request.data.get('email') or '').strip().lower()
        palavra_chave = (request.data.get('palavra_chave') or '').strip()

        if not evento_id or not email:
            return Response(
                {'erro': 'Informe o evento e o e-mail.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Valida domínio corporativo
        if not email.endswith('@aeb.gov.br'):
            return Response(
                {'erro': 'Utilize seu e-mail corporativo (@aeb.gov.br) para acessar o sistema.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Valida que o e-mail existe no Active Directory
        from ..services.ldap_service import email_existe_no_ad
        if not email_existe_no_ad(email):
            return Response(
                {'erro': 'E-mail não encontrado na base de colaboradores da AEB. '
                         'Verifique o endereço digitado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            evento = Evento.objects.get(id=evento_id, status='publicado')
        except Evento.DoesNotExist:
            return Response(
                {'erro': 'Evento não encontrado ou não está disponível.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if evento.palavra_chave and palavra_chave.lower() != evento.palavra_chave.strip().lower():
            return Response(
                {'erro': 'Palavra-chave incorreta. Verifique o e-mail recebido e tente novamente.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            usuario = Usuario.objects.get(email__iexact=email)
        except Usuario.DoesNotExist:
            nome_padrao = email.split('@')[0].replace('.', ' ').replace('-', ' ').title()
            usuario = Usuario.objects.create_user(email=email, nome=nome_padrao, password=None)


        refresh = RefreshToken.for_user(usuario)
        return Response({
            'access':   str(refresh.access_token),
            'refresh':  str(refresh),
            'usuario':  UsuarioSerializer(usuario).data,
            'evento_id': evento.id,
        })


class EventoPublicoView(APIView):
    """
    GET /api/auth/evento-publico/<evento_id>/
    Retorna dados públicos do evento para exibir na página de acesso (sem autenticação).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, _request, evento_id):
        try:
            evento = Evento.objects.get(id=evento_id, status='publicado')
        except Evento.DoesNotExist:
            return Response(
                {'erro': 'Evento não encontrado ou não está disponível.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({
            'id':               evento.id,
            'titulo':           evento.titulo,
            'tipo':             evento.tipo,
            'data':             str(evento.data),
            'hora_inicio':      str(evento.hora_inicio),
            'hora_fim':         str(evento.hora_fim),
            'nome_profissional': evento.nome_profissional,
            'requer_palavra_chave': bool(evento.palavra_chave),
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
    POST   /api/admin/eventos/<id>/cancelar/
    POST   /api/admin/eventos/<id>/enviar-emails/
    GET    /api/admin/eventos/<id>/exportar-csv/
    """
    queryset = Evento.objects.all().prefetch_related('horarios__agendamentos')
    serializer_class = EventoAdminSerializer
    permission_classes = [IsAdminUsuario]

    def get_queryset(self):
        _encerrar_eventos_expirados()
        return super().get_queryset()

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

        # Auto-assign pending manual participants to horarios ao publicar.
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
        """Cancela o evento, impedindo novos agendamentos."""
        evento = self.get_object()
        if evento.status != 'publicado':
            return Response(
                {'erro': 'Somente eventos publicados podem ser cancelados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        evento.status = 'cancelado'
        evento.save(update_fields=['status'])
        return Response({'mensagem': 'Evento cancelado com sucesso.'})

    @action(detail=True, methods=['post'], url_path='enviar-emails')
    def enviar_emails(self, request, pk=None):
        """
        Envia UM único e-mail para o endereço configurado em EMAIL_DESTINO_EVENTO
        (normalmente uma Lista de Distribuição corporativa).
        O envio é síncrono e imediato — sem Celery.
        """
        evento = self.get_object()
        if evento.status != 'publicado':
            return Response(
                {'erro': 'Somente eventos publicados podem receber disparo de e-mails.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ---------------------------------------------------------------------------
        # MODO TESTE — envia apenas para o e-mail do desenvolvedor.
        # Para ativar o envio real à Lista de Distribuição, comente o bloco
        # "MODO TESTE" e descomente o bloco "MODO PRODUÇÃO" abaixo.
        # ---------------------------------------------------------------------------
        destinatario = 'jonas.silva@aeb.gov.br'  # MODO TESTE

        # ---------------------------------------------------------------------------
        # MODO PRODUÇÃO — descomente quando for ao ar com a LD real.
        # ---------------------------------------------------------------------------
        # destinatario = getattr(settings, 'EMAIL_DESTINO_EVENTO', '').strip()
        # if not destinatario:
        #     return Response(
        #         {'erro': 'Destinatário não configurado. Defina EMAIL_DESTINO_EVENTO no arquivo .env.'},
        #         status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        #     )

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
            send_mail(
                subject=evento.titulo,
                message='',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[destinatario],
                html_message=corpo_html,
                fail_silently=False,
            )
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
        Registra manualmente um colaborador sem e-mail corporativo em evento publicado.
        Body: { nome, horario_id?, matricula?, departamento? }
        """
        evento = self.get_object()
        if evento.status != 'publicado':
            return Response(
                {'erro': 'Só é possível registrar participantes em eventos publicados.'},
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
        ocupados = confirmados + manuais

        if ocupados >= evento.capacidade_por_horario:
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
        _encerrar_eventos_expirados()
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
        _encerrar_eventos_expirados()
        return (
            Evento.objects
            .filter(status='publicado')
            .prefetch_related('horarios__agendamentos')
        )


class EventoDetailView(generics.RetrieveAPIView):
    """
    GET /api/colaborador/eventos/<id>/
    Detalhe do evento com todos os horários e disponibilidade.
    Cache de 3 segundos — reduz carga no banco durante pico de acesso.
    """
    serializer_class = EventoDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        _encerrar_eventos_expirados()
        return (
            Evento.objects
            .filter(status='publicado')
            .prefetch_related('horarios__agendamentos')
        )

    @method_decorator(cache_page(3))
    def get(self, *args, **kwargs):
        return super().get(*args, **kwargs)


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
        _encerrar_eventos_expirados()

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


# ---------------------------------------------------------------------------
# SUPERADMIN (CTI) — Gestão de Usuários via LDAP
# ---------------------------------------------------------------------------

class LdapSearchView(APIView):
    """
    GET /api/admin/ldap/buscar/?q=<termo>
    Pesquisa colaboradores no Active Directory (ou base Mock) por nome,
    e-mail, matrícula ou departamento.
    Acesso restrito a SuperAdmin (CTI).
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response(
                {'erro': 'Informe ao menos 2 caracteres para a busca.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resultados = ldap_buscar(q)

        # Enriquece cada resultado com o status atual no banco local
        emails = {u['email'] for u in resultados}
        usuarios_locais = {
            u.email: u
            for u in Usuario.objects.filter(email__in=emails)
        }

        for usuario in resultados:
            local = usuarios_locais.get(usuario['email'])
            usuario['no_sistema'] = local is not None
            usuario['is_admin'] = local.is_admin if local else False
            usuario['is_superuser'] = local.is_superuser if local else False

        return Response(resultados)


class PromoverAdminView(APIView):
    """
    POST /api/admin/ldap/promover/
    Cria o usuário no banco local (se não existir) e o promove a Admin de Eventos.
    Body: { email, nome, matricula, departamento }
    Acesso restrito a SuperAdmin (CTI).
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        nome = request.data.get('nome', '').strip()
        matricula = request.data.get('matricula', '').strip()
        departamento = request.data.get('departamento', '').strip()

        if not email or not nome:
            return Response(
                {'erro': 'E-mail e nome são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario, criado = Usuario.objects.get_or_create(
            email=email,
            defaults={
                'nome': nome,
                'matricula': matricula,
                'departamento': departamento,
                'is_admin': True,
                'is_staff': True,
                'is_active': True,
            },
        )

        if not criado:
            # Já existe — apenas promove
            usuario.is_admin = True
            usuario.is_staff = True
            if nome:
                usuario.nome = nome
            if matricula:
                usuario.matricula = matricula
            if departamento:
                usuario.departamento = departamento
            usuario.save(update_fields=['is_admin', 'is_staff', 'nome', 'matricula', 'departamento'])

        if criado:
            # TODO (LDAP): Remover este bloco quando a autenticação via AD estiver
            # implementada. Em produção a senha será validada diretamente no LDAP/AD
            # e não precisará ser armazenada localmente.
            usuario.set_password(MOCK_SENHA_PADRAO)
            usuario.save(update_fields=['password'])

        return Response(
            UsuarioSerializer(usuario).data,
            status=status.HTTP_201_CREATED if criado else status.HTTP_200_OK,
        )


class RevogarAdminView(APIView):
    """
    POST /api/admin/ldap/revogar/<id>/
    Remove o acesso de administrador de um usuário.
    Acesso restrito a SuperAdmin (CTI).
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request, usuario_id):
        try:
            usuario = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response(
                {'erro': 'Usuário não encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if usuario.is_superuser:
            return Response(
                {'erro': 'Não é possível revogar acesso de um Super Admin.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario.is_admin = False
        usuario.is_staff = False
        usuario.save(update_fields=['is_admin', 'is_staff'])
        return Response({'mensagem': f'Acesso de administrador revogado para {usuario.nome}.'})


class ListarAdminsView(generics.ListAPIView):
    """
    GET /api/admin/ldap/admins/
    Lista todos os usuários com acesso administrativo (is_admin=True).
    Acesso restrito a SuperAdmin (CTI).
    """
    serializer_class = UsuarioSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        return Usuario.objects.filter(is_admin=True).order_by('nome')


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
