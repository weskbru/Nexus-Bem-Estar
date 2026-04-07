import uuid
import random
import string
from datetime import datetime, timedelta

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager


# ---------------------------------------------------------------------------
# Usuário
# ---------------------------------------------------------------------------

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

class Evento(models.Model):
    TIPO_CHOICES = [
        ('massagem', 'Massagem'),
        ('yoga', 'Yoga'),
        ('meditacao', 'Meditação'),
        ('nutricao', 'Nutrição'),
        ('pilates', 'Pilates'),
        ('acupuntura', 'Acupuntura'),
        ('outro', 'Outro'),
    ]
    STATUS_CHOICES = [
        ('publicado', 'Publicado'),
        ('cancelado', 'Cancelado'),
        ('encerrado', 'Encerrado'),
    ]

    titulo = models.CharField(max_length=200, verbose_name='Título')
    tipo = models.CharField(
        max_length=50, choices=TIPO_CHOICES, default='outro', verbose_name='Tipo'
    )
    descricao = models.TextField(blank=True, verbose_name='Descrição')
    nome_profissional = models.CharField(
        max_length=200, blank=True, verbose_name='Nome do profissional'
    )
    data = models.DateField(verbose_name='Data do evento')
    hora_inicio = models.TimeField(verbose_name='Hora de início')
    hora_fim = models.TimeField(verbose_name='Hora de término')
    duracao_sessao = models.PositiveIntegerField(
        verbose_name='Duração de cada sessão (minutos)'
    )
    capacidade_por_horario = models.PositiveIntegerField(
        default=1, verbose_name='Capacidade por horário'
    )
    imagem_url = models.URLField(blank=True, verbose_name='URL da imagem')
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='publicado', verbose_name='Status'
    )
    # Template do corpo do e-mail editável pelo admin.
    # Variáveis disponíveis: {nome}, {titulo}, {data}, {hora_inicio}, {hora_fim}, {link}, {chave}
    corpo_email = models.TextField(
        blank=True,
        verbose_name='Corpo do e-mail',
        help_text=(
            'Variáveis disponíveis: {nome}, {titulo}, {data}, '
            '{hora_inicio}, {hora_fim}, {link}, {chave}'
        ),
    )
    # Palavra-chave opcional: se preenchida, o colaborador deve informá-la ao acessar o link do evento.
    palavra_chave = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Palavra-chave de acesso',
        help_text='Se preenchida, o colaborador precisará informar esta palavra-chave ao clicar no link do convite.',
    )
    emails_enviados_em = models.DateTimeField(
        null=True, blank=True, verbose_name='E-mails enviados em'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Evento'
        verbose_name_plural = 'Eventos'
        ordering = ['data', 'hora_inicio']

    def __str__(self):
        return f'{self.titulo} – {self.data}'

    # Horário de almoço: slots que se sobreponham a este intervalo são descartados
    ALMOCO_INICIO = datetime.strptime('11:40', '%H:%M').time()
    ALMOCO_FIM    = datetime.strptime('13:30', '%H:%M').time()

    def gerar_horarios(self):
        """
        Gera os slots de horário com base nas configurações do evento.
        Só pode ser chamado se não houver agendamentos existentes.
        Slots que se sobreponham ao horário de almoço (11:40–13:30) são descartados.
        Slots que não completam a duração no final também são descartados.
        """
        if self.horarios.filter(agendamentos__isnull=False).exists():
            raise ValueError(
                'Não é possível regenerar horários de um evento com agendamentos existentes.'
            )

        self.horarios.all().delete()

        delta = timedelta(minutes=self.duracao_sessao)
        atual = datetime.combine(self.data, self.hora_inicio)
        fim = datetime.combine(self.data, self.hora_fim)

        slots = []
        while atual + delta <= fim:
            slot_inicio = atual.time()
            slot_fim = (atual + delta).time()
            # Descarta slots que se sobreponham ao horário de almoço
            if not (slot_inicio < self.ALMOCO_FIM and slot_fim > self.ALMOCO_INICIO):
                slots.append(Horario(
                    evento=self,
                    hora_inicio=slot_inicio,
                    hora_fim=slot_fim,
                    vagas_disponiveis=self.capacidade_por_horario,
                ))
            atual += delta

        Horario.objects.bulk_create(slots)

    def get_corpo_email(self):
        """Retorna o template do e-mail ou o padrão caso não tenha sido configurado."""
        return self.corpo_email or _corpo_email_padrao()


# ---------------------------------------------------------------------------
# Horário (slot gerado a partir do Evento)
# ---------------------------------------------------------------------------

class Horario(models.Model):
    evento = models.ForeignKey(
        Evento, on_delete=models.CASCADE, related_name='horarios'
    )
    hora_inicio = models.TimeField(verbose_name='Início')
    hora_fim = models.TimeField(verbose_name='Término')
    vagas_disponiveis = models.PositiveIntegerField(
        default=1, verbose_name='Vagas disponíveis'
    )

    class Meta:
        verbose_name = 'Horário'
        verbose_name_plural = 'Horários'
        ordering = ['hora_inicio']

    def __str__(self):
        return (
            f'{self.evento.titulo} – '
            f'{self.hora_inicio.strftime("%H:%M")} às {self.hora_fim.strftime("%H:%M")}'
        )

    @property
    def vagas_ocupadas(self):
        confirmados = self.agendamentos.filter(status='confirmado').count()
        manuais = self.participantes_manuais.count()
        return confirmados + manuais

    @property
    def vagas_livres(self):
        return max(self.vagas_disponiveis - self.vagas_ocupadas, 0)

    @property
    def disponivel(self):
        return self.vagas_livres > 0


# ---------------------------------------------------------------------------
# Convite de E-mail (1 por usuário por evento)
# ---------------------------------------------------------------------------

class ConviteEmail(models.Model):
    """
    Gerado quando o admin dispara o envio de e-mails.
    Cada usuário recebe um token UUID único (link mágico) e uma
    chave de mensagem curta (código legível exibido no e-mail).
    """
    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='convites'
    )
    evento = models.ForeignKey(
        Evento, on_delete=models.CASCADE, related_name='convites'
    )
    token = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False,
        verbose_name='Token de acesso'
    )
    chave_mensagem = models.CharField(
        max_length=8, editable=False, verbose_name='Chave de mensagem'
    )
    usado = models.BooleanField(default=False, verbose_name='Link já utilizado')
    enviado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Convite de E-mail'
        verbose_name_plural = 'Convites de E-mail'
        unique_together = [('usuario', 'evento')]

    def __str__(self):
        return f'Convite [{self.chave_mensagem}] – {self.usuario.email} → {self.evento.titulo}'

    def save(self, *args, **kwargs):
        if not self.chave_mensagem:
            self.chave_mensagem = ''.join(
                random.choices(string.ascii_uppercase + string.digits, k=8)
            )
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# Agendamento
# ---------------------------------------------------------------------------

class Agendamento(models.Model):
    class Status(models.TextChoices):
        CONFIRMADO = 'confirmado', 'Confirmado'
        CANCELADO = 'cancelado', 'Cancelado'

    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='agendamentos'
    )
    horario = models.ForeignKey(
        Horario, on_delete=models.CASCADE, related_name='agendamentos'
    )
    convite = models.OneToOneField(
        ConviteEmail,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='agendamento',
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.CONFIRMADO,
        verbose_name='Status'
    )
    # None = pendente (evento ainda não ocorreu), True = compareceu, False = faltou
    compareceu = models.BooleanField(
        null=True, blank=True, default=None, verbose_name='Compareceu'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Agendamento'
        verbose_name_plural = 'Agendamentos'
        # Um usuário pode ter apenas um agendamento ativo por evento
        unique_together = [('usuario', 'horario')]
        ordering = ['-criado_em']

    def __str__(self):
        return f'{self.usuario.nome} – {self.horario} [{self.status}]'


# ---------------------------------------------------------------------------
# Participante Manual (colaboradores sem e-mail corporativo)
# ---------------------------------------------------------------------------

class AgendamentoManual(models.Model):
    """
    Registro manual feito pelo admin para colaboradores que não possuem
    e-mail corporativo e não podem acessar o sistema normalmente.
    """
    evento = models.ForeignKey(
        Evento, on_delete=models.CASCADE, related_name='participantes_manuais'
    )
    horario = models.ForeignKey(
        Horario, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='participantes_manuais',
    )
    nome = models.CharField(max_length=200, verbose_name='Nome completo')
    matricula = models.CharField(max_length=50, blank=True, verbose_name='Matrícula')
    departamento = models.CharField(max_length=100, blank=True, verbose_name='Departamento')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Participante Manual'
        verbose_name_plural = 'Participantes Manuais'
        ordering = ['-criado_em']

    def __str__(self):
        return f'{self.nome} – {self.horario} [manual]'


# ---------------------------------------------------------------------------
# Lista de Espera
# ---------------------------------------------------------------------------

class ListaEspera(models.Model):
    class Status(models.TextChoices):
        AGUARDANDO = 'aguardando', 'Aguardando'
        NOTIFICADO = 'notificado', 'Notificado'
        CONFIRMADO = 'confirmado', 'Confirmado'
        EXPIRADO = 'expirado', 'Expirado'

    horario = models.ForeignKey(
        Horario, on_delete=models.CASCADE, related_name='lista_espera'
    )
    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='lista_espera'
    )
    posicao = models.PositiveIntegerField(verbose_name='Posição na fila')
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.AGUARDANDO, verbose_name='Status'
    )
    token_confirmacao = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False, verbose_name='Token de confirmação'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    notificado_em = models.DateTimeField(null=True, blank=True, verbose_name='Notificado em')
    expira_em = models.DateTimeField(null=True, blank=True, verbose_name='Expira em')

    class Meta:
        verbose_name = 'Lista de Espera'
        verbose_name_plural = 'Listas de Espera'
        ordering = ['posicao']
        unique_together = [('horario', 'usuario')]

    def __str__(self):
        return f'{self.usuario.email} – {self.horario} [pos {self.posicao}]'


# ---------------------------------------------------------------------------
# Penalidade (falta sem aviso)
# ---------------------------------------------------------------------------

class Penalidade(models.Model):
    """
    Criada quando um colaborador confirma agendamento mas não comparece.
    Bloqueia o usuário de agendar no próximo evento que tentar acessar.
    A penalidade é desativada automaticamente quando esse evento é encerrado.
    """
    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='penalidades'
    )
    # Agendamento de origem (no evento em que o usuário faltou)
    agendamento = models.OneToOneField(
        Agendamento, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='penalidade'
    )
    # Evento "de punição": o próximo evento que o usuário tentou acessar após a falta.
    # Quando esse evento for encerrado, a penalidade é desativada automaticamente.
    evento_punicao = models.ForeignKey(
        Evento, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='penalidades'
    )
    ativa = models.BooleanField(default=True, verbose_name='Ativa')
    criada_em = models.DateTimeField(auto_now_add=True)
    # Revogação manual pelo admin
    revogada_por = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='penalidades_revogadas'
    )
    revogada_em = models.DateTimeField(null=True, blank=True)
    motivo_revogacao = models.TextField(blank=True, verbose_name='Motivo da revogação')

    class Meta:
        verbose_name = 'Penalidade'
        verbose_name_plural = 'Penalidades'
        ordering = ['-criada_em']

    def __str__(self):
        return f'Penalidade – {self.usuario.nome} ({"ativa" if self.ativa else "inativa"})'


# ---------------------------------------------------------------------------
# Comunicado
# ---------------------------------------------------------------------------

class Comunicado(models.Model):
    """
    Comunicado avulso enviado pelo admin para todos os colaboradores ativos.
    Guarda histórico de tudo que foi enviado.
    """
    assunto = models.CharField(max_length=200, verbose_name='Assunto')
    corpo_html = models.TextField(verbose_name='Corpo HTML')
    enviado_por = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='comunicados_enviados',
        verbose_name='Enviado por',
    )
    enviado_em = models.DateTimeField(auto_now_add=True, verbose_name='Enviado em')
    total_destinatarios = models.PositiveIntegerField(default=0, verbose_name='Total de destinatários')

    class Meta:
        verbose_name = 'Comunicado'
        verbose_name_plural = 'Comunicados'
        ordering = ['-enviado_em']

    def __str__(self):
        return f'{self.assunto} — {self.enviado_em.strftime("%d/%m/%Y %H:%M")}'


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _corpo_email_padrao() -> str:
    return (
        "Olá {nome},\n\n"
        "Você está convidado(a) para participar do evento de bem-estar: {titulo}.\n\n"
        "📅 Data: {data}\n"
        "⏰ Horário: {hora_inicio} às {hora_fim}\n\n"
        "Para agendar seu horário preferido, acesse o link abaixo:\n"
        "{link}\n\n"
        "Sua chave de acesso: {chave}\n\n"
        "Att,\n"
        "Equipe de Bem-Estar"
    )
