import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { ChevronRight, Calendar as CalendarIcon, Clock, Users, ArrowLeft, CheckCircle2, User } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api';

interface HorarioData {
  id: number;
  hora_inicio: string;
  hora_fim: string;
  vagas_disponiveis: number;
  vagas_livres: number;
  vagas_ocupadas: number;
  disponivel: boolean;
}

interface EventoData {
  id: number;
  titulo: string;
  tipo: string;
  descricao: string;
  nome_profissional: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  capacidade_por_horario: number;
  horarios: HorarioData[];
}

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [evento, setEvento] = useState<EventoData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [horarioSelecionado, setHorarioSelecionado] = useState<number | null>(null);
  const [reservando, setReservando] = useState(false);
  const [erroReserva, setErroReserva] = useState('');

  useEffect(() => {
    carregarEvento();
  }, [id, token]);

  async function carregarEvento() {
    setCarregando(true);
    try {
      const res = await fetch(`${API}/colaborador/eventos/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setEvento(await res.json());
    } catch {
      setErro('Erro ao carregar evento. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  async function handleReservar() {
    if (!horarioSelecionado || !evento) return;
    setReservando(true);
    setErroReserva('');
    try {
      const res = await fetch(
        `${API}/colaborador/eventos/${evento.id}/horarios/${horarioSelecionado}/reservar/`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? 'Erro ao reservar.');
      navigate('/colaborador/confirmacao', { state: { status: 'sucesso', evento } });
    } catch (err) {
      setErroReserva(err instanceof Error ? err.message : 'Erro ao reservar horário.');
    } finally {
      setReservando(false);
    }
  }

  if (carregando) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-slate-500 font-medium">Carregando evento...</p>
      </div>
    );
  }

  if (erro || !evento) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800 font-medium mb-4">{erro}</p>
          <Link to="/colaborador/eventos">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
              Voltar aos Eventos
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const tipoEmoji: Record<string, string> = {
    massagem: '💆', yoga: '🧘', meditacao: '🕉️',
    nutricao: '🥗', pilates: '🤸', acupuntura: '🪡',
  };
  const emoji = tipoEmoji[evento.tipo] ?? '✨';

  const dataFormatada = new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const horariosDisponiveis = evento.horarios.filter(h => h.disponivel);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500 mb-6">
        <CalendarIcon className="w-4 h-4 mr-2" />
        <span>{dataFormatada}</span>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-blue-600 font-medium">{evento.titulo}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        <div className="text-6xl">{emoji}</div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">{evento.titulo}</h1>
          {evento.descricao && <p className="text-slate-500">{evento.descricao}</p>}
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Data</p>
            <p className="text-sm font-semibold text-slate-900">{dataFormatada}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Período</p>
            <p className="text-sm font-semibold text-slate-900">
              {evento.hora_inicio.substring(0, 5)} às {evento.hora_fim.substring(0, 5)}
            </p>
          </div>
        </div>

        {evento.nome_profissional && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Profissional</p>
              <p className="text-sm font-semibold text-slate-900">{evento.nome_profissional}</p>
            </div>
          </div>
        )}
      </div>

      {/* Seleção de horário */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900">Escolha seu horário</h2>
          <span className="text-sm text-slate-500">
            <Users className="w-4 h-4 inline mr-1" />
            {horariosDisponiveis.length} horário{horariosDisponiveis.length !== 1 ? 's' : ''} disponível{horariosDisponiveis.length !== 1 ? 'is' : ''}
          </span>
        </div>

        {horariosDisponiveis.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">Todos os horários estão esgotados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {evento.horarios.map(h => {
              const selecionado = horarioSelecionado === h.id;
              return (
                <button
                  key={h.id}
                  disabled={!h.disponivel}
                  onClick={() => { setHorarioSelecionado(h.id); setErroReserva(''); }}
                  className={`relative rounded-xl border-2 p-3 text-center transition-all
                    ${!h.disponivel
                      ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                      : selecionado
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                    }`}
                >
                  {selecionado && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <p className={`text-sm font-bold ${selecionado ? 'text-blue-700' : 'text-slate-800'}`}>
                    {h.hora_inicio.substring(0, 5)}
                  </p>
                  <p className={`text-xs ${selecionado ? 'text-blue-500' : 'text-slate-400'}`}>
                    até {h.hora_fim.substring(0, 5)}
                  </p>
                  <p className={`text-xs mt-1 font-medium ${
                    h.disponivel
                      ? selecionado ? 'text-blue-600' : 'text-emerald-600'
                      : 'text-slate-400'
                  }`}>
                    {h.disponivel ? `${h.vagas_livres}/${h.vagas_disponiveis} vagas` : 'Lotado'}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Erro reserva */}
      {erroReserva && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-red-800 text-sm font-medium">{erroReserva}</p>
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-3">
        {horariosDisponiveis.length > 0 && (
          <button
            onClick={handleReservar}
            disabled={!horarioSelecionado || reservando}
            className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all
              bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {reservando ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Reservando...
              </>
            ) : (
              'Confirmar Agendamento'
            )}
          </button>
        )}

        <Link to="/colaborador/eventos" className={horariosDisponiveis.length === 0 ? 'flex-1' : ''}>
          <button className="w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Eventos
          </button>
        </Link>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">📌 Importante:</span> Chegue com 10 minutos de antecedência. Se precisar cancelar, avise com antecedência através do seu gestor.
        </p>
      </div>
    </div>
  );
}
