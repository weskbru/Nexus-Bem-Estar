import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, User, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { parseFetchError } from '../services/api';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api';

export interface AgendamentoDetalhes {
  id: number;
  status: string;
  evento_id: number;
  evento_titulo: string;
  evento_data: string;
  nome_profissional: string;
  horario: { hora_inicio: string; hora_fim: string };
  criado_em: string;
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; cor: string }> = {
  confirmado: { label: 'Confirmado', icon: CheckCircle2, cor: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  cancelado: { label: 'Cancelado', icon: XCircle, cor: 'text-red-600 bg-red-50 border-red-200' },
  pendente: { label: 'Pendente', icon: AlertCircle, cor: 'text-amber-600 bg-amber-50 border-amber-200' },
};

interface ModalDetalhesAgendamentoProps {
  ag: AgendamentoDetalhes;
  onClose: () => void;
  onCancelado: (id: number) => void;
  onAlterarHorario?: (agendamento: AgendamentoDetalhes) => void;
  modo?: 'detalhes' | 'confirmacao' | 'sucesso';
  onConfirmarReserva?: () => void;
  confirmandoReserva?: boolean;
  textoConfirmar?: string;
}

export default function ModalDetalhesAgendamento({
  ag,
  onClose,
  onCancelado,
  onAlterarHorario,
  modo = 'detalhes',
  onConfirmarReserva,
  confirmandoReserva = false,
  textoConfirmar = 'Confirmar Agendamento',
}: ModalDetalhesAgendamentoProps) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const cfg = statusConfig[ag.status] ?? statusConfig.pendente;
  const Icon = cfg.icon;
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState('');
  const emModoSucesso = modo === 'sucesso';
  const emModoConfirmacao = modo === 'confirmacao';

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

  function handleAlterarHorario() {
    if (onAlterarHorario) {
      onClose();
      onAlterarHorario(ag);
      return;
    }
    onClose();
    navigate(`/colaborador/eventos/${ag.evento_id}`);
  }

  const tipoEmoji: Record<string, string> = {
    massagem: '💆', yoga: '🧘', meditacao: '🕉️',
    nutricao: '🥗', pilates: '🤸', acupuntura: '🪡',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-lg">
            {emModoSucesso ? 'Agendamento confirmado com sucesso' : 'Detalhes do Agendamento'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {emModoSucesso && (
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
          )}
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
                <p className="text-xs text-slate-400 font-medium uppercase">Horario</p>
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

            {!emModoConfirmacao && (
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
            )}
          </div>

          {emModoSucesso && (
            <p className="text-sm text-slate-500 text-center">Seu horário foi reservado.</p>
          )}
        </div>

        <div className="px-6 pb-6 space-y-3">
          {erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">{erro}</p>
          )}

          {emModoConfirmacao && onConfirmarReserva && (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={confirmandoReserva}
                className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
              >
                Fechar
              </button>
              <button
                onClick={onConfirmarReserva}
                disabled={confirmandoReserva}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {confirmandoReserva ? 'Confirmando...' : textoConfirmar}
              </button>
            </div>
          )}

          {modo === 'detalhes' && ag.status === 'confirmado' && !confirmando && (
            <div className="flex gap-2">
              <button
                onClick={handleAlterarHorario}
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

          {modo === 'detalhes' && confirmando && (
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

          {emModoSucesso && (
            <Link to="/colaborador/agendamentos" className="block">
              <button className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors">
                Ver Meus Agendamentos
              </button>
            </Link>
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
