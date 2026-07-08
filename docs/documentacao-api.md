# Documentacao da API

Este documento resume o acesso e os principais contratos da API do SIS Bem-Estar.
A fonte navegavel e testavel da API fica no Swagger/OpenAPI.

## Acesso

Base local, quando o backend esta exposto pelo Docker:

```text
http://localhost:8001/api/
```

Swagger:

```text
http://localhost:8001/api/docs/
```

Redoc:

```text
http://localhost:8001/api/redoc/
```

Schema OpenAPI:

```text
http://localhost:8001/api/schema/
```

Em outro ambiente, troque `localhost:8001` pelo host ou IP publicado.

## Configuracao

A documentacao OpenAPI depende da variavel:

```env
API_DOCS_ENABLED=True
```

Em producao, recomenda-se manter:

```env
API_DOCS_ENABLED=False
```

ou expor a documentacao apenas atras de VPN, proxy autenticado ou rede interna.

## Autenticacao

A API usa JWT via `Authorization: Bearer <access_token>`.

Exemplo de header:

```http
Authorization: Bearer eyJ0eXAiOiJKV1Qi...
```

Login administrativo:

```http
POST /api/auth/login/
```

Body:

```json
{
  "email": "admin@empresa.com.br",
  "password": "admin@123"
}
```

Resposta esperada:

```json
{
  "access": "...",
  "refresh": "...",
  "usuario": {
    "id": 1,
    "email": "admin@empresa.com.br",
    "nome": "Admin",
    "is_admin": true,
    "is_superuser": true
  }
}
```

## Perfis de acesso

| Perfil | Regra |
| --- | --- |
| Publico | Sem JWT. Usado para login, acesso por token, OTP e consulta publica de evento. |
| Colaborador autenticado | Requer JWT valido. Usado para listar eventos, reservar horarios, cancelar agendamentos e lista de espera. |
| Admin | Requer `is_admin=True`. Usado para gestao de eventos, usuarios, dashboard, comunicados, penalidades e agendamentos. |
| Superadmin | Requer `is_superuser=True`. Usado para gestao LDAP/promocao/revogacao de admins. |

## Limites contra abuso

Rotas publicas sensiveis possuem throttling configuravel:

```env
PUBLIC_AUTH_THROTTLE_RATE=20/minute
PUBLIC_READ_THROTTLE_RATE=60/minute
```

O throttling cobre login, OTP, acesso por token e consultas publicas.

## Endpoints de documentacao

| Metodo | Endpoint | Acesso | Descricao |
| --- | --- | --- | --- |
| GET | `/api/schema/` | Publico se `API_DOCS_ENABLED=True` | Schema OpenAPI. |
| GET | `/api/docs/` | Publico se `API_DOCS_ENABLED=True` | Swagger UI. |
| GET | `/api/redoc/` | Publico se `API_DOCS_ENABLED=True` | Redoc. |

## Endpoints de autenticacao e acesso publico

| Metodo | Endpoint | Acesso | Descricao |
| --- | --- | --- | --- |
| POST | `/api/auth/login/` | Publico | Login administrativo com e-mail e senha. |
| GET | `/api/auth/acesso/<token>/` | Publico | Acesso por link magico enviado por e-mail. |
| POST | `/api/auth/acesso/<token>/` | Publico | Valida palavra-chave do link magico quando exigida. |
| POST | `/api/auth/solicitar-acesso/` | Publico | Solicita codigo OTP para acesso ao evento. |
| POST | `/api/auth/verificar-codigo/` | Publico | Valida OTP e emite JWT para colaborador. |
| POST | `/api/auth/acessar-evento/` | Publico | Fluxo legado de acesso por e-mail/palavra-chave. |
| GET | `/api/auth/evento-publico/<evento_id>/` | Publico | Dados publicos de um evento publicado. |
| POST | `/api/auth/confirmar-vaga/<token>/` | Publico | Confirma vaga chamada pela lista de espera e emite JWT. |

## Endpoints do colaborador

| Metodo | Endpoint | Acesso | Descricao |
| --- | --- | --- | --- |
| GET | `/api/colaborador/eventos/` | Colaborador | Lista eventos publicados disponiveis. |
| GET | `/api/colaborador/eventos/<id>/` | Colaborador | Detalha evento e horarios. |
| POST | `/api/colaborador/horarios/<horario_id>/solicitar-otp/` | Colaborador | Envia OTP para confirmar reserva. |
| POST | `/api/colaborador/eventos/<evento_id>/horarios/<horario_id>/reservar/` | Colaborador | Reserva horario usando OTP. |
| GET | `/api/colaborador/agendamentos/` | Colaborador | Lista agendamentos confirmados do usuario. |
| POST | `/api/colaborador/agendamentos/<agendamento_id>/cancelar/` | Colaborador | Cancela agendamento, respeitando a janela minima. |
| POST | `/api/colaborador/horarios/<horario_id>/lista-espera/` | Colaborador | Entra na lista de espera do horario. |
| DELETE | `/api/colaborador/horarios/<horario_id>/lista-espera/` | Colaborador | Sai da lista de espera do horario. |
| GET | `/api/colaborador/lista-espera/` | Colaborador | Lista entradas ativas do usuario na lista de espera. |

Exemplo de reserva:

```json
{
  "otp": "1234",
  "alterar": false
}
```

## Endpoints administrativos

### Dashboard

| Metodo | Endpoint | Acesso | Descricao |
| --- | --- | --- | --- |
| GET | `/api/admin/dashboard/` | Admin | Metricas gerais, vagas, ocupacao e agendamentos recentes. |

### Usuarios

| Metodo | Endpoint | Acesso | Descricao |
| --- | --- | --- | --- |
| GET | `/api/admin/usuarios/` | Admin | Lista usuarios. |
| POST | `/api/admin/usuarios/` | Admin | Cria usuario. |
| GET | `/api/admin/usuarios/<id>/` | Admin | Detalha usuario. |
| PUT | `/api/admin/usuarios/<id>/` | Admin | Atualiza usuario. |
| PATCH | `/api/admin/usuarios/<id>/` | Admin | Atualiza parcialmente usuario. |
| DELETE | `/api/admin/usuarios/<id>/` | Admin | Remove usuario. |

### Eventos

| Metodo | Endpoint | Acesso | Descricao |
| --- | --- | --- | --- |
| GET | `/api/admin/eventos/` | Admin | Lista eventos. |
| POST | `/api/admin/eventos/` | Admin | Cria evento publicado por padrao e gera horarios. |
| GET | `/api/admin/eventos/<id>/` | Admin | Detalha evento. |
| PUT | `/api/admin/eventos/<id>/` | Admin | Atualiza evento. |
| PATCH | `/api/admin/eventos/<id>/` | Admin | Atualiza parcialmente evento. |
| DELETE | `/api/admin/eventos/<id>/` | Admin | Remove evento, respeitando regras de presenca/e-mail. |
| POST | `/api/admin/eventos/<id>/publicar/` | Admin | Publica evento e gera horarios. |
| POST | `/api/admin/eventos/<id>/cancelar/` | Admin | Cancela evento publicado. |
| POST | `/api/admin/eventos/<id>/enviar-emails/` | Admin | Envia ou agenda e-mail do evento para `EMAIL_DESTINO_EVENTO`. |
| POST | `/api/admin/eventos/<id>/registrar-participante/` | Admin | Registra participante manual sem e-mail corporativo. |
| DELETE | `/api/admin/eventos/<id>/remover-participante/<participante_id>/` | Admin | Remove participante manual. |
| GET | `/api/admin/eventos/<id>/lista-presenca/` | Admin | Lista presenca consolidada por horario. |
| POST | `/api/admin/eventos/<id>/marcar-presenca/` | Admin | Salva comparecimento/falta. |
| GET | `/api/admin/eventos/<id>/fila-historico/` | Admin | Consulta fila de espera e cancelamentos do evento. |
| GET | `/api/admin/eventos/<id>/exportar-csv/` | Admin | Exporta agendamentos em CSV. |

### Agendamentos

| Metodo | Endpoint | Acesso | Descricao |
| --- | --- | --- | --- |
| GET | `/api/admin/agendamentos/` | Admin | Lista agendamentos. Aceita `evento_id` e `status`. |
| GET | `/api/admin/agendamentos/<id>/` | Admin | Detalha agendamento. |

### Penalidades

| Metodo | Endpoint | Acesso | Descricao |
| --- | --- | --- | --- |
| GET | `/api/admin/penalidades/` | Admin | Lista penalidades. Aceita `ativa=true` e `usuario_id`. |
| GET | `/api/admin/penalidades/<id>/` | Admin | Detalha penalidade. |
| POST | `/api/admin/penalidades/<id>/revogar/` | Admin | Revoga penalidade manualmente. |

Body de revogacao:

```json
{
  "motivo": "Justificativa aceita"
}
```

### Comunicados

| Metodo | Endpoint | Acesso | Descricao |
| --- | --- | --- | --- |
| GET | `/api/admin/comunicados/` | Admin | Lista comunicados com paginacao. |
| POST | `/api/admin/comunicados/` | Admin | Envia ou agenda comunicado. |
| GET | `/api/admin/comunicados/<id>/` | Admin | Detalha comunicado. |
| PUT | `/api/admin/comunicados/<id>/` | Admin | Atualiza comunicado ainda nao enviado. |
| DELETE | `/api/admin/comunicados/<id>/` | Admin | Cancela comunicado agendado. |

Body de envio/agendamento:

```json
{
  "assunto": "Comunicado",
  "corpo_html": "<p>Texto do comunicado</p>",
  "modo_envio": "imediato",
  "agendado_para": "2026-07-08T15:00:00-03:00"
}
```

### LDAP e admins

| Metodo | Endpoint | Acesso | Descricao |
| --- | --- | --- | --- |
| GET | `/api/admin/ldap/buscar/?q=<termo>` | Superadmin | Busca usuarios no LDAP ou mock local. |
| POST | `/api/admin/ldap/promover/` | Superadmin | Promove usuario a admin de eventos. |
| POST | `/api/admin/ldap/revogar/<usuario_id>/` | Superadmin | Revoga acesso admin. |
| GET | `/api/admin/ldap/admins/` | Superadmin | Lista usuarios administradores. |

Body de promocao:

```json
{
  "email": "usuario@aeb.gov.br",
  "nome": "Usuario",
  "matricula": "123456",
  "departamento": "TI"
}
```

## Codigos de resposta comuns

| Codigo | Significado |
| --- | --- |
| 200 | Operacao concluida. |
| 201 | Recurso criado. |
| 204 | Recurso removido sem corpo de resposta. |
| 400 | Requisicao invalida ou regra de negocio violada. |
| 401 | Token ausente, invalido ou credenciais incorretas. |
| 403 | Usuario autenticado sem permissao suficiente. |
| 404 | Recurso nao encontrado. |
| 409 | Conflito de estado, duplicidade ou bloqueio operacional. |
| 429 | Limite de tentativas atingido. |
| 500 | Erro interno ou configuracao ausente. |

## Testes

Validar Django:

```powershell
docker exec sis_bem_estar_backend python manage.py check
```

Validar schema OpenAPI:

```powershell
docker exec sis_bem_estar_backend python manage.py spectacular --validate --file /tmp/schema.yaml
```

Rodar testes automatizados:

```powershell
docker exec sis_bem_estar_backend python manage.py test backend.tests
```

Testes HTTP basicos:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:8001/api/docs/
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:8001/api/schema/
```

Resultado esperado:

```text
HTTP 200 para Swagger/schema
HTTP 401 para rota admin sem token
HTTP 401 para login invalido
```
