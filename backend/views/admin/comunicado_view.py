from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models.models import Comunicado, Usuario
from ...services import email_service


def _is_admin(request):
    return request.user.is_authenticated and request.user.is_admin


def _enviar_para_todos(assunto: str, corpo_html: str) -> int:
    destinatarios = Usuario.objects.filter(is_active=True, is_admin=False)
    total = 0
    for usuario in destinatarios:
        email_service.enviar_comunicado(usuario, assunto, corpo_html)
        total += 1
    return total


class AdminComunicadoView(APIView):
    """
    GET  /api/admin/comunicados/   — lista histórico de comunicados
    POST /api/admin/comunicados/   — envia novo comunicado para todos os colaboradores ativos
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not _is_admin(request):
            return Response(status=status.HTTP_403_FORBIDDEN)

        comunicados = Comunicado.objects.select_related('enviado_por').all()
        data = [
            {
                'id': c.id,
                'assunto': c.assunto,
                'enviado_por': c.enviado_por.nome if c.enviado_por else '—',
                'enviado_em': c.enviado_em.strftime('%d/%m/%Y às %H:%M'),
                'total_destinatarios': c.total_destinatarios,
            }
            for c in comunicados
        ]
        return Response(data)

    def post(self, request):
        if not _is_admin(request):
            return Response(status=status.HTTP_403_FORBIDDEN)

        assunto = (request.data.get('assunto') or '').strip()
        corpo_html = (request.data.get('corpo_html') or '').strip()

        if not assunto:
            return Response({'erro': 'O assunto é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        if not corpo_html:
            return Response({'erro': 'O corpo do comunicado é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        total = _enviar_para_todos(assunto, corpo_html)

        comunicado = Comunicado.objects.create(
            assunto=assunto,
            corpo_html=corpo_html,
            enviado_por=request.user,
            total_destinatarios=total,
        )

        return Response(
            {'id': comunicado.id, 'total_enviado': total},
            status=status.HTTP_201_CREATED,
        )


class AdminComunicadoDetailView(APIView):
    """
    GET    /api/admin/comunicados/<id>/           — retorna assunto + corpo_html para edição
    PUT    /api/admin/comunicados/<id>/           — atualiza; se reenviar=true também reenvia
    DELETE /api/admin/comunicados/<id>/           — exclui o registro
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_objeto(self, pk):
        try:
            return Comunicado.objects.get(pk=pk)
        except Comunicado.DoesNotExist:
            return None

    def get(self, request, pk):
        if not _is_admin(request):
            return Response(status=status.HTTP_403_FORBIDDEN)
        obj = self._get_objeto(pk)
        if not obj:
            return Response({'erro': 'Comunicado não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'id': obj.id, 'assunto': obj.assunto, 'corpo_html': obj.corpo_html})

    def put(self, request, pk):
        if not _is_admin(request):
            return Response(status=status.HTTP_403_FORBIDDEN)
        obj = self._get_objeto(pk)
        if not obj:
            return Response({'erro': 'Comunicado não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        assunto = (request.data.get('assunto') or '').strip()
        corpo_html = (request.data.get('corpo_html') or '').strip()
        reenviar = bool(request.data.get('reenviar', False))

        if not assunto:
            return Response({'erro': 'O assunto é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        if not corpo_html:
            return Response({'erro': 'O corpo do comunicado é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        obj.assunto = assunto
        obj.corpo_html = corpo_html

        total_enviado = 0
        if reenviar:
            total_enviado = _enviar_para_todos(assunto, corpo_html)
            obj.total_destinatarios = total_enviado
            obj.enviado_por = request.user

        obj.save()
        return Response({'id': obj.id, 'total_enviado': total_enviado, 'reenviado': reenviar})

    def delete(self, request, pk):
        if not _is_admin(request):
            return Response(status=status.HTTP_403_FORBIDDEN)
        obj = self._get_objeto(pk)
        if not obj:
            return Response({'erro': 'Comunicado não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
