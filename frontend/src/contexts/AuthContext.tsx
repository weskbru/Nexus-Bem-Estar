import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { authApi, type UsuarioDTO } from '../services/api';

interface AuthState {
  usuario: UsuarioDTO | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  loginAdmin: (email: string, password: string) => Promise<void>;
  loginViaToken: (token: string) => Promise<{ evento_id: number }>;
  loginViaEmail: (access: string, usuario: UsuarioDTO) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function carregarEstadoInicial(): AuthState {
  const token = localStorage.getItem('access_token');
  const raw = localStorage.getItem('usuario');
  const usuario: UsuarioDTO | null = raw ? JSON.parse(raw) : null;
  return { token, usuario };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(carregarEstadoInicial);

  const salvarSessao = useCallback((token: string, usuario: UsuarioDTO) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    setState({ token, usuario });
  }, []);

  const loginAdmin = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    salvarSessao(data.access, data.usuario);
  }, [salvarSessao]);

  const loginViaToken = useCallback(async (token: string) => {
    const data = await authApi.acessoViaToken(token);
    salvarSessao(data.access, data.usuario);
    return { evento_id: data.evento_id };
  }, [salvarSessao]);

  const loginViaEmail = useCallback((access: string, usuario: UsuarioDTO) => {
    salvarSessao(access, usuario);
  }, [salvarSessao]);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('usuario');
    setState({ token: null, usuario: null });
  }, []);

  return (
    <AuthContext.Provider value={{
      ...state,
      loginAdmin,
      loginViaToken,
      loginViaEmail,
      logout,
      isAuthenticated: !!state.token,
      isAdmin: !!state.usuario?.is_admin,
      isSuperAdmin: !!state.usuario?.is_superuser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
