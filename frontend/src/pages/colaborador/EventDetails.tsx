import { Link } from 'react-router-dom';
import { ChevronRight, Calendar as CalendarIcon, Clock, Users, ArrowLeft } from 'lucide-react';

const timeSlots = [
  { time: '09:00 - 09:30', capacity: '1 / 1', status: 'available' },
  { time: '09:30 - 10:00', capacity: '0 / 1', status: 'sold_out' },
  { time: '10:00 - 10:30', capacity: '1 / 1', status: 'available' },
  { time: '10:30 - 11:00', capacity: '0 / 1', status: 'sold_out' },
  { time: '11:00 - 11:30', capacity: '1 / 1', status: 'available' },
];

export default function EventDetails() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500 mb-6">
        <CalendarIcon className="w-4 h-4 mr-2" />
        <span>Março 2026</span>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-blue-600 font-medium">Massagem</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Massagem – Março 2026</h1>
          <p className="text-slate-500">
            Selecione um dos horários disponíveis abaixo para confirmar sua reserva.
          </p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium shadow-sm">
            Lista
          </button>
          <button className="px-4 py-2 text-slate-600 hover:text-slate-900 rounded-md text-sm font-medium">
            Calendário
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
          <div className="flex items-center"><Clock className="w-4 h-4 mr-2"/> Horário</div>
          <div className="flex items-center"><Users className="w-4 h-4 mr-2"/> Vagas</div>
          <div>Status</div>
          <div className="text-right">Ação</div>
        </div>
        
        <div className="divide-y divide-slate-100">
          {timeSlots.map((slot, index) => (
            <div key={index} className="grid grid-cols-4 gap-4 p-4 items-center text-sm">
              <div className="text-slate-900 font-medium">{slot.time}</div>
              <div className="text-slate-500">{slot.capacity}</div>
              <div>
                {slot.status === 'available' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    Disponível
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    Esgotado
                  </span>
                )}
              </div>
              <div className="text-right">
                {slot.status === 'available' ? (
                  <Link to="/colaborador/confirmacao">
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                      Reservar
                    </button>
                  </Link>
                ) : (
                  <button disabled className="px-4 py-2 bg-slate-200 text-slate-500 rounded-lg font-medium cursor-not-allowed">
                    Indisponível
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center">
        <Link to="/colaborador/eventos">
          <button className="flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Calendário
          </button>
        </Link>
        
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            Disponível
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
            Indisponível
          </div>
        </div>
      </div>
    </div>
  );
}
