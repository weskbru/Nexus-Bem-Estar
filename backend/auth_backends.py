"""
Backend de autenticação LDAP para administradores.

Fluxo:
  1. Busca o usuário no banco local pelo e-mail
  2. Se USUARIO_BUSCA_BACKEND=ldap → valida a senha no AD real
  3. Se USUARIO_BUSCA_BACKEND=mock → valida contra a senha local (aeb@2026)
"""
import logging

from django.conf import settings
from django.contrib.auth.backends import ModelBackend

logger = logging.getLogger(__name__)


def _validar_ldap(email: str, password: str) -> bool:
    """Tenta bind no AD com as credenciais do usuário."""
    try:
        from ldap3 import Server, Connection, AUTO_BIND_NO_TLS, SUBTREE

        host    = getattr(settings, 'LDAP_HOST', 'ldap.aeb.gov.br')
        port    = int(getattr(settings, 'LDAP_PORT', 389))

        # 1. Busca o DN do usuário usando a conta de serviço
        bind_dn = getattr(settings, 'LDAP_BIND_DN', '')
        bind_pw = getattr(settings, 'LDAP_BIND_PASSWORD', '')
        base_dn = getattr(settings, 'LDAP_BASE_DN', 'OU=USUARIOS,OU=AEB,DC=aeb,DC=gov,DC=br')

        server  = Server(host, port=port, connect_timeout=5)
        service_conn = Connection(server, user=bind_dn, password=bind_pw, auto_bind=AUTO_BIND_NO_TLS)

        if not service_conn.bound:
            logger.error('LDAP: falha ao conectar com conta de serviço')
            return False

        service_conn.search(
            base_dn,
            f'(mail={email.strip()})',
            search_scope=SUBTREE,
            attributes=['distinguishedName'],
        )

        if not service_conn.entries:
            logger.warning('LDAP: usuário não encontrado no AD — %s', email)
            return False

        user_dn = service_conn.entries[0].entry_dn

        # 2. Tenta bind com as credenciais do próprio usuário
        user_conn = Connection(server, user=user_dn, password=password, auto_bind=AUTO_BIND_NO_TLS)
        return user_conn.bound

    except Exception as e:
        logger.error('Erro LDAP validar_credenciais: %s', e)
        return False


class LDAPOrLocalBackend(ModelBackend):
    """
    Autentica administradores.
    - LDAP real: valida senha no AD
    - Mock: valida senha local (aeb@2026)
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        from backend.models.models import Usuario

        if not username or not password:
            return None

        try:
            usuario = Usuario.objects.get(email=username.strip().lower())
        except Usuario.DoesNotExist:
            return None

        usar_ldap = getattr(settings, 'USUARIO_BUSCA_BACKEND', 'mock').lower() == 'ldap'

        if usar_ldap:
            if not _validar_ldap(username, password):
                return None
        else:
            # Mock: valida contra senha local
            if not usuario.check_password(password):
                return None

        return usuario
