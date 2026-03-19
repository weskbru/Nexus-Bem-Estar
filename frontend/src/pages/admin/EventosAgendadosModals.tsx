import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
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
  Info
} from 'lucide-react';
import {
  adminEventosApi,
  type EventoDTO,
  type HorarioDTO,
  type ListaPresencaDTO,
} from '../../services/api';

interface ConfirmDeleteProps {
  evento: EventoDTO;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

interface ConfirmActionProps {
  evento: EventoDTO;
  tipo: 'emails' | 'cancelar';
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ListaPresencaModalProps {
  eventoId: number;
  onClose: () => void;
}

interface RegistrarParticipanteModalProps {
  evento: EventoDTO;
  onClose: () => void;
  onSuccess: () => void;
}

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

export function ListaPresencaModal({ eventoId, onClose }: ListaPresencaModalProps) {
  const [dados, setDados] = useState<ListaPresencaDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [removendoId, setRemovendoId] = useState<number | null>(null);

  function carregarLista() {
    setLoading(true);
    adminEventosApi.listaPresenca(eventoId)
      .then(d => setDados(d))
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

  function exportarXlsx() {
    // A lógica de exportação continua idêntica
    if (!dados) return;

    const rows: (string | number)[][] = [];

    rows.push([`Lista de Presença - ${dados.evento.titulo}`]);
    rows.push([
      `Data: ${dados.evento.data}`,
      `Horário: ${dados.evento.hora_inicio} - ${dados.evento.hora_fim}`,
      dados.evento.nome_profissional ? `Profissional: ${dados.evento.nome_profissional}` : '',
    ]);
    rows.push([`Total de participantes: ${dados.total}`]);
    rows.push([]);

    for (const h of dados.horarios) {
      if (h.participantes.length === 0) continue;
      rows.push([`Horário: ${h.hora_inicio} - ${h.hora_fim} (${h.participantes.length} participante${h.participantes.length !== 1 ? 's' : ''})`]);
      rows.push(['Nome', 'E-mail', 'Horário', 'Tipo']);
      for (const p of h.participantes) {
        rows.push([
          p.nome,
          p.email,
          `${p.hora_inicio} - ${p.hora_fim}`,
          p.tipo === 'email' ? 'E-mail' : 'Manual',
        ]);
      }
      rows.push([]);
    }

    rows.push([`Gerado em ${new Date().toLocaleString('pt-BR')}`]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 30 }, { wch: 14 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lista de Presença');

    const nomeArquivo = `lista-presenca-${dados.evento.titulo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()}.xlsx`;

    XLSX.writeFile(wb, nomeArquivo);
  }

  function imprimir() {
    window.print();
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #lista-presenca-print,
          #lista-presenca-print * { visibility: visible; }
          #lista-presenca-print {
            position: fixed !important;
            left: 0; top: 0;
            width: 100%;
            background: white !important;
            overflow: visible !important;
            box-shadow: none !important;
          }
          #lista-presenca-print .no-print { display: none !important; visibility: hidden; }
        }
      `}</style>

      <div
        id="lista-presenca-print"
        className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto transition-all"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
          onClick={e => e.stopPropagation()}
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
                      <strong>Total:</strong> {dados.total} participante{dados.total !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {dados.total === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                    <Users className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Lista Vazia</h3>
                    <p className="text-sm text-slate-500">Nenhum participante foi registrado para este evento ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {dados.horarios.filter(h => h.participantes.length > 0).map(h => (
                      <div key={h.horario_id} className="animate-in fade-in duration-500">
                        
                        <div className="flex items-center gap-3 mb-3 pl-1">
                          <span className="px-3 py-1 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm">
                            {h.hora_inicio.substring(0, 5)} - {h.hora_fim.substring(0, 5)}
                          </span>
                          <span className="text-sm font-medium text-slate-500">
                            {h.participantes.length} inscrito{h.participantes.length !== 1 ? 's' : ''} neste horário
                          </span>
                        </div>

                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-200">
                                <th className="w-12 px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Participante</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">E-mail corporativo</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider no-print">Origem</th>
                                <th className="w-12 px-2 py-3 no-print" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {h.participantes.map((p, i) => (
                                <tr key={i} className="bg-white hover:bg-slate-50/60 transition-colors group">
                                  <td className="px-4 py-3.5 align-middle">
                                    <div className="w-5 h-5 border-2 border-slate-300 rounded bg-white group-hover:border-blue-400 transition-colors" />
                                  </td>
                                  <td className="px-4 py-3.5 font-semibold text-slate-800">{p.nome}</td>
                                  <td className="px-4 py-3.5 text-slate-500 hidden sm:table-cell">{p.email || <span className="text-slate-300 italic">Não informado</span>}</td>
                                  <td className="px-4 py-3.5 text-center no-print">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                                      p.tipo === 'email'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    }`}>
                                      {p.tipo === 'email' ? 'Sistema' : 'Manual'}
                                    </span>
                                  </td>
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
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-8 pt-4 border-t border-slate-100 text-xs font-medium text-slate-400 text-right">
                  Relatório gerado em {new Date().toLocaleString('pt-BR')}
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
  const [departamento, setDepartamento] = useState('');
  const [horarioId, setHorarioId] = useState<number | ''>('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const horarios: HorarioDTO[] = evento.horarios ?? [];

  async function handleSalvar() {
    if (!nome.trim()) { setErro('Informe o nome completo do participante.'); return; }
    if (!horarioId) { setErro('Selecione um horário disponível.'); return; }
    setSalvando(true);
    setErro('');
    try {
      await adminEventosApi.registrarParticipanteManual(evento.id, {
        horario_id: horarioId as number,
        nome: nome.trim(),
        departamento: departamento.trim(),
      });
      setSucesso(true);
      onSuccess();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao registrar participante no sistema.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {sucesso ? (
          <div className="text-center py-6 animate-in zoom-in-90 duration-300">
            <div className="w-20 h-20 bg-emerald-50 border-4 border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 relative">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-bounce" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Inscrição Confirmada!</h3>
            <p className="text-slate-500 mb-8 max-w-xs mx-auto">
              <span className="font-bold text-slate-800">{nome}</span> foi adicionado(a) manualmente ao evento com sucesso.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setNome(''); setDepartamento(''); setHorarioId(''); setSucesso(false); }}
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nome do Participante <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Maria Carolina"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 text-sm transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Setor / Departamento
                </label>
                <input
                  type="text"
                  value={departamento}
                  onChange={e => setDepartamento(e.target.value)}
                  placeholder="Opcional (Ex: RH, TI)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 text-sm transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
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
                    {/* Custom Dropdown Arrow */}
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