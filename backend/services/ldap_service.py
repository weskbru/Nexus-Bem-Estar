"""
Serviço de integração com LDAP / Active Directory.

Troca Mock → LDAP real: defina USUARIO_BUSCA_BACKEND=ldap no .env
"""
from __future__ import annotations
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

MOCK_SENHA_PADRAO = 'aeb@2026'

# ---------------------------------------------------------------------------
# Mock — simula o AD para desenvolvimento local
# ---------------------------------------------------------------------------
MOCK_USUARIOS: list[dict] = [
    {'nome': 'Jonas Silva',            'email': 'jonas.silva@aeb.gov.br',      'matricula': '100234', 'departamento': 'CTI'},
    {'nome': 'Wesley Pereira',         'email': 'wesley.pereira@aeb.gov.br',   'matricula': '100567', 'departamento': 'CTI'},
    {'nome': 'Eliaquim Ramos',         'email': 'eliaquim.ramos@aeb.gov.br',   'matricula': '100891', 'departamento': 'CTI'},
    {'nome': 'Bianca Wolfgram',        'email': 'bianca.wolfgram@aeb.gov.br',  'matricula': '101023', 'departamento': 'CTI'},
    {'nome': 'Anderson Malta',         'email': 'anderson.malta@aeb.gov.br',   'matricula': '101145', 'departamento': 'CTI'},
    {'nome': 'Andre Silva',            'email': 'andre.silva@aeb.gov.br',       'matricula': '102100', 'departamento': 'CTI'},
    {'nome': 'Gabriel Silva',          'email': 'gabriel.silva@aeb.gov.br',    'matricula': '102101', 'departamento': 'CTI'},
    {'nome': 'Anna Correa',            'email': 'anna.correa@aeb.gov.br',      'matricula': '102102', 'departamento': 'CTI'},
    {'nome': 'Riany Ximenes',          'email': 'riany.ximenes@aeb.gov.br',    'matricula': '102103', 'departamento': 'CTI'},
    {'nome': 'Ricardo Santos',         'email': 'ricardo.santos@aeb.gov.br',   'matricula': '102104', 'departamento': 'CTI'},
    {'nome': 'Rafael Rabello',         'email': 'rafael.rabello@aeb.gov.br',   'matricula': '102105', 'departamento': 'CTI'},
    {'nome': 'Juliana Ramos',          'email': 'juliana.pereira@aeb.gov.br',  'matricula': '101389', 'departamento': 'P&D'},
    {'nome': 'Marcelo Santos',         'email': 'marcelo.santos@aeb.gov.br',   'matricula': '101512', 'departamento': 'RH'},
    {'nome': 'Beatriz Cardoso',        'email': 'beatriz.cardoso@aeb.gov.br',  'matricula': '101634', 'departamento': 'ADM'},
    {'nome': 'Thiago Melo',            'email': 'thiago.melo@aeb.gov.br',      'matricula': '101756', 'departamento': 'Segurança'},
    {'nome': 'Larissa Vieira',         'email': 'larissa.vieira@aeb.gov.br',   'matricula': '101878', 'departamento': 'Engenharia'},
    {'nome': 'Rafael Gomes',           'email': 'rafael.gomes@aeb.gov.br',     'matricula': '102001', 'departamento': 'Comunicação'},
]


def _buscar_mock(query: str) -> list[dict]:
    q = query.strip().lower()
    return [
        u for u in MOCK_USUARIOS
        if q in u['nome'].lower()
        or q in u['email'].lower()
        or q in u['matricula'].lower()
        or q in u['departamento'].lower()
    ]


def _email_existe_mock(email: str) -> bool:
    email = email.strip().lower()
    return any(u['email'].lower() == email for u in MOCK_USUARIOS)


# ---------------------------------------------------------------------------
# LDAP real
# ---------------------------------------------------------------------------
def _get_ldap_connection(user_dn: str = None, password: str = None):
    from ldap3 import Server, Connection, AUTO_BIND_NO_TLS
    host     = getattr(settings, 'LDAP_HOST', 'ldap.aeb.gov.br')
    port     = int(getattr(settings, 'LDAP_PORT', 389))
    bind_dn  = user_dn  or getattr(settings, 'LDAP_BIND_DN', '')
    bind_pw  = password or getattr(settings, 'LDAP_BIND_PASSWORD', '')
    server   = Server(host, port=port, connect_timeout=5)
    return Connection(server, user=bind_dn, password=bind_pw, auto_bind=AUTO_BIND_NO_TLS)


def _map_ldap(attrs: dict) -> dict:
    def s(val):
        if isinstance(val, list):
            return val[0] if val else ''
        return str(val) if val else ''
    return {
        'nome':         s(attrs.get('displayName') or attrs.get('cn')),
        'email':        s(attrs.get('mail')),
        'matricula':    s(attrs.get('employeeID') or attrs.get('sAMAccountName', '')),
        'departamento': s(attrs.get('department')),
    }


def _buscar_ldap(query: str) -> list[dict]:
    from ldap3 import SUBTREE
    base_dn = getattr(settings, 'LDAP_BASE_DN', 'OU=USUARIOS,OU=AEB,DC=aeb,DC=gov,DC=br')
    try:
        conn = _get_ldap_connection()
        filtro = f'(|(displayName=*{query}*)(mail=*{query}*))'
        conn.search(
            base_dn, filtro,
            search_scope=SUBTREE,
            attributes=['displayName', 'cn', 'mail', 'department', 'employeeID', 'sAMAccountName'],
            size_limit=20,
        )
        results = []
        for entry in conn.entries:
            attrs = {k: entry[k].value for k in entry.entry_attributes if entry[k].value}
            u = _map_ldap(attrs)
            if u['email']:
                results.append(u)
        return results
    except Exception as e:
        logger.error('Erro LDAP buscar: %s', e)
        return []


def _email_existe_ldap(email: str) -> bool:
    from ldap3 import SUBTREE
    base_dn = getattr(settings, 'LDAP_BASE_DN', 'OU=USUARIOS,OU=AEB,DC=aeb,DC=gov,DC=br')
    try:
        conn = _get_ldap_connection()
        conn.search(base_dn, f'(mail={email.strip()})', search_scope=SUBTREE, attributes=['mail'])
        return len(conn.entries) > 0
    except Exception as e:
        logger.error('Erro LDAP email_existe: %s', e)
        return False


# ---------------------------------------------------------------------------
# API pública — escolhe backend via settings
# ---------------------------------------------------------------------------
def _usar_ldap() -> bool:
    return getattr(settings, 'USUARIO_BUSCA_BACKEND', 'mock').lower() == 'ldap'


def buscar_usuarios(query: str) -> list[dict]:
    if not query or len(query.strip()) < 2:
        return []
    return _buscar_ldap(query) if _usar_ldap() else _buscar_mock(query)


def email_existe_no_ad(email: str) -> bool:
    return _email_existe_ldap(email) if _usar_ldap() else _email_existe_mock(email)
