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
    # GET: preview do evento (+ JWT se não exige palavra-chave)
    # POST: valida palavra-chave e emite JWT
    path('auth/acesso/<uuid:token>/', views.AcessoViaTokenView.as_view(), name='acesso-via-token'),

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
