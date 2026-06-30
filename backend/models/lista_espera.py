import uuid

from django.db import models

from .evento import Horario
from .usuario import Usuario


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
