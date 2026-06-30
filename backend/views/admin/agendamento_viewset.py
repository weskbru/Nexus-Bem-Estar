from rest_framework import viewsets

from ...models.models import Agendamento
from ...serializers.serializers import AgendamentoSerializer
from ..permissions import IsAdminUsuario


class AdminAgendamentoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/admin/agendamentos/            — lista todos os agendamentos
    GET /api/admin/agendamentos/?evento_id= — filtra por evento
    GET /api/admin/agendamentos/?status=    — filtra por status
    GET /api/admin/agendamentos/<id>/       — detalhe
    """
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAdminUsuario]

    def get_queryset(self):
        qs = Agendamento.objects.all().select_related('usuario', 'horario__evento')
        evento_id    = self.request.query_params.get('evento_id')
        status_param = self.request.query_params.get('status')
        if evento_id:
            qs = qs.filter(horario__evento_id=evento_id)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs.order_by('-criado_em')
