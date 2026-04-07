from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.views.static import serve

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/', include('backend.urls.urls')),
    # Serve arquivos de mídia em dev e produção (independente de DEBUG)
    path('media/<path:path>', serve, {'document_root': settings.MEDIA_ROOT}),
]
