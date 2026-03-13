# Sis Bem-Estar - Sistema de Agendamento de Eventos Bem-Estar

Uma plataforma para gerenciar e agendar eventos de bem-estar como massagem, yoga, meditação, nutrição, pilates e acupuntura. Administradores criam eventos e enviam convites aos colaboradores, que confirmam a participação via link seguro.

---

## Primeiros Passos (novo desenvolvedor)

Cada desenvolvedor roda o projeto localmente com seu próprio banco de dados. Siga os passos abaixo **uma única vez** após clonar o repositório.

### 1. Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando

### 2. Clone o repositório

```bash
git clone <url-do-repositorio>
cd sis-bem-estar
```

### 3. Crie o arquivo `.env` na raiz do projeto

Crie o arquivo `.env` copiando o exemplo abaixo:

```env
SECRET_KEY=django-insecure-chave-local-dev
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=sis_bem_estar
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432

FRONTEND_URL=http://localhost:3000

USE_EMAIL=False
DEFAULT_FROM_EMAIL=noreply@aeb.gov.br
```

### 4. Suba os containers

```bash
docker compose up -d
```

> O comando `docker compose up` executa automaticamente:
> - `python manage.py migrate` — aplica as migrações no banco
> - `python manage.py criar_admin` — cria os usuários padrão abaixo

### 5. Usuários criados automaticamente

| Perfil | E-mail | Senha | Acesso |
|---|---|---|---|
| Admin de Eventos | `admin@aeb.gov.br` | `adminaeb` | Cria e gerencia eventos |
| SuperAdmin (CTI) | `superadmin@aeb.gov.br` | `aeb@123` | Gerencia admins + tudo acima |

### 6. Acesse o sistema

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8001/api/ |

---

### Comandos úteis do dia a dia

```bash
# Subir os containers
docker compose up -d

# Parar os containers
docker compose down

# Ver logs do backend
docker compose logs -f backend

# Ver logs do frontend
docker compose logs -f frontend

# Acessar o shell Django
docker compose exec backend python manage.py shell

# Criar novas migrações após alterar models
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```

### Redefinir senha de um usuário (se necessário)

```bash
docker compose exec backend python manage.py shell -c "from backend.models.models import Usuario; u = Usuario.objects.get(email='email@aeb.gov.br'); u.set_password('nova-senha'); u.save(); print('OK')"
```

### Adicionar um novo Admin de Eventos

1. Faça login como **SuperAdmin** (`superadmin@aeb.gov.br`)
2. Acesse **Gestão de Usuários** no menu lateral
3. Busque o colaborador pelo nome ou e-mail
4. Clique em **Promover a Admin**
5. O usuário é criado com senha padrão `aeb@2026` e já pode logar

---

Fluxo de rotas:

Rota	Página
/	Login do colaborador (e-mail simples)
/admin/login	Login do admin (e-mail + senha)
/acesso/:token	Acesso via link de convite
Redirecionamentos:

Colaborador não autenticado tentando /colaborador/* → vai para /
Admin não autenticado tentando /admin/* → vai para /admin/login
Logout do admin → vai para /admin/login

## 📋 Índice

- [Características Principais](#características-principais)
- [Stack Tecnológico](#stack-tecnológico)
- [Arquitetura do Projeto](#arquitetura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Executando o Projeto](#executando-o-projeto)
- [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
- [API REST](#api-rest)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Fluxo de Uso](#fluxo-de-uso)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## ✨ Características Principais

### Para Administradores
- ✅ Dashboard administrativo
- ✅ Criar e gerenciar eventos de bem-estar
- ✅ Convidar colaboradores via email com token de acesso
- ✅ Visualizar confirmações de participantes
- ✅ Gerenciar informações de profissionais
- ✅ Controlar status dos eventos (rascunho, publicado, encerrado)

### Para Colaboradores
- ✅ Visualizar eventos disponíveis
- ✅ Acessar via link de token seguro
- ✅ Confirmar ou recusar participação em eventos
- ✅ Vizualizar detalhes completos dos eventos
- ✅ Gerenciar seus agendamentos

### Segurança
- ✅ Autenticação JWT (JSON Web Token)
- ✅ Token de acesso por email para colaboradores
- ✅ CORS habilitado para comunicação segura
- ✅ Validação de dados completa
- ✅ Permissões baseadas em roles (Admin/Colaborador)

---

## 🔧 Stack Tecnológico

### Backend
- **Django 4.2+** - Framework Python de alto nível
- **Django REST Framework** - APIs REST robustas
- **Django Simple JWT** - Autenticação via JSON Web Token
- **Django CORS Headers** - Controle de origem cruzada
- **PostgreSQL** - Banco de dados relacional robusto
- **Python Decouple** - Gerenciamento de variáveis de ambiente

### Frontend
- **React 19.2** - Biblioteca JavaScript para UI
- **TypeScript 5.9** - Tipagem estática
- **Vite 6.1** - Build tool rápido e moderno
- **React Router 7.2** - Roteamento SPA
- **Tailwind CSS 4.1** - Estilização utilitária
- **Lucide React** - Ícones modernos

### Infraestrutura
- **Docker** - Containerização
- **Docker Compose** - Orquestração de containers
- **PostgreSQL 16 Alpine** - Banco de dados containerizado

---

## 🏗️ Arquitetura do Projeto

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React + Vite)               │
│        ┌──────────────────────────────────────┐         │
│        │  Login │ Dashboard │ Eventos │ etc   │         │
│        └────────────────┬─────────────────────┘         │
└────────────────────────┼────────────────────────────────┘
                         │ API REST + JWT
┌────────────────────────▼────────────────────────────────┐
│              Backend (Django REST API)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Views │ Serializers │ Models │ Authentication   │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ SQL
┌────────────────────────▼────────────────────────────────┐
│           PostgreSQL Database (Docker)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Usuários │ Eventos │ Confirmações │ Tokens      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Pré-requisitos

- **Docker** 20.10+ e **Docker Compose** 2.0+
  - OU
- **Python** 3.11+ (desenvolvimento local)
- **Node.js** 18+ e **npm** 9+ (desenvolvimento local)
- **PostgreSQL** 16+ (se executar sem Docker)

Para verificar versões instaladas:
```bash
docker --version
docker-compose --version
python --version
node --version
npm --version
```

---

## 🚀 Instalação

### Opção 1: Com Docker (Recomendado)

1. **Clone o repositório:**
```bash
git clone <repository-url>
cd sis-bem-estar
```

2. **Crie o arquivo `.env` na raiz do projeto:**
```bash
# Backend
SECRET_KEY=sua-chave-secreta-super-segura
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com

# Banco de Dados
DB_NAME=sis_bem_estar
DB_USER=postgres
DB_PASSWORD=sua_senha_postgres
DB_HOST=db
DB_PORT=5432

# JWT
JWT_SECRET=sua-chave-jwt-secreta

# Email (opcional, para envio de convites)
EMAIL_HOST=smtp.seudominio.com
EMAIL_PORT=587
EMAIL_HOST_USER=seu_email@dominio.com
EMAIL_HOST_PASSWORD=sua_senha_email
```

3. **Inicie os containers:**
```bash
docker-compose up -d
```

4. **Verifique se tudo está funcionando:**
```bash
# Backend
curl http://localhost:8001/admin/

# Frontend
http://localhost:5173
```

### Opção 2: Instalação Local

#### Backend
```bash
# Navegue para a pasta do projeto
cd backend

# Crie um ambiente virtual
python -m venv venv

# Ative o ambiente virtual
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Instale as dependências
pip install -r requirements.txt

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Execute as migrações
python manage.py migrate

# Crie um superusuário
python manage.py crear_admin

# Inicie o servidor
python manage.py runserver
```

#### Frontend
```bash
# Navegue para a pasta do projeto
cd frontend

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev

# Para build de produção
npm run build
```

---

## ⚙️ Configuração do Ambiente

### Variáveis Essenciais (.env)

```env
# Django
SECRET_KEY=django-insecure-mudeme-em-producao
DEBUG=True  # False em produção
ALLOWED_HOSTS=localhost,127.0.0.1

# PostgreSQL
DB_NAME=sis_bem_estar
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Email (opcional)
USE_EMAIL=False
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=seu_email@gmail.com
EMAIL_HOST_PASSWORD=sua_senha_app
DEFAULT_FROM_EMAIL=noreply@bemestarsys.com
```

---

## 🏃 Executando o Projeto

### Com Docker (Recomendado)

```bash
# Subir os containers
docker-compose up

# Para executar em background
docker-compose up -d

# Ver logs
docker-compose logs -f backend    # Logs do backend
docker-compose logs -f frontend   # Logs do frontend

# Parar os containers
docker-compose down

# Remover volumes (limpar dados)
docker-compose down -v
```

### Executar Migrações e Criar Admin

```bash
# Com Docker
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py criar_admin

# Localmente
python manage.py migrate
python manage.py criar_admin
```

### URLs Locais

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8001/api/
- **Admin Django**: http://localhost:8001/admin/
- **PostgreSQL**: localhost:5432

---

## 📊 Estrutura do Banco de Dados

### Modelo de Usuário (Usuario)

```python
- email (EmailField, unique)
- nome (CharField)
- matricula (CharField, opcional)
- departamento (CharField, opcional)
- is_admin (Boolean)
- is_active (Boolean)
- is_staff (Boolean)
- is_superuser (Boolean)
- criado_em (DateTimeField)
```

**Tipos de usuário:**
- **Admin**: Cria eventos e gerencia a plataforma
- **Colaborador**: Recebe convites e confirma participação
- **Superuser**: Acesso total ao Django Admin

### Modelo de Evento (Evento)

```python
- titulo (CharField)
- tipo (CharField) # Opções: massagem, yoga, meditação, nutrição, pilates, acupuntura, outro
- descricao (TextField)
- nome_profissional (CharField)
- data (DateField)
- hora_inicio (TimeField)
- hora_fim (TimeField)
- local (CharField)
- vagas_disponiveis (IntegerField)
- status (CharField) # Opções: rascunho, publicado, encerrado
- criado_em (DateTimeField)
- criado_por (ForeignKey to Usuario)
```

**Tipos de eventos:**
- 💆 Massagem
- 🧘 Yoga
- 🕉️ Meditação
- 🥗 Nutrição
- 🤸 Pilates
- 🪡 Acupuntura
- 🌟 Outro

### Modelo de Confirmação/Agendamento

```python
- usuario (ForeignKey to Usuario)
- evento (ForeignKey to Evento)
- confirmado (Boolean)
- data_confirmacao (DateTimeField)
- presenca (CharField) # Confirma/Recusa
```

### Modelo de Token de Acesso

```python
- usuario (ForeignKey to Usuario)
- token (CharField, unique)
- evento (ForeignKey to Evento, opcional)
- ativo (Boolean)
- data_expiracao (DateTimeField)
- criado_em (DateTimeField)
```

---

## 🔌 API REST

### Autenticação

#### Login
```
POST /api/token/
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "senha"
}

Response:
{
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Acesso via Token (Email Link)
```
GET /api/auth/acesso/{token}/
```

**Response:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "refresh": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": 1,
    "email": "usuario@empresa.com.br",
    "nome": "João Silva",
    "is_admin": false,
    "matricula": "12345",
    "departamento": "TI"
  },
  "evento_id": 5
}
```

**Uso:**
- Link de email: `https://seu-dominio.com/acesso/ABC123XYZ789`
- Recupera dados do evento associado ao token
- Faz login automático do usuário
- Válido por 24 horas (configurável)

### Eventos

#### Listar Eventos
```
GET /api/eventos/
Authorization: Bearer {access_token}

Response:
[
  {
    "id": 1,
    "titulo": "Massagem Relaxante",
    "tipo": "massagem",
    "data": "2024-03-20",
    "hora_inicio": "10:00",
    "hora_fim": "11:00",
    "nome_profissional": "João Silva",
    "vagas_disponiveis": 5,
    "status": "publicado"
  }
]
```

#### Criar Evento (Admin)
```
POST /api/eventos/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "titulo": "Aula de Yoga",
  "tipo": "yoga",
  "descricao": "Aula de yoga para iniciantes",
  "nome_profissional": "Maria Santos",
  "data": "2024-03-25",
  "hora_inicio": "14:00",
  "hora_fim": "15:00",
  "local": "Sala de Yoga - Bloco A",
  "vagas_disponiveis": 20
}
```

#### Confirmar Participação
```
POST /api/confirmacoes/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "evento_id": 1,
  "confirmado": true
}

Response (sucesso):
{
  "id": 10,
  "usuario_id": 2,
  "evento_id": 1,
  "confirmado": true,
  "data_confirmacao": "2024-03-20T10:30:00Z"
}
```

**Parâmetros:**
- `evento_id` (integer): ID do evento
- `confirmado` (boolean): true para confirmar, false para recusar

#### Cancelar Participação
```
POST /api/confirmacoes/{id}/cancelar/
Authorization: Bearer {access_token}

Response:
{
  "mensagem": "Participação cancelada com sucesso"
}
```

### Usuários

#### Listar Usuários (Admin)
```
GET /api/usuarios/
Authorization: Bearer {access_token}
```

#### Perfil Do Usuário
```
GET /api/usuarios/me/
Authorization: Bearer {access_token}
```

#### Atualizar Perfil
```
PATCH /api/usuarios/me/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "nome": "Novo Nome",
  "departamento": "TI"
}
```

---

## 📁 Estrutura de Pastas

```
sis-bem-estar/
├── backend/                          # 🐍 Django REST API
│   ├── core/
│   │   ├── settings.py              # Configurações Django
│   │   ├── urls.py                  # Rotas principais
│   │   └── wsgi.py                  # WSGI interface
│   ├── models/
│   │   ├── models.py                # Modelos do banco de dados
│   │   └── admin.py                 # Configuração Django Admin
│   ├── serializers/
│   │   └── serializers.py           # Serializadores DRF
│   ├── views/
│   │   └── views.py                 # Viewsets e views da API
│   ├── urls/
│   │   └── urls.py                  # Rotas da API
│   ├── migrations/                  # Migrações do banco de dados
│   ├── management/
│   │   └── commands/
│   │       └── criar_admin.py       # Comando para criar admin
│   ├── tests/
│   │   └── tests.py                 # Testes unitários
│   ├── requirements.txt              # Dependências Python
│   └── __init__.py
│
├── frontend/                         # ⚛️ React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProtectedRoute.tsx    # Rota protegida com autenticação
│   │   │   └── ...componentes
│   │   ├── pages/
│   │   │   ├── Login.tsx             # 🔐 Página de login (admin)
│   │   │   ├── AcessoViaToken.tsx    # ⭐ PÁGINA DE CONFIRMAÇÃO VIA EMAIL
│   │   │   │                         #   - Validação de token
│   │   │   │                         #   - Exibição de evento
│   │   │   │                         #   - Confirmação de participação
│   │   │   │                         #   - Design similar ao mock fornecido
│   │   │   ├── admin/
│   │   │   │   ├── Dashboard.tsx     # Dashboard admin
│   │   │   │   └── NovoEvento.tsx    # Criar evento e disparar emails
│   │   │   └── colaborador/
│   │   │       ├── Eventos.tsx       # Lista de eventos disponíveis
│   │   │       ├── EventDetails.tsx  # 📋 Detalhes do evento + botão confirmar
│   │   │       └── Confirmacao.tsx   # ✓ Página de sucesso após confirmação
│   │   ├── layouts/
│   │   │   ├── AdminLayout.tsx       # Layout admin
│   │   │   └── ColaboradorLayout.tsx # Layout colaborador
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx       # Contexto de autenticação
│   │   ├── services/
│   │   │   └── api.ts                # Cliente HTTP
│   │   │       ├── authApi.acessoViaToken()   # Validar token de email
│   │   │       ├── colaboradorApi.reservar() # Confirmar participação
│   │   │       └── ...endpoints
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── database/
│   └── manage.py
│
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── manage.py
└── README.md
```

## 🎯 Páginas Frontend Principais

### Páginas do Colaborador

#### 1. **AcessoViaToken.tsx** (NOVA - Página de Confirmação por Email)
**Rota:** `/acesso/{token}`

**Fluxo:**
1. Usuário clica no link do email: `https://seu-dominio.com/acesso/ABC123...`
2. Página valida o token automaticamente via API
3. **Se válido:** Exibe:
   ```
   ┌─────────────────────────────────────┐
   │  Logo: ⭐ Agenda Bem-Estar          │
   ├──────────[Imagem/Ícone]─────────────┤
   │  Título do Evento (ex: Massagem)    │
   │  Descrição do evento                │
   ├──────────────────────────────────────┤
   │  📅 Data: 25 de Março, 2026         │
   │  🕐 Horário: 14:00 - 15:00          │
   │  👤 Profissional: João Silva        │
   │  📍 Local: Sala de Massagem         │
   ├──────────────────────────────────────┤
   │  E-mail corporativo: usuario@... ✓  │
   ├──────────────────────────────────────┤
   │  [Confirmar Participação] (botão)    │
   ├──────────────────────────────────────┤
   │  🔒 SISTEMA INTERNO SEGURO           │
   └─────────────────────────────────────┘
   ```

4. **Ao clicar "Confirmar":**
   - Faz login automático (sem pedir senha)
   - Registra confirmação no banco
   - Redireciona para página de sucesso

5. **Se inválido/expirado:**
   - Mostra erro: "Link inválido ou expirado"
   - Oferece opção de voltar ao login

**Componentes:**
- Carregamento: Loading spinner
- Validação: Tratamento de erros
- Animações: Botão com feedback
- Design: Responsivo, mobile-first

#### 2. **EventDetails.tsx** (Detalhes do Evento)
**Rota:** `/colaborador/eventos/{id}`

Exibe detalhes completos do evento com opção de confirmar participação pela plataforma.

#### 3. **Confirmacao.tsx** (Página de Sucesso)
**Rota:** `/colaborador/confirmacao`

**Estados possíveis:**
- ✅ **Sucesso:** Confirmação recebida com detalhes
- ❌ **Cancelado:** Participação recusada
- ⚠️ **Erro:** Problema ao confirmar

**Exibe:**
```
┌──────────────────────────────────────┐
│  ✓ Confirmação Recebida!            │
├──────────────────────────────────────┤
│  📅 Data: 25 de Março, 2026         │
│  🕐 Horário: 14:00 - 15:00          │
│  👤 Profissional: João Silva        │
│  📍 Local: Sala de Massagem         │
├──────────────────────────────────────┤
│  ✓ Email de confirmação enviado     │
├──────────────────────────────────────┤
│  [Ver Meus Agendamentos]            │
│  [Explorar Outros Eventos]          │
└──────────────────────────────────────┘
```

---

## 🌐 Fluxo de URL e Roteamento

```
Email com convite
    ↓
https://seu-dominio.com/acesso/{token}
    ↓
Router → /acesso/:token
    ↓
Component: AcessoViaToken.tsx
    ├─ useParams() → extrai token
    ├─ API: authApi.acessoViaToken(token)
    └─ Carrega evento e exibe interface
    ↓
Usuário clica "Confirmar"
    ↓
API: confirmacoes (POST)
    ↓
Sucesso!
    ↓
navigate('/colaborador/confirmacao', { state: {...} })
    ↓
Component: Confirmacao.tsx
    └─ Exibe página de sucesso
```

---

## 🔄 Fluxo de Uso

### Fluxo Admin

```
1. Admin faz login com credenciais
   ↓
2. Acessa dashboard administrativo
   ↓
3. Cria novo evento de bem-estar
   ↓
4. Define detalhes: tipo, data, hora, profissional, vagas
   ↓
5. Envia convites aos colaboradores via email com token
   ↓
6. Visualiza confirmações de participantes
   ↓
7. Gerencia status do evento (rascunho → publicado → encerrado)
```

### Fluxo Colaborador

```
1. Colaborador recebe email com link de convite
   └─ Exemplo: https://seu-dominio.com/acesso/{token-unico}
   ↓
2. Clica no link e é redirecionado para página de confirmação
   ↓
3. Página AcessoViaToken.tsx exibe:
   ├─ Ícone do tipo de evento (💆 Massagem, 🧘 Yoga, etc)
   ├─ Título e descrição do evento
   ├─ Data, horário, profissional e local
   ├─ Email corporativo (pré-preenchido)
   └─ Botão "Confirmar Participação"
   ↓
4. Usuário clica em "Confirmar Participação"
   ├─ Validação do token
   ├─ Login automático via JWT
   └─ Confirmação registrada no banco de dados
   ↓
5. Redirecionado para Confirmacao.tsx (página de sucesso)
   ├─ Exibe ✓ Confirmação Recebida!
   ├─ Mostra detalhes completos do evento
   ├─ Informa que email foi enviado
   └─ Oferece opções:
       ├─ Ver Meus Agendamentos
       └─ Explorar Outros Eventos
   ↓
6. (Opcional) Pode acessar EventDetails.tsx para ver mais detalhes
```

### Fluxo Completo do Email

```
ADMIN CRIA EVENTO
    ↓
ADMIN PUBLICA E ENVIA EMAILS
    ├─ Email enviado com:
    │  ├─ Assunto: "Convite: [Título do Evento]"
    │  ├─ Link: /acesso/{token-unico}
    │  ├─ Detalhes do evento
    │  └─ Instruções
    ↓
COLABORADOR RECEBE EMAIL
    ↓
COLABORADOR CLICA NO LINK
    ├─ URL: /acesso/{token}
    ├─ Router redireciona para AcessoViaToken.tsx
    └─ Token é extraído da URL
    ↓
COMPONENTE AcessoViaToken.tsx
    ├─ Valida o token via API
    ├─ Carrega dados do evento
    ├─ Exibe página de confirmação visual
    └─ Aguarda clique no botão
    ↓
USUÁRIO CLICA "CONFIRMAR"
    ├─ Faz login automaticamente via token
    ├─ Confirma participação no API
    └─ Registra no banco de dados
    ↓
SUCESSO!
    ├─ Redireciona para Confirmacao.tsx
    ├─ Exibe mensagem de sucesso
    └─ Oferece próximos passos
```

### Autenticação

```
┌─────────────────────────────────────┐
│ Usuário digita email e senha        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Django valida credenciais           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Gera JWT tokens (access + refresh)  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Frontend armazena tokens no storage │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Requisições incluem token no header │
│ Authorization: Bearer {token}       │
└─────────────────────────────────────┘
```

---

## 🧪 Testes

### Backend (Django)

```bash
# Rodar todos os testes
python manage.py test

# Rodar testa de um app específico
python manage.py test backend.tests

# Com cobertura
coverage run --source='.' manage.py test
coverage report
coverage html
```

### Frontend (React)

```bash
# Será adicionado (Jest/Vitest)
npm run test
npm run test:watch
npm run test:coverage
```

---

## 🔐 Segurança

### Boas Práticas Implementadas

1. **JWT Authentication**: Tokens com expiração configurable
2. **CORS Configuration**: Apenas domínios autorizados
3. **HTTPS Ready**: Seguro para produção
4. **Environment Variables**: Credenciais não commitadas
5. **Password Hashing**: Django's default (PBKDF2)
6. **SQL Injection Protection**: ORM Django
7. **CSRF Protection**: Ativo por padrão

### Antes de Ir Para Produção

- [ ] Alterar `SECRET_KEY` no `.env`
- [ ] Setar `DEBUG=False`
- [ ] Configurar `ALLOWED_HOSTS` com domínios reais
- [ ] Usar HTTPS/SSL
- [ ] Configurar email SMTP real
- [ ] Executar `collectstatic`
- [ ] Usar database backup
- [ ] Implementar rate limiting
- [ ] Adicionar logging
- [ ] Configurar CORS corretamente

---

## 📝 Logs e Debugging

### Ver Logs dos Containers

```bash
# Todos os serviços
docker-compose logs

# Apenas backend
docker-compose logs backend

# Apenas frontend
docker-compose logs frontend

# Apenas banco de dados
docker-compose logs db

# Acompanhar em tempo real
docker-compose logs -f backend
```

### Acessar Shell Django

```bash
docker-compose exec backend python manage.py shell

# Exemplos de comandos:
from backend.models import Usuario, Evento
usuarios = Usuario.objects.all()
eventos = Evento.objects.filter(status='publicado')
```

### Acessar banco de dados PostgreSQL

```bash
docker-compose exec db psql -U postgres -d sis_bem_estar

# Comandos úteis:
\dt                    # Listar tabelas
\d evento              # Descrever tabela
SELECT * FROM backend_evento;
```

---

## 🚢 Deploy

### Deploy com Docker

1. **Configure produção:**
   ```bash
   # Atualize .env para produção
   DEBUG=False
   ALLOWED_HOSTS=seu-dominio.com,www.seu-dominio.com
   ```

2. **Build das imagens:**
   ```bash
   docker-compose -f docker-compose.yml build
   ```

3. **Push para registry (Docker Hub, AWS ECR, etc):**
   ```bash
   docker tag sis-bem-estar-backend seu-registry/sis-bem-estar-backend:latest
   docker push seu-registry/sis-bem-estar-backend:latest
   ```

4. **Deploy em servidor:**
   ```bash
   ssh seu-servidor
   cd /app/sis-bem-estar
   docker-compose pull
   docker-compose up -d
   ```

### Variáveis de Produção

```env
# Django
SECRET_KEY=sua-chave-super-segura-de-producao
DEBUG=False
ALLOWED_HOSTS=seu-dominio.com,www.seu-dominio.com

# Database
DB_HOST=seu-rds-endpoint
DB_USER=admin_user
DB_PASSWORD=senha-super-segura
DB_NAME=sis_bem_estar

# Email
EMAIL_HOST=smtp.seudominio.com
EMAIL_PORT=587
EMAIL_HOST_USER=noreply@seudominio.com
EMAIL_HOST_PASSWORD=senha-app

# JWT
JWT_SECRET=sua-chave-jwt-super-segura

# CORS
CORS_ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
```

---

## 📞 Troubleshooting

### Erro de Conexão com Banco de Dados

```bash
# Verificar se container do DB está rodando
docker-compose ps

# Reiniciar o banco de dados
docker-compose restart db

# Verificar logs
docker-compose logs db
```

### Erro de CORS

```python
# Adicione o domínio em settings.py ou .env
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://seu-dominio.com"
]
```

### Erro de Permissão no Docker

```bash
# Dar permissões ao usuário
sudo usermod -aG docker $USER

# Recarregar grupo
newgrp docker
```

### Limpar Cache e Rebuild

```bash
# Remover containers, volumes e images
docker-compose down -v

# Rebuild everything
docker-compose up -d --build --force-recreate
```

---

## 📚 Documentação Adicional

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)

---

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

**Padrões de Código:**
- Backend: PEP 8
- Frontend: ESLint config
- Commits: Conventional Commits
- Branches: feature/, bugfix/, hotfix/

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE). Veja o arquivo LICENSE para mais detalhes.

---

## 👥 Autores

- **Desenvolvido por**: AEB - Área de Bem-Estar e Saúde

---

## 📧 Suporte

Para dúvidas, problemas ou sugestões:
- 📧 Email: suporte@bemestarsystem.com.br
- 🐙 Issues: [Abra uma issue no GitHub](https://github.com/aeb/sis-bem-estar/issues)
- 💬 Discussões: [Participe das discussões](https://github.com/aeb/sis-bem-estar/discussions)

---

## 🎯 Roadmap

- [ ] Integração com Google Calendar
- [ ] Notificações por SMS
- [ ] Dashboard com estatísticas
- [ ] Relatórios de participação
- [ ] Sistema de avaliação de eventos
- [ ] Integração com sistema de RH
- [ ] App mobile (React Native)
- [ ] Suporte multi-idioma
- [ ] Integração com Slack

---

**Última atualização**: Março 2024
**Versão**: 0.1.0
