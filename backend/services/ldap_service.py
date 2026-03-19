"""
Serviço de integração com LDAP / Active Directory.

Modo DESENVOLVIMENTO: dados Mock simulando o AD da AEB.
Modo PRODUÇÃO: substituir `buscar_usuarios()` pela chamada real
               ao servidor LDAP usando django-auth-ldap ou ldap3.
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# TODO (LDAP): Remover esta constante quando a autenticação via AD estiver
# implementada. Em produção, a senha será validada diretamente no LDAP/AD
# e não ficará armazenada no banco de dados local.
# ---------------------------------------------------------------------------
MOCK_SENHA_PADRAO = 'aeb@2026'

# ---------------------------------------------------------------------------
# Base Mock — simula o Active Directory da AEB
# TODO (LDAP): Remover toda esta lista e a função abaixo quando substituir
# pela chamada real ao servidor LDAP/AD.
# ---------------------------------------------------------------------------

MOCK_USUARIOS: list[dict] = [
    {
        'nome':         'Jonas.Silva',
        'email':        'jonas.silva@aeb.gov.br',
        'matricula':    '100234',
        'departamento': 'CTI - Centro de Tecnologia da Informação',
    },
    {
        'nome':         'Wesley.pereira',
        'email':        'wesley.pereira@aeb.gov.br',
        'matricula':    '100567',
        'departamento': 'CTI - Centro de Tecnologia da Informação',
    },
    {
        'nome':         'Eliaquim Ramos',
        'email':        'eliaquim.ramos@aeb.gov.br',
        'matricula':    '100891',
        'departamento': 'CTI - Centro de Tecnologia da Informação',
    },
    {
        'nome':         'Bianca.wolfgram',
        'email':        'bianca.wolfgram@aeb.gov.br',
        'matricula':    '101023',
        'departamento': 'CTI - Centro de Tecnologia da Informação',
    },
    {
        'nome':         'Anderson.malta',
        'email':        'anderson.malta@aeb.gov.br',
        'matricula':    '101145',
        'departamento': 'Gestão de Projetos',
    },
    {
        'nome':         'gabriel.souza',
        'email':        'gabriel.souza@aeb.gov.br',
        'matricula':    '101267',
        'departamento': 'CTI - Centro de Tecnologia da Informação',
    },
    {
        'nome':         'Juliana Ramos Pereira',
        'email':        'juliana.pereira@aeb.gov.br',
        'matricula':    '101389',
        'departamento': 'Pesquisa e Desenvolvimento',
    },
    {
        'nome':         'Marcelo Oliveira Santos',
        'email':        'marcelo.santos@aeb.gov.br',
        'matricula':    '101512',
        'departamento': 'Recursos Humanos',
    },
    {
        'nome':         'Beatriz Nunes Cardoso',
        'email':        'beatriz.cardoso@aeb.gov.br',
        'matricula':    '101634',
        'departamento': 'Administração',
    },
    {
        'nome':         'Thiago Barbosa Melo',
        'email':        'thiago.melo@aeb.gov.br',
        'matricula':    '101756',
        'departamento': 'Segurança da Informação',
    },
    {
        'nome':         'Larissa Campos Vieira',
        'email':        'larissa.vieira@aeb.gov.br',
        'matricula':    '101878',
        'departamento': 'Engenharia de Sistemas',
    },
    {
        'nome':         'Rafael Pinto Gomes',
        'email':        'rafael.gomes@aeb.gov.br',
        'matricula':    '102001',
        'departamento': 'Comunicação Social',
    },
    {
        'nome':         'Andre Silva',
        'email':        'andre.silva@aeb.gov.br',
        'matricula':    '102100',
        'departamento': 'CTI - Centro de Tecnologia da Informação',
    },
    {
        'nome':         'Gabriel Silva',
        'email':        'gabriel.silva@aeb.gov.br',
        'matricula':    '102101',
        'departamento': 'CTI - Centro de Tecnologia da Informação',
    },
    {
        'nome':         'Anna Correa',
        'email':        'anna.correa@aeb.gov.br',
        'matricula':    '102102',
        'departamento': 'CTI - Centro de Tecnologia da Informação',
    },
    {
        'nome':         'Riany Ximenes',
        'email':        'riany.ximenes@aeb.gov.br',
        'matricula':    '102103',
        'departamento': 'CTI - Centro de Tecnologia da Informação',
    },
    {
        'nome':         'Ricardo Santos',
        'email':        'ricardo.santos@aeb.gov.br',
        'matricula':    '102104',
        'departamento': 'CTI - Centro de Tecnologia da Informação',
    },
    {
        'nome':         'Rafael Rabello',
        'email':        'rafael.rabello@aeb.gov.br',
        'matricula':    '102105',
        'departamento': 'CTI - Centro de Tecnologia da Informação',
    },
]


# ---------------------------------------------------------------------------
# Função pública
# ---------------------------------------------------------------------------

def email_existe_no_ad(email: str) -> bool:
    """
    Verifica se um e-mail pertence a um colaborador registrado no AD.

    Em desenvolvimento: verifica na lista Mock.
    Em produção: substituir pela consulta real ao LDAP.
    """
    email = email.strip().lower()
    return any(u['email'].lower() == email for u in MOCK_USUARIOS)


def buscar_usuarios(query: str) -> list[dict]:
    """
    Busca usuários no LDAP/AD por nome, e-mail ou matrícula.

    Em desenvolvimento retorna dados Mock filtrados.
    Em produção, substituir o corpo desta função pela chamada real ao LDAP:

        import ldap3
        server = ldap3.Server(settings.LDAP_SERVER_URI)
        conn = ldap3.Connection(server, settings.LDAP_BIND_DN, settings.LDAP_BIND_PASSWORD, auto_bind=True)
        conn.search(settings.LDAP_BASE_DN, f'(|(cn=*{query}*)(mail=*{query}*)(employeeID=*{query}*))', ...)
        return [{'nome': e.cn.value, 'email': e.mail.value, ...} for e in conn.entries]
    """
    if not query or len(query.strip()) < 2:
        return []

    q = query.strip().lower()
    return [
        u for u in MOCK_USUARIOS
        if q in u['nome'].lower()
        or q in u['email'].lower()
        or q in u['matricula'].lower()
        or q in u['departamento'].lower()
    ]
