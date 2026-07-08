from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from ...domain.exceptions import ListaEsperaError
from ...models.models import Usuario
from ...serializers.api_docs import ErroSerializer, TokenResponseSerializer
from ...serializers.serializers import UsuarioSerializer
from ...services.lista_espera.service import confirmar_vaga


class ConfirmarVagaListaEsperaView(APIView):
    """
    POST /api/auth/confirmar-vaga/<token>/
    Endpoint público (sem autenticação). O colaborador clica no link do e-mail,
    o frontend chama este endpoint com o token e recebe um JWT.
    """
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth_public'

    @extend_schema(
        request=None,
        responses={200: TokenResponseSerializer, 400: ErroSerializer, 404: ErroSerializer, 409: ErroSerializer},
        summary='Confirma vaga da lista de espera',
    )
    def post(self, request, token):
        try:
            resultado = confirmar_vaga(token)
        except ListaEsperaError as exc:
            return Response({'erro': exc.mensagem}, status=exc.http_status)

        usuario = Usuario.objects.get(id=resultado.usuario_id)
        refresh = RefreshToken.for_user(usuario)
        return Response({
            'access':   str(refresh.access_token),
            'refresh':  str(refresh),
            'usuario':  UsuarioSerializer(usuario).data,
            'evento_id': resultado.evento_id,
            'mensagem': 'Vaga confirmada com sucesso! Seu agendamento foi criado.',
        })
