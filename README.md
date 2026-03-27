# 🧘 SIS Bem-Estar — Tutorial de Deploy com Docker

> Sistema de Agendamento de Eventos de Bem-Estar — Agência Espacial Brasileira (AEB)

---

## 📋 Pré-requisitos

- Docker instalado (`docker --version`)
- Docker Compose v2 (`docker compose version`)
- Acesso à rede interna da AEB (para autenticação LDAP)
- Acesso ao GitLab: `https://gitlab.aeb.gov.br/cti/sis-bem-estar`

---

## 📁 Estrutura do Projeto

```
sis-bem-estar/
├── backend/
│   ├── auth_backends.py         # Autenticação LDAP + local
│   ├── core/
│   │   ├── settings.py          # Configurações Django
│   │   ├── urls.py              # Rotas principais
│   │   └── wsgi.py
│   ├── domain/
│   │   ├── exceptions.py        # Exceções de domínio
│   │   └── lista_espera.py      # Regras puras de negócio
│   ├── models/
│   │   └── models.py            # Modelos do banco de dados
│   ├── services/
│   │   ├── email_service.py     # Envio de e-mails
│   │   ├── ldap_service.py      # Integração com Active Directory
│   │   └── lista_espera_service.py
│   ├── views/
│   │   ├── admin/               # Views administrativas
│   │   ├── auth/                # Views de autenticação
│   │   └── colaborador/         # Views do colaborador
│   ├── migrations/
│   ├── management/commands/
│   │   └── criar_admin.py       # Cria usuários padrão no startup
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx        # Login admin (e-mail + senha AD)
│   │   │   ├── LoginColaborador.tsx  # Acesso via e-mail + OTP
│   │   │   └── admin/
│   │   │       └── GestaoUsuarios.tsx  # Busca no AD e promoção de admins
│   │   └── services/
│   │       └── api.ts
│   ├── Dockerfile.frontend.prod
│   └── nginx.conf
├── Dockerfile.backend
├── docker-compose.yml           # Desenvolvimento local
├── docker-compose.prod.yml      # VM / Produção
├── nginx.conf
├── .env.vm                      # Template de variáveis para a VM
└── .env                         # ⚠️ NUNCA versionar este arquivo
```

---

## ⚙️ Configuração do `.env`

Na VM, crie o `.env` a partir do template:

```bash
cp .env.vm .env
nano .env
```

Preencha os valores marcados com `<...>`:

```env
# =============================================================================
# SIS BEM-ESTAR — Variáveis de Ambiente para VM
# =============================================================================

# Django
SECRET_KEY=<gerar com: python3 -c "import secrets; print(secrets.token_urlsafe(50))">
DEBUG=False
ALLOWED_HOSTS=sisagenda-dsv.aeb.gov.br,localhost,127.0.0.1

# PostgreSQL
DB_NAME=sis_bem_estar
DB_USER=postgres
DB_PASSWORD=<senha forte>
DB_HOST=db
DB_PORT=5432

# E-mail SMTP AEB (relay sem autenticação)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.aeb.gov.br
EMAIL_PORT=25
EMAIL_USE_TLS=False
EMAIL_USE_SSL=False
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=noreply@aeb.gov.br

# Destinatários do disparo de e-mails do evento
# Em produção: lista de distribuição (ex: ld-bem-estar@aeb.gov.br)
# Em teste: e-mails separados por vírgula
EMAIL_DESTINO_EVENTO=ld-bem-estar@aeb.gov.br

# URLs
FRONTEND_URL=https://sisagenda-dsv.aeb.gov.br
CORS_ALLOWED_ORIGINS=https://sisagenda-dsv.aeb.gov.br
VITE_API_URL=https://sisagenda-dsv.aeb.gov.br/api

# Redis
REDIS_URL=redis://redis:6379/0

# LDAP / Active Directory AEB
USUARIO_BUSCA_BACKEND=ldap
LDAP_HOST=ldap.aeb.gov.br
LDAP_PORT=389
LDAP_BIND_DN=svc.agendadev@aeb.gov.br
LDAP_BIND_PASSWORD=<senha da conta de serviço>
LDAP_BASE_DN=OU=USUARIOS,OU=AEB,DC=aeb,DC=gov,DC=br
```

> ⚠️ **Atenção:** Senhas que contenham `$` devem usar `$$` para escapar o caractere.
> Exemplo: `minha$$senha` representa `minha$senha`.

---

## 🚀 Subindo os Containers

### Primeira execução na VM

```bash
# 1. Clonar o repositório
git clone https://gitlab.aeb.gov.br/cti/sis-bem-estar.git
cd sis-bem-estar

# 2. Criar e preencher o .env
cp .env.vm .env
nano .env

# 3. Subir todos os serviços
sudo docker compose -f docker-compose.prod.yml up -d --build
```

O startup executa automaticamente:
- `python manage.py migrate` — aplica as migrações
- `python manage.py criar_admin` — cria os usuários padrão

### Rebuildar após atualização de código

```bash
git pull
sudo docker compose -f docker-compose.prod.yml up -d --build
```

### Subir serviço específico

```bash
sudo docker compose -f docker-compose.prod.yml up -d --build backend
sudo docker compose -f docker-compose.prod.yml up -d --build frontend
```

---

## 👤 Usuários Criados Automaticamente

| Perfil | E-mail | Senha | Acesso |
|---|---|---|---|
| Admin de Eventos | `admin@aeb.gov.br` | `adminaeb` | Cria e gerencia eventos |
| SuperAdmin (CTI) | `superadmin@aeb.gov.br` | `aeb@123` | Gerencia admins + tudo acima |

> Os superadmins usam **senha local**. Os admins promovidos via AD usam **senha do Windows/AD**.

---

## 🔐 Autenticação

O sistema possui dois tipos de login:

| Tipo | Endpoint | Usuários |
|---|---|---|
| Colaborador | `POST /api/auth/solicitar-acesso/` + OTP por e-mail | Todos os servidores AEB |
| Administrador | `POST /api/auth/login/` | Admins e SuperAdmins |

### Fluxo LDAP para administradores

```
SuperAdmin busca colaborador no AD (Gestão de Usuários)
    ↓
Promove o colaborador a Admin
    ↓
Sistema cria o usuário no banco local com is_admin=True
    ↓
Usuário acessa /admin/login com e-mail + senha do Windows (AD)
    ↓
Backend valida senha diretamente no Active Directory
    ↓
JWT gerado — acesso liberado
```

---

## 🛠️ Comandos Úteis

### Ver containers rodando

```bash
sudo docker compose -f docker-compose.prod.yml ps
```

### Ver logs em tempo real

```bash
# Backend
sudo docker compose -f docker-compose.prod.yml logs backend -f

# Frontend / Nginx
sudo docker compose -f docker-compose.prod.yml logs frontend -f

# Últimas 50 linhas
sudo docker compose -f docker-compose.prod.yml logs backend --tail 50
```

### Entrar no container

```bash
sudo docker compose -f docker-compose.prod.yml exec backend bash
```

### Verificar variáveis de ambiente

```bash
sudo docker compose -f docker-compose.prod.yml exec backend printenv | grep LDAP
```

### Redefinir senha de um usuário (SuperAdmin)

```bash
sudo docker compose -f docker-compose.prod.yml exec backend python manage.py changepassword superadmin@aeb.gov.br
```

### Parar todos os containers

```bash
sudo docker compose -f docker-compose.prod.yml down
```

---

## 📦 Serviços e Portas

| Serviço | Container | Porta |
|---|---|---|
| Frontend (Nginx) | `sis_bem_estar_frontend` | `80` (público) |
| Backend (Gunicorn) | `sis_bem_estar_backend` | `8000` (interno) |
| Banco de Dados | `sis_bem_estar_db` | `5432` (interno) |
| Cache | `sis_bem_estar_redis` | `6379` (interno) |

---

## 🐛 Solução de Problemas

### Container backend em crash loop

```bash
sudo docker compose -f docker-compose.prod.yml logs backend --tail 50
```

### 502 Bad Gateway

Verifique se o gunicorn está ouvindo em `0.0.0.0:8000`:

```bash
sudo docker compose -f docker-compose.prod.yml logs backend | grep "Listening at"
# Deve mostrar: Listening at: http://0.0.0.0:8000
```

Se mostrar `127.0.0.1`, rebuilde:

```bash
sudo docker compose -f docker-compose.prod.yml up -d --build backend
```

### Variáveis de ambiente não chegando ao container

Verifique se o `.env` está na raiz do projeto e rebuilde:

```bash
sudo docker compose -f docker-compose.prod.yml up -d --build
```

### Erro de LDAP / credenciais inválidas

Verifique a conectividade com o AD:

```bash
sudo docker compose -f docker-compose.prod.yml exec backend python -c "
import socket
s = socket.create_connection(('ldap.aeb.gov.br', 389), timeout=5)
print('LDAP acessível:', s.recv(1024))
s.close()
"
```

Verifique as variáveis LDAP no container:

```bash
sudo docker compose -f docker-compose.prod.yml exec backend printenv | grep LDAP
```

### Testar envio de e-mail

```bash
sudo docker compose -f docker-compose.prod.yml exec backend python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.core.settings')
django.setup()
from django.core.mail import send_mail
send_mail('Teste', 'Mensagem de teste.', 'noreply@aeb.gov.br', ['seu.email@aeb.gov.br'], fail_silently=False)
print('E-mail enviado com sucesso')
"
```

### Conflito de branch / mudanças locais na VM

```bash
git checkout -- .
git pull
sudo docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🔄 Desenvolvimento Local

Para rodar localmente (sem acesso ao AD, usando mock):

```bash
# 1. Subir containers de dev
docker compose up -d

# 2. Acessar
# Frontend: http://localhost:3000
# Backend:  http://localhost:8001/api/
```

O `docker-compose.yml` (sem `.prod`) usa configurações de desenvolvimento com mock LDAP e e-mail via console.

### Comandos do dia a dia

```bash
# Criar novas migrations após alterar models
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate

# Shell Django
docker compose exec backend python manage.py shell

# Acessar banco de dados
docker compose exec db psql -U postgres -d sis_bem_estar
```

---

## 📌 Observações de Segurança

- O arquivo `.env` **nunca deve ser versionado** — já está no `.gitignore`
- O `.env.vm` é um **template sem senhas reais** — pode ser versionado
- Nunca compartilhe senhas em chats, e-mails ou commits
- O `SECRET_KEY` do Django deve ter no mínimo 50 caracteres aleatórios
- A conta de serviço LDAP (`svc.agendadev`) deve ter permissão apenas de leitura no AD

---

## 👥 Equipe

**Desenvolvido pela CTI — Coordenação de Tecnologia da Informação / AEB**

**Última atualização:** Março 2026
