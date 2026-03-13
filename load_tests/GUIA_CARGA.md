# Guia de Testes de Carga — Sis Bem-Estar

## Visão geral

```
┌─────────────────────────────────────────────────────────────────┐
│  seed_carga (Django)  →  tokens.csv  →  Locust  →  Backend      │
│                                                                  │
│  ColaboradorUser     — fluxo real: token → JWT → ver → reservar │
│  ReservaStressUser   — todos atacam o mesmo slot simultaneamente │
└─────────────────────────────────────────────────────────────────┘
```

---

## Passo a passo

### 1. Subir o sistema

```bash
docker compose up -d
```

### 2. Gerar a massa de dados

```bash
# Padrão: 2.000 usuários, slots de 10 min, 5 vagas por slot
docker compose exec backend python manage.py seed_carga

# Personalizado
docker compose exec backend python manage.py seed_carga \
  --usuarios 500 --duracao-sessao 15 --vagas 3

# Recriar do zero (apaga dados anteriores)
docker compose exec backend python manage.py seed_carga --limpar
```

O comando imprime ao final:

```
══════════════════════════════════════════════════════════════
  CONFIGURAÇÃO PARA O LOCUST
══════════════════════════════════════════════════════════════
  Total de tokens no CSV : 2000
  STRESS_EVENTO_ID       : 3
  STRESS_SLOT_ID         : 17
══════════════════════════════════════════════════════════════
```

Guarde esses valores para os próximos passos.

---

### 3. Instalar o Locust (localmente)

```bash
pip install locust
```

Ou use via Docker (ver seção [Modo Docker](#modo-docker)).

---

### 4. Rodar os testes

#### Cenário A — Interface Web (recomendado para exploração)

```bash
cd <raiz do projeto>
locust -f load_tests/locustfile.py --host http://localhost:8001
```

Acesse **http://localhost:8089**, configure:

| Campo | Valor sugerido |
|---|---|
| Number of users | 100 → 500 → 2000 |
| Spawn rate (ramp-up) | 10 usuários/segundo |
| Host | http://localhost:8001 |

**Classes disponíveis na UI:** `ColaboradorUser`, `ReservaStressUser`

---

#### Cenário B — Fluxo completo (headless / CI)

```bash
locust -f load_tests/locustfile.py ColaboradorUser \
  --headless \
  --host http://localhost:8001 \
  -u 500 \       # pico de 500 usuários simultâneos
  -r 50 \        # ramp-up: +50 usuários/segundo
  -t 120s \      # duração total: 2 minutos
  --html load_tests/relatorio_fluxo.html \
  --csv load_tests/resultado_fluxo
```

---

#### Cenário C — Stress de concorrência no mesmo slot

```bash
STRESS_EVENTO_ID=3 STRESS_SLOT_ID=17 \
locust -f load_tests/locustfile.py ReservaStressUser \
  --headless \
  --host http://localhost:8001 \
  -u 200 \
  -r 200 \       # ramp-up instantâneo: todos de uma vez
  -t 60s \
  --html load_tests/relatorio_stress.html
```

**Resultado esperado:**
- `HTTP 201` = 1 ou pouquíssimos (apenas 1 por vaga × número de vagas)
- `HTTP 400` = a grande maioria (slot lotado — correto!)
- `HTTP 500` = **zero** (se aparecer, há bug de concorrência)

---

### Modo Docker

```bash
# Descobrir o nome da rede do projeto
docker network ls | grep sis

# Subir Locust com UI (4 workers)
docker compose -f docker-compose.yml \
               -f load_tests/docker-compose.locust.yml \
  up locust-master --scale locust-worker=4

# Acesse http://localhost:8089
```

Para headless em Docker com variáveis de ambiente:

```bash
STRESS_EVENTO_ID=3 STRESS_SLOT_ID=17 \
docker compose -f docker-compose.yml \
               -f load_tests/docker-compose.locust.yml \
  run --rm locust-master \
  locust --headless -u 500 -r 50 -t 120s --only-summary
```

---

## Métricas-alvo

| Métrica | Aceitável | Crítico |
|---|---|---|
| p50 (mediana) | < 200 ms | > 500 ms |
| p95 | < 500 ms | > 2.000 ms |
| p99 | < 1.000 ms | > 5.000 ms |
| Taxa de erro (5xx) | 0% | > 0,1% |
| Throughput (req/s) | > 100 | < 30 |

---

## Sugestões de tuning

### Gunicorn Workers

O Django em desenvolvimento usa `runserver` (single-threaded). Para testes de carga reais:

```dockerfile
# Dockerfile.backend — trocar runserver por Gunicorn
CMD ["gunicorn", "backend.core.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \       # regra: 2 × nCPU + 1
     "--threads", "2", \       # threads por worker
     "--timeout", "30"]
```

| Parâmetro | Fórmula | Exemplo (4 CPUs) |
|---|---|---|
| `--workers` | 2 × nCPU + 1 | 9 |
| `--threads` | 2–4 | 2 |
| `--worker-class` | `gthread` ou `uvicorn.workers.UvicornWorker` | — |

Para Django async (Channels / ASGI), use **Uvicorn**:

```
gunicorn backend.core.asgi:application \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers 4
```

---

### PostgreSQL — Connection Pool

Por padrão o Django abre uma conexão por request e a fecha ao final.
Sob 500+ usuários simultâneos isso esgota o `max_connections` do Postgres.

**Solução 1 — `CONN_MAX_AGE` (mais simples):**

```python
# settings.py
DATABASES = {
    'default': {
        ...
        'CONN_MAX_AGE': 60,          # reutiliza conexão por 60 s
        'CONN_HEALTH_CHECKS': True,  # Django 4.1+
    }
}
```

**Solução 2 — PgBouncer (produção):**

```yaml
# docker-compose.yml — adicionar serviço pgbouncer
pgbouncer:
  image: edoburu/pgbouncer:1.22
  environment:
    DB_HOST: db
    DB_USER: postgres
    DB_PASSWORD: postgres
    DB_NAME: sis_bem_estar
    POOL_MODE: transaction    # melhor para Django
    MAX_CLIENT_CONN: 1000
    DEFAULT_POOL_SIZE: 25
```

| Parâmetro Postgres | Desenvolvimento | Produção |
|---|---|---|
| `max_connections` | 100 (padrão) | 200–500 |
| `shared_buffers` | 128 MB | 25% da RAM |
| `work_mem` | 4 MB | 8–16 MB |

Ajuste em `docker-compose.yml`:

```yaml
db:
  command: >
    postgres
      -c max_connections=300
      -c shared_buffers=256MB
      -c work_mem=8MB
      -c log_min_duration_statement=200
```

---

### Redis + Celery (envio de e-mails assíncrono)

O envio de e-mails em `EnviarEmailsView` é **síncrono** — bloqueia o worker
do Gunicorn enquanto o SMTP responde. Sob carga, isso cria gargalo.

**Implementação futura recomendada:**

```python
# tasks.py (Celery)
@shared_task
def enviar_emails_evento(evento_id: int):
    evento = Evento.objects.get(id=evento_id)
    # ... lógica atual de EnviarEmailsView ...

# views.py — disparar de forma assíncrona
enviar_emails_evento.delay(evento.id)
return Response({'mensagem': 'Envio em processamento...'})
```

| Parâmetro Celery | Desenvolvimento | Produção |
|---|---|---|
| `CELERY_CONCURRENCY` | 2 | `nCPU × 2` |
| `CELERY_PREFETCH_MULTIPLIER` | 4 | 1 (tarefas longas) |
| `CELERY_TASK_SOFT_TIME_LIMIT` | — | 60 (segundos) |
| Broker | Redis | Redis Sentinel / Cluster |

```yaml
# docker-compose.yml — adicionar
redis:
  image: redis:7-alpine

celery:
  build: { context: ., dockerfile: Dockerfile.backend }
  command: celery -A backend.core worker -l info --concurrency=4
  depends_on: [redis, db]
```

---

## Interpretando os resultados do Locust

```
Type     Name                        # reqs  # fails  |  Avg    Min    Max  Med  |   req/s failures/s
---------|---------------------------|--------|--------|---|-----|-------|-------|-----|---|----------|
GET      /api/auth/acesso/[token]     2000    0 (0%)  |  87     42    340    80  |  16.2   0.0
GET      /api/colaborador/eventos/…   8321    0 (0%)  |  54     18    210    50  |  67.0   0.0
POST     /api/.../reservar            2000   41 (2%)  |  143    88    890   130  |  16.1   0.3
---------|---------------------------|--------|--------|---|-----|-------|-------|-----|---|----------|
```

- **`# fails` nas reservas (400):** NÃO configure como falha — são esperados.
  O `locustfile.py` já trata `HTTP 400` como `resp.success()`.
- **`failures/s` alto em 500:** indica bug crítico — abra o log do Django:
  ```bash
  docker compose logs backend --tail=50
  ```
- **`Max` muito alto isolado:** indica garbage collection ou lock de banco pontual.
  Verifique `CONN_MAX_AGE` e o pool de conexões.
