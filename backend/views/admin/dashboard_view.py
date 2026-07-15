from datetime import datetime

from django.conf import settings
from django.core.cache import cache
from django.db.models import Q, Sum
from django.utils import timezone

from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from ...models.models import Agendamento, Evento, Horario
from ...serializers.dashboard import (
    AdminNotificacoesSerializer,
    DashboardAgendamentoSerializer,
    DashboardSerializer,
)
from ..permissions import IsAdminUsuario


DASHBOARD_CACHE_KEY = 'admin-dashboard:v2'
NOTIFICACOES_CACHE_KEY = 'admin-notificacoes:v1'


def _cache_timeout() -> int:
    return max(int(getattr(settings, 'DASHBOARD_CACHE_TIMEOUT', 15)), 0)


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
        cached = cache.get(DASHBOARD_CACHE_KEY)
        if cached is not None:
            return Response(cached)

        total_vagas = Horario.objects.aggregate(total=Sum('vagas_disponiveis'))['total'] or 0
        vagas_ocupadas = Agendamento.objects.filter(status='confirmado').count()
        taxa = round((vagas_ocupadas / total_vagas * 100), 1) if total_vagas > 0 else 0.0

        agendamentos_recentes = (
            Agendamento.objects
            .select_related('usuario', 'horario__evento')
            .order_by('-criado_em')[:10]
        )
        hoje = timezone.localdate()
        agora = timezone.localtime().time()
        eventos_ativos = Evento.objects.filter(status='publicado').filter(
            Q(data__gt=hoje) | Q(data=hoje, hora_fim__gt=agora)
        )

        data = {
            'total_vagas': total_vagas,
            'vagas_ocupadas': vagas_ocupadas,
            'taxa_ocupacao': taxa,
            'total_eventos_ativos': eventos_ativos.count(),
            'agendamentos_recentes': DashboardAgendamentoSerializer(
                agendamentos_recentes, many=True
            ).data,
        }
        cache.set(DASHBOARD_CACHE_KEY, data, timeout=_cache_timeout())
        return Response(data)


class AdminNotificacoesView(APIView):
    """Resumo leve usado pelo sino de notificacoes do layout administrativo."""

    permission_classes = [IsAdminUsuario]

    @extend_schema(
        responses={200: AdminNotificacoesSerializer},
        summary='Consulta notificacoes administrativas recentes',
    )
    def get(self, request):
        cached = cache.get(NOTIFICACOES_CACHE_KEY)
        if cached is not None:
            return Response(cached)

        hoje = timezone.localdate()
        agora = timezone.localtime().time()
        agendamentos = (
            Agendamento.objects
            .filter(status='confirmado')
            .select_related('usuario', 'horario__evento')
            .order_by('-criado_em')[:10]
        )
        eventos = (
            Evento.objects
            .filter(status='publicado')
            .filter(Q(data__gt=hoje) | Q(data=hoje, hora_fim__gt=agora))
            .order_by('data', 'hora_inicio')[:10]
        )

        data = {
            'agendamentos': [
                {
                    'id': item.id,
                    'colaborador_nome': item.usuario.nome,
                    'servico': item.horario.evento.titulo,
                    'data_hora': timezone.make_aware(
                        datetime.combine(
                            item.horario.evento.data,
                            item.horario.hora_inicio,
                        ),
                        timezone.get_current_timezone(),
                    ),
                    'status': 'OCUPADO',
                }
                for item in agendamentos
            ],
            'eventos': [
                {
                    'id': evento.id,
                    'titulo': evento.titulo,
                    'data': evento.data,
                    'hora_inicio': evento.hora_inicio,
                    'status': evento.status,
                }
                for evento in eventos
            ],
        }
        cache.set(NOTIFICACOES_CACHE_KEY, data, timeout=_cache_timeout())
        return Response(data)
