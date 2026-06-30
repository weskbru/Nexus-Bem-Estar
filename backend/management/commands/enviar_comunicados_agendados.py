from django.core.management.base import BaseCommand

from backend.services.comunicado.disparo_service import processar_comunicados_agendados


class Command(BaseCommand):
    help = 'Envia comunicados agendados cuja data/hora ja venceu.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=10,
            help='Quantidade maxima de comunicados a processar nesta execucao.',
        )

    def handle(self, *args, **options):
        resultado = processar_comunicados_agendados(limite=options['limit'])

        for mensagem in resultado.mensagens:
            self.stdout.write(mensagem)

        if resultado.enviados or resultado.falhas:
            self.stdout.write(
                f'Processamento concluido. Enviados: {resultado.enviados}. Falhas: {resultado.falhas}.'
            )
