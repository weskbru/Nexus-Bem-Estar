from django.db.models import Sum

from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from ...models.models import Agendamento, Evento, Horario
from ...serializers.api_docs import DashboardSerializer
from ...serializers.serializers import AgendamentoSerializer
from ..permissions import IsAdminUsuario, encerrar_eventos_expirados


class AdminDashboardView(APIView):
    """
    GET /api/admin/dashboard/
    Retorna métricas gerais: total de vagas, ocupação, taxa, agendamentos recentes.
    """
    permission_classes = [IsAdminUsuario]

    @extend_schema(
        responses={200: DashboardSerializer},
        summary='Consulta metricas do dashboard administrativo',
    )
    def get(self, request):
        encerrar_eventos_expirados()
        total_vagas = Horario.objects.aggregate(total=Sum('vagas_disponiveis'))['total'] or 0
        vagas_ocupadas = Agendamento.objects.filter(status='confirmado').count()
        taxa = round((vagas_ocupadas / total_vagas * 100), 1) if total_vagas > 0 else 0.0

        agendamentos_recentes = (
            Agendamento.objects
            .select_related('usuario', 'horario__evento')
            .order_by('-criado_em')[:10]
        )

        return Response({
            'total_vagas': total_vagas,
            'vagas_ocupadas': vagas_ocupadas,
            'taxa_ocupacao': taxa,
            'total_eventos_ativos': Evento.objects.filter(status='publicado').count(),
            'agendamentos_recentes': AgendamentoSerializer(agendamentos_recentes, many=True).data,
        })
