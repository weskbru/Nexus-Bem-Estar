from datetime import date

from rest_framework import serializers

from ..models.models import Agendamento, AgendamentoManual, ConviteEmail
from .evento import HorarioSerializer
from .usuario import UsuarioSerializer


class AgendamentoSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer(read_only=True)
    horario = HorarioSerializer(read_only=True)
    evento_id = serializers.SerializerMethodField()
    evento_titulo = serializers.SerializerMethodField()
    evento_data = serializers.SerializerMethodField()
    nome_profissional = serializers.SerializerMethodField()

    class Meta:
        model = Agendamento
        fields = [
            'id', 'usuario', 'horario', 'status', 'compareceu',
            'evento_id', 'evento_titulo', 'evento_data', 'nome_profissional',
            'criado_em', 'atualizado_em',
        ]
        read_only_fields = ['id', 'criado_em', 'atualizado_em']

    def get_evento_id(self, obj) -> int:
        return obj.horario.evento_id

    def get_evento_titulo(self, obj) -> str:
        return obj.horario.evento.titulo

    def get_evento_data(self, obj) -> date:
        return obj.horario.evento.data

    def get_nome_profissional(self, obj) -> str:
        return obj.horario.evento.nome_profissional


# ---------------------------------------------------------------------------
# Convite de E-mail
# ---------------------------------------------------------------------------

class ConviteEmailSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer(read_only=True)
    evento_titulo = serializers.SerializerMethodField()

    class Meta:
        model = ConviteEmail
        fields = ['id', 'usuario', 'evento_titulo', 'token', 'chave_mensagem', 'usado', 'enviado_em']
        read_only_fields = ['id', 'token', 'chave_mensagem', 'enviado_em']

    def get_evento_titulo(self, obj):
        return obj.evento.titulo


# ---------------------------------------------------------------------------
# Participante Manual
# ---------------------------------------------------------------------------

class AgendamentoManualSerializer(serializers.ModelSerializer):
    horario_info = serializers.SerializerMethodField()

    class Meta:
        model = AgendamentoManual
        fields = ['id', 'evento', 'horario', 'horario_info', 'nome', 'matricula', 'departamento', 'compareceu', 'criado_em']
        read_only_fields = ['id', 'criado_em', 'horario_info']

    def get_horario_info(self, obj):
        if obj.horario is None:
            return 'A definir'
        return (
            f"{obj.horario.hora_inicio.strftime('%H:%M')} – "
            f"{obj.horario.hora_fim.strftime('%H:%M')}"
        )


# ---------------------------------------------------------------------------
# Penalidade
# ---------------------------------------------------------------------------
