# Operacao da VM e Docker

## 1. Objetivo do documento

Este documento orienta a verificacao semanal da VM de desenvolvimento do projeto `sis-bem-estar`, com foco em saude do sistema operacional, uso de disco, Docker, containers, logs, cache de build e servico de disparo automatico de e-mail.

O objetivo e manter a VM operacional, reduzir risco de indisponibilidade por falta de espaco em disco e padronizar procedimentos seguros enquanto nao existir uma esteira automatizada de deploy.

Este documento e voltado para operacao manual em ambiente de desenvolvimento. Antes de aplicar qualquer comando destrutivo, validar o impacto, confirmar backups e alinhar com o responsavel tecnico.

## 2. Problema identificado

O deploy vem sendo feito manualmente com:

```bash
docker compose up -d --build
```

O uso frequente desse comando gera novas imagens intermediarias e acumula Docker build cache. Com o tempo, esse cache pode ocupar muito espaco em `/var`, especialmente em `/var/lib/docker` e diretorios relacionados ao runtime de containers.

Quando `/var` ou a particao raiz ficam sem espaco, os principais impactos sao:

- falha ao criar ou recriar containers;
- falha ao gravar logs;
- falha no banco de dados por falta de espaco para escrita;
- indisponibilidade da aplicacao;
- erro em rotinas automaticas, como disparo de e-mail;
- dificuldade para executar deploys e rollback manual.

## 3. Risco de usar frequentemente `docker compose up -d --build`

O comando `docker compose up -d --build` e util quando ha alteracao em Dockerfile, dependencias, imagem base ou arquivos que participam do processo de build. Porem, usado como rotina padrao de deploy, ele aumenta o consumo de disco e pode mascarar problemas de versionamento.

Principais riscos:

- acumulo de build cache antigo;
- criacao recorrente de camadas Docker sem necessidade;
- aumento do tempo de deploy;
- maior consumo de CPU, memoria e I/O durante o build;
- crescimento de `/var/lib/docker`;
- risco de indisponibilidade se o disco encher durante o build;
- dificuldade para identificar exatamente qual mudanca entrou em producao ou homologacao.

Quando a alteracao nao exige rebuild de imagem, preferir recriar apenas o servico necessario.

## 4. Checklist semanal de verificacao da VM

Executar semanalmente e registrar o resultado no relatorio.

- Verificar uptime da VM.
- Verificar uso de memoria.
- Verificar uso de disco.
- Verificar se `/var` ou a particao raiz estao acima de 80%.
- Verificar crescimento anormal em `/var/lib`.
- Verificar crescimento anormal em `/var/log`.
- Verificar espaco ocupado por logs do `journalctl`.
- Verificar se ha lentidao, travamentos ou erros recorrentes no sistema.
- Confirmar que ha espaco livre suficiente antes de qualquer deploy manual.

Comandos de diagnostico:

```bash
uptime
free -h
df -h
journalctl --disk-usage
sudo du -h --max-depth=1 /var | sort -h
sudo du -h --max-depth=1 /var/lib | sort -h
sudo du -h --max-depth=1 /var/log | sort -h
```

## 5. Checklist semanal de Docker

- Verificar containers em execucao.
- Verificar containers reiniciando em loop.
- Verificar uso de CPU e memoria por container.
- Verificar espaco usado por imagens, containers, volumes e build cache.
- Verificar se ha build cache antigo ocupando muito espaco.
- Verificar se imagens antigas estao crescendo sem necessidade.
- Confirmar que volumes do banco nao serao afetados por qualquer limpeza.

Comandos de diagnostico:

```bash
docker ps
docker stats --no-stream
docker system df
```

## 6. Checklist dos containers

Para cada container do projeto, verificar:

- status `Up`;
- ausencia de reinicios constantes;
- consumo de CPU compativel com o uso esperado;
- consumo de memoria sem crescimento continuo anormal;
- portas publicadas corretamente;
- variaveis de ambiente esperadas;
- conectividade entre aplicacao, banco e redis;
- healthcheck configurado quando aplicavel;
- logs sem erro recorrente.

Itens minimos esperados:

- aplicacao backend ativa;
- frontend ou proxy ativo, quando aplicavel;
- banco de dados ativo;
- redis ativo, quando aplicavel;
- servico de disparo automatico de e-mail ativo ou agendado conforme desenho da aplicacao.

## 7. Checklist de logs

- Verificar logs recentes dos containers apos deploy.
- Verificar logs de erro da aplicacao.
- Verificar logs do banco de dados.
- Verificar logs do redis, quando aplicavel.
- Verificar logs do servico de e-mail.
- Verificar consumo de disco por logs em `/var/log`.
- Verificar consumo do `journalctl`.
- Confirmar se os servicos Docker possuem rotacao de logs configurada.

Evitar deixar containers usando logs sem limite. A recomendacao para os servicos no `docker-compose.prod.yml` e:

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

Essa configuracao limita o tamanho dos logs JSON mantidos pelo Docker para cada container. Sem ela, logs muito verbosos podem ocupar grande parte de `/var/lib/docker/containers`.

## 8. Checklist do servico de disparo automatico de e-mail

Verificar semanalmente a saude do servico responsavel pelo disparo automatico de e-mail.

Itens obrigatorios:

- ultimo envio com sucesso;
- ultimo erro registrado;
- quantidade de e-mails pendentes;
- quantidade de e-mails com falha;
- numero de falhas consecutivas;
- tempo desde a ultima execucao;
- alerta se nao houver envio bem-sucedido dentro da janela esperada.

O relatorio deve indicar se o servico esta executando dentro da frequencia esperada. Caso nao exista envio bem-sucedido na janela prevista, tratar como alerta operacional, mesmo que o container esteja `Up`.

Validacoes recomendadas:

- confirmar se o container ou processo do disparador esta ativo;
- confirmar se o servico consegue acessar o banco;
- confirmar se credenciais SMTP ou provedor de e-mail estao configuradas;
- confirmar se ha fila acumulada de e-mails pendentes;
- confirmar se e-mails com falha possuem motivo registrado;
- confirmar se falhas consecutivas indicam bloqueio de autenticacao, rede ou limite do provedor.

## 9. Comandos seguros que podem ser rodados semanalmente

Os comandos abaixo sao seguros para diagnostico. Eles nao removem containers, imagens, volumes ou dados.

```bash
uptime
free -h
df -h
docker ps
docker stats --no-stream
docker system df
journalctl --disk-usage
sudo du -h --max-depth=1 /var | sort -h
sudo du -h --max-depth=1 /var/lib | sort -h
sudo du -h --max-depth=1 /var/log | sort -h
```

Interpretacao basica:

- `uptime`: mostra ha quanto tempo a VM esta ligada e a carga media.
- `free -h`: mostra uso de memoria e swap.
- `df -h`: mostra uso das particoes.
- `docker ps`: lista containers em execucao.
- `docker stats --no-stream`: mostra uso atual de CPU e memoria dos containers.
- `docker system df`: mostra consumo de disco por imagens, containers, volumes e build cache.
- `journalctl --disk-usage`: mostra espaco usado pelos logs do systemd journal.
- `du` em `/var`, `/var/lib` e `/var/log`: ajuda a identificar diretorios que mais consomem espaco.

## 10. Comandos perigosos que NAO devem ser usados sem validacao

Os comandos abaixo podem remover imagens, volumes, dados persistentes ou comprometer o ambiente. Nao executar sem validacao previa, backup quando aplicavel e autorizacao do responsavel tecnico.

```bash
docker system prune -a
docker volume prune
docker compose down -v
docker volume rm
rm -rf /var/lib/docker
rm -rf /var/lib/containerd
```

Risco de cada comando:

- `docker system prune -a`: remove imagens nao utilizadas, containers parados, redes nao usadas e cache. Pode remover imagens necessarias para rollback ou para subir servicos rapidamente.
- `docker volume prune`: remove volumes Docker nao utilizados. Pode apagar dados persistentes se algum volume importante estiver sem container associado no momento.
- `docker compose down -v`: derruba os servicos e remove os volumes declarados no compose. Pode apagar dados do banco de dados.
- `docker volume rm`: remove volumes especificos. Se usado contra volume do banco, causa perda de dados.
- `rm -rf /var/lib/docker`: remove manualmente a area interna do Docker. Pode corromper o estado do Docker, apagar imagens, containers, volumes e dados persistentes.
- `rm -rf /var/lib/containerd`: remove manualmente dados do runtime de containers. Pode corromper containers e imagens em uso.

Regra operacional: nunca usar comandos que removem volumes sem backup validado e autorizacao explicita.

## 11. Procedimento seguro de deploy manual enquanto nao houver esteira

Enquanto nao existir pipeline de deploy, seguir o fluxo abaixo.

1. Verificar saude da VM antes do deploy:

```bash
uptime
free -h
df -h
docker system df
docker ps
```

2. Validar o arquivo compose antes de subir:

```bash
docker compose -f docker-compose.prod.yml config
```

3. Fazer backup do compose antes de editar:

```bash
cp docker-compose.prod.yml docker-compose.prod.yml.bak
```

4. Aplicar a alteracao necessaria no compose ou no codigo.

5. Evitar `docker compose down` quando nao for necessario.

6. Preferir recriar apenas o servico alterado:

```bash
docker compose -f docker-compose.prod.yml up -d --build <nome-do-servico>
```

7. Quando nao houver alteracao que exija build, subir sem `--build`:

```bash
docker compose -f docker-compose.prod.yml up -d <nome-do-servico>
```

8. Nunca usar `docker compose down -v` sem backup e autorizacao.

9. Apos o deploy, validar:

```bash
docker ps
docker stats --no-stream
docker system df
df -h
```

10. Validar logs dos servicos alterados e dos servicos dependentes.

11. Registrar no relatorio semanal:

- data e hora do deploy;
- servico alterado;
- comando executado;
- resultado;
- erros encontrados;
- acao corretiva, se houver.

## 12. Procedimento seguro de limpeza de cache Docker

A limpeza controlada recomendada para build cache antigo e:

```bash
docker builder prune -af --filter "until=168h"
```

Esse comando remove cache de build com mais de 168 horas, ou seja, mais de 7 dias. Ele nao remove volumes do banco de dados e nao apaga dados persistentes armazenados em volumes Docker.

Antes de executar:

- verificar uso de disco com `df -h`;
- verificar consumo Docker com `docker system df`;
- confirmar que nao ha build em andamento;
- confirmar que nao ha deploy em andamento;
- registrar o estado antes da limpeza.

Depois de executar:

- rodar `docker system df`;
- rodar `df -h`;
- registrar o espaco liberado;
- validar que os containers continuam em execucao com `docker ps`;
- validar logs basicos dos servicos principais.

Nao substituir essa limpeza por `docker system prune -a` sem analise. O objetivo aqui e limpar apenas cache de build antigo, mantendo volumes e reduzindo risco operacional.

## 13. Recomendacoes para `docker-compose.prod.yml`

### Rotacao de logs

Configurar rotacao de logs em todos os servicos Docker:

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

Essa configuracao deve ser aplicada nos servicos da aplicacao, banco, redis, workers e qualquer servico auxiliar que gere logs.

### Healthcheck

Recomenda-se configurar `healthcheck` para aplicacao, banco e redis.

Objetivo dos healthchecks:

- detectar container ativo mas sem responder corretamente;
- facilitar diagnostico apos deploy;
- reduzir falso positivo de servico apenas porque o container esta `Up`;
- apoiar validacoes manuais semanais.

Exemplos conceituais de validacao:

- aplicacao: endpoint HTTP de saude retornando sucesso;
- banco: comando nativo de verificacao de disponibilidade;
- redis: comando de ping do redis;
- servico de e-mail: validacao de execucao recente e ausencia de falhas consecutivas.

Os healthchecks devem usar comandos disponiveis dentro das imagens atuais do projeto. Nao adicionar dependencia externa apenas para viabilizar healthcheck sem avaliar impacto na imagem.

### Persistencia de dados

- Manter dados do banco em volume nomeado e identificado.
- Documentar claramente quais volumes sao criticos.
- Nao usar `down -v` em ambiente com dados sem backup.
- Evitar comandos manuais de remocao em `/var/lib/docker`.

### Deploy por servico

- Nomear servicos de forma clara.
- Permitir recriacao isolada do backend, frontend, banco, redis e workers.
- Evitar rebuild desnecessario de servicos que nao foram alterados.
- Registrar quais servicos dependem de banco, redis e variaveis de ambiente.

## 14. Modelo de relatorio semanal para o dev preencher

```markdown
# Relatorio semanal de operacao - sis-bem-estar

Data:
Responsavel:
VM/Ambiente:

## 1. Saude geral da VM

Uptime:
Uso de memoria:
Uso de disco geral:
Uso de /var:
Uso de /var/lib:
Uso de /var/log:
Uso do journalctl:
Observacoes:

## 2. Docker

Containers em execucao:
Containers reiniciando:
Uso de CPU/memoria relevante:
Espaco usado por imagens:
Espaco usado por containers:
Espaco usado por volumes:
Espaco usado por build cache:
Observacoes:

## 3. Containers do projeto

Backend:
Frontend/proxy:
Banco:
Redis:
Servico de e-mail:
Outros:
Observacoes:

## 4. Logs

Erros recentes da aplicacao:
Erros recentes do banco:
Erros recentes do redis:
Erros recentes do servico de e-mail:
Volume anormal de logs:
Observacoes:

## 5. Servico de disparo automatico de e-mail

Ultimo envio com sucesso:
Ultimo erro:
Quantidade de e-mails pendentes:
Quantidade de e-mails com falha:
Falhas consecutivas:
Tempo desde a ultima execucao:
Houve alerta por ausencia de envio na janela esperada? Sim/Nao
Observacoes:

## 6. Deploys realizados na semana

Data/hora:
Servico alterado:
Comando executado:
Resultado:
Rollback necessario? Sim/Nao
Observacoes:

## 7. Limpeza de cache Docker

Limpeza executada? Sim/Nao
Comando usado:
Espaco antes:
Espaco depois:
Espaco liberado:
Containers validados apos limpeza? Sim/Nao
Observacoes:

## 8. Pendencias e acoes recomendadas

Pendencias:
Acoes recomendadas:
Responsavel:
Prazo:
```
