from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from ...domain.exceptions import ListaEsperaError
from ...models.models import Usuario
from ...serializers.serializers import UsuarioSerializer
from ...services.lista_espera_service import confirmar_vaga


class ConfirmarVagaListaEsperaView(APIView):
    """
    POST /api/auth/confirmar-vaga/<token>/
    Endpoint público (sem autenticação). O colaborador clica no link do e-mail,
    o frontend chama este endpoint com o token e recebe um JWT.
    """
    permission_classes = [permissions.AllowAny]

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
