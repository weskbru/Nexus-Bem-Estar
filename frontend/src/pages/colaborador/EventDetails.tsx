import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState, type ReactNode } from 'react';
import { ChevronRight, Calendar as CalendarIcon, Clock, Users, CheckCircle2, User, RefreshCw, AlertCircle, Info, Ticket } from 'lucide-react';
import { parseFetchError } from '../../services/api';
import ModalDetalhesAgendamento, { type AgendamentoDetalhes } from '../../components/ModalDetalhesAgendamento';

const API = import.meta.env.VITE_API_URL ?? '/api';

interface HorarioData {
  id: number;
  hora_inicio: string;
  hora_fim: string;
  vagas_disponiveis: number;
  vagas_livres: number;
  vagas_ocupadas: number;
  disponivel: boolean;
  reservado_para_fila: boolean;
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
  const [modalAgendamento, setModalAgendamento] = useState<AgendamentoDetalhes | null>(null);
  const [modoModal, setModoModal] = useState<'detalhes' | 'confirmacao' | 'sucesso'>('detalhes');
  const [reservando, setReservando] = useState(false);
  const [erroReserva, setErroReserva] = useState('');
  const [erroPenalidade, setErroPenalidade] = useState('');
  const [agendamentoExistente, setAgendamentoExistente] = useState<AgendamentoDetalhes | null>(null);
  const [alterando, setAlterando] = useState(false);

  // Lista de espera
  const [listaEsperaMap, setListaEsperaMap] = useState<Record<number, ListaEsperaInfo>>({});
  const [entrandoFila, setEntrandoFila] = useState<number | null>(null);
  const [saiindoFila, setSaiindoFila] = useState<number | null>(null);

  useEffect(() => {
    carregarEvento();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  // Polling leve
  useEffect(() => {
    const interval = setInterval(() => {
      if (!reservando && !agendamentoExistente && !alterando) atualizarDisponibilidade();
    }, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, reservando, agendamentoExistente, alterando]);

  async function atualizarDisponibilidade() {
    try {
      const res = await fetch(`${API}/colaborador/eventos/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data: EventoData = await res.json();
      setEvento(prev => prev ? { ...prev, horarios: data.horarios } : prev);
    } catch {
      // silencioso
    }
  }

  async function carregarEvento() {
    setCarregando(true);
    setAlterando(false);
    try {
      const [resEvento, resAg, resLista] = await Promise.all([
        fetch(`${API}/colaborador/eventos/${id}/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/colaborador/agendamentos/?evento_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/colaborador/lista-espera/?evento_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      if (!resEvento.ok) throw new Error('Falha ao carregar dados do evento.');
      const eventoData: EventoData = await resEvento.json();
      setEvento(eventoData);
      
      const ags: AgendamentoDetalhes[] = resAg.ok ? await resAg.json() : [];
      const agendamentoAtual = ags.length > 0 ? ags[0] : null;
      setAgendamentoExistente(agendamentoAtual);
      
      if (agendamentoAtual) {
        const horarioAtual = eventoData.horarios.find((h) => (
          h.hora_inicio === agendamentoAtual.horario.hora_inicio && 
          h.hora_fim === agendamentoAtual.horario.hora_fim
        ));
        setHorarioSelecionado(horarioAtual?.id ?? null);
      } else {
        setHorarioSelecionado(null);
      }
      
      const lista: ListaEsperaInfo[] = resLista.ok ? await resLista.json() : [];
      const mapa: Record<number, ListaEsperaInfo> = {};
      lista.forEach(e => { mapa[e.horario_id] = e; });
      setListaEsperaMap(mapa);
    } catch {
      setErro('Erro ao carregar os detalhes do evento. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  async function handleReservar(otp: string) {
    if (!horarioSelecionado || !evento) return;
    setReservando(true);
    setErroReserva('');
    try {
      const res = await fetch(
        `${API}/colaborador/eventos/${evento.id}/horarios/${horarioSelecionado}/reservar/`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ alterar: alterando, otp }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.penalidade) {
          setModalAgendamento(null);
          setModoModal('detalhes');
          setErroPenalidade(data.erro);
          return;
        }
        if (data.na_fila) {
          setModalAgendamento(null);
          setModoModal('detalhes');
          setErroReserva(data.erro);
          await carregarEvento();
          return;
        }
        throw new Error(data.erro ?? 'Erro ao reservar.');
      }
      setModoModal('sucesso');
      await carregarEvento();
      setTimeout(() => {
        setModalAgendamento(null);
        setModoModal('detalhes');
      }, 3000);
    } catch (err) {
      setErroReserva(parseFetchError(err, 'Não foi possível reservar o horário. Tente novamente.'));
    } finally {
      setReservando(false);
    }
  }

  async function handleSairFila(e: React.MouseEvent, horarioId: number) {
    e.stopPropagation();
    setSaiindoFila(horarioId);
    try {
      const res = await fetch(
        `${API}/colaborador/horarios/${horarioId}/lista-espera/`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? 'Erro ao sair da fila.');
      setListaEsperaMap(prev => {
        const novo = { ...prev };
        delete novo[horarioId];
        return novo;
      });
    } catch (err) {
      setErroReserva(parseFetchError(err, 'Não foi possível sair da fila de espera.'));
    } finally {
      setSaiindoFila(null);
    }
  }

  async function handleEntrarFila(e: React.MouseEvent, horarioId: number) {
    e.stopPropagation(); // Evita acionar o clique do card principal
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
      // Substitui todo o mapa: apenas uma fila ativa por evento
      setListaEsperaMap({
        [horarioId]: {
          horario_id: horarioId,
          posicao: data.posicao,
          total_na_fila: data.total_na_fila,
          status: data.status,
        },
      });
    } catch (err) {
      setErroReserva(parseFetchError(err, 'Não foi possível entrar na lista de espera.'));
    } finally {
      setEntrandoFila(null);
    }
  }

  // ── Renderização Condicional: Carregando e Erro ────────────────────────
  if (carregando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <RefreshCw className="animate-spin h-10 w-10 text-blue-600 mb-4" />
        <p className="text-slate-500 font-bold tracking-wide">Buscando horários disponíveis...</p>
      </div>
    );
  }

  if (erro || !evento) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Ops, algo deu errado</h2>
          <p className="text-slate-500 font-medium mb-8">{erro}</p>
          <Link to="/login">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm">
              Voltar ao Início
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Variáveis Auxiliares ───────────────────────────────────────────────
  const dataFormatada = new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  
  const horariosDisponiveis = evento.horarios.filter(h => h.disponivel);
  const qtdHorariosDisponiveis = horariosDisponiveis.length;

  // Usuário está na fila de espera ativa (aguardando ou notificado) em qualquer slot deste evento
  const naFilaAtiva = Object.values(listaEsperaMap).some(
    e => e.status === 'aguardando' || e.status === 'notificado'
  );

  function abrirModalDetalhes(ag: AgendamentoDetalhes) {
    setModalAgendamento(ag);
    setModoModal('detalhes');
  }

  function handleSelecionarHorario(h: HorarioData) {
    if (!evento) return;
    
    const existeAgendamento = Boolean(agendamentoExistente);
    const podeSelecionar = h.disponivel && (!existeAgendamento || alterando);
    
    if (!podeSelecionar) return;
    
    setHorarioSelecionado(h.id);
    setModalAgendamento({
      id: 0,
      status: 'pendente',
      evento_id: evento.id,
      evento_titulo: evento.titulo,
      evento_data: evento.data,
      nome_profissional: evento.nome_profissional,
      horario: { hora_inicio: h.hora_inicio, hora_fim: h.hora_fim },
      criado_em: new Date().toISOString(),
    });
    setModoModal('confirmacao');
    setErroReserva('');
  }

  function renderAcaoHorarioLotado(
    h: HorarioData,
    filaInfo: ListaEsperaInfo | undefined,
    carregandoFila: boolean,
    existeAgendamento: boolean,
    bloqueadoPorFila = false,
  ): ReactNode {
    // Usuário já está nesta fila — mostra posição + botão sair
    if (filaInfo) {
      return (
        <div className="flex flex-col gap-1.5 items-center w-full">
          <div className="bg-amber-100/80 text-amber-800 rounded-lg py-1.5 px-2 flex flex-col items-center w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider">Na fila</span>
            <span className="text-xs font-semibold">{filaInfo.posicao}º lugar</span>
          </div>
          <button
            onClick={(e) => handleSairFila(e, h.id)}
            disabled={saiindoFila === h.id}
            className="w-full bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700 text-red-400 text-[10px] font-bold py-1 rounded-lg transition-colors disabled:opacity-50"
          >
            {saiindoFila === h.id ? 'Saindo...' : 'Sair da fila'}
          </button>
        </div>
      );
    }

    // Slot reservado para confirmação de outro usuário — não permite entrar
    if (bloqueadoPorFila) {
      return <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Aguardando confirmação</span>;
    }

    if (!existeAgendamento) {
      const migrando = naFilaAtiva;
      return (
        <button
          onClick={(e) => handleEntrarFila(e, h.id)}
          disabled={carregandoFila}
          className={`w-full bg-white border text-xs font-bold py-1.5 rounded-lg transition-colors disabled:opacity-50
            ${migrando
              ? 'border-amber-200 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 text-amber-600'
              : 'border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-500'
            }`}
        >
          {carregandoFila
            ? (migrando ? 'Migrando...' : 'Entrando...')
            : (migrando ? 'Migrar para esta fila' : 'Entrar na fila')}
        </button>
      );
    }

    return <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Esgotado</span>;
  }

  function renderCardHorarioLotado(
    h: HorarioData,
    selecionado: boolean,
    existeAgendamento: boolean,
    filaInfo: ListaEsperaInfo | undefined,
    carregandoFila: boolean,
    bloqueadoPorFila = false,
  ): ReactNode {
    const isMeuHorarioAtual = selecionado && existeAgendamento && !alterando;

    return (
      <div key={h.id} className={`relative flex flex-col justify-center rounded-2xl border-2 p-4 text-center transition-all h-full
        ${isMeuHorarioAtual ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/80 opacity-80'}`}>

        {isMeuHorarioAtual && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-sm">
            Seu Horário
          </div>
        )}
        {bloqueadoPorFila && !isMeuHorarioAtual && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-sm">
            Reservado — fila
          </div>
        )}

        <p className={`text-base font-extrabold tracking-tight ${isMeuHorarioAtual ? 'text-emerald-800' : 'text-slate-400'}`}>
          {h.hora_inicio.substring(0, 5)}
        </p>
        <p className={`text-xs font-medium mb-3 ${isMeuHorarioAtual ? 'text-emerald-600' : 'text-slate-400'}`}>
          até {h.hora_fim.substring(0, 5)}
        </p>

        {!isMeuHorarioAtual && (
          <div className="mt-auto pt-2 border-t border-slate-200">
            {renderAcaoHorarioLotado(h, filaInfo, carregandoFila, existeAgendamento, bloqueadoPorFila)}
          </div>
        )}
      </div>
    );
  }

  function renderCardHorarioDisponivel(h: HorarioData, selecionado: boolean, selecaoBloqueada: boolean): ReactNode {
    const cardStateClass = (() => {
      if (selecionado) return 'border-blue-600 bg-blue-50 ring-2 ring-blue-600/20';
      if (selecaoBloqueada) return 'border-slate-100 bg-white opacity-60 cursor-not-allowed';
      return 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 hover:shadow-md cursor-pointer';
    })();

    return (
      <button
        key={h.id}
        disabled={selecaoBloqueada}
        onClick={() => handleSelecionarHorario(h)}
        className={`group relative flex flex-col justify-center rounded-2xl border-2 p-4 text-center transition-all h-full
          ${cardStateClass}`}
      >
        {selecionado && (
          <div className="absolute top-2 right-2 text-blue-600">
            <CheckCircle2 className="w-5 h-5 fill-blue-100" />
          </div>
        )}
        <p className={`text-base font-extrabold tracking-tight ${selecionado ? 'text-blue-800' : 'text-slate-800'}`}>
          {h.hora_inicio.substring(0, 5)}
        </p>
        <p className={`text-xs font-medium mb-2 ${selecionado ? 'text-blue-600' : 'text-slate-500'}`}>
          até {h.hora_fim.substring(0, 5)}
        </p>
        <div className={`mt-auto inline-flex justify-center items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide
          ${selecionado ? 'bg-blue-200/50 text-blue-800' : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100'}`}>
          {h.vagas_livres} vagas livres
        </div>
      </button>
    );
  }

  function renderCardHorario(h: HorarioData): ReactNode {
    const selecionado = horarioSelecionado === h.id;
    const filaInfo = listaEsperaMap[h.id];
    const carregandoFila = entrandoFila === h.id;
    const existeAgendamento = Boolean(agendamentoExistente);
    const naFilaDesteSlot = Boolean(filaInfo && (filaInfo.status === 'aguardando' || filaInfo.status === 'notificado'));

    // Slot disponível mas reservado para confirmação de outro usuário da fila
    const bloqueadoPorFila = h.disponivel && h.reservado_para_fila && !naFilaDesteSlot;

    const selecaoBloqueada = !h.disponivel || (existeAgendamento && !alterando) || naFilaDesteSlot;

    if (!h.disponivel || bloqueadoPorFila) {
      return renderCardHorarioLotado(h, selecionado, existeAgendamento, filaInfo, carregandoFila, bloqueadoPorFila);
    }

    return renderCardHorarioDisponivel(h, selecionado, selecaoBloqueada);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 animate-in fade-in duration-300">

      {/* Banner de penalidade ativa */}
      {erroPenalidade && (
        <div className="mb-6 flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4 text-sm text-rose-800 shadow-sm">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-rose-500" />
          <span>{erroPenalidade}</span>
        </div>
      )}

      {/* Breadcrumb Padrão */}
      <div className="flex items-center text-xs sm:text-sm text-slate-500 mb-6 font-medium">
        <CalendarIcon className="w-4 h-4 mr-1.5 text-slate-400" />
        <span className="capitalize">{new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
        <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />
        <span className="text-slate-800 truncate">{evento.titulo}</span>
      </div>

      {/* Info Card Premium */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 sm:p-8 text-center border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">{evento.titulo}</h1>
          {evento.descricao && <p className="text-slate-500 max-w-2xl mx-auto leading-relaxed">{evento.descricao}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="flex items-center gap-4 p-6 hover:bg-slate-50/50 transition-colors">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-blue-100">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Data do Evento</p>
              <p className="text-sm font-bold text-slate-900 capitalize">{dataFormatada}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-6 hover:bg-slate-50/50 transition-colors">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-blue-100">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Período de Atendimento</p>
              <p className="text-sm font-bold text-slate-900">
                {evento.hora_inicio.substring(0, 5)} às {evento.hora_fim.substring(0, 5)}
              </p>
            </div>
          </div>

          {evento.nome_profissional && (
            <div className="flex items-center gap-4 p-6 hover:bg-slate-50/50 transition-colors">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-blue-100">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Profissional</p>
                <p className="text-sm font-bold text-slate-900">{evento.nome_profissional}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ticket: Agendamento Existente */}
      {agendamentoExistente && !alterando && (
        <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden">
          {/* Decoração sutil de ticket */}
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 rounded-full border-r border-emerald-200 hidden sm:block"></div>
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 rounded-full border-l border-emerald-200 hidden sm:block"></div>
          
          <div className="flex items-start sm:items-center gap-4 relative z-10 w-full">
            <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md">
              <Ticket className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-emerald-200/50 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md">
                  Inscrição Confirmada
                </span>
              </div>
              <p className="text-emerald-900 font-bold text-lg leading-tight">Você já garantiu sua vaga!</p>
              <p className="text-emerald-700 text-sm mt-0.5 font-medium">
                Seu horário reservado é das <strong className="text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded">{agendamentoExistente.horario.hora_inicio.substring(0, 5)} às {agendamentoExistente.horario.hora_fim.substring(0, 5)}</strong>.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto relative z-10 shrink-0">
            <button
              onClick={() => abrirModalDetalhes(agendamentoExistente)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-emerald-500/30"
            >
              Ver meu Agendamento
            </button>
            <button
              onClick={() => { setAlterando(true); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }}
              className="px-6 py-3 bg-white border-2 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold transition-all"
            >
              Alterar Horário
            </button>
          </div>
        </div>
      )}

      {/* Grid de Seleção de Horários */}
      <div className={`rounded-3xl shadow-sm border p-6 sm:p-8 mb-6 transition-all duration-500 
        ${alterando ? 'bg-amber-50/50 border-amber-200 ring-4 ring-amber-50' : 'bg-white border-slate-200'}`}>
        
        {/* Banner Modo Remarcação */}
        {alterando && agendamentoExistente && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-100/50 border border-amber-300 rounded-2xl px-5 py-4 mb-6 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-4">
              <RefreshCw className="w-6 h-6 text-amber-600 shrink-0 animate-spin [animation-duration:4s]" />
              <div>
                <p className="text-amber-900 font-extrabold text-base">Modo Remarcação Ativo</p>
                <p className="text-amber-700 text-sm font-medium mt-0.5">
                  Selecione um novo horário no grid abaixo para substituir o seu atual ({agendamentoExistente.horario.hora_inicio.substring(0, 5)}).
                </p>
              </div>
            </div>
            <button
              onClick={() => { setAlterando(false); }}
              className="h-10 px-5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-all shrink-0 shadow-sm"
            >
              Cancelar remarcação
            </button>
          </div>
        )}

        {/* Header do Grid */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className={`text-xl font-extrabold tracking-tight ${alterando ? 'text-amber-900' : 'text-slate-900'}`}>
              {alterando ? 'Horários Disponíveis para Remarcação' : 'Selecione o Horário Desejado'}
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Clique em um card disponível para iniciar a reserva.</p>
          </div>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-blue-100 shrink-0">
            <Users className="w-4 h-4" />
            {qtdHorariosDisponiveis} opções disponíveis
          </div>
        </div>

        {/* The Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {evento.horarios.flatMap((h, i, arr) => {
            const cards: React.ReactNode[] = [renderCardHorario(h)];
            const next = arr[i + 1];
            if (next && h.hora_fim.substring(0, 5) < next.hora_inicio.substring(0, 5)) {
              cards.push(
                <div
                  key={`almoco-${h.id}`}
                  className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5 flex items-center gap-3 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-sm font-semibold"
                >
                  <span className="text-base">🍽️</span>
                  <span>Intervalo de Almoço</span>
                  <span className="font-bold">{h.hora_fim.substring(0, 5)} – {next.hora_inicio.substring(0, 5)}</span>
                </div>
              );
            }
            return cards;
          })}
        </div>

        {/* Aviso Fila de Espera Ativa */}
        {naFilaAtiva && (
          <div className="mt-8 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-2xl p-5 shadow-sm">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900 mb-1">Você está na fila de espera</p>
              <p className="text-sm font-medium text-amber-800 leading-relaxed">
                O horário em que você está na fila permanece bloqueado. Caso surja outro horário disponível, você pode reservá-lo normalmente — isso cancela sua posição na fila automaticamente. Quando sua vez chegar, você receberá um e-mail e terá <strong>5 minutos</strong> para confirmar.
              </p>
            </div>
          </div>
        )}
        {!naFilaAtiva && Object.keys(listaEsperaMap).length > 0 && (
          <div className="mt-8 flex items-start sm:items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm font-medium text-blue-800 leading-relaxed">
              <strong>Fila de Espera:</strong> Você está aguardando em {Object.keys(listaEsperaMap).length} horário{Object.keys(listaEsperaMap).length > 1 ? 's' : ''}. Se alguém cancelar a reserva, você receberá um e-mail com as instruções para assumir a vaga.
            </p>
          </div>
        )}
      </div>

      {/* Alerta de Erro Reserva */}
      {erroReserva && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6 text-sm font-bold animate-pulse">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <p>{erroReserva}</p>
        </div>
      )}


      {/* Modal Reutilizável de Confirmação/Sucesso */}
      {modalAgendamento && (
        <ModalDetalhesAgendamento
          ag={modalAgendamento}
          modo={modoModal}
          onClose={() => {
            setModalAgendamento(null);
            setModoModal('detalhes');
          }}
          horarioId={horarioSelecionado ?? undefined}
          onConfirmarReserva={modoModal === 'confirmacao' ? handleReservar : undefined}
          confirmandoReserva={modoModal === 'confirmacao' ? reservando : false}
          textoConfirmar={alterando ? 'Confirmar Novo Horário' : 'Confirmar Reserva'}
          textoSucesso={alterando ? 'Horário Atualizado!' : 'Vaga Garantida!'}
          descricaoSucesso={alterando ? 'Seu agendamento foi transferido para o novo horário com sucesso.' : 'Seu horário foi reservado e um e-mail de confirmação foi enviado.'}
          onAlterarHorario={() => {
            setAlterando(true);
            setErroReserva('');
            setModalAgendamento(null);
          }}
          onCancelado={() => {
            setAgendamentoExistente(null);
            setAlterando(false);
            setErroReserva('');
            carregarEvento();
          }}
        />
      )}
    </div>
  );
}
