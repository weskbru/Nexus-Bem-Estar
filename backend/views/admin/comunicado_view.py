import logging
from datetime import timedelta

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ...domain.exceptions import ComunicadoEnvioError
from ...models.models import Comunicado
from ...services.comunicado import email_service
from ..permissions import IsAdminUsuario

logger = logging.getLogger(__name__)

MODO_ENVIO_IMEDIATO = 'imediato'
MODO_ENVIO_AGENDADO = 'agendado'
AGENDAMENTO_MINIMO_MINUTOS = 5
LISTAGEM_COMUNICADOS_LIMITE_PADRAO = 50
LISTAGEM_COMUNICADOS_LIMITE_MAXIMO = 100


def _localtime_formatado(dt):
    if not dt:
        return None
    return timezone.localtime(dt).strftime('%d/%m/%Y as %H:%M')


def _serializar_comunicado(c: Comunicado, incluir_corpo: bool = True) -> dict:
    data = {
        'id': c.id,
        'assunto': c.assunto,
        'enviado_por': c.enviado_por.nome if c.enviado_por else '-',
        'status': c.status,
        'status_label': c.get_status_display(),
        'agendado_para': c.agendado_para.isoformat() if c.agendado_para else None,
        'agendado_para_formatado': _localtime_formatado(c.agendado_para),
        'enviado_em': _localtime_formatado(c.enviado_em),
        'cancelado_em': _localtime_formatado(c.cancelado_em),
        'total_destinatarios': c.total_destinatarios,
        'tentativas_envio': c.tentativas_envio,
        'erro_envio': c.erro_envio,
    }
    if incluir_corpo:
        data['corpo_html'] = c.corpo_html
    return data


def _limite_listagem(request: Request) -> int:
    try:
        limite = int(request.query_params.get('limit', LISTAGEM_COMUNICADOS_LIMITE_PADRAO))
    except (TypeError, ValueError):
        return LISTAGEM_COMUNICADOS_LIMITE_PADRAO
    return max(1, min(limite, LISTAGEM_COMUNICADOS_LIMITE_MAXIMO))


def _validar_agendamento(raw_agendado_para: str | None):
    if not raw_agendado_para:
        return None, Response(
            {'erro': 'Informe a data e o horario do envio agendado.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    agendado_para = parse_datetime(raw_agendado_para)
    if not agendado_para:
        return None, Response(
            {'erro': 'Data e horario de agendamento invalidos.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if timezone.is_naive(agendado_para):
        agendado_para = timezone.make_aware(agendado_para, timezone.get_current_timezone())

    minimo = timezone.now() + timedelta(minutes=AGENDAMENTO_MINIMO_MINUTOS)
    if agendado_para < minimo:
        return None, Response(
            {'erro': f'Agende o envio para pelo menos {AGENDAMENTO_MINIMO_MINUTOS} minutos no futuro.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return agendado_para, None


def _validar_conteudo(request: Request):
    assunto: str = (request.data.get('assunto') or '').strip()
    corpo_html: str = (request.data.get('corpo_html') or '').strip()

    if not assunto:
        return None, None, Response({'erro': 'O assunto e obrigatorio.'}, status=status.HTTP_400_BAD_REQUEST)
    if not corpo_html:
        return None, None, Response({'erro': 'O corpo do comunicado e obrigatorio.'}, status=status.HTTP_400_BAD_REQUEST)

    return assunto, corpo_html, None


def _enviar_agora(assunto: str, corpo_html: str) -> int:
    if not email_service.get_destinatarios_comunicado():
        raise ComunicadoEnvioError('Destinatario nao configurado.')
    return email_service.enviar_para_lista_comunicado(assunto, corpo_html)


class AdminComunicadoView(APIView):
    """
    GET  /api/admin/comunicados/ - lista historico de comunicados
    POST /api/admin/comunicados/ - envia agora ou agenda um comunicado
    """
    permission_classes = [IsAdminUsuario]

    def get(self, request: Request) -> Response:
        comunicados = (
            Comunicado.objects
            .select_related('enviado_por')
            .order_by('-criado_em')[:_limite_listagem(request)]
        )
        return Response([_serializar_comunicado(c, incluir_corpo=False) for c in comunicados])

    def post(self, request: Request) -> Response:
        assunto, corpo_html, erro = _validar_conteudo(request)
        if erro:
            return erro

        modo_envio = request.data.get('modo_envio') or MODO_ENVIO_IMEDIATO
        if modo_envio not in (MODO_ENVIO_IMEDIATO, MODO_ENVIO_AGENDADO):
            return Response({'erro': 'Modo de envio invalido.'}, status=status.HTTP_400_BAD_REQUEST)

        if modo_envio == MODO_ENVIO_AGENDADO:
            agendado_para, erro_agendamento = _validar_agendamento(request.data.get('agendado_para'))
            if erro_agendamento:
                return erro_agendamento

            comunicado = Comunicado.objects.create(
                assunto=assunto,
                corpo_html=corpo_html,
                enviado_por=request.user,
                status=Comunicado.Status.AGENDADO,
                agendado_para=agendado_para,
            )
            return Response(_serializar_comunicado(comunicado), status=status.HTTP_201_CREATED)

        try:
            total = _enviar_agora(assunto, corpo_html)
            comunicado = Comunicado.objects.create(
                assunto=assunto,
                corpo_html=corpo_html,
                enviado_por=request.user,
                status=Comunicado.Status.ENVIADO,
                enviado_em=timezone.now(),
                total_destinatarios=total,
            )
        except ComunicadoEnvioError as exc:
            logger.error(
                'comunicado_envio_falhou',
                extra={'usuario_id': request.user.id, 'assunto': assunto, 'detalhe': str(exc)},
            )
            return Response({'erro': 'Falha ao enviar o comunicado. Tente novamente.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception:
            logger.exception('comunicado_envio_erro_inesperado', extra={'usuario_id': request.user.id, 'assunto': assunto})
            return Response({'erro': 'Erro interno.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        data = _serializar_comunicado(comunicado)
        data['total_enviado'] = total
        return Response(data, status=status.HTTP_201_CREATED)


class AdminComunicadoDetailView(APIView):
    """
    GET    /api/admin/comunicados/<id>/ - retorna comunicado para edicao/reutilizacao
    PUT    /api/admin/comunicados/<id>/ - atualiza comunicado ainda nao enviado
    DELETE /api/admin/comunicados/<id>/ - cancela agendado ou exclui registro antigo
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
            return Response({'erro': 'Comunicado nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(_serializar_comunicado(obj))

    def put(self, request: Request, pk: int) -> Response:
        obj = self._get_objeto(pk)
        if not obj:
            return Response({'erro': 'Comunicado nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if obj.status == Comunicado.Status.ENVIANDO:
            return Response({'erro': 'Este comunicado esta em envio e nao pode ser alterado.'}, status=status.HTTP_400_BAD_REQUEST)
        if obj.status == Comunicado.Status.ENVIADO:
            return Response(
                {'erro': 'Comunicados ja enviados nao podem ser alterados. Use o conteudo como base para um novo envio.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assunto, corpo_html, erro = _validar_conteudo(request)
        if erro:
            return erro

        modo_envio = request.data.get('modo_envio') or MODO_ENVIO_AGENDADO
        if modo_envio not in (MODO_ENVIO_IMEDIATO, MODO_ENVIO_AGENDADO):
            return Response({'erro': 'Modo de envio invalido.'}, status=status.HTTP_400_BAD_REQUEST)

        if modo_envio == MODO_ENVIO_AGENDADO:
            agendado_para, erro_agendamento = _validar_agendamento(request.data.get('agendado_para'))
            if erro_agendamento:
                return erro_agendamento

            obj.assunto = assunto
            obj.corpo_html = corpo_html
            obj.enviado_por = request.user
            obj.status = Comunicado.Status.AGENDADO
            obj.agendado_para = agendado_para
            obj.cancelado_em = None
            obj.erro_envio = ''
            obj.save()
            return Response(_serializar_comunicado(obj))

        try:
            total = _enviar_agora(assunto, corpo_html)
            obj.assunto = assunto
            obj.corpo_html = corpo_html
            obj.enviado_por = request.user
            obj.status = Comunicado.Status.ENVIADO
            obj.enviado_em = timezone.now()
            obj.agendado_para = None
            obj.cancelado_em = None
            obj.total_destinatarios = total
            obj.erro_envio = ''
            obj.save()
        except ComunicadoEnvioError as exc:
            logger.error('comunicado_envio_manual_falhou', extra={'usuario_id': request.user.id, 'comunicado_id': pk, 'detalhe': str(exc)})
            return Response({'erro': 'Falha ao enviar o comunicado. Tente novamente.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception:
            logger.exception('comunicado_envio_manual_erro_inesperado', extra={'usuario_id': request.user.id, 'comunicado_id': pk})
            return Response({'erro': 'Erro interno.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        data = _serializar_comunicado(obj)
        data['total_enviado'] = obj.total_destinatarios
        return Response(data)

    def delete(self, request: Request, pk: int) -> Response:
        obj = self._get_objeto(pk)
        if not obj:
            return Response({'erro': 'Comunicado nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if obj.status == Comunicado.Status.AGENDADO:
            obj.status = Comunicado.Status.CANCELADO
            obj.cancelado_em = timezone.now()
            obj.save(update_fields=['status', 'cancelado_em', 'atualizado_em'])
            return Response(_serializar_comunicado(obj))

        return Response(
            {'erro': 'Comunicados enviados, cancelados, com falha ou em envio nao podem ser excluidos fisicamente.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
