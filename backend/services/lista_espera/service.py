"""
Caso de uso: confirmação de vaga da lista de espera.

Responsabilidades:
- Orquestrar validações de domínio (sem ORM)
- Controle transacional com select_for_update para evitar race conditions
- Delegar side-effects (e-mails) para após o commit via transaction.on_commit
- Nunca retornar Response — apenas dados ou exceções de domínio

Decisão técnica — "write-then-raise":
    Os casos de PrazoExpirado e VagaIndisponivel precisam persistir uma mudança
    de status E sinalizar erro ao chamador. Se levantássemos exceção dentro de
    @transaction.atomic, o Django faria rollback do save. A solução é usar
    `with transaction.atomic()` como gerenciador de contexto e levantar a
    exceção APÓS o bloco sair — o commit já ocorreu, sem rollback.
"""
from dataclasses import dataclass
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from ...domain.exceptions import (
    PrazoConfirmacaoExpiradoError,
    TokenInvalidoError,
    VagaIndisponivelError,
)
from ...domain.lista_espera import (
    StatusAgendamento,
    StatusListaEspera,
    prazo_expirou,
    validar_estado_pre_confirmacao,
)
from ...models.models import Agendamento, Horario, ListaEspera
from .. import email_service


@dataclass(frozen=True)
class ResultadoConfirmacao:
    usuario_id: int
    evento_id: int
    agendamento_id: int


def confirmar_vaga(token: str) -> ResultadoConfirmacao:
    """
    Confirma uma vaga da lista de espera a partir do token recebido por e-mail.

    Fluxo:
    1. Carrega a entrada pelo token
    2. Valida o estado (domínio puro, sem escrita)
    3. Se prazo expirado: persiste EXPIRADO em transação própria, depois levanta erro
    4. Tenta confirmar com lock pessimista no slot (select_for_update)
    5. Se vaga fechou por concorrência: persiste EXPIRADO, depois levanta erro
    6. Sucesso: cria Agendamento, marca CONFIRMADO, agenda e-mail pós-commit

    Raises:
        TokenInvalidoError
        VagaJaConfirmadaError
        VagaExpiradaError
        AguardandoNotificacaoError
        PrazoConfirmacaoExpiradoError
        VagaIndisponivelError
    """
    try:
        entrada = ListaEspera.objects.select_related(
            'usuario', 'horario__evento'
        ).get(token_confirmacao=token)
    except ListaEspera.DoesNotExist:
        raise TokenInvalidoError()

    # Validações de estado que não requerem escrita — delega ao domínio puro
    validar_estado_pre_confirmacao(entrada.status)

    agora = timezone.now()

    # --- Caso: prazo de 2h esgotado ---
    # Commit separado para garantir que o EXPIRADO persista antes do erro.
    if prazo_expirou(entrada.expira_em, agora):
        with transaction.atomic():
            entrada.status = StatusListaEspera.EXPIRADO
            entrada.save(update_fields=['status'])
            horario_id = entrada.horario_id
            transaction.on_commit(lambda: notificar_proximo_na_fila(horario_id))
        # Levantado FORA do with: commit já ocorreu, sem rollback
        raise PrazoConfirmacaoExpiradoError()

    # --- Caso: confirmação principal ---
    vaga_indisponivel = False
    resultado = None

    with transaction.atomic():
        # Lock pessimista: bloqueia o slot para evitar dupla confirmação
        horario = Horario.objects.select_for_update().get(id=entrada.horario_id)

        if not horario.disponivel:
            # Vaga foi preenchida entre a notificação e esta confirmação
            vaga_indisponivel = True
            entrada.status = StatusListaEspera.EXPIRADO
            entrada.save(update_fields=['status'])
            horario_id = horario.id
            transaction.on_commit(lambda: notificar_proximo_na_fila(horario_id))

        else:
            # Cancela agendamento anterior do mesmo evento, se houver
            Agendamento.objects.filter(
                usuario=entrada.usuario,
                horario__evento=horario.evento,
                status=StatusAgendamento.CONFIRMADO,
            ).update(status=StatusAgendamento.CANCELADO)

            agendamento, _ = Agendamento.objects.update_or_create(
                usuario=entrada.usuario,
                horario=horario,
                defaults={'status': StatusAgendamento.CONFIRMADO},
            )

            # Remove o usuário de todas as outras filas deste evento
            ListaEspera.objects.filter(
                usuario=entrada.usuario,
                horario__evento=horario.evento,
                status__in=[StatusListaEspera.AGUARDANDO, StatusListaEspera.NOTIFICADO],
            ).exclude(pk=entrada.pk).update(status=StatusListaEspera.EXPIRADO)

            entrada.status = StatusListaEspera.CONFIRMADO
            entrada.save(update_fields=['status'])

            agendamento_id = agendamento.id
            # E-mail somente após commit: falha no SMTP não desfaz o agendamento
            transaction.on_commit(lambda: _enviar_confirmacao_pos_commit(agendamento_id))

            resultado = ResultadoConfirmacao(
                usuario_id=entrada.usuario_id,
                evento_id=horario.evento_id,
                agendamento_id=agendamento.id,
            )

    # Levantado FORA do with: commit já ocorreu, EXPIRADO foi persistido
    if vaga_indisponivel:
        raise VagaIndisponivelError()

    return resultado


def notificar_proximo_na_fila(horario_id: int) -> None:
    """
    Expira entradas vencidas e notifica o próximo colaborador aguardando na fila.

    Deve ser invocado via transaction.on_commit para garantir leitura
    consistente após o commit que liberou a vaga.
    """
    agora = timezone.now()

    try:
        horario = Horario.objects.get(id=horario_id)
    except Horario.DoesNotExist:
        return

    # Limpa notificações vencidas
    ListaEspera.objects.filter(
        horario=horario,
        status=StatusListaEspera.NOTIFICADO,
        expira_em__lt=agora,
    ).update(status=StatusListaEspera.EXPIRADO)

    if not horario.disponivel:
        return

    proximo = (
        ListaEspera.objects
        .filter(horario=horario, status=StatusListaEspera.AGUARDANDO)
        .order_by('posicao')
        .select_related('usuario', 'horario__evento')
        .first()
    )
    if not proximo:
        return

    proximo.status = StatusListaEspera.NOTIFICADO
    proximo.notificado_em = agora
    proximo.expira_em = agora + timedelta(minutes=5)
    proximo.save(update_fields=['status', 'notificado_em', 'expira_em'])

    email_service.enviar_vaga_lista_espera(proximo)


def _enviar_confirmacao_pos_commit(agendamento_id: int) -> None:
    try:
        agendamento = Agendamento.objects.select_related(
            'usuario', 'horario__evento'
        ).get(id=agendamento_id)
        email_service.enviar_confirmacao_agendamento(agendamento)
    except Agendamento.DoesNotExist:
        pass
