from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.dateparse import parse_date

from ...models.models import Agendamento, Evento, Horario
from ...serializers.serializers import AgendamentoSerializer
from ..permissions import IsAdminUsuario, encerrar_eventos_expirados


AGENDAMENTO_STATUS_VALIDOS = {'confirmado', 'cancelado'}
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100


def _get_int_param(request, name, default):
    try:
        value = int(request.query_params.get(name, default))
    except (TypeError, ValueError):
        return default
    return max(value, 1)


class AdminDashboardView(APIView):
    """
    GET /api/admin/dashboard/
    Retorna métricas gerais: total de vagas, ocupação, taxa, agendamentos recentes.
    """
    permission_classes = [IsAdminUsuario]

    def get(self, request):
        encerrar_eventos_expirados()
        horarios = Horario.objects.all()
        total_vagas = sum(h.vagas_disponiveis for h in horarios)
        vagas_ocupadas = Agendamento.objects.filter(status='confirmado').count()
        taxa = round((vagas_ocupadas / total_vagas * 100), 1) if total_vagas > 0 else 0.0

        agendamentos_qs = (
            Agendamento.objects
            .select_related('usuario', 'horario__evento')
            .order_by('-criado_em')
        )
        status_param = request.query_params.get('status')
        evento_data_param = request.query_params.get('evento_data')

        if status_param in AGENDAMENTO_STATUS_VALIDOS:
            agendamentos_qs = agendamentos_qs.filter(status=status_param)

        evento_data = parse_date(evento_data_param) if evento_data_param else None
        if evento_data:
            agendamentos_qs = agendamentos_qs.filter(horario__evento__data=evento_data)

        total_filtrado = agendamentos_qs.count()
        page = _get_int_param(request, 'page', 1)
        page_size = min(_get_int_param(request, 'page_size', DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)
        total_pages = max((total_filtrado + page_size - 1) // page_size, 1)
        page = min(page, total_pages)
        offset = (page - 1) * page_size
        agendamentos_pagina = agendamentos_qs[offset:offset + page_size]

        return Response({
            'total_vagas': total_vagas,
            'vagas_ocupadas': vagas_ocupadas,
            'taxa_ocupacao': taxa,
            'total_eventos_ativos': Evento.objects.filter(status='publicado').count(),
            'agendamentos_recentes': AgendamentoSerializer(agendamentos_pagina, many=True).data,
            'agendamentos_paginacao': {
                'page': page,
                'page_size': page_size,
                'total': total_filtrado,
                'total_pages': total_pages,
            },
        })
