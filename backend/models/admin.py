from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Usuario, Evento, Horario, ConviteEmail, Agendamento


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ['email', 'nome', 'departamento', 'is_admin', 'is_active', 'criado_em']
    list_filter = ['is_admin', 'is_active', 'departamento']
    search_fields = ['email', 'nome', 'matricula']
    ordering = ['nome']
    readonly_fields = ['criado_em']
    # Usuario não possui groups/user_permissions
    filter_horizontal = ()

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Informações Pessoais', {'fields': ('nome', 'matricula', 'departamento')}),
        ('Permissões', {'fields': ('is_admin', 'is_active', 'is_staff', 'is_superuser')}),
        ('Datas', {'fields': ('last_login', 'criado_em')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'nome', 'password1', 'password2'),
        }),
    )


@admin.register(Evento)
class EventoAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'tipo', 'data', 'hora_inicio', 'hora_fim', 'status', 'criado_em']
    list_filter = ['status', 'tipo', 'data']
    search_fields = ['titulo']
    readonly_fields = ['criado_em', 'atualizado_em']
    fieldsets = (
        ('Informações Gerais', {
            'fields': ('titulo', 'tipo', 'descricao', 'nome_profissional', 'imagem_url', 'status')
        }),
        ('Horários', {
            'fields': ('data', 'hora_inicio', 'hora_fim', 'duracao_sessao', 'capacidade_por_horario')
        }),
        ('E-mail de Convite', {
            'fields': ('corpo_email',),
            'description': 'Variáveis: {nome}, {titulo}, {data}, {hora_inicio}, {hora_fim}, {link}, {chave}',
        }),
        ('Auditoria', {'fields': ('criado_em', 'atualizado_em'), 'classes': ('collapse',)}),
    )


@admin.register(Horario)
class HorarioAdmin(admin.ModelAdmin):
    list_display = ['evento', 'hora_inicio', 'hora_fim', 'vagas_disponiveis']
    list_filter = ['evento']
    search_fields = ['evento__titulo']


@admin.register(ConviteEmail)
class ConviteEmailAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'evento', 'chave_mensagem', 'usado', 'enviado_em']
    list_filter = ['usado', 'evento']
    search_fields = ['usuario__email', 'usuario__nome', 'chave_mensagem']
    readonly_fields = ['token', 'chave_mensagem', 'enviado_em']


@admin.register(Agendamento)
class AgendamentoAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'horario', 'status', 'criado_em']
    list_filter = ['status', 'horario__evento']
    search_fields = ['usuario__nome', 'usuario__email']
    readonly_fields = ['criado_em', 'atualizado_em']
