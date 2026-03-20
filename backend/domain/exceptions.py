class ListaEsperaError(Exception):
    """Exceção base para erros de domínio da lista de espera."""
    http_status: int = 400
    mensagem: str = 'Erro desconhecido.'


class TokenInvalidoError(ListaEsperaError):
    http_status = 404
    mensagem = 'Link inválido ou não encontrado.'


class VagaJaConfirmadaError(ListaEsperaError):
    http_status = 400
    mensagem = 'Esta vaga já foi confirmada anteriormente.'


class VagaExpiradaError(ListaEsperaError):
    http_status = 400
    mensagem = 'O prazo para confirmar esta vaga expirou. Você foi removido da fila.'


class AguardandoNotificacaoError(ListaEsperaError):
    http_status = 400
    mensagem = 'Você ainda não foi notificado. Aguarde sua vez na fila.'


class PrazoConfirmacaoExpiradoError(ListaEsperaError):
    http_status = 400
    mensagem = 'O prazo de 2 horas para confirmar expirou. A vaga foi oferecida ao próximo da fila.'


class VagaIndisponivelError(ListaEsperaError):
    http_status = 409
    mensagem = 'A vaga foi preenchida antes de sua confirmação. O próximo da fila foi notificado.'
