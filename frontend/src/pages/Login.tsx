import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logoAeb from '../images/logoaeb.png';

export default function Login() {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro('');

    if (!email || !password) {
      setErro('Preencha e-mail e senha.');
      return;
    }

    setCarregando(true);
    try {
      await loginAdmin(email, password);
      navigate('/admin');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer login.';
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1 a 9. Cabeçalho Institucional Refatorado */}
      <header className="w-full bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center">
        <div className="flex items-center gap-4">
          <img
            src={logoAeb}
            alt="Logo Agência Espacial Brasileira"
            className="h-12 sm:h-14 w-auto"
          />
          <div className="flex flex-col justify-center">
            <span className="font-bold text-lg sm:text-xl text-slate-800 tracking-tight leading-tight">
              Agenda Bem-Estar
            </span>
            <span className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Sistema Corporativo de Gestão de Eventos de Bem-Estar
            </span>
          </div>
        </div>
      </header>

      {/* Área Principal (Card centralizado) */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden relative z-10 mb-8">
          {/* Imagem topo do card */}
          <div className="h-48 relative bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={logoAeb}
                alt="Logo AEB"
                className="h-24 sm:h-28 md:h-32 w-auto drop-shadow-md"
              />
            </div>
          </div>

          {/* Formulário */}
          <div className="p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Entrar</h1>
            <p className="text-slate-500 mb-6 text-sm">
              Acesso exclusivo para administradores do sistema.
            </p>

            {erro && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* E-mail */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  E-mail corporativo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {carregando ? (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {carregando ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>

        {/* Rodapé movido para dentro da tag main para melhor fluidez em telas muito baixas */}
        <div className="absolute bottom-6 text-xs text-slate-400">
          © 2026 Agência Espacial Brasileira
        </div>
      </main>
    </div>
  );
}