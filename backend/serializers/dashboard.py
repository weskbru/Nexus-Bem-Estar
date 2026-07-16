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


class ProximoEventoDashboardSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    titulo = serializers.CharField()
    data = serializers.DateField()
    hora_inicio = serializers.TimeField()
    hora_fim = serializers.TimeField()
    total_vagas = serializers.IntegerField()
    vagas_ocupadas = serializers.IntegerField()
    vagas_livres = serializers.IntegerField()


class PendenciasDashboardSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    eventos_presenca_pendente = serializers.IntegerField()
    pessoas_fila = serializers.IntegerField()
    falhas_email = serializers.IntegerField()


class DashboardSerializer(serializers.Serializer):
    total_vagas = serializers.IntegerField()
    vagas_ocupadas = serializers.IntegerField()
    taxa_ocupacao = serializers.FloatField()
    total_eventos_ativos = serializers.IntegerField()
    vagas_disponiveis = serializers.IntegerField()
    proximo_evento = ProximoEventoDashboardSerializer(allow_null=True)
    pendencias = PendenciasDashboardSerializer()
    agendamentos_recentes = DashboardAgendamentoSerializer(many=True)


class ConfirmacoesNotificacaoSerializer(serializers.Serializer):
    evento_id = serializers.IntegerField()
    evento_titulo = serializers.CharField()
    quantidade = serializers.IntegerField()
    ultima_confirmacao = serializers.DateTimeField()


class EventoNotificacaoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    titulo = serializers.CharField()
    data = serializers.DateField()
    hora_inicio = serializers.TimeField()
    status = serializers.CharField()


class AdminNotificacoesSerializer(serializers.Serializer):
    confirmacoes = ConfirmacoesNotificacaoSerializer(many=True)
    eventos = EventoNotificacaoSerializer(many=True)
