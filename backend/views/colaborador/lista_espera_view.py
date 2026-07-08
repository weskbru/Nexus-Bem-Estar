from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import OpenApiParameter, extend_schema

from ...models.models import Agendamento, Horario, ListaEspera
from ...serializers.api_docs import ErroSerializer, ListaEsperaResponseSerializer, MensagemSerializer, MinhaListaEsperaSerializer


class EntrarListaEsperaView(APIView):
    """
    POST /api/colaborador/horarios/<horario_id>/lista-espera/
    Insere o colaborador autenticado na lista de espera do horário lotado.

    DELETE /api/colaborador/horarios/<horario_id>/lista-espera/
    Remove o colaborador da fila de espera do horário.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: MensagemSerializer, 404: ErroSerializer},
        summary='Sai da lista de espera de um horario',
    )
    def delete(self, request, horario_id):
        atualizado = ListaEspera.objects.filter(
            usuario=request.user,
            horario_id=horario_id,
            status__in=['aguardando', 'notificado'],
        ).update(status='expirado')

        if not atualizado:
            return Response(
                {'erro': 'Você não está na fila deste horário.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({'mensagem': 'Você saiu da fila de espera com sucesso.'})

    @extend_schema(
        request=None,
        responses={200: ListaEsperaResponseSerializer, 201: ListaEsperaResponseSerializer, 400: ErroSerializer, 404: ErroSerializer, 409: ErroSerializer},
        summary='Entra na lista de espera de um horario',
    )
    def post(self, request, horario_id):
        try:
            horario = Horario.objects.select_related('evento').get(
                id=horario_id, evento__status='publicado'
            )
        except Horario.DoesNotExist:
            return Response(
                {'erro': 'Horário não encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if horario.disponivel:
            return Response(
                {'erro': 'Este horário ainda tem vagas. Faça seu agendamento normalmente.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Agendamento.objects.filter(
            usuario=request.user,
            horario__evento=horario.evento,
            status='confirmado',
        ).exists():
            return Response(
                {'erro': 'Você já possui um agendamento confirmado neste evento. Cancele-o antes de entrar na lista de espera.'},
                status=status.HTTP_409_CONFLICT,
            )

        entrada_existente = ListaEspera.objects.filter(
            horario=horario, usuario=request.user
        ).first()
        if entrada_existente:
            total = ListaEspera.objects.filter(
                horario=horario, status__in=['aguardando', 'notificado']
            ).count()
            return Response({
                'posicao':       entrada_existente.posicao,
                'total_na_fila': total,
                'status':        entrada_existente.status,
                'ja_inscrito':   True,
            })

        # Cancela qualquer posição ativa do usuário em outro slot deste mesmo evento.
        # Garante que o usuário esteja em apenas uma fila por vez.
        ListaEspera.objects.filter(
            usuario=request.user,
            horario__evento=horario.evento,
            status__in=['aguardando', 'notificado'],
        ).exclude(horario=horario).update(status='expirado')

        proxima_posicao = ListaEspera.objects.filter(horario=horario).count() + 1
        entrada = ListaEspera.objects.create(
            horario=horario,
            usuario=request.user,
            posicao=proxima_posicao,
        )

        total = ListaEspera.objects.filter(
            horario=horario, status__in=['aguardando', 'notificado']
        ).count()

        return Response({
            'posicao':       entrada.posicao,
            'total_na_fila': total,
            'status':        entrada.status,
            'ja_inscrito':   False,
        }, status=status.HTTP_201_CREATED)


class MinhaListaEsperaView(APIView):
    """
    GET /api/colaborador/lista-espera/?evento_id=<id>
    Retorna as entradas ativas do usuário na lista de espera, filtradas por evento.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        parameters=[OpenApiParameter(name='evento_id', type=int, required=False)],
        responses={200: MinhaListaEsperaSerializer(many=True)},
        summary='Lista minhas entradas ativas na lista de espera',
    )
    def get(self, request):
        evento_id = request.query_params.get('evento_id')
        qs = ListaEspera.objects.filter(
            usuario=request.user,
            status__in=['aguardando', 'notificado'],
        ).select_related('horario')

        if evento_id:
            qs = qs.filter(horario__evento_id=evento_id)

        resultado = []
        for entrada in qs:
            total = ListaEspera.objects.filter(
                horario=entrada.horario,
                status__in=['aguardando', 'notificado'],
            ).count()
            resultado.append({
                'horario_id':    entrada.horario_id,
                'posicao':       entrada.posicao,
                'total_na_fila': total,
                'status':        entrada.status,
                'expira_em':     entrada.expira_em,
            })

        return Response(resultado)
