import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi, type EventoPublicoDTO } from '../services/api';
import { Calendar, Clock, User, Key, AlertCircle, CheckCircle2, Shield } from 'lucide-react';

type Estado = 'carregando' | 'formulario' | 'enviando' | 'confirmado' | 'erro';

export default function AcessarEvento() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { loginViaEmail } = useAuth();

  const [estado, setEstado] = useState<Estado>('carregando');
  const [evento, setEvento] = useState<EventoPublicoDTO | null>(null);
  const [email, setEmail] = useState('');
  const [palavraChave, setPalavraChave] = useState('');
  const [erro, setErro] = useState('');
  const [erroEvento, setErroEvento] = useState('');

  useEffect(() => {
    if (!eventoId) { setErroEvento('Link inválido.'); setEstado('erro'); return; }
    authApi.eventoPublico(Number(eventoId))
      .then(data => { setEvento(data); setEstado('formulario'); })
      .catch(() => { setErroEvento('Evento não encontrado ou não está disponível.'); setEstado('erro'); });
  }, [eventoId]);

  async function handleAcessar() {
    if (!email.trim()) { setErro('Informe seu e-mail corporativo.'); return; }
    if (evento?.requer_palavra_chave && !palavraChave.trim()) {
      setErro('Informe a palavra-chave recebida no e-mail.'); return;
    }
    setEstado('enviando');
    setErro('');
    try {
      const data = await authApi.acessarEvento(
        Number(eventoId),
        email.trim(),
        evento?.requer_palavra_chave ? palavraChave.trim() : undefined,
      );
      loginViaEmail(data.access, data.usuario);
      navigate(`/colaborador/eventos/${data.evento_id}`, { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao acessar o evento.');
      setEstado('formulario');
    }
  }

  const tipoEmoji: Record<string, string> = {
    massagem: '💆', yoga: '🧘', meditacao: '🕉️',
    nutricao: '🥗', pilates: '🤸', acupuntura: '🪡',
  };

  if (estado === 'carregando') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-slate-500 font-medium">Carregando evento...</p>
        </div>
      </div>
    );
  }

  if (estado === 'erro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Evento Indisponível</h1>
          <p className="text-slate-500">{erroEvento}</p>
        </div>
      </div>
    );
  }

  if (estado === 'confirmado') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Acesso Liberado!</h1>
          <p className="text-slate-500">Redirecionando para o evento...</p>
        </div>
      </div>
    );
  }

  const emoji = evento ? (tipoEmoji[evento.tipo] ?? '✨') : '✨';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">⭐</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Agenda Bem-Estar</h1>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-40 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            <span className="text-6xl">{emoji}</span>
          </div>

          <div className="p-8">
            {evento && (
              <>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">{evento.titulo}</h2>

                <div className="bg-slate-50 rounded-2xl p-5 mb-8 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR', {
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
                        {evento.hora_inicio.substring(0, 5)} às {evento.hora_fim.substring(0, 5)}
                      </p>
                    </div>
                  </div>

                  {evento.nome_profissional && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Profissional</p>
                        <p className="text-sm font-semibold text-slate-900">{evento.nome_profissional}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  E-mail corporativo
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErro(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAcessar()}
                  placeholder="seu.nome@aeb.gov.br"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              {evento?.requer_palavra_chave && (
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                    <Key className="w-4 h-4 text-blue-600" />
                    Palavra-chave de acesso
                  </label>
                  <input
                    type="text"
                    value={palavraChave}
                    onChange={e => { setPalavraChave(e.target.value); setErro(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleAcessar()}
                    placeholder="Digite a palavra-chave recebida no e-mail..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
              )}

              {erro && (
                <p className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />{erro}
                </p>
              )}
            </div>

            <button
              onClick={handleAcessar}
              disabled={estado === 'enviando'}
              className="w-full px-6 py-3 rounded-xl font-semibold text-white text-base transition-all bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {estado === 'enviando' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Validando...
                </span>
              ) : 'Acessar e Agendar'}
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
