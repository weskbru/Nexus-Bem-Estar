from datetime import datetime

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, Exists, IntegerField, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from ...models.models import (
    Agendamento,
    AgendamentoManual,
    Evento,
    Horario,
    ListaEspera,
)
from ...serializers.dashboard import (
    AdminNotificacoesSerializer,
    DashboardAgendamentoSerializer,
    DashboardSerializer,
)
from ..permissions import IsAdminUsuario


DASHBOARD_CACHE_KEY = 'admin-dashboard:v3'
NOTIFICACOES_CACHE_KEY = 'admin-notificacoes:v1'


def _cache_timeout() -> int:
    return max(int(getattr(settings, 'DASHBOARD_CACHE_TIMEOUT', 15)), 0)


def _eventos_futuros_com_ocupacao(hoje, agora):
    vagas_por_evento = (
        Horario.objects
        .filter(evento=OuterRef('pk'))
        .values('evento')
        .annotate(total=Sum('vagas_disponiveis'))
        .values('total')
    )
    confirmados_por_evento = (
        Agendamento.objects
        .filter(horario__evento=OuterRef('pk'), status='confirmado')
        .values('horario__evento')
        .annotate(total=Count('id'))
        .values('total')
    )
    manuais_por_evento = (
        AgendamentoManual.objects
        .filter(evento=OuterRef('pk'), horario__isnull=False)
        .values('evento')
        .annotate(total=Count('id'))
        .values('total')
    )
    return (
        Evento.objects
        .filter(status='publicado')
        .filter(Q(data__gt=hoje) | Q(data=hoje, hora_fim__gt=agora))
        .annotate(
            total_vagas_calc=Coalesce(
                Subquery(vagas_por_evento, output_field=IntegerField()),
                Value(0),
            ),
            agendamentos_confirmados_calc=Coalesce(
                Subquery(confirmados_por_evento, output_field=IntegerField()),
                Value(0),
            ),
            participantes_manuais_calc=Coalesce(
                Subquery(manuais_por_evento, output_field=IntegerField()),
                Value(0),
            ),
        )
    )


def _total_eventos_com_presenca_pendente() -> int:
    agendamento_pendente = Agendamento.objects.filter(
        horario__evento=OuterRef('pk'),
        status='confirmado',
        compareceu__isnull=True,
    )
    manual_pendente = AgendamentoManual.objects.filter(
        evento=OuterRef('pk'),
        compareceu__isnull=True,
    )
    return (
        Evento.objects
        .filter(status='encerrado')
        .annotate(
            possui_agendamento_pendente=Exists(agendamento_pendente),
            possui_manual_pendente=Exists(manual_pendente),
        )
        .filter(
            Q(possui_agendamento_pendente=True)
            | Q(possui_manual_pendente=True)
        )
        .count()
    )


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

        hoje = timezone.localdate()
        agora = timezone.localtime().time()
        eventos_futuros = _eventos_futuros_com_ocupacao(hoje, agora)
        metricas = eventos_futuros.aggregate(
            total_vagas=Coalesce(Sum('total_vagas_calc'), Value(0)),
            total_confirmados=Coalesce(
                Sum('agendamentos_confirmados_calc'), Value(0)
            ),
            total_manuais=Coalesce(Sum('participantes_manuais_calc'), Value(0)),
            total_eventos=Count('id'),
        )
        total_vagas = metricas['total_vagas']
        vagas_ocupadas = metricas['total_confirmados'] + metricas['total_manuais']
        vagas_disponiveis = max(total_vagas - vagas_ocupadas, 0)
        taxa = round((vagas_ocupadas / total_vagas * 100), 1) if total_vagas else 0.0

        proximo = eventos_futuros.order_by('data', 'hora_inicio').first()
        proximo_evento = None
        if proximo is not None:
            proximo_ocupadas = (
                proximo.agendamentos_confirmados_calc
                + proximo.participantes_manuais_calc
            )
            proximo_evento = {
                'id': proximo.id,
                'titulo': proximo.titulo,
                'data': proximo.data,
                'hora_inicio': proximo.hora_inicio,
                'hora_fim': proximo.hora_fim,
                'total_vagas': proximo.total_vagas_calc,
                'vagas_ocupadas': proximo_ocupadas,
                'vagas_livres': max(proximo.total_vagas_calc - proximo_ocupadas, 0),
            }

        agendamentos_recentes = (
            Agendamento.objects
            .select_related('usuario', 'horario__evento')
            .order_by('-criado_em')[:10]
        )
        pessoas_fila = ListaEspera.objects.filter(
            horario__evento__status='publicado',
            status__in=['aguardando', 'notificado'],
        ).filter(
            Q(horario__evento__data__gt=hoje)
            | Q(
                horario__evento__data=hoje,
                horario__evento__hora_fim__gt=agora,
            )
        ).count()
        eventos_presenca_pendente = _total_eventos_com_presenca_pendente()
        falhas_email = Evento.objects.filter(emails_envio_status='falhou').count()
        total_pendencias = pessoas_fila + eventos_presenca_pendente + falhas_email

        data = {
            'total_vagas': total_vagas,
            'vagas_ocupadas': vagas_ocupadas,
            'taxa_ocupacao': taxa,
            'total_eventos_ativos': metricas['total_eventos'],
            'vagas_disponiveis': vagas_disponiveis,
            'proximo_evento': proximo_evento,
            'pendencias': {
                'total': total_pendencias,
                'eventos_presenca_pendente': eventos_presenca_pendente,
                'pessoas_fila': pessoas_fila,
                'falhas_email': falhas_email,
            },
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
