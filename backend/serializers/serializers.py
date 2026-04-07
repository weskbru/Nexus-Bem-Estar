from rest_framework import serializers
from datetime import date
from django.conf import settings
from django.utils import timezone

from ..models.models import Usuario, Evento, Horario, ConviteEmail, Agendamento, AgendamentoManual, Penalidade, ListaEspera


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


# ---------------------------------------------------------------------------
# Usuário
# ---------------------------------------------------------------------------

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'email', 'nome', 'matricula', 'departamento', 'is_admin', 'is_superuser']
        read_only_fields = ['id']


class UsuarioCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Usuario
        fields = ['id', 'email', 'nome', 'matricula', 'departamento', 'is_admin', 'password']
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = Usuario(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


# ---------------------------------------------------------------------------
# Horário
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Agendamento
# ---------------------------------------------------------------------------

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

    def get_evento_id(self, obj):
        return obj.horario.evento_id

    def get_evento_titulo(self, obj):
        return obj.horario.evento.titulo

    def get_evento_data(self, obj):
        return obj.horario.evento.data

    def get_nome_profissional(self, obj):
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
        fields = ['id', 'evento', 'horario', 'horario_info', 'nome', 'matricula', 'departamento', 'criado_em']
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

    def get_evento_origem_titulo(self, obj):
        if obj.agendamento:
            return obj.agendamento.horario.evento.titulo
        return None

    def get_evento_punicao_titulo(self, obj):
        return obj.evento_punicao.titulo if obj.evento_punicao else None

    def get_evento_punicao_status(self, obj):
        return obj.evento_punicao.status if obj.evento_punicao else None


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class DashboardSerializer(serializers.Serializer):
    total_vagas = serializers.IntegerField()
    vagas_ocupadas = serializers.IntegerField()
    taxa_ocupacao = serializers.FloatField()
    total_eventos_ativos = serializers.IntegerField()
    agendamentos_recentes = AgendamentoSerializer(many=True)
