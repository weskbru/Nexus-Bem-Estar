# Auditoria de organizacao do projeto `sis-bem-estar`

## Resumo executivo

Foi feita uma investigacao somente leitura da estrutura atual do projeto. Nenhum arquivo foi removido, movido ou alterado na logica da aplicacao.

O projeto esta organizado como uma aplicacao Django no backend, React/Vite no frontend, arquivos Docker na raiz e artefatos de banco em `database/`. A estrutura principal e compreensivel, mas ha acumulacao local de artefatos gerados, principalmente `node_modules/`, `frontend/node_modules/`, varios `__pycache__/` e arquivos `*.pyc`.

Pontos principais encontrados:

- `.env` existe localmente e nao aparece como versionado pelo Git, o que e correto.
- `.env.example` aparece versionado, o que e correto.
- `.env.vm` aparece como arquivo versionado no historico, mas esta deletado no working tree atual (`git status` mostra `D .env.vm`). Isso exige validacao humana antes de qualquer acao.
- `node_modules/` na raiz e `frontend/node_modules/` existem no disco, mas nao aparecem como versionados.
- Existem muitos `__pycache__/` e `*.pyc` no workspace, todos candidatos a limpeza local ou remocao do repositorio caso algum esteja versionado.
- `load_tests/` existe no disco, mas atualmente foi encontrado apenas com `__pycache__`. Como o diretorio pode representar testes de carga, nao deve ser removido sem validacao.
- `package.json` e `package-lock.json` na raiz parecem duplicar parcialmente o frontend e exigem validacao. O frontend real possui seu proprio `frontend/package.json` completo.
- Os Dockerfiles e arquivos compose encontrados parecem ter funcoes distintas; nao ha base suficiente para remover nenhum.

## Estrutura atual encontrada

Diretorios principais na raiz:

| Caminho | Funcao provavel | Observacao |
| --- | --- | --- |
| `backend/` | Aplicacao backend Django/API | Estrutura modular por camadas e grupos de views. |
| `database/` | Documentacao e scripts SQL do banco | Contem `tabelas_principais.sql`, documentacao e um `manage.py`. |
| `docs/` | Documentacao tecnica do projeto | Contem documento de operacao criado anteriormente. |
| `frontend/` | Aplicacao React/Vite | Contem `src/`, assets, package proprio e configuracao Vite. |
| `load_tests/` | Testes de carga ou artefatos de teste de carga | No estado atual, contem apenas `__pycache__`. |
| `node_modules/` | Dependencias Node instaladas na raiz | Artefato gerado localmente; nao deve ser versionado. |
| `.git/` | Metadados do Git | Nao manipular manualmente. |

Arquivos soltos na raiz:

| Arquivo | Classificacao | Observacao |
| --- | --- | --- |
| `.dockerignore` | Obrigatorio na raiz | Controla contexto enviado ao Docker build. |
| `.env` | Exige validacao humana | Arquivo local com configuracao possivelmente sensivel; nao deve ser versionado. |
| `.env.example` | Obrigatorio/versionado | Template seguro, desde que sem segredos reais. |
| `.env.vm` | Exige validacao humana | Versionado no historico, mas deletado no working tree atual. Validar se e template ou arquivo sensivel. |
| `.gitignore` | Obrigatorio na raiz | Ja cobre varios artefatos gerados. Precisa pequenos ajustes. |
| `atualizacao-v1.md` | Pode ir para `docs/` | Documento de atualizacao solto na raiz. |
| `docker-compose.yml` | Obrigatorio na raiz | Compose de desenvolvimento. |
| `docker-compose.prod.yml` | Obrigatorio na raiz | Compose da VM/producao/homologacao manual. |
| `Dockerfile.backend` | Obrigatorio na raiz | Build da imagem backend. |
| `Dockerfile.frontend` | Obrigatorio na raiz | Build/dev server do frontend. |
| `Dockerfile.frontend.prod` | Obrigatorio na raiz | Build estatico e nginx para ambiente prod/VM. |
| `manage.py` | Obrigatorio na raiz | Entrada padrao Django usada tambem no container backend. |
| `nginx.conf` | Obrigatorio na raiz | Usado pelo `Dockerfile.frontend.prod`. |
| `package.json` | Exige validacao humana | Existe package do frontend separado; raiz contem dependencia isolada `react-quill`. |
| `package-lock.json` | Exige validacao humana | Relacionado ao package da raiz; validar se ainda e usado. |

## Problemas identificados

1. Artefatos gerados no workspace:

- `node_modules/`
- `frontend/node_modules/`
- `frontend/node_modules/.vite`
- varios `__pycache__/`
- muitos arquivos `*.pyc`

2. Arquivo de ambiente com estado inconsistente:

- `.env.vm` aparece rastreado pelo Git, mas deletado no working tree atual.
- E necessario decidir se `.env.vm` e template seguro versionado ou arquivo real de VM que nao deveria estar no repositorio.

3. Possivel duplicidade de dependencias Node:

- A raiz possui `package.json` e `package-lock.json`.
- O frontend tambem possui `frontend/package.json` e `frontend/package-lock.json`.
- Os Dockerfiles do frontend usam `frontend/package*.json`, o que sugere que o package da raiz pode ser legado ou instalado por engano.

4. `load_tests/` sem fonte visivel:

- O diretorio existe, mas a auditoria encontrou apenas `load_tests/__pycache__/locustfile...pyc`.
- Se o arquivo fonte dos testes de carga foi removido, o cache restante e lixo local.
- Se os testes de carga sao mantidos fora do repo por decisao operacional, documentar essa decisao.

5. `.gitignore` ignora `README.md` genericamente:

- `frontend/README.md` esta versionado, mas tambem aparece como arquivo rastreado que bate com regra de ignore.
- Ignorar `README.md` de forma generica pode atrapalhar documentacao futura.

6. Backend com nomes genericos:

- `backend/models/models.py`
- `backend/serializers/serializers.py`
- `backend/urls/urls.py`
- `backend/views/views.py`

Esses nomes funcionam, mas reduzem clareza e dificultam crescimento. Nao devem ser movidos agora sem plano de refatoracao e testes.

## Arquivos/pastas possivelmente desnecessarios

Seguros para remover do repositorio se estiverem versionados:

- `__pycache__/`
- `*.pyc`
- `*.pyo`
- `*.pyd`
- `node_modules/`
- `frontend/node_modules/`
- `frontend/node_modules/.vite`
- `dist/`
- `build/`
- `frontend/dist/`
- `*.log`
- arquivos temporarios como `*.tmp`, `*.bak`, `*.save`

No estado atual, `node_modules/` e `frontend/node_modules/` aparecem como presentes no disco, mas nao foram listados pelo Git como versionados. Isso indica que sao lixo local ou dependencias instaladas localmente, nao conteudo do repositorio.

## Arquivos/pastas que NAO devem ser removidos

Nao remover sem motivo tecnico comprovado:

- `backend/`
- `frontend/`
- `database/`
- `backend/migrations/*.py`
- `backend/migrations/__init__.py`
- `backend/management/commands/*.py`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `Dockerfile.backend`
- `Dockerfile.frontend`
- `Dockerfile.frontend.prod`
- `nginx.conf`
- `manage.py`
- `.dockerignore`
- `.gitignore`
- `.env.example`
- `frontend/.env.example`
- `frontend/package.json`
- `frontend/package-lock.json`
- `backend/requirements.txt`

Migrations aplicadas e scripts de banco fazem parte do historico operacional do sistema. Remover esses arquivos pode quebrar criacao de ambiente, rollback, auditoria de schema ou deploy em VM nova.

## Arquivos que exigem validacao humana

| Caminho | Motivo |
| --- | --- |
| `.env` | Pode conter secrets reais; nao versionar e nao remover sem confirmar uso local/VM. |
| `.env.vm` | Versionado no historico, mas deletado no working tree. Confirmar se e template seguro ou segredo real. |
| `package.json` raiz | Pode ser legado ou dependencia usada por algum fluxo manual. |
| `package-lock.json` raiz | Depende da decisao sobre `package.json` raiz. |
| `atualizacao-v1.md` | Parece documentacao de atualizacao; melhor mover para `docs/` apos validacao. |
| `load_tests/` | Pode ser suite de carga; no estado atual so contem cache. |
| `database/manage.py` | Nome chama atencao por duplicar `manage.py` da raiz; validar finalidade antes de mover/remover. |
| `database/Documentacao Banco de Dados.txt` | Documento util, mas poderia ser convertido/movido para `docs/` ou mantido em `database/`. |

## Riscos encontrados

- Secrets versionados: `.env.vm` esta no historico do Git. Se conteve credenciais reais, e necessario rotacionar secrets e limpar historico apenas com procedimento especifico.
- Perda de dados: remover migrations, scripts SQL, compose ativo ou volumes pode quebrar ambientes e dados.
- Deploy manual fragil: multiplos arquivos Docker/compose exigem clareza sobre qual compose esta ativo na VM.
- Crescimento de disco local: `node_modules`, caches Python e build caches podem ocupar espaco sem valor de versionamento.
- Documentacao dispersa: `atualizacao-v1.md` na raiz mistura operacao/documentacao com arquivos de runtime.
- Ignore amplo demais: regra `README.md` no `.gitignore` pode esconder documentacao nova por engano.

## Verificacao do `.gitignore`

O `.gitignore` atual cobre corretamente:

- `venv/`
- `__pycache__/`
- `*.pyc`
- `*.pyo`
- `*.pyd`
- `.env`
- `backend/staticfiles/`
- `db.sqlite3`
- `node_modules/`
- `frontend/node_modules/`
- `dist/`
- `build/`
- `frontend/dist/`
- `*.log`
- `gunicorn.log`
- `postgres_data/`
- backups `nginx.conf.save*`

Pontos de atencao:

- `load_tests/` esta ignorado. Se a suite de carga deve ser mantida no repositorio, remover essa regra e ignorar apenas saidas geradas.
- `README.md` esta ignorado genericamente. Isso pode impedir documentacao legitima.
- Nao ha regras explicitas para `.pytest_cache/`, `.mypy_cache/`, `.ruff_cache/`, `.coverage`, `coverage/`, `htmlcov/`, `*.tmp`, `*.bak`.

Proposta de ajuste:

```gitignore
# Python/test caches
.pytest_cache/
.mypy_cache/
.ruff_cache/
.coverage
coverage/
htmlcov/

# Temporarios
*.tmp
*.bak

# Frontend caches
frontend/node_modules/.vite/

# Env local
.env
.env.*
!.env.example
!frontend/.env.example
```

Validar antes de aplicar:

- Se `.env.vm` deve continuar versionado como template, incluir excecao explicita `!.env.vm`.
- Se `load_tests/` deve ir para o repositorio, remover `load_tests/` do ignore.
- Se documentos `README.md` devem ser versionados, remover a regra `README.md`.

## Investigacao dos arquivos Docker

### `docker-compose.yml`

Compose voltado para desenvolvimento:

- sobe `db`, `redis`, `backend` e `frontend`;
- expoe banco em porta local `5434`;
- expoe backend em `8001`;
- expoe frontend Vite em `3000`;
- monta volume de codigo no backend (`.:/app`);
- monta partes do frontend para hot reload;
- usa `Dockerfile.backend` e `Dockerfile.frontend`;
- executa backend com `--reload`.

Funcao legitima: ambiente de desenvolvimento.

### `docker-compose.prod.yml`

Compose voltado para VM/prod/homologacao manual:

- sobe `db`, `redis`, `backend` e `frontend`;
- nao expoe banco nem redis para fora da rede Docker;
- backend nao monta codigo da maquina;
- backend roda `migrate`, `criar_admin`, `collectstatic` e Gunicorn;
- frontend usa `Dockerfile.frontend.prod`;
- frontend publica nginx na porta `3000:80`.

Funcao legitima: ambiente de VM sem hot reload.

### `Dockerfile.backend`

Build da imagem Django:

- usa Python 3.12 slim;
- instala dependencias do sistema para PostgreSQL;
- instala `backend/requirements.txt`;
- copia o projeto;
- expoe porta 8000.

Funcao legitima: imagem do backend.

### `Dockerfile.frontend`

Build/dev server do frontend:

- usa Node 20 Alpine;
- instala dependencias de `frontend/package*.json`;
- copia `frontend/`;
- executa `npm run dev`;
- expoe porta 3000.

Funcao legitima: frontend em desenvolvimento.

### `Dockerfile.frontend.prod`

Build multi-stage do frontend:

- build React/Vite em Node;
- injeta `VITE_API_URL` em tempo de build;
- copia `dist` para nginx;
- usa `nginx.conf`.

Funcao legitima: frontend estatico para VM/prod.

Conclusao: nao ha duplicidade comprovada nos Dockerfiles. Cada arquivo tem funcao diferente.

## Investigacao dos arquivos de ambiente

### `.env`

Arquivo local de configuracao. Deve permanecer fora do Git. Pode conter credenciais, tokens, chaves SMTP, dados de banco e configuracoes da VM.

Padrao recomendado:

- manter `.env` local nao versionado;
- nunca publicar `.env`;
- usar `.env.example` como contrato de variaveis;
- validar se a VM usa `.env` real separado do repositorio.

### `.env.example`

Template versionado. Deve conter apenas nomes de variaveis e valores ficticios/seguros.

Padrao recomendado:

- manter versionado;
- atualizar sempre que novas variaveis forem exigidas;
- nao incluir secrets reais.

### `.env.vm`

Arquivo sensivel para decisao. Ele aparece como versionado no Git, mas deletado no working tree atual.

Opcoes seguras:

- Se for template sem secrets: manter versionado, renomear ou documentar claramente como `.env.vm.example`.
- Se tiver secrets reais: remover do versionamento em PR especifico, rotacionar credenciais expostas e manter a copia real somente na VM.
- Se for usado diretamente pelo compose ativo da VM: nao remover sem backup e autorizacao.

## Investigacao do backend

Estrutura observada:

| Pasta/arquivo | Responsabilidade provavel | Avaliacao |
| --- | --- | --- |
| `backend/core/` | Settings, URLs principais e WSGI | Clara e padrao Django. |
| `backend/domain/` | Regras de dominio e excecoes | Boa separacao para logica pura. |
| `backend/management/commands/` | Comandos Django customizados | Legitimo. |
| `backend/migrations/` | Historico de schema Django | Critico, nao remover. |
| `backend/models/` | Models e admin | Funciona, mas `models/models.py` e generico. |
| `backend/serializers/` | Serializers DRF | Funciona, mas `serializers/serializers.py` e generico. |
| `backend/services/` | Servicos de e-mail, LDAP, lista de espera | Responsabilidade clara. |
| `backend/tests/` | Testes automatizados | Deve permanecer. |
| `backend/urls/` | Rotas da API/app | Funciona, mas `urls/urls.py` e redundante. |
| `backend/views/` | Views por area: admin, auth, colaborador | Separacao razoavel por contexto. |

Pontos de organizacao:

- A estrutura indica tentativa de separar dominio, servicos, views e serializers.
- Ha algum excesso de nomes genericos em arquivos centrais.
- `backend/views/views.py` e potencial candidato a renomeacao futura se tiver responsabilidade clara.
- Refatoracao estrutural deve ser planejada com testes, pois imports Django/DRF podem quebrar facilmente.

Estrutura-alvo possivel, sem aplicar agora:

```text
backend/
  core/
  domain/
  management/
  migrations/
  models/
    evento.py
    usuario.py
    agendamento.py
    comunicado.py
  serializers/
    evento.py
    usuario.py
    agendamento.py
    comunicado.py
  services/
  tests/
  urls/
  views/
    admin/
    auth/
    colaborador/
```

Essa estrutura so deve ser adotada se houver necessidade real de evolucao e com cobertura de testes.

## Investigacao do frontend

Estrutura observada:

| Caminho | Funcao provavel |
| --- | --- |
| `frontend/src/` | Codigo principal React. |
| `frontend/src/components/` | Componentes reutilizaveis. |
| `frontend/src/contexts/` | Contextos React, como autenticacao. |
| `frontend/src/images/` | Imagens e assets. |
| `frontend/src/layouts/` | Layouts admin/colaborador. |
| `frontend/src/lib/` | Utilitarios ou regras compartilhadas. |
| `frontend/src/pages/` | Paginas de rotas. |
| `frontend/src/pages/admin/` | Paginas administrativas. |
| `frontend/src/pages/colaborador/` | Paginas do colaborador. |
| `frontend/src/services/` | Cliente/API. |
| `frontend/src/types/` | Declaracoes TypeScript. |
| `frontend/hooks/` | Hook compartilhado fora de `src`. |
| `frontend/lib/` | Utilitario fora de `src`. |
| `frontend/node_modules/` | Dependencias geradas localmente; nao versionar. |

Builds/caches/dependencias:

- `frontend/node_modules/` existe localmente e esta ignorado.
- `frontend/node_modules/.vite` existe como cache gerado.
- `frontend/dist/` esta ignorado, mas nao foi identificado como diretorio na raiz atual.
- `frontend/.gitignore` tambem ignora `node_modules/`, `.next/`, `coverage/`, `*.log` e `.env*`, preservando `.env.example`.

Ponto de organizacao:

- `frontend/hooks/` e `frontend/lib/` fora de `src/` podem ser padrao intencional por alias/imports. Validar antes de mover.
- O package real do frontend esta em `frontend/package.json`; o package da raiz deve ser validado.

## Investigacao de arquivos soltos na raiz

| Arquivo | Classificacao sugerida | Acao proposta |
| --- | --- | --- |
| `.dockerignore` | Obrigatorio na raiz | Manter. |
| `.env` | Exige validacao humana | Manter local, nao versionar. |
| `.env.example` | Obrigatorio na raiz | Manter versionado se sem secrets. |
| `.env.vm` | Exige validacao humana | Decidir se vira `.env.vm.example` ou sai do Git. |
| `.gitignore` | Obrigatorio na raiz | Ajustar com PR pequeno. |
| `atualizacao-v1.md` | Pode ir para `docs/` | Mover depois de validacao. |
| `docker-compose.yml` | Obrigatorio na raiz | Manter. |
| `docker-compose.prod.yml` | Obrigatorio na raiz | Manter. |
| `Dockerfile.backend` | Obrigatorio na raiz | Manter. |
| `Dockerfile.frontend` | Obrigatorio na raiz | Manter. |
| `Dockerfile.frontend.prod` | Obrigatorio na raiz | Manter. |
| `manage.py` | Obrigatorio na raiz | Manter. |
| `nginx.conf` | Obrigatorio na raiz | Manter, usado no frontend prod. |
| `package.json` | Exige validacao humana | Confirmar se ainda e usado. |
| `package-lock.json` | Exige validacao humana | Depende da decisao sobre o package raiz. |

## Proposta de estrutura organizada

Estrutura-alvo conservadora:

```text
sis-bem-estar/
  backend/
  database/
    docs/
    scripts/
  docs/
    operacao-vm-docker.md
    auditoria-organizacao-projeto.md
    plano-limpeza-segura.md
    atualizacao-v1.md
  frontend/
  load_tests/
  docker-compose.yml
  docker-compose.prod.yml
  Dockerfile.backend
  Dockerfile.frontend
  Dockerfile.frontend.prod
  manage.py
  nginx.conf
  .dockerignore
  .gitignore
  .env.example
```

Observacoes:

- Manter Docker/compose na raiz facilita build e comandos atuais.
- Mover documentos soltos para `docs/`.
- Manter scripts SQL em `database/`.
- Criar `scripts/` apenas se surgirem scripts operacionais versionados.
- Nao mover backend/frontend sem necessidade.

## Ajustes recomendados no `.gitignore`

Proposta minima:

```gitignore
# Test/build caches
.pytest_cache/
.mypy_cache/
.ruff_cache/
.coverage
coverage/
htmlcov/

# Temporarios locais
*.tmp
*.bak

# Vite cache local
frontend/node_modules/.vite/
```

Proposta que exige decisao:

```gitignore
# Ambientes locais
.env
.env.*
!.env.example
!frontend/.env.example
# !.env.vm  # habilitar somente se .env.vm for template seguro

# Documentacao
# Remover regra README.md se documentos README devem ser versionados.

# Testes de carga
# Remover load_tests/ se a suite deve ser versionada.
```

Nao aplicar automaticamente sem alinhar o destino de `.env.vm`, `README.md` e `load_tests/`.

## Plano seguro de reorganizacao em etapas

1. Congelar mudancas de estrutura durante deploys.
2. Revisar `.env.vm`:
   - verificar se contem secrets reais;
   - decidir se deve virar template;
   - se houve exposicao de segredo, rotacionar credenciais.
3. Validar package da raiz:
   - procurar referencias a `npm install` ou `npm run` na raiz;
   - confirmar se `package.json` raiz ainda tem uso;
   - se nao tiver, propor remocao em PR separado.
4. Decidir destino de `load_tests/`:
   - se testes de carga sao parte do projeto, versionar fonte e ignorar apenas caches/relatorios;
   - se sao locais, manter ignorado e documentar.
5. Ajustar `.gitignore` em PR pequeno.
6. Remover do Git apenas artefatos gerados que estejam versionados, usando `git rm --cached` quando aplicavel.
7. Mover documentacao solta para `docs/` em PR separado.
8. Revisar backend apenas depois de cobertura de testes:
   - nao renomear `models.py`, `serializers.py`, `urls.py` ou views sem validar imports.
9. Validar Docker/compose depois da limpeza:
   - nenhum Dockerfile deve ser removido sem comprovar ausencia de uso.
10. Registrar decisoes no proprio `docs/`.

## Checklist antes de remover qualquer coisa

- Confirmar se o arquivo esta versionado ou apenas existe localmente.
- Confirmar se o arquivo e gerado por ferramenta.
- Confirmar se o arquivo contem segredo, dado sensivel ou configuracao da VM.
- Confirmar se existe backup quando envolver `.env`, banco, compose ativo ou migrations.
- Confirmar se o arquivo e referenciado por Dockerfile, compose, settings, imports ou scripts.
- Confirmar se a remocao afeta deploy manual atual.
- Confirmar se a remocao afeta criacao de ambiente novo.
- Rodar revisao de diff antes de commit.
- Separar limpeza de caches, ajustes de ignore e reorganizacao de documentos em commits diferentes.
- Nunca remover volumes, banco, migrations aplicadas ou compose ativo sem autorizacao explicita.

## Conclusao

A limpeza imediata deve focar apenas em artefatos gerados: caches Python, `*.pyc`, `node_modules`, caches Vite, logs e builds. A reorganizacao estrutural deve ser incremental e documentada.

Os itens que mais exigem decisao humana sao `.env.vm`, package da raiz, `load_tests/` e documentos soltos na raiz. Dockerfiles, compose, migrations e scripts de banco devem ser preservados ate haver comprovacao tecnica de desuso.

## Atualizacao da limpeza local - 2026-06-26

Foi executada nova analise de versionamento antes de qualquer alteracao:

```bash
git status
git ls-files | grep -E "__pycache__|\.pyc|node_modules|venv|\.env|staticfiles|dist|build|\.log|\.pytest_cache|\.coverage|htmlcov|\.bak|\.tmp"
```

Resultado:

- nao havia `__pycache__/`, `*.pyc`, `node_modules/`, `venv/`, builds, logs ou caches versionados para remover;
- o filtro retornou apenas `.env.example`, `.env.vm` e `frontend/.env.example`;
- `.env.example` e `frontend/.env.example` foram preservados como templates versionados;
- `.env.vm` nao foi removido por exigir validacao humana e por poder representar template de VM ou arquivo sensivel;
- nenhum `git rm --cached` foi necessario.

O `.gitignore` foi atualizado para cobrir explicitamente:

- caches Python e testes: `__pycache__/`, `*.py[cod]`, `.pytest_cache/`, `.mypy_cache/`, `.ruff_cache/`, `.coverage`, `coverage/`, `htmlcov/`;
- virtualenvs: `venv/`, `.venv/`;
- dependencias e builds Node: `node_modules/`, `frontend/node_modules/`, `dist/`, `build/`, `frontend/dist/`;
- estaticos gerados: `backend/staticfiles/`;
- logs: `*.log`, `gunicorn.log`;
- arquivos de ambiente locais: `.env`, `.env.*`, preservando `.env.example` e `frontend/.env.example`;
- temporarios: `*.tmp`, `*.bak`, `*.save`, `*.swp`, `.DS_Store`.

Pontos que continuam exigindo validacao humana:

- decidir se `.env.vm` deve ser restaurado como template versionado, renomeado para `.env.vm.example` ou removido do Git em PR especifico;
- confirmar se `load_tests/` deve permanecer ignorado ou se a suite de carga deve ser versionada;
- confirmar se `package.json` e `package-lock.json` da raiz ainda possuem uso real;
- decidir se a regra que ignora `README.md` deve ser mantida;
- validar a situacao de `atualizacao-v1.md`, pois o status atual mostra o arquivo deletado na raiz e uma copia nao rastreada em `docs/atualizacao-v1.md`.
