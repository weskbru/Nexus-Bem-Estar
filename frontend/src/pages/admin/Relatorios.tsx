import { useEffect, useState, type ReactNode } from 'react';
import { Download, Award, FileText, PieChart, BarChart2 } from 'lucide-react';
import { adminDashboardApi, adminEventosApi, type EventoDTO, type AgendamentoDTO } from '../../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
function exportarCSV(eventos: EventoDTO[], agendamentos: AgendamentoDTO[]) {
  const linhas = [
    ['=== EVENTOS ==='],
    ['Título', 'Tipo', 'Data', 'Status', 'Profissional', 'Agendamentos'],
    ...eventos.map(e => [
      `"${e.titulo}"`,
      e.tipo,
      new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR'),
      e.status,
      e.nome_profissional || '—',
      String(e.total_agendamentos ?? 0),
    ]),
    [],
    ['=== AGENDAMENTOS RECENTES ==='],
    ['Colaborador', 'Evento', 'Data', 'Status'],
    ...agendamentos.map(a => [
      `"${a.usuario?.nome ?? '—'}"`,
      `"${a.evento_titulo ?? '—'}"`,
      a.evento_data ? new Date(a.evento_data + 'T00:00:00').toLocaleDateString('pt-BR') : '—',
      a.status,
    ]),
  ];

  const csv = linhas.map(l => l.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const STATUS_SKELETON_KEYS = ['status-1', 'status-2', 'status-3'];
const RANKING_SKELETON_KEYS = ['ranking-1', 'ranking-2', 'ranking-3', 'ranking-4', 'ranking-5'];
const TABELA_SKELETON_KEYS = ['tabela-1', 'tabela-2', 'tabela-3', 'tabela-4'];

// Cores atualizadas para combinar com a nova identidade
const STATUS_EVENTO_ITENS = [
  { key: 'PUBLICADO', label: 'Publicados', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50/50' },
  { key: 'ENCERRADO', label: 'Encerrados', color: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-50' },
  { key: 'CANCELADO', label: 'Cancelados', color: 'bg-rose-400', text: 'text-rose-700', bg: 'bg-rose-50/50' },
] as const;

function getAgendamentoStatusClass(status: string): string {
  if (status === 'CONFIRMADO') {
    return 'bg-emerald-100 text-emerald-800 border border-emerald-200/60';
  }
  if (status === 'CANCELADO') {
    return 'bg-rose-100 text-rose-800 border border-rose-200/60';
  }
  return 'bg-slate-100 text-slate-700 border border-slate-200/60';
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

type MesBarProps = Readonly<{ mes: string; valor: number; max: number }>;

function MesBar({ mes, valor, max }: MesBarProps) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-2 group cursor-default">
      <span className="text-[11px] font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
        {valor > 0 ? valor : ''}
      </span>
      <div className="w-7 sm:w-9 bg-slate-50 rounded-t-lg flex items-end overflow-hidden" style={{ height: 100 }}>
        <div
          className="w-full bg-emerald-500 rounded-t-lg transition-all duration-1000 ease-out group-hover:bg-emerald-400"
          style={{ height: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{mes}</span>
    </div>
  );
}

type SkeletonProps = Readonly<{ className: string }>;

function Skeleton({ className }: SkeletonProps) {
  return <div className={`animate-pulse bg-slate-100/80 rounded-xl ${className}`} />;
}

// ── Página principal ──────────────────────────────────────────────────────────

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
        setErro(err instanceof Error ? err.message : 'Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  // ── Derivações analíticas ──────────────────────────────────────────────────

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

  let statusEventosContent: ReactNode;
  if (loading) {
    statusEventosContent = (
      <div className="space-y-3">
        {STATUS_SKELETON_KEYS.map(key => <Skeleton key={key} className="h-16 w-full" />)}
      </div>
    );
  } else if (totalEventos === 0) {
    statusEventosContent = <p className="text-sm font-medium text-slate-400 text-center py-8">Sem dados registrados.</p>;
  } else {
    statusEventosContent = (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATUS_EVENTO_ITENS.map(({ key, label, color, text, bg }) => {
          const qty = statusDist[key] ?? 0;
          const pct = totalEventos > 0 ? Math.round((qty / totalEventos) * 100) : 0;
          return (
            <div key={key} className={`rounded-2xl p-4 ${bg} border border-white/40`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-bold uppercase tracking-wider opacity-80 ${text}`}>{label}</span>
                <span className={`text-xl font-extrabold ${text}`}>{qty}</span>
              </div>
              <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[13px] mt-2 font-medium opacity-70 {text}">{pct}% do total</p>
            </div>
          );
        })}
      </div>
    );
  }

  let rankingContent: ReactNode;
  if (loading) {
    rankingContent = (
      <div className="space-y-4">
        {RANKING_SKELETON_KEYS.map(key => (
          <div key={key} className="flex items-center gap-4 animate-pulse">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </div>
    );
  } else if (ranking.length === 0) {
    rankingContent = <p className="text-sm font-medium text-slate-400 text-center py-8">Nenhum evento cadastrado.</p>;
  } else {
    rankingContent = (
      <div className="space-y-1">
        {ranking.map((evento, idx) => {
          const ag = evento.total_agendamentos ?? 0;
          const medalhas = ['🥇', '🥈', '🥉'];
          return (
            <div key={evento.id} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 rounded-xl px-2 transition-colors">
              <span className="text-xl w-8 text-center shrink-0">
                {medalhas[idx] ?? <span className="text-sm font-extrabold text-slate-300">{idx + 1}º</span>}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{evento.titulo}</p>
                <p className="text-[13px] font-medium text-slate-400">{evento.tipo} · {new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
              </div>
              <span className="text-sm font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg shrink-0">
                {ag} ag.
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  let historicoAgendamentosContent: ReactNode;
  if (loading) {
    historicoAgendamentosContent = (
      <div className="divide-y divide-slate-100">
        {TABELA_SKELETON_KEYS.map(key => (
          <div key={key} className="px-6 py-5 flex items-center gap-5 animate-pulse">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    );
  } else if (agendamentos.length === 0) {
    historicoAgendamentosContent = (
      <div className="text-center py-20 text-slate-400">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-sm font-medium">Nenhum agendamento registrado ainda.</p>
      </div>
    );
  } else {
    historicoAgendamentosContent = (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider text-left border-b border-slate-100">
              <th className="px-6 py-4 rounded-tl-xl">Colaborador</th>
              <th className="px-6 py-4">Evento</th>
              <th className="px-6 py-4">Horário</th>
              <th className="px-6 py-4">Data do Evento</th>
              <th className="px-6 py-4 rounded-tr-xl">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agendamentos.map(ag => {
              const statusCls = getAgendamentoStatusClass(ag.status);
              const iniciais = (ag.usuario?.nome ?? '?')
                .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
              return (
                <tr key={ag.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center text-xs font-extrabold shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        {iniciais}
                      </div>
                      <span className="font-bold text-slate-800">{ag.usuario?.nome ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600">{ag.evento_titulo ?? '—'}</td>
                  <td className="px-6 py-4 font-medium text-slate-500">
                    {ag.horario ? (
                      <span className="bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                        {ag.horario.hora_inicio.substring(0, 5)} – {ag.horario.hora_fim.substring(0, 5)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-500">
                    {ag.evento_data
                      ? new Date(ag.evento_data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${statusCls}`}>
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
    <div className="w-full space-y-8">
      {/* Header Interno do Relatório */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Relatórios Analíticos</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Análise de desempenho dos eventos e engajamento da equipe.
          </p>
        </div>
        {!loading && (
          <button
            onClick={() => exportarCSV(eventos, agendamentos)}
            className="flex items-center justify-center w-full sm:w-auto gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-sm font-bold rounded-xl transition-all shadow-sm outline-none focus:ring-4 focus:ring-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        )}
      </div>

      {erro && (
        <div className="bg-red-50/50 border border-red-200 text-red-800 px-5 py-4 rounded-2xl text-sm font-medium">
          {erro}
        </div>
      )}

      {/* Linha 1: Distribuição por status */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-6 md:p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
            <PieChart className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Status dos Eventos</h3>
        </div>
        {statusEventosContent}
      </div>

      {/* Linha 2: Ranking + Agendamentos por mês */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Ranking top 5 */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-6 md:p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Top 5 — Mais Agendados</h3>
          </div>
          {rankingContent}
        </div>

        {/* Agendamentos por mês */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-6 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <BarChart2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Agendamentos por Mês</h3>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
              {new Date().getFullYear()}
            </span>
          </div>
          
          {loading ? (
            <div className="flex items-end justify-between gap-1 h-32 mt-4">
              {MESES.map(mes => (
                <Skeleton key={`skeleton-${mes}`} className="w-full h-full rounded-t-lg rounded-b-none" />
              ))}
            </div>
          ) : (
            <div className="flex items-end justify-between gap-1.5 mt-4">
              {porMes.map((val, i) => (
                <MesBar key={MESES[i]} mes={MESES[i]} valor={val} max={maxMes} />
              ))}
            </div>
          )}
          {!loading && agendamentos.length === 0 && (
            <p className="text-[13px] font-medium text-slate-400 text-center mt-6">Dados insuficientes para gerar o gráfico.</p>
          )}
        </div>
      </div>

      {/* Linha 3: Tabela de agendamentos recentes detalhada */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
        <div className="px-6 md:px-8 py-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Histórico de Agendamentos</h3>
          <p className="text-[13px] font-medium text-slate-500 mt-1">Todos os agendamentos registrados no sistema.</p>
        </div>
        {historicoAgendamentosContent}
      </div>

    </div>
  );
}