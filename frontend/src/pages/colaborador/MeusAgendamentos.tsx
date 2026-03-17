import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import ModalDetalhesAgendamento, { type AgendamentoDetalhes } from '../../components/ModalDetalhesAgendamento';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api';

type Agendamento = AgendamentoDetalhes;

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; cor: string }> = {
  confirmado: { label: 'Confirmado', icon: CheckCircle2, cor: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  cancelado:  { label: 'Cancelado',  icon: XCircle,      cor: 'text-red-600 bg-red-50 border-red-200' },
  pendente:   { label: 'Pendente',   icon: AlertCircle,  cor: 'text-amber-600 bg-amber-50 border-amber-200' },
};

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
        <ModalDetalhesAgendamento
          ag={selecionado}
          onClose={() => setSelecionado(null)}
          onCancelado={(id: number) => setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelado' } : a))}
        />
      )}
    </div>
  );
}
