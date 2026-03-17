from django.urls import path, include
from rest_framework.routers import DefaultRouter

from ..views import views

router = DefaultRouter()
router.register(r'admin/usuarios', views.AdminUsuarioViewSet, basename='admin-usuarios')
router.register(r'admin/eventos', views.AdminEventoViewSet, basename='admin-eventos')
router.register(r'admin/agendamentos', views.AdminAgendamentoViewSet, basename='admin-agendamentos')

urlpatterns = [
    # -----------------------------------------------------------------------
    # Auth
    # -----------------------------------------------------------------------
    # Login do admin (email + senha → JWT)
    path('auth/login/', views.AdminLoginView.as_view(), name='admin-login'),

    # Acesso do colaborador via link mágico do e-mail (token UUID → JWT)
    path('auth/acesso/<uuid:token>/', views.AcessoViaTokenView.as_view(), name='acesso-via-token'),

    # Acesso via e-mail + palavra-chave com verificação OTP (fluxo lista de distribuição)
    path('auth/solicitar-acesso/', views.SolicitarAcessoView.as_view(), name='solicitar-acesso'),
    path('auth/verificar-codigo/', views.VerificarCodigoView.as_view(), name='verificar-codigo'),
    path('auth/acessar-evento/', views.AcessarEventoView.as_view(), name='acessar-evento'),
    path('auth/evento-publico/<int:evento_id>/', views.EventoPublicoView.as_view(), name='evento-publico'),

    # -----------------------------------------------------------------------
    # Admin
    # -----------------------------------------------------------------------
    path('admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),

    # -----------------------------------------------------------------------
    # SuperAdmin (CTI) — Gestão de usuários via LDAP
    # -----------------------------------------------------------------------
    path('admin/ldap/buscar/', views.LdapSearchView.as_view(), name='ldap-buscar'),
    path('admin/ldap/promover/', views.PromoverAdminView.as_view(), name='ldap-promover'),
    path('admin/ldap/revogar/<int:usuario_id>/', views.RevogarAdminView.as_view(), name='ldap-revogar'),
    path('admin/ldap/admins/', views.ListarAdminsView.as_view(), name='ldap-admins'),

    # -----------------------------------------------------------------------
    # Colaborador — Eventos
    # -----------------------------------------------------------------------
    path('colaborador/eventos/', views.EventoListView.as_view(), name='colaborador-eventos-list'),
    path('colaborador/eventos/<int:pk>/', views.EventoDetailView.as_view(), name='colaborador-evento-detail'),

    # Reservar horário: o colaborador escolhe um slot e confirma
    path(
        'colaborador/eventos/<int:evento_id>/horarios/<int:horario_id>/reservar/',
        views.ReservarHorarioView.as_view(),
        name='reservar-horario',
    ),

    # -----------------------------------------------------------------------
    # Colaborador — Agendamentos
    # -----------------------------------------------------------------------
    path('colaborador/agendamentos/', views.MeusAgendamentosView.as_view(), name='meus-agendamentos'),
    path(
        'colaborador/agendamentos/<int:agendamento_id>/cancelar/',
        views.CancelarAgendamentoView.as_view(),
        name='cancelar-agendamento',
    ),

    # -----------------------------------------------------------------------
    # Router (ViewSets)
    # -----------------------------------------------------------------------
    path('', include(router.urls)),
]
