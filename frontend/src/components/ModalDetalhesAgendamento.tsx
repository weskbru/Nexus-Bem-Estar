import { useEffect, useRef, useState } from 'react';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, User, X, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { parseFetchError } from '../services/api';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api';
const CANCELAMENTO_MINUTOS_ANTECEDENCIA = 30;

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
  confirmado: { label: 'Confirmado', icon: CheckCircle2, cor: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  cancelado: { label: 'Cancelado', icon: XCircle, cor: 'text-red-700 bg-red-50 border-red-200' },
  pendente: { label: 'Pendente', icon: AlertCircle, cor: 'text-amber-700 bg-amber-50 border-amber-200' },
};

interface ModalDetalhesAgendamentoProps {
  ag: AgendamentoDetalhes;
  onClose: () => void;
  onCancelado: (id: number) => void;
  onAlterarHorario?: (agendamento: AgendamentoDetalhes) => void;
  modo?: 'detalhes' | 'confirmacao' | 'sucesso';
  onConfirmarReserva?: (otp: string) => void;
  confirmandoReserva?: boolean;
  textoConfirmar?: string;
  textoSucesso?: string;
  descricaoSucesso?: string;
  horarioId?: number;
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
  textoSucesso = 'Reserva Confirmada!',
  descricaoSucesso = 'Seu horário foi reservado com sucesso.',
  horarioId,
}: Readonly<ModalDetalhesAgendamentoProps>) {
  const { token } = useAuth();
  const cfg = statusConfig[ag.status] ?? statusConfig.pendente;
  const Icon = cfg.icon;
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState('');

  // Etapa OTP dentro do modo confirmacao
  const [etapa, setEtapa] = useState<'confirmar' | 'otp'>('confirmar');
  const [enviandoOtp, setEnviandoOtp] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset etapa quando modo muda (ex: ao reabrir o modal)
  useEffect(() => {
    if (modo !== 'confirmacao') {
      setEtapa('confirmar');
      setOtp(['', '', '', '']);
      setErro('');
    }
  }, [modo]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function iniciarContagem() {
    setSegundosRestantes(300);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSegundosRestantes(s => {
        if (s <= 1) { clearInterval(timerRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  function formatarTempo(s: number) {
    const m = Math.floor(s / 60);
    const seg = s % 60;
    return `${m}:${String(seg).padStart(2, '0')}`;
  }

  function dataHoraInicioAgendamento() {
    const horaInicio = ag.horario.hora_inicio.length === 5 ? `${ag.horario.hora_inicio}:00` : ag.horario.hora_inicio;
    return new Date(`${ag.evento_data}T${horaInicio}`);
  }

  function limiteCancelamento() {
    return new Date(dataHoraInicioAgendamento().getTime() - CANCELAMENTO_MINUTOS_ANTECEDENCIA * 60 * 1000);
  }

  const cancelamentoBloqueadoPorHorario = (
    modo === 'detalhes' &&
    ag.status === 'confirmado' &&
    Date.now() > limiteCancelamento().getTime()
  );
  const limiteCancelamentoFormatado = limiteCancelamento().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  async function handleSolicitarOtp() {
    if (!horarioId) return;
    setEnviandoOtp(true);
    setErro('');
    try {
      const res = await fetch(`${API}/colaborador/horarios/${horarioId}/solicitar-otp/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? 'Erro ao enviar código.');
      setOtp(['', '', '', '']);
      setEtapa('otp');
      iniciarContagem();
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } catch (err) {
      setErro(parseFetchError(err, 'Não foi possível enviar o código. Tente novamente.'));
    } finally {
      setEnviandoOtp(false);
    }
  }

  function handleOtpInput(index: number, valor: string) {
    const digito = valor.replace(/\D/g, '').slice(-1);
    const novo = [...otp];
    novo[index] = digito;
    setOtp(novo);
    setErro('');
    if (digito && index < 3) inputsRef.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handleConfirmarComOtp() {
    const codigo = otp.join('');
    if (codigo.length < 4) { setErro('Digite os 4 dígitos do código.'); return; }
    onConfirmarReserva?.(codigo);
  }

  const emModoSucesso = modo === 'sucesso';
  const emModoConfirmacao = modo === 'confirmacao';

  async function handleCancelar() {
    if (cancelamentoBloqueadoPorHorario) {
      setErro('Cancelamento permitido apenas ate 30 minutos antes do horario agendado.');
      setConfirmando(false);
      return;
    }

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

  function tituloHeader() {
    if (emModoConfirmacao && etapa === 'otp') return 'Confirmar com Código';
    if (emModoConfirmacao) return 'Confirmar Reserva';
    return 'Detalhes do Agendamento';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm transition-all">
      <button
        type="button"
        aria-label="Fechar modal"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        {emModoSucesso ? (
          <div className="bg-emerald-500 pt-8 pb-6 px-6 text-center text-white relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-emerald-100 hover:text-white hover:bg-emerald-600 p-1.5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm animate-in zoom-in-50 duration-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight mb-1">{textoSucesso}</h2>
            <p className="text-emerald-50 text-sm font-medium">{descricaoSucesso}</p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-extrabold text-slate-900 text-lg tracking-tight">{tituloHeader()}</h2>
            <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-6 space-y-6">

          {/* Título do Evento e Status */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-3xl shadow-sm shrink-0">
              {tipoEmoji[ag.evento_titulo?.toLowerCase()] ?? '✨'}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-base leading-tight">{ag.evento_titulo}</p>
              {!emModoSucesso && !emModoConfirmacao && (
                <span className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${cfg.cor}`}>
                  <Icon className="w-3.5 h-3.5" />{cfg.label}
                </span>
              )}
            </div>
          </div>

          {/* Card de Informações */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl divide-y divide-slate-200/60 shadow-sm">
            <div className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Data</p>
                <p className="text-sm font-semibold text-slate-900 capitalize">
                  {new Date(ag.evento_data + 'T00:00:00').toLocaleDateString('pt-BR', {
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
                  {ag.horario.hora_inicio.substring(0, 5)} até {ag.horario.hora_fim.substring(0, 5)}
                </p>
              </div>
            </div>

            {ag.nome_profissional && (
              <div className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Profissional</p>
                  <p className="text-sm font-semibold text-slate-900">{ag.nome_profissional}</p>
                </div>
              </div>
            )}

            {!emModoConfirmacao && !emModoSucesso && (
              <div className="flex items-center gap-4 px-5 py-3.5 bg-white/50 rounded-b-2xl">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Agendado em</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {new Date(ag.criado_em).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Erro Geral */}
          {erro && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-4 py-3 rounded-xl border border-red-100 animate-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>{erro}</p>
            </div>
          )}

          {cancelamentoBloqueadoPorHorario && (
            <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 px-4 py-3 rounded-xl border border-amber-200">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                O prazo para cancelamento encerrou em {limiteCancelamentoFormatado}. Cancelamentos sao permitidos apenas ate 30 minutos antes do horario agendado.
              </p>
            </div>
          )}

          {/* Botões de Ação Dinâmicos */}
          <div className="pt-2">

            {/* Etapa 1: Confirmar → envia o OTP */}
            {emModoConfirmacao && onConfirmarReserva && etapa === 'confirmar' && (
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={enviandoOtp}
                  className="flex-1 py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSolicitarOtp}
                  disabled={enviandoOtp}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md hover:shadow-blue-500/20 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {enviandoOtp
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando código...</>
                    : textoConfirmar}
                </button>
              </div>
            )}

            {/* Etapa 2: Digitar o OTP */}
            {emModoConfirmacao && onConfirmarReserva && etapa === 'otp' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800 font-medium text-center">
                  Enviamos um código de <strong>4 dígitos</strong> para o seu e-mail corporativo.<br />
                  Digite-o abaixo para confirmar a reserva.
                  {segundosRestantes > 0 && (
                    <span className="block mt-1 text-blue-600 font-bold">
                      Expira em {formatarTempo(segundosRestantes)}
                    </span>
                  )}
                  {segundosRestantes === 0 && (
                    <span className="block mt-1 text-red-600 font-bold">Código expirado.</span>
                  )}
                </div>

                {/* Inputs OTP */}
                <div className="flex justify-center gap-3">
                  {otp.map((digito, i) => (
                    <input
                      key={i}
                      ref={el => { inputsRef.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digito}
                      onChange={e => handleOtpInput(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-14 h-14 text-center text-2xl font-bold border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all bg-slate-50 focus:bg-white text-slate-900"
                    />
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setEtapa('confirmar'); setOtp(['', '', '', '']); setErro(''); }}
                    disabled={confirmandoReserva}
                    className="flex-1 py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                  >
                    Reenviar código
                  </button>
                  <button
                    onClick={handleConfirmarComOtp}
                    disabled={confirmandoReserva || otp.join('').length < 4 || segundosRestantes === 0}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md hover:shadow-blue-500/20 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {confirmandoReserva
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</>
                      : 'Confirmar'}
                  </button>
                </div>
              </div>
            )}

            {modo === 'detalhes' && ag.status === 'confirmado' && !confirmando && (
              <div className="flex flex-col gap-3">
                {onAlterarHorario && (
                  <button
                    onClick={() => onAlterarHorario(ag)}
                    className="w-full py-3 bg-white hover:bg-blue-50 text-blue-700 border-2 border-blue-200 hover:border-blue-300 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Alterar Horário
                  </button>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => setConfirmando(true)}
                    disabled={cancelamentoBloqueadoPorHorario}
                    className="flex-1 py-3 bg-white hover:bg-red-50 text-red-600 border-2 border-red-100 hover:border-red-200 rounded-xl font-bold text-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white disabled:hover:border-red-100"
                  >
                    {cancelamentoBloqueadoPorHorario ? 'Cancelamento Indisponivel' : 'Cancelar Agendamento'}
                  </button>
                </div>
              </div>
            )}

            {(emModoSucesso || (modo === 'detalhes' && ag.status !== 'confirmado')) && !confirmando && (
              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
              >
                Concluir e Fechar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Modal de Confirmação de Cancelamento */}
      {modo === 'detalhes' && confirmando && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-all">
          <button
            type="button"
            aria-label="Fechar confirmação"
            onClick={() => setConfirmando(false)}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 text-center tracking-tight">Cancelar Agendamento?</h3>
            <p className="text-sm text-slate-500 text-center mt-2 font-medium">
              Esta ação liberará sua vaga para outra pessoa e não pode ser desfeita.
            </p>
            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={handleCancelar}
                disabled={cancelando}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow-red-500/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {cancelando ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {cancelando ? 'Cancelando...' : 'Sim, quero cancelar'}
              </button>
              <button
                onClick={() => setConfirmando(false)}
                disabled={cancelando}
                className="w-full py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                Manter meu agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
