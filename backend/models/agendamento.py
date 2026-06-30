from django.db import models

from .evento import ConviteEmail, Evento, Horario
from .usuario import Usuario


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
    compareceu = models.BooleanField(null=True, blank=True, verbose_name='Compareceu')
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
