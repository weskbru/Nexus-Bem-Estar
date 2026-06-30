from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager


class UsuarioManager(BaseUserManager):
    def create_user(self, email, nome, password=None, **extra_fields):
        if not email:
            raise ValueError('O e-mail é obrigatório.')
        email = self.normalize_email(email)
        user = self.model(email=email, nome=nome, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, nome, password=None, **extra_fields):
        extra_fields.setdefault('is_admin', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if not extra_fields.get('is_staff'):
            raise ValueError('Superusuário deve ter is_staff=True.')
        if not extra_fields.get('is_superuser'):
            raise ValueError('Superusuário deve ter is_superuser=True.')
        return self.create_user(email, nome, password, **extra_fields)


class Usuario(AbstractBaseUser):
    """
    Usuário do sistema. Admins criam eventos e enviam e-mails;
    colaboradores recebem o convite e fazem o agendamento.
    """
    email = models.EmailField(unique=True, verbose_name='E-mail')
    nome = models.CharField(max_length=200, verbose_name='Nome completo')
    matricula = models.CharField(max_length=50, blank=True, verbose_name='Matrícula')
    departamento = models.CharField(max_length=100, blank=True, verbose_name='Departamento')
    ramal = models.CharField(max_length=20, blank=True, verbose_name='Ramal')
    is_admin = models.BooleanField(default=False, verbose_name='É administrador?')
    is_active = models.BooleanField(default=True, verbose_name='Ativo')
    is_staff = models.BooleanField(default=False)       # acesso ao django-admin
    is_superuser = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nome']

    objects = UsuarioManager()

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
        ordering = ['nome']

    def __str__(self):
        return f'{self.nome} ({self.email})'

    # Necessário para o Django admin e permissões de objeto
    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser


# ---------------------------------------------------------------------------
# Evento
# ---------------------------------------------------------------------------
