from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from backend.domain.exceptions import ComunicadoEnvioError
from backend.models.models import Comunicado
from backend.services import email_service


class Command(BaseCommand):
    help = 'Envia comunicados agendados cuja data/hora ja venceu.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Quantidade maxima de comunicados a processar nesta execucao.',
        )

    def handle(self, *args, **options):
        limite = options['limit']
        agora = timezone.now()

        ids = list(
            Comunicado.objects
            .filter(status=Comunicado.Status.AGENDADO, agendado_para__lte=agora)
            .order_by('agendado_para')
            .values_list('id', flat=True)[:limite]
        )

        enviados = 0
        falhas = 0

        for comunicado_id in ids:
            comunicado = self._marcar_como_enviando(comunicado_id)
            if not comunicado:
                continue

            try:
                total = self._enviar(comunicado)
            except Exception as exc:
                falhas += 1
                self._marcar_como_falhou(comunicado.id, exc)
                self.stderr.write(f'Falha ao enviar comunicado {comunicado.id}: {exc}')
                continue

            enviados += 1
            self._marcar_como_enviado(comunicado.id, total)
            self.stdout.write(f'Comunicado {comunicado.id} enviado para {total} destinatario(s).')

        self.stdout.write(f'Processamento concluido. Enviados: {enviados}. Falhas: {falhas}.')

    def _marcar_como_enviando(self, comunicado_id: int) -> Comunicado | None:
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

    def _enviar(self, comunicado: Comunicado) -> int:
        if not email_service.get_destinatarios_evento():
            raise ComunicadoEnvioError('Destinatario nao configurado.')
        return email_service.enviar_para_lista_evento(comunicado.assunto, comunicado.corpo_html)

    def _marcar_como_enviado(self, comunicado_id: int, total: int) -> None:
        agora = timezone.now()
        Comunicado.objects.filter(id=comunicado_id).update(
            status=Comunicado.Status.ENVIADO,
            enviado_em=agora,
            total_destinatarios=total,
            erro_envio='',
            atualizado_em=agora,
        )

    def _marcar_como_falhou(self, comunicado_id: int, exc: Exception) -> None:
        Comunicado.objects.filter(id=comunicado_id).update(
            status=Comunicado.Status.FALHOU,
            erro_envio=str(exc)[:1000],
            atualizado_em=timezone.now(),
        )
