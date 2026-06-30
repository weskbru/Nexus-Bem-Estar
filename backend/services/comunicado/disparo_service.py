from django.db import transaction
from django.utils import timezone

from ...domain.exceptions import ComunicadoEnvioError
from ...models.models import Comunicado
from ..comum.resultado_processamento import ResultadoProcessamento
from . import email_service


def processar_comunicados_agendados(limite: int = 50) -> ResultadoProcessamento:
    agora = timezone.now()
    resultado = ResultadoProcessamento()

    ids = list(
        Comunicado.objects
        .filter(status=Comunicado.Status.AGENDADO, agendado_para__lte=agora)
        .order_by('agendado_para')
        .values_list('id', flat=True)[:limite]
    )

    for comunicado_id in ids:
        comunicado = _marcar_como_enviando(comunicado_id)
        if not comunicado:
            continue

        try:
            total = _enviar_comunicado(comunicado)
        except Exception as exc:
            resultado.falhas += 1
            _marcar_como_falhou(comunicado.id, exc)
            resultado.mensagens.append(f'Falha ao enviar comunicado {comunicado.id}: {exc}')
            continue

        resultado.enviados += 1
        _marcar_como_enviado(comunicado.id, total)
        resultado.mensagens.append(f'Comunicado {comunicado.id} enviado para {total} destinatario(s).')

    return resultado


def _marcar_como_enviando(comunicado_id: int) -> Comunicado | None:
    with transaction.atomic():
        comunicado = (
            Comunicado.objects
            .select_for_update()
            .filter(id=comunicado_id)
            .first()
        )
        if (
            not comunicado or
            comunicado.status != Comunicado.Status.AGENDADO or
            not comunicado.agendado_para or
            comunicado.agendado_para > timezone.now()
        ):
            return None

        comunicado.status = Comunicado.Status.ENVIANDO
        comunicado.tentativas_envio += 1
        comunicado.erro_envio = ''
        comunicado.save(update_fields=['status', 'tentativas_envio', 'erro_envio', 'atualizado_em'])
        return comunicado


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
