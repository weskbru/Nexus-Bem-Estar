# Documentação completa da API — SIS Bem-Estar

Esta é a referência técnica da API REST do SIS Bem-Estar. O conteúdo foi conferido no código do backend em 14/07/2026 e cobre autenticação, perfis de acesso, contratos JSON, parâmetros, respostas, regras de negócio e todos os endpoints registrados.

## Sumário

- [Ambientes e URLs](#ambientes-e-urls)
- [Convenções da API](#convenções-da-api)
- [Autenticação e perfis](#autenticação-e-perfis)
- [Contratos compartilhados](#contratos-compartilhados)
- [Autenticação e acesso público](#autenticação-e-acesso-público)
- [Endpoints do colaborador](#endpoints-do-colaborador)
- [Endpoints administrativos](#endpoints-administrativos)
- [Endpoints de superadmin e LDAP](#endpoints-de-superadmin-e-ldap)
- [Documentação OpenAPI](#documentação-openapi)
- [Regras de negócio](#regras-de-negócio)
- [Códigos de resposta e erros](#códigos-de-resposta-e-erros)
- [Configuração](#configuração)
- [Exemplos de integração](#exemplos-de-integração)
- [Validação e testes](#validação-e-testes)

## Ambientes e URLs

No Docker de desenvolvimento, o backend é publicado por padrão em:

```text
http://localhost:8001
```

A URL-base da API é:

```text
http://localhost:8001/api
```

O valor pode mudar por meio de `BACKEND_LOCAL_PORT`. Em homologação ou produção, substitua o host e a porta pela URL publicada no ambiente.

Todas as rotas abaixo são relativas a `/api` e possuem barra final. Exemplo:

```text
POST /auth/login/
URL completa: http://localhost:8001/api/auth/login/
```

Também existem duas rotas fora da API REST:

| Rota | Finalidade |
| --- | --- |
| `/django-admin/` | Administração nativa do Django. |
| `/media/<caminho>` | Arquivos de mídia. |

## Convenções da API

### Formato

- Requisições e respostas usam JSON, salvo o endpoint de exportação CSV.
- Envie `Content-Type: application/json` quando houver body.
- Datas usam `YYYY-MM-DD`.
- Horas serializadas pelo DRF normalmente usam `HH:MM:SS`.
- Date-times usam ISO 8601, preferencialmente com fuso, por exemplo `2026-07-20T15:00:00-03:00`.
- O fuso do backend é `America/Sao_Paulo`.
- IDs são inteiros, exceto tokens públicos, que são UUIDs.
- As rotas exigem barra final. Evite depender de redirecionamento automático em `POST`, `PUT`, `PATCH` ou `DELETE`.

### Paginação

Não há paginação global configurada. Assim, as listagens de eventos, usuários, agendamentos, penalidades, administradores e dados do colaborador retornam arrays JSON diretamente.

A listagem de comunicados é a exceção: possui paginação própria com `page` e `page_size`.

### Cabeçalhos recomendados

```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer <access_token>
```

O cabeçalho `Authorization` só é necessário em endpoints protegidos.

## Autenticação e perfis

A API usa JWT por meio do esquema Bearer:

```http
Authorization: Bearer eyJ0eXAiOiJKV1Qi...
```

O token `access` vale 8 horas e o token `refresh` vale 1 dia. A implementação atual retorna ambos, mas **não registra um endpoint de renovação de token**. Quando o `access` expirar, o cliente deve executar novamente o fluxo de login ou acesso do colaborador.

### Perfis

| Perfil | Regra | Uso |
| --- | --- | --- |
| Público | Sem JWT | Login, links mágicos, OTP inicial, consulta pública e confirmação de vaga. |
| Colaborador | JWT válido | Eventos publicados, reserva, cancelamento e lista de espera. |
| Admin | JWT válido e `usuario.is_admin = true` | Dashboard, eventos, usuários, agendamentos, penalidades e comunicados. |
| Superadmin | JWT válido e `usuario.is_superuser = true` | Busca LDAP e gestão de administradores. |

Um superadmin criado normalmente também é admin, mas as rotas LDAP verificam especificamente `is_superuser`.

### Respostas de autenticação

Sem credenciais, o DRF normalmente retorna:

```json
{
  "detail": "As credenciais de autenticação não foram fornecidas."
}
```

Um token inválido ou expirado também resulta em `401 Unauthorized`, com detalhes fornecidos pelo Simple JWT. Um usuário autenticado sem o perfil exigido recebe `403 Forbidden`.

### Limites contra abuso

Os endpoints públicos sensíveis usam o escopo `auth_public`; a consulta pública do evento usa `public_read`. As taxas padrão são:

```env
PUBLIC_AUTH_THROTTLE_RATE=20/minute
PUBLIC_READ_THROTTLE_RATE=60/minute
```

Ao exceder a taxa, a API retorna `429 Too Many Requests`. O endpoint autenticado que envia OTP de reserva também usa `auth_public`.

## Contratos compartilhados

Os exemplos desta seção mostram o formato integral dos principais objetos reutilizados.

### Usuário

```json
{
  "id": 12,
  "email": "colaborador@aeb.gov.br",
  "nome": "Nome do Colaborador",
  "matricula": "123456",
  "departamento": "CTI",
  "is_admin": false,
  "is_superuser": false
}
```

O campo `ramal` existe no modelo e aparece em relatórios específicos, mas não faz parte do serializer padrão de usuário.

### Horário

```json
{
  "id": 31,
  "hora_inicio": "09:00:00",
  "hora_fim": "09:30:00",
  "vagas_disponiveis": 2,
  "vagas_ocupadas": 1,
  "vagas_livres": 1,
  "disponivel": true,
  "reservado_para_fila": false
}
```

`vagas_ocupadas` inclui agendamentos confirmados e participantes manuais. `reservado_para_fila` indica que alguém da fila foi notificado e está dentro do prazo de confirmação.

### Evento resumido do colaborador

```json
{
  "id": 7,
  "titulo": "Sessão de Massagem",
  "tipo": "massagem",
  "data": "2026-07-20",
  "hora_inicio": "09:00:00",
  "hora_fim": "17:00:00",
  "imagem_url": "https://exemplo/imagem.jpg",
  "status": "publicado",
  "nome_profissional": "Profissional",
  "total_horarios": 13,
  "horarios_disponiveis": 8,
  "esgotado": false
}
```

### Evento detalhado do colaborador

```json
{
  "id": 7,
  "titulo": "Sessão de Massagem",
  "tipo": "massagem",
  "descricao": "Atendimento individual.",
  "nome_profissional": "Profissional",
  "data": "2026-07-20",
  "hora_inicio": "09:00:00",
  "hora_fim": "17:00:00",
  "duracao_sessao": 30,
  "capacidade_por_horario": 1,
  "imagem_url": "https://exemplo/imagem.jpg",
  "status": "publicado",
  "horarios": []
}
```

### Agendamento

```json
{
  "id": 88,
  "usuario": {},
  "horario": {},
  "status": "confirmado",
  "compareceu": null,
  "evento_id": 7,
  "evento_titulo": "Sessão de Massagem",
  "evento_data": "2026-07-20",
  "nome_profissional": "Profissional",
  "criado_em": "2026-07-14T10:30:00-03:00",
  "atualizado_em": "2026-07-14T10:30:00-03:00"
}
```

Os objetos `usuario` e `horario` seguem os contratos anteriores. Valores de `status`: `confirmado` e `cancelado`. `compareceu` é `null` enquanto a presença estiver pendente, `true` para presente e `false` para ausente.

### Erro de negócio

A maior parte dos erros tratados usa:

```json
{
  "erro": "Descrição do problema."
}
```

Alguns erros incluem metadados, por exemplo `codigo`, `evento_id`, `penalidade`, `requer_otp` ou `otp_expirado`. Erros automáticos de validação do DRF usam o nome de cada campo:

```json
{
  "email": ["Insira um endereço de email válido."]
}
```

## Autenticação e acesso público

### POST `/auth/login/`

Login administrativo por e-mail e senha.

**Acesso:** público, limitado por `auth_public`.

Body:

```json
{
  "email": "admin@aeb.gov.br",
  "password": "senha"
}
```

Resposta `200`:

```json
{
  "access": "<jwt-access>",
  "refresh": "<jwt-refresh>",
  "usuario": {}
}
```

Erros: `400` para formato inválido, `401` para credenciais inválidas ou usuário sem `is_admin` e `429` por limite de requisições.

### GET `/auth/acesso/{token}/`

Acessa um convite por link mágico. `{token}` é um UUID.

**Acesso:** público, limitado por `auth_public`.

Se o evento não exigir palavra-chave, retorna `200` e emite o JWT:

```json
{
  "access": "<jwt-access>",
  "refresh": "<jwt-refresh>",
  "usuario": {},
  "evento_id": 7,
  "chave_mensagem": "A1B2C3D4"
}
```

Se exigir palavra-chave, retorna apenas o preview:

```json
{
  "requer_palavra_chave": true,
  "evento_titulo": "Sessão de Massagem",
  "evento_tipo": "massagem",
  "evento_data": "2026-07-20",
  "evento_hora_inicio": "09:00:00",
  "evento_hora_fim": "17:00:00",
  "nome_profissional": "Profissional"
}
```

Erro `404`: link inválido ou inexistente. Ao emitir o JWT, o convite é marcado como usado; na implementação atual, esse marcador não impede uma nova chamada ao mesmo link.

### POST `/auth/acesso/{token}/`

Valida a palavra-chave do convite e emite JWT.

**Acesso:** público, limitado por `auth_public`.

Body:

```json
{
  "palavra_chave": "BEMESTAR"
}
```

A comparação ignora maiúsculas/minúsculas e espaços externos. Se o evento não possuir palavra-chave, o body é ignorado e o JWT é emitido.

Respostas: `200` com tokens; `400` se a palavra for obrigatória e estiver vazia; `401` se estiver incorreta; `404` para token inválido.

### GET `/auth/evento-publico/{evento_id}/`

Retorna os dados necessários à página pública de entrada.

**Acesso:** público, limitado por `public_read`.

Resposta `200`:

```json
{
  "id": 7,
  "titulo": "Sessão de Massagem",
  "tipo": "massagem",
  "data": "2026-07-20",
  "hora_inicio": "09:00:00",
  "hora_fim": "17:00:00",
  "nome_profissional": "Profissional",
  "requer_palavra_chave": true
}
```

Respostas de indisponibilidade:

- `404` e `codigo: "nao_encontrado"` para ID inexistente.
- `404` e `codigo: "indisponivel"` para status diferente dos estados públicos conhecidos.
- `410` e `codigo: "encerrado"` para evento encerrado.
- `410` e `codigo: "cancelado"` para evento cancelado.

### POST `/auth/solicitar-acesso/`

Primeira etapa do acesso por OTP: valida o colaborador e envia um código de 6 dígitos com validade de 10 minutos.

**Acesso:** público, limitado por `auth_public`.

Body:

```json
{
  "evento_id": 7,
  "email": "colaborador@aeb.gov.br",
  "palavra_chave": "BEMESTAR"
}
```

`palavra_chave` é opcional quando o evento não a exige. O e-mail deve terminar em `@aeb.gov.br` e existir no backend LDAP/mock configurado.

Resposta `200`:

```json
{
  "mensagem": "Código enviado para colaborador@aeb.gov.br. Verifique sua caixa de entrada."
}
```

Erros: `400` para dados incompletos ou domínio inválido; `401` para palavra-chave incorreta; `404` para e-mail/evento não encontrado; `503` se o envio falhar.

### POST `/auth/verificar-codigo/`

Segunda etapa do acesso por OTP: valida o código de 6 dígitos e emite JWT.

**Acesso:** público, limitado por `auth_public`.

Body:

```json
{
  "evento_id": 7,
  "email": "colaborador@aeb.gov.br",
  "codigo": "123456"
}
```

Resposta `200`: `access`, `refresh`, `usuario` e `evento_id`.

O código é de uso único. Após três erros ele é apagado. Respostas: `400` para dados incompletos/código expirado; `401` para código incorreto; `404` para evento inexistente; `429` ao atingir o máximo de tentativas.

### POST `/auth/acessar-evento/`

Fluxo legado, mantido para compatibilidade. Valida diretamente e-mail, palavra-chave e LDAP, cria o usuário local se necessário e emite JWT sem a etapa de OTP.

**Acesso:** público, limitado por `auth_public`.

Body:

```json
{
  "evento_id": 7,
  "email": "colaborador@aeb.gov.br",
  "palavra_chave": "BEMESTAR",
  "ramal": "1234"
}
```

`palavra_chave` e `ramal` são opcionais. Resposta `200`: `access`, `refresh`, `usuario` e `evento_id`.

Erros: `400` para dados/domínio inválido; `401` para palavra-chave incorreta; `404` para colaborador ou evento indisponível.

### POST `/auth/confirmar-vaga/{token}/`

Confirma uma vaga oferecida pela lista de espera. `{token}` é o UUID enviado por e-mail. Não possui body.

**Acesso:** público, limitado por `auth_public`.

Resposta `200`:

```json
{
  "access": "<jwt-access>",
  "refresh": "<jwt-refresh>",
  "usuario": {},
  "evento_id": 7,
  "mensagem": "Vaga confirmada com sucesso! Seu agendamento foi criado."
}
```

O fluxo cancela outro agendamento confirmado do mesmo usuário no evento, confirma a nova vaga e encerra as demais entradas ativas dele nas filas do evento.

Erros possíveis: `400` para estado inválido ou prazo expirado; `404` para token inválido; `409` se a vaga tiver sido ocupada antes da confirmação.

## Endpoints do colaborador

Todos os endpoints desta seção exigem JWT válido. Eles não exigem `is_admin`.

### GET `/colaborador/eventos/`

Lista todos os eventos com status `publicado`. Eventos cujo horário final já passou são automaticamente alterados para `encerrado` antes da consulta.

Resposta `200`: array de eventos resumidos do colaborador. Não há paginação.

### GET `/colaborador/eventos/{id}/`

Detalha um evento publicado e seus horários. A resposta fica em cache por 3 segundos.

Resposta `200`: evento detalhado do colaborador. Retorna `404` se o evento não existir ou não estiver publicado.

### POST `/colaborador/horarios/{horario_id}/solicitar-otp/`

Envia ao usuário autenticado um código de 4 dígitos para confirmar a reserva. O código vale 5 minutos e é vinculado ao par usuário/horário.

Body opcional:

```json
{
  "reenviar": false
}
```

Se já houver um código válido e `reenviar` não for `true`, ele é reutilizado sem novo envio.

Resposta `200`:

```json
{
  "mensagem": "Código enviado para colaborador@aeb.gov.br.",
  "reutilizado": false,
  "segundos_restantes": 300
}
```

Erros: `404` para horário/evento indisponível; `503` para falha de envio; `429` pelo throttle do escopo `auth_public`.

### POST `/colaborador/eventos/{evento_id}/horarios/{horario_id}/reservar/`

Reserva um horário usando o OTP de 4 dígitos. A operação usa transação e bloqueio de banco para reduzir conflitos de concorrência.

Body:

```json
{
  "otp": "1234",
  "alterar": false
}
```

`alterar` é opcional. Use `true` para cancelar o agendamento confirmado atual do mesmo evento e trocar para o novo horário.

Resposta `201`: objeto de agendamento.

Principais validações:

- O OTP é obrigatório, expira em 5 minutos, é de uso único e permite 3 tentativas.
- O `horario_id` deve pertencer ao `evento_id`, e o evento deve estar publicado.
- O horário precisa ter vaga.
- Uma vaga temporariamente reservada para outro usuário da fila não pode ser tomada diretamente.
- Penalidade ativa impede a reserva.
- Um usuário que está na fila daquele horário deve aguardar o link de confirmação.
- Só pode existir um agendamento confirmado por usuário em cada evento, salvo troca com `alterar: true`.

Erros e sinalizadores relevantes:

| Status | Campo adicional | Situação |
| --- | --- | --- |
| `400` | `requer_otp: true` | OTP não informado. |
| `400` | `otp_expirado: true` | OTP ausente no cache ou expirado. |
| `401` | `otp_incorreto: true` | Código incorreto. |
| `403` | `penalidade: true` | Penalidade ativa. |
| `403` | `na_fila: true` | Usuário está na fila desse horário. |
| `409` | `reservado_para_fila: true` | Vaga reservada temporariamente para outro usuário. |
| `429` | `otp_expirado: true` | Três tentativas de OTP atingidas. |

### GET `/colaborador/agendamentos/`

Lista somente os agendamentos `confirmado` do usuário, do mais recente para o mais antigo.

Query param opcional:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `evento_id` | inteiro | Filtra pelo evento. |

Resposta `200`: array de agendamentos. Não há paginação.

### POST `/colaborador/agendamentos/{agendamento_id}/cancelar/`

Cancela um agendamento pertencente ao usuário autenticado. Não possui body.

O cancelamento só é aceito até 30 minutos antes do início do horário. Em caso de sucesso, a API tenta notificar o próximo usuário da fila.

Resposta `200`:

```json
{
  "mensagem": "Agendamento cancelado com sucesso."
}
```

Erros: `400` para agendamento já cancelado ou fora da antecedência; `404` para ID inexistente ou pertencente a outro usuário.

### POST `/colaborador/horarios/{horario_id}/lista-espera/`

Entra na lista de espera de um horário lotado. Não possui body.

Resposta `201` para nova entrada ou `200` quando já existe uma entrada para o par usuário/horário:

```json
{
  "posicao": 2,
  "total_na_fila": 4,
  "status": "aguardando",
  "ja_inscrito": false
}
```

Regras:

- Só aceita horário de evento publicado e sem vagas livres.
- O usuário não pode ter agendamento confirmado no mesmo evento.
- Ao entrar, outras filas ativas do usuário no mesmo evento são expiradas.
- Valores ativos de `status`: `aguardando` e `notificado`.

Erros: `400` se ainda houver vaga; `404` para horário inválido; `409` se já houver agendamento confirmado no evento.

### DELETE `/colaborador/horarios/{horario_id}/lista-espera/`

Sai da fila, alterando a entrada ativa para `expirado`.

Resposta `200`:

```json
{
  "mensagem": "Você saiu da fila de espera com sucesso."
}
```

Retorna `404` se o usuário não tiver entrada `aguardando` ou `notificado` nesse horário.

### GET `/colaborador/lista-espera/`

Lista as entradas ativas do usuário.

Query param opcional:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `evento_id` | inteiro | Restringe as entradas ao evento. |

Resposta `200`:

```json
[
  {
    "horario_id": 31,
    "posicao": 2,
    "total_na_fila": 4,
    "status": "aguardando",
    "expira_em": null
  }
]
```

## Endpoints administrativos

Todos os endpoints desta seção exigem JWT e `is_admin = true`, inclusive os endpoints somente de leitura.

### Dashboard

#### GET `/admin/dashboard/`

Retorna métricas globais. Antes do cálculo, eventos expirados são encerrados automaticamente.

Resposta `200`:

```json
{
  "total_vagas": 120,
  "vagas_ocupadas": 82,
  "taxa_ocupacao": 68.3,
  "total_eventos_ativos": 4,
  "agendamentos_recentes": []
}
```

`agendamentos_recentes` contém no máximo 10 registros. `total_vagas` soma a capacidade de todos os horários cadastrados; `vagas_ocupadas` conta agendamentos confirmados.

### Usuários

| Método | Endpoint | Descrição | Sucesso |
| --- | --- | --- | --- |
| `GET` | `/admin/usuarios/` | Lista usuários por nome. | `200`, array |
| `POST` | `/admin/usuarios/` | Cria usuário. | `201` |
| `GET` | `/admin/usuarios/{id}/` | Detalha usuário. | `200` |
| `PUT` | `/admin/usuarios/{id}/` | Substitui os campos editáveis. | `200` |
| `PATCH` | `/admin/usuarios/{id}/` | Atualiza parcialmente. | `200` |
| `DELETE` | `/admin/usuarios/{id}/` | Exclui usuário. | `204` |

Body de criação/edição:

```json
{
  "email": "usuario@aeb.gov.br",
  "nome": "Nome do Usuário",
  "matricula": "123456",
  "departamento": "CTI",
  "is_admin": false,
  "password": "senha-opcional"
}
```

`email` e `nome` são obrigatórios na criação. `matricula`, `departamento` e `password` podem ser vazios. Sem senha, o novo usuário recebe senha inutilizável. `password` é aceito apenas na escrita e nunca é retornado. Essas rotas não expõem `is_superuser` para alteração.

### Eventos — contratos

Valores de `tipo`:

```text
massagem, yoga, meditacao, nutricao, pilates, acupuntura, outro
```

Valores de `status`:

```text
publicado, cancelado, encerrado
```

Valores de `emails_envio_status`:

```text
nao_agendado, agendado, enviando, enviado, falhou, cancelado
```

Body recomendado para criação:

```json
{
  "titulo": "Sessão de Massagem",
  "tipo": "massagem",
  "descricao": "Atendimento individual.",
  "nome_profissional": "Profissional",
  "data": "2026-07-20",
  "hora_inicio": "09:00:00",
  "hora_fim": "17:00:00",
  "duracao_sessao": 30,
  "capacidade_por_horario": 1,
  "imagem_url": "https://exemplo/imagem.jpg",
  "corpo_email": "<p>Convite do evento</p>",
  "palavra_chave": "BEMESTAR"
}
```

Campos obrigatórios: `titulo`, `data`, `hora_inicio`, `hora_fim` e `duracao_sessao`. `tipo` assume `outro`, `capacidade_por_horario` assume `1` e textos opcionais aceitam string vazia. O backend força novos eventos para `publicado` e gera os horários automaticamente.

A resposta detalhada também contém `id`, `status`, `horarios`, `total_agendamentos`, `presenca_pendente`, `emails_enviados_em`, `emails_envio_status`, `emails_agendado_para`, `emails_tentativas_envio`, `emails_erro_envio`, `criado_em` e `atualizado_em`. Os campos de controle de envio devem ser tratados como estado gerenciado pelo servidor.

#### CRUD de eventos

| Método | Endpoint | Descrição | Sucesso |
| --- | --- | --- | --- |
| `GET` | `/admin/eventos/` | Lista eventos. | `200`, array resumido |
| `POST` | `/admin/eventos/` | Cria, publica e gera horários. | `201` |
| `GET` | `/admin/eventos/{id}/` | Detalha evento e horários. | `200` |
| `PUT` | `/admin/eventos/{id}/` | Atualiza integralmente. | `200` |
| `PATCH` | `/admin/eventos/{id}/` | Atualiza parcialmente. | `200` |
| `DELETE` | `/admin/eventos/{id}/` | Exclui evento. | `204` |

A listagem retorna: `id`, `titulo`, `tipo`, `data`, `hora_inicio`, `hora_fim`, `imagem_url`, `status`, `nome_profissional`, dados de envio, `total_agendamentos` e `presenca_pendente`.

Validações de criação/edição:

- A data não pode estar no passado nem além de `EVENTO_MAX_MESES_FUTURO` meses, padrão 6.
- `hora_fim` deve ser posterior a `hora_inicio`.
- `duracao_sessao` deve ser positiva e não pode superar a duração total do evento.
- Alterar data, período, duração ou capacidade regenera horários de evento publicado.
- Horários não podem ser regenerados se já houver agendamentos associados.
- Evento com e-mail de divulgação já enviado não pode ser editado enquanto não estiver encerrado.
- A criação retorna `409` se existir evento encerrado com presença pendente.
- A exclusão retorna `409` se o convite já foi enviado e o evento ainda estiver em andamento, ou se o evento encerrou com presença pendente.

#### POST `/admin/eventos/{id}/publicar/`

Publica um evento cancelado, regenera os horários e distribui participantes manuais sem horário, se existirem. Não possui body.

Resposta `200`:

```json
{
  "mensagem": "Evento publicado com sucesso.",
  "horarios_gerados": 13
}
```

Retorna `400` se já estiver publicado, estiver encerrado ou os horários não puderem ser regenerados.

#### POST `/admin/eventos/{id}/cancelar/`

Cancela um evento publicado e envia aviso aos participantes confirmados. Não possui body.

Resposta `200`: `{ "mensagem": "Evento cancelado com sucesso." }`. Retorna `400` para evento que não esteja publicado.

#### POST `/admin/eventos/{id}/enviar-emails/`

Envia imediatamente ou agenda o e-mail de divulgação para os endereços configurados em `EMAIL_DESTINO_EVENTO`.

Body para envio imediato:

```json
{
  "modo_envio": "imediato"
}
```

Body para agendamento:

```json
{
  "modo_envio": "agendado",
  "agendado_para": "2026-07-20T15:00:00-03:00"
}
```

`modo_envio` assume `imediato`. Um agendamento deve estar pelo menos 5 minutos no futuro.

Resposta imediata `200`:

```json
{
  "mensagem": "E-mail enviado com sucesso para destinatario.",
  "destinatario": ["lista@aeb.gov.br"]
}
```

Resposta agendada `200`:

```json
{
  "mensagem": "Envio de e-mails agendado com sucesso.",
  "destinatario": ["lista@aeb.gov.br"],
  "agendado_para": "2026-07-20T15:00:00-03:00"
}
```

Somente eventos publicados são aceitos. Não é permitido reenviar após `emails_enviados_em` ser preenchido. Presença pendente em evento encerrado bloqueia a operação com `409`. Configuração ausente ou falha de envio retorna `500`.

#### POST `/admin/eventos/{id}/registrar-participante/`

Registra participante sem e-mail corporativo em um horário do evento publicado.

Body:

```json
{
  "nome": "Participante Manual",
  "horario_id": 31,
  "matricula": "123456",
  "departamento": "Área",
  "email_verificacao": "participante@aeb.gov.br"
}
```

`nome` e `horario_id` são obrigatórios. `matricula`, `departamento` e `email_verificacao` são opcionais. O último campo apenas verifica se há penalidade ativa associada ao e-mail e, se houver, acrescenta `aviso_penalidade` à resposta.

Resposta `201`:

```json
{
  "id": 15,
  "evento": 7,
  "horario": 31,
  "horario_info": "09:00 – 09:30",
  "nome": "Participante Manual",
  "matricula": "123456",
  "departamento": "Área",
  "compareceu": null,
  "criado_em": "2026-07-14T10:30:00-03:00"
}
```

Retorna `400` para dados incompletos, evento não publicado ou horário lotado; `404` se o horário não pertencer ao evento.

#### DELETE `/admin/eventos/{id}/remover-participante/{participante_id}/`

Remove um participante manual e tenta notificar o próximo da fila do horário. Retorna `204` sem body ou `404` se o participante não pertencer ao evento.

#### GET `/admin/eventos/{id}/lista-presenca/`

Retorna participantes por horário, incluindo agendamentos por e-mail e registros manuais.

Resposta `200`:

```json
{
  "evento": {
    "id": 7,
    "titulo": "Sessão de Massagem",
    "data": "20/07/2026",
    "hora_inicio": "09:00",
    "hora_fim": "17:00",
    "nome_profissional": "Profissional",
    "status": "encerrado"
  },
  "horarios": [
    {
      "horario_id": 31,
      "hora_inicio": "09:00",
      "hora_fim": "09:30",
      "participantes": [
        {
          "agendamento_id": 88,
          "nome": "Nome",
          "email": "nome@aeb.gov.br",
          "ramal": "1234",
          "hora_inicio": "09:00",
          "hora_fim": "09:30",
          "tipo": "email",
          "compareceu": null
        }
      ]
    }
  ],
  "total": 1
}
```

Participantes manuais usam `participante_id`, `tipo: "manual"` e e-mail `"—"`.

#### POST `/admin/eventos/{id}/marcar-presenca/`

Registra presença ou ausência. Ausência de participante com conta cria uma penalidade, se ainda não houver penalidade para o agendamento. Participantes manuais não recebem penalidade.

Body:

```json
{
  "presentes": [88],
  "ausentes": [89],
  "presentes_manuais": [15],
  "ausentes_manuais": [16]
}
```

Todos os campos são opcionais, assumem arrays vazios e, quando enviados, devem ser arrays.

Resposta `200`:

```json
{
  "mensagem": "Presença registrada. 1 presentes, 1 ausentes. 1 penalidade(s) criada(s).",
  "penalidades_criadas": 1
}
```

Aceita evento `publicado` ou `encerrado`; retorna `400` para outro status ou campos que não sejam listas.

#### GET `/admin/eventos/{id}/fila-historico/`

Retorna a fila ativa, agrupada por horário, e o histórico de agendamentos cancelados.

Resposta `200` contém:

- `evento`: `id`, `titulo`, `data` em `DD/MM/YYYY` e `status`.
- `horarios[]`: horário, total e participantes `aguardando`/`notificado`.
- `total_fila`: total de entradas ativas.
- `cancelamentos[]`: usuário, horário, `agendado_em` e `cancelado_em`.
- `total_cancelamentos`: quantidade de cancelamentos.

Cada participante da fila possui `id`, `posicao`, `status`, `nome`, `email`, `ramal`, `matricula`, `departamento`, `criado_em`, `notificado_em` e `expira_em`.

#### GET `/admin/eventos/{id}/exportar-csv/`

Baixa os agendamentos confirmados do evento.

Resposta `200`:

```http
Content-Type: text/csv
Content-Disposition: attachment; filename="Titulo_do_Evento.csv"
```

Colunas: `Nome`, `E-mail`, `Matrícula`, `Departamento`, `Horário Início`, `Horário Fim` e `Status`. Participantes manuais não são incluídos nesse CSV.

### Agendamentos administrativos

| Método | Endpoint | Descrição |
| --- | --- | --- |
| `GET` | `/admin/agendamentos/` | Lista todos os agendamentos. |
| `GET` | `/admin/agendamentos/{id}/` | Detalha um agendamento. |

Filtros opcionais da listagem:

| Parâmetro | Tipo | Valores/uso |
| --- | --- | --- |
| `evento_id` | inteiro | ID do evento. |
| `status` | string | `confirmado` ou `cancelado`. |

Resposta `200`: objeto ou array de agendamentos. Não há paginação nem endpoints administrativos de criação, edição ou exclusão de agendamento.

### Penalidades

| Método | Endpoint | Descrição |
| --- | --- | --- |
| `GET` | `/admin/penalidades/` | Lista penalidades. |
| `GET` | `/admin/penalidades/{id}/` | Detalha penalidade. |
| `POST` | `/admin/penalidades/{id}/revogar/` | Revoga manualmente. |

Filtros opcionais: `ativa=true|false` e `usuario_id=<id>`.

Contrato de penalidade:

```json
{
  "id": 5,
  "usuario": {},
  "ativa": true,
  "evento_origem_titulo": "Evento anterior",
  "evento_punicao_titulo": null,
  "evento_punicao_status": null,
  "criada_em": "2026-07-14T10:30:00-03:00",
  "revogada_em": null,
  "motivo_revogacao": ""
}
```

Body de revogação:

```json
{
  "motivo": "Ausência justificada"
}
```

`motivo` pode ser vazio. A revogação retorna `200` com a penalidade atualizada ou `400` se ela já estiver inativa. Antes das consultas, o backend encerra eventos expirados e libera penalidades cujo evento de punição já encerrou.

### Comunicados

Valores de `status`: `agendado`, `enviando`, `enviado`, `falhou` e `cancelado`.

#### GET `/admin/comunicados/`

Lista o histórico com paginação própria.

| Parâmetro | Padrão | Regra |
| --- | --- | --- |
| `page` | `1` | Mínimo 1; inválido volta ao padrão. |
| `page_size` | `10` | Mínimo 1, máximo 50. |
| `q` | vazio | Com 2+ caracteres, busca em assunto e nome do remetente. |
| `status` | vazio | Filtra apenas se for um status válido. |

Resposta `200`:

```json
{
  "count": 25,
  "page": 1,
  "page_size": 10,
  "total_pages": 3,
  "results": [
    {
      "id": 9,
      "assunto": "Comunicado",
      "enviado_por": "Administrador",
      "status": "enviado",
      "status_label": "Enviado",
      "agendado_para": null,
      "agendado_para_formatado": null,
      "enviado_em": "14/07/2026 as 10:30",
      "cancelado_em": null,
      "total_destinatarios": 1,
      "tentativas_envio": 0,
      "erro_envio": ""
    }
  ]
}
```

A listagem não inclui `corpo_html`.

#### POST `/admin/comunicados/`

Envia ou agenda um novo comunicado.

```json
{
  "assunto": "Comunicado",
  "corpo_html": "<p>Conteúdo</p>",
  "modo_envio": "agendado",
  "agendado_para": "2026-07-20T15:00:00-03:00"
}
```

`assunto` e `corpo_html` são obrigatórios. `modo_envio` aceita `imediato` ou `agendado` e assume `imediato`. Agendamento exige date-time válido pelo menos 5 minutos no futuro.

Retorna `201` com o comunicado e, no envio imediato, `total_enviado`. Falhas de configuração ou envio retornam `500` sem expor o detalhe interno.

#### GET `/admin/comunicados/{id}/`

Retorna o comunicado completo, incluindo `corpo_html`. Respostas: `200` ou `404`.

#### PUT `/admin/comunicados/{id}/`

Atualiza comunicado não enviado. Usa o mesmo body da criação. Se `modo_envio` for omitido, assume `agendado` neste endpoint.

- Comunicados `enviando` ou `enviado` não podem ser alterados (`400`).
- Um comunicado cancelado ou com falha pode ser reagendado ou enviado imediatamente.
- Retorna `200`, `400`, `404` ou `500`.
- Não existe `PATCH` para comunicados.

#### DELETE `/admin/comunicados/{id}/`

Cancela logicamente um comunicado `agendado`, alterando seu status para `cancelado`. Retorna `200` com o objeto atualizado.

Não há exclusão física. Outros estados retornam `400`; ID inexistente retorna `404`.

## Endpoints de superadmin e LDAP

Estes endpoints exigem JWT e `is_superuser = true`.

### GET `/admin/ldap/buscar/?q={termo}`

Pesquisa no LDAP real ou mock configurado por nome, e-mail, matrícula ou departamento. `q` é obrigatório e deve ter pelo menos 2 caracteres.

Resposta `200`:

```json
[
  {
    "email": "usuario@aeb.gov.br",
    "nome": "Nome do Usuário",
    "matricula": "123456",
    "departamento": "CTI",
    "no_sistema": true,
    "is_admin": false,
    "is_superuser": false
  }
]
```

Retorna `400` para termo curto.

### POST `/admin/ldap/promover/`

Cria o usuário local, se necessário, e concede `is_admin`/`is_staff`.

Body:

```json
{
  "email": "usuario@aeb.gov.br",
  "nome": "Nome do Usuário",
  "matricula": "123456",
  "departamento": "CTI"
}
```

`email` e `nome` são obrigatórios. Retorna `201` quando cria ou `200` quando atualiza um usuário existente. No backend mock, um usuário recém-criado recebe a senha local definida pela implementação de desenvolvimento; isso não deve ser usado em produção.

### POST `/admin/ldap/revogar/{usuario_id}/`

Remove `is_admin` e `is_staff`. Não possui body. Retorna `200`, `404` para usuário inexistente ou `400` ao tentar revogar um superadmin.

### GET `/admin/ldap/admins/`

Lista usuários com `is_admin = true`, ordenados pelo nome. Retorna array de usuários, sem paginação.

## Documentação OpenAPI

As rotas abaixo só existem quando `API_DOCS_ENABLED=True`:

| Método | Endpoint | Descrição |
| --- | --- | --- |
| `GET` | `/api/schema/` | Schema OpenAPI. |
| `GET` | `/api/docs/` | Swagger UI interativo. |
| `GET` | `/api/redoc/` | Redoc. |

Em desenvolvimento:

```text
http://localhost:8001/api/docs/
http://localhost:8001/api/redoc/
http://localhost:8001/api/schema/
```

As interfaces de documentação são públicas quando habilitadas. Em produção, mantenha-as desabilitadas ou protegidas por rede/VPN/proxy.

## Regras de negócio

### Ciclo do evento

- Novos eventos são criados diretamente como `publicado`.
- Um evento publicado passa automaticamente para `encerrado` após sua data e hora final quando determinadas rotas de consulta são executadas.
- Um evento publicado pode ser `cancelado` por ação administrativa.
- A ação `publicar` aceita evento cancelado, mas não aceita evento já publicado ou encerrado.
- Não é possível criar outro evento ou disparar divulgação enquanto houver presença pendente em evento encerrado.

### Geração de horários

- Os slots têm a duração de `duracao_sessao` e precisam caber integralmente no período do evento.
- Slots que se sobrepõem ao almoço, das 12:00 às 13:30, não são criados.
- Alterar data, início, fim, duração ou capacidade tenta regenerar os slots.
- Slots não são regenerados quando já possuem agendamentos associados.

### Reserva e concorrência

- Um usuário pode manter apenas um agendamento confirmado por evento.
- A criação e a confirmação de vaga usam bloqueio transacional para reduzir dupla ocupação.
- Participantes manuais contam na capacidade do horário.
- O OTP de acesso ao evento tem 6 dígitos e vale 10 minutos.
- O OTP de confirmação da reserva tem 4 dígitos e vale 5 minutos.
- Ambos limitam tentativas; o OTP de reserva é invalidado antes das demais validações da reserva e deve ser solicitado novamente se outra regra impedir a operação.

### Lista de espera

- Só é possível entrar em horário lotado.
- O usuário pode ter somente uma fila ativa por evento.
- Ao surgir vaga, o primeiro `aguardando` vira `notificado` e recebe link por e-mail.
- O código atual define 5 minutos em `expira_em` para a confirmação da vaga.
- Enquanto houver notificado dentro do prazo, a vaga fica reservada para ele.
- Se o prazo expirar ou a vaga já tiver sido ocupada, a entrada vira `expirado` e o próximo pode ser chamado.

### Cancelamento

- O colaborador só pode cancelar até 30 minutos antes do início de seu horário.
- O cancelamento altera o status; não exclui o registro.
- Uma vaga liberada aciona a notificação do próximo da fila.

### Presença e penalidade

- Presença começa como `null` e é definida pelo admin.
- Falta de participante autenticado cria penalidade vinculada ao agendamento.
- A penalidade bloqueia a reserva no próximo evento que o usuário tentar acessar.
- O primeiro evento tentado é registrado como `evento_punicao`.
- A penalidade é liberada automaticamente quando esse evento encerra ou pode ser revogada manualmente.

### Processamento agendado

O container `comunicados_scheduler` executa a cada 60 segundos os comandos que processam comunicados e e-mails de evento agendados. Portanto, o envio pode ocorrer até aproximadamente um ciclo depois do horário solicitado.

## Códigos de resposta e erros

| Código | Significado na API |
| --- | --- |
| `200 OK` | Consulta ou ação concluída. |
| `201 Created` | Usuário, evento, agendamento, participante, entrada de fila ou comunicado criado. |
| `204 No Content` | Exclusão concluída sem body. |
| `400 Bad Request` | JSON/campo inválido ou regra de negócio não atendida. |
| `401 Unauthorized` | Credencial ausente/inválida em fluxo de login, palavra-chave ou OTP incorreto. |
| `403 Forbidden` | Perfil insuficiente, penalidade ou bloqueio pela própria fila. |
| `404 Not Found` | Recurso, evento, colaborador ou token não encontrado. |
| `409 Conflict` | Conflito de estado, presença pendente, reserva concorrente ou duplicidade lógica. |
| `410 Gone` | Evento público encerrado ou cancelado. |
| `429 Too Many Requests` | Throttle ou limite de tentativas atingido. |
| `500 Internal Server Error` | Configuração ausente ou falha interna/de envio. |
| `503 Service Unavailable` | Falha ao enviar OTP por e-mail. |

Clientes devem aceitar tanto `erro` quanto `detail` e também erros de campos do DRF. Não use o texto da mensagem como identificador estável; quando existir, prefira `codigo` ou os sinalizadores booleanos.

## Configuração

Variáveis diretamente relacionadas à API:

```env
# Django e exposição
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
API_DOCS_ENABLED=True

# Throttling
PUBLIC_AUTH_THROTTLE_RATE=20/minute
PUBLIC_READ_THROTTLE_RATE=60/minute

# Banco e cache
DB_NAME=sis_bem_estar
DB_USER=postgres
DB_PASSWORD=sua-senha
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://redis:6379/1

# E-mail e links
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.exemplo
EMAIL_PORT=587
EMAIL_HOST_USER=usuario
EMAIL_HOST_PASSWORD=senha
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=Agenda Bem-Estar <noreply@aeb.gov.br>
EMAIL_DESTINO_EVENTO=lista@aeb.gov.br
FRONTEND_URL=http://localhost:5173

# Navegador
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Evento e LDAP
EVENTO_MAX_MESES_FUTURO=6
USUARIO_BUSCA_BACKEND=mock
LDAP_HOST=ldap.aeb.gov.br
LDAP_PORT=389
LDAP_BIND_DN=
LDAP_BIND_PASSWORD=
LDAP_BASE_DN=OU=USUARIOS,OU=AEB,DC=aeb,DC=gov,DC=br
LDAP_SKIP_AD_CHECK=False
```

Quando `REDIS_URL` não é informado, o backend usa cache local em memória. Em uma implantação com múltiplos processos, Redis é necessário para que OTPs sejam compartilhados de forma consistente entre workers.

## Exemplos de integração

### cURL — login e dashboard

```bash
curl -X POST "http://localhost:8001/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aeb.gov.br","password":"senha"}'

curl "http://localhost:8001/api/admin/dashboard/" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### cURL — fluxo de reserva

```bash
curl -X POST "http://localhost:8001/api/colaborador/horarios/31/solicitar-otp/" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reenviar":false}'

curl -X POST "http://localhost:8001/api/colaborador/eventos/7/horarios/31/reservar/" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"otp":"1234","alterar":false}'
```

### PowerShell — login

```powershell
$baseUrl = 'http://localhost:8001/api'
$login = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login/" `
  -ContentType 'application/json' `
  -Body (@{ email = 'admin@aeb.gov.br'; password = 'senha' } | ConvertTo-Json)

$headers = @{ Authorization = "Bearer $($login.access)" }
Invoke-RestMethod -Uri "$baseUrl/admin/dashboard/" -Headers $headers
```

### JavaScript — cliente mínimo

```javascript
const API_URL = 'http://localhost:8001/api';

async function api(path, options = {}) {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(data?.erro ?? data?.detail ?? `HTTP ${response.status}`);
  }
  return data;
}
```

## Validação e testes

Com o Docker em execução:

```powershell
docker exec sis_bem_estar_backend python manage.py check
docker exec sis_bem_estar_backend python manage.py spectacular --validate --file /tmp/schema.yaml
docker exec sis_bem_estar_backend python manage.py test backend.tests
```

Verificações HTTP básicas:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:8001/api/docs/
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:8001/api/schema/
```

Resultados esperados:

- `200` para Swagger/schema quando `API_DOCS_ENABLED=True`.
- `401` para rota protegida sem token.
- `401` para login com credenciais inválidas.
- `403` para JWT válido sem o perfil exigido.

## Fontes de implementação

Esta documentação deriva principalmente de:

- `backend/core/urls.py` e `backend/urls/urls.py` — registro das rotas.
- `backend/views/` — autenticação, permissões, regras e respostas.
- `backend/serializers/` — contratos de entrada e saída.
- `backend/models/` e `backend/services/` — estados e regras de negócio.
- `backend/core/settings.py` — JWT, CORS, throttling, cache e OpenAPI.
- `docker-compose.yml` — portas e processamento agendado.

Em caso de divergência futura, a implementação e o schema OpenAPI gerado pela versão implantada são a fonte de verdade operacional.
