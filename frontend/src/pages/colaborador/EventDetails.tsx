import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { ChevronRight, Calendar as CalendarIcon, Clock, Users, ArrowLeft, CheckCircle2, User, ClockIcon } from 'lucide-react';
import { parseFetchError } from '../../services/api';

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

interface ListaEsperaInfo {
  horario_id: number;
  posicao: number;
  total_na_fila: number;
  status: string;
}

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [evento, setEvento] = useState<EventoData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [horarioSelecionado, setHorarioSelecionado] = useState<number | null>(null);
  const [reservando, setReservando] = useState(false);
  const [erroReserva, setErroReserva] = useState('');
  const [agendado, setAgendado] = useState(false);
  const [agendamentoExistente, setAgendamentoExistente] = useState<{ horario: { hora_inicio: string; hora_fim: string } } | null>(null);
  const [alterando, setAlterando] = useState(false);

  // Lista de espera
  const [listaEsperaMap, setListaEsperaMap] = useState<Record<number, ListaEsperaInfo>>({});
  const [entrandoFila, setEntrandoFila] = useState<number | null>(null); // horario_id sendo processado

  useEffect(() => {
    carregarEvento();
  }, [id, token]);

  async function carregarEvento() {
    setCarregando(true);
    setAgendado(false);
    setAlterando(false);
    try {
      const [resEvento, resAg, resLista] = await Promise.all([
        fetch(`${API}/colaborador/eventos/${id}/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/colaborador/agendamentos/?evento_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/colaborador/lista-espera/?evento_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!resEvento.ok) throw new Error();
      setEvento(await resEvento.json());
      const ags = resAg.ok ? await resAg.json() : [];
      setAgendamentoExistente(ags.length > 0 ? ags[0] : null);
      const lista: ListaEsperaInfo[] = resLista.ok ? await resLista.json() : [];
      const mapa: Record<number, ListaEsperaInfo> = {};
      lista.forEach(e => { mapa[e.horario_id] = e; });
      setListaEsperaMap(mapa);
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
          body: JSON.stringify({ alterar: alterando }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? 'Erro ao reservar.');
      setAgendado(true);
      carregarEvento();
    } catch (err) {
      setErroReserva(parseFetchError(err, 'Não foi possível reservar o horário. Tente novamente.'));
    } finally {
      setReservando(false);
    }
  }

  async function handleEntrarFila(horarioId: number) {
    setEntrandoFila(horarioId);
    try {
      const res = await fetch(
        `${API}/colaborador/horarios/${horarioId}/lista-espera/`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? 'Erro ao entrar na fila.');
      setListaEsperaMap(prev => ({
        ...prev,
        [horarioId]: {
          horario_id: horarioId,
          posicao: data.posicao,
          total_na_fila: data.total_na_fila,
          status: data.status,
        },
      }));
    } catch (err) {
      setErroReserva(parseFetchError(err, 'Não foi possível entrar na lista de espera.'));
    } finally {
      setEntrandoFila(null);
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {evento.horarios.map(h => {
            const selecionado = horarioSelecionado === h.id;
            const filaInfo = listaEsperaMap[h.id];
            const naFila = !!filaInfo;
            const carregandoFila = entrandoFila === h.id;

            if (!h.disponivel) {
              // Horário lotado — mostra botão de lista de espera
              return (
                <div
                  key={h.id}
                  className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3 text-center flex flex-col gap-1.5"
                >
                  <p className="text-sm font-bold text-slate-400">{h.hora_inicio.substring(0, 5)}</p>
                  <p className="text-xs text-slate-300">até {h.hora_fim.substring(0, 5)}</p>
                  <p className="text-xs font-medium text-slate-400">Lotado</p>

                  {naFila ? (
                    <div className="mt-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                      <p className="text-[10px] font-semibold text-amber-700 flex items-center justify-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        Na fila
                      </p>
                      <p className="text-[10px] text-amber-600">
                        {filaInfo.posicao}º de {filaInfo.total_na_fila}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEntrarFila(h.id)}
                      disabled={carregandoFila}
                      className="mt-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 underline disabled:opacity-50 leading-tight"
                    >
                      {carregandoFila ? 'Entrando...' : 'Entrar na fila'}
                    </button>
                  )}
                </div>
              );
            }

            return (
              <button
                key={h.id}
                onClick={() => { setHorarioSelecionado(h.id); setErroReserva(''); }}
                className={`relative rounded-xl border-2 p-3 text-center transition-all
                  ${selecionado
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
                <p className={`text-xs mt-1 font-medium ${selecionado ? 'text-blue-600' : 'text-emerald-600'}`}>
                  {h.vagas_livres}/{h.vagas_disponiveis} vagas
                </p>
              </button>
            );
          })}
        </div>

        {/* Aviso sobre lista de espera */}
        {Object.keys(listaEsperaMap).length > 0 && (
          <p className="mt-4 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Você está na lista de espera de {Object.keys(listaEsperaMap).length} horário{Object.keys(listaEsperaMap).length > 1 ? 's' : ''}.
            Há outras pessoas na fila — você será notificado por e-mail se uma vaga abrir.
          </p>
        )}
      </div>

      {/* Já tem agendamento */}
      {agendamentoExistente && !alterando && !agendado && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-emerald-800 font-semibold text-sm">Você já tem um horário reservado neste evento</p>
          </div>
          <p className="text-emerald-700 text-sm mb-4">
            Horário: <strong>{agendamentoExistente.horario.hora_inicio.substring(0, 5)} às {agendamentoExistente.horario.hora_fim.substring(0, 5)}</strong>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setAlterando(true)}
              className="flex-1 h-10 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-xl text-sm font-semibold transition-colors"
            >
              Alterar Horário
            </button>
            <Link to="/colaborador/agendamentos" className="flex-1">
              <button className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors">
                Ver Meus Agendamentos
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Sucesso após nova reserva */}
      {agendado && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-emerald-800 text-sm font-semibold">Agendamento confirmado!</p>
          </div>
          <Link to="/colaborador/agendamentos" className="text-sm text-emerald-700 underline font-medium whitespace-nowrap">
            Ver agendamentos
          </Link>
        </div>
      )}

      {/* Erro reserva */}
      {erroReserva && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-red-800 text-sm font-medium">{erroReserva}</p>
        </div>
      )}

      {/* Ações */}
      {(!agendamentoExistente || alterando) && !agendado && (
        <div className="flex flex-col sm:flex-row gap-3">
          {alterando && (
            <button
              onClick={() => setAlterando(false)}
              className="h-12 px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold text-sm transition-colors"
            >
              Cancelar alteração
            </button>
          )}
          {horariosDisponiveis.length > 0 && (
            <button
              onClick={handleReservar}
              disabled={!horarioSelecionado || reservando}
              className="flex-1 h-12 px-6 rounded-xl font-semibold text-white transition-all
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
              ) : alterando ? 'Confirmar Novo Horário' : 'Confirmar Agendamento'}
            </button>
          )}
          {!alterando && (
            <Link to="/colaborador/eventos" className="flex-1">
              <button className="w-full h-12 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar aos Eventos
              </button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
