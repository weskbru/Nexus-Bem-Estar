# Resumo - Agendamento de envio de eventos

## Criados

- `backend/migrations/0014_evento_agendamento_emails.py`
  - Adiciona campos de controle do envio de e-mails do evento.
  - Marca eventos que ja tinham `emails_enviados_em` como `enviado`.

- `backend/management/commands/enviar_emails_eventos_agendados.py`
  - Processa eventos com envio agendado vencido.
  - Envia o e-mail, marca como `enviado` ou registra falha.

## Alterados

- `backend/models/models.py`
  - Adiciona status, data/hora agendada, tentativas e erro do envio de e-mails do evento.

- `backend/views/admin/evento_viewset.py`
  - Endpoint `enviar-emails` passa a aceitar envio imediato ou agendado.
  - Valida que o agendamento fique no futuro.
  - Centraliza montagem e envio do e-mail do evento.

- `docker-compose.yml` e `docker-compose.prod.yml`
  - Scheduler tambem executa `enviar_emails_eventos_agendados`.

- `frontend/src/services/api.ts`
  - DTO de evento recebe campos de agendamento.
  - `enviarEmails` aceita `modo_envio` e `agendado_para`.

- `frontend/src/pages/admin/NovoEvento.tsx`
  - Tela de criacao ganha tres acoes: criar evento, criar e enviar agora, criar e agendar envio.
  - Modal permite escolher data e horario do envio.

- `frontend/src/pages/admin/EventosAgendadosCards.tsx`
  - Card mostra quando o envio de convite esta agendado.
  - Evita mostrar botao de envio imediato enquanto houver agendamento ativo.

- `backend/tests/tests.py`
  - Atualiza testes do envio de evento para a lista configurada.
  - Adiciona cobertura para agendamento futuro, bloqueio de data passada e processamento do comando.

## Validacoes

- `python manage.py check`: OK com `DEBUG=True` no processo.
- `python manage.py makemigrations --check --dry-run`: OK, sem novas migrations.
- Teste focado de evento nao executou localmente porque o banco esta configurado como host `db`, disponivel apenas no Docker/VM.
- Build frontend nao executou localmente porque `node`/`npm` nao estao no PATH.
