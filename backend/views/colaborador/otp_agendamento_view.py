"""
OTP de confirmação de agendamento.

Fluxo:
  POST /api/colaborador/horarios/<horario_id>/solicitar-otp/
    → gera código de 4 dígitos, armazena no cache por 5 min, envia ao e-mail do usuário

O código é depois validado dentro de ReservarHorarioView (campo otp no body),
garantindo que só o dono do e-mail consegue completar o agendamento.
"""
import random

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models.models import Horario


def cache_key_otp(usuario_id: int, horario_id: int) -> str:
    return f'otp_agendamento:{usuario_id}:{horario_id}'


class SolicitarOTPAgendamentoView(APIView):
    """
    POST /api/colaborador/horarios/<horario_id>/solicitar-otp/
    Envia um código de 4 dígitos ao e-mail do usuário autenticado.
    Expira em 5 minutos. Bloqueia após 3 tentativas erradas na validação.
    """
    permission_classes = [permissions.IsAuthenticated]

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
        codigo = f'{random.randint(0, 9999):04d}'
        key = cache_key_otp(usuario.id, horario_id)
        cache.set(key, {'codigo': codigo, 'tentativas': 0}, timeout=300)  # 5 minutos

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
            cache.delete(key)
            return Response(
                {'erro': 'Não foi possível enviar o código. Tente novamente.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({'mensagem': f'Código enviado para {usuario.email}.'})
