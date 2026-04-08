# Skill: Boas Práticas de Software (Python)

## Objetivo da skill

Esta skill define as boas práticas de qualidade, segurança, arquitetura e manutenibilidade para o ecossistema Python.  
Ela deve ser usada por agentes de código para **revisar, gerar e refatorar código**, garantindo alinhamento com padrões da indústria e da comunidade Python.

Baseado em:
- PEP 8 e documentação oficial do ecossistema Python.
- Engenharia de Software – Pressman.
- OWASP Top 10 e The Web Application Hacker’s Handbook.
- Fundamentos da Arquitetura de Software (Mark Richards).

---

## 1. Qualidade de código e Estilos (Pythonic Way)

### 1.1 Legibilidade e Tipagem

- Todo código deve usar **Type Hints** (typing module ou nativos a partir do Python 3.9+).  
  O agente deve cobrar que funções e métodos tenham assinaturas tipadas.  
- Nomes em inglês seguindo a **PEP 8**:
  - snake_case para variáveis e funções,
  - PascalCase para classes,
  - UPPER_SNAKE_CASE para constantes.
- Evite **argumentos booleanos (flags)**.  
  Prefira usar `Enum` do módulo `enum` para opções explícitas.
- Funções devem ser curtas (máximo de ~15 linhas de lógica) e ter **responsabilidade única (SRP)**.  
- Métodos com muitos parâmetros devem ser substituídos por classes de configuração ou objetos-padrão, quando necessário.

### 1.2 Formatação e Linting

- O código gerado ou revisado deve ser compatível com as regras de **formatadores modernos** como **Black** e **Ruff**.  
- Imports devem ser organizados conforme o padrão **isort**:
  - biblioteca padrão do Python,
  - bibliotecas de terceiros,
  - imports locais (do seu projeto).
- Use imports absolutos dentro do projeto sempre que possível.

---

## 2. Segurança e Tratamento de Dados

### 2.1 Validação e Segurança de Input

- Nunca confie no input do usuário.  
  Para APIs e validação de dados complexos, exija o uso de **Pydantic** ou bibliotecas similares que garantam **tipagem e validação estrita**.
- Para banco de dados, proíba o uso de **f-strings** ou formatação direta em queries SQL, como:
  ```python
  f"SELECT * FROM users WHERE id={user_id}"
Exija o uso de ORMs modernos (ex.: SQLAlchemy) ou queries parametrizadas:

python
cursor.execute("SELECT * FROM users WHERE id=?", (user_id,))
2.2 Autenticação e Vulnerabilidades Modernas
Atente-se a vulnerabilidades listadas no OWASP Top 10 e na The Web Application Hacker’s Handbook:

SQL injection,

Broken Object Level Authorization (BOLA),

SSRF (Server‑Side Request Forgery),

Broken Authentication,

Sensitive Data Exposure,

Security Misconfiguration.

Para APIs:

BOLA:
sempre validar se o usuário autenticado tem permissão para acessar o ID solicitado.

SSRF:
validar estritamente URLs de destino caso o backend faça requisições HTTP (via requests ou httpx).

Segredos, chaves de API e senhas devem ser acessados via variáveis de ambiente (ex.: os.getenv ou pydantic-settings), nunca hard‑coded no código.

Valores de configuração (URLs de banco, timeouts, endpoints externos, feature flags) também devem vir de variáveis de ambiente ou configuração centralizada, nunca hard‑coded.

3. Arquitetura e Design (Ecossistema Python)
3.1 Separação de Camadas
Evite o “Fat Controller” (controladores/rotas grandes), muito comum em FastAPI, Flask ou Django.

Estrutura recomendada por camada:

Rotas/Controllers:

Apenas recebem requisições, chamam o serviço e retornam a resposta.

Service / Use Case:

Contém a regra de negócio central.

Repository / Infraestrutura:

Concentra o acesso a banco de dados e APIs externas.

Nunca:

colocar regra de negócio complexa diretamente em controladores;

misturar infraestrutura (banco, HTTP) com entidades de domínio.

3.2 Injeção de Dependências
Evite instanciar classes de infraestrutura (bancos, clientes HTTP) diretamente dentro de funções de regra de negócio.

O agente deve sugerir:

passar essas dependências via construtor (__init__) ou argumentos explícitos;

ou usar frameworks de DI como Depends do FastAPI ou dependency-injector.

Para novos módulos, o agente deve sugerir um padrão baseado em:

Pydantic para entrada/saída de API (schemas de request/response);

entidades de domínio com métodos de negócio bem definidos;

serviços de domínio apoiados por repositórios parametrizados por interface.

4. Tratamento de Erros e Logs (Fail Fast)
4.1 Exceções
Proíba o uso de blocos try/except vazios ou captura genérica sem repasse, como:

python
except Exception:
    pass
O código deve “falhar rápido”:

valide os dados no início da função (Guard Clauses);

se um dado estiver inválido, lance uma exceção cedo e clara.

Use e crie exceções de domínio, por exemplo:

python
raise UserNotFoundError()
em vez de lançar exceções genéricas como:

python
raise ValueError("user not found")
Sempre que a exceção puder ser tratada por um componente mais alto (ex.: handler de API) ou seja esperada, ela deve ser bem documentada no código ou nos testes.

4.2 Observabilidade
Em serviços críticos, prefira logs estruturados (JSON) para facilitar análise e monitoramento.

Sugestão de padrão para o agente:

usar o módulo padrão logging com estrutura de dicionário de contexto, ou bibliotecas como loguru;

incluir campos mínimos como:

level (info, warn, error),

message,

contexto relevante (account_id, request_id, status, etc.).

Exemplo de log estruturado recomendado:

python
logger.info("payment_processed", extra={"account_id": account_id, "amount": amount, "status": "success"})
Evite logar:

senhas,

tokens,

dados pessoais sensíveis,
salvo em formato mascarado ou após consentimento explícito.

5. Testes Unitários e Integração
O framework padrão assumido é pytest.

Os testes devem seguir a estrutura AAA (Arrange, Act, Assert) ou Given, When, Then, separados por linhas em branco para legibilidade:

python
def test_process_payment():
    # Arrange
    account = create_account(balance=100)

    # Act
    result = process_payment(account_id=account.id, amount=50)

    # Assert
    assert result.success is True
Para dependências externas ou bancos de dados, o agente deve:

usar injeção de dependências nos testes;

ou usar pytest‑mock e fixtures para simular clientes externos, bancos e outros serviços.

Nunca considere que o código está suficientemente testado se só tiver testes de sucesso:

exija pelo menos um teste de falha por fluxo relevante (ex.: teste que verifica se a função levanta a exceção correta com pytest.raises).

O agente deve incentivar:

testes de caso de erro,

testes de limites,

testes de performance ou timeout, quando o contexto justificar.

6. Tipagem e Configuração (Strict Mode)
Vale esperar que o código siga tipagem estrita (mypy ou configuração similar de Ruff/Pyright):

não use Any sem justificativa;

evite Union onde for possível usar Protocol ou estruturas mais claras.

O agente deve:

apontar o uso de typing.Any como problema de qualidade;

sugerir substituir dict/list genéricos por tipos mais específicos sempre que possível.

Configurações de produção (URLs de banco, timeouts, chaves, feature flags) devem vir de variáveis de ambiente ou configuração centralizada, nunca hard‑coded.
O código só deve conter valores default quando estritamente necessário.

7. Como esta skill deve ser usada por um agente
Sempre que analisar ou gerar código Python:

Identifique problemas de:

tipagem,

estrutura de código,

segurança,

testes,

arquitetura/manutenibilidade.

Classifique cada problema usando as tags abaixo:

[QUALIDADE: legibilidade]

[QUALIDADE: tipagem]

[SEGURANÇA: injeção SQL]

[SEGURANÇA: autenticação]

[SEGURANÇA: dados]

[ARQUITETURA: camadas]

[ARQUITETURA: DI]

[TESTES]

[ERROS: exceções]

[ERROS: logs]

Para cada problema encontrado, forneça:

Arquivo e linha (se aplicável).

O motivo claro da violação (em português simples).

Uma sugestão de código Pythonic para corrigir, seguindo os padrões dessa skill.

8. Exemplo de Avaliação Esperada (Few‑Shot Prompting)
Entrada (Código do Usuário)
python
# file: api/routes.py
from fastapi import APIRouter
import sqlite3

router = APIRouter()

@router.post("/process_payment")
def process(data: dict):
    try:
        # Pega do banco
        conn = sqlite3.connect('app.db')
        cursor = conn.cursor()
        cursor.execute(f"SELECT balance FROM accounts WHERE id={data['account_id']}")
        balance = cursor.fetchone()
        
        if balance > data['amount']:
            # Logica de negocio junto com a rota
            new_balance = balance - data['amount']
            cursor.execute(f"UPDATE accounts SET balance={new_balance} WHERE id={data['account_id']}")
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        print("error")
        return {"status": "error"}
Saída do Agente
text
[QUALIDADE: tipagem] Arquivo api/routes.py, linha 8: Falta de type hints na rota. O argumento data: dict é muito genérico.  
Sugestão: Crie um modelo Pydantic (class PaymentRequest(BaseModel):) para definir e validar account_id e amount automaticamente.

[SEGURANÇA: injeção SQL] Arquivo api/routes.py, linhas 13 e 19: Uso de f-strings para construir queries SQL com inputs do usuário permite SQL Injection.  
Sugestão: Utilize consultas parametrizadas (ex.: cursor.execute("SELECT ... WHERE id=?", (account_id,))) ou, idealmente, um ORM como SQLAlchemy.

[ARQUITETURA: camadas] Arquivo api/routes.py, linha 12: A conexão com o banco de dados e a regra de subtração de saldo (lógica de negócio) estão diretamente acopladas no controlador da API (violação de camadas).  
Sugestão: Extraia o acesso ao banco para um padrão Repository e a regra matemática para uma camada Service. Injete o Service na rota via Depends() do FastAPI.

[ERROS: logs] Arquivo api/routes.py, linha 22: Captura genérica de Exception engolindo o erro (print("error")). Isso dificulta o debug e não retorna um erro HTTP apropriado.  
Sugestão: Substitua o print por um log estruturado (ex.: logger.error("Payment failed", exc_info=True)) e lance um HTTPException(status_code=400, detail="...") para o cliente não receber uma falsa sensação de estabilidade.

[ERROS: exceções] Arquivo api/routes.py, linha 22: Captura de Exception genérica sem repasse de mensagem de erro relevante para o usuário.  
Sugestão: Use um handler de HTTPException específico (ex.: 400, 404, 500) e retorne um JSON de erro contendo detalhes sem expor dados sensíveis.
text