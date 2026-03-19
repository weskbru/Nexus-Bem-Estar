import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Relatorios from './Relatorios';
import {
  Plus,
  Calendar,
  Users,
  TrendingUp,
  BarChart3,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface DashboardData {
  total_vagas: number;
  vagas_ocupadas: number;
  taxa_ocupacao: number;
}

function StatSkeleton() {
  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-4 w-28 bg-slate-200 rounded-md" />
        <div className="w-10 h-10 bg-slate-100 rounded-xl" />
      </div>
      <div className="h-10 w-24 bg-slate-200 rounded-lg mb-3" />
      <div className="h-3 w-32 bg-slate-100 rounded-md" />
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

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

      const json: DashboardData = await res.json();
      setData(json);
    } catch (err) {
      console.error('[Dashboard] Erro ao carregar dados:', err);
      setErro('Não foi possível carregar as métricas no momento.');
    } finally {
      setLoading(false);
    }
  }

  const taxa = data?.taxa_ocupacao ?? 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Visão Geral</h1>
          <p className="text-slate-500 font-medium mt-1.5">
            Monitoramento em tempo real de ocupação e agendas da equipe.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/eventos/novo" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto flex items-center justify-center px-5 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-sm hover:shadow-md outline-none">
              <Plus className="w-4 h-4 mr-2" />
              Criar Novo Evento
            </button>
          </Link>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="mb-8 px-5 py-4 bg-red-50/50 border border-red-200 text-red-800 rounded-2xl text-sm font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{erro}</span>
          </div>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8 mb-8">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            {/* Card 1: Total de Vagas */}
            <div className="group bg-white p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-lg border border-slate-100 hover:border-slate-200 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Total de Vagas</h3>
                <div className="w-10 h-10 bg-slate-50 text-slate-600 group-hover:bg-slate-100 rounded-xl flex items-center justify-center transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {data?.total_vagas.toLocaleString('pt-BR') ?? '—'}
                </span>
                <span className="text-sm font-bold text-emerald-600 flex items-center bg-emerald-50 px-2 py-0.5 rounded-md">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  +5%
                </span>
              </div>
              <p className="text-[13px] font-medium text-slate-400 mt-2">em relação ao mês anterior</p>
            </div>

            {/* Card 2: Vagas Ocupadas */}
            <div className="group bg-white p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-lg border border-slate-100 hover:border-slate-200 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Vagas Ocupadas</h3>
                <div className="w-10 h-10 bg-teal-50 text-teal-600 group-hover:bg-teal-100 rounded-xl flex items-center justify-center transition-colors">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {data?.vagas_ocupadas.toLocaleString('pt-BR') ?? '—'}
                </span>
                <span className="text-sm font-bold text-emerald-600 flex items-center bg-emerald-50 px-2 py-0.5 rounded-md">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  +12%
                </span>
              </div>
              <p className="text-[13px] font-medium text-slate-400 mt-2">em relação ao mês anterior</p>
            </div>

            {/* Card 3: Taxa de Ocupação */}
            <div className="group bg-white p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-lg border border-slate-100 hover:border-slate-200 transition-all duration-300 hover:-translate-y-1 sm:col-span-2 md:col-span-1">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Taxa de Ocupação</h3>
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center transition-colors">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{taxa}%</span>
                <span className="text-sm font-bold text-emerald-600 flex items-center bg-emerald-50 px-2 py-0.5 rounded-md">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  +8%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${taxa}%` }}
                >
                  {/* Pequeno reflexo na barra para dar um acabamento premium */}
                  <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-r from-transparent to-white/20"></div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center gap-2 text-[13px] font-medium text-slate-400 px-2">
        <RefreshCw className="w-3.5 h-3.5" />
        Última atualização: hoje às 12:45
      </div>

      {/* Relatórios integrados ao Dashboard */}
      <section className="mt-12 pt-10 border-t border-slate-200/60">
        <Relatorios />
      </section>
    </div>
  );
}