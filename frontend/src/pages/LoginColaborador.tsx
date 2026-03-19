import { useState } from 'react';
import { LogIn, Eye, EyeOff, AlertCircle, Key } from 'lucide-react';
import logoAeb from '../images/logoaeb.png';

export default function LoginColaborador() {
  const [email, setEmail] = useState('');
  const [palavraChave, setPalavraChave] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Função simulada para o submit (substitua pela sua lógica de Auth)
  async function handleSubmit() {
    setErro('');
    if (!email || !palavraChave) {
      setErro('Preencha e-mail e a palavra-chave.');
      return;
    }
    setCarregando(true);
    // Simulação de delay
    setTimeout(() => {
      setCarregando(false);
    }, 1500);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
      
      {/* Container Centralizado com Largura Aumentada (max-w-lg) */}
      <div className="w-full max-w-lg flex flex-col items-center">
        
        {/* Identidade Visual */}
        <div className="mb-8 text-center flex flex-col items-center">
          <img
            src={logoAeb}
            alt="Logo Agência Espacial Brasileira"
            className="h-16 sm:h-20 w-auto mb-4 drop-shadow-sm"
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Agenda Bem-Estar
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
            Gestão de Eventos Corporativos
          </p>
        </div>

        {/* Card do Formulário com Altura Orgânica Aumentada (py-16) */}
        <main className="w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:px-12 sm:py-16 transition-all">
          <div className="mb-10">
            <h2 className="text-xl font-bold text-slate-800">Acesso Restrito</h2>
            <p className="text-slate-500 text-sm mt-1">
              Faça login para administrar o sistema.
            </p>
          </div>

          {erro && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 mb-8 text-sm font-medium animate-pulse">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{erro}</span>
            </div>
          )}

          {/* Maior espaçamento vertical entre os campos (space-y-8) */}
          <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} className="space-y-8">
            
            {/* E-mail */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                E-mail corporativo
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 text-sm transition-all duration-200 outline-none"
                  placeholder="nome@aeb.gov.br"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Palavra-chave */}
            <div className="space-y-2">
              <label htmlFor="palavraChave" className="block text-sm font-semibold text-slate-700">
                Palavra-chave do convite <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-400">
                  <Key className="h-5 w-5" />
                </div>
                <input
                  id="palavraChave"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={palavraChave}
                  onChange={e => setPalavraChave(e.target.value)}
                  className="block w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 text-sm transition-all duration-200 outline-none"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  aria-label={mostrarSenha ? "Ocultar palavra-chave" : "Mostrar palavra-chave"}
                >
                  {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Botão de Submit com mais espaçamento superior (pt-4) */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={carregando}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md hover:shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
              >
                {carregando ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                {carregando ? 'Autenticando...' : 'Entrar no Sistema'}
              </button>
            </div>
          </form>
        </main>

        {/* Rodapé Dinâmico e Responsivo */}
        <footer className="mt-8 text-center text-xs font-medium text-slate-400">
          © {new Date().getFullYear()} Agência Espacial Brasileir - CTI
        </footer>
      </div>
    </div>
  );
}