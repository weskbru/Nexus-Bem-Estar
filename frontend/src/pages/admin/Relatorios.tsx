import { useEffect, useState } from 'react';
import { Download, Award, FileText } from 'lucide-react';
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

// ── Sub-componentes ───────────────────────────────────────────────────────────

function MesBar({ mes, valor, max }: { mes: string; valor: number; max: number }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-medium text-slate-700">{valor > 0 ? valor : ''}</span>
      <div className="w-8 bg-slate-100 rounded-t flex items-end" style={{ height: 80 }}>
        <div
          className="w-full bg-blue-500 rounded-t transition-all duration-700"
          style={{ height: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-400">{mes}</span>
    </div>
  );
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded ${className}`} />;
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

  // Ranking de eventos por agendamentos
  const ranking = [...eventos]
    .sort((a, b) => (b.total_agendamentos ?? 0) - (a.total_agendamentos ?? 0))
    .slice(0, 5);

  // Agendamentos por mês (baseado em evento_data dos agendamentos recentes)
  const porMes = Array(12).fill(0);
  agendamentos.forEach(a => {
    if (a.evento_data) {
      const m = new Date(a.evento_data + 'T00:00:00').getMonth();
      porMes[m]++;
    }
  });
  const maxMes = Math.max(1, ...porMes);

  // Distribuição por status dos eventos
  const totalEventos = eventos.length;
  const statusDist = eventos.reduce<Record<string, number>>((acc, e) => {
    const statusNormalizado = e.status.toUpperCase();
    const s = statusNormalizado === 'ATIVO' ? 'PUBLICADO' : statusNormalizado;
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-500 mt-1">Análise de desempenho dos eventos e engajamento dos colaboradores.</p>
        </div>
        {!loading && (
          <button
            onClick={() => exportarCSV(eventos, agendamentos)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        )}
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{erro}</div>
      )}

      {/* Linha 1: Distribuição por status */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="w-4 h-4 text-violet-600" />
            <h2 className="font-semibold text-slate-900">Status dos Eventos</h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : totalEventos === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sem dados.</p>
          ) : (
            <div className="space-y-3">
              {[
                { key: 'PUBLICADO', label: 'Publicados',  color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
                { key: 'CANCELADO', label: 'Cancelados',  color: 'bg-rose-400',    text: 'text-rose-700',    bg: 'bg-rose-50'    },
                { key: 'ENCERRADO', label: 'Encerrados',  color: 'bg-red-400',     text: 'text-red-700',     bg: 'bg-red-50'     },
              ].map(({ key, label, color, text, bg }) => {
                const qty = statusDist[key] ?? 0;
                const pct = totalEventos > 0 ? Math.round((qty / totalEventos) * 100) : 0;
                return (
                  <div key={key} className={`rounded-xl p-3 ${bg}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium ${text}`}>{label}</span>
                      <span className={`text-sm font-bold ${text}`}>{qty}</span>
                    </div>
                    <div className="w-full bg-white/60 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs mt-1 opacity-60 font-medium">{pct}% do total</p>
                  </div>
                );
              })}
              <p className="text-xs text-slate-400 text-right pt-1">{totalEventos} eventos no total</p>
            </div>
          )}
        </div>
      </div>

      {/* Linha 2: Ranking + Agendamentos por mês */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Ranking top 5 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Award className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-slate-900">Top 5 — Mais Agendados</h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          ) : ranking.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhum evento cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {ranking.map((evento, idx) => {
                const ag = evento.total_agendamentos ?? 0;
                const medalhas = ['🥇', '🥈', '🥉'];
                return (
                  <div key={evento.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <span className="text-lg w-7 text-center shrink-0">
                      {medalhas[idx] ?? <span className="text-sm font-bold text-slate-400">{idx + 1}</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{evento.titulo}</p>
                      <p className="text-xs text-slate-400">{evento.tipo} · {new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                    </div>
                    <span className="text-sm font-bold text-blue-600 shrink-0">{ag} ag.</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Agendamentos por mês */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">Agendamentos por Mês</h2>
            <span className="text-xs text-slate-400">{new Date().getFullYear()}</span>
          </div>
          {loading ? (
            <div className="flex items-end gap-1 h-24">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 h-full" />
              ))}
            </div>
          ) : (
            <div className="flex items-end justify-between gap-1">
              {porMes.map((val, i) => (
                <MesBar key={i} mes={MESES[i]} valor={val} max={maxMes} />
              ))}
            </div>
          )}
          {!loading && agendamentos.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-4">Dados insuficientes para o gráfico.</p>
          )}
        </div>
      </div>

      {/* Linha 3: Tabela de agendamentos recentes detalhada */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Histórico de Agendamentos</h2>
          <p className="text-xs text-slate-400 mt-0.5">Todos os agendamentos registrados no sistema.</p>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex gap-4 animate-pulse">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : agendamentos.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum agendamento registrado ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">
                  <th className="px-6 py-3">Colaborador</th>
                  <th className="px-6 py-3">Evento</th>
                  <th className="px-6 py-3">Profissional</th>
                  <th className="px-6 py-3">Data do Evento</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agendamentos.map(ag => {
                  const statusCls =
                    ag.status === 'CONFIRMADO' ? 'bg-emerald-100 text-emerald-700' :
                    ag.status === 'CANCELADO'  ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600';
                  const iniciais = (ag.usuario?.nome ?? '?')
                    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
                  return (
                    <tr key={ag.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {iniciais}
                          </div>
                          <span className="font-medium text-slate-900">{ag.usuario?.nome ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{ag.evento_titulo ?? '—'}</td>
                      <td className="px-6 py-3 text-slate-500">{ag.nome_profissional || '—'}</td>
                      <td className="px-6 py-3 text-slate-500">
                        {ag.evento_data
                          ? new Date(ag.evento_data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusCls}`}>
                          {ag.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
