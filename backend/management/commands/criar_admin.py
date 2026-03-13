"""
Comando para criar os usuários padrão do sistema.
Executado automaticamente ao subir o container (docker-compose).

Para alterar as credenciais, edite as variáveis abaixo e reinicie o container:
  docker compose restart backend
"""

from django.core.management.base import BaseCommand
from backend.models.models import Usuario

# ──────────────────────────────────────────────
#  Admin de Eventos (padrão)
# ──────────────────────────────────────────────
ADMIN_EMAIL = 'admin@aeb.gov.br'
ADMIN_SENHA = 'adminaeb'
ADMIN_NOME  = 'Administrador'

# ──────────────────────────────────────────────
#  SuperAdmin / CTI
# ──────────────────────────────────────────────
SUPERADMIN_EMAIL = 'superadmin@aeb.gov.br'
SUPERADMIN_SENHA = 'aeb@123'
SUPERADMIN_NOME  = 'Superadmin'
# ──────────────────────────────────────────────


class Command(BaseCommand):
    help = 'Cria os usuários padrão (admin e superadmin) se ainda não existirem.'

    def handle(self, *args, **options):
        # ── Admin de Eventos ──────────────────────────────────────────────
        if Usuario.objects.filter(email=ADMIN_EMAIL).exists():
            self.stdout.write(f'Admin já existe: {ADMIN_EMAIL}')
        else:
            u = Usuario.objects.create_user(
                email=ADMIN_EMAIL,
                nome=ADMIN_NOME,
                password=ADMIN_SENHA,
            )
            u.is_admin = True
            u.is_staff = True
            u.save()
            self.stdout.write(self.style.SUCCESS(f'Admin criado: {ADMIN_EMAIL}'))

        # ── SuperAdmin (CTI) ──────────────────────────────────────────────
        if Usuario.objects.filter(email=SUPERADMIN_EMAIL).exists():
            self.stdout.write(f'SuperAdmin já existe: {SUPERADMIN_EMAIL}')
        else:
            Usuario.objects.create_superuser(
                email=SUPERADMIN_EMAIL,
                nome=SUPERADMIN_NOME,
                password=SUPERADMIN_SENHA,
            )
            self.stdout.write(self.style.SUCCESS(f'SuperAdmin criado: {SUPERADMIN_EMAIL}'))

