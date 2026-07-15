import random
import string
import uuid
from datetime import datetime, timedelta

from django.db import models

from .usuario import Usuario


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
    EMAIL_STATUS_CHOICES = [
        ('nao_agendado', 'Nao agendado'),
        ('agendado', 'Agendado'),
        ('enviando', 'Enviando'),
        ('enviado', 'Enviado'),
        ('falhou', 'Falhou'),
        ('cancelado', 'Cancelado'),
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
    emails_envio_status = models.CharField(
        max_length=20,
        choices=EMAIL_STATUS_CHOICES,
        default='nao_agendado',
        verbose_name='Status do envio de e-mails',
    )
    emails_agendado_para = models.DateTimeField(
        null=True, blank=True, verbose_name='E-mails agendados para'
    )
    emails_tentativas_envio = models.PositiveIntegerField(
        default=0, verbose_name='Tentativas de envio de e-mails'
    )
    emails_erro_envio = models.TextField(blank=True, verbose_name='Erro no envio de e-mails')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Evento'
        verbose_name_plural = 'Eventos'
        ordering = ['data', 'hora_inicio']
        indexes = [
            models.Index(
                fields=['status', 'data', 'hora_fim'],
                name='idx_evento_status_data_fim',
            ),
        ]

    def __str__(self):
        return f'{self.titulo} – {self.data}'

    # Horário de almoço: slots que se sobreponham a este intervalo são descartados
    ALMOCO_INICIO = datetime.strptime('12:00', '%H:%M').time()
    ALMOCO_FIM    = datetime.strptime('13:30', '%H:%M').time()

    def gerar_horarios(self):
        """
        Gera os slots de horário com base nas configurações do evento.
        Só pode ser chamado se não houver agendamentos existentes.
        Slots que se sobreponham ao horário de almoço (12:00–13:30) são descartados.
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
        almoco_fim_dt = datetime.combine(self.data, self.ALMOCO_FIM)
        while atual + delta <= fim:
            slot_inicio = atual.time()
            slot_fim = (atual + delta).time()
            # Descarta slots que se sobreponham ao horário de almoço e pula direto para o fim do almoço
            if slot_inicio < self.ALMOCO_FIM and slot_fim > self.ALMOCO_INICIO:
                if almoco_fim_dt > atual:
                    atual = almoco_fim_dt
                else:
                    atual += delta
                continue
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
        anotado = getattr(self, 'vagas_ocupadas_calc', None)
        if anotado is not None:
            return anotado
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
