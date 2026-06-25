import logging

from django.utils import timezone
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ...domain.exceptions import ComunicadoEnvioError
from ...models.models import Comunicado
from ...services import email_service
from ..permissions import IsAdminUsuario

logger = logging.getLogger(__name__)


class AdminComunicadoView(APIView):
    """
    GET  /api/admin/comunicados/   — lista histórico de comunicados
    POST /api/admin/comunicados/   — envia novo comunicado para todos os destinatários configurados
    """
    permission_classes = [IsAdminUsuario]

    def get(self, request: Request) -> Response:
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

    def post(self, request: Request) -> Response:
        assunto: str = (request.data.get('assunto') or '').strip()
        corpo_html: str = (request.data.get('corpo_html') or '').strip()

        if not assunto:
            return Response({'erro': 'O assunto é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        if not corpo_html:
            return Response({'erro': 'O corpo do comunicado é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        if not email_service.get_destinatarios_evento():
            return Response(
                {'erro': 'Destinatário não configurado. Defina EMAIL_DESTINO_EVENTO no .env.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            total = email_service.enviar_para_lista_evento(assunto, corpo_html)
            comunicado = Comunicado.objects.create(
                assunto=assunto,
                corpo_html=corpo_html,
                enviado_por=request.user,
                total_destinatarios=total,
            )
        except ComunicadoEnvioError as exc:
            logger.error('comunicado_envio_falhou', extra={'usuario_id': request.user.id, 'assunto': assunto, 'detalhe': str(exc)})
            return Response({'erro': 'Falha ao enviar o comunicado. Tente novamente.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception:
            logger.exception('comunicado_envio_erro_inesperado', extra={'usuario_id': request.user.id, 'assunto': assunto})
            return Response({'erro': 'Erro interno.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(
            {'id': comunicado.id, 'total_enviado': total},
            status=status.HTTP_201_CREATED,
        )


class AdminComunicadoDetailView(APIView):
    """
    GET    /api/admin/comunicados/<id>/   — retorna assunto + corpo_html para edição
    PUT    /api/admin/comunicados/<id>/   — atualiza; se reenviar=true também reenvia
    DELETE /api/admin/comunicados/<id>/   — exclui o registro
    """
    permission_classes = [IsAdminUsuario]

    def _get_objeto(self, pk: int) -> Comunicado | None:
        try:
            return Comunicado.objects.get(pk=pk)
        except Comunicado.DoesNotExist:
            return None

    def get(self, request: Request, pk: int) -> Response:
        obj = self._get_objeto(pk)
        if not obj:
            return Response({'erro': 'Comunicado não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'id': obj.id, 'assunto': obj.assunto, 'corpo_html': obj.corpo_html})

    def put(self, request: Request, pk: int) -> Response:
        obj = self._get_objeto(pk)
        if not obj:
            return Response({'erro': 'Comunicado não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        assunto: str = (request.data.get('assunto') or '').strip()
        corpo_html: str = (request.data.get('corpo_html') or '').strip()
        reenviar: bool = bool(request.data.get('reenviar', False))

        if not assunto:
            return Response({'erro': 'O assunto é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        if not corpo_html:
            return Response({'erro': 'O corpo do comunicado é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        if reenviar and not email_service.get_destinatarios_evento():
            return Response(
                {'erro': 'Destinatário não configurado. Defina EMAIL_DESTINO_EVENTO no .env.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            obj.assunto = assunto
            obj.corpo_html = corpo_html

            total_enviado = 0
            if reenviar:
                total_enviado = email_service.enviar_para_lista_evento(assunto, corpo_html)
                obj.total_destinatarios = total_enviado
                obj.enviado_por = request.user

            obj.save()
        except ComunicadoEnvioError as exc:
            logger.error('comunicado_reenvio_falhou', extra={'usuario_id': request.user.id, 'comunicado_id': pk, 'detalhe': str(exc)})
            return Response({'erro': 'Falha ao reenviar o comunicado. Tente novamente.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception:
            logger.exception('comunicado_reenvio_erro_inesperado', extra={'usuario_id': request.user.id, 'comunicado_id': pk})
            return Response({'erro': 'Erro interno.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'id': obj.id, 'total_enviado': total_enviado, 'reenviado': reenviar})

    def delete(self, request: Request, pk: int) -> Response:
        obj = self._get_objeto(pk)
        if not obj:
            return Response({'erro': 'Comunicado não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
