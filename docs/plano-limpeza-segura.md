# Plano de limpeza segura

Este plano classifica arquivos e pastas do projeto `sis-bem-estar` por risco operacional. Ele nao autoriza remocao automatica. Toda limpeza deve ser revisada em diff antes de commit e nunca deve alterar logica da aplicacao.

## Grupo A - Seguro remover do repositorio se estiver versionado

Estes itens sao artefatos gerados por ferramentas ou execucao local. Se algum estiver versionado, pode ser removido do Git com seguranca tecnica, desde que a remocao seja revisada.

### Caches Python

- `__pycache__/`
- `*.pyc`
- `*.pyo`
- `*.pyd`

Motivo: sao bytecodes gerados automaticamente pelo Python. Nao fazem parte do codigo fonte.

### Dependencias Node instaladas

- `node_modules/`
- `frontend/node_modules/`

Motivo: sao restauradas por `npm install` ou pelo build Docker a partir de `package-lock.json`.

### Ambiente virtual Python

- `venv/`
- `.venv/`

Motivo: ambiente local de desenvolvimento. Deve ser recriado a partir de `backend/requirements.txt`.

### Logs

- `*.log`
- `gunicorn.log`
- logs locais gerados por testes ou execucao manual

Motivo: logs sao saidas de runtime. Podem conter dados sensiveis e nao devem ser versionados.

### Builds gerados

- `dist/`
- `build/`
- `frontend/dist/`
- `backend/staticfiles/`

Motivo: sao saidas de build ou coleta de estaticos. Devem ser geradas no pipeline, no build Docker ou no ambiente.

### Caches e temporarios

- `frontend/node_modules/.vite/`
- `.pytest_cache/`
- `.mypy_cache/`
- `.ruff_cache/`
- `.coverage`
- `coverage/`
- `htmlcov/`
- `*.tmp`
- `*.bak`
- `*.save`
- `*.conf.save*`

Motivo: sao caches, relatorios locais ou backups temporarios.

## Grupo B - Nao remover sem validacao

Estes itens podem parecer duplicados ou antigos, mas podem estar ligados ao deploy manual, banco, testes ou operacao da VM. Exigem validacao humana antes de qualquer remocao.

### Docker e compose

- `Dockerfile.backend`
- `Dockerfile.frontend`
- `Dockerfile.frontend.prod`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `.dockerignore`
- `nginx.conf`

Risco: quebrar build, deploy manual ou frontend servido por nginx.

Validar antes:

- qual compose esta ativo na VM;
- quais Dockerfiles sao referenciados;
- se ha comando operacional usando esses nomes;
- se existe rollback documentado.

### Migrations

- `backend/migrations/*.py`
- `backend/migrations/__init__.py`

Risco: quebrar historico de schema, recriacao de ambiente, deploy em banco novo ou auditoria de alteracoes.

Validar antes:

- estado do banco;
- migrations aplicadas;
- ambiente que depende do historico;
- plano de squashing, se algum dia for necessario.

### Scripts e arquivos de banco

- `database/tabelas_principais.sql`
- `database/manage.py`
- `database/Documentacao Banco de Dados.txt`

Risco: remover material usado para operacao, documentacao de schema ou scripts auxiliares.

Validar antes:

- quem usa;
- quando foi usado pela ultima vez;
- se deve ser movido para `database/scripts/` ou `docs/`.

### Arquivo `.env.vm`

- `.env.vm`

Risco: pode ser template de VM ou arquivo com secrets reais. No working tree atual, aparece como deletado apesar de estar versionado no historico.

Validar antes:

- se contem segredos reais;
- se a VM depende dele;
- se deve virar `.env.vm.example`;
- se credenciais precisam ser rotacionadas.

### Arquivos de atualizacao

- `atualizacao-v1.md`

Risco: pode conter historico operacional importante.

Validar antes:

- se deve ir para `docs/`;
- se ainda e referencia para deploy;
- se existe informacao sensivel.

### Load tests

- `load_tests/`

Risco: pode conter suite de carga, mesmo que o estado atual tenha mostrado apenas cache.

Validar antes:

- se deveria existir `locustfile.py` ou outros fontes;
- se testes de carga devem ser versionados;
- se resultados gerados devem ser ignorados.

### Package da raiz

- `package.json`
- `package-lock.json`

Risco: podem ser legado inutil ou dependencia de algum comando manual. Como o frontend possui package proprio, exigir confirmacao antes de remover.

Validar antes:

- se ha comandos `npm` executados na raiz;
- se algum Dockerfile usa os arquivos da raiz;
- se alguma documentacao orienta instalar dependencias na raiz.

## Grupo C - Nunca remover sem backup

Estes itens podem conter dados persistentes, configuracao ativa ou historico indispensavel. Remocao sem backup pode causar perda de dados ou indisponibilidade.

### Banco de dados

- dados do PostgreSQL;
- dumps locais;
- arquivos de banco;
- qualquer diretorio de dados montado como volume.

Regra: nunca remover sem backup testado e autorizacao explicita.

### Volumes Docker

- volumes do banco;
- volumes de arquivos persistentes;
- volumes usados por servicos da VM.

Regra: nunca usar `docker volume rm`, `docker volume prune` ou `docker compose down -v` sem backup e validacao.

### Migrations aplicadas

- migrations ja aplicadas em qualquer ambiente;
- historico de migrations usado por deploy.

Regra: nao apagar para "limpar" o repositorio. Alteracoes em migrations aplicadas exigem plano de banco.

### Arquivos `.env` usados em producao/desenvolvimento

- `.env`;
- `.env.vm`;
- copias reais na VM;
- arquivos equivalentes com credenciais.

Regra: nao remover sem backup seguro. Se houver exposicao de segredo, rotacionar credenciais.

### Compose ativo da VM

- `docker-compose.prod.yml`;
- compose efetivamente usado no servidor;
- arquivos auxiliares referenciados pelo compose.

Regra: antes de editar ou remover, fazer backup e validar com `docker compose config`.

## Procedimento recomendado para limpeza sem remocao automatica

1. Listar candidatos a limpeza.
2. Separar itens locais de itens versionados.
3. Para itens versionados do Grupo A, preparar PR exclusivo de limpeza.
4. Para itens do Grupo B, abrir tarefa de validacao com responsavel.
5. Para itens do Grupo C, exigir backup, janela combinada e autorizacao.
6. Revisar `git status` e diff antes de qualquer commit.
7. Nao misturar limpeza com refatoracao ou alteracao funcional.

## Execucao local de limpeza - 2026-06-26

Analise de versionamento executada antes de qualquer alteracao:

```bash
git status
git ls-files | grep -E "__pycache__|\.pyc|node_modules|venv|\.env|staticfiles|dist|build|\.log|\.pytest_cache|\.coverage|htmlcov|\.bak|\.tmp"
```

Resultado observado:

- nenhum `__pycache__/`, `*.pyc`, `node_modules/`, `venv/`, build, log ou cache foi encontrado como versionado;
- o filtro retornou apenas `.env.example`, `.env.vm` e `frontend/.env.example`;
- `.env.example` e `frontend/.env.example` sao templates e devem permanecer versionados;
- `.env.vm` permanece como item que exige validacao humana, pois aparece versionado no historico e deletado no working tree atual;
- nenhum `git rm --cached` foi executado, porque nao havia artefato claramente gerado versionado para remover.

A limpeza aplicada nesta etapa ficou limitada ao ajuste seguro do `.gitignore` e atualizacao da documentacao.

Estado adicional observado apos a verificacao:

- `atualizacao-v1.md` aparece como deletado na raiz;
- `docs/atualizacao-v1.md` aparece como arquivo nao rastreado;
- essa movimentacao nao faz parte da limpeza de caches e exige validacao humana antes de entrar no commit.

## Checklist final antes de remover

- O item pertence ao Grupo A?
- Esta versionado ou apenas existe localmente?
- Existe regra no `.gitignore` para impedir retorno?
- A remocao nao afeta Docker, compose, deploy manual ou VM?
- A remocao nao apaga configuracao real?
- A remocao nao apaga banco, volume ou migration aplicada?
- O diff foi revisado?
- A alteracao esta isolada em commit/PR de limpeza?

Se qualquer resposta for incerta, nao remover. Classificar como Grupo B e solicitar validacao humana.
