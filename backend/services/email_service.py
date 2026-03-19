"""
Serviço de e-mail — funções puras de envio, sem lógica de negócio.

Movido de views.py para quebrar o acoplamento entre a camada de apresentação
e os side-effects de infraestrutura (SMTP).
"""
from django.conf import settings
from django.core.mail import send_mail


def enviar_confirmacao_agendamento(agendamento) -> None:
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
        + "\nAtt,\nEquipe de Bem-Estar"
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
        pass


def enviar_vaga_lista_espera(entrada) -> None:
    """Envia e-mail avisando que uma vaga abriu para o colaborador na lista de espera."""
    horario = entrada.horario
    evento = horario.evento
    usuario = entrada.usuario
    link = f"{settings.FRONTEND_URL}/confirmar-vaga/{entrada.token_confirmacao}"

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;">
      <h2 style="color:#1d4ed8;margin-bottom:4px;">Agenda Bem-Estar</h2>
      <p style="color:#374151;">Olá <strong>{usuario.nome}</strong>,</p>
      <p style="color:#374151;">
        Uma vaga abriu para o evento <strong>{evento.titulo}</strong>!
      </p>
      <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 6px;color:#166534;font-weight:600;">📅 {evento.data.strftime('%d/%m/%Y')}</p>
        <p style="margin:0 0 6px;color:#166534;">
          ⏰ {horario.hora_inicio.strftime('%H:%M')} às {horario.hora_fim.strftime('%H:%M')}
        </p>
        {f'<p style="margin:0;color:#166534;">👤 {evento.nome_profissional}</p>' if evento.nome_profissional else ''}
      </div>
      <p style="color:#dc2626;font-weight:600;">
        ⚠️ Você tem <strong>2 horas</strong> para confirmar sua participação.
        Após esse prazo a vaga será oferecida ao próximo da fila.
      </p>
      <p style="text-align:center;margin:28px 0;">
        <a href="{link}"
           style="display:inline-block;padding:14px 36px;background:#16a34a;color:#fff;
                  font-size:15px;font-weight:bold;text-decoration:none;border-radius:8px;">
          Confirmar Minha Vaga
        </a>
      </p>
      <p style="color:#9ca3af;font-size:12px;">
        Se você não quiser mais participar, basta ignorar este e-mail.
      </p>
    </div>"""

    try:
        send_mail(
            subject=f'Vaga disponível: {evento.titulo}',
            message='',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[usuario.email],
            html_message=html,
            fail_silently=True,
        )
    except Exception:
        pass


def enviar_cancelamento_evento(evento, agendamentos) -> None:
    """Notifica todos os colaboradores com agendamento confirmado sobre o cancelamento do evento."""
    for ag in agendamentos:
        usuario = ag.usuario
        horario = ag.horario
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;">
          <h2 style="color:#dc2626;margin-bottom:4px;">Evento Cancelado</h2>
          <p style="color:#374151;">Olá <strong>{usuario.nome}</strong>,</p>
          <p style="color:#374151;">
            Infelizmente o evento <strong>{evento.titulo}</strong> foi cancelado pelo organizador.
          </p>
          <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:12px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 6px;color:#991b1b;font-weight:600;">📅 {evento.data.strftime('%d/%m/%Y')}</p>
            <p style="margin:0 0 6px;color:#991b1b;">
              ⏰ {horario.hora_inicio.strftime('%H:%M')} às {horario.hora_fim.strftime('%H:%M')}
            </p>
            <p style="margin:0;color:#991b1b;">Seu agendamento foi cancelado automaticamente.</p>
          </div>
          <p style="color:#6b7280;font-size:13px;">
            Se você tiver dúvidas, entre em contato com a equipe de bem-estar da AEB.
          </p>
          <p style="color:#6b7280;font-size:13px;">Att,<br>Equipe de Bem-Estar</p>
        </div>"""

        try:
            send_mail(
                subject=f'Evento cancelado: {evento.titulo}',
                message='',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[usuario.email],
                html_message=html,
                fail_silently=True,
            )
        except Exception:
            pass
