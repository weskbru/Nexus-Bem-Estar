from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models.models import Agendamento, Horario, ListaEspera


class EntrarListaEsperaView(APIView):
    """
    POST /api/colaborador/horarios/<horario_id>/lista-espera/
    Insere o colaborador autenticado na lista de espera do horário lotado.
    """
    permission_classes = [permissions.IsAuthenticated]

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

        if ListaEspera.objects.filter(horario=horario, usuario=request.user).exists():
            entrada = ListaEspera.objects.get(horario=horario, usuario=request.user)
            total = ListaEspera.objects.filter(
                horario=horario, status__in=['aguardando', 'notificado']
            ).count()
            return Response({
                'posicao':       entrada.posicao,
                'total_na_fila': total,
                'status':        entrada.status,
                'ja_inscrito':   True,
            })

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
