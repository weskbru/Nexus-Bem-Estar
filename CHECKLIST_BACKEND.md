# 🔧 Checklist de Integração Backend

Este documento lista o que precisa ser implementado no backend Django para que o fluxo de email com token funcione completamente.

---

## ✅ Checklist de Implementação

### 1. Modelos (models.py)

- [ ] **TokenAcesso** model criado
```python
class TokenAcesso(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    evento = models.ForeignKey(Evento, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    ativo = models.BooleanField(default=True)
    data_expiracao = models.DateTimeField()
    criado_em = models.DateTimeField(auto_now_add=True)
    usado_em = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('usuario', 'evento')
```

- [ ] **ConfirmacaoEvento** model criado/atualizado
```python
class ConfirmacaoEvento(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    evento = models.ForeignKey(Evento, on_delete=models.CASCADE)
    confirmado = models.BooleanField(default=False)
    data_confirmacao = models.DateTimeField(null=True, blank=True)
    presenca = models.CharField(max_length=50, choices=[
        ('confirmado', 'Confirmado'),
        ('recusado', 'Recusado'),
        ('pendente', 'Pendente')
    ], default='pendente')
    criado_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('usuario', 'evento')
```

### 2. Serializers (serializers.py)

- [ ] **TokenAcessoSerializer** implementado
```python
class TokenAcessoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TokenAcesso
        fields = ('id', 'token', 'ativo', 'data_expiracao', 'criado_em')
        read_only_fields = ('id', 'criado_em')
```

- [ ] **ConfirmacaoEventoSerializer** implementado
```python
class ConfirmacaoEventoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfirmacaoEvento
        fields = ('id', 'usuario', 'evento', 'confirmado', 'presenca', 'data_confirmacao')
```

### 3. Views/ViewSets (views.py)

#### Endpoint: Validar Token de Acesso
- [ ] `GET /api/eventos/acesso-token/?token={token}`

```python
@api_view(['GET'])
def acesso_via_token(request):
    """
    Valida token e retorna evento + email
    GET /api/eventos/acesso-token/?token={token}
    """
    import hashlib
    from django.utils import timezone
    
    token = request.query_params.get('token')
    if not token:
        return Response({'erro': 'Token obrigatório'}, status=400)
    
    # Hash do token recebido
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    try:
        # Buscar token no BD
        token_obj = TokenAcesso.objects.get(
            token=token_hash,
            ativo=True
        )
        
        # Validar expiração
        if token_obj.data_expiracao < timezone.now():
            token_obj.ativo = False
            token_obj.save()
            return Response({'erro': 'Token expirado'}, status=400)
        
        # Retornar dados
        evento = token_obj.evento
        return Response({
            'evento': EventoSerializer(evento).data,
            'email': token_obj.usuario.email,
            'usuario_id': token_obj.usuario.id,
            'evento_id': evento.id
        })
        
    except TokenAcesso.DoesNotExist:
        return Response({'erro': 'Token inválido'}, status=400)
```

#### Endpoint: Login via Token
- [ ] `POST /api/auth/acesso/{token}/`

```python
@api_view(['POST'])
def acesso_via_token_login(request, token):
    """
    Faz login do usuário via token e retorna JWT
    POST /api/auth/acesso/{token}/
    """
    import hashlib
    from django.utils import timezone
    from rest_framework_simplejwt.tokens import RefreshToken
    
    # Hash do token
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    try:
        # Buscar token
        token_obj = TokenAcesso.objects.select_related('usuario').get(
            token=token_hash,
            ativo=True
        )
        
        # Validar expiração
        if token_obj.data_expiracao < timezone.now():
            return Response({'erro': 'Token expirado'}, status=400)
        
        # Gerar JWT
        usuario = token_obj.usuario
        refresh = RefreshToken.for_user(usuario)
        
        # Marcar como usado (opcional)
        token_obj.usado_em = timezone.now()
        token_obj.save()
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'usuario': UsuarioSerializer(usuario).data,
            'evento_id': token_obj.evento.id
        })
        
    except TokenAcesso.DoesNotExist:
        return Response({'erro': 'Token inválido'}, status=400)
```

#### Endpoint: Confirmar Participação
- [ ] `POST /api/confirmacoes/`

```python
class ConfirmacaoEventoViewSet(viewsets.ModelViewSet):
    serializer_class = ConfirmacaoEventoSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """
        POST /api/confirmacoes/
        {
            "evento_id": 1,
            "confirmado": true
        }
        """
        evento_id = request.data.get('evento_id')
        confirmado = request.data.get('confirmado', True)
        
        try:
            evento = Evento.objects.get(id=evento_id)
        except Evento.DoesNotExist:
            return Response({'erro': 'Evento não encontrado'}, status=404)
        
        # Criar ou atualizar confirmação
        confirmacao, created = ConfirmacaoEvento.objects.update_or_create(
            usuario=request.user,
            evento=evento,
            defaults={
                'confirmado': confirmado,
                'presenca': 'confirmado' if confirmado else 'recusado',
                'data_confirmacao': timezone.now() if confirmado else None
            }
        )
        
        # Enviar email de confirmação
        if confirmado:
            enviar_email_confirmacao(request.user, evento)
        
        serializer = self.get_serializer(confirmacao)
        return Response(serializer.data)
```

### 4. URLs (urls.py)

- [ ] Rotas adicionadas em `urls.py`

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'confirmacoes', views.ConfirmacaoEventoViewSet, basename='confirmacao')

urlpatterns = [
    # Autenticação
    path('auth/acesso/<str:token>/', views.acesso_via_token_login, name='auth-acesso'),
    
    # Eventos
    path('eventos/acesso-token/', views.acesso_via_token, name='evento-acesso-token'),
    
    # ViewSets
    path('', include(router.urls)),
]
```

### 5. Geração de Tokens de Email

- [ ] Função de geração de tokens
```python
def gerar_tokens_para_evento(evento, usuarios):
    """
    Gera tokens únicos para cada usuário de um evento
    """
    import secrets
    import hashlib
    from datetime import timedelta
    from django.utils import timezone
    
    tokens = []
    
    for usuario in usuarios:
        # Gerar token aleatório
        token_random = secrets.token_urlsafe(32)
        
        # Hash para armazenar
        token_hash = hashlib.sha256(token_random.encode()).hexdigest()
        
        # Data de expiração
        data_expiracao = timezone.now() + timedelta(hours=24)
        
        # Salvar no BD
        token_obj = TokenAcesso.objects.create(
            usuario=usuario,
            evento=evento,
            token=token_hash,
            data_expiracao=data_expiracao
        )
        
        tokens.append({
            'usuario': usuario,
            'token_original': token_random,  # Enviar por email
            'token_obj': token_obj
        })
    
    return tokens
```

### 6. Envio de Emails

- [ ] Função de envio de email com token
```python
from django.core.mail import send_html_email
from django.template.loader import render_to_string

def enviar_email_convite(usuario, evento, token):
    """
    Envia email de convite com token de acesso
    """
    context = {
        'usuario_nome': usuario.nome,
        'evento_titulo': evento.titulo,
        'evento_descricao': evento.descricao,
        'evento_data': evento.data.strftime('%d/%m/%Y'),
        'evento_hora': evento.hora_inicio.strftime('%H:%M'),
        'evento_profissional': evento.nome_profissional,
        'evento_local': evento.local,
        'link_confirmacao': f"https://seu-dominio.com/acesso/{token}",
        'link_suporte': "https://seu-dominio.com/ajuda"
    }
    
    html_message = render_to_string('email/convite.html', context)
    
    send_html_email(
        subject=f"Convite: {evento.titulo}",
        message=html_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[usuario.email],
        html_message=html_message
    )
    
    return True


def enviar_email_confirmacao(usuario, evento):
    """
    Envia email de confirmação após participação
    """
    context = {
        'usuario_nome': usuario.nome,
        'evento_titulo': evento.titulo,
        'evento_data': evento.data.strftime('%d/%m/%Y'),
        'evento_hora': evento.hora_inicio.strftime('%H:%M'),
        'evento_local': evento.local,
    }
    
    html_message = render_to_string('email/confirmacao.html', context)
    
    send_html_email(
        subject=f"Confirmação: {evento.titulo}",
        message=html_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[usuario.email],
        html_message=html_message
    )
    
    return True
```

### 7. Task Agendada (Celery/APScheduler)

- [ ] Limpeza de tokens expirados
```python
from django.core.management.base import BaseCommand
from django.utils import timezone
from backend.models import TokenAcesso

class Command(BaseCommand):
    help = 'Remove tokens expirados'
    
    def handle(self, *args, **options):
        expirados = TokenAcesso.objects.filter(
            data_expiracao__lt=timezone.now(),
            ativo=True
        )
        
        count, _ = expirados.update(ativo=False)
        
        self.stdout.write(
            self.style.SUCCESS(f'{count} tokens desativados')
        )
```

Adicionar ao cron ou Celery:
```python
# Diariamente
@periodic_task(run_every=crontab(hour=2, minute=0))
def limpar_tokens_expirados():
    from django.utils import timezone
    TokenAcesso.objects.filter(
        data_expiracao__lt=timezone.now()
    ).update(ativo=False)
```

### 8. Migrations

- [ ] Executar migrações
```bash
python manage.py makemigrations
python manage.py migrate
```

### 9. Testes

- [ ] Testes de unidade
```python
# tests.py
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from backend.models import Usuario, Evento, TokenAcesso

class TokenAcessoTestCase(TestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            email='teste@example.com',
            nome='Teste',
            password='senha123'
        )
        self.evento = Evento.objects.create(
            titulo='Evento Teste',
            tipo='massagem',
            data=timezone.now().date(),
            hora_inicio='10:00',
            hora_fim='11:00',
            nome_profissional='Prof'
        )
    
    def test_gerar_token(self):
        token_obj = TokenAcesso.objects.create(
            usuario=self.usuario,
            evento=self.evento,
            token='TEST123',
            data_expiracao=timezone.now() + timedelta(hours=24)
        )
        self.assertTrue(token_obj.ativo)
    
    def test_validar_token(self):
        # GET /api/eventos/acesso-token/?token=TEST123
        response = self.client.get('/api/eventos/acesso-token/', {'token': 'TEST123'})
        self.assertEqual(response.status_code, 200)
```

- [ ] Testes de integração
```bash
python manage.py test
```

### 10. Admin Django

- [ ] Registrar modelos no admin
```python
# admin.py
from django.contrib import admin
from .models import TokenAcesso, ConfirmacaoEvento

@admin.register(TokenAcesso)
class TokenAcessoAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'evento', 'ativo', 'data_expiracao')
    list_filter = ('ativo', 'criado_em')
    search_fields = ('usuario__email', 'evento__titulo')
    readonly_fields = ('criado_em', 'usado_em')

@admin.register(ConfirmacaoEvento)
class ConfirmacaoEventoAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'evento', 'presenca', 'data_confirmacao')
    list_filter = ('presenca', 'criado_em')
    search_fields = ('usuario__email', 'evento__titulo')
```

### 11. Configurações (settings.py)

- [ ] Adicionar variáveis de ambiente
```python
# Email
EMAIL_BACKEND = config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.console.EmailBackend'
)
EMAIL_HOST = config('EMAIL_HOST', default='smtp.mailtrap.io')
EMAIL_PORT = config('EMAIL_PORT', default=2525, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@example.com')

# Token
TOKEN_EXPIRY_HOURS = config('TOKEN_EXPIRY_HOURS', default=24, cast=int)
TOKEN_LENGTH = config('TOKEN_LENGTH', default=32, cast=int)
```

### 12. Documentação da API

- [ ] Adicionar docstrings
- [ ] Gerar Swagger/OpenAPI (drf-spectacular)
```bash
pip install drf-spectacular
```

---

## 📋 Ordem de Implementação Recomendada

1. ✅ Criar modelos (TokenAcesso, ConfirmacaoEvento)
2. ✅ Gerar migrações
3. ✅ Criar serializers
4. ✅ Implementar views/endpoints
5. ✅ Adicionar rotas
6. ✅ Implementar função de geração de tokens
7. ✅ Implementar envio de emails
8. ✅ Testar endpoints (Postman/curl)
9. ✅ Registrar no admin
10. ✅ Adicionar task de limpeza
11. ✅ Escrever testes
12. ✅ Deploy

---

## 🧪 Testar com cURL

```bash
# 1. Validar token
curl -X GET "http://localhost:8001/api/eventos/acesso-token/?token=ABC123"

# 2. Login via token
curl -X POST "http://localhost:8001/api/auth/acesso/ABC123/"

# 3. Confirmar participação (com JWT)
curl -X POST "http://localhost:8001/api/confirmacoes/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "evento_id": 1,
    "confirmado": true
  }'
```

---

## 📞 Troubleshooting

**Problema:** Token inválido
- **Solução:** Verificar hash e armazenamento no BD

**Problema:** Token expirado
- **Solução:** Validar `data_expiracao` com `timezone.now()`

**Problema:** Email não enviado
- **Solução:** Verificar configurações SMTP em settings.py

**Problema:** Confirmação não registrada
- **Solução:** Verificar autenticação (JWT) do usuário

---

## 📚 Referências

- [Django Signals](https://docs.djangoproject.com/en/4.2/topics/signals/)
- [Django Email](https://docs.djangoproject.com/en/4.2/topics/email/)
- [DRF SimpleJWT](https://django-rest-framework-simplejwt.readthedocs.io/)
- [Django Celery](https://docs.celeryproject.org/en/stable/django/)

---

**Status:** 📋 Checklist Completo  
**Versão:** 1.0  
**Data:** Março 2024
