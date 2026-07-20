from django.conf import settings

from .. import email_service


MODO_ENVIO_IMEDIATO = 'imediato'
MODO_ENVIO_AGENDADO = 'agendado'
AGENDAMENTO_EMAIL_MINIMO_MINUTOS = 5

EMAIL_STATUS_NAO_AGENDADO = 'nao_agendado'
EMAIL_STATUS_AGENDADO = 'agendado'
EMAIL_STATUS_ENVIANDO = 'enviando'
EMAIL_STATUS_ENVIADO = 'enviado'
EMAIL_STATUS_FALHOU = 'falhou'
EMAIL_STATUS_CANCELADO = 'cancelado'


def get_destinatarios_email_evento() -> list[str]:
    destinatarios_raw = getattr(settings, 'EMAIL_DESTINO_EVENTO', '').strip()
    return [d.strip() for d in destinatarios_raw.split(',') if d.strip()]


def montar_corpo_email_evento(evento) -> str:
    corpo_html = evento.corpo_email or ''
    link_acesso = f"{settings.FRONTEND_URL}/evento/{evento.id}/entrar"

    if evento.palavra_chave:
        corpo_html += (
            f'<div style="margin-top:24px;padding:16px 20px;background:#fffbeb;'
            f'border-left:4px solid #f59e0b;border-radius:6px;">'
            f'<p style="margin:0 0 6px;font-size:13px;color:#92400e;font-weight:600;">'
            f'PALAVRA-CHAVE DE ACESSO</p>'
            f'<p style="margin:0;font-size:22px;font-weight:bold;letter-spacing:3px;color:#78350f;">'
            f'{evento.palavra_chave}</p>'
            f'<p style="margin:8px 0 0;font-size:12px;color:#92400e;">'
            f'Voce precisara informar esta palavra-chave ao clicar no link abaixo.</p>'
            f'</div>'
        )

    corpo_html += (
        f'<p style="margin-top:24px;text-align:center;">'
        f'<a href="{link_acesso}" style="display:inline-block;padding:12px 32px;'
        f'background:#1d4ed8;color:#fff;font-size:15px;font-weight:bold;'
        f'text-decoration:none;border-radius:6px;">Acessar e Agendar</a></p>'
    )
    return corpo_html


def enviar_emails_evento(evento) -> list[str]:
    destinatarios = get_destinatarios_email_evento()
    if not destinatarios:
        raise ValueError('Destinatario nao configurado. Defina EMAIL_DESTINO_EVENTO no .env.')

    corpo_html = montar_corpo_email_evento(evento)
    for dest in destinatarios:
        email_service.enviar_html_evento(evento.titulo, corpo_html, dest)
    return destinatarios
