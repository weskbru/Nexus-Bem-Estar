from django.db import models

from .agendamento import Agendamento
from .evento import Evento
from .usuario import Usuario


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
