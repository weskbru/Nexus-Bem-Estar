import { useEffect, useState, type ReactNode } from 'react';
import { Download, Award, FileText, PieChart, BarChart2, AlertCircle, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { adminDashboardApi, adminEventosApi, type EventoDTO, type AgendamentoDTO } from '../../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
function exportarXLSX(eventos: EventoDTO[], agendamentos: AgendamentoDTO[]) {
  const wb = XLSX.utils.book_new();

  // ── Planilha 1: Eventos ──────────────────────────────────────────────────
  const wsEventos = XLSX.utils.aoa_to_sheet([
    ['Título', 'Tipo', 'Data', 'Status', 'Profissional', 'Total de Agendamentos'],
    ...eventos.map(e => [
      e.titulo,
      e.tipo,
      new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR'),
      e.status,
      e.nome_profissional || '—',
      e.total_agendamentos ?? 0,
    ]),
  ]);
  wsEventos['!cols'] = [{ wch: 40 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsEventos, 'Eventos');

  // ── Planilha 2: Agendamentos ─────────────────────────────────────────────
  const wsAgendamentos = XLSX.utils.aoa_to_sheet([
    ['Colaborador', 'E-mail', 'Evento', 'Data do Evento', 'Horário', 'Status'],
    ...agendamentos.map(a => [
      a.usuario?.nome ?? '—',
      a.usuario?.email ?? '—',
      a.evento_titulo ?? '—',
      a.evento_data ? new Date(a.evento_data + 'T00:00:00').toLocaleDateString('pt-BR') : '—',
      a.horario ? `${a.horario.hora_inicio.substring(0, 5)} - ${a.horario.hora_fim.substring(0, 5)}` : '—',
      a.status,
    ]),
  ]);
  wsAgendamentos['!cols'] = [{ wch: 32 }, { wch: 36 }, { wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsAgendamentos, 'Agendamentos');

  // ── Planilha 3: Resumo Analítico ─────────────────────────────────────────
  const totalEventos = eventos.length;
  const statusDist = eventos.reduce<Record<string, number>>((acc, e) => {
    const s = e.status.toUpperCase() === 'ATIVO' ? 'PUBLICADO' : e.status.toUpperCase();
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const porMes = new Array<number>(12).fill(0);
  const MESES_LABEL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  agendamentos.forEach(a => {
    if (a.evento_data) porMes[new Date(a.evento_data + 'T00:00:00').getMonth()]++;
  });

  const ranking = [...eventos]
    .sort((a, b) => (b.total_agendamentos ?? 0) - (a.total_agendamentos ?? 0))
    .slice(0, 5);

  const wsResumo = XLSX.utils.aoa_to_sheet([
    ['RESUMO ANALÍTICO'],
    [],
    ['Distribuição por Status'],
    ['Status', 'Quantidade', '% do Total'],
    ...['PUBLICADO', 'ENCERRADO', 'CANCELADO'].map(s => [
      s,
      statusDist[s] ?? 0,
      totalEventos > 0 ? `${Math.round(((statusDist[s] ?? 0) / totalEventos) * 100)}%` : '0%',
    ]),
    [],
    ['Agendamentos por Mês', new Date().getFullYear()],
    ['Mês', 'Agendamentos'],
    ...MESES_LABEL.map((mes, i) => [mes, porMes[i]]),
    [],
    ['Top 5 — Eventos com Maior Engajamento'],
    ['Posição', 'Título', 'Tipo', 'Data', 'Total de Agendamentos'],
    ...ranking.map((e, i) => [
      i + 1,
      e.titulo,
      e.tipo,
      new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR'),
      e.total_agendamentos ?? 0,
    ]),
  ]);
  wsResumo['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Analítico');

  XLSX.writeFile(wb, `relatorio-aeb-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const STATUS_SKELETON_KEYS = ['status-1', 'status-2', 'status-3'];
const RANKING_SKELETON_KEYS = ['ranking-1', 'ranking-2', 'ranking-3', 'ranking-4', 'ranking-5'];
const TABELA_SKELETON_KEYS = ['tabela-1', 'tabela-2', 'tabela-3', 'tabela-4'];

// Paleta Semântica Refinada
const STATUS_EVENTO_ITENS = [
  { key: 'PUBLICADO', label: 'Publicados', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  { key: 'ENCERRADO', label: 'Encerrados', color: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-100' },
  { key: 'CANCELADO', label: 'Cancelados', color: 'bg-rose-400', text: 'text-rose-700', bg: 'bg-rose-50' },
] as const;

function getAgendamentoStatusClass(status: string): string {
  const s = status.toUpperCase();
  if (s === 'CONFIRMADO') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }
  if (s === 'CANCELADO') {
    return 'bg-rose-50 text-rose-700 border border-rose-200';
  }
  return 'bg-slate-100 text-slate-700 border border-slate-200';
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

type MesBarProps = Readonly<{ mes: string; valor: number; max: number }>;

function MesBar({ mes, valor, max }: MesBarProps) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-2 group cursor-default flex-1">
      <span className="text-[11px] font-bold text-slate-400 group-hover:text-blue-600 transition-colors h-4">
        {valor > 0 ? valor : ''}
      </span>
      <div className="w-full max-w-[36px] bg-slate-100 rounded-t-lg flex items-end overflow-hidden" style={{ height: 120 }}>
        <div
          className="w-full bg-blue-500 rounded-t-lg transition-all duration-1000 ease-out group-hover:bg-blue-400 relative"
          style={{ height: `${pct}%` }}
        >
          {/* Efeito de brilho/volume no gráfico */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20"></div>
        </div>
      </div>
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{mes}</span>
    </div>
  );
}

type SkeletonProps = Readonly<{ className: string }>;

function Skeleton({ className }: SkeletonProps) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />;
}

// ── Página Principal ──────────────────────────────────────────────────────────

export default function Relatorios() {
  const [eventos, setEventos] = useState<EventoDTO[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        const [dash, evts] = await Promise.all([
          adminDashboardApi.obter(),
          adminEventosApi.listar(),
        ]);
        setAgendamentos(dash.agendamentos_recentes ?? []);
        setEventos(evts);
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao carregar os relatórios analíticos.');
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  // ── Derivações Analíticas ──────────────────────────────────────────────────

  const ranking = [...eventos]
    .sort((a, b) => (b.total_agendamentos ?? 0) - (a.total_agendamentos ?? 0))
    .slice(0, 5);

  const porMes = new Array<number>(12).fill(0);
  agendamentos.forEach(a => {
    if (a.evento_data) {
      const m = new Date(a.evento_data + 'T00:00:00').getMonth();
      porMes[m]++;
    }
  });
  const maxMes = Math.max(1, ...porMes);

  const totalEventos = eventos.length;
  const statusDist = eventos.reduce<Record<string, number>>((acc, e) => {
    const statusNormalizado = e.status.toUpperCase();
    const s = statusNormalizado === 'ATIVO' ? 'PUBLICADO' : statusNormalizado;
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  // ── Renderização dos Blocos ────────────────────────────────────────────────

  let statusEventosContent: ReactNode;
  if (loading) {
    statusEventosContent = (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATUS_SKELETON_KEYS.map(key => <Skeleton key={key} className="h-28 w-full" />)}
      </div>
    );
  } else if (totalEventos === 0) {
    statusEventosContent = (
      <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
        <PieChart className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-sm font-medium text-slate-500">Nenhum evento registrado ainda.</p>
      </div>
    );
  } else {
    statusEventosContent = (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATUS_EVENTO_ITENS.map(({ key, label, color, text, bg }) => {
          const qty = statusDist[key] ?? 0;
          const pct = totalEventos > 0 ? Math.round((qty / totalEventos) * 100) : 0;
          return (
            <div key={key} className={`rounded-2xl p-5 ${bg} border border-black/5`}>
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider ${text}`}>{label}</span>
                <span className={`text-2xl font-extrabold ${text} leading-none`}>{qty}</span>
              </div>
              <div className="w-full bg-black/5 rounded-full h-2 overflow-hidden mb-2">
                <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
              </div>
              <p className={`text-[11px] font-bold ${text} opacity-70`}>{pct}% do total de eventos</p>
            </div>
          );
        })}
      </div>
    );
  }

  let rankingContent: ReactNode;
  if (loading) {
    rankingContent = (
      <div className="space-y-4 mt-2">
        {RANKING_SKELETON_KEYS.map(key => (
          <div key={key} className="flex items-center gap-4 animate-pulse">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    );
  } else if (ranking.length === 0) {
    rankingContent = (
      <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
        <Award className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-sm font-medium text-slate-500">Nenhum dado para o ranking.</p>
      </div>
    );
  } else {
    rankingContent = (
      <div className="space-y-1">
        {ranking.map((evento, idx) => {
          const ag = evento.total_agendamentos ?? 0;
          const medalhas = ['🥇', '🥈', '🥉'];
          return (
            <div key={evento.id} className="group flex items-center gap-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/80 rounded-xl px-3 transition-colors">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 bg-white shadow-sm border border-slate-100 rounded-full group-hover:scale-110 transition-transform">
                {medalhas[idx] ?? <span className="text-xs font-extrabold text-slate-400">{idx + 1}º</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors">{evento.titulo}</p>
                <p className="text-[12px] font-medium text-slate-500 capitalize">
                  {evento.tipo} • {new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </p>
              </div>
              <div className="flex items-center justify-center px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg shrink-0">
                <span className="text-[11px] font-extrabold tracking-wider">{ag} reservas</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  let historicoAgendamentosContent: ReactNode;
  if (loading) {
    historicoAgendamentosContent = (
      <div className="divide-y divide-slate-100 p-2">
        {TABELA_SKELETON_KEYS.map(key => (
          <div key={key} className="px-6 py-4 flex items-center gap-5 animate-pulse">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    );
  } else if (agendamentos.length === 0) {
    historicoAgendamentosContent = (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50/50">
        <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-sm font-bold text-slate-600">Nenhum histórico encontrado</p>
        <p className="text-xs font-medium mt-1 text-slate-400">Os agendamentos recentes aparecerão aqui.</p>
      </div>
    );
  } else {
    historicoAgendamentosContent = (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left border-y border-slate-200">
              <th className="px-6 py-4">Colaborador</th>
              <th className="px-6 py-4">Evento Requisitado</th>
              <th className="px-6 py-4 hidden sm:table-cell">Horário</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agendamentos.map(ag => {
              const statusCls = getAgendamentoStatusClass(ag.status);
              const iniciais = (ag.usuario?.nome ?? '?')
                .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
              
              return (
                <tr key={ag.id} className="hover:bg-slate-50/60 transition-colors group bg-white">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center text-xs font-extrabold shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        {iniciais}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{ag.usuario?.nome ?? '—'}</span>
                        <span className="text-xs text-slate-500 hidden sm:block">{ag.usuario?.email ?? ''}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700 truncate max-w-[200px]">{ag.evento_titulo ?? '—'}</p>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">
                      {ag.evento_data ? new Date(ag.evento_data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </p>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600 hidden sm:table-cell">
                    {ag.horario ? (
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60 text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {ag.horario.hora_inicio.substring(0, 5)} - {ag.horario.hora_fim.substring(0, 5)}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider uppercase shadow-sm ${statusCls}`}>
                      {ag.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      
      {/* Header Interno do Relatório */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Relatórios Analíticos</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Insights detalhados sobre o desempenho da plataforma.
          </p>
        </div>
        {!loading && (
          <button
            onClick={() => exportarXLSX(eventos, agendamentos)}
            className="flex items-center justify-center w-full sm:w-auto gap-2 px-5 py-2.5 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-all shadow-sm outline-none active:scale-[0.98]"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Exportar XLSX
          </button>
        )}
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 px-5 py-4 rounded-2xl text-sm font-bold animate-pulse">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          {erro}
        </div>
      )}

      {/* Linha 1: Distribuição por status */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-slate-50 border border-slate-100 text-slate-600 rounded-xl flex items-center justify-center shadow-sm">
            <PieChart className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Status Geral dos Eventos</h3>
        </div>
        {statusEventosContent}
      </div>

      {/* Linha 2: Ranking + Agendamentos por mês */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        
        {/* Ranking Top 5 */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Top 5 — Mais Engajamento</h3>
          </div>
          {rankingContent}
        </div>

        {/* Gráfico Agendamentos por Mês */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 p-6 md:p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <BarChart2 className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Volume Anual</h3>
            </div>
            <span className="text-[11px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
              {new Date().getFullYear()}
            </span>
          </div>
          
          {loading ? (
            <div className="flex items-end justify-between gap-2 h-32 mt-auto">
              {MESES.map(mes => (
                <Skeleton key={`skeleton-${mes}`} className="w-full h-full rounded-t-xl rounded-b-none" />
              ))}
            </div>
          ) : (
            <div className="flex items-end justify-between gap-1.5 mt-auto relative pt-4">
              {/* Linhas guias de fundo opcionais para visual mais analítico */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 opacity-30">
                <div className="border-b border-dashed border-slate-300 w-full h-0"></div>
                <div className="border-b border-dashed border-slate-300 w-full h-0"></div>
              </div>
              
              {porMes.map((val, i) => (
                <MesBar key={MESES[i]} mes={MESES[i]} valor={val} max={maxMes} />
              ))}
            </div>
          )}
          {!loading && agendamentos.length === 0 && (
            <p className="text-[13px] font-medium text-slate-400 text-center mt-6">Aguardando dados para preencher o gráfico.</p>
          )}
        </div>
      </div>

      {/* Linha 3: Tabela de Agendamentos Recentes */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden">
        <div className="px-6 md:px-8 py-6 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-b from-slate-50/50 to-white">
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Registro de Agendamentos</h3>
            <p className="text-sm font-medium text-slate-500 mt-0.5">Últimas movimentações no sistema.</p>
          </div>
        </div>
        {historicoAgendamentosContent}
      </div>

    </div>
  );
}