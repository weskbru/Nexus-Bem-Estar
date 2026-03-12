"""
Comando para criar o usuário administrador padrão do sistema.
Executado automaticamente ao subir o container (docker-compose).

Para alterar o admin, edite as variáveis abaixo e reinicie o container:
  docker compose restart backend
"""

from django.core.management.base import BaseCommand
from backend.models.models import Usuario

# ──────────────────────────────────────────────
#  EDITE AQUI as credenciais do admin padrão
# ──────────────────────────────────────────────
ADMIN_EMAIL = 'admin@aeb.gov.br'
ADMIN_SENHA = 'adminaeb'
ADMIN_NOME  = 'Administrador'
# ──────────────────────────────────────────────


class Command(BaseCommand):
    help = 'Cria o usuário administrador padrão se ainda não existir.'

    def handle(self, *args, **options):
        if Usuario.objects.filter(email=ADMIN_EMAIL).exists():
            self.stdout.write(f'Admin já existe: {ADMIN_EMAIL}')
            return

        u = Usuario.objects.create_user(
            email=ADMIN_EMAIL,
            nome=ADMIN_NOME,
            password=ADMIN_SENHA,
        )
        u.is_admin = True
        u.is_staff = True
        u.save()

        self.stdout.write(self.style.SUCCESS(f'Admin criado: {ADMIN_EMAIL}'))
