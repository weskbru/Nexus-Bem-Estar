import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Relatorios from './Relatorios';
import {
  Plus,
  Calendar,
  Users,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

interface DashboardData {
  total_vagas: number;
  vagas_ocupadas: number;
  taxa_ocupacao: number;
}

function StatSkeleton() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-24 bg-slate-200 rounded" />
        <div className="w-8 h-8 bg-slate-200 rounded-lg" />
      </div>
      <div className="h-8 w-20 bg-slate-200 rounded mb-1" />
      <div className="h-2 w-28 bg-slate-200 rounded" />
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
      setErro('Não foi possível carregar os dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

const taxa = data?.taxa_ocupacao ?? 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visão Geral de Bem-Estar</h1>
          <p className="text-slate-500">Monitoramento em tempo real de ocupação e agendas.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/admin/eventos/novo">
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4 mr-2" />
              Criar novo evento
            </button>
          </Link>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
          <span>{erro}</span>
          <button
            onClick={fetchDashboard}
            className="ml-4 text-red-600 underline font-medium hover:text-red-800"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-500 font-medium text-sm">Total de Vagas</h3>
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {data?.total_vagas.toLocaleString('pt-BR') ?? '—'}
                </span>
                <span className="text-sm font-medium text-emerald-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +5%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">vs. mês anterior</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-500 font-medium text-sm">Vagas Ocupadas</h3>
                <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {data?.vagas_ocupadas.toLocaleString('pt-BR') ?? '—'}
                </span>
                <span className="text-sm font-medium text-emerald-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">vs. mês anterior</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sm:col-span-2 md:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-500 font-medium text-sm">Taxa de Ocupação</h3>
                <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-slate-900">{taxa}%</span>
                <span className="text-sm font-medium text-emerald-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +8%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${taxa}%` }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer info */}
      <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
        <div>Última atualização: hoje às 12:45</div>
      </div>

      {/* Relatórios integrados ao Dashboard */}
      <section className="mt-10 pt-8 border-t border-slate-200">
        <Relatorios />
      </section>
    </div>
  );
}
