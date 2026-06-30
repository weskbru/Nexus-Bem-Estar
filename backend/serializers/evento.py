from datetime import date

from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from ..models.models import Agendamento, Evento, Horario, ListaEspera


def _add_months(base_date: date, months: int) -> date:
    month_index = (base_date.month - 1) + months
    year = base_date.year + (month_index // 12)
    month = (month_index % 12) + 1
    day = min(base_date.day, _days_in_month(year, month))
    return date(year, month, day)


def _days_in_month(year: int, month: int) -> int:
    if month == 2:
        leap = (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)
        return 29 if leap else 28
    if month in (4, 6, 9, 11):
        return 30
    return 31

class HorarioSerializer(serializers.ModelSerializer):
    vagas_ocupadas = serializers.ReadOnlyField()
    vagas_livres = serializers.ReadOnlyField()
    disponivel = serializers.ReadOnlyField()
    reservado_para_fila = serializers.SerializerMethodField()

    class Meta:
        model = Horario
        fields = [
            'id', 'hora_inicio', 'hora_fim',
            'vagas_disponiveis', 'vagas_ocupadas', 'vagas_livres', 'disponivel',
            'reservado_para_fila',
        ]

    def get_reservado_para_fila(self, obj) -> bool:
        """True quando há alguém com status 'notificado' aguardando confirmação neste slot."""
        return ListaEspera.objects.filter(
            horario=obj,
            status='notificado',
        ).exists()


# ---------------------------------------------------------------------------
# Evento — visão do colaborador
# ---------------------------------------------------------------------------

class EventoListSerializer(serializers.ModelSerializer):
    """Listagem de eventos para o colaborador (card da tela Eventos)."""
    total_horarios = serializers.SerializerMethodField()
    horarios_disponiveis = serializers.SerializerMethodField()
    esgotado = serializers.SerializerMethodField()

    class Meta:
        model = Evento
        fields = [
            'id', 'titulo', 'tipo', 'data', 'hora_inicio', 'hora_fim',
            'imagem_url', 'status', 'nome_profissional',
            'total_horarios', 'horarios_disponiveis', 'esgotado',
        ]

    def get_total_horarios(self, obj):
        return obj.horarios.count()

    def get_horarios_disponiveis(self, obj):
        return sum(1 for h in obj.horarios.all() if h.disponivel)

    def get_esgotado(self, obj):
        return not any(h.disponivel for h in obj.horarios.all())


class EventoDetailSerializer(serializers.ModelSerializer):
    """Detalhe do evento com seus horários (tela EventDetails)."""
    horarios = HorarioSerializer(many=True, read_only=True)

    class Meta:
        model = Evento
        fields = [
            'id', 'titulo', 'tipo', 'descricao', 'nome_profissional',
            'data', 'hora_inicio', 'hora_fim', 'duracao_sessao',
            'capacidade_por_horario', 'imagem_url', 'status', 'horarios',
        ]


# ---------------------------------------------------------------------------
# Evento — visão do admin (CRUD completo)
# ---------------------------------------------------------------------------

class EventoAdminSerializer(serializers.ModelSerializer):
    horarios = HorarioSerializer(many=True, read_only=True)
    total_agendamentos = serializers.SerializerMethodField()
    presenca_pendente = serializers.SerializerMethodField()

    class Meta:
        model = Evento
        fields = '__all__'

    def get_total_agendamentos(self, obj):
        return Agendamento.objects.filter(
            horario__evento=obj, status='confirmado'
        ).count()

    def get_presenca_pendente(self, obj):
        if obj.status != 'encerrado':
            return False
        return Agendamento.objects.filter(
            horario__evento=obj,
            status='confirmado',
            compareceu__isnull=True,
        ).exists()

    def validate_duracao_sessao(self, value):
        if value <= 0:
            raise serializers.ValidationError('A duração da sessão deve ser maior que zero.')
        return value

    def validate(self, attrs):
        data_evento = attrs.get('data', getattr(self.instance, 'data', None))
        hora_inicio = attrs.get('hora_inicio', getattr(self.instance, 'hora_inicio', None))
        hora_fim = attrs.get('hora_fim', getattr(self.instance, 'hora_fim', None))
        duracao_sessao = attrs.get('duracao_sessao', getattr(self.instance, 'duracao_sessao', None))

        if data_evento:
            hoje = timezone.localdate()
            if data_evento < hoje:
                raise serializers.ValidationError(
                    {'data': 'A data do evento não pode ser no passado.'}
                )

            max_meses = max(int(getattr(settings, 'EVENTO_MAX_MESES_FUTURO', 6)), 1)
            limite = _add_months(hoje, max_meses)
            if data_evento > limite:
                raise serializers.ValidationError(
                    {'data': f'A data deve estar dentro de até {max_meses} meses no futuro.'}
                )

        if hora_inicio and hora_fim and hora_inicio >= hora_fim:
            raise serializers.ValidationError(
                {'hora_fim': 'O horário de término deve ser após o de início.'}
            )

        if hora_inicio and hora_fim and duracao_sessao:
            periodo_total = (hora_fim.hour * 60 + hora_fim.minute) - (hora_inicio.hour * 60 + hora_inicio.minute)
            if duracao_sessao > periodo_total:
                raise serializers.ValidationError(
                    {'duracao_sessao': 'A duração da sessão não pode ser maior que o período total do evento.'}
                )

        return attrs

    def create(self, validated_data):
        # Novos eventos devem ser criados diretamente como publicados.
        validated_data['status'] = 'publicado'
        evento = super().create(validated_data)
        if evento.status == 'publicado':
            evento.gerar_horarios()
        return evento

    def update(self, instance, validated_data):
        if instance.emails_enviados_em and instance.status != 'encerrado':
            raise serializers.ValidationError(
                {'non_field_errors': 'Este evento não pode ser editado pois o e-mail de divulgação já foi enviado.'}
            )
        campos_de_horario = {
            'duracao_sessao', 'hora_inicio', 'hora_fim', 'capacidade_por_horario', 'data'
        }
        regenerar = bool(campos_de_horario & set(validated_data.keys()))
        evento = super().update(instance, validated_data)
        if regenerar and evento.status == 'publicado':
            try:
                evento.gerar_horarios()
            except ValueError as exc:
                raise serializers.ValidationError({'non_field_errors': str(exc)})
        return evento


class EventoAdminListSerializer(serializers.ModelSerializer):
    total_agendamentos = serializers.SerializerMethodField()
    presenca_pendente = serializers.SerializerMethodField()

    class Meta:
        model = Evento
        fields = [
            'id',
            'titulo',
            'tipo',
            'data',
            'hora_inicio',
            'hora_fim',
            'imagem_url',
            'status',
            'nome_profissional',
            'emails_enviados_em',
            'emails_envio_status',
            'emails_agendado_para',
            'total_agendamentos',
            'presenca_pendente',
        ]

    def get_total_agendamentos(self, obj):
        anotado = getattr(obj, 'total_agendamentos_calc', None)
        if anotado is not None:
            return anotado
        return Agendamento.objects.filter(
            horario__evento=obj, status='confirmado'
        ).count()

    def get_presenca_pendente(self, obj):
        if obj.status != 'encerrado':
            return False
        anotado = getattr(obj, 'presenca_pendente_calc', None)
        if anotado is not None:
            return anotado
        return Agendamento.objects.filter(
            horario__evento=obj,
            status='confirmado',
            compareceu__isnull=True,
        ).exists()


# ---------------------------------------------------------------------------
# Agendamento
# ---------------------------------------------------------------------------
