import logging
import time
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from ...domain.exceptions import ComunicadoEnvioError
from ...models.models import Comunicado
from ..comum.resultado_processamento import ResultadoProcessamento
from . import email_service

logger = logging.getLogger(__name__)


def processar_comunicados_agendados(limite: int = 10) -> ResultadoProcessamento:
    inicio = time.monotonic()
    agora = timezone.now()
    resultado = ResultadoProcessamento()

    travados = marcar_enviando_travados_como_falha()
    comunicados = _buscar_e_marcar_como_enviando(agora, limite)

    if comunicados or travados:
        logger.info(
            'comunicados_scheduler_inicio',
            extra={'quantidade_encontrada': len(comunicados), 'travados_corrigidos': travados},
        )

    for comunicado in comunicados:
        try:
            total = _enviar_comunicado(comunicado)
        except Exception as exc:
            resultado.falhas += 1
            _marcar_como_falhou(comunicado.id, exc)
            resultado.mensagens.append(f'Falha ao enviar comunicado {comunicado.id}: {exc}')
            logger.exception(
                'comunicado_agendado_envio_falhou',
                extra={'comunicado_id': comunicado.id},
            )
            continue

        resultado.enviados += 1
        _marcar_como_enviado(comunicado.id, total)
        resultado.mensagens.append(f'Comunicado {comunicado.id} enviado para {total} destinatario(s).')

    duracao = time.monotonic() - inicio
    if comunicados or travados or resultado.enviados or resultado.falhas:
        logger.info(
            'comunicados_scheduler_fim',
            extra={
                'quantidade_encontrada': len(comunicados),
                'travados_corrigidos': travados,
                'enviados': resultado.enviados,
                'falhas': resultado.falhas,
                'duracao_segundos': round(duracao, 3),
            },
        )

    return resultado


def marcar_enviando_travados_como_falha(minutos: int = 15) -> int:
    limite_tempo = timezone.now() - timedelta(minutes=minutos)
    return Comunicado.objects.filter(
        status=Comunicado.Status.ENVIANDO,
        atualizado_em__lt=limite_tempo,
    ).update(
        status=Comunicado.Status.FALHOU,
        erro_envio='Envio interrompido: comunicado ficou em processamento por mais de 15 minutos.',
        atualizado_em=timezone.now(),
    )


def _buscar_e_marcar_como_enviando(agora, limite: int) -> list[Comunicado]:
    with transaction.atomic():
        comunicados = list(
            Comunicado.objects
            .select_for_update(skip_locked=True)
            .filter(status=Comunicado.Status.AGENDADO, agendado_para__lte=agora)
            .order_by('agendado_para')[:limite]
        )
        for comunicado in comunicados:
            comunicado.status = Comunicado.Status.ENVIANDO
            comunicado.tentativas_envio += 1
            comunicado.erro_envio = ''
            comunicado.save(update_fields=['status', 'tentativas_envio', 'erro_envio', 'atualizado_em'])
        return comunicados


def _enviar_comunicado(comunicado: Comunicado) -> int:
    if not email_service.get_destinatarios_comunicado():
        raise ComunicadoEnvioError('Destinatario nao configurado.')
    return email_service.enviar_para_lista_comunicado(comunicado.assunto, comunicado.corpo_html)


def _marcar_como_enviado(comunicado_id: int, total: int) -> None:
    agora = timezone.now()
    Comunicado.objects.filter(id=comunicado_id).update(
        status=Comunicado.Status.ENVIADO,
        enviado_em=agora,
        total_destinatarios=total,
        erro_envio='',
        atualizado_em=agora,
    )


def _marcar_como_falhou(comunicado_id: int, exc: Exception) -> None:
    Comunicado.objects.filter(id=comunicado_id).update(
        status=Comunicado.Status.FALHOU,
        erro_envio=str(exc)[:1000],
        atualizado_em=timezone.now(),
    )
