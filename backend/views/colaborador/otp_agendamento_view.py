"""
OTP de confirmação de agendamento.

Fluxo:
  POST /api/colaborador/horarios/<horario_id>/solicitar-otp/
    → gera código de 4 dígitos, armazena no cache por 5 min, envia ao e-mail do usuário

O código é depois validado dentro de ReservarHorarioView (campo otp no body),
garantindo que só o dono do e-mail consegue completar o agendamento.
"""
import random
import time

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from ...models.models import Horario
from ...serializers.api_docs import ErroSerializer, OtpAgendamentoResponseSerializer, SolicitarOtpAgendamentoRequestSerializer

OTP_AGENDAMENTO_TIMEOUT_SEGUNDOS = 300


def cache_key_otp(usuario_id: int, horario_id: int) -> str:
    return f'otp_agendamento:{usuario_id}:{horario_id}'


def segundos_restantes_otp(dados_otp: dict | None) -> int:
    if not dados_otp:
        return 0
    expira_em = dados_otp.get('expira_em')
    if not expira_em:
        return OTP_AGENDAMENTO_TIMEOUT_SEGUNDOS
    return max(0, int(expira_em - time.time()))


class SolicitarOTPAgendamentoView(APIView):
    """
    POST /api/colaborador/horarios/<horario_id>/solicitar-otp/
    Envia um código de 4 dígitos ao e-mail do usuário autenticado.
    Expira em 5 minutos. Bloqueia após 3 tentativas erradas na validação.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'auth_public'

    @extend_schema(
        request=SolicitarOtpAgendamentoRequestSerializer,
        responses={200: OtpAgendamentoResponseSerializer, 404: ErroSerializer, 503: ErroSerializer},
        summary='Solicita OTP para confirmar agendamento',
    )
    def post(self, request, horario_id):
        try:
            horario = Horario.objects.select_related('evento').get(
                id=horario_id, evento__status='publicado'
            )
        except Horario.DoesNotExist:
            return Response(
                {'erro': 'Horário não encontrado ou evento indisponível.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        usuario = request.user
        key = cache_key_otp(usuario.id, horario_id)
        reenviar = request.data.get('reenviar') is True
        dados_existentes = cache.get(key)
        segundos_restantes = segundos_restantes_otp(dados_existentes)

        if (
            dados_existentes
            and segundos_restantes > 0
            and dados_existentes.get('tentativas', 0) < 3
            and not reenviar
        ):
            return Response({
                'mensagem': f'Código já enviado para {usuario.email}. Verifique sua caixa de entrada.',
                'reutilizado': True,
                'segundos_restantes': segundos_restantes,
            })

        codigo = f'{random.randint(0, 9999):04d}'
        cache.set(
            key,
            {
                'codigo': codigo,
                'tentativas': 0,
                'expira_em': time.time() + OTP_AGENDAMENTO_TIMEOUT_SEGUNDOS,
            },
            timeout=OTP_AGENDAMENTO_TIMEOUT_SEGUNDOS,
        )

        evento = horario.evento
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;">
          <h2 style="color:#1d4ed8;margin-bottom:8px;">Agenda Bem-Estar</h2>
          <p style="color:#374151;">Olá <strong>{usuario.nome}</strong>,</p>
          <p style="color:#374151;">
            Você solicitou a confirmação de agendamento para o evento
            <strong>{evento.titulo}</strong> no horário
            <strong>{horario.hora_inicio.strftime('%H:%M')} às {horario.hora_fim.strftime('%H:%M')}</strong>.
          </p>
          <p style="color:#374151;">Seu código de confirmação é:</p>
          <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:12px;
                      padding:24px;text-align:center;margin:24px 0;">
            <span style="font-size:48px;font-weight:bold;letter-spacing:12px;color:#1d4ed8;">
              {codigo}
            </span>
          </div>
          <p style="color:#6b7280;font-size:13px;">
            Este código expira em <strong>5 minutos</strong> e é de uso único.<br>
            Se você não solicitou este código, ignore este e-mail.
          </p>
        </div>"""

        try:
            send_mail(
                subject='Código de confirmação — Agenda Bem-Estar',
                message='',
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@aeb.gov.br'),
                recipient_list=[usuario.email],
                html_message=html,
                fail_silently=False,
            )
        except Exception:
            if dados_existentes and segundos_restantes > 0:
                cache.set(key, dados_existentes, timeout=segundos_restantes)
            else:
                cache.delete(key)
            return Response(
                {'erro': 'Não foi possível enviar o código. Tente novamente.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({
            'mensagem': f'Código enviado para {usuario.email}.',
            'reutilizado': False,
            'segundos_restantes': OTP_AGENDAMENTO_TIMEOUT_SEGUNDOS,
        })
