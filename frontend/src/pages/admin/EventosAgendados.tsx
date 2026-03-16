import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  EyeOff,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  X,
  CheckCircle2,
  User,
  Mail,
  ClipboardList,
  Printer,
  Loader2,
  FileDown,
} from 'lucide-react';
import { adminEventosApi, type EventoDTO, type HorarioDTO, type ListaPresencaDTO } from '../../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIPO_EMOJI: Record<string, string> = {
  massagem:   '💆',
  yoga:       '🧘',
  meditacao:  '🕉️',
  nutricao:   '🥗',
  pilates:    '🤸',
  acupuntura: '🪡',
};

const TIPO_GRADIENT: Record<string, string> = {
  massagem:   'from-rose-400 to-rose-600',
  yoga:       'from-violet-400 to-violet-600',
  meditacao:  'from-indigo-400 to-indigo-600',
  nutricao:   'from-emerald-400 to-emerald-600',
  pilates:    'from-sky-400 to-sky-600',
  acupuntura: 'from-amber-400 to-amber-600',
};

// Normaliza o status — backend retorna lowercase ('publicado', 'cancelado', 'encerrado')
function normalizeStatus(status: string): 'ATIVO' | 'CANCELADO' | 'ENCERRADO' {
  const s = status.toUpperCase();
  if (s === 'ATIVO' || s === 'PUBLICADO') return 'ATIVO';
  if (s === 'CANCELADO') return 'CANCELADO';
  if (s === 'ENCERRADO') return 'ENCERRADO';
  return 'CANCELADO';
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  ATIVO:     { label: 'Disponível',  badgeClass: 'bg-emerald-500 text-white' },
  CANCELADO: { label: 'Cancelado',   badgeClass: 'bg-rose-600 text-white' },
  ENCERRADO: { label: 'Encerrado',   badgeClass: 'bg-slate-800 text-white' },
};

function formatDate(iso: string) {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Modal de confirmação de exclusão ────────────────────────────────────────

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

function ConfirmDeleteModal({ evento, onConfirm, onCancel, loading }: ConfirmDeleteProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Excluir evento</h3>
              <p className="text-sm text-slate-500">Esta ação não pode ser desfeita.</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-700 mb-6">
          Tem certeza que deseja excluir{' '}
          <span className="font-semibold">"{evento.titulo}"</span>?{' '}
          Todos os agendamentos vinculados serão cancelados.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
            {loading && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmActionModal({ evento, tipo, loading, onConfirm, onCancel }: ConfirmActionProps) {
  const titulo = tipo === 'emails' ? 'Enviar e-mails' : 'Cancelar evento';
  const descricao = tipo === 'emails'
    ? 'Deseja enviar e-mails para os colaboradores sobre este evento?'
    : 'Deseja cancelar este evento? Após cancelar, ele não ficará mais disponível para novos agendamentos.';
  const botao = tipo === 'emails' ? 'Enviar e-mails' : 'Cancelar evento';
  const botaoClasse = tipo === 'emails'
    ? 'bg-blue-600 hover:bg-blue-700'
    : 'bg-amber-600 hover:bg-amber-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{titulo}</h3>
              <p className="text-sm text-slate-500">Confirme a ação antes de continuar.</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-700 mb-2">{descricao}</p>
        <p className="text-sm text-slate-500 mb-6">
          Evento: <span className="font-semibold text-slate-700">"{evento.titulo}"</span>
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${botaoClasse}`}
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {botao}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de Lista de Presença ───────────────────────────────────────────────

interface ListaPresencaModalProps {
  eventoId: number;
  onClose: () => void;
}

function ListaPresencaModal({ eventoId, onClose }: ListaPresencaModalProps) {
  const [dados, setDados] = useState<ListaPresencaDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    adminEventosApi.listaPresenca(eventoId)
      .then(d => setDados(d))
      .catch(() => setErro('Não foi possível carregar a lista.'))
      .finally(() => setLoading(false));
  }, [eventoId]);

  function exportarXlsx() {
    if (!dados) return;

    const rows: (string | number)[][] = [];

    // Informações do evento
    rows.push([`Lista de Presença – ${dados.evento.titulo}`]);
    rows.push([
      `Data: ${dados.evento.data}`,
      `Horário: ${dados.evento.hora_inicio} – ${dados.evento.hora_fim}`,
      dados.evento.nome_profissional ? `Profissional: ${dados.evento.nome_profissional}` : '',
    ]);
    rows.push([`Total de participantes: ${dados.total}`]);
    rows.push([]);

    // Para cada horário, listar participantes
    for (const h of dados.horarios) {
      if (h.participantes.length === 0) continue;
      rows.push([`Horário: ${h.hora_inicio} – ${h.hora_fim} (${h.participantes.length} participante${h.participantes.length !== 1 ? 's' : ''})`]);
      rows.push(['Nome', 'Matrícula', 'Departamento', 'Tipo']);
      for (const p of h.participantes) {
        rows.push([
          p.nome,
          p.matricula,
          p.departamento,
          p.tipo === 'email' ? 'E-mail' : 'Manual',
        ]);
      }
      rows.push([]);
    }

    rows.push([`Gerado em ${new Date().toLocaleString('pt-BR')}`]);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Ajusta largura das colunas
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
      {/* Estilos de impressão */}
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
        className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-6"
          onClick={e => e.stopPropagation()}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 no-print">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-slate-900">Lista de Presença</h2>
            </div>
            <div className="flex items-center gap-2">
              {dados && (
                <button
                  onClick={imprimir}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
              )}
              {dados && (
                <button
                  onClick={exportarXlsx}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <FileDown className="w-4 h-4" /> Exportar XLSX
                </button>
              )}
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-6 py-5">
            {loading && (
              <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
              </div>
            )}

            {erro && (
              <div className="py-10 text-center text-red-600 text-sm">{erro}</div>
            )}

            {dados && (
              <>
                {/* Cabeçalho do documento (visível na impressão) */}
                <div className="mb-5 pb-4 border-b border-slate-200">
                  <h1 className="text-xl font-bold text-slate-900">{dados.evento.titulo}</h1>
                  <div className="flex flex-wrap gap-4 mt-1 text-sm text-slate-500">
                    <span>📅 {dados.evento.data}</span>
                    <span>⏰ {dados.evento.hora_inicio} – {dados.evento.hora_fim}</span>
                    {dados.evento.nome_profissional && (
                      <span>👤 {dados.evento.nome_profissional}</span>
                    )}
                    <span className="font-semibold text-slate-700">
                      Total: {dados.total} participante{dados.total !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {dados.total === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Nenhum participante registrado ainda.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {dados.horarios.filter(h => h.participantes.length > 0).map(h => (
                      <div key={h.horario_id}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold border border-blue-100">
                            {h.hora_inicio} – {h.hora_fim}
                          </span>
                          <span className="text-xs text-slate-400">
                            {h.participantes.length} participante{h.participantes.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="rounded-xl border border-slate-200 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="w-8 px-3 py-2 text-left text-xs font-semibold text-slate-500">✓</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Nome</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 hidden sm:table-cell">Matrícula</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 hidden sm:table-cell">Departamento</th>
                                <th className="px-2 py-2 text-center text-xs font-semibold text-slate-500 no-print">Tipo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {h.participantes.map((p, i) => (
                                <tr
                                  key={i}
                                  className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                                >
                                  <td className="px-3 py-2.5">
                                    <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                                  </td>
                                  <td className="px-3 py-2.5 font-medium text-slate-800">{p.nome}</td>
                                  <td className="px-3 py-2.5 text-slate-500 hidden sm:table-cell">{p.matricula}</td>
                                  <td className="px-3 py-2.5 text-slate-500 hidden sm:table-cell">{p.departamento}</td>
                                  <td className="px-2 py-2.5 text-center no-print">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                      p.tipo === 'email'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {p.tipo === 'email' ? 'E-mail' : 'Manual'}
                                    </span>
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

                {/* Rodapé de impressão */}
                <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-400 text-right">
                  Gerado em {new Date().toLocaleString('pt-BR')}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Modal de registro manual ─────────────────────────────────────────────────

interface RegistrarParticipanteModalProps {
  evento: EventoDTO;
  onClose: () => void;
  onSuccess: () => void;
}

function RegistrarParticipanteModal({ evento, onClose, onSuccess }: RegistrarParticipanteModalProps) {
  const [nome, setNome] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [horarioId, setHorarioId] = useState<number | ''>('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const horarios: HorarioDTO[] = evento.horarios ?? [];

  async function handleSalvar() {
    if (!nome.trim()) { setErro('Informe o nome do participante.'); return; }
    if (!horarioId) { setErro('Selecione um horário.'); return; }
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
      setErro(err instanceof Error ? err.message : 'Erro ao registrar participante.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {sucesso ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">Participante registrado!</h3>
            <p className="text-sm text-slate-500 mb-6">
              <span className="font-medium">{nome}</span> foi adicionado ao evento com sucesso.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setNome(''); setDepartamento(''); setHorarioId(''); setSucesso(false); }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
                Registrar outro
              </button>
              <button onClick={onClose}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-slate-900">Registrar Participante</h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{evento.titulo}</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome completo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Setor</label>
                <input
                  type="text"
                  value={departamento}
                  onChange={e => setDepartamento(e.target.value)}
                  placeholder="Opcional"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Horário <span className="text-red-500">*</span></label>
                {horarios.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
                    Nenhum horário gerado para este evento.
                  </p>
                ) : (
                  <select
                    value={horarioId}
                    onChange={e => setHorarioId(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Selecione um horário...</option>
                    {horarios.map(h => {
                      const lotado = h.vagas_livres === 0;
                      return (
                        <option key={h.id} value={h.id} disabled={lotado}>
                          {h.hora_inicio.substring(0, 5)} – {h.hora_fim.substring(0, 5)}
                          {' '}{lotado ? '(Lotado)' : `(${h.vagas_livres}/${h.vagas_disponiveis} vagas)`}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {erro && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">{erro}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={onClose} disabled={salvando}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={handleSalvar} disabled={salvando || horarios.length === 0}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {salvando && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {salvando ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="h-44 bg-slate-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 bg-slate-200 rounded" />
        <div className="h-3 w-1/2 bg-slate-100 rounded" />
        <div className="h-3 w-2/3 bg-slate-100 rounded" />
        <div className="h-9 bg-slate-200 rounded-lg mt-2" />
      </div>
    </div>
  );
}

// ─── Card de evento ───────────────────────────────────────────────────────────

interface EventCardProps {
  evento: EventoDTO;
  onOpen: () => void;
}

interface EventActionsModalProps {
  evento: EventoDTO;
  isActing: boolean;
  isEmailActing: boolean;
  onCancelar: () => void;
  onDelete: () => void;
  onEnviarEmails: () => void;
  onRegistrar: () => void;
  onListaPresenca: () => void;
  onClose: () => void;
}

function EventActionsModal({ evento, isActing, isEmailActing, onCancelar, onDelete, onEnviarEmails, onRegistrar, onListaPresenca, onClose }: EventActionsModalProps) {
  const status = normalizeStatus(evento.status);

  const Spinner = () => (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-slate-900">Ações do evento</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4 truncate">{evento.titulo}</p>

        <div className="space-y-2">
          {status === 'ATIVO' && (
            <>
              <button onClick={onRegistrar}
                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                <User className="w-4 h-4" />
                Registrar Participante
              </button>
              <button onClick={onListaPresenca}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Lista de Presença
              </button>
              <button onClick={onEnviarEmails} disabled={isEmailActing || isActing}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                {isEmailActing ? <Spinner /> : <Mail className="w-4 h-4" />}
                {isEmailActing ? 'Enviando...' : 'Enviar E-mails'}
              </button>
              <button onClick={onCancelar} disabled={isActing || isEmailActing}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-60 text-slate-600 rounded-lg font-medium text-sm border border-slate-200 hover:border-amber-200 transition-colors flex items-center justify-center gap-2">
                {isActing ? <Spinner /> : <EyeOff className="w-4 h-4" />}
                {isActing ? 'Cancelando...' : 'Cancelar Evento'}
              </button>
            </>
          )}

          {status === 'CANCELADO' && (
            <>
              <button onClick={onListaPresenca}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Lista de Presença
              </button>
              <div className="w-full py-2 px-4 bg-rose-50 text-rose-700 rounded-lg font-medium text-sm text-center border border-rose-200">
                Evento cancelado
              </div>
            </>
          )}

          {status === 'ENCERRADO' && (
            <>
              <button onClick={onListaPresenca}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Lista de Presença
              </button>
              <div className="w-full py-2 px-4 bg-slate-50 text-slate-400 rounded-lg font-medium text-sm text-center border border-slate-200">
                Encerrado
              </div>
            </>
          )}

          <div className="flex gap-2 pt-1">
            <Link to={`/admin/eventos/${evento.id}/editar`} className="flex-1">
              <button className="w-full py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </button>
            </Link>
            <button onClick={onDelete}
              className="py-1.5 px-3 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-400 rounded-lg text-sm transition-colors flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventCard({ evento, onOpen }: EventCardProps) {
  const emoji = TIPO_EMOJI[evento.tipo] ?? '✨';
  const gradient = TIPO_GRADIENT[evento.tipo] ?? 'from-blue-400 to-blue-600';
  const status = normalizeStatus(evento.status);
  const statusCfg = STATUS_CONFIG[status];

  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col hover:shadow-md hover:border-blue-200 transition-all"
    >
      {/* Imagem / gradiente */}
      <div className={`relative h-44 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        {evento.imagem_url ? (
          <img
            src={evento.imagem_url}
            alt={evento.titulo}
            className="absolute inset-0 w-full h-full object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span className="text-6xl select-none">{emoji}</span>
        )}

        {/* Badge de status */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusCfg.badgeClass}`}>
          {statusCfg.label}
        </span>

        {/* Contagem de agendamentos */}
        <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 text-white text-xs font-medium px-2 py-1 rounded-full">
          <Users className="w-3 h-3" />
          {evento.total_agendamentos ?? 0}
        </span>
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-slate-900 leading-snug mb-3 line-clamp-2">
          {evento.titulo}
        </h3>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-3.5 h-3.5 shrink-0 text-blue-500" />
            <span>{formatDate(evento.data)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-3.5 h-3.5 shrink-0 text-blue-500" />
            <span>{evento.hora_inicio.substring(0, 5)} – {evento.hora_fim.substring(0, 5)}</span>
          </div>
          {evento.nome_profissional && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <User className="w-3.5 h-3.5 shrink-0 text-blue-500" />
              <span className="truncate">{evento.nome_profissional}</span>
            </div>
          )}
        </div>

        <div className="mt-auto pt-2">
          <div className="inline-flex items-center text-sm font-medium text-blue-600">
            Ver ações do evento
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function AdminEventos() {
  const [eventos, setEventos] = useState<EventoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [emailLoadingId, setEmailLoadingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventoDTO | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'ATIVO' | 'CANCELADO' | 'ENCERRADO'>('todos');
  const [registrarTarget, setRegistrarTarget] = useState<EventoDTO | null>(null);
  const [listaPresencaId, setListaPresencaId] = useState<number | null>(null);
  const [actionTarget, setActionTarget] = useState<EventoDTO | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ evento: EventoDTO; tipo: 'emails' | 'cancelar' } | null>(null);
  const [toast, setToast] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  useEffect(() => { carregarEventos(); }, []);

  async function carregarEventos() {
    setLoading(true);
    setErro('');
    try {
      const lista = await adminEventosApi.listar();
      setEventos(lista);
      setRegistrarTarget(prev => prev ? (lista.find(e => e.id === prev.id) ?? null) : null);
    } catch {
      setErro('Não foi possível carregar os eventos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelar(evento: EventoDTO) {
    setActionLoadingId(evento.id);
    try { await adminEventosApi.cancelar(evento.id); await carregarEventos(); }
    catch (err) { console.error(err); }
    finally { setActionLoadingId(null); }
  }

  function mostrarToast(tipo: 'sucesso' | 'erro', msg: string) {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleEnviarEmails(evento: EventoDTO) {
    setEmailLoadingId(evento.id);
    try {
      await adminEventosApi.enviarEmails(evento.id);
      mostrarToast('sucesso', `E-mail enviado com sucesso para a lista de distribuição.`);
    } catch (err) {
      mostrarToast('erro', err instanceof Error ? err.message : 'Erro ao enviar e-mails.');
    } finally {
      setEmailLoadingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api'}/admin/eventos/${deleteTarget.id}/`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token ?? ''}` } }
      );
      if (!res.ok) throw new Error();
      setEventos(prev => prev.filter(e => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) { console.error(err); }
    finally { setDeleteLoading(false); }
  }

  const eventosFiltrados = filtro === 'todos'
    ? eventos
    : eventos.filter(e => normalizeStatus(e.status) === filtro);

  const FILTROS = [
    { key: 'todos',     label: 'Todos' },
    { key: 'ATIVO',     label: 'Publicados' },
    { key: 'CANCELADO', label: 'Cancelados' },
    { key: 'ENCERRADO', label: 'Encerrados' },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto">

      {/* Toast de feedback */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm transition-all
          ${toast.tipo === 'sucesso' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.tipo === 'sucesso'
            ? <CheckCircle2 className="w-5 h-5 shrink-0" />
            : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Eventos de Bem-Estar</h1>
          <p className="text-slate-500 text-sm">Gerencie todos os eventos criados para os colaboradores.</p>
        </div>
        <Link to="/admin/eventos/novo">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Criar novo evento
          </button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtro === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
            {f.key !== 'todos' && (
              <span className="ml-1.5 text-xs opacity-70">
                ({eventos.filter(e => normalizeStatus(e.status) === f.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Erro */}
      {erro && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
          <span>{erro}</span>
          <button onClick={carregarEventos} className="ml-4 underline font-medium hover:text-red-800">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Grid de cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : eventosFiltrados.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium mb-1">
            {filtro === 'todos' ? 'Nenhum evento criado ainda.' : `Nenhum evento ${FILTROS.find(f => f.key === filtro)?.label.toLowerCase()}.`}
          </p>
          {filtro === 'todos' && (
            <Link to="/admin/eventos/novo" className="text-blue-600 hover:underline text-sm">
              Criar primeiro evento
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {eventosFiltrados.map(evento => (
            <EventCard
              key={evento.id}
              evento={evento}
              onOpen={() => setActionTarget(evento)}
            />
          ))}
        </div>
      )}

      {actionTarget && (
        <EventActionsModal
          evento={actionTarget}
          isActing={actionLoadingId === actionTarget.id}
          isEmailActing={emailLoadingId === actionTarget.id}
          onCancelar={() => { setConfirmAction({ evento: actionTarget, tipo: 'cancelar' }); setActionTarget(null); }}
          onDelete={() => { setDeleteTarget(actionTarget); setActionTarget(null); }}
          onEnviarEmails={() => { setConfirmAction({ evento: actionTarget, tipo: 'emails' }); setActionTarget(null); }}
          onRegistrar={() => { setRegistrarTarget(actionTarget); setActionTarget(null); }}
          onListaPresenca={() => { setListaPresencaId(actionTarget.id); setActionTarget(null); }}
          onClose={() => setActionTarget(null)}
        />
      )}

      {confirmAction && (
        <ConfirmActionModal
          evento={confirmAction.evento}
          tipo={confirmAction.tipo}
          loading={
            confirmAction.tipo === 'emails'
              ? emailLoadingId === confirmAction.evento.id
              : actionLoadingId === confirmAction.evento.id
          }
          onCancel={() => setConfirmAction(null)}
          onConfirm={async () => {
            if (confirmAction.tipo === 'emails') {
              await handleEnviarEmails(confirmAction.evento);
            } else {
              await handleCancelar(confirmAction.evento);
            }
            setConfirmAction(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          evento={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      {registrarTarget && (
        <RegistrarParticipanteModal
          evento={registrarTarget}
          onClose={() => setRegistrarTarget(null)}
          onSuccess={carregarEventos}
        />
      )}

      {listaPresencaId !== null && (
        <ListaPresencaModal
          eventoId={listaPresencaId}
          onClose={() => setListaPresencaId(null)}
        />
      )}
    </div>
  );
}
