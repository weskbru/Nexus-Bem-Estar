from .. import email_service as base_email_service


def get_destinatarios_comunicado() -> list[str]:
    return base_email_service.get_destinatarios_evento()


def enviar_para_lista_comunicado(assunto: str, corpo_html: str) -> int:
    return base_email_service.enviar_para_lista_evento(assunto, corpo_html)


def enviar_comunicado(usuario, assunto: str, corpo_html: str) -> None:
    base_email_service.enviar_comunicado(usuario, assunto, corpo_html)
