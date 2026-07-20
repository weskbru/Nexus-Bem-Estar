from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ...models.models import Penalidade
from ...serializers.serializers import PenalidadeSerializer
from ..permissions import IsAdminUsuario, encerrar_eventos_expirados, liberar_penalidades_expiradas


class AdminPenalidadeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/admin/penalidades/              — lista todas as penalidades
    GET  /api/admin/penalidades/?ativa=true   — filtra por ativas
    GET  /api/admin/penalidades/?usuario_id=  — filtra por usuário
    POST /api/admin/penalidades/<id>/revogar/ — revoga penalidade manualmente
    """
    queryset = Penalidade.objects.all()
    serializer_class = PenalidadeSerializer
    permission_classes = [IsAdminUsuario]

    def get_queryset(self):
        encerrar_eventos_expirados()
        liberar_penalidades_expiradas()
        qs = Penalidade.objects.select_related(
            'usuario', 'agendamento__horario__evento', 'evento_punicao', 'revogada_por'
        )
        ativa_param = self.request.query_params.get('ativa')
        usuario_id  = self.request.query_params.get('usuario_id')
        if ativa_param is not None:
            qs = qs.filter(ativa=ativa_param.lower() == 'true')
        if usuario_id:
            qs = qs.filter(usuario_id=usuario_id)
        return qs.order_by('-criada_em')

    @action(detail=True, methods=['post'], url_path='revogar')
    def revogar(self, request, pk=None):
        """
        POST /api/admin/penalidades/<id>/revogar/
        Body: { motivo: "..." }
        Revoga manualmente uma penalidade ativa (ex.: falta justificada).
        """
        penalidade = self.get_object()
        if not penalidade.ativa:
            return Response(
                {'erro': 'Esta penalidade já está inativa.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        motivo = request.data.get('motivo', '').strip()
        penalidade.ativa = False
        penalidade.revogada_por = request.user
        penalidade.revogada_em = timezone.now()
        penalidade.motivo_revogacao = motivo
        penalidade.save(update_fields=['ativa', 'revogada_por', 'revogada_em', 'motivo_revogacao'])
        return Response(PenalidadeSerializer(penalidade).data)
