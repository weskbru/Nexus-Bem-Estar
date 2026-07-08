from rest_framework import serializers

from ..models.models import Penalidade
from .usuario import UsuarioSerializer


class PenalidadeSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer(read_only=True)
    evento_origem_titulo = serializers.SerializerMethodField()
    evento_punicao_titulo = serializers.SerializerMethodField()
    evento_punicao_status = serializers.SerializerMethodField()

    class Meta:
        model = Penalidade
        fields = [
            'id', 'usuario', 'ativa',
            'evento_origem_titulo', 'evento_punicao_titulo', 'evento_punicao_status',
            'criada_em', 'revogada_em', 'motivo_revogacao',
        ]
        read_only_fields = ['id', 'criada_em']

    def get_evento_origem_titulo(self, obj) -> str | None:
        if obj.agendamento:
            return obj.agendamento.horario.evento.titulo
        return None

    def get_evento_punicao_titulo(self, obj) -> str | None:
        return obj.evento_punicao.titulo if obj.evento_punicao else None

    def get_evento_punicao_status(self, obj) -> str | None:
        return obj.evento_punicao.status if obj.evento_punicao else None


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
