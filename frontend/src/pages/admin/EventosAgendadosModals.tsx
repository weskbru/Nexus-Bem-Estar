import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import logoAeb from '../../images/logoaeb.png';
import {
  AlertTriangle,
  X,
  ClipboardList,
  Printer,
  FileDown,
  Loader2,
  Users,
  UserMinus,
  CheckCircle2,
  Info,
  Check,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  Search,
  ClipboardCheck,
  MailX,
  History,
  ListOrdered,
  Clock,
} from 'lucide-react';
import {
  adminEventosApi,
  adminPenalidadesApi,
  type EventoDTO,
  type FilaHistoricoDTO,
  type HorarioDTO,
  type ListaPresencaDTO,
} from '../../services/api';

type ConfirmDeleteProps = Readonly<{
  evento: EventoDTO;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}>

type ConfirmActionProps = Readonly<{
  evento: EventoDTO;
  tipo: 'emails' | 'cancelar';
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}>

type ListaPresencaModalProps = Readonly<{
  eventoId: number;
  onClose: () => void;
}>

type RegistrarParticipanteModalProps = Readonly<{
  evento: EventoDTO;
  onClose: () => void;
  onSuccess: () => void;
}>

type FilaHistoricoModalProps = Readonly<{
  eventoId: number;
  onClose: () => void;
}>

export function ConfirmDeleteModal({ evento, onConfirm, onCancel, loading }: ConfirmDeleteProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Excluir Evento</h3>
              <p className="text-sm text-red-600 font-medium">Ação irreversível</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
          <p className="text-sm text-slate-700 leading-relaxed">
            Tem certeza que deseja excluir permanentemente o evento{' '}
            <span className="font-bold text-slate-900">"{evento.titulo}"</span>?{' '}
            Todos os agendamentos vinculados serão perdidos.
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all disabled:opacity-50"
          >
            Manter Evento
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm hover:shadow-md hover:shadow-red-500/20 rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            {loading ? 'Excluindo...' : 'Sim, Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

type ErroPresencaModalProps = Readonly<{
  mensagem: string;
  onClose: () => void;
  onVerPresenca?: () => void;
  codigo?: string;
}>

export function ErroPresencaModal({ mensagem, onClose, onVerPresenca, codigo }: ErroPresencaModalProps) {
  const isEmailAtivo = codigo === 'email_enviado_evento_ativo';
  const Icone = isEmailAtivo ? MailX : ClipboardCheck;
  const titulo = isEmailAtivo ? 'Exclusão não permitida' : 'Lista de presença pendente';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-full flex items-center justify-center shrink-0">
              <Icone className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{titulo}</h3>
              <p className="text-sm text-amber-600 font-medium">Ação bloqueada</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-6">
          <p className="text-sm text-slate-700 leading-relaxed">{mensagem}</p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all"
          >
            Fechar
          </button>
          {onVerPresenca && (
            <button
              onClick={onVerPresenca}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm hover:shadow-md hover:shadow-amber-500/20 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4" />
              Ver lista de presença
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConfirmActionModal({ evento, tipo, loading, onConfirm, onCancel }: ConfirmActionProps) {
  const isEmail = tipo === 'emails';
  const titulo = isEmail ? 'Enviar E-mails de Convite' : 'Cancelar Evento';
  const descricao = isEmail
    ? 'Deseja disparar os e-mails informativos para os colaboradores sobre este evento? Esta ação só pode ser realizada uma vez por evento.'
    : 'Deseja realmente cancelar este evento? Após confirmar, ele não aceitará mais agendamentos e aparecerá como cancelado no sistema.';
  
  const botao = isEmail ? 'Confirmar Envio' : 'Sim, Cancelar Evento';
  const iconeClasse = isEmail ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-amber-600 bg-amber-50 border-amber-100';
  const textoDestaque = isEmail ? 'text-blue-600' : 'text-amber-600';
  const botaoClasse = isEmail
    ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/20'
    : 'bg-amber-600 hover:bg-amber-700 hover:shadow-amber-500/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 border rounded-full flex items-center justify-center shrink-0 ${iconeClasse}`}>
              {isEmail ? <Info className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{titulo}</h3>
              <p className={`text-sm font-medium ${textoDestaque}`}>Confirmação necessária</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
          <p className="text-sm text-slate-700 mb-2 leading-relaxed">{descricao}</p>
          <div className="text-sm text-slate-500 mt-2 p-2 bg-white rounded-lg border border-slate-200">
            Alvo: <span className="font-bold text-slate-800">{evento.titulo}</span>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:shadow-md rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 ${botaoClasse}`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {botao}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatarDataHora(valor?: string | null) {
  if (!valor) return '-';
  return new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FilaHistoricoModal({ eventoId, onClose }: FilaHistoricoModalProps) {
  const [dados, setDados] = useState<FilaHistoricoDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aba, setAba] = useState<'fila' | 'cancelamentos'>('fila');

  useEffect(() => {
    setLoading(true);
    setErro('');
    adminEventosApi.filaHistorico(eventoId)
      .then(setDados)
      .catch(() => setErro('Nao foi possivel carregar fila e cancelamentos.'))
      .finally(() => setLoading(false));
  }, [eventoId]);

  const totalFila = dados?.total_fila ?? 0;
  const totalCancelamentos = dados?.total_cancelamentos ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ListOrdered className="w-5 h-5 text-blue-600" />
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Fila e Cancelamentos</h3>
            </div>
            <p className="text-sm text-slate-500 font-medium truncate">
              {dados ? `${dados.evento.titulo} - ${dados.evento.data}` : 'Carregando dados do evento'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4 border-b border-slate-100 flex gap-2">
          <button
            onClick={() => setAba('fila')}
            className={`px-4 py-2 rounded-t-xl text-sm font-bold border transition-colors ${
              aba === 'fila'
                ? 'bg-blue-50 text-blue-700 border-blue-200 border-b-blue-50'
                : 'bg-white text-slate-500 border-transparent hover:bg-slate-50'
            }`}
          >
            Fila de espera ({totalFila})
          </button>
          <button
            onClick={() => setAba('cancelamentos')}
            className={`px-4 py-2 rounded-t-xl text-sm font-bold border transition-colors ${
              aba === 'cancelamentos'
                ? 'bg-blue-50 text-blue-700 border-blue-200 border-b-blue-50'
                : 'bg-white text-slate-500 border-transparent hover:bg-slate-50'
            }`}
          >
            Cancelamentos ({totalCancelamentos})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/60">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-600" />
              <span className="text-sm font-medium">Carregando informacoes...</span>
            </div>
          )}

          {!loading && erro && (
            <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {erro}
            </div>
          )}

          {!loading && !erro && dados && aba === 'fila' && (
            <div className="space-y-4">
              {dados.horarios.every(h => h.total_na_fila === 0) ? (
                <div className="bg-white border border-slate-200 rounded-xl px-5 py-10 text-center">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700">Nenhum colaborador na fila de espera.</p>
                </div>
              ) : (
                dados.horarios.filter(h => h.total_na_fila > 0).map(horario => (
                  <div key={horario.horario_id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-bold text-slate-800">
                          {horario.hora_inicio} ate {horario.hora_fim}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1">
                        {horario.total_na_fila} na fila
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100">
                            <th className="px-4 py-3 text-left font-bold">Posicao</th>
                            <th className="px-4 py-3 text-left font-bold">Nome</th>
                            <th className="px-4 py-3 text-left font-bold">E-mail</th>
                            <th className="px-4 py-3 text-left font-bold">Ramal</th>
                            <th className="px-4 py-3 text-left font-bold">Status</th>
                            <th className="px-4 py-3 text-left font-bold">Entrada</th>
                            <th className="px-4 py-3 text-left font-bold">Expira</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {horario.participantes.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-bold text-slate-900">{p.posicao}o</td>
                              <td className="px-4 py-3 font-semibold text-slate-800">{p.nome}</td>
                              <td className="px-4 py-3 text-slate-600">{p.email}</td>
                              <td className="px-4 py-3 text-slate-500">{p.ramal || '-'}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold uppercase ${
                                  p.status === 'notificado'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                  {p.status === 'notificado' ? 'Notificado' : 'Aguardando'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500">{formatarDataHora(p.criado_em)}</td>
                              <td className="px-4 py-3 text-slate-500">{formatarDataHora(p.expira_em)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {!loading && !erro && dados && aba === 'cancelamentos' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              {dados.cancelamentos.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <History className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700">Nenhum cancelamento registrado para este evento.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200">
                        <th className="px-4 py-3 text-left font-bold">Nome</th>
                        <th className="px-4 py-3 text-left font-bold">E-mail</th>
                        <th className="px-4 py-3 text-left font-bold">Ramal</th>
                        <th className="px-4 py-3 text-left font-bold">Horario</th>
                        <th className="px-4 py-3 text-left font-bold">Agendado em</th>
                        <th className="px-4 py-3 text-left font-bold">Cancelado em</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dados.cancelamentos.map(c => (
                        <tr key={c.agendamento_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{c.nome}</td>
                          <td className="px-4 py-3 text-slate-600">{c.email}</td>
                          <td className="px-4 py-3 text-slate-500">{c.ramal || '-'}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{c.hora_inicio} ate {c.hora_fim}</td>
                          <td className="px-4 py-3 text-slate-500">{formatarDataHora(c.agendado_em)}</td>
                          <td className="px-4 py-3 text-slate-500">{formatarDataHora(c.cancelado_em)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ListaPresencaModal({ eventoId, onClose }: ListaPresencaModalProps) {
  const [dados, setDados] = useState<ListaPresencaDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [removendoId, setRemovendoId] = useState<number | null>(null);
  // presença: agendamento_id → true (compareceu) | false (faltou) | null (pendente)
  const [presenca, setPresenca] = useState<Record<number, boolean | null>>({});
  // presença manual: participante_id → true | false | null
  const [presencaManual, setPresencaManual] = useState<Record<number, boolean | null>>({});
  const [confirmando, setConfirmando] = useState(false);
  const [resultadoConfirmacao, setResultadoConfirmacao] = useState<{ penalidades: number } | null>(null);
  const [busca, setBusca] = useState('');

  function carregarLista() {
    setLoading(true);
    adminEventosApi.listaPresenca(eventoId)
      .then(d => {
        setDados(d);
        const inicial: Record<number, boolean | null> = {};
        const inicialManual: Record<number, boolean | null> = {};
        for (const h of d.horarios) {
          for (const p of h.participantes) {
            if (p.tipo === 'email' && p.agendamento_id != null) {
              inicial[p.agendamento_id] = p.compareceu ?? null;
            } else if (p.tipo === 'manual' && p.participante_id != null) {
              inicialManual[p.participante_id] = p.compareceu ?? null;
            }
          }
        }
        setPresenca(inicial);
        setPresencaManual(inicialManual);
      })
      .catch(() => setErro('Não foi possível carregar a lista de presença.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { carregarLista(); }, [eventoId]);

  async function handleRemover(participanteId: number) {
    setRemovendoId(participanteId);
    try {
      await adminEventosApi.removerParticipante(eventoId, participanteId);
      carregarLista();
    } catch {
      setErro('Erro ao remover participante.');
    } finally {
      setRemovendoId(null);
    }
  }

  function marcarPresenca(agendamentoId: number, valor: boolean) {
    setPresenca(prev => ({
      ...prev,
      [agendamentoId]: prev[agendamentoId] === valor ? null : valor,
    }));
  }

  function marcarPresencaManualFn(participanteId: number, valor: boolean) {
    setPresencaManual(prev => ({
      ...prev,
      [participanteId]: prev[participanteId] === valor ? null : valor,
    }));
  }

  async function handleConfirmarPresenca() {
    setConfirmando(true);
    setErro('');
    try {
      const presentes          = Object.entries(presenca).filter(([, v]) => v === true).map(([k]) => Number(k));
      const ausentes           = Object.entries(presenca).filter(([, v]) => v === false).map(([k]) => Number(k));
      const presentes_manuais  = Object.entries(presencaManual).filter(([, v]) => v === true).map(([k]) => Number(k));
      const ausentes_manuais   = Object.entries(presencaManual).filter(([, v]) => v === false).map(([k]) => Number(k));
      const resultado = await adminEventosApi.marcarPresenca(eventoId, { presentes, ausentes, presentes_manuais, ausentes_manuais });
      setResultadoConfirmacao({ penalidades: resultado.penalidades_criadas });
      const totalEmail  = dados ? dados.horarios.flatMap(h => h.participantes).filter(p => p.tipo === 'email').length : 0;
      const totalManual = dados ? dados.horarios.flatMap(h => h.participantes).filter(p => p.tipo === 'manual').length : 0;
      if (presentes.length + ausentes.length >= totalEmail && presentes_manuais.length + ausentes_manuais.length >= totalManual) {
        setTimeout(onClose, 1500);
      }
    } catch {
      setErro('Erro ao confirmar presenças. Tente novamente.');
    } finally {
      setConfirmando(false);
    }
  }

  const eventoEncerrado = dados?.evento.status === 'encerrado';
  const totalMarcadosEmail   = Object.values(presenca).filter(v => v !== null).length;
  const totalMarcadosManuais = Object.values(presencaManual).filter(v => v !== null).length;
  const totalMarcados = totalMarcadosEmail + totalMarcadosManuais;
  const totalParticipantesEmail = dados
    ? dados.horarios.flatMap(h => h.participantes).filter(p => p.tipo === 'email').length
    : 0;
  const totalParticipantesManuais = dados
    ? dados.horarios.flatMap(h => h.participantes).filter(p => p.tipo === 'manual').length
    : 0;
  const totalParticipantes = totalParticipantesEmail + totalParticipantesManuais;

  const termo = busca.toLowerCase().trim();
  const horariosFiltrados = dados
    ? dados.horarios.map(h => ({
        ...h,
        participantes: termo
          ? h.participantes.filter(p =>
              p.nome.toLowerCase().includes(termo) ||
              (p.ramal ?? '').toLowerCase().includes(termo)
            )
          : h.participantes,
      })).filter(h => h.participantes.length > 0)
    : [];

  function exportarXlsx() {
    // A lógica de exportação continua idêntica
    if (!dados) return;

    const rows: (string | number)[][] = [
      [`Lista de Presença - ${dados.evento.titulo}`],
      [
        `Data: ${dados.evento.data}`,
        `Horário: ${dados.evento.hora_inicio} - ${dados.evento.hora_fim}`,
        dados.evento.nome_profissional ? `Profissional: ${dados.evento.nome_profissional}` : '',
      ],
      [`Total de participantes: ${dados.total}`],
      [],
    ];

    for (const h of dados.horarios) {
      if (h.participantes.length === 0) continue;
      rows.push(
        [`Horário: ${h.hora_inicio} - ${h.hora_fim} (${h.participantes.length} participante${h.participantes.length === 1 ? '' : 's'})`],
        ['Nome', 'E-mail', 'Horário', 'Tipo'],
        ...h.participantes.map((p) => ([
          p.nome,
          p.email,
          `${p.hora_inicio} - ${p.hora_fim}`,
          p.tipo === 'email' ? 'E-mail' : 'Manual',
        ])),
        [],
      );
    }

    rows.push([`Gerado em ${new Date().toLocaleString('pt-BR')}`]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 30 }, { wch: 14 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lista de Presença');

    const tituloSemAcento = Array.from(dados.evento.titulo.normalize('NFD'))
      .filter((char) => {
        const code = char.codePointAt(0) ?? 0;
        return code < 0x0300 || code > 0x036f;
      })
      .join('');

    const nomeArquivo = `lista-presenca-${tituloSemAcento
      .trim()
      .split(/\s+/)
      .join('-')
      .toLowerCase()}.xlsx`;

    XLSX.writeFile(wb, nomeArquivo);
  }

  async function imprimir() {
    if (!dados) return;

    // Converte a logo para base64 para embuti-la diretamente no HTML impresso,
    // evitando que o browser dispare dois diálogos enquanto aguarda o carregamento da imagem.
    let logoSrc = '';
    try {
      const resp = await fetch(logoAeb);
      const blob = await resp.blob();
      logoSrc = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      logoSrc = window.location.origin + logoAeb;
    }

    const horariosHtml = dados.horarios
      .filter(h => h.participantes.length > 0)
      .map(h => `
        <div style="margin-bottom:22px;page-break-inside:avoid;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <span style="background:#1e293b;color:#fff;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;letter-spacing:0.05em;">
              ${h.hora_inicio.substring(0, 5)} – ${h.hora_fim.substring(0, 5)}
            </span>
            <span style="font-size:11px;color:#64748b;font-weight:600;">
              ${h.participantes.length} inscrito${h.participantes.length === 1 ? '' : 's'} neste horário
            </span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #cbd5e1;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="width:28px;padding:7px 10px;text-align:center;border-bottom:1px solid #cbd5e1;color:#475569;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;">#</th>
                <th style="padding:7px 10px;text-align:left;border-bottom:1px solid #cbd5e1;color:#475569;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;">Nome do Participante</th>
                <th style="padding:7px 10px;text-align:left;border-bottom:1px solid #cbd5e1;color:#475569;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;">E-mail corporativo</th>
                <th style="width:80px;padding:7px 10px;text-align:center;border-bottom:1px solid #cbd5e1;color:#475569;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;">Ramal</th>
                <th style="width:72px;padding:7px 10px;text-align:center;border-bottom:1px solid #cbd5e1;color:#475569;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;">Presença</th>
                <th style="padding:7px 10px;text-align:center;border-bottom:1px solid #cbd5e1;color:#475569;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;">Assinatura</th>
              </tr>
            </thead>
            <tbody>
              ${h.participantes.map((p, i) => `
                <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                  <td style="padding:7px 10px;text-align:center;border-bottom:1px solid #e2e8f0;color:#94a3b8;font-weight:600;">${i + 1}</td>
                  <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">${p.nome}</td>
                  <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;color:#64748b;">${p.email || '—'}</td>
                  <td style="padding:7px 10px;text-align:center;border-bottom:1px solid #e2e8f0;font-family:monospace;color:#334155;">${p.ramal || '—'}</td>
                  <td style="padding:7px 10px;text-align:center;border-bottom:1px solid #e2e8f0;">
                    <div style="width:18px;height:18px;border:1.5px solid #94a3b8;border-radius:4px;display:inline-block;"></div>
                  </td>
                  <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;">
                    <div style="border-bottom:1px solid #94a3b8;min-width:120px;height:20px;"></div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('');

    const profissional = dados.evento.nome_profissional
      ? `<span><strong style="color:#475569;">Profissional:</strong> ${dados.evento.nome_profissional}</span>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Lista de Presença — ${dados.evento.titulo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; color: #0f172a; padding: 20mm 22mm; font-size: 12px; }
    @page { size: A4 portrait; margin: 18mm 20mm; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div style="border-bottom:2px solid #2563eb;padding-bottom:16px;margin-bottom:18px;text-align:center;">
    <img src="${logoSrc}" alt="Logo AEB" style="height:56px;object-fit:contain;margin:0 auto 12px;display:block;" />
    <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">
      Lista de Presença
    </div>
    <h1 style="font-size:20px;font-weight:800;color:#0f172a;line-height:1.25;">
      ${dados.evento.titulo}
    </h1>
  </div>

  <div style="display:flex;flex-wrap:wrap;gap:8px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
    <span><strong style="color:#475569;">Data:</strong> ${dados.evento.data}</span>
    <span><strong style="color:#475569;">Horário:</strong> ${dados.evento.hora_inicio} – ${dados.evento.hora_fim}</span>
    ${profissional}
    <span style="margin-left:auto;background:#eff6ff;color:#1d4ed8;padding:2px 10px;border-radius:6px;border:1px solid #bfdbfe;font-weight:700;">
      ${dados.total} participante${dados.total === 1 ? '' : 's'}
    </span>
  </div>

  ${horariosHtml}

  <div style="margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;font-weight:500;">
    <span>Relatório gerado em ${new Date().toLocaleString('pt-BR')}</span>
    <span>Sistema de Bem-Estar — AEB</span>
  </div>
</body>
</html>`;

    const htmlBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const htmlUrl = URL.createObjectURL(htmlBlob);
    const janela = window.open(htmlUrl, '_blank', 'width=900,height=700');
    if (!janela) return;
    janela.focus();
    janela.onload = () => {
      janela.print();
      janela.onafterprint = () => {
        URL.revokeObjectURL(htmlUrl);
        janela.close();
      };
    };
  }

  return (
    <>
      {/* ── Modal na tela ── */}
      <div
        className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto transition-all"
      >
        <button
          type="button"
          aria-label="Fechar modal"
          onClick={onClose}
          className="absolute inset-0"
        />
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Header da Tabela */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 border-b border-slate-100 no-print bg-slate-50/50 rounded-t-2xl gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Lista de Presença</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Controle de inscritos no evento</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {dados && (
                <>
                  <button
                    onClick={imprimir}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 rounded-xl text-sm font-bold shadow-sm transition-all"
                  >
                    <Printer className="w-4 h-4 text-slate-500" /> <span className="hidden sm:inline">Imprimir</span>
                  </button>
                  <button
                    onClick={exportarXlsx}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow-emerald-500/20 transition-all"
                  >
                    <FileDown className="w-4 h-4" /> <span className="hidden sm:inline">Exportar Excel</span>
                  </button>
                </>
              )}
              <button onClick={onClose} className="p-2 ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-6 py-6">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="font-medium">Carregando dados dos inscritos...</span>
              </div>
            )}

            {erro && (
              <div className="py-12 flex flex-col items-center gap-3">
                <AlertTriangle className="w-10 h-10 text-red-500 opacity-80" />
                <div className="text-center text-red-600 font-medium">{erro}</div>
                <button onClick={carregarLista} className="text-sm font-bold underline hover:text-red-800">Tentar novamente</button>
              </div>
            )}

            {dados && (
              <>
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{dados.evento.titulo}</h1>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5"><strong className="text-slate-800">Data:</strong> {dados.evento.data}</span>
                    <span className="flex items-center gap-1.5"><strong className="text-slate-800">Horário:</strong> {dados.evento.hora_inicio} - {dados.evento.hora_fim}</span>
                    {dados.evento.nome_profissional && (
                      <span className="flex items-center gap-1.5"><strong className="text-slate-800">Profissional:</strong> {dados.evento.nome_profissional}</span>
                    )}
                    <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-lg border border-blue-100">
                      <strong>Total:</strong> {dados.total} participante{dados.total === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {/* Campo de busca */}
                {dados.total > 0 && (
                  <div className="relative mb-6">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={busca}
                      onChange={e => setBusca(e.target.value)}
                      placeholder="Buscar por nome ou ramal..."
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                    {busca && (
                      <button
                        onClick={() => setBusca('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Banner de evento encerrado */}
                {eventoEncerrado && !resultadoConfirmacao && (
                  <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                    <span>
                      Evento encerrado. Marque os participantes que <strong>compareceram</strong> ou <strong>faltaram</strong> e clique em <strong>Confirmar Presenças</strong>. Quem faltar receberá uma penalidade.
                    </span>
                  </div>
                )}

                {/* Banner de sucesso após confirmar */}
                {resultadoConfirmacao && (
                  <div className="mb-6 flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                    <span>
                      Presenças confirmadas com sucesso!
                      {resultadoConfirmacao.penalidades > 0
                        ? <> <strong>{resultadoConfirmacao.penalidades} penalidade{resultadoConfirmacao.penalidades > 1 ? 's' : ''}</strong> gerada{resultadoConfirmacao.penalidades > 1 ? 's' : ''} por falta.</>
                        : <> Nenhuma penalidade gerada.</>}
                    </span>
                  </div>
                )}

                {dados.total === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                    <Users className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Lista Vazia</h3>
                    <p className="text-sm text-slate-500">Nenhum participante foi registrado para este evento ainda.</p>
                  </div>
                ) : termo && horariosFiltrados.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                    <Search className="w-10 h-10 text-slate-300 mb-3" />
                    <h3 className="text-base font-bold text-slate-700 mb-1">Nenhum resultado</h3>
                    <p className="text-sm text-slate-400">Nenhum participante encontrado para "<strong>{busca}</strong>".</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {horariosFiltrados.map(h => (
                      <div key={h.horario_id} className="animate-in fade-in duration-500">

                        <div className="flex items-center gap-3 mb-3 pl-1">
                          <span className="px-3 py-1 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm">
                            {h.hora_inicio.substring(0, 5)} - {h.hora_fim.substring(0, 5)}
                          </span>
                          <span className="text-sm font-medium text-slate-500">
                            {h.participantes.length} inscrito{h.participantes.length === 1 ? '' : 's'} neste horário
                          </span>
                        </div>

                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-200">
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Participante</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">E-mail corporativo</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Ramal</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider no-print">Origem</th>
                                {eventoEncerrado && (
                                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider no-print">Presença</th>
                                )}
                                <th className="w-12 px-2 py-3 no-print" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {h.participantes.map((p) => {
                                const agId = p.agendamento_id;
                                const marcado = agId != null ? presenca[agId] : null;
                                return (
                                  <tr key={`${p.participante_id ?? p.email ?? p.nome}-${p.hora_inicio}-${p.hora_fim}`} className="bg-white hover:bg-slate-50/60 transition-colors group">
                                    <td className="px-4 py-3.5 font-semibold text-slate-800">{p.nome}</td>
                                    <td className="px-4 py-3.5 text-slate-500 hidden sm:table-cell">{p.email || <span className="text-slate-300 italic">Não informado</span>}</td>
                                    <td className="px-4 py-3.5 text-slate-500 hidden lg:table-cell">
                                      {p.ramal
                                        ? <span className="font-mono text-slate-700">{p.ramal}</span>
                                        : <span className="text-slate-300 italic">—</span>}
                                    </td>
                                    <td className="px-4 py-3.5 text-center no-print">
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                                        p.tipo === 'email'
                                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                      }`}>
                                        {p.tipo === 'email' ? 'Sistema' : 'Manual'}
                                      </span>
                                    </td>
                                    {eventoEncerrado && (
                                      <td className="px-4 py-3.5 text-center no-print">
                                        {p.tipo === 'email' && agId != null ? (
                                          <div className="flex items-center justify-center gap-1.5">
                                            <button
                                              onClick={() => marcarPresenca(agId, true)}
                                              title="Compareceu"
                                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                                marcado === true
                                                  ? 'bg-emerald-500 text-white border-emerald-500'
                                                  : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-400 hover:text-emerald-600'
                                              }`}
                                            >
                                              <Check className="w-3 h-3" /> Sim
                                            </button>
                                            <button
                                              onClick={() => marcarPresenca(agId, false)}
                                              title="Faltou"
                                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                                marcado === false
                                                  ? 'bg-rose-500 text-white border-rose-500'
                                                  : 'bg-white text-slate-400 border-slate-200 hover:border-rose-400 hover:text-rose-600'
                                              }`}
                                            >
                                              <XCircle className="w-3 h-3" /> Não
                                            </button>
                                          </div>
                                        ) : p.tipo === 'manual' && p.participante_id != null ? (
                                          <div className="flex items-center justify-center gap-1.5">
                                            <button
                                              onClick={() => marcarPresencaManualFn(p.participante_id!, true)}
                                              title="Compareceu"
                                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                                presencaManual[p.participante_id] === true
                                                  ? 'bg-emerald-500 text-white border-emerald-500'
                                                  : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-400 hover:text-emerald-600'
                                              }`}
                                            >
                                              <Check className="w-3 h-3" /> Sim
                                            </button>
                                            <button
                                              onClick={() => marcarPresencaManualFn(p.participante_id!, false)}
                                              title="Faltou"
                                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                                presencaManual[p.participante_id] === false
                                                  ? 'bg-rose-500 text-white border-rose-500'
                                                  : 'bg-white text-slate-400 border-slate-200 hover:border-rose-400 hover:text-rose-600'
                                              }`}
                                            >
                                              <XCircle className="w-3 h-3" /> Não
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-slate-300 italic">—</span>
                                        )}
                                      </td>
                                    )}
                                    <td className="px-2 py-3.5 text-center no-print align-middle">
                                      {p.tipo === 'manual' && p.participante_id != null && (
                                        <button
                                          onClick={() => handleRemover(p.participante_id!)}
                                          disabled={removendoId === p.participante_id}
                                          title="Remover inscrição manual"
                                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-40 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        >
                                          {removendoId === p.participante_id
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : <UserMinus className="w-4 h-4" />}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-400">
                    Relatório gerado em {new Date().toLocaleString('pt-BR')}
                  </span>
                  {eventoEncerrado && !resultadoConfirmacao && (
                    <button
                      onClick={handleConfirmarPresenca}
                      disabled={confirmando || totalMarcados === 0}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
                    >
                      {confirmando
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</>
                        : <><CheckCircle2 className="w-4 h-4" /> Confirmar Presenças {totalMarcados > 0 && `(${totalMarcados}/${totalParticipantes})`}</>}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function RegistrarParticipanteModal({ evento, onClose, onSuccess }: RegistrarParticipanteModalProps) {
  const [nome, setNome] = useState('');
  const [emailVerificacao, setEmailVerificacao] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [horarioId, setHorarioId] = useState<number | ''>('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [avisoPenalidade, setAvisoPenalidade] = useState<{ id: number; usuario_nome: string } | null>(null);
  const [motivoRevogacao, setMotivoRevogacao] = useState('');
  const [revogando, setRevogando] = useState(false);
  const [sucessoRevogacao, setSucessoRevogacao] = useState(false);

  const horarios: HorarioDTO[] = evento.horarios ?? [];

  async function handleSalvar() {
    if (!nome.trim()) { setErro('Informe o nome completo do participante.'); return; }
    if (!horarioId) { setErro('Selecione um horário disponível.'); return; }
    setSalvando(true);
    setErro('');
    try {
      const resultado = await adminEventosApi.registrarParticipanteManual(evento.id, {
        horario_id: horarioId as number,
        nome: nome.trim(),
        departamento: departamento.trim(),
        email_verificacao: emailVerificacao.trim() || undefined,
      });
      setSucesso(true);
      onSuccess();
      if (resultado.aviso_penalidade) {
        setAvisoPenalidade(resultado.aviso_penalidade);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao registrar participante no sistema.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleRevogar() {
    if (!avisoPenalidade) return;
    setRevogando(true);
    try {
      await adminPenalidadesApi.revogar(avisoPenalidade.id, motivoRevogacao);
      setSucessoRevogacao(true);
      setAvisoPenalidade(null);
    } catch {
      // mantém o aviso visível — o admin pode tentar pela página de penalidades
    } finally {
      setRevogando(false);
    }
  }

  function handleNovoRegistro() {
    setNome('');
    setEmailVerificacao('');
    setDepartamento('');
    setHorarioId('');
    setSucesso(false);
    setAvisoPenalidade(null);
    setMotivoRevogacao('');
    setSucessoRevogacao(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {sucesso ? (
          <div className="animate-in zoom-in-90 duration-300">
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-emerald-50 border-4 border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-bounce" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Inscrição Confirmada!</h3>
              <p className="text-slate-500 mb-6 max-w-xs mx-auto">
                <span className="font-bold text-slate-800">{nome}</span> foi adicionado(a) manualmente ao evento com sucesso.
              </p>
            </div>

            {/* Aviso de penalidade ativa */}
            {avisoPenalidade && !sucessoRevogacao && (
              <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
                <div className="flex items-start gap-3 mb-3">
                  <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">Usuário com penalidade ativa</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      <strong>{avisoPenalidade.usuario_nome}</strong> está bloqueado por ausência em evento anterior.
                      Ele pode participar deste evento, mas continuará bloqueado para se agendar sozinho no próximo.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <textarea
                    value={motivoRevogacao}
                    onChange={e => setMotivoRevogacao(e.target.value)}
                    placeholder="Motivo da revogação (opcional)..."
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 resize-none transition-all"
                  />
                  <button
                    onClick={handleRevogar}
                    disabled={revogando}
                    className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    {revogando
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Revogando...</>
                      : <><ShieldCheck className="w-4 h-4" /> Revogar penalidade agora</>}
                  </button>
                </div>
              </div>
            )}

            {sucessoRevogacao && (
              <div className="mb-5 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-500" />
                <span>Penalidade revogada. O usuário poderá se agendar normalmente.</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleNovoRegistro}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow-emerald-500/20 transition-all"
              >
                Registrar Novo Participante
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-colors"
              >
                Concluir e Fechar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Inscrição Manual</h3>
                <p className="text-sm font-medium text-slate-500 mt-1 line-clamp-1 pr-4">{evento.titulo}</p>
              </div>
              <button onClick={onClose} className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {erro && (
              <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm font-medium animate-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
                <span>{erro}</span>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="participante_nome" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nome do Participante <span className="text-red-500">*</span>
                </label>
                <input
                  id="participante_nome"
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Maria Carolina"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 text-sm transition-all outline-none"
                />
              </div>

              <div>
                <label htmlFor="participante_email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  E-mail corporativo
                </label>
                <input
                  id="participante_email"
                  type="email"
                  value={emailVerificacao}
                  onChange={e => setEmailVerificacao(e.target.value)}
                  placeholder="Opcional — para verificar penalidade ativa (@aeb.gov.br)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 text-sm transition-all outline-none"
                />
              </div>

              <div>
                <label htmlFor="participante_departamento" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Setor / Departamento
                </label>
                <input
                  id="participante_departamento"
                  type="text"
                  value={departamento}
                  onChange={e => setDepartamento(e.target.value)}
                  placeholder="Opcional (Ex: RH, TI)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 text-sm transition-all outline-none"
                />
              </div>

              <div>
                <label htmlFor="participante_horario" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Horário Desejado <span className="text-red-500">*</span>
                </label>
                {horarios.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Evento sem horários cadastrados.
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      id="participante_horario"
                      value={horarioId}
                      onChange={e => setHorarioId(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 text-sm transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option value="" disabled className="text-slate-400">Selecione uma faixa de horário...</option>
                      {horarios.map(h => {
                        const lotado = h.vagas_livres === 0;
                        return (
                          <option key={h.id} value={h.id} disabled={lotado}>
                            {h.hora_inicio.substring(0, 5)} até {h.hora_fim.substring(0, 5)}
                            {lotado ? ' (Esgotado)' : ` - ${h.vagas_livres} vagas restantes`}
                          </option>
                        );
                      })}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  onClick={onClose}
                  disabled={salvando}
                  className="flex-1 px-4 py-3 text-sm font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={salvando || horarios.length === 0}
                  className="flex-1 px-4 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md hover:shadow-blue-500/20 rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
                  {salvando ? 'Salvando...' : 'Confirmar Inscrição'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
