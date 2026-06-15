# Registro de Alteracoes: Agendamento de Comunicados

Data: 12/06/2026
Branch: `feature/agendamento-comunicados`

## Objetivo do Registro

Documentar quais arquivos foram criados ou alterados durante o estudo da funcionalidade de agendamento de comunicados, o que mudou em cada um e o motivo da mudanca.

## Arquivos Alterados Nesta Etapa

### `estudo-comunicados-agendados.md`

Status: novo arquivo.

O que foi criado:

- Documento de estudo de caso para a funcionalidade de agendamento de comunicados.
- Levantamento do funcionamento atual do envio de comunicados.
- Lista de regras de negocio que precisam ser confirmadas com o admin.
- Registro das decisoes ja confirmadas pelo usuario.
- Comparacao das opcoes tecnicas para executar envios automaticos.
- Proposta inicial de implementacao.
- Lista de complicacoes tecnicas e pontos de atencao.

Por que foi criado:

- Para registrar as decisoes antes de iniciar desenvolvimento.
- Para evitar ambiguidades sobre envio recorrente, multiplas datas ou automacao repetitiva.
- Para deixar claro que a necessidade e apenas agendar um disparo unico definido manualmente pelo admin.
- Para apoiar validacao com pessoas leigas e donos da regra antes da implementacao.

Principais decisoes registradas:

- Nao havera envio recorrente.
- Nao havera repeticao automatica.
- Cada comunicado agendado tera apenas um disparo.
- O admin define manualmente o dia e horario de cada envio.
- O objetivo e permitir preparacao antecipada e evitar imprevistos no horario correto do disparo.
- Se precisar enviar novamente, o admin cria outro comunicado ou reutiliza um antigo como base para novo agendamento.

## Documento Criado Para Controle

### `registro-alteracoes-agendamento-comunicados.md`

Status: novo arquivo.

O que foi criado:

- Este registro de alteracoes.
- Resumo dos arquivos impactados.
- Explicacao simples do que mudou e por que mudou.

Por que foi criado:

- Para facilitar teste, revisao e acompanhamento da feature.
- Para separar as alteracoes do estudo das demais alteracoes locais existentes no repositorio.

## Arquivos Alterados na Implementacao Inicial

### `backend/models/models.py`

Status: alterado nesta feature.

O que foi alterado:

- Modelo `Comunicado` passou a ter status de ciclo de vida.
- Foram adicionados campos para agendamento, envio, cancelamento, erro e tentativas.
- `enviado_em` passou a aceitar nulo, pois comunicado agendado ainda nao foi enviado.
- Ordenacao passou a usar `criado_em`.

Por que foi alterado:

- O sistema precisa diferenciar comunicado agendado, enviado, falho e cancelado.
- Um comunicado agendado precisa existir antes do disparo real.

### `backend/migrations/0013_comunicado_agendamento.py`

Status: novo arquivo.

O que foi criado:

- Migracao dos novos campos de `Comunicado`.
- Comunicados antigos permanecem como `status = enviado`.
- `criado_em` de comunicados antigos e preenchido com o `enviado_em` original quando existir.

Por que foi criado:

- Para atualizar o banco sem perder historico ja existente.

### `backend/views/admin/comunicado_view.py`

Status: alterado nesta feature.

O que foi alterado:

- API de comunicados passou a aceitar `modo_envio = imediato` ou `modo_envio = agendado`.
- Criacao de comunicado agendado nao dispara e-mail imediatamente.
- Validacao impede agendar para data/hora passada ou muito proxima.
- Edicao de comunicados ja enviados foi bloqueada para preservar historico.
- Exclusao de comunicado agendado passa a cancelar o agendamento sem remover o registro.

Por que foi alterado:

- Para suportar envio unico programado pelo admin.
- Para evitar historico inconsistente.

### `backend/management/commands/enviar_comunicados_agendados.py`

Status: novo arquivo.

O que foi criado:

- Comando Django que busca comunicados `agendado` com `agendado_para <= agora`.
- Marca o comunicado como `enviando`, dispara o e-mail e depois marca como `enviado`.
- Em caso de erro, marca como `falhou` e salva a mensagem do erro.

Por que foi criado:

- O Django web nao executa tarefas automaticamente em segundo plano.
- O sistema precisa de um processo periodico para disparar comunicados no horario programado.

### `backend/services/email_service.py`

Status: alterado nesta feature.

O que foi alterado:

- O envio HTML usado por comunicados deixou de engolir falhas silenciosamente.
- Falhas agora geram `ComunicadoEnvioError`.

Por que foi alterado:

- Para que o agendamento consiga registrar `falhou` quando o envio nao acontecer.

### `backend/tests/tests.py`

Status: alterado nesta feature.

O que foi alterado:

- Adicionados testes para:
  - agendar comunicado futuro sem envio imediato;
  - bloquear agendamento no passado;
  - processar comunicado vencido pelo comando;
  - cancelar comunicado agendado sem excluir.

Por que foi alterado:

- Para cobrir as regras principais do agendamento unico.

### `frontend/src/pages/admin/Comunicados.tsx`

Status: alterado nesta feature.

O que foi alterado:

- Tela passou a abrir modal para escolher "Enviar agora" ou "Agendar envio".
- Foram adicionados campos de data e horario.
- Datas/horarios invalidos sao bloqueados na interface.
- Historico passou a mostrar status do comunicado.
- Comunicado enviado pode ser usado como base para novo agendamento.

Por que foi alterado:

- Para permitir que o admin prepare o comunicado antes e defina manualmente o dia e horario do disparo.

### `docker-compose.yml` e `docker-compose.prod.yml`

Status: arquivos ja estavam modificados antes; esta feature adicionou novo servico neles.

O que foi alterado nesta feature:

- Adicionado servico `comunicados_scheduler`.
- O servico executa periodicamente `python manage.py enviar_comunicados_agendados`.

Por que foi alterado:

- Para manter um processo separado verificando comunicados agendados e disparando no horario correto.

Observacao:

Esses arquivos ja tinham alteracoes locais antes desta implementacao. Antes de commit, revisar o diff para separar o que e desta feature e o que ja existia.

## Alteracao Ja Commitada Antes Desta Branch

### `frontend/src/components/ModalDetalhesAgendamento.tsx`

Status: alteracao ja commitada e enviada para `develop` no commit `4619d29`.

O que foi alterado:

- Adicionada validacao visual para bloquear cancelamento de agendamento fora do prazo permitido.
- Adicionada mensagem informando que o cancelamento so e permitido ate 30 minutos antes do horario agendado.
- Botao de cancelamento passa a ficar desabilitado quando o prazo ja expirou.

Por que foi alterado:

- O backend ja retornava erro `400 Bad Request` quando o usuario tentava cancelar fora do prazo.
- A tela nao explicava isso antes da tentativa.
- A mudanca evita um POST desnecessario e mostra a regra ao usuario antes do erro.

## Arquivos Locais Modificados Antes Deste Estudo

Os arquivos abaixo aparecem como modificados no `git status`, mas nao foram iniciados por esta etapa:

- `atualizacao-v1.md`
- `frontend/vite.config.ts`

Observacao:

Esses arquivos devem ser revisados separadamente antes de qualquer commit, para evitar misturar alteracoes nao relacionadas com a feature de agendamento de comunicados.

## Proximo Passo Recomendado

## Validacoes Executadas

Executado com sucesso:

- `python manage.py check`
- `python manage.py makemigrations --check --dry-run`
- `python -m py_compile` nos arquivos Python alterados

Validacao bloqueada pelo ambiente:

- Testes Django de banco nao rodaram porque o `DB_HOST=db` so resolve dentro do Docker e nao havia Postgres local em `localhost:5432`.
- Build do frontend nao rodou porque `node`/`npm` nao estao disponiveis no PATH deste ambiente.

Comando de teste que deve ser executado em ambiente com banco ativo:

`python manage.py test backend.tests.tests.AdminComunicadoAgendamentoTest`

## Proximo Passo Recomendado

Antes de finalizar a implementacao, validar com o admin/dono da regra:

- quem recebe o comunicado;
- se "Enviar agora" continua existindo;
- margem minima para agendar;
- limite maximo de data futura;
- se pode enviar em fim de semana, feriado e fora do horario comercial;
- quem pode criar, editar e cancelar;
- o que acontece se o envio falhar;
- o que acontece se o sistema estiver fora do ar no horario agendado.
