import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Relatorios from './Relatorios';
import type { DashboardDTO } from '../../services/api';
import {
  Plus,
  Calendar,
  Users,
  TrendingUp,
  BarChart3,
  RefreshCw,
  AlertCircle,
  Clock
} from 'lucide-react';

function StatSkeleton() {
  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-3 w-24 bg-slate-200 rounded-full" />
        <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
      </div>
      <div className="flex items-end gap-3 mb-2">
        <div className="h-10 w-20 bg-slate-200 rounded-lg" />
        <div className="h-6 w-12 bg-slate-100 rounded-md" />
      </div>
      <div className="h-3 w-32 bg-slate-100 rounded-full mt-3" />
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api';

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

  const taxa = data?.taxa_ocupacao ?? 0;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Visão Geral</h1>
          <p className="text-slate-500 font-medium mt-1.5 text-sm sm:text-base">
            Monitoramento em tempo real de ocupação e engajamento.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/admin/eventos/novo" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto flex items-center justify-center px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm hover:shadow-md hover:shadow-blue-500/20 transition-all active:scale-[0.98] outline-none">
              <Plus className="w-5 h-5 mr-2" />
              Criar Novo Evento
            </button>
          </Link>
        </div>
      </div>

      {/* Alerta de Erro */}
      {erro && (
        <div className="mb-8 px-5 py-4 bg-red-50 border border-red-100 text-red-800 rounded-2xl text-sm font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
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

      {/* Grid de Métricas (Stats Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8 mb-6">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            {/* Card 1: Total de Vagas */}
            <div className="group bg-white p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 border border-slate-100 hover:border-blue-100 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mt-1">Total de Vagas</h3>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center transition-colors">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {data?.total_vagas.toLocaleString('pt-BR') ?? '—'}
                </span>
                <span className="text-xs font-bold text-emerald-700 flex items-center bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  +5%
                </span>
              </div>
              <p className="text-[13px] font-medium text-slate-400 mt-3">em relação ao mês anterior</p>
            </div>

            {/* Card 2: Vagas Ocupadas */}
            <div className="group bg-white p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 border border-slate-100 hover:border-indigo-100 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mt-1">Vagas Ocupadas</h3>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 rounded-2xl flex items-center justify-center transition-colors">
                  <Users className="w-6 h-6" />
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {data?.vagas_ocupadas.toLocaleString('pt-BR') ?? '—'}
                </span>
                <span className="text-xs font-bold text-emerald-700 flex items-center bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  +12%
                </span>
              </div>
              <p className="text-[13px] font-medium text-slate-400 mt-3">em relação ao mês anterior</p>
            </div>

            {/* Card 3: Taxa de Ocupação */}
            <div className="group bg-white p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 border border-slate-100 hover:border-emerald-100 transition-all duration-300 hover:-translate-y-1 sm:col-span-2 md:col-span-1">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mt-1">Taxa de Ocupação</h3>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 rounded-2xl flex items-center justify-center transition-colors">
                  <BarChart3 className="w-6 h-6" />
                </div>
              </div>
              <div className="flex items-baseline gap-3 mb-5">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{taxa}%</span>
                <span className="text-xs font-bold text-emerald-700 flex items-center bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  +8%
                </span>
              </div>
              
              {/* Barra de Progresso com Design Premium */}
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${taxa}%` }}
                >
                  {/* Brilho interno para dar volume (glass effect) */}
                  <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-b from-white/30 to-transparent"></div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Timestamp de Atualização */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 px-2 justify-end sm:justify-start">
        <Clock className="w-4 h-4 text-slate-300" />
        Sincronizado hoje às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </div>

      {/* Seção de Relatórios */}
      <section className="mt-10 pt-10 border-t border-slate-200/60">
        <Relatorios
          dashboardData={data}
          dashboardLoading={loading}
          embedded
        />
      </section>
    </div>
  );
}
