"""
Shim de compatibilidade — mantém o padrão `from ..views import views; views.ClassName`.

Todos os symbols são importados dos submódulos reais. Novos código deve importar
diretamente dos submódulos (ex.: from ..views.auth.login_view import AdminLoginView).
"""
# Permissões e helpers compartilhados
from .permissions import IsAdminUsuario, IsSuperAdmin, encerrar_eventos_expirados

# Auth
from .auth.login_view import AdminLoginView
from .auth.acesso_view import AcessoViaTokenView, EventoPublicoView, AcessarEventoView
from .auth.otp_view import SolicitarAcessoView, VerificarCodigoView
from .auth.confirmar_vaga_view import ConfirmarVagaListaEsperaView

# Admin
from .admin.usuario_viewset import AdminUsuarioViewSet
from .admin.evento_viewset import AdminEventoViewSet, AdminAgendamentoViewSet
from .admin.dashboard_view import AdminDashboardView
from .admin.ldap_views import LdapSearchView, PromoverAdminView, RevogarAdminView, ListarAdminsView

# Colaborador
from .colaborador.evento_view import EventoListView, EventoDetailView
from .colaborador.agendamento_view import ReservarHorarioView, CancelarAgendamentoView, MeusAgendamentosView
from .colaborador.lista_espera_view import EntrarListaEsperaView, MinhaListaEsperaView

__all__ = [
    # Permissões
    'IsAdminUsuario',
    'IsSuperAdmin',
    'encerrar_eventos_expirados',
    # Auth
    'AdminLoginView',
    'AcessoViaTokenView',
    'EventoPublicoView',
    'AcessarEventoView',
    'SolicitarAcessoView',
    'VerificarCodigoView',
    'ConfirmarVagaListaEsperaView',
    # Admin
    'AdminUsuarioViewSet',
    'AdminEventoViewSet',
    'AdminAgendamentoViewSet',
    'AdminDashboardView',
    'LdapSearchView',
    'PromoverAdminView',
    'RevogarAdminView',
    'ListarAdminsView',
    # Colaborador
    'EventoListView',
    'EventoDetailView',
    'ReservarHorarioView',
    'CancelarAgendamentoView',
    'MeusAgendamentosView',
    'EntrarListaEsperaView',
    'MinhaListaEsperaView',
]
