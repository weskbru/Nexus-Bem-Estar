"""
Serviço de integração com LDAP / Active Directory da AEB.
"""
from __future__ import annotations
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


MOCK_USUARIOS = [
    {
        'nome': 'Jonas Silva',
        'email': 'jonas.silva@aeb.gov.br',
        'matricula': '100001',
        'departamento': 'TI',
    },
    {
        'nome': 'Maria Oliveira',
        'email': 'maria.oliveira@aeb.gov.br',
        'matricula': '100002',
        'departamento': 'Gestao de Pessoas',
    },
    {
        'nome': 'Ana Costa',
        'email': 'ana.costa@aeb.gov.br',
        'matricula': '100003',
        'departamento': 'Administrativo',
    },
]


def _usar_mock() -> bool:
    return getattr(settings, 'USUARIO_BUSCA_BACKEND', 'mock').lower() == 'mock'


def _buscar_usuarios_mock(query: str) -> list[dict]:
    termo = query.strip().lower()
    return [
        usuario.copy()
        for usuario in MOCK_USUARIOS
        if any(termo in str(valor).lower() for valor in usuario.values())
    ]


def _get_connection(user_dn: str = None, password: str = None):
    from ldap3 import Server, Connection, AUTO_BIND_NO_TLS
    host    = getattr(settings, 'LDAP_HOST', 'ldap.aeb.gov.br')
    port    = int(getattr(settings, 'LDAP_PORT', 389))
    bind_dn = user_dn  or getattr(settings, 'LDAP_BIND_DN', '')
    bind_pw = password or getattr(settings, 'LDAP_BIND_PASSWORD', '')
    server  = Server(host, port=port, connect_timeout=5)
    return Connection(server, user=bind_dn, password=bind_pw, auto_bind=AUTO_BIND_NO_TLS)


def _map(attrs: dict) -> dict:
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


def buscar_usuarios(query: str) -> list[dict]:
    if not query or len(query.strip()) < 2:
        return []
    if _usar_mock():
        return _buscar_usuarios_mock(query)
    from ldap3 import SUBTREE
    base_dn = getattr(settings, 'LDAP_BASE_DN', 'OU=USUARIOS,OU=AEB,DC=aeb,DC=gov,DC=br')
    try:
        conn = _get_connection()
        conn.search(
            base_dn,
            f'(|(displayName=*{query}*)(mail=*{query}*))',
            search_scope=SUBTREE,
            attributes=['displayName', 'cn', 'mail', 'department', 'employeeID', 'sAMAccountName'],
            size_limit=20,
        )
        results = []
        for entry in conn.entries:
            attrs = {k: entry[k].value for k in entry.entry_attributes if entry[k].value}
            u = _map(attrs)
            if u['email']:
                results.append(u)
        return results
    except Exception as e:
        logger.error('Erro LDAP buscar_usuarios: %s', e)
        return []


def email_existe_no_ad(email: str) -> bool:
    if getattr(settings, 'LDAP_SKIP_AD_CHECK', False):
        return True
    if _usar_mock():
        email_normalizado = email.strip().lower()
        return any(usuario['email'].lower() == email_normalizado for usuario in MOCK_USUARIOS)
    from ldap3 import SUBTREE
    base_dn = getattr(settings, 'LDAP_BASE_DN', 'OU=USUARIOS,OU=AEB,DC=aeb,DC=gov,DC=br')
    try:
        conn = _get_connection()
        conn.search(base_dn, f'(mail={email.strip()})', search_scope=SUBTREE, attributes=['mail'])
        return len(conn.entries) > 0
    except Exception as e:
        logger.error('Erro LDAP email_existe_no_ad: %s', e)
        return False
