from rest_framework import viewsets

from ...models.models import Usuario
from ...serializers.serializers import UsuarioCreateSerializer, UsuarioSerializer
from ..permissions import IsAdminUsuario


class AdminUsuarioViewSet(viewsets.ModelViewSet):
    """
    CRUD de usuários/colaboradores.
    GET    /api/admin/usuarios/
    POST   /api/admin/usuarios/
    GET    /api/admin/usuarios/<id>/
    PUT    /api/admin/usuarios/<id>/
    DELETE /api/admin/usuarios/<id>/
    """
    queryset = Usuario.objects.all().order_by('nome')
    permission_classes = [IsAdminUsuario]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return UsuarioCreateSerializer
        return UsuarioSerializer
