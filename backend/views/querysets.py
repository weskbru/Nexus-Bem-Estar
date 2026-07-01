from django.db.models import Count, Exists, OuterRef, Q

from ..models.models import Horario, ListaEspera


def horarios_com_disponibilidade():
    fila_notificada = ListaEspera.objects.filter(
        horario=OuterRef('pk'),
        status='notificado',
    )
    return Horario.objects.annotate(
        vagas_ocupadas_calc=(
            Count(
                'agendamentos',
                filter=Q(agendamentos__status='confirmado'),
                distinct=True,
            )
            + Count('participantes_manuais', distinct=True)
        ),
        reservado_para_fila_calc=Exists(fila_notificada),
    ).order_by('hora_inicio')
