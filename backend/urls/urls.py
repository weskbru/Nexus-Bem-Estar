from django.urls import path, include
from rest_framework.routers import DefaultRouter

from ..views.admin.usuario_viewset import AdminUsuarioViewSet
from ..views.admin.evento_viewset import AdminEventoViewSet, AdminAgendamentoViewSet, AdminPenalidadeViewSet
from ..views.admin.dashboard_view import AdminDashboardView
from ..views.admin.ldap_views import LdapSearchView, PromoverAdminView, RevogarAdminView, ListarAdminsView
from ..views.auth.login_view import AdminLoginView
from ..views.auth.acesso_view import AcessoViaTokenView, EventoPublicoView, AcessarEventoView
from ..views.auth.otp_view import SolicitarAcessoView, VerificarCodigoView
from ..views.auth.confirmar_vaga_view import ConfirmarVagaListaEsperaView
from ..views.colaborador.evento_view import EventoListView, EventoDetailView
from ..views.colaborador.agendamento_view import ReservarHorarioView, CancelarAgendamentoView, MeusAgendamentosView
from ..views.colaborador.lista_espera_view import EntrarListaEsperaView, MinhaListaEsperaView
from ..views.colaborador.otp_agendamento_view import SolicitarOTPAgendamentoView

router = DefaultRouter()
router.register(r'admin/usuarios',     AdminUsuarioViewSet,      basename='admin-usuarios')
router.register(r'admin/eventos',      AdminEventoViewSet,       basename='admin-eventos')
router.register(r'admin/agendamentos', AdminAgendamentoViewSet,  basename='admin-agendamentos')
router.register(r'admin/penalidades',  AdminPenalidadeViewSet,   basename='admin-penalidades')

urlpatterns = [
    # -----------------------------------------------------------------------
    # Auth
    # -----------------------------------------------------------------------
    path('auth/login/',                          AdminLoginView.as_view(),              name='admin-login'),
    path('auth/acesso/<uuid:token>/',            AcessoViaTokenView.as_view(),          name='acesso-via-token'),
    path('auth/solicitar-acesso/',               SolicitarAcessoView.as_view(),         name='solicitar-acesso'),
    path('auth/verificar-codigo/',               VerificarCodigoView.as_view(),         name='verificar-codigo'),
    path('auth/acessar-evento/',                 AcessarEventoView.as_view(),           name='acessar-evento'),
    path('auth/evento-publico/<int:evento_id>/', EventoPublicoView.as_view(),           name='evento-publico'),
    path('auth/confirmar-vaga/<uuid:token>/',    ConfirmarVagaListaEsperaView.as_view(), name='confirmar-vaga'),

    # -----------------------------------------------------------------------
    # Admin
    # -----------------------------------------------------------------------
    path('admin/dashboard/',                          AdminDashboardView.as_view(),  name='admin-dashboard'),
    path('admin/ldap/buscar/',                        LdapSearchView.as_view(),      name='ldap-buscar'),
    path('admin/ldap/promover/',                      PromoverAdminView.as_view(),   name='ldap-promover'),
    path('admin/ldap/revogar/<int:usuario_id>/',      RevogarAdminView.as_view(),    name='ldap-revogar'),
    path('admin/ldap/admins/',                        ListarAdminsView.as_view(),    name='ldap-admins'),

    # -----------------------------------------------------------------------
    # Colaborador — Eventos
    # -----------------------------------------------------------------------
    path('colaborador/eventos/',          EventoListView.as_view(),   name='colaborador-eventos-list'),
    path('colaborador/eventos/<int:pk>/', EventoDetailView.as_view(), name='colaborador-evento-detail'),
    path(
        'colaborador/eventos/<int:evento_id>/horarios/<int:horario_id>/reservar/',
        ReservarHorarioView.as_view(),
        name='reservar-horario',
    ),

    # -----------------------------------------------------------------------
    # Colaborador — Agendamentos
    # -----------------------------------------------------------------------
    path('colaborador/agendamentos/', MeusAgendamentosView.as_view(), name='meus-agendamentos'),
    path(
        'colaborador/agendamentos/<int:agendamento_id>/cancelar/',
        CancelarAgendamentoView.as_view(),
        name='cancelar-agendamento',
    ),

    # -----------------------------------------------------------------------
    # Colaborador — Lista de Espera
    # -----------------------------------------------------------------------
    path(
        'colaborador/horarios/<int:horario_id>/solicitar-otp/',
        SolicitarOTPAgendamentoView.as_view(),
        name='solicitar-otp-agendamento',
    ),
    path(
        'colaborador/horarios/<int:horario_id>/lista-espera/',
        EntrarListaEsperaView.as_view(),
        name='entrar-lista-espera',
    ),
    path('colaborador/lista-espera/', MinhaListaEsperaView.as_view(), name='minha-lista-espera'),

    # -----------------------------------------------------------------------
    # Router (ViewSets)
    # -----------------------------------------------------------------------
    path('', include(router.urls)),
]
