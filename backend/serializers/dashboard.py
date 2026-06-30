from rest_framework import serializers

from .agendamento import AgendamentoSerializer


class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class DashboardSerializer(serializers.Serializer):
    total_vagas = serializers.IntegerField()
    vagas_ocupadas = serializers.IntegerField()
    taxa_ocupacao = serializers.FloatField()
    total_eventos_ativos = serializers.IntegerField()
    agendamentos_recentes = AgendamentoSerializer(many=True)
