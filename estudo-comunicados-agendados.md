# Estudo de Caso: Agendamento de Comunicados

Data do levantamento: 12/06/2026

## Objetivo

Implementar no modulo de Comunicados a possibilidade de criar um comunicado e definir uma data e horario futuro para envio automatico, parecido com o agendamento de envio do Outlook.

Este documento registra as regras que precisam ser decididas antes do desenvolvimento, o funcionamento esperado para usuarios leigos e as tecnologias que o sistema ainda nao possui para executar envios automaticos.

## Situacao Atual do Sistema

Hoje o envio de comunicados funciona de forma imediata:

1. O administrador acessa a tela de Comunicados.
2. Preenche assunto e mensagem.
3. Clica em "Enviar Comunicado".
4. O frontend chama `POST /api/admin/comunicados/`.
5. O backend envia o e-mail na mesma hora.
6. O comunicado e salvo no historico com data de envio.

Arquivos principais envolvidos hoje:

- `frontend/src/pages/admin/Comunicados.tsx`
- `frontend/src/components/EditorComunicado.tsx`
- `backend/views/admin/comunicado_view.py`
- `backend/models/models.py`
- `backend/services/email_service.py`

Ponto importante: a tela informa que o comunicado vai para todos os colaboradores ativos, mas o backend envia para a lista configurada em `EMAIL_DESTINO_EVENTO`. Esta regra precisa ser confirmada antes da implementacao.

## Regra Principal Desejada

O administrador deve conseguir criar ou editar um comunicado, escolher uma data e horario futuros, e o sistema deve enviar automaticamente esse comunicado quando chegar o momento programado.

Regra confirmada pelo usuario:

Nao deve existir envio repetitivo ou recorrente. Para cada evento ou necessidade de comunicacao, o administrador deve entrar no sistema, organizar a mensagem e programar manualmente o dia e o horario daquele envio.

O objetivo nao e automatizar uma mensagem para se repetir varias vezes. O objetivo e permitir que o admin prepare o comunicado com antecedencia e evite imprevistos, como atraso, problema de internet ou indisponibilidade no momento em que o e-mail precisa sair.

Exemplo:

1. Admin cria o comunicado em 12/06/2026.
2. Define envio para 13/06/2026 as 08:00.
3. O sistema salva o comunicado como agendado.
4. Em 13/06/2026 as 08:00, o sistema dispara o e-mail automaticamente.
5. Depois do envio, o comunicado muda para enviado.

Fora de escopo:

- envio recorrente;
- repeticao automatica semanal, mensal ou por evento;
- multiplas datas no mesmo comunicado;
- regra automatica baseada em tipo de evento.

## Fluxo Sugerido Para o Usuario

1. Admin abre a tela de Comunicados.
2. Clica em "Novo Comunicado".
3. Preenche o assunto.
4. Preenche a mensagem.
5. Clica no botao de envio.
6. O sistema abre um modal.
7. No modal, o admin escolhe:
   - enviar agora; ou
   - agendar envio.
8. Se escolher agendar, informa data e horario.
9. O sistema mostra uma confirmacao com o resumo.
10. Admin confirma.
11. O comunicado fica salvo como agendado.

## Regras de Negocio a Confirmar

Estas perguntas devem ser respondidas pelo admin/dono da regra antes do desenvolvimento.

### 1. Destinatarios

Pergunta para o admin:

"Quem deve receber os comunicados?"

Opcoes:

- Lista configurada no sistema, como hoje (`EMAIL_DESTINO_EVENTO`).
- Todos os usuarios ativos cadastrados no sistema.
- Apenas grupos ou setores especificos.

Decisao pendente: confirmar se o comportamento atual sera mantido.

### 2. Envio imediato

Pergunta:

"O sistema deve continuar permitindo enviar o comunicado na hora?"

Opcoes:

- Sim, manter "Enviar agora" e adicionar "Agendar envio".
- Nao, todo comunicado deve obrigatoriamente ter data e horario.

Recomendacao: manter as duas opcoes.

### 3. Bloqueio de data e horario passados

Regra recomendada:

O sistema nao pode permitir agendar comunicado para data ou horario que ja passou.

Exemplos:

- Hoje e 02/06/2026. O sistema nao permite agendar para 01/05/2026.
- Hoje e 02/06/2026 as 14:00. O sistema nao permite agendar para 02/06/2026 as 13:00.

Esta regra deve existir no frontend e no backend.

### 4. Margem minima para agendamento

Pergunta:

"Pode agendar para daqui a poucos segundos ou precisa ter uma margem minima?"

Recomendacao:

Permitir agendamento somente para pelo menos 5 minutos no futuro.

Motivo: evita problemas de diferenca de relogio entre navegador, backend e processo automatico.

### 5. Limite maximo no futuro

Pergunta:

"Ate quanto tempo no futuro o admin pode agendar um comunicado?"

Opcoes:

- Sem limite.
- Ate 3 meses.
- Ate 6 meses.
- Ate 1 ano.

Recomendacao inicial: ate 6 meses ou 1 ano, conforme regra administrativa.

### 6. Dias e horarios permitidos

Pergunta:

"Pode enviar comunicado em fim de semana, feriado ou fora do horario comercial?"

Opcoes:

- Pode enviar em qualquer dia e horario futuro.
- Somente dias uteis.
- Somente horario comercial.

Decisao pendente.

### 7. Edicao antes do envio

Pergunta:

"Enquanto o comunicado estiver agendado, o admin pode editar assunto, mensagem, data e horario?"

Recomendacao:

Sim. Enquanto o status for agendado, o admin pode editar o comunicado.

### 8. Edicao depois do envio

Pergunta:

"Depois que o comunicado ja foi enviado, o admin pode alterar o mesmo registro?"

Risco:

Se alterar o mesmo registro enviado, o historico perde confiabilidade.

Recomendacao:

Comunicado enviado nao deve ser sobrescrito. Para reutilizar, o admin pode abrir o comunicado antigo, editar o conteudo e agendar novamente, mas o sistema deve criar um novo registro/agendamento mantendo o historico anterior.

### 9. Cancelamento

Pergunta:

"O admin pode cancelar um comunicado que ainda nao foi enviado?"

Recomendacao:

Sim. Comunicados agendados podem ser cancelados antes do envio.

Ponto a definir:

- O cancelado continua aparecendo no historico?
- Ou some da lista?

Recomendacao: manter no historico com status cancelado.

### 10. Falha no envio

Pergunta:

"Se o envio falhar, o sistema deve fazer o que?"

Opcoes:

- Marcar como falhou e o admin tenta manualmente.
- Tentar reenviar automaticamente algumas vezes.
- Avisar algum administrador por e-mail.

Recomendacao inicial:

Marcar como falhou, registrar o erro e permitir "tentar novamente".

### 11. Sistema fora do ar no horario agendado

Pergunta:

"Se o sistema estiver desligado no horario programado e voltar depois, deve enviar atrasado?"

Opcoes:

- Enviar assim que o sistema voltar.
- Nao enviar mais e marcar como falhou/expirado.

Recomendacao:

Enviar assim que voltar, desde que ainda esteja dentro de uma janela aceitavel. Essa janela precisa ser definida.

Exemplo de regra:

Se atrasar ate 24 horas, envia ao voltar. Se passar de 24 horas, marca como falhou/expirado.

### 12. Permissao

Pergunta:

"Quem pode criar, editar, cancelar e reagendar comunicados?"

Opcoes:

- Qualquer admin.
- Apenas superadmin.
- Somente o admin que criou o comunicado.

Decisao pendente.

### 13. Auditoria

Pergunta:

"Precisa registrar quem criou, quem editou, quem cancelou e quem enviou?"

Recomendacao:

Sim, pelo menos:

- criado por;
- criado em;
- atualizado por;
- atualizado em;
- cancelado por;
- cancelado em;
- enviado por;
- enviado em.

## Status Sugeridos

Para controlar o ciclo de vida do comunicado:

- `rascunho`: comunicado salvo, mas ainda sem envio definido.
- `agendado`: comunicado com data/hora futura.
- `enviando`: processo automatico iniciou o envio.
- `enviado`: envio concluido.
- `falhou`: envio tentou executar e falhou.
- `cancelado`: agendamento cancelado antes do envio.

Para primeira versao, pode-se simplificar:

- `agendado`
- `enviando`
- `enviado`
- `falhou`
- `cancelado`

## Tecnologias Que o Sistema Ainda Nao Possui

Hoje o sistema nao possui um executor de tarefas automaticas em segundo plano.

O backend Django responde requisicoes HTTP, mas nao existe um processo separado verificando periodicamente:

"Existe algum comunicado agendado para enviar agora?"

Para essa funcionalidade, sera necessario adicionar algum mecanismo de agendamento.

## Opcoes Tecnicas

### Opcao A: Django Management Command com Loop no Docker

Criar um comando Django, por exemplo:

`python manage.py enviar_comunicados_agendados`

Esse comando buscaria comunicados com status `agendado` e `agendado_para <= agora`, enviaria o e-mail e atualizaria o status.

No Docker, poderiamos criar um servico separado rodando em loop:

`while true; do python manage.py enviar_comunicados_agendados; sleep 60; done`

Vantagens:

- Mais simples.
- Poucas dependencias novas.
- Usa o banco atual.
- Bom para comecar apenas com comunicados.

Desvantagens:

- Menos robusto que Celery.
- Controle de retry precisa ser feito manualmente.
- Pode atrasar ate 1 minuto, conforme intervalo do loop.

Recomendacao para primeira versao: esta opcao e suficiente.

### Opcao B: Celery com Redis

Adicionar Celery ao projeto.

O sistema ja possui Redis no Docker, entao o Redis poderia ser usado como broker de tarefas.

Componentes novos:

- pacote `celery` em `backend/requirements.txt`;
- arquivo de configuracao Celery no Django;
- worker Celery;
- Celery Beat ou outra estrategia para tarefas periodicas;
- novos servicos no `docker-compose.yml` e `docker-compose.prod.yml`.

Vantagens:

- Solucao mais profissional para tarefas assicronas.
- Melhor para retries, filas e crescimento futuro.
- Reaproveitavel para outros envios automaticos.

Desvantagens:

- Mais complexidade operacional.
- Mais processos para monitorar.
- Mais configuracao em producao.

Recomendacao:

Usar Celery se o sistema tambem for evoluir para lembretes, filas, disparos em massa, relatorios automaticos e outros processos assicronos.

### Opcao C: Cron Externo no Servidor

Configurar um cron no servidor para rodar o comando Django a cada minuto.

Vantagens:

- Simples se o servidor ja usa cron.
- Nao exige Celery.

Desvantagens:

- Depende da infraestrutura fora do repositorio.
- Mais dificil de versionar e reproduzir em Docker.
- Pode ser esquecido em homologacao/producao.

Recomendacao:

Evitar como solucao principal, a menos que a infraestrutura da AEB prefira cron.

## Recomendacao Tecnica Inicial

Para a primeira versao do agendamento de comunicados:

1. Criar campos novos no modelo `Comunicado`.
2. Criar migracao.
3. Adaptar API para aceitar `enviar agora` ou `agendar envio`.
4. Criar comando Django para processar comunicados agendados.
5. Criar um servico separado no Docker para rodar o comando periodicamente.
6. Adaptar a tela de Comunicados com modal de data/hora.
7. Adicionar testes de backend.

Esta abordagem evita introduzir Celery agora e permite entregar a funcionalidade com menor risco.

## Campos Provaveis no Banco

No modelo `Comunicado`, adicionar ou ajustar:

- `status`
- `agendado_para`
- `enviado_em` permitindo nulo
- `criado_em`
- `atualizado_em`
- `criado_por`
- `atualizado_por`
- `cancelado_por`
- `cancelado_em`
- `erro_envio`
- `tentativas_envio`

Observacao:

Os comunicados antigos que ja existem devem ser migrados para `status = enviado`.

## Mudancas Provaveis na API

### Criar comunicado

`POST /api/admin/comunicados/`

Payload exemplo para envio imediato:

```json
{
  "assunto": "Campanha de vacinacao",
  "corpo_html": "<p>Texto do comunicado</p>",
  "modo_envio": "imediato"
}
```

Payload exemplo para envio agendado:

```json
{
  "assunto": "Campanha de vacinacao",
  "corpo_html": "<p>Texto do comunicado</p>",
  "modo_envio": "agendado",
  "agendado_para": "2026-06-13T08:00:00-03:00"
}
```

### Atualizar comunicado agendado

`PUT /api/admin/comunicados/<id>/`

Permitido apenas para comunicados ainda nao enviados.

### Cancelar comunicado agendado

Possivel endpoint:

`POST /api/admin/comunicados/<id>/cancelar/`

### Reutilizar comunicado antigo

Possivel endpoint ou acao:

`POST /api/admin/comunicados/<id>/reutilizar/`

Tambem pode ser feito no frontend: carregar os dados do comunicado antigo e criar um novo `POST`.

## Mudancas Provaveis na Tela

Na tela de Comunicados:

- botao "Novo Comunicado";
- formulario de assunto e mensagem;
- botao principal abre modal de envio;
- modal com opcoes "Enviar agora" e "Agendar envio";
- calendario bloqueando datas passadas;
- campo de horario;
- resumo antes de confirmar;
- lista/historico mostrando status.

Acoes por status:

- `agendado`: editar, cancelar, enviar agora.
- `enviado`: visualizar, reutilizar.
- `falhou`: tentar novamente, editar e reagendar.
- `cancelado`: visualizar, reutilizar.

## Complicacoes Tecnicas Importantes

### 1. Evitar envio duplicado

Se dois processos tentarem enviar o mesmo comunicado ao mesmo tempo, pode ocorrer duplicidade.

Solucao:

Usar transacao no banco e travar o registro durante o processamento, por exemplo com `select_for_update`.

### 2. Falha silenciosa de e-mail

Hoje parte do envio usa `fail_silently=True` e captura excecoes sem propagar erro.

Para agendamento, isso precisa ser revisto. O sistema precisa saber se o envio falhou para marcar o comunicado como `falhou`.

### 3. Horario e fuso

O projeto usa:

- `TIME_ZONE = America/Sao_Paulo`
- `USE_TZ = True`

A tela deve mostrar horario de Brasilia e o backend deve salvar datas de forma consistente.

### 4. Envio atrasado

Se o processo automatico rodar a cada 1 minuto, o envio pode ocorrer com pequeno atraso.

Regra a definir:

O admin aceita atraso de ate 1 ou 2 minutos?

### 5. Historico confiavel

Comunicados enviados nao devem perder data original de envio.

Recomendacao:

Ao reutilizar comunicado antigo, criar novo registro mantendo o antigo no historico.

## Proposta de Primeira Versao

Escopo recomendado para a primeira entrega:

1. Admin cria comunicado.
2. Admin escolhe "Enviar agora" ou "Agendar envio".
3. Sistema bloqueia data/hora passada.
4. Sistema salva comunicado com status `agendado`.
5. Processo automatico envia comunicados vencidos.
6. Historico mostra status.
7. Admin pode editar ou cancelar comunicados agendados.
8. Admin pode reutilizar comunicados enviados criando um novo agendamento.

Regra fechada para esta funcionalidade:

Cada comunicado agendado tera apenas um disparo programado. Se o admin precisar enviar outro comunicado em outra data, ele deve criar um novo comunicado ou reutilizar um comunicado antigo como base para um novo agendamento.

Fora da primeira versao:

- envio recorrente ou repetitivo;
- multiplas datas para o mesmo comunicado;
- envio automatico baseado em calendario de eventos;
- segmentacao por setor;
- anexos;
- aprovacao por outro admin;
- painel avancado de auditoria;
- Celery, se a opcao inicial for command com loop.

## Decisoes Pendentes Antes de Desenvolver

Checklist para validar com o admin:

- [ ] Quem recebe o comunicado?
- [ ] Envio imediato continua existindo?
- [ ] Qual a margem minima para agendar?
- [ ] Existe limite maximo de data futura?
- [ ] Pode enviar em fim de semana, feriado e fora do horario comercial?
- [ ] Quem pode criar, editar e cancelar?
- [ ] Comunicados cancelados ficam no historico?
- [ ] Comunicados enviados podem ser reutilizados criando novo envio?
- [ ] O que fazer quando o envio falhar?
- [ ] O que fazer se o sistema voltar depois do horario agendado?
- [ ] Qual atraso maximo aceitavel no disparo?
- [ ] Homologacao envia para lista real ou lista de teste?

Decisoes ja confirmadas:

- [x] Nao havera envio recorrente.
- [x] O admin define manualmente dia e horario de cada envio.
- [x] O objetivo e permitir organizacao antecipada e evitar imprevistos no horario do disparo.

## Decisao Tecnica Recomendada Neste Momento

Para comecar com baixo risco:

- usar um command Django para processar comunicados agendados;
- rodar esse command em um servico separado no Docker;
- manter Celery como evolucao futura;
- ajustar o servico de e-mail para retornar erro real quando falhar;
- preservar historico criando novo registro ao reutilizar comunicado antigo.
