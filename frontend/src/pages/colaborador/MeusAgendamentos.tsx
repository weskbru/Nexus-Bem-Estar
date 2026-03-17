import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, User, X, ChevronRight } from 'lucide-react';
import { parseFetchError } from '../../services/api';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api';

interface Agendamento {
  id: number;
  status: string;
  evento_id: number;
  evento_titulo: string;
  evento_data: string;
  nome_profissional: string;
  horario: { hora_inicio: string; hora_fim: string; };
  criado_em: string;
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; cor: string }> = {
  confirmado: { label: 'Confirmado', icon: CheckCircle2, cor: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  cancelado:  { label: 'Cancelado',  icon: XCircle,      cor: 'text-red-600 bg-red-50 border-red-200' },
  pendente:   { label: 'Pendente',   icon: AlertCircle,  cor: 'text-amber-600 bg-amber-50 border-amber-200' },
};

function ModalDetalhes({ ag, onClose, onCancelado }: { ag: Agendamento; onClose: () => void; onCancelado: (id: number) => void }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const cfg = statusConfig[ag.status] ?? statusConfig.pendente;
  const Icon = cfg.icon;
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleCancelar() {
    setCancelando(true);
    setErro('');
    try {
      const res = await fetch(`${API}/colaborador/agendamentos/${ag.id}/cancelar/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? 'Erro ao cancelar.');
      onCancelado(ag.id);
      onClose();
    } catch (err) {
      setErro(parseFetchError(err, 'Não foi possível cancelar o agendamento. Tente novamente.'));
      setCancelando(false);
      setConfirmando(false);
    }
  }

  const tipoEmoji: Record<string, string> = {
    massagem: '💆', yoga: '🧘', meditacao: '🕉️',
    nutricao: '🥗', pilates: '🤸', acupuntura: '🪡',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-lg">Detalhes do Agendamento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-5">
          {/* Título + emoji */}
          <div className="flex items-center gap-3">
            <span className="text-4xl">{tipoEmoji[ag.evento_titulo?.toLowerCase()] ?? '✨'}</span>
            <div>
              <p className="font-bold text-slate-900 text-base">{ag.evento_titulo}</p>
              <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cor}`}>
                <Icon className="w-3.5 h-3.5" />{cfg.label}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl divide-y divide-slate-100">
            <div className="flex items-center gap-3 px-4 py-3">
              <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase">Data</p>
                <p className="text-sm font-semibold text-slate-800">
                  {new Date(ag.evento_data + 'T00:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <Clock className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase">Horário</p>
                <p className="text-sm font-semibold text-slate-800">
                  {ag.horario.hora_inicio.substring(0, 5)} às {ag.horario.hora_fim.substring(0, 5)}
                </p>
              </div>
            </div>

            {ag.nome_profissional && (
              <div className="flex items-center gap-3 px-4 py-3">
                <User className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase">Profissional</p>
                  <p className="text-sm font-semibold text-slate-800">{ag.nome_profissional}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 px-4 py-3">
              <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase">Agendado em</p>
                <p className="text-sm font-semibold text-slate-800">
                  {new Date(ag.criado_em).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 space-y-3">
          {erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">{erro}</p>
          )}

          {ag.status === 'confirmado' && !confirmando && (
            <div className="flex gap-2">
              <button
                onClick={() => { onClose(); navigate(`/colaborador/eventos/${ag.evento_id}`); }}
                className="flex-1 h-11 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-semibold text-sm transition-colors"
              >
                Alterar Horário
              </button>
              <button
                onClick={() => setConfirmando(true)}
                className="flex-1 h-11 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-semibold text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}

          {confirmando && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-sm text-amber-800 font-medium text-center">Confirma o cancelamento?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmando(false)}
                  className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  Não
                </button>
                <button
                  onClick={handleCancelar}
                  disabled={cancelando}
                  className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {cancelando ? 'Cancelando...' : 'Sim, cancelar'}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MeusAgendamentos() {
  const { token } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [selecionado, setSelecionado] = useState<Agendamento | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`${API}/colaborador/agendamentos/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        setAgendamentos(await res.json());
      } catch {
        setErro('Não foi possível carregar seus agendamentos.');
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [token]);

  if (carregando) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-slate-500 font-medium">Carregando agendamentos...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Meus Agendamentos</h1>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-800 text-sm">{erro}</p>
        </div>
      )}

      {agendamentos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Você ainda não possui agendamentos.</p>
          <Link to="/colaborador/eventos">
            <button className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors">
              Ver Eventos Disponíveis
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {agendamentos.map(ag => {
            const cfg = statusConfig[ag.status] ?? statusConfig.pendente;
            const Icon = cfg.icon;
            return (
              <button
                key={ag.id}
                onClick={() => setSelecionado(ag)}
                className="w-full bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 hover:border-blue-300 hover:shadow-sm transition-all text-left"
              >
                <div className="flex-1 space-y-1.5">
                  <p className="font-bold text-slate-900">{ag.evento_titulo}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      {new Date(ag.evento_data + 'T00:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-500" />
                      {ag.horario.hora_inicio.substring(0, 5)} – {ag.horario.hora_fim.substring(0, 5)}
                    </span>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cfg.cor} shrink-0`}>
                  <Icon className="w-3.5 h-3.5" />{cfg.label}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {selecionado && (
        <ModalDetalhes
          ag={selecionado}
          onClose={() => setSelecionado(null)}
          onCancelado={id => setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelado' } : a))}
        />
      )}
    </div>
  );
}
