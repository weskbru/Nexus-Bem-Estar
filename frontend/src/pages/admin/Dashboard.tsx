import { Link } from 'react-router-dom';
import { Download, Plus, Calendar, Users, TrendingUp, MoreVertical, BarChart3 } from 'lucide-react';

const recentBookings = [
  { id: 1, name: 'Ana Martins', initials: 'AM', service: 'Consulta Nutricional', datetime: '24 Mai 2024, 09:00', status: 'Confirmado', statusColor: 'bg-emerald-100 text-emerald-700' },
  { id: 2, name: 'Ricardo Souza', initials: 'RS', service: 'Yoga em Grupo', datetime: '24 Mai 2024, 10:30', status: 'Pendente', statusColor: 'bg-amber-100 text-amber-700' },
  { id: 3, name: 'Luiza Pereira', initials: 'LP', service: 'Massoterapia', datetime: '24 Mai 2024, 14:00', status: 'Confirmado', statusColor: 'bg-emerald-100 text-emerald-700' },
  { id: 4, name: 'João Castro', initials: 'JC', service: 'Treinamento Funcional', datetime: '25 Mai 2024, 08:00', status: 'Agendado', statusColor: 'bg-slate-100 text-slate-700' },
];

export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visão Geral de Bem-Estar</h1>
          <p className="text-slate-500">Monitoramento em tempo real de ocupação e agendas.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
            <Download className="w-4 h-4 mr-2" />
            Exportar lista (CSV)
          </button>
          <Link to="/admin/eventos/novo">
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Criar novo evento
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium text-sm">Total de Vagas</h3>
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">1.250</span>
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
            <span className="text-3xl font-bold text-slate-900">875</span>
            <span className="text-sm font-medium text-emerald-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">vs. mês anterior</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium text-sm">Taxa de Ocupação</h3>
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold text-slate-900">70%</span>
            <span className="text-sm font-medium text-emerald-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +8%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '70%' }}></div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Agendamentos Recentes</h2>
          <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700">Ver todos</a>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Paciente/Colaborador</th>
                <th className="px-6 py-3 font-semibold">Serviço / Evento</th>
                <th className="px-6 py-3 font-semibold">Data e Hora</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs mr-3">
                        {booking.initials}
                      </div>
                      <span className="font-medium text-slate-900">{booking.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{booking.service}</td>
                  <td className="px-6 py-4 text-slate-600">{booking.datetime}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${booking.statusColor}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-slate-600">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            32 Profissionais Online
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            Sistema Operacional
          </div>
        </div>
        <div>
          Última atualização: hoje às 12:45
        </div>
      </div>
    </div>
  );
}
