import csv

from django.contrib.auth import authenticate
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.http import StreamingHttpResponse
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

        link_sistema = f"{settings.FRONTEND_URL}/eventos"

        secao_chave = ''
        if evento.palavra_chave:
            secao_chave = f"""
        <tr>
          <td style="padding:16px 24px;background:#fffbeb;border-left:4px solid #f59e0b;">
            <p style="margin:0;font-size:14px;color:#92400e;">
              🔑 <strong>Palavra-chave de acesso:</strong>
              <span style="font-size:18px;font-weight:bold;letter-spacing:2px;color:#78350f;">
                &nbsp;{evento.palavra_chave}
              </span>
            </p>
            <p style="margin:6px 0 0;font-size:12px;color:#92400e;">
              Você precisará informar esta palavra-chave ao acessar o evento pelo link abaixo.
            </p>
          </td>
        </tr>"""

        profissional_linha = ''
        if evento.nome_profissional:
            profissional_linha = f'<tr><td style="padding:4px 24px;font-size:14px;color:#6b7280;">👤 Profissional: <strong>{evento.nome_profissional}</strong></td></tr>'

        corpo_html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
          <!-- Cabeçalho -->
          <tr>
            <td style="background:#1d4ed8;padding:24px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:bold;color:#ffffff;">
                🌿 Programa de Bem-Estar AEB
              </p>
            </td>
          </tr>
          <!-- Chamada -->
          <tr>
            <td style="padding:24px 24px 8px;">
              <p style="margin:0;font-size:16px;color:#111827;">
                Prezado(a) colaborador(a),
              </p>
              <p style="margin:12px 0 0;font-size:15px;color:#374151;line-height:1.6;">
                Um novo evento de bem-estar está disponível para agendamento.
                Acesse o sistema e garanta sua vaga!
              </p>
            </td>
          </tr>
          <!-- Detalhes do evento -->
          <tr>
            <td style="padding:16px 24px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
                <tr>
                  <td style="padding:14px 16px;font-size:18px;font-weight:bold;color:#1d4ed8;border-bottom:1px solid #e5e7eb;">
                    {evento.titulo}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 16px 4px;font-size:14px;color:#6b7280;">
                    📅 Data: <strong>{evento.data.strftime('%d/%m/%Y')}</strong>
                    &nbsp;&nbsp;
                    🕐 Horário: <strong>{evento.hora_inicio.strftime('%H:%M')} às {evento.hora_fim.strftime('%H:%M')}</strong>
                  </td>
                </tr>
                {profissional_linha}
                <tr><td style="padding:8px;"></td></tr>
              </table>
            </td>
          </tr>
          {secao_chave}
          <!-- Botão -->
          <tr>
            <td style="padding:24px;text-align:center;">
              <a href="{link_sistema}"
                 style="display:inline-block;padding:12px 32px;background:#1d4ed8;color:#ffffff;
                        font-size:15px;font-weight:bold;text-decoration:none;border-radius:6px;">
                Acessar o Sistema e Agendar
              </a>
            </td>
          </tr>
          <!-- Rodapé -->
          <tr>
            <td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;
                       text-align:center;font-size:12px;color:#9ca3af;">
              Este e-mail foi enviado automaticamente pelo Sistema de Bem-Estar da AEB.<br>
              Por favor, não responda a esta mensagem.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        try:
            send_mail(
                subject=f'[Bem-Estar AEB] Novo evento disponível: {evento.titulo}',
                message=f"Novo evento disponível: {evento.titulo} — {evento.data.strftime('%d/%m/%Y')} {evento.hora_inicio.strftime('%H:%M')} às {evento.hora_fim.strftime('%H:%M')}. Acesse: {link_sistema}",
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
    Cache de 3 segundos — reduz carga no banco durante pico de acesso.
    """
    queryset = (
        Evento.objects
        .filter(status='publicado')
        .prefetch_related('horarios__agendamentos')
    )
    serializer_class = EventoDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

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
