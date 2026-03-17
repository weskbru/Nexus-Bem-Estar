import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api';

type Estado = 'carregando' | 'sucesso' | 'erro';

export default function ConfirmarVagaListaEspera() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { loginViaEmail } = useAuth();

  const [estado, setEstado] = useState<Estado>('carregando');
  const [mensagemErro, setMensagemErro] = useState('');
  const [eventoId, setEventoId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) { setMensagemErro('Link inválido.'); setEstado('erro'); return; }

    fetch(`${API}/auth/confirmar-vaga/${token}/`, { method: 'POST' })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro ?? 'Erro ao confirmar.');
        loginViaEmail(data.access, data.usuario);
        setEventoId(data.evento_id);
        setEstado('sucesso');
      })
      .catch(err => {
        setMensagemErro(err instanceof Error ? err.message : 'Não foi possível confirmar a vaga.');
        setEstado('erro');
      });
  }, [token]);

  if (estado === 'carregando') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-slate-500 font-medium">Confirmando sua vaga...</p>
        </div>
      </div>
    );
  }

  if (estado === 'sucesso') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Vaga Confirmada!</h1>
          <p className="text-slate-500 text-sm mb-6">
            Seu agendamento foi criado com sucesso. Você receberá um e-mail de confirmação em breve.
          </p>
          {eventoId && (
            <button
              onClick={() => navigate(`/colaborador/eventos/${eventoId}`, { replace: true })}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              Ver meu agendamento
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Não foi possível confirmar</h1>
        <p className="text-slate-500 text-sm">{mensagemErro}</p>
      </div>
    </div>
  );
}
