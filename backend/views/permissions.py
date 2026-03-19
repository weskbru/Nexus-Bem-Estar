from django.db.models import Q
from django.utils import timezone

from rest_framework import permissions

from ..models.models import Evento


class IsAdminUsuario(permissions.BasePermission):
    """Permite acesso apenas a usuários marcados como admin."""
    message = 'Acesso restrito a administradores.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_admin
        )


class IsSuperAdmin(permissions.BasePermission):
    """Permite acesso apenas a superusuários (CTI)."""
    message = 'Acesso restrito a super-administradores (CTI).'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_superuser
        )


def encerrar_eventos_expirados() -> int:
    """Move para 'encerrado' os eventos publicados cujo horário final já passou."""
    hoje = timezone.localdate()
    agora = timezone.localtime().time()
    return Evento.objects.filter(
        status='publicado'
    ).filter(
        Q(data__lt=hoje) | Q(data=hoje, hora_fim__lte=agora)
    ).update(
        status='encerrado',
        atualizado_em=timezone.now(),
    )
