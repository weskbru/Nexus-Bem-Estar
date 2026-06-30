# Disponibiliza os models no pacote e preserva imports legados via backend.models.models.
from .models import (
    Agendamento,
    AgendamentoManual,
    Comunicado,
    ConviteEmail,
    Evento,
    Horario,
    ListaEspera,
    Penalidade,
    Usuario,
    UsuarioManager,
)

__all__ = [
    'UsuarioManager',
    'Usuario',
    'Evento',
    'Horario',
    'ConviteEmail',
    'Agendamento',
    'AgendamentoManual',
    'ListaEspera',
    'Penalidade',
    'Comunicado',
]
