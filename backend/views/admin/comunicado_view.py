import logging

from django.conf import settings
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models.models import Comunicado
from ...services import email_service

logger = logging.getLogger(__name__)


def _is_admin(request):
    return request.user.is_authenticated and request.user.is_admin


def _get_destinatarios() -> list[str]:
    """Retorna a lista de destinatários configurada em EMAIL_DESTINO_EVENTO."""
    raw = getattr(settings, 'EMAIL_DESTINO_EVENTO', '').strip()
    return [d.strip() for d in raw.split(',') if d.strip()]


def _enviar_para_todos(assunto: str, corpo_html: str) -> int:
    destinatarios = _get_destinatarios()
    for dest in destinatarios:
        email_service.enviar_html_evento(assunto, corpo_html, dest)
    return len(destinatarios)


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
                'enviado_em': timezone.localtime(c.enviado_em).strftime('%d/%m/%Y às %H:%M'),
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
        if not _get_destinatarios():
            return Response(
                {'erro': 'Destinatário não configurado. Defina EMAIL_DESTINO_EVENTO no .env.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            total = _enviar_para_todos(assunto, corpo_html)
            comunicado = Comunicado.objects.create(
                assunto=assunto,
                corpo_html=corpo_html,
                enviado_por=request.user,
                total_destinatarios=total,
            )
        except Exception as exc:
            logger.exception('Erro ao enviar comunicado')
            return Response({'erro': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        if reenviar and not _get_destinatarios():
            return Response(
                {'erro': 'Destinatário não configurado. Defina EMAIL_DESTINO_EVENTO no .env.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            obj.assunto = assunto
            obj.corpo_html = corpo_html

            total_enviado = 0
            if reenviar:
                total_enviado = _enviar_para_todos(assunto, corpo_html)
                obj.total_destinatarios = total_enviado
                obj.enviado_por = request.user

            obj.save()
        except Exception as exc:
            logger.exception('Erro ao salvar/reenviar comunicado')
            return Response({'erro': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'id': obj.id, 'total_enviado': total_enviado, 'reenviado': reenviar})

    def delete(self, request, pk):
        if not _is_admin(request):
            return Response(status=status.HTTP_403_FORBIDDEN)
        obj = self._get_objeto(pk)
        if not obj:
            return Response({'erro': 'Comunicado não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
