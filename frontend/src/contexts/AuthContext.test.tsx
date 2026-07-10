import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { authApi, type UsuarioDTO } from '../services/api';

function createLocalStorageMock(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

const usuarioAdmin: UsuarioDTO = {
  id: 1,
  email: 'admin@aeb.gov.br',
  nome: 'Admin',
  is_admin: true,
  is_superuser: false,
  matricula: '123',
  departamento: 'CTI',
};

describe('AuthContext', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('carrega sessao inicial do localStorage', () => {
    localStorageMock = createLocalStorageMock({
      access_token: 'token-salvo',
      usuario: JSON.stringify(usuarioAdmin),
    });
    vi.stubGlobal('localStorage', localStorageMock);

    let auth: ReturnType<typeof useAuth> | null = null;
    function Probe() {
      auth = useAuth();
      return null;
    }

    renderToString(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(auth).toMatchObject({
      token: 'token-salvo',
      usuario: usuarioAdmin,
      isAuthenticated: true,
      isAdmin: true,
      isSuperAdmin: false,
    });
  });

  it('salva sessao ao fazer login admin', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({
      access: 'access-token',
      refresh: 'refresh-token',
      usuario: usuarioAdmin,
    });

    let auth: ReturnType<typeof useAuth> | null = null;
    function Probe() {
      auth = useAuth();
      return null;
    }

    renderToString(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await auth?.loginAdmin('admin@aeb.gov.br', 'senha');

    expect(authApi.login).toHaveBeenCalledWith('admin@aeb.gov.br', 'senha');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('access_token', 'access-token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('usuario', JSON.stringify(usuarioAdmin));
  });

  it('salva sessao ao entrar via token e retorna evento', async () => {
    vi.spyOn(authApi, 'acessoViaToken').mockResolvedValue({
      access: 'access-token',
      refresh: 'refresh-token',
      usuario: usuarioAdmin,
      evento_id: 45,
      chave_mensagem: 'convite',
    });

    let auth: ReturnType<typeof useAuth> | null = null;
    function Probe() {
      auth = useAuth();
      return null;
    }

    renderToString(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await expect(auth?.loginViaToken('abc')).resolves.toEqual({ evento_id: 45 });
    expect(localStorageMock.setItem).toHaveBeenCalledWith('access_token', 'access-token');
  });

  it('salva e remove sessao via metodos diretos', () => {
    let auth: ReturnType<typeof useAuth> | null = null;
    function Probe() {
      auth = useAuth();
      return null;
    }

    renderToString(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    auth?.loginViaEmail('email-token', usuarioAdmin);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('access_token', 'email-token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('usuario', JSON.stringify(usuarioAdmin));

    auth?.logout();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('usuario');
  });

  it('falha quando useAuth e usado fora do provider', () => {
    function Probe() {
      useAuth();
      return null;
    }

    expect(() => renderToString(<Probe />)).toThrow(/AuthProvider/);
  });
});
