from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models.models import Usuario
from ...serializers.serializers import UsuarioSerializer
from ...services.ldap.service import buscar_usuarios as ldap_buscar
from ..permissions import IsSuperAdmin


class LdapSearchView(APIView):
    """
    GET /api/admin/ldap/buscar/?q=<termo>
    Pesquisa colaboradores no Active Directory (ou base Mock) por nome,
    e-mail, matrícula ou departamento.
    Acesso restrito a SuperAdmin (CTI).
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response(
                {'erro': 'Informe ao menos 2 caracteres para a busca.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resultados = ldap_buscar(q)

        emails = {u['email'] for u in resultados}
        usuarios_locais = {
            u.email: u
            for u in Usuario.objects.filter(email__in=emails)
        }

        for usuario in resultados:
            local = usuarios_locais.get(usuario['email'])
            usuario['no_sistema'] = local is not None
            usuario['is_admin'] = local.is_admin if local else False
            usuario['is_superuser'] = local.is_superuser if local else False

        return Response(resultados)


class PromoverAdminView(APIView):
    """
    POST /api/admin/ldap/promover/
    Cria o usuário no banco local (se não existir) e o promove a Admin de Eventos.
    Body: { email, nome, matricula, departamento }
    Acesso restrito a SuperAdmin (CTI).
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        email        = request.data.get('email', '').strip().lower()
        nome         = request.data.get('nome', '').strip()
        matricula    = request.data.get('matricula', '').strip()
        departamento = request.data.get('departamento', '').strip()

        if not email or not nome:
            return Response(
                {'erro': 'E-mail e nome são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario, criado = Usuario.objects.get_or_create(
            email=email,
            defaults={
                'nome': nome,
                'matricula': matricula,
                'departamento': departamento,
                'is_admin': True,
                'is_staff': True,
                'is_active': True,
            },
        )

        if not criado:
            usuario.is_admin = True
            usuario.is_staff = True
            if nome:
                usuario.nome = nome
            if matricula:
                usuario.matricula = matricula
            if departamento:
                usuario.departamento = departamento
            usuario.save(update_fields=['is_admin', 'is_staff', 'nome', 'matricula', 'departamento'])

        return Response(
            UsuarioSerializer(usuario).data,
            status=status.HTTP_201_CREATED if criado else status.HTTP_200_OK,
        )


class RevogarAdminView(APIView):
    """
    POST /api/admin/ldap/revogar/<id>/
    Remove o acesso de administrador de um usuário.
    Acesso restrito a SuperAdmin (CTI).
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request, usuario_id):
        try:
            usuario = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response(
                {'erro': 'Usuário não encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if usuario.is_superuser:
            return Response(
                {'erro': 'Não é possível revogar acesso de um Super Admin.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario.is_admin = False
        usuario.is_staff = False
        usuario.save(update_fields=['is_admin', 'is_staff'])
        return Response({'mensagem': f'Acesso de administrador revogado para {usuario.nome}.'})


class ListarAdminsView(generics.ListAPIView):
    """
    GET /api/admin/ldap/admins/
    Lista todos os usuários com acesso administrativo (is_admin=True).
    Acesso restrito a SuperAdmin (CTI).
    """
    serializer_class = UsuarioSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        return Usuario.objects.filter(is_admin=True).order_by('nome')
