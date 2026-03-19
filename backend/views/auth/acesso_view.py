from django.conf import settings

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from ...models.models import ConviteEmail, Evento, Usuario
from ...serializers.serializers import UsuarioSerializer
from ...services.ldap_service import email_existe_no_ad


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
            return Response(self._emitir_jwt(convite))

        palavra_chave = request.data.get('palavra_chave', '').strip()
        if not palavra_chave:
            return Response(
                {'erro': 'Informe a palavra-chave para acessar o evento.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if palavra_chave.lower() != evento.palavra_chave.strip().lower():
            return Response(
                {'erro': 'Palavra-chave incorreta. Tente novamente.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(self._emitir_jwt(convite))


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


class AcessarEventoView(APIView):
    """
    POST /api/auth/acessar-evento/  (mantido para compatibilidade)
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        evento_id     = request.data.get('evento_id')
        email         = (request.data.get('email') or '').strip().lower()
        palavra_chave = (request.data.get('palavra_chave') or '').strip()

        if not evento_id or not email:
            return Response(
                {'erro': 'Informe o evento e o e-mail.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not email.endswith('@aeb.gov.br'):
            return Response(
                {'erro': 'Utilize seu e-mail corporativo (@aeb.gov.br) para acessar o sistema.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
            'access':    str(refresh.access_token),
            'refresh':   str(refresh),
            'usuario':   UsuarioSerializer(usuario).data,
            'evento_id': evento.id,
        })
