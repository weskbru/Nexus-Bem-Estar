import { Link } from 'react-router-dom';
import { Calendar, Clock } from 'lucide-react';

const events = [
  {
    id: 1,
    title: 'Massagem – Março 2026',
    date: '15 de Março, 2026',
    time: '09:00 - 17:00',
    image: 'https://picsum.photos/seed/massage/600/400',
    status: 'available',
    type: 'Massagem',
  },
  {
    id: 2,
    title: 'Aula de Yoga – Março 2026',
    date: '18 de Março, 2026',
    time: '07:30 - 08:30',
    image: 'https://picsum.photos/seed/yoga/600/400',
    status: 'available',
    type: 'Yoga',
  },
  {
    id: 3,
    title: 'Meditação Guiada – Março 2026',
    date: '20 de Março, 2026',
    time: '18:00 - 19:00',
    image: 'https://picsum.photos/seed/meditation/600/400',
    status: 'available',
    type: 'Meditação',
  },
  {
    id: 4,
    title: 'Nutrição Saudável – Abril 2026',
    date: '05 de Abril, 2026',
    time: '14:00 - 16:00',
    image: 'https://picsum.photos/seed/nutrition/600/400',
    status: 'available',
    type: 'Nutrição',
  },
  {
    id: 5,
    title: 'Pilates em Grupo – Abril 2026',
    date: '10 de Abril, 2026',
    time: '10:00 - 11:30',
    image: 'https://picsum.photos/seed/pilates/600/400',
    status: 'sold_out',
    type: 'Pilates',
  },
  {
    id: 6,
    title: 'Acupuntura – Abril 2026',
    date: '12 de Abril, 2026',
    time: '09:00 - 18:00',
    image: 'https://picsum.photos/seed/acupuncture/600/400',
    status: 'available',
    type: 'Acupuntura',
  },
];

export default function Eventos() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Eventos de Bem-Estar</h1>
        <p className="text-slate-500 max-w-2xl">
          Escolha uma atividade relaxante para revitalizar seu dia. Reserve seu horário
          com antecedência para garantir sua vaga.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium whitespace-nowrap">
          Todos
        </button>
        <button className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-full text-sm font-medium whitespace-nowrap">
          Massagem
        </button>
        <button className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-full text-sm font-medium whitespace-nowrap">
          Yoga
        </button>
        <button className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-full text-sm font-medium whitespace-nowrap">
          Meditação
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="h-48 relative bg-slate-100">
              <img
                src={event.image}
                alt={event.title}
                className={`w-full h-full object-cover ${event.status === 'sold_out' ? 'grayscale opacity-80' : ''}`}
                referrerPolicy="no-referrer"
              />
              {event.status === 'available' && event.id === 1 && (
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-emerald-700">
                  DISPONÍVEL
                </div>
              )}
              {event.status === 'sold_out' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
                  <span className="text-white font-bold tracking-wider text-sm">ESGOTADO</span>
                </div>
              )}
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-slate-900 mb-4">{event.title}</h3>
              
              <div className="space-y-2 mb-6 flex-1">
                <div className="flex items-center text-sm text-slate-500">
                  <Calendar className="w-4 h-4 mr-2" />
                  {event.date}
                </div>
                <div className="flex items-center text-sm text-slate-500">
                  <Clock className="w-4 h-4 mr-2" />
                  {event.time}
                </div>
              </div>
              
              {event.status === 'available' ? (
                <Link to={`/colaborador/eventos/${event.id}`} className="block w-full">
                  <button className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                    Agendar
                  </button>
                </Link>
              ) : (
                <button disabled className="w-full py-2.5 px-4 bg-slate-200 text-slate-500 rounded-lg text-sm font-medium cursor-not-allowed">
                  Indisponível
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
