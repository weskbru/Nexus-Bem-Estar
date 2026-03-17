import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi, type EventoPublicoDTO } from '../services/api';
import { AlertCircle } from 'lucide-react';

type Passo = 'carregando' | 'formulario' | 'enviando' | 'erro';

export default function AcessarEvento() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { loginViaEmail } = useAuth();

  const [passo, setPasso] = useState<Passo>('carregando');
  const [evento, setEvento] = useState<EventoPublicoDTO | null>(null);
  const [erroEvento, setErroEvento] = useState('');

  const [email, setEmail] = useState('');
  const [palavraChave, setPalavraChave] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!eventoId) { setErroEvento('Link inválido.'); setPasso('erro'); return; }
    authApi.eventoPublico(Number(eventoId))
      .then(data => { setEvento(data); setPasso('formulario'); })
      .catch(() => { setErroEvento('Evento não encontrado ou não está disponível.'); setPasso('erro'); });
  }, [eventoId]);

  async function handleConfirmar() {
    setErro('');
    if (!email.trim()) { setErro('Informe seu e-mail corporativo.'); return; }
    if (evento?.requer_palavra_chave && !palavraChave.trim()) {
      setErro('Informe a palavra-chave recebida no e-mail.'); return;
    }

    setPasso('enviando');
    try {
      const data = await authApi.acessarEvento(
        Number(eventoId),
        email.trim(),
        evento?.requer_palavra_chave ? palavraChave.trim() : undefined,
      );
      loginViaEmail(data.access, data.usuario);
      navigate(`/colaborador/eventos/${data.evento_id}`, { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível acessar o evento.');
      setPasso('formulario');
    }
  }

  const tipoEmoji: Record<string, string> = {
    massagem: '💆', yoga: '🧘', meditacao: '🕉️',
    nutricao: '🥗', pilates: '🤸', acupuntura: '🪡',
  };

  if (passo === 'carregando') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (passo === 'erro') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-slate-900 mb-2">Evento Indisponível</h1>
          <p className="text-slate-500 text-sm">{erroEvento}</p>
        </div>
      </div>
    );
  }

  const emoji = evento ? (tipoEmoji[evento.tipo] ?? '✨') : '✨';

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center py-10 px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-xl overflow-hidden">

        {/* Título */}
        <div className="px-8 pt-8 pb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-800">Novo Agendamento</h1>
          <p className="text-sm text-slate-500 mt-1">{emoji} {evento?.titulo}</p>
        </div>

        <div className="px-8 pb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              E-mail corporativo <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErro(''); }}
              onKeyDown={e => e.key === 'Enter' && handleConfirmar()}
              placeholder="seu.nome@aeb.gov.br"
              disabled={passo === 'enviando'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-60"
            />
          </div>

          {evento?.requer_palavra_chave && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Palavra-chave do convite <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={palavraChave}
                onChange={e => { setPalavraChave(e.target.value); setErro(''); }}
                onKeyDown={e => e.key === 'Enter' && handleConfirmar()}
                placeholder="Digite a palavra-chave recebida no e-mail..."
                disabled={passo === 'enviando'}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-60"
              />
            </div>
          )}

          {erro && (
            <p className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />{erro}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleConfirmar}
              disabled={passo === 'enviando'}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {passo === 'enviando' ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Confirmando...
                </>
              ) : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
