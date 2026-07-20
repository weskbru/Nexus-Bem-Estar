import random

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from ...models.models import Evento, Usuario
from ...serializers.api_docs import (
    ErroSerializer,
    MensagemSerializer,
    SolicitarAcessoRequestSerializer,
    TokenResponseSerializer,
    VerificarCodigoRequestSerializer,
)
from ...serializers.serializers import UsuarioSerializer
from ...services.ldap.service import email_existe_no_ad


class SolicitarAcessoView(APIView):
    """
    POST /api/auth/solicitar-acesso/
    Passo 1: valida e-mail + palavra-chave, envia código OTP de 6 dígitos.
    Body: { evento_id, email, palavra_chave? }
    """
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth_public'

    @extend_schema(
        request=SolicitarAcessoRequestSerializer,
        responses={
            200: MensagemSerializer,
            400: ErroSerializer,
            401: ErroSerializer,
            404: ErroSerializer,
            503: ErroSerializer,
        },
        summary='Solicita codigo OTP para acesso ao evento',
    )
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
                {'erro': 'Utilize seu e-mail corporativo (@aeb.gov.br).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not email_existe_no_ad(email):
            return Response(
                {'erro': 'E-mail não encontrado na base de colaboradores da AEB.'},
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

        codigo = f'{random.randint(0, 999999):06d}'
        cache_key = f'otp:{evento_id}:{email}'
        cache.set(cache_key, {'codigo': codigo, 'tentativas': 0}, timeout=600)

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
    throttle_scope = 'auth_public'

    @extend_schema(
        request=VerificarCodigoRequestSerializer,
        responses={
            200: TokenResponseSerializer,
            400: ErroSerializer,
            401: ErroSerializer,
            404: ErroSerializer,
            429: ErroSerializer,
        },
        summary='Valida codigo OTP e emite JWT',
    )
    def post(self, request):
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
