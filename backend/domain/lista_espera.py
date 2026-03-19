"""
Domain layer — regras de negócio puras da lista de espera.

Nenhuma dependência de ORM, Django ou infraestrutura.
Testável de forma unitária sem banco de dados.
"""
from .exceptions import (
    AguardandoNotificacaoError,
    PrazoConfirmacaoExpiradoError,
    VagaExpiradaError,
    VagaJaConfirmadaError,
)


class StatusListaEspera:
    AGUARDANDO = 'aguardando'
    NOTIFICADO = 'notificado'
    CONFIRMADO = 'confirmado'
    EXPIRADO = 'expirado'


class StatusAgendamento:
    CONFIRMADO = 'confirmado'
    CANCELADO = 'cancelado'


def validar_estado_pre_confirmacao(status: str) -> None:
    """
    Valida se o status da entrada permite tentativa de confirmação.

    Levanta exceção de domínio específica quando o estado impede a confirmação
    sem necessidade de qualquer escrita no banco de dados.

    Não verifica o prazo (expira_em) porque essa validação requer uma escrita
    atômica — é responsabilidade do service.
    """
    if status == StatusListaEspera.CONFIRMADO:
        raise VagaJaConfirmadaError()
    if status == StatusListaEspera.EXPIRADO:
        raise VagaExpiradaError()
    if status == StatusListaEspera.AGUARDANDO:
        raise AguardandoNotificacaoError()
    # Único estado válido para prosseguir: NOTIFICADO


def prazo_expirou(expira_em, agora) -> bool:
    """Regra pura: retorna True se o prazo de confirmação já passou."""
    return bool(expira_em and agora > expira_em)
