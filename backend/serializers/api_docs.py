from rest_framework import serializers

from .dashboard import DashboardSerializer
from .usuario import UsuarioSerializer


class ErroSerializer(serializers.Serializer):
    erro = serializers.CharField()


class MensagemSerializer(serializers.Serializer):
    mensagem = serializers.CharField()


class TokenResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    usuario = UsuarioSerializer()
    evento_id = serializers.IntegerField(required=False)
    chave_mensagem = serializers.CharField(required=False, allow_blank=True)
    mensagem = serializers.CharField(required=False)


class SolicitarAcessoRequestSerializer(serializers.Serializer):
    evento_id = serializers.IntegerField()
    email = serializers.EmailField()
    palavra_chave = serializers.CharField(required=False, allow_blank=True)


class VerificarCodigoRequestSerializer(serializers.Serializer):
    evento_id = serializers.IntegerField()
    email = serializers.EmailField()
    codigo = serializers.CharField()


class AcessarEventoRequestSerializer(SolicitarAcessoRequestSerializer):
    ramal = serializers.CharField(required=False, allow_blank=True)


class AcessoPalavraChaveRequestSerializer(serializers.Serializer):
    palavra_chave = serializers.CharField()


class AcessoPreviewSerializer(serializers.Serializer):
    requer_palavra_chave = serializers.BooleanField()
    evento_titulo = serializers.CharField()
    evento_tipo = serializers.CharField()
    evento_data = serializers.DateField()
    evento_hora_inicio = serializers.TimeField()
    evento_hora_fim = serializers.TimeField()
    nome_profissional = serializers.CharField()


class EventoPublicoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    titulo = serializers.CharField()
    tipo = serializers.CharField()
    data = serializers.DateField()
    hora_inicio = serializers.TimeField()
    hora_fim = serializers.TimeField()
    nome_profissional = serializers.CharField()
    requer_palavra_chave = serializers.BooleanField()


class LdapUsuarioSerializer(serializers.Serializer):
    email = serializers.EmailField()
    nome = serializers.CharField()
    matricula = serializers.CharField(required=False, allow_blank=True)
    departamento = serializers.CharField(required=False, allow_blank=True)
    no_sistema = serializers.BooleanField()
    is_admin = serializers.BooleanField()
    is_superuser = serializers.BooleanField()


class PromoverAdminRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    nome = serializers.CharField()
    matricula = serializers.CharField(required=False, allow_blank=True)
    departamento = serializers.CharField(required=False, allow_blank=True)


class SolicitarOtpAgendamentoRequestSerializer(serializers.Serializer):
    reenviar = serializers.BooleanField(required=False, default=False)


class OtpAgendamentoResponseSerializer(serializers.Serializer):
    mensagem = serializers.CharField()
    reutilizado = serializers.BooleanField()
    segundos_restantes = serializers.IntegerField()


class ReservarHorarioRequestSerializer(serializers.Serializer):
    otp = serializers.CharField()
    alterar = serializers.BooleanField(required=False, default=False)


class ListaEsperaResponseSerializer(serializers.Serializer):
    posicao = serializers.IntegerField()
    total_na_fila = serializers.IntegerField()
    status = serializers.CharField()
    ja_inscrito = serializers.BooleanField(required=False)


class MinhaListaEsperaSerializer(serializers.Serializer):
    horario_id = serializers.IntegerField()
    posicao = serializers.IntegerField()
    total_na_fila = serializers.IntegerField()
    status = serializers.CharField()
    expira_em = serializers.DateTimeField(allow_null=True)


class ComunicadoRequestSerializer(serializers.Serializer):
    assunto = serializers.CharField()
    corpo_html = serializers.CharField()
    modo_envio = serializers.ChoiceField(choices=['imediato', 'agendado'], required=False)
    agendado_para = serializers.DateTimeField(required=False)


class ComunicadoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    assunto = serializers.CharField()
    enviado_por = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    agendado_para = serializers.DateTimeField(allow_null=True)
    agendado_para_formatado = serializers.CharField(allow_null=True)
    enviado_em = serializers.CharField(allow_null=True)
    cancelado_em = serializers.CharField(allow_null=True)
    total_destinatarios = serializers.IntegerField()
    tentativas_envio = serializers.IntegerField()
    erro_envio = serializers.CharField(allow_blank=True)
    corpo_html = serializers.CharField(required=False)
    total_enviado = serializers.IntegerField(required=False)


class ComunicadosPaginadosSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    results = ComunicadoSerializer(many=True)
