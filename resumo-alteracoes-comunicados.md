# Resumo Curto: Agendamento de Comunicados

Data: 15/06/2026
Branch: `feature/agendamento-comunicados`

## Arquivos Alterados

### `backend/models/models.py`

Onde: modelo `Comunicado`.

O que mudou:

- adicionados status: `agendado`, `enviando`, `enviado`, `falhou`, `cancelado`;
- adicionados campos de agendamento, erro, tentativas e datas de controle;
- `enviado_em` agora pode ficar vazio enquanto o comunicado ainda nao foi enviado.

### `backend/migrations/0013_comunicado_agendamento.py`

Onde: migracao nova.

O que mudou:

- cria os novos campos do modelo `Comunicado`;
- mantem comunicados antigos como `enviado`;
- preserva o historico usando `enviado_em` como base para `criado_em`.

### `backend/views/admin/comunicado_view.py`

Onde: API de comunicados.

O que mudou:

- `POST /admin/comunicados/` agora aceita envio imediato ou agendado;
- bloqueia agendamento em data/hora passada;
- bloqueia edicao de comunicado ja enviado;
- `DELETE` de comunicado agendado cancela em vez de apagar.

### `backend/management/commands/enviar_comunicados_agendados.py`

Onde: comando Django novo.

O que mudou:

- busca comunicados vencidos;
- envia o e-mail;
- muda status para `enviado` ou `falhou`.

### `backend/services/email_service.py`

Onde: envio HTML de e-mails.

O que mudou:

- falhas de envio deixam de ser silenciosas;
- erro passa a ser propagado para o comunicado poder ficar como `falhou`.

### `frontend/src/pages/admin/Comunicados.tsx`

Onde: tela de Comunicados.

O que mudou:

- botao abre modal de envio;
- admin escolhe `Enviar agora` ou `Agendar envio`;
- adicionados campos de data e horario;
- historico mostra status;
- comunicado enviado pode ser usado como base para novo agendamento.

### `docker-compose.yml`

Onde: servicos Docker de desenvolvimento.

O que mudou:

- adicionado `comunicados_scheduler`;
- roda `python manage.py enviar_comunicados_agendados` a cada 60 segundos.

### `docker-compose.prod.yml`

Onde: servicos Docker de producao.

O que mudou:

- adicionado `comunicados_scheduler`;
- processa comunicados agendados em segundo plano.

### `backend/tests/tests.py`

Onde: testes backend.

O que mudou:

- testes para agendar futuro;
- bloquear passado;
- enviar pelo comando;
- cancelar agendamento.

### Documentos

Arquivos:

- `estudo-comunicados-agendados.md`
- `registro-alteracoes-agendamento-comunicados.md`

O que mudou:

- registram regras, decisoes e detalhes da implementacao.

## Fora do Escopo Desta Feature

Arquivos que aparecem modificados, mas nao foram tratados como parte principal desta implementacao:

- `atualizacao-v1.md`
- `frontend/vite.config.ts`
- `.vscode/settings.json`
