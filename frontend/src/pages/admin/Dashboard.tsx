import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import type { DashboardDTO } from '../../services/api';
import Relatorios from './Relatorios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api';

function StatSkeleton() {
  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-3 w-24 bg-slate-200 rounded-full" />
        <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
      </div>
      <div className="h-8 w-3/4 bg-slate-200 rounded-lg mb-3" />
      <div className="h-3 w-40 bg-slate-100 rounded-full" />
    </div>
  );
}

function formatarDataEvento(data: string): string {
  return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    setErro('');
    try {
      const res = await fetch(`${API_BASE}/admin/dashboard/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json: DashboardDTO = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[Dashboard] Erro ao carregar dados:', err);
      setErro('Não foi possível sincronizar as métricas no momento.');
    } finally {
      setLoading(false);
    }
  }

  const proximoEvento = data?.proximo_evento;
  const pendencias = data?.pendencias;
  const ocupacaoProximo = proximoEvento?.total_vagas
    ? Math.min((proximoEvento.vagas_ocupadas / proximoEvento.total_vagas) * 100, 100)
    : 0;
  const totalEventosFuturos = data?.total_eventos_ativos ?? 0;
  const rotuloEventosFuturos = totalEventosFuturos === 1 ? 'evento' : 'eventos';

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Visão Geral</h1>
          <p className="text-slate-500 font-medium mt-1.5 text-sm sm:text-base">
            Resumo operacional dos próximos eventos.
          </p>
        </div>
        <Link to="/admin/eventos/novo" className="w-full sm:w-auto">
          <button className="w-full sm:w-auto flex items-center justify-center px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm hover:shadow-md hover:shadow-blue-500/20 transition-all active:scale-[0.98] outline-none">
            <Plus className="w-5 h-5 mr-2" />
            Criar Novo Evento
          </button>
        </Link>
      </div>

      {erro && (
        <div className="mb-8 px-5 py-4 bg-red-50 border border-red-100 text-red-800 rounded-2xl text-sm font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{erro}</span>
          </div>
          <button
            onClick={fetchDashboard}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors shadow-sm font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8 mb-6">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="group bg-white p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 border border-slate-100 hover:border-blue-100 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-5">
                <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mt-1">Próximo Evento</h3>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center transition-colors">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
              {proximoEvento ? (
                <>
                  <p className="text-xl font-extrabold text-slate-900 truncate" title={proximoEvento.titulo}>
                    {proximoEvento.titulo}
                  </p>
                  <p className="text-sm font-semibold text-blue-700 mt-2">
                    {formatarDataEvento(proximoEvento.data)} às {proximoEvento.hora_inicio.substring(0, 5)}
                  </p>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mt-5 mb-2">
                    <span>{proximoEvento.vagas_ocupadas} de {proximoEvento.total_vagas} vagas</span>
                    <span>{proximoEvento.vagas_livres} livres</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${ocupacaoProximo}%` }} />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xl font-extrabold text-slate-900">Nenhum evento agendado</p>
                  <p className="text-[13px] font-medium text-slate-400 mt-3">Crie um evento para iniciar a agenda.</p>
                </>
              )}
            </div>

            <div className="group bg-white p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 border border-slate-100 hover:border-indigo-100 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mt-1">Agenda Futura</h3>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 rounded-2xl flex items-center justify-center transition-colors">
                  <Users className="w-6 h-6" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {totalEventosFuturos.toLocaleString('pt-BR')}
                </span>
                <span className="text-sm font-bold text-slate-500">{rotuloEventosFuturos}</span>
              </div>
              <p className="text-[13px] font-medium text-slate-500 mt-3">
                {(data?.total_vagas ?? 0).toLocaleString('pt-BR')} vagas no total da agenda
              </p>
              <div className="flex flex-wrap gap-2 mt-4 text-xs font-bold">
                <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700">
                  {(data?.vagas_disponiveis ?? 0).toLocaleString('pt-BR')} livres
                </span>
                <span className="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700">
                  {(data?.vagas_ocupadas ?? 0).toLocaleString('pt-BR')} ocupadas
                </span>
              </div>
            </div>

            <div className="group bg-white p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 border border-slate-100 hover:border-amber-100 transition-all duration-300 hover:-translate-y-1 sm:col-span-2 md:col-span-1">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mt-1">Pendências</h3>
                <div className="w-12 h-12 bg-amber-50 text-amber-600 group-hover:bg-amber-100 rounded-2xl flex items-center justify-center transition-colors">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {pendencias?.total.toLocaleString('pt-BR') ?? '—'}
              </span>
              <div className="space-y-1.5 mt-4 text-[13px] font-medium text-slate-500">
                <p>{pendencias?.eventos_presenca_pendente ?? 0} eventos com presença pendente</p>
                <p>{pendencias?.pessoas_fila ?? 0} pessoas aguardando na fila</p>
                <p>{pendencias?.falhas_email ?? 0} falhas de envio de e-mail</p>
              </div>
              <Link to="/admin/agendamentos" className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 mt-4 hover:text-amber-800">
                Ver eventos <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 px-2 justify-end sm:justify-start">
        <Clock className="w-4 h-4 text-slate-300" />
        Sincronizado hoje às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </div>

      <section className="mt-10 pt-10 border-t border-slate-200/60">
        <Relatorios dashboardData={data} dashboardLoading={loading} embedded />
      </section>
    </div>
  );
}
