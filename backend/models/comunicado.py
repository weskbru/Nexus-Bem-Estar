from django.db import models

from .usuario import Usuario


class Comunicado(models.Model):
    """
    Comunicado avulso enviado pelo admin para todos os colaboradores ativos.
    Guarda histórico de tudo que foi enviado.
    """
    class Status(models.TextChoices):
        AGENDADO = 'agendado', 'Agendado'
        ENVIANDO = 'enviando', 'Enviando'
        ENVIADO = 'enviado', 'Enviado'
        FALHOU = 'falhou', 'Falhou'
        CANCELADO = 'cancelado', 'Cancelado'

    assunto = models.CharField(max_length=200, verbose_name='Assunto')
    corpo_html = models.TextField(verbose_name='Corpo HTML')
    enviado_por = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='comunicados_enviados',
        verbose_name='Enviado por',
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ENVIADO, verbose_name='Status'
    )
    agendado_para = models.DateTimeField(null=True, blank=True, verbose_name='Agendado para')
    enviado_em = models.DateTimeField(null=True, blank=True, verbose_name='Enviado em')
    cancelado_em = models.DateTimeField(null=True, blank=True, verbose_name='Cancelado em')
    total_destinatarios = models.PositiveIntegerField(default=0, verbose_name='Total de destinatários')
    tentativas_envio = models.PositiveIntegerField(default=0, verbose_name='Tentativas de envio')
    erro_envio = models.TextField(blank=True, verbose_name='Erro de envio')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Comunicado'
        verbose_name_plural = 'Comunicados'
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['status', 'agendado_para'], name='idx_comunicado_status_agenda'),
        ]

    def __str__(self):
        referencia = self.enviado_em or self.agendado_para or self.criado_em
        return f'{self.assunto} — {referencia.strftime("%d/%m/%Y %H:%M")}'


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------
