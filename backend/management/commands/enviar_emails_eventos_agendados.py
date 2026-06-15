from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from backend.models.models import Evento
from backend.views.admin.evento_viewset import (
    EMAIL_STATUS_AGENDADO,
    EMAIL_STATUS_ENVIADO,
    EMAIL_STATUS_ENVIANDO,
    EMAIL_STATUS_FALHOU,
    enviar_emails_evento,
)


class Command(BaseCommand):
    help = 'Envia e-mails de eventos agendados cuja data/hora ja venceu.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Quantidade maxima de eventos a processar nesta execucao.',
        )

    def handle(self, *args, **options):
        limite = options['limit']
        agora = timezone.now()

        ids = list(
            Evento.objects
            .filter(
                status='publicado',
                emails_envio_status=EMAIL_STATUS_AGENDADO,
                emails_agendado_para__lte=agora,
                emails_enviados_em__isnull=True,
            )
            .order_by('emails_agendado_para')
            .values_list('id', flat=True)[:limite]
        )

        enviados = 0
        falhas = 0

        for evento_id in ids:
            evento = self._marcar_como_enviando(evento_id)
            if not evento:
                continue

            try:
                destinatarios = enviar_emails_evento(evento)
            except Exception as exc:
                falhas += 1
                self._marcar_como_falhou(evento.id, exc)
                self.stderr.write(f'Falha ao enviar e-mails do evento {evento.id}: {exc}')
                continue

            enviados += 1
            self._marcar_como_enviado(evento.id)
            self.stdout.write(
                f'Evento {evento.id} enviado para {len(destinatarios)} destinatario(s).'
            )

        self.stdout.write(f'Processamento de eventos concluido. Enviados: {enviados}. Falhas: {falhas}.')

    def _marcar_como_enviando(self, evento_id: int) -> Evento | None:
        with transaction.atomic():
            evento = (
                Evento.objects
                .select_for_update()
                .filter(id=evento_id)
                .first()
            )
            if (
                not evento or
                evento.status != 'publicado' or
                evento.emails_envio_status != EMAIL_STATUS_AGENDADO or
                not evento.emails_agendado_para or
                evento.emails_agendado_para > timezone.now() or
                evento.emails_enviados_em
            ):
                return None

            evento.emails_envio_status = EMAIL_STATUS_ENVIANDO
            evento.emails_tentativas_envio += 1
            evento.emails_erro_envio = ''
            evento.save(update_fields=[
                'emails_envio_status',
                'emails_tentativas_envio',
                'emails_erro_envio',
                'atualizado_em',
            ])
            return evento

    def _marcar_como_enviado(self, evento_id: int) -> None:
        agora = timezone.now()
        Evento.objects.filter(id=evento_id).update(
            emails_envio_status=EMAIL_STATUS_ENVIADO,
            emails_enviados_em=agora,
            emails_agendado_para=None,
            emails_erro_envio='',
            atualizado_em=agora,
        )

    def _marcar_como_falhou(self, evento_id: int, exc: Exception) -> None:
        Evento.objects.filter(id=evento_id).update(
            emails_envio_status=EMAIL_STATUS_FALHOU,
            emails_erro_envio=str(exc)[:1000],
            atualizado_em=timezone.now(),
        )
