# Auditoria de organizacao Docker

## Objetivo

Auditar a posicao e o acoplamento dos arquivos Docker/Compose do projeto `sis-bem-estar`, sem mover arquivos, sem alterar Dockerfiles, sem alterar compose ativo e sem alterar comandos de deploy.

Arquivos auditados:

- `docker-compose.yml`
- `docker-compose.prod.yml`
- `Dockerfile.backend`
- `Dockerfile.frontend`
- `Dockerfile.frontend.prod`
- `.dockerignore`
- `nginx.conf`

## Estrutura atual

Atualmente os arquivos Docker ficam na raiz do projeto:

```text
sis-bem-estar/
  docker-compose.yml
  docker-compose.prod.yml
  Dockerfile.backend
  Dockerfile.frontend
  Dockerfile.frontend.prod
  .dockerignore
  nginx.conf
  backend/
  frontend/
  database/
  docs/
```

Os dois compose usam `build.context: .`, ou seja, o contexto de build e a raiz do repositorio. Isso permite que os Dockerfiles copiem arquivos de `backend/`, `frontend/`, `nginx.conf` e outros arquivos necessarios a partir de caminhos relativos a raiz.

## Referencias encontradas

### Compose

`docker-compose.yml`:

- `backend.build.context: .`
- `backend.build.dockerfile: Dockerfile.backend`
- `frontend.build.context: .`
- `frontend.build.dockerfile: Dockerfile.frontend`
- monta `.:/app` no backend em desenvolvimento;
- monta arquivos de `./frontend` no frontend para hot reload.

`docker-compose.prod.yml`:

- `backend.build.context: .`
- `backend.build.dockerfile: Dockerfile.backend`
- `frontend.build.context: .`
- `frontend.build.dockerfile: Dockerfile.frontend.prod`
- usa `VITE_API_URL` como build arg do frontend;
- nao monta volume de codigo no backend.

### Dockerfiles

`Dockerfile.backend`:

```dockerfile
COPY backend/requirements.txt .
COPY . .
```

Esse Dockerfile depende do contexto da raiz para copiar o backend e tambem o restante do projeto.

`Dockerfile.frontend`:

```dockerfile
COPY frontend/package*.json ./
COPY frontend/ .
```

Esse Dockerfile depende do contexto da raiz para acessar `frontend/`.

`Dockerfile.frontend.prod`:

```dockerfile
COPY frontend/package*.json ./
COPY frontend/ .
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

Esse Dockerfile depende do contexto da raiz para acessar `frontend/` e `nginx.conf`.

### `nginx.conf`

`nginx.conf` e usado diretamente pelo `Dockerfile.frontend.prod`:

```dockerfile
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

Ele configura:

- frontend estatico servido por nginx;
- fallback para React Router via `try_files`;
- proxy `/api/` para `http://backend:8000`;
- limite de corpo de requisicao para comunicados com imagens base64.

### Documentacao e comandos

Foram encontradas referencias em documentos operacionais, principalmente:

- `docs/operacao-vm-docker.md`
- `docs/auditoria-organizacao-projeto.md`
- `docs/plano-limpeza-segura.md`
- `docs/atualizacao-v1.md`

A documentacao atual orienta comandos como:

```bash
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml up -d --build <nome-do-servico>
```

Isso reforca que `docker-compose.prod.yml` na raiz e parte do fluxo operacional atual.

## Funcao de cada arquivo

| Arquivo | Funcao | Usado por quem | Pode ser movido? | Risco de mover | Recomendacao |
| --- | --- | --- | --- | --- | --- |
| `docker-compose.yml` | Compose de desenvolvimento com banco, redis, backend com volume e frontend Vite/hot reload. | Dev local, referencia `Dockerfile.backend` e `Dockerfile.frontend`. | Tecnicamente sim, mas nao recomendado agora. | Quebrar comandos locais simples, paths de volumes e expectativa de `docker compose up` na raiz. | Manter na raiz. |
| `docker-compose.prod.yml` | Compose de VM/prod manual, sem volume de codigo no backend e frontend via nginx. | Deploy manual na VM e docs operacionais. | Nao recomendado agora. | Alto: quebra comandos atuais da VM, documentacao e processo manual de deploy. | Manter na raiz enquanto nao houver esteira. |
| `Dockerfile.backend` | Build da imagem Django/Gunicorn. | Ambos os compose. | Sim, com ajuste de `dockerfile` e possivelmente `COPY`. | Medio: contexto atual e raiz; mover sem ajustar paths quebra `COPY backend/requirements.txt` e `COPY . .`. | Manter na raiz por enquanto. |
| `Dockerfile.frontend` | Build/dev server do frontend Vite. | `docker-compose.yml`. | Sim, com ajuste de `dockerfile` e `COPY`. | Medio: mover para `frontend/` exige decidir se contexto continua raiz ou muda para `frontend/`. | Manter na raiz por enquanto. |
| `Dockerfile.frontend.prod` | Build multi-stage do frontend e nginx final. | `docker-compose.prod.yml`. | Sim, mas exige ajuste cuidadoso. | Alto: depende de `frontend/` e `nginx.conf`; mover pode quebrar build da VM. | Manter na raiz ate haver branch/teste dedicado. |
| `.dockerignore` | Controla arquivos enviados ao contexto Docker. | Docker build com `context: .`. | Nao deve ser movido enquanto o contexto for raiz. | Alto: se movido, pode deixar de ser aplicado ao contexto atual e enviar caches/secrets ao build. | Manter na raiz. |
| `nginx.conf` | Configuracao nginx do frontend prod e proxy `/api/`. | `Dockerfile.frontend.prod`. | Sim, com ajuste no `COPY`. | Medio/alto: mover exige alterar `COPY nginx.conf ...`; erro quebra frontend prod. | Manter na raiz ou mover junto com Dockerfile prod em migracao controlada. |

## Problemas de organizacao encontrados

1. Todos os arquivos Docker ficam na raiz, o que aumenta a quantidade de arquivos operacionais no primeiro nivel do projeto.
2. Os nomes `Dockerfile.backend`, `Dockerfile.frontend` e `Dockerfile.frontend.prod` deixam claro o papel de cada imagem, mas fogem do padrao `backend/Dockerfile` e `frontend/Dockerfile`.
3. `nginx.conf` fica na raiz apesar de ser usado apenas pela imagem final do frontend prod.
4. O layout atual esta fortemente acoplado a `build.context: .`.
5. A documentacao operacional atual assume compose na raiz.

Esses pontos sao de organizacao, nao de correcao funcional. A estrutura atual e coerente com deploy manual e baixo risco operacional.

## Avaliacao das opcoes

### Opcao A - manter Docker na raiz

```text
docker-compose.yml
docker-compose.prod.yml
Dockerfile.backend
Dockerfile.frontend
Dockerfile.frontend.prod
nginx.conf
```

Vantagens:

- menor risco imediato;
- nao altera deploy atual da VM;
- nao exige mudar `build.context`;
- nao exige mudar `COPY`;
- nao exige atualizar comandos operacionais;
- mantem `.dockerignore` aplicado ao contexto raiz.

Desvantagens:

- raiz continua com varios arquivos operacionais;
- `nginx.conf` continua fora de `frontend/`;
- organizacao visual menos segmentada.

Recomendacao: melhor opcao para o momento atual.

### Opcao B - separar Dockerfiles por aplicacao

```text
backend/Dockerfile
frontend/Dockerfile
frontend/Dockerfile.prod
frontend/nginx.conf
docker-compose.yml
docker-compose.prod.yml
```

Vantagens:

- aproxima cada Dockerfile da aplicacao que ele empacota;
- `frontend/nginx.conf` ficaria junto do frontend;
- reduz arquivos Docker soltos na raiz.

Impactos:

- alterar `dockerfile` nos compose;
- decidir se `build.context` continua `.` ou muda para `backend/` e `frontend/`;
- se o contexto continuar `.`, os `COPY` podem permanecer parecidos, mas os caminhos de `dockerfile` mudam;
- se o contexto mudar para `backend/` ou `frontend/`, varios `COPY` precisam mudar;
- `Dockerfile.frontend.prod` teria que copiar `frontend/nginx.conf` ou `nginx.conf` conforme novo local.

Risco: medio. Viavel, mas so deve ser feito em branch de teste com validacao de build e compose.

### Opcao C - criar pasta central `docker/`

```text
docker/
  backend/Dockerfile
  frontend/Dockerfile
  frontend/Dockerfile.prod
  nginx/nginx.conf

docker-compose.yml
docker-compose.prod.yml
```

Vantagens:

- centraliza artefatos Docker;
- deixa claro o que e infraestrutura local;
- pode escalar melhor se surgirem mais arquivos Docker.

Impactos:

- alterar `dockerfile` nos compose para caminhos como `docker/backend/Dockerfile`;
- manter `context: .` provavelmente seria necessario para preservar acesso a `backend/`, `frontend/` e `nginx.conf`;
- ajustar `COPY nginx.conf` para `COPY docker/nginx/nginx.conf ...`;
- documentacao e comandos de manutencao precisam ser atualizados;
- aumenta distancia entre Dockerfile e codigo da aplicacao.

Risco: medio/alto para pouco ganho imediato. Mais adequado quando houver esteira ou padronizacao maior de infraestrutura.

## Impacto tecnico de mover arquivos

### Alteracao de `build.context`

Hoje o contexto e raiz:

```yaml
build:
  context: .
```

Se o contexto for alterado para `backend/`, o Dockerfile backend perde acesso direto a arquivos fora de `backend/`. Se for alterado para `frontend/`, os Dockerfiles frontend deixam de usar `COPY frontend/...` e passam a copiar caminhos relativos ao proprio frontend.

Manter `context: .` e mover apenas os Dockerfiles reduz o impacto, mas ainda exige alterar `dockerfile`.

### Alteracao de `dockerfile`

Exemplos se arquivos forem movidos:

```yaml
dockerfile: backend/Dockerfile
dockerfile: frontend/Dockerfile
dockerfile: frontend/Dockerfile.prod
```

ou:

```yaml
dockerfile: docker/backend/Dockerfile
dockerfile: docker/frontend/Dockerfile
dockerfile: docker/frontend/Dockerfile.prod
```

Qualquer erro nesse caminho quebra o build.

### Alteracao de `COPY`

Com `context: .`, os `COPY backend/...` e `COPY frontend/...` continuam validos mesmo com Dockerfile em subpasta.

Com contexto por aplicacao, os comandos mudariam:

```dockerfile
COPY package*.json ./
COPY . .
```

No backend, tambem seria necessario avaliar se `manage.py`, `backend/` e outros arquivos esperados ficam dentro do contexto.

### Alteracao de caminho do `nginx.conf`

Hoje:

```dockerfile
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

Se for movido para `frontend/nginx.conf`:

```dockerfile
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
```

Se for movido para `docker/nginx/nginx.conf`:

```dockerfile
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
```

Esse e um ponto critico para o frontend prod.

### Alteracao de comandos usados na VM

O fluxo atual usa comandos na raiz:

```bash
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml up -d --build
```

Mover compose exigiria alterar comandos da VM. Como a proposta mantem compose na raiz em todas as opcoes, o impacto fica limitado aos caminhos internos de build.

### Risco para deploy manual atual

O maior risco e quebrar o deploy manual por mudanca de caminho. Como ainda nao existe esteira, qualquer reorganizacao Docker deve ser tratada como mudanca operacional, nao como limpeza estetica.

## Proposta recomendada

Recomendacao atual: manter a Opcao A por enquanto.

Motivos:

- o projeto ainda depende de deploy manual na VM;
- os compose e Dockerfiles funcionam como conjunto acoplado ao contexto raiz;
- `.dockerignore` esta posicionado corretamente para `context: .`;
- `nginx.conf` e usado diretamente pelo `Dockerfile.frontend.prod`;
- os comandos documentados usam compose na raiz;
- mover arquivos agora traz risco operacional maior que o ganho de organizacao.

Recomendacao secundaria para futuro: se a equipe decidir reorganizar, preferir a Opcao B com `build.context: .` mantido inicialmente. Essa abordagem move menos partes ao mesmo tempo:

```text
backend/Dockerfile
frontend/Dockerfile
frontend/Dockerfile.prod
frontend/nginx.conf
docker-compose.yml
docker-compose.prod.yml
```

Mesmo nessa alternativa, a mudanca deve ser feita em branch propria e validada na VM antes de merge.

## Plano seguro de migracao, se a equipe decidir mover

### Etapa 1 - Documentar

- Registrar layout atual.
- Registrar comandos atuais da VM.
- Confirmar qual compose e usado no deploy manual.
- Confirmar se a VM executa comandos sempre na raiz do repositorio.

### Etapa 2 - Criar branch

Criar branch especifica para reorganizacao Docker, separada de limpeza, refatoracao e mudancas funcionais.

### Etapa 3 - Ajustar caminhos

Se usar Opcao B:

- mover `Dockerfile.backend` para `backend/Dockerfile`;
- mover `Dockerfile.frontend` para `frontend/Dockerfile`;
- mover `Dockerfile.frontend.prod` para `frontend/Dockerfile.prod`;
- mover `nginx.conf` para `frontend/nginx.conf`;
- alterar `dockerfile` nos compose;
- alterar `COPY nginx.conf` para o novo caminho;
- manter `build.context: .` na primeira migracao para reduzir risco.

### Etapa 4 - Validar `docker compose config`

Validar:

```bash
docker compose -f docker-compose.yml config
docker compose -f docker-compose.prod.yml config
```

Qualquer erro de caminho deve bloquear a migracao.

### Etapa 5 - Build local

Validar build dos servicos afetados:

```bash
docker compose -f docker-compose.yml build backend frontend
docker compose -f docker-compose.prod.yml build backend frontend
```

### Etapa 6 - Deploy em branch de teste na VM

Na VM, usar branch de teste e executar o mesmo fluxo manual atual, sem `down -v`:

```bash
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml up -d --build
```

Validar containers, logs, frontend, backend, banco, redis e fluxo de e-mail.

### Etapa 7 - Merge apenas se validado

Fazer merge somente se:

- build local passou;
- `docker compose config` passou;
- VM de teste subiu corretamente;
- frontend carrega;
- backend responde;
- `/api/` passa pelo nginx;
- banco e redis ficaram preservados;
- procedimento de rollback esta claro.

## Checklist de validacao apos qualquer mudanca

- `docker compose -f docker-compose.yml config` executa sem erro.
- `docker compose -f docker-compose.prod.yml config` executa sem erro.
- `docker compose -f docker-compose.yml build backend frontend` passa.
- `docker compose -f docker-compose.prod.yml build backend frontend` passa.
- `Dockerfile.backend` consegue copiar `backend/requirements.txt`.
- Backend executa `python manage.py migrate`.
- Backend executa `python manage.py collectstatic --noinput` no compose prod.
- `Dockerfile.frontend` consegue copiar `frontend/package*.json`.
- `Dockerfile.frontend.prod` consegue copiar `frontend/package*.json`.
- `Dockerfile.frontend.prod` consegue copiar o `nginx.conf` no caminho correto.
- Frontend prod serve arquivos estaticos pelo nginx.
- Proxy `/api/` continua apontando para `http://backend:8000`.
- Compose da VM continua sendo executado a partir da raiz.
- Nenhum volume de banco foi removido.
- Nenhum comando `docker compose down -v` foi usado.
- Documentacao operacional foi atualizada com os novos caminhos, se houver mudanca.

## Conclusao

Os arquivos Docker/Compose estao bem posicionados para o modelo operacional atual. A raiz contem mais arquivos do que o ideal visualmente, mas isso reduz risco porque o contexto de build e a execucao manual da VM ja dependem desse layout.

Nao e recomendado mover agora. A organizacao pode ser revisitada quando houver branch dedicada, validacao com `docker compose config`, build local e deploy de teste na VM.
