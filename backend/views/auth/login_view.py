from django.contrib.auth import authenticate

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from ...serializers.serializers import AdminLoginSerializer, UsuarioSerializer


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
