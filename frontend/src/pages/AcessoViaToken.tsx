import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi, type AcessoPreviewDTO } from '../services/api';
import { ShieldCheck, Calendar, Clock, User, AlertCircle, CheckCircle2, Key, Eye, EyeOff, Loader2 } from 'lucide-react';
import logoAeb from '../images/logoaeb.png';

type Estado = 'carregando' | 'sem_chave' | 'aguarda_chave' | 'confirmando' | 'confirmado' | 'erro';

export default function AcessoViaToken() {
  const { token } = useParams<{ token: string }>();
  const { loginViaToken } = useAuth();
  const navigate = useNavigate();

  const [estado, setEstado] = useState<Estado>('carregando');
  const [erro, setErro] = useState('');
  const [preview, setPreview] = useState<AcessoPreviewDTO | null>(null);
  const [palavraChave, setPalavraChave] = useState('');
  const [erroChave, setErroChave] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    if (!token) { setErro('Link de acesso inválido ou ausente.'); setEstado('erro'); return; }
    verificarToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function verificarToken() {
    try {
      const data = await authApi.verificarToken(token!);

      if ('requer_palavra_chave' in data && data.requer_palavra_chave) {
        setPreview(data);
        setEstado('aguarda_chave');
      } else {
        const resp = data as { access: string; refresh: string; usuario: import('../services/api').UsuarioDTO; evento_id: number };
        await loginViaToken(token!);
        navigate(`/colaborador/eventos/${resp.evento_id}`, { replace: true });
      }
    } catch {
      setErro('Este convite é inválido ou já expirou. Solicite um novo link ao administrador.');
      setEstado('erro');
    }
  }

  async function handleConfirmarComChave() {
    if (!palavraChave.trim()) {
      setErroChave('A palavra-chave é obrigatória.');
      return;
    }
    setEstado('confirmando');
    setErroChave('');
    try {
      const data = await authApi.acessoViaTokenComChave(token!, palavraChave.trim());
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      setEstado('confirmado');
      setTimeout(() => {
        navigate(`/colaborador/eventos/${data.evento_id}`, { replace: true });
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Palavra-chave incorreta. Tente novamente.';
      setErroChave(msg);
      setEstado('aguarda_chave');
    }
  }

  const tipoEmoji: Record<string, string> = {
    massagem: '💆', yoga: '🧘', meditacao: '🕉️',
    nutricao: '🥗', pilates: '🤸', acupuntura: '🪡',
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (estado === 'carregando') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600 mb-4" />
        <p className="text-slate-500 font-bold tracking-wide">Validando convite seguro...</p>
      </div>
    );
  }

  // ── Erro ───────────────────────────────────────────────────────────────────
  if (estado === 'erro') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:px-12 sm:py-16 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Acesso Negado</h1>
          <p className="text-slate-500 mb-8 font-medium leading-relaxed">{erro}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all shadow-sm"
          >
            Voltar para a página inicial
          </button>
        </div>
      </div>
    );
  }

  // ── Confirmado ─────────────────────────────────────────────────────────────
  if (estado === 'confirmado') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:px-12 sm:py-16 text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-bounce" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Acesso Liberado!</h1>
          <p className="text-slate-500 font-medium flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Redirecionando para o evento...
          </p>
        </div>
      </div>
    );
  }

  // ── Aguarda palavra-chave ──────────────────────────────────────────────────
  const emoji = preview ? (tipoEmoji[preview.evento_tipo] ?? '✨') : '✨';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
      
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
            Convite Corporativo
          </p>
        </div>

        <main className="w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:px-12 sm:py-12 transition-all">
          
          {preview && (
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-blue-50 text-3xl flex items-center justify-center rounded-2xl shadow-sm border border-blue-100 shrink-0">
                  {emoji}
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-0.5">Você foi convidado(a) para</p>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight line-clamp-2">
                    {preview.evento_titulo}
                  </h2>
                </div>
              </div>

              {/* Box de Informações do Evento */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl divide-y divide-slate-200/60 shadow-sm">
                <div className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Data</p>
                    <p className="text-sm font-semibold text-slate-900 capitalize">
                      {new Date(preview.evento_data + 'T00:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Horário</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {preview.evento_hora_inicio.substring(0, 5)} até {preview.evento_hora_fim.substring(0, 5)}
                    </p>
                  </div>
                </div>

                {preview.nome_profissional && (
                  <div className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Profissional</p>
                      <p className="text-sm font-semibold text-slate-900">{preview.nome_profissional}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {erroChave && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm font-medium animate-pulse">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{erroChave}</span>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); void handleConfirmarComChave(); }} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="palavraChave" className="block text-sm font-semibold text-slate-700">
                Palavra-chave do convite <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${erroChave ? 'text-red-400' : 'text-slate-400 group-focus-within:text-blue-500'}`}>
                  <Key className="h-5 w-5" />
                </div>
                <input
                  id="palavraChave"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={palavraChave}
                  onChange={e => { setPalavraChave(e.target.value); setErroChave(''); }}
                  className={`block w-full pl-11 pr-12 py-3 bg-slate-50 border rounded-xl text-slate-900 text-sm transition-all duration-200 outline-none
                    ${erroChave 
                      ? 'border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white' 
                      : 'border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                  placeholder="Digite a palavra-chave recebida"
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={estado === 'confirmando'}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md hover:shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
              >
                {estado === 'confirmando' ? (
                  <Loader2 className="animate-spin h-5 w-5 text-white" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                {estado === 'confirmando' ? 'Autenticando...' : 'Acessar Inscrição'}
              </button>
            </div>
          </form>

          {/* Selo de Segurança */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Acesso Restrito e Seguro</span>
            </div>
          </div>
        </main>

        {/* Rodapé Dinâmico */}
        <footer className="mt-8 text-center text-xs font-medium text-slate-400">
          © {new Date().getFullYear()} Agência Espacial Brasileira
        </footer>
      </div>
    </div>
  );
}