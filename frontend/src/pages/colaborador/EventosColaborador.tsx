import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users } from 'lucide-react';
import { parseFetchError } from '../../services/api';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api';

interface Evento {
  id: number;
  titulo: string;
  tipo: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  nome_profissional?: string;
  vagas_disponiveis?: number;
  total_vagas?: number;
}

const tipoEmoji: Record<string, string> = {
  massagem: '💆', yoga: '🧘', meditacao: '🕉️',
  nutricao: '🥗', pilates: '🤸', acupuntura: '🪡',
};

export default function EventosColaborador() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    fetch(`${API}/colaborador/eventos/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setEventos)
      .catch(err => setErro(parseFetchError(err, 'Não foi possível carregar os eventos. Tente novamente.')))
      .finally(() => setCarregando(false));
  }, [token]);

  if (carregando) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-slate-500">Carregando eventos...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Eventos Disponíveis</h1>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-800 text-sm font-medium">{erro}</p>
        </div>
      )}

      {!erro && eventos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nenhum evento disponível no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {eventos.map(ev => {
            const dataFormatada = new Date(ev.data + 'T00:00:00').toLocaleDateString('pt-BR', {
              weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            });
            return (
              <div
                key={ev.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
              >
                {/* Cabeçalho colorido */}
                <div className="bg-blue-600 px-5 py-4 flex items-center gap-3">
                  <span className="text-3xl">{tipoEmoji[ev.tipo] ?? '✨'}</span>
                  <h2 className="text-white font-bold text-base leading-tight">{ev.titulo}</h2>
                </div>

                {/* Detalhes */}
                <div className="px-5 py-4 space-y-3 flex-1">
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <span className="capitalize">{dataFormatada}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{ev.hora_inicio.substring(0, 5)} às {ev.hora_fim.substring(0, 5)}</span>
                  </div>
                  {ev.vagas_disponiveis !== undefined && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>{ev.vagas_disponiveis} vagas disponíveis</span>
                    </div>
                  )}
                </div>

                {/* Botão */}
                <div className="px-5 pb-5">
                  <button
                    onClick={() => navigate(`/colaborador/eventos/${ev.id}`)}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
                  >
                    Agendar Horário
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
