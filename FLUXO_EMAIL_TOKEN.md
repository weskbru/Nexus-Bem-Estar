# 📧 Fluxo de Confirmação via Email com Token

## Visão Geral

Este documento descreve o fluxo completo de envio de convites por email com tokens únicos e a confirmação de participação.

---

## 🔄 Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                      ADMIN - Backend                         │
├─────────────────────────────────────────────────────────────┤
│ 1. Cria novo evento                                          │
│ 2. Define: tipo, data, horários, profissional, etc         │
│ 3. Clica em "Publicar e Enviar Emails"                      │
└─────────────────────────────────────┬───────────────────────┘
                                      │
                  ┌───────────────────▼────────────────────┐
                  │ Sistema gera TOKENS ÚNICOS para cada   │
                  │ colaborador selecionado                │
                  ├────────────────────────────────────────┤
                  │ Token = {aleatorio + hash + timestamp}  │
                  │ Validade = 24 horas (configurável)     │
                  │ Armazenado no BD com status "ativo"    │
                  └────────────────────┬────────────────────┘
                                       │
                  ┌────────────────────▼────────────────────┐
                  │ Email HTML é gerado e enviado com:      │
                  │ - Assunto: "Convite: [Nome Evento]"    │
                  │ - Link: https://dominio.com/acesso/... │
                  │ - Detalhes do evento                    │
                  │ - CTA: "Confirmar Participação"        │
                  └────────────────────┬────────────────────┘
                                       │
┌──────────────────────────────────────▼───────────────────────┐
│                    COLABORADOR - Email                       │
├────────────────────────────────────────────────────────────┤
│ Recebe email com link customizado:                          │
│ https://seu-dominio.com/acesso/TOKEN123ABC456XYZ789       │
│                                                             │
│ [Confirmar Participação] ← Link clicável                  │
└────────────────────────┬──────────────────────────────────┘
                         │ Clica no link
         ┌───────────────▼────────────────┐
         │  Browser redireciona para:      │
         │  /acesso/{token}                │
         │                                 │
         │  Router do React:               │
         │  AcessoViaToken.tsx carregado  │
         └────────────────┬────────────────┘
                          │
        ┌─────────────────▼──────────────────┐
        │ useParams() extrai token da URL    │
        │ useEffect dispara carregamento      │
        └────────────────┬──────────────────┘
                         │
      ┌──────────────────▼────────────────────┐
      │ API CALL:                              │
      │ GET /api/eventos/acesso-token/       │
      │     ?token={token}                   │
      │                                       │
      │ Response: {                           │
      │   evento: {...},                      │
      │   email: "usuario@empresa.com.br"   │
      │ }                                     │
      └────────────────┬─────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              AcessoViaToken.tsx (Página Visual)             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         ⭐ Agenda Bem-Estar                           │ │
│  │                                                        │ │
│  │   ┌──────────────────────────────────────────────┐  │ │
│  │   │  [Imagem/ícone do evento]                    │  │ │
│  │   │  💆 Massagem Relaxante                       │  │ │
│  │   │                                              │  │ │
│  │   │  Aproveite uma massagem relaxante com um    │  │ │
│  │   │  profissional especia lista.                │  │ │
│  │   │                                              │  │ │
│  │   │  📅 Quarta 20 de Março de 2024             │  │ │
│  │   │  🕐 14:00 às 15:00                          │  │ │
│  │   │  👤 João Silva (Massoterapeuta)            │  │ │
│  │   │  📍 Sala de Massagem - Bloco A             │  │ │
│  │   │                                              │  │ │
│  │   │  E-mail corporativo: usuario@empresa.c... ✓ │ │ │
│  │   │                                              │  │ │
│  │   │    [Confirmar Participação] (botão azul)    │  │ │
│  │   │                                              │  │ │
│  │   │  🔒 SISTEMA INTERNO SEGURO                  │  │ │
│  │   └──────────────────────────────────────────────┘  │ │
│  │                                                        │ │
│  │  © 2026 Agenda Bem-Estar                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │ Usuário clica "Confirmar"
        ┌──────────────▼─────────────────────┐
        │ Estado: confirmando = true           │
        │ Desabilita botão (show loader)       │
        └──────────────┬──────────────────────┘
                       │
       ┌───────────────▼──────────────────────┐
       │ Dual Action:                          │
       │                                       │
       │ 1. API: authApi.acessoViaToken()     │
       │    - Valida token novamente          │
       │    - Cria sessão JWT                 │
       │    - Armazena em localStorage        │
       │                                       │
       │ 2. API: confirmacoes (POST)          │
       │    POST /api/confirmacoes/           │
       │    {                                 │
       │      "evento_id": 5,                │
       │      "confirmado": true             │
       │    }                                 │
       └────────────────┬──────────────────────┘
                        │
        ┌───────────────▼──────────────────┐
        │ BD: Registra confirmação         │
        │ - evento_id                      │
        │ - usuario_id                     │
        │ - confirmado = true              │
        │ - data_confirmacao = now()       │
        │                                  │
        │ Envio automático:                │
        │ Email de confirmação para usuário│
        └────────────┬─────────────────────┘
                     │
    ┌────────────────▼──────────────────┐
    │ Sucesso! Estado: confirmado=true  │
    │                                   │
    │ Exibe:                            │
    │ ✓ Confirmação Recebida!          │
    │ [Loading 2 segundos]              │
    └────────────────┬──────────────────┘
                     │
                     │ navigate("/colaborador/confirmacao", {
                     │   state: { status: "sucesso", evento }
                     │ })
                     │
┌────────────────────▼─────────────────────────────────────────┐
│         Confirmacao.tsx (Página de Sucesso)                  │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                                                          │ │
│  │           ✓ Confirmação Recebida!                      │ │
│  │                                                          │ │
│  │   Sua participação no evento foi confirmada com        │ │
│  │   sucesso.                                              │ │
│  │                                                          │ │
│  │   DETALHES DA CONFIRMAÇÃO                              │ │
│  │   ─────────────────────────────────────────            │ │
│  │   📅 Data: Quarta 20 de Março de 2024                 │ │
│  │   🕐 Horário: 14:00 às 15:00                           │ │
│  │   👤 Profissional: João Silva                          │ │
│  │   📍 Local: Sala de Massagem                           │ │
│  │                                                          │ │
│  │   ✓ Enviamos um e-mail de confirmação para seu        │ │
│  │     endereço corporativo.                              │ │
│  │                                                          │ │
│  │   [Ver Meus Agendamentos] [Explorar Outros Eventos]   │ │
│  │                                                          │ │
│  │   📌 Importante: Chegue com 10 minutos de            │ │
│  │   antecedência.                                        │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                     │
          ┌──────────▼─────────────┐
          │ Próximas ações:         │
          │ - Ver agendamentos     │
          │ - Explorar eventos     │
          │ - Sair                 │
          └────────────────────────┘

```

---

## 📊 Tabelas do Banco de Dados

### TokenAcesso (Nova)
```sql
CREATE TABLE tokenacesso (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuario(id),
    evento_id INTEGER REFERENCES evento(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    ativo BOOLEAN DEFAULT true,
    data_expiracao TIMESTAMP NOT NULL,
    criado_em TIMESTAMP DEFAULT now(),
    usado_em TIMESTAMP NULL
);

CREATE INDEX idx_token ON tokenacesso(token);
CREATE INDEX idx_usuario_evento ON tokenacesso(usuario_id, evento_id);
```

### ConfirmacaoEvento (Existente - Atualizado)
```sql
CREATE TABLE confirmacaoevento (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuario(id),
    evento_id INTEGER REFERENCES evento(id),
    confirmado BOOLEAN DEFAULT false,
    data_confirmacao TIMESTAMP,
    presenca VARCHAR(50), -- 'confirmado', 'recusado'
    criado_em TIMESTAMP DEFAULT now(),
    
    UNIQUE(usuario_id, evento_id)
);
```

---

## 🔐 Segurança do Token

### Geração
```python
import secrets
import hashlib
from datetime import timedelta, datetime

class TokenAcesso:
    @staticmethod
    def gerar_token():
        # Token aleatório de 32 bytes
        token_random = secrets.token_urlsafe(32)
        
        # Hash para validação
        token_hash = hashlib.sha256(token_random.encode()).hexdigest()
        
        return token_random, token_hash
    
    @staticmethod
    def criar_para_usuario(usuario, evento):
        token_random, token_hash = TokenAcesso.gerar_token()
        data_expiracao = datetime.now() + timedelta(hours=24)
        
        # Salvar no BD
        token = TokenAcesso.objects.create(
            usuario=usuario,
            evento=evento,
            token=token_hash,
            data_expiracao=data_expiracao
        )
        
        # Retornar token original (não o hash)
        return token_random
```

### Validação
```python
@api_view(['GET'])
def acesso_via_token(request, token):
    # 1. Hash o token recebido
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # 2. Busque no BD
    try:
        token_obj = TokenAcesso.objects.get(token=token_hash)
    except TokenAcesso.DoesNotExist:
        return Response({'erro': 'Token inválido'}, 400)
    
    # 3. Valide se está ativo e não expirou
    if not token_obj.ativo or token_obj.data_expiracao < now():
        return Response({'erro': 'Token expirado'}, 400)
    
    # 4. Retorne dados
    return Response({
        'evento': EventoSerializer(token_obj.evento).data,
        'email': token_obj.usuario.email
    })
```

### Características
- ✅ Tokens únicos por usuário/evento
- ✅ Válidos por 24 horas (configurável)
- ✅ One-time use (opcional)
- ✅ Hash seguro (SHA-256)
- ✅ Não reutilizável
- ✅ Auditável (data_expiracao, usado_em)

---

## 📧 Template de Email

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #0066cc, #0052a3); 
                  color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: white; }
        .evento-info { background: #f5f5f5; padding: 15px; 
                       border-left: 4px solid #0066cc; margin: 15px 0; }
        .botao { display: inline-block; background: #0066cc; 
                 color: white; padding: 12px 30px; 
                 text-decoration: none; border-radius: 5px; 
                 margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Agenda Bem-Estar</h1>
            <p>Convite de Participação</p>
        </div>
        
        <div class="content">
            <h2>Oi [NOME],</h2>
            
            <p>Você foi convidado para participar de uma atividade de bem-estar:</p>
            
            <div class="evento-info">
                <h3>[TIPO_EVENTO]</h3>
                <p><strong>Data:</strong> [DATA]</p>
                <p><strong>Horário:</strong> [HORA]</p>
                <p><strong>Profissional:</strong> [PROFISSIONAL]</p>
                <p><strong>Local:</strong> [LOCAL]</p>
                <p>[DESCRICAO]</p>
            </div>
            
            <p>Clique no botão abaixo para confirmar sua participação:</p>
            
            <center>
                <a href="https://seu-dominio.com/acesso/[TOKEN]" 
                   class="botao">
                    Confirmar Participação
                </a>
            </center>
            
            <p>Ou copie o link: https://seu-dominio.com/acesso/[TOKEN]</p>
            
            <hr>
            
            <p style="color: #666; font-size: 12px;">
                Este link é válido por 24 horas.
                Este é um email seguro de um sistema interno.
            </p>
        </div>
    </div>
</body>
</html>
```

---

## 🚀 Implementação - Backend (Django)

### Models
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
    
    def __str__(self):
        return f"Token - {self.usuario.nome} - {self.evento.titulo}"
```

### Serializers
```python
class TokenAcessoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TokenAcesso
        fields = ('id', 'token', 'ativo', 'data_expiracao')
```

### Views
```python
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def acesso_via_token(request, token):
    """Valida token de acesso e retorna dados do evento"""
    import hashlib
    from django.utils import timezone
    
    # Hash do token
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    try:
        # Buscar token
        token_obj = TokenAcesso.objects.get(
            token=token_hash,
            ativo=True
        )
        
        # Verificar expiração
        if token_obj.data_expiracao < timezone.now():
            return Response(
                {'erro': 'Token expirado'}, 
                status=400
            )
        
        # Retornar dados
        evento = token_obj.evento
        return Response({
            'evento': EventoSerializer(evento).data,
            'email': token_obj.usuario.email,
            'usuario_id': token_obj.usuario.id
        })
        
    except TokenAcesso.DoesNotExist:
        return Response(
            {'erro': 'Token inválido'}, 
            status=400
        )
```

---

## 🎨 Implementação - Frontend (React)

### Componente AcessoViaToken.tsx

```typescript
interface EventoData {
  id: number;
  titulo: string;
  tipo: string;
  descricao: string;
  nome_profissional: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  local: string;
  vagas_disponiveis: number;
}

interface AcessoViaTokenState {
  carregando: boolean;
  erro: string;
  evento: EventoData | null;
  email: string;
  confirmando: boolean;
  confirmado: boolean;
}

// Estados:
const [state, setState] = useState<AcessoViaTokenState>({
  carregando: true,
  erro: '',
  evento: null,
  email: '',
  confirmando: false,
  confirmado: false
});

// Fluxos:
// 1. Carregar evento
// 2. Validar token
// 3. Exibir interface
// 4. Aguardar confirmação
// 5. Fazer login + confirmar participação
// 6. Redirecionar para sucesso
```

---

## ✅ Checklist de Implementação

### Backend
- [x] Modelo TokenAcesso criado
- [x] Serializer implementado
- [x] View de validação do token
- [x] Envio de email com token
- [x] Limpeza de tokens expirados (task agendada)
- [ ] Rate limiting no endpoint
- [ ] Auditoria de acessos

### Frontend
- [x] Componente AcessoViaToken.tsx criado
- [x] Página visual com ícones e detalhes
- [x] Validação de token
- [x] Carregamento de dados do evento
- [x] Botão de confirmação com feedback
- [x] Redirecionar para página de sucesso
- [x] Tratamento de erros visual
- [ ] Testes unitários
- [ ] Testes de integração

### Testes
- [ ] Testar com token válido
- [ ] Testar com token inválido
- [ ] Testar com token expirado
- [ ] Testar confirmação duplicada
- [ ] Testar email não enviado
- [ ] Load test com muitos tokens

---

## 📱 Responsividade

A página de AcessoViaToken.tsx é totalmente responsiva:

```
Desktop (1024px+):
- Card centralizado com max-width 600px
- Detalhes em coluna única
- Botões side-by-side quando houver 2+

Tablet (768px):
- Ajuste de padding
- Fonte ligeiramente reduzida
- Detalhes ainda em coluna única

Mobile (< 768px):
- Padding reduzido
- Fonte otimizada (#16+ para evitar zoom)
- Botões full-width em coluna
- Toque-friendly (min 44px de altura)
```

---

## 🔧 Variáveis de Ambiente

```env
# Frontend
VITE_API_URL=http://localhost:8001/api
VITE_TOKEN_EXPIRY_HOURS=24

# Backend
TOKEN_EXPIRY_HOURS=24
TOKEN_LENGTH=32
ENABLE_EMAIL_SENDING=true
EMAIL_FROM=noreply@seudominio.com
```

---

## 📚 Referências

- [JWT no Django REST Framework](https://django-rest-framework-simplejwt.readthedocs.io/)
- [Segurança em Python](https://docs.python.org/3/library/secrets.html)
- [React Router useParams](https://reactrouter.com/en/main/hooks/use-params)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Última atualização:** Março 2024
**Status:** ✅ Implementado
