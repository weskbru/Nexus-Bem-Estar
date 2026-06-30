from django.core.management.base import BaseCommand

from backend.services.evento.disparo_service import processar_emails_eventos_agendados


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
        resultado = processar_emails_eventos_agendados(limite=options['limit'])

        for mensagem in resultado.mensagens:
            self.stdout.write(mensagem)

        self.stdout.write(
            f'Processamento de eventos concluido. Enviados: {resultado.enviados}. Falhas: {resultado.falhas}.'
        )
