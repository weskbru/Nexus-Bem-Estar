"""
Locust — Testes de Carga e Stress — Sis Bem-Estar
==================================================

Pré-requisito: gerar a massa de dados com:
    docker compose exec backend python manage.py seed_carga

Cenários disponíveis (escolha via --class no CLI ou na UI):

  ColaboradorUser      — Fluxo completo: autenticar → ver evento → reservar slot
                         Simula uso real com wait_time realista (1–3 s).

  ReservaStressUser    — Disputa de slot único: todos atacam o mesmo horário.
                         Valida select_for_update + unique_together sob pressão.

Variáveis de ambiente (opcionais):
  TOKENS_CSV         — Caminho do CSV de tokens (default: load_tests/tokens.csv)
  STRESS_EVENTO_ID   — ID do evento para o stress test (default: 1)
  STRESS_SLOT_ID     — ID do slot "quente" para o stress test (default: 1)
"""
import csv
import os
import random
import threading

from locust import HttpUser, task, between, constant_pacing, events
from locust.exception import StopUser


# ---------------------------------------------------------------------------
# Pool de tokens (thread-safe, compartilhado entre todos os workers)
# ---------------------------------------------------------------------------

_pool: list[dict] = []       # cada item: {token, evento_id, email}
_pool_lock = threading.Lock()
_pool_index = 0


def _proximo_token() -> dict | None:
    """Retira o próximo token do pool de forma thread-safe (FIFO)."""
    global _pool_index
    with _pool_lock:
        if _pool_index >= len(_pool):
            return None
        item = _pool[_pool_index]
        _pool_index += 1
        return item


@events.init.add_listener
def ao_iniciar_locust(environment, **kwargs):
    """Carrega tokens do CSV uma única vez ao iniciar o Locust."""
    csv_path = os.environ.get('TOKENS_CSV', 'load_tests/tokens.csv')

    if not os.path.exists(csv_path):
        print(
            f'\n[ERRO] Arquivo de tokens não encontrado: {csv_path}\n'
            'Gere os dados de carga primeiro:\n'
            '  docker compose exec backend python manage.py seed_carga\n'
        )
        return

    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        _pool.extend({
            'token': row['token'],
            'evento_id': int(row['evento_id']),
            'email': row['email'],
        } for row in reader)

    print(f'[INFO] {len(_pool)} tokens carregados de "{csv_path}"')


# ---------------------------------------------------------------------------
# Cenário 1 — Fluxo completo do colaborador
# ---------------------------------------------------------------------------

class ColaboradorUser(HttpUser):
    """
    Simula o comportamento real de um colaborador após receber o e-mail:

      Passo 1 — on_start: troca o token por JWT (acessa o link do e-mail)
      Passo 2 — ver_evento (peso 3): recarrega a página do evento
      Passo 3 — reservar_slot (peso 1): tenta reservar um horário disponível

    Métricas esperadas (servidor em desenvolvimento):
      p50 < 200 ms | p95 < 500 ms | taxa de erro < 1 %
    """
    wait_time = between(1, 3)   # pausa realista entre ações (segundos)

    # ── Autenticação ──────────────────────────────────────────────────────

    def on_start(self):
        dado = _proximo_token()
        if dado is None:
            # Pool esgotado: não há tokens suficientes para este usuário
            raise StopUser()

        self._evento_id: int = dado['evento_id']
        self._slots_disponiveis: list[int] = []

        with self.client.get(
            f"/api/auth/acesso/{dado['token']}/",
            name='/api/auth/acesso/[token]',
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                self._jwt = resp.json()['access']
                self._headers = {'Authorization': f'Bearer {self._jwt}'}
                resp.success()
            elif resp.status_code == 404:
                resp.failure('Token inválido ou já utilizado')
                raise StopUser()
            else:
                resp.failure(f'Autenticação falhou: HTTP {resp.status_code}')
                raise StopUser()

        # Pré-carrega os slots disponíveis do evento
        self._atualizar_slots()

    # ── Tasks ─────────────────────────────────────────────────────────────

    @task(3)
    def ver_evento(self):
        """GET no detalhe do evento — simula o colaborador verificando horários."""
        with self.client.get(
            f'/api/colaborador/eventos/{self._evento_id}/',
            name='/api/colaborador/eventos/[id]',
            headers=self._headers,
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                # Mantém a lista de slots atualizada com o que o servidor retorna
                horarios = resp.json().get('horarios', [])
                self._slots_disponiveis = [
                    h['id'] for h in horarios if h.get('disponivel', False)
                ]
                resp.success()
            elif resp.status_code == 401:
                resp.failure('JWT expirado')
                raise StopUser()
            else:
                resp.failure(f'HTTP {resp.status_code}')

    @task(1)
    def reservar_slot(self):
        """POST de reserva — o momento mais crítico do fluxo."""
        if not self._slots_disponiveis:
            # Sem slots disponíveis: atualiza e retorna (não conta como erro)
            self._atualizar_slots()
            return

        horario_id = random.choice(self._slots_disponiveis)

        with self.client.post(
            f'/api/colaborador/eventos/{self._evento_id}/horarios/{horario_id}/reservar/',
            name='/api/colaborador/.../reservar',
            headers=self._headers,
            catch_response=True,
        ) as resp:
            if resp.status_code == 201:
                # Sucesso: remove o slot da lista local e para de tentar reservar
                self._slots_disponiveis = []
                resp.success()
            elif resp.status_code == 400:
                # Slot lotado ou usuário já agendado: esperado sob carga
                self._slots_disponiveis = [s for s in self._slots_disponiveis if s != horario_id]
                resp.success()
            elif resp.status_code == 401:
                resp.failure('JWT expirado durante reserva')
                raise StopUser()
            elif resp.status_code == 500:
                resp.failure('500 — possível erro de lock/transação não tratado!')
            else:
                resp.failure(f'Reserva: HTTP inesperado {resp.status_code}')

    # ── Helpers ───────────────────────────────────────────────────────────

    def _atualizar_slots(self):
        """Consulta o servidor e atualiza a lista local de slots disponíveis."""
        resp = self.client.get(
            f'/api/colaborador/eventos/{self._evento_id}/',
            name='/api/colaborador/eventos/[id] (init)',
            headers=getattr(self, '_headers', {}),
        )
        if resp.status_code == 200:
            horarios = resp.json().get('horarios', [])
            self._slots_disponiveis = [
                h['id'] for h in horarios if h.get('disponivel', False)
            ]


# ---------------------------------------------------------------------------
# Cenário 2 — Stress de concorrência (disputa pelo mesmo slot)
# ---------------------------------------------------------------------------

#  Leia estes valores do output do comando seed_carga e passe como env vars:
#    export STRESS_EVENTO_ID=<id>
#    export STRESS_SLOT_ID=<id>
_STRESS_EVENTO_ID = int(os.environ.get('STRESS_EVENTO_ID', '1'))
_STRESS_SLOT_ID   = int(os.environ.get('STRESS_SLOT_ID', '1'))


class ReservaStressUser(HttpUser):
    """
    Todos os usuários desta classe atacam EXATAMENTE o mesmo slot simultaneamente.

    Objetivo: verificar se o sistema trata corretamente a disputa de lock:
      ✅ Apenas 1 agendamento deve ser criado para o slot
      ✅ Todos os demais devem receber HTTP 400 (slot lotado)
      ❌ Nenhuma resposta deve ser HTTP 500 (erro de banco não tratado)

    Como usar:
      locust -f load_tests/locustfile.py ReservaStressUser \\
             --headless -u 500 -r 100 -t 60s \\
             -H http://localhost:8001 \\
             -e STRESS_EVENTO_ID=1 STRESS_SLOT_ID=1

    Resultado esperado no relatório Locust:
      - Endpoint "reservar (STRESS)": 0% de erros 500
      - Resposta 400 em alta frequência é NORMAL e não conta como falha
    """
    wait_time = constant_pacing(0.5)   # 2 requisições/segundo por usuário — pressão máxima

    def on_start(self):
        dado = _proximo_token()
        if dado is None:
            raise StopUser()

        resp = self.client.get(
            f"/api/auth/acesso/{dado['token']}/",
            name='/api/auth/acesso/[token] (stress)',
        )
        if resp.status_code != 200:
            raise StopUser()

        self._jwt = resp.json()['access']
        self._headers = {'Authorization': f'Bearer {self._jwt}'}
        self._reservou = False   # cada usuário tenta uma vez com sucesso

    @task
    def disputar_slot_quente(self):
        """
        Tenta reservar o slot mais disputado repetidamente.
        Simula o "efeito manada" quando centenas de colaboradores
        recebem o e-mail e clicam no link ao mesmo tempo.
        """
        # Após reservar com sucesso, apenas re-verifica o evento (comportamento real)
        if self._reservou:
            self.client.get(
                f'/api/colaborador/eventos/{_STRESS_EVENTO_ID}/',
                name='/api/colaborador/eventos/[id] (pós-reserva)',
                headers=self._headers,
            )
            return

        with self.client.post(
            f'/api/colaborador/eventos/{_STRESS_EVENTO_ID}'
            f'/horarios/{_STRESS_SLOT_ID}/reservar/',
            name='/api/.../reservar (STRESS — mesmo slot)',
            headers=self._headers,
            catch_response=True,
        ) as resp:
            if resp.status_code == 201:
                self._reservou = True
                resp.success()
            elif resp.status_code == 400:
                # Slot ocupado ou já agendado: correto sob concorrência
                resp.success()
            elif resp.status_code == 404:
                # Slot ou evento não existe: verificar STRESS_EVENTO_ID/STRESS_SLOT_ID
                resp.failure(f'404 — verifique STRESS_EVENTO_ID={_STRESS_EVENTO_ID} '
                             f'e STRESS_SLOT_ID={_STRESS_SLOT_ID}')
                raise StopUser()
            elif resp.status_code == 500:
                # Erro crítico: lock de banco não tratado ou exceção não capturada
                resp.failure('500 — FALHA CRÍTICA: erro de concorrência não tratado!')
            else:
                resp.failure(f'HTTP inesperado: {resp.status_code}')
