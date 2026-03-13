from rest_framework import serializers

from ..models.models import Usuario, Evento, Horario, ConviteEmail, Agendamento, AgendamentoManual


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

    class Meta:
        model = Horario
        fields = [
            'id', 'hora_inicio', 'hora_fim',
            'vagas_disponiveis', 'vagas_ocupadas', 'vagas_livres', 'disponivel',
        ]


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

    class Meta:
        model = Evento
        fields = '__all__'

    def get_total_agendamentos(self, obj):
        return Agendamento.objects.filter(
            horario__evento=obj, status='confirmado'
        ).count()

    def validate_duracao_sessao(self, value):
        if value <= 0:
            raise serializers.ValidationError('A duração da sessão deve ser maior que zero.')
        return value

    def validate(self, attrs):
        hora_inicio = attrs.get('hora_inicio', getattr(self.instance, 'hora_inicio', None))
        hora_fim = attrs.get('hora_fim', getattr(self.instance, 'hora_fim', None))
        if hora_inicio and hora_fim and hora_inicio >= hora_fim:
            raise serializers.ValidationError(
                {'hora_fim': 'O horário de término deve ser após o de início.'}
            )
        return attrs

    def create(self, validated_data):
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
            'id', 'usuario', 'horario', 'status',
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
