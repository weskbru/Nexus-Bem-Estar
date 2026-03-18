import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi, type AcessoPreviewDTO } from '../services/api';
import { Shield, Calendar, Clock, User, AlertCircle, CheckCircle2, Key } from 'lucide-react';

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

  useEffect(() => {
    if (!token) { setErro('Link inválido.'); setEstado('erro'); return; }
    verificarToken();
  }, [token]);

  async function verificarToken() {
    try {
      const data = await authApi.verificarToken(token!);

      if ('requer_palavra_chave' in data && data.requer_palavra_chave) {
        setPreview(data);
        setEstado('aguarda_chave');
      } else {
        // Não exige palavra-chave: já recebemos o JWT — salvar sessão e redirecionar
        const resp = data as { access: string; refresh: string; usuario: import('../services/api').UsuarioDTO; evento_id: number };
        await loginViaToken(token!);
        navigate(`/colaborador/eventos/${resp.evento_id}`, { replace: true });
      }
    } catch {
      setErro('Link inválido ou expirado. Solicite um novo convite.');
      setEstado('erro');
    }
  }

  async function handleConfirmarComChave() {
    if (!palavraChave.trim()) {
      setErroChave('Informe a palavra-chave.');
      return;
    }
    setEstado('confirmando');
    setErroChave('');
    try {
      const data = await authApi.acessoViaTokenComChave(token!, palavraChave.trim());
      // Salvar sessão manualmente (loginViaToken chama GET, mas já temos os dados via POST)
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      setEstado('confirmado');
      setTimeout(() => {
        navigate(`/colaborador/eventos/${data.evento_id}`, { replace: true });
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao validar palavra-chave.';
      setErroChave(msg);
      setEstado('aguarda_chave');
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (estado === 'carregando') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-slate-500 font-medium">Carregando convite...</p>
        </div>
      </div>
    );
  }

  // ── Erro ───────────────────────────────────────────────────────────────────
  if (estado === 'erro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-900 text-center mb-2">Link Inválido</h1>
          <p className="text-slate-500 text-center mb-6">{erro}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  // ── Confirmado ─────────────────────────────────────────────────────────────
  if (estado === 'confirmado') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Acesso Liberado!</h1>
          <p className="text-slate-500">Redirecionando para o evento...</p>
        </div>
      </div>
    );
  }

  // ── Aguarda palavra-chave ──────────────────────────────────────────────────
  const tipoEmoji: Record<string, string> = {
    massagem: '💆', yoga: '🧘', meditacao: '🕉️',
    nutricao: '🥗', pilates: '🤸', acupuntura: '🪡',
  };
  const emoji = preview ? (tipoEmoji[preview.evento_tipo] ?? '✨') : '✨';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">⭐</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Agenda Bem-Estar</h1>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header do evento */}
          <div className="h-40 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            <span className="text-6xl">{emoji}</span>
          </div>

          <div className="p-8">
            {preview && (
              <>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">{preview.evento_titulo}</h2>

                <div className="bg-slate-50 rounded-2xl p-5 mb-8 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {new Date(preview.evento_data + 'T00:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Horário</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {preview.evento_hora_inicio.substring(0, 5)} às {preview.evento_hora_fim.substring(0, 5)}
                      </p>
                    </div>
                  </div>

                  {preview.nome_profissional && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Profissional</p>
                        <p className="text-sm font-semibold text-slate-900">{preview.nome_profissional}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Campo palavra-chave */}
            <div className="mb-6">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2">
                <Key className="w-4 h-4 text-blue-600" />
                Palavra-chave de acesso
              </label>
              <input
                type="text"
                value={palavraChave}
                onChange={e => { setPalavraChave(e.target.value); setErroChave(''); }}
                onKeyDown={e => e.key === 'Enter' && handleConfirmarComChave()}
                placeholder="Digite a palavra-chave recebida..."
                className={`w-full px-4 py-3 border rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${erroChave ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
              />
              {erroChave && (
                <p className="mt-1.5 flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />{erroChave}
                </p>
              )}
            </div>

            <button
              onClick={handleConfirmarComChave}
              disabled={estado === 'confirmando'}
              className="w-full px-6 py-3 rounded-xl font-semibold text-white text-base transition-all bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {estado === 'confirmando' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Validando...
                </span>
              ) : 'Acessar Evento'}
            </button>

            <div className="flex items-center justify-center gap-2 mt-6 text-slate-400">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="text-sm">SISTEMA INTERNO SEGURO</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-slate-500 text-sm">
          <p>© 2026 Agenda Bem-Estar • Gestão de Qualidade de Vida</p>
        </div>
      </div>
    </div>
  );
}
