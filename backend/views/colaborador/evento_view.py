from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

from rest_framework import generics, permissions

from ...models.models import Evento
from ...serializers.serializers import EventoDetailSerializer, EventoListSerializer
from ..permissions import encerrar_eventos_expirados


class EventoListView(generics.ListAPIView):
    """
    GET /api/colaborador/eventos/
    Lista eventos publicados disponíveis para agendamento.
    """
    serializer_class = EventoListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        encerrar_eventos_expirados()
        return (
            Evento.objects
            .filter(status='publicado')
            .prefetch_related('horarios__agendamentos')
        )


class EventoDetailView(generics.RetrieveAPIView):
    """
    GET /api/colaborador/eventos/<id>/
    Detalhe do evento com todos os horários e disponibilidade.
    Cache de 3 segundos para reduzir carga durante pico de acesso.
    """
    serializer_class = EventoDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        encerrar_eventos_expirados()
        return (
            Evento.objects
            .filter(status='publicado')
            .prefetch_related('horarios__agendamentos')
        )

    @method_decorator(cache_page(3))
    def get(self, *args, **kwargs):
        return super().get(*args, **kwargs)
