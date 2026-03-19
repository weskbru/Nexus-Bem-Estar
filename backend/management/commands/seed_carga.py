"""
Comando Django para gerar massa de dados de teste de carga.

Uso:
    docker compose exec backend python manage.py seed_carga
    docker compose exec backend python manage.py seed_carga --usuarios 500 --vagas 3
    docker compose exec backend python manage.py seed_carga --limpar

O que este comando faz:
  1. (Opcional) Apaga dados de carga anteriores (--limpar)
  2. Cria um Evento de carga com slots configuráveis
  3. Cria N usuários fictícios com e-mail @carga.test
  4. Gera um ConviteEmail (token UUID) por usuário
  5. Salva todos os tokens em load_tests/tokens.csv
  6. Imprime o evento_id e slot_id "quente" para uso no ReservaStressUser
"""
import csv
import os
from datetime import date, time

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import transaction

from backend.models.models import Usuario, Evento, AgendamentoManual, Agendamento, ConviteEmail


# Tag que identifica todos os objetos criados por este comando
_TAG_EMAIL_DOMINIO = 'carga.test'
_TAG_TITULO_EVENTO = '[CARGA] Bem-Estar — Load Test'


class Command(BaseCommand):
    help = 'Gera massa de dados para teste de carga com Locust.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--usuarios', type=int, default=2000,
            help='Número de usuários de teste (default: 2000)',
        )
        parser.add_argument(
            '--duracao-sessao', type=int, default=10,
            help='Duração de cada slot em minutos (default: 10)',
        )
        parser.add_argument(
            '--vagas', type=int, default=5,
            help='Vagas por slot (default: 5). Aumente para reduzir conflitos.',
        )
        parser.add_argument(
            '--output', type=str, default='load_tests/tokens.csv',
            help='Caminho do CSV de saída (default: load_tests/tokens.csv)',
        )
        parser.add_argument(
            '--limpar', action='store_true',
            help='Remove dados de carga anteriores antes de criar novos.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        n_usuarios = options['usuarios']
        duracao = options['duracao_sessao']
        vagas = options['vagas']
        output = options['output']

        if options['limpar']:
            self._limpar_dados()

        # ── 1. Criar (ou recuperar) o evento de carga ──────────────────────
        evento, criado = Evento.objects.get_or_create(
            titulo=_TAG_TITULO_EVENTO,
            defaults={
                'tipo': 'outro',
                'data': date(2099, 12, 31),       # data futura para não expirar
                'hora_inicio': time(8, 0),
                'hora_fim': time(16, 40),          # 520 min / 10 min = 52 slots
                'duracao_sessao': duracao,
                'capacidade_por_horario': vagas,
                'status': 'publicado',
            },
        )

        if criado:
            evento.gerar_horarios()
            self.stdout.write(self.style.SUCCESS(
                f'Evento criado: id={evento.id} — {evento.horarios.count()} slots '
                f'({duracao} min/slot, {vagas} vagas cada)'
            ))
        else:
            self.stdout.write(f'Evento já existe: id={evento.id} '
                              f'({evento.horarios.count()} slots)')

        # ── 2. Criar usuários de carga ──────────────────────────────────────
        self.stdout.write(f'Criando {n_usuarios} usuários de carga...')
        usuarios_criados = 0

        # Hash calculado UMA vez e reutilizado — evita rodar PBKDF2 N vezes
        senha_hash = make_password('carga@123')

        # Bulk-create somente os que ainda não existem
        emails_existentes = set(
            Usuario.objects
            .filter(email__endswith=f'@{_TAG_EMAIL_DOMINIO}')
            .values_list('email', flat=True)
        )

        novos = []
        for i in range(1, n_usuarios + 1):
            email = f'carga{i:05d}@{_TAG_EMAIL_DOMINIO}'
            if email not in emails_existentes:
                novos.append(Usuario(
                    email=email,
                    nome=f'Usuário Carga {i:05d}',
                    password=senha_hash,   # atribui o hash diretamente
                    is_active=True,
                ))

        if novos:
            Usuario.objects.bulk_create(novos, batch_size=500)
            usuarios_criados = len(novos)

        self.stdout.write(f'  → {usuarios_criados} novos usuários criados '
                          f'({n_usuarios - usuarios_criados} já existiam)')

        # ── 3. Criar convites (get_or_create para ser idempotente) ──────────
        self.stdout.write('Gerando convites (tokens)...')
        todos_usuarios = list(
            Usuario.objects
            .filter(email__endswith=f'@{_TAG_EMAIL_DOMINIO}')
            .order_by('email')[:n_usuarios]
        )

        convites_criados = 0
        convites: list[ConviteEmail] = []

        emails_com_convite = set(
            ConviteEmail.objects
            .filter(evento=evento)
            .values_list('usuario__email', flat=True)
        )

        novos_convites = [
            ConviteEmail(usuario=u, evento=evento)
            for u in todos_usuarios
            if u.email not in emails_com_convite
        ]
        if novos_convites:
            # bulk_create não chama save(), então chave_mensagem não seria gerada.
            # Usamos save() individual em lotes para garantir geração automática.
            for i in range(0, len(novos_convites), 200):
                lote = novos_convites[i:i + 200]
                for c in lote:
                    c.save()
                convites_criados += len(lote)
                self.stdout.write(f'  → {convites_criados}/{len(novos_convites)} convites...', ending='\r')

        self.stdout.write('')
        self.stdout.write(f'  → {convites_criados} novos convites criados')

        # ── 4. Exportar CSV ─────────────────────────────────────────────────
        os.makedirs(os.path.dirname(output) if os.path.dirname(output) else '.', exist_ok=True)

        todos_convites = list(
            ConviteEmail.objects
            .filter(evento=evento)
            .select_related('usuario')
            .order_by('usuario__email')[:n_usuarios]
        )

        with open(output, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['token', 'evento_id', 'email'])
            writer.writeheader()
            for c in todos_convites:
                writer.writerow({
                    'token': str(c.token),
                    'evento_id': evento.id,
                    'email': c.usuario.email,
                })

        self.stdout.write(self.style.SUCCESS(f'\nCSV salvo em: {output}'))

        # ── 5. Imprimir configuração para o stress test ─────────────────────
        primeiro_slot = evento.horarios.order_by('hora_inicio').first()
        self.stdout.write('')
        self.stdout.write(self.style.WARNING('═' * 60))
        self.stdout.write(self.style.WARNING('  CONFIGURAÇÃO PARA O LOCUST'))
        self.stdout.write(self.style.WARNING('═' * 60))
        self.stdout.write(f'  Total de tokens no CSV : {len(todos_convites)}')
        self.stdout.write(f'  STRESS_EVENTO_ID       : {evento.id}')
        self.stdout.write(f'  STRESS_SLOT_ID         : {primeiro_slot.id if primeiro_slot else "N/A"}')
        self.stdout.write(self.style.WARNING('═' * 60))
        self.stdout.write('')
        self.stdout.write('  Salve as variáveis abaixo em load_tests/.env.locust:')
        self.stdout.write(f'    STRESS_EVENTO_ID={evento.id}')
        self.stdout.write(f'    STRESS_SLOT_ID={primeiro_slot.id if primeiro_slot else ""}')
        self.stdout.write(self.style.WARNING('═' * 60))

    def _limpar_dados(self):
        """Remove todos os dados de carga anteriores."""
        self.stdout.write(self.style.WARNING('Limpando dados de carga anteriores...'))
        usuarios = Usuario.objects.filter(email__endswith=f'@{_TAG_EMAIL_DOMINIO}')
        n_conv = ConviteEmail.objects.filter(usuario__in=usuarios).count()
        n_agend = Agendamento.objects.filter(usuario__in=usuarios).count()
        n_manual = AgendamentoManual.objects.filter(
            evento__titulo=_TAG_TITULO_EVENTO
        ).count()
        n_eventos = Evento.objects.filter(titulo=_TAG_TITULO_EVENTO).count()
        n_users = usuarios.count()

        ConviteEmail.objects.filter(usuario__in=usuarios).delete()
        Agendamento.objects.filter(usuario__in=usuarios).delete()
        AgendamentoManual.objects.filter(evento__titulo=_TAG_TITULO_EVENTO).delete()
        Evento.objects.filter(titulo=_TAG_TITULO_EVENTO).delete()
        usuarios.delete()

        self.stdout.write(
            f'  Removidos: {n_users} usuários, {n_conv} convites, '
            f'{n_agend} agendamentos, {n_manual} participantes manuais, '
            f'{n_eventos} eventos'
        )
