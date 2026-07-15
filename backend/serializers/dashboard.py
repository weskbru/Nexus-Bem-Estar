from rest_framework import serializers

from ..models.models import Agendamento, Horario
from .usuario import UsuarioSerializer


class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class DashboardHorarioSerializer(serializers.ModelSerializer):
    """Dados do horario realmente usados no historico do dashboard."""

    class Meta:
        model = Horario
        fields = ['id', 'hora_inicio', 'hora_fim', 'vagas_disponiveis']


class DashboardAgendamentoSerializer(serializers.ModelSerializer):
    """Versao enxuta que nao recalcula ocupacao e lista de espera por item."""

    usuario = UsuarioSerializer(read_only=True)
    horario = DashboardHorarioSerializer(read_only=True)
    evento_id = serializers.IntegerField(source='horario.evento_id', read_only=True)
    evento_titulo = serializers.CharField(source='horario.evento.titulo', read_only=True)
    evento_data = serializers.DateField(source='horario.evento.data', read_only=True)
    nome_profissional = serializers.CharField(
        source='horario.evento.nome_profissional', read_only=True
    )

    class Meta:
        model = Agendamento
        fields = [
            'id', 'usuario', 'horario', 'status', 'compareceu',
            'evento_id', 'evento_titulo', 'evento_data', 'nome_profissional',
            'criado_em', 'atualizado_em',
        ]


class DashboardSerializer(serializers.Serializer):
    total_vagas = serializers.IntegerField()
    vagas_ocupadas = serializers.IntegerField()
    taxa_ocupacao = serializers.FloatField()
    total_eventos_ativos = serializers.IntegerField()
    agendamentos_recentes = DashboardAgendamentoSerializer(many=True)


class AgendamentoNotificacaoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    colaborador_nome = serializers.CharField()
    servico = serializers.CharField()
    data_hora = serializers.DateTimeField()
    status = serializers.CharField()


class EventoNotificacaoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    titulo = serializers.CharField()
    data = serializers.DateField()
    hora_inicio = serializers.TimeField()
    status = serializers.CharField()


class AdminNotificacoesSerializer(serializers.Serializer):
    agendamentos = AgendamentoNotificacaoSerializer(many=True)
    eventos = EventoNotificacaoSerializer(many=True)
