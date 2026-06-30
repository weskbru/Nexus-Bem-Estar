"""
Comando Django para gerar massa de dados de teste de carga.

Uso:
    docker compose exec backend python manage.py seed_carga
    docker compose exec backend python manage.py seed_carga --usuarios 500 --vagas 3
    docker compose exec backend python manage.py seed_carga --limpar
"""
from django.core.management.base import BaseCommand

from backend.services.carga.seed_service import gerar_massa_carga


class Command(BaseCommand):
    help = 'Gera massa de dados para teste de carga com Locust.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--usuarios', type=int, default=2000,
            help='Numero de usuarios de teste (default: 2000)',
        )
        parser.add_argument(
            '--duracao-sessao', type=int, default=10,
            help='Duracao de cada slot em minutos (default: 10)',
        )
        parser.add_argument(
            '--vagas', type=int, default=5,
            help='Vagas por slot (default: 5). Aumente para reduzir conflitos.',
        )
        parser.add_argument(
            '--output', type=str, default='load_tests/tokens.csv',
            help='Caminho do CSV de saida (default: load_tests/tokens.csv)',
        )
        parser.add_argument(
            '--limpar', action='store_true',
            help='Remove dados de carga anteriores antes de criar novos.',
        )

    def handle(self, *args, **options):
        resultado = gerar_massa_carga(
            n_usuarios=options['usuarios'],
            duracao_sessao=options['duracao_sessao'],
            vagas=options['vagas'],
            output=options['output'],
            limpar=options['limpar'],
        )

        if resultado.limpeza:
            self.stdout.write(self.style.WARNING('Limpando dados de carga anteriores...'))
            self.stdout.write(
                f'  Removidos: {resultado.limpeza.usuarios} usuarios, '
                f'{resultado.limpeza.convites} convites, '
                f'{resultado.limpeza.agendamentos} agendamentos, '
                f'{resultado.limpeza.participantes_manuais} participantes manuais, '
                f'{resultado.limpeza.eventos} eventos'
            )

        if resultado.evento_criado:
            self.stdout.write(self.style.SUCCESS(
                f'Evento criado: id={resultado.evento_id} - {resultado.total_slots} slots '
                f'({resultado.duracao_sessao} min/slot, {resultado.vagas} vagas cada)'
            ))
        else:
            self.stdout.write(
                f'Evento ja existe: id={resultado.evento_id} ({resultado.total_slots} slots)'
            )

        self.stdout.write(f'Criando {options["usuarios"]} usuarios de carga...')
        self.stdout.write(
            f'  -> {resultado.usuarios_criados} novos usuarios criados '
            f'({resultado.usuarios_existentes} ja existiam)'
        )

        self.stdout.write('Gerando convites (tokens)...')
        self.stdout.write(f'  -> {resultado.convites_criados} novos convites criados')
        self.stdout.write(self.style.SUCCESS(f'\nCSV salvo em: {resultado.output}'))

        stress_slot_id = resultado.stress_slot_id if resultado.stress_slot_id else 'N/A'
        stress_slot_env = resultado.stress_slot_id if resultado.stress_slot_id else ''

        self.stdout.write('')
        self.stdout.write(self.style.WARNING('=' * 60))
        self.stdout.write(self.style.WARNING('  CONFIGURACAO PARA O LOCUST'))
        self.stdout.write(self.style.WARNING('=' * 60))
        self.stdout.write(f'  Total de tokens no CSV : {resultado.total_tokens}')
        self.stdout.write(f'  STRESS_EVENTO_ID       : {resultado.evento_id}')
        self.stdout.write(f'  STRESS_SLOT_ID         : {stress_slot_id}')
        self.stdout.write(self.style.WARNING('=' * 60))
        self.stdout.write('')
        self.stdout.write('  Salve as variaveis abaixo em load_tests/.env.locust:')
        self.stdout.write(f'    STRESS_EVENTO_ID={resultado.evento_id}')
        self.stdout.write(f'    STRESS_SLOT_ID={stress_slot_env}')
        self.stdout.write(self.style.WARNING('=' * 60))
