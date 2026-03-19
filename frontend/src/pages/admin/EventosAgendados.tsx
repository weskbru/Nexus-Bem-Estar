import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { adminEventosApi, type EventoDTO } from '../../services/api';
import {
  EventCard,
  EventActionsModal,
  SkeletonCard,
  normalizeStatus,
} from './EventosAgendadosCards';
import {
  ConfirmDeleteModal,
  ConfirmActionModal,
  ListaPresencaModal,
  RegistrarParticipanteModal,
} from './EventosAgendadosModals';

export default function AdminEventos() {
  const [eventos, setEventos] = useState<EventoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [emailLoadingId, setEmailLoadingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventoDTO | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'ATIVO' | 'CANCELADO' | 'ENCERRADO'>('todos');
  const [registrarTarget, setRegistrarTarget] = useState<EventoDTO | null>(null);
  const [listaPresencaId, setListaPresencaId] = useState<number | null>(null);
  const [actionTarget, setActionTarget] = useState<EventoDTO | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ evento: EventoDTO; tipo: 'emails' | 'cancelar' } | null>(null);
  const [toast, setToast] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  useEffect(() => { carregarEventos(); }, []);

  async function carregarEventos() {
    setLoading(true);
    setErro('');
    try {
      const lista = await adminEventosApi.listar();
      setEventos(lista);
      setRegistrarTarget(prev => prev ? (lista.find(e => e.id === prev.id) ?? null) : null);
    } catch {
      setErro('Não foi possível carregar os eventos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelar(evento: EventoDTO) {
    setActionLoadingId(evento.id);
    try {
      await adminEventosApi.cancelar(evento.id);
      await carregarEventos();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  }

  function mostrarToast(tipo: 'sucesso' | 'erro', msg: string) {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleEnviarEmails(evento: EventoDTO) {
    setEmailLoadingId(evento.id);
    try {
      await adminEventosApi.enviarEmails(evento.id);
      mostrarToast('sucesso', 'E-mail enviado com sucesso para a lista de distribuição.');
    } catch (err) {
      mostrarToast('erro', err instanceof Error ? err.message : 'Erro ao enviar e-mails.');
    } finally {
      setEmailLoadingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api'}/admin/eventos/${deleteTarget.id}/`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token ?? ''}` } }
      );
      if (!res.ok) throw new Error();
      setEventos(prev => prev.filter(e => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  }

  const eventosFiltrados = filtro === 'todos'
    ? eventos
    : eventos.filter(e => normalizeStatus(e.status) === filtro);

  const FILTROS = [
    { key: 'todos', label: 'Todos' },
    { key: 'ATIVO', label: 'Publicados' },
    { key: 'CANCELADO', label: 'Cancelados' },
    { key: 'ENCERRADO', label: 'Encerrados' },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Toast Notification Aprimorado */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-sm transition-all duration-300 transform translate-y-0 opacity-100
          ${toast.tipo === 'sucesso' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.tipo === 'sucesso'
            ? <CheckCircle2 className="w-5 h-5 shrink-0" />
            : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-auto opacity-70 hover:opacity-100 transition-opacity focus:outline-none">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Eventos de Bem-Estar
          </h1>
          <p className="text-slate-500 text-sm sm:text-base mt-1 font-medium">
            Gerencie e acompanhe todos os eventos corporativos.
          </p>
        </div>
        <Link to="/admin/eventos/novo" className="shrink-0">
          <button className="w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm hover:shadow-md hover:shadow-blue-500/20 transition-all duration-200 active:scale-[0.98]">
            <Plus className="w-5 h-5" />
            Criar novo evento
          </button>
        </Link>
      </div>

      {/* Filtros Estilo "Chips" */}
      <div className="flex gap-2.5 mb-8 flex-wrap">
        {FILTROS.map(f => {
          const count = f.key === 'todos' 
            ? eventos.length 
            : eventos.filter(e => normalizeStatus(e.status) === f.key).length;

          const isSelected = filtro === f.key;

          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                ${isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-sm'
                }`}
            >
              {f.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${isSelected ? 'bg-blue-500/50 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Alerta de Erro */}
      {erro && (
        <div className="mb-8 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between font-medium animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{erro}</span>
          </div>
          <button onClick={carregarEventos} className="ml-4 underline hover:text-red-900 transition-colors">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Área de Conteúdo (Cards ou Empty State) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : eventosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl mt-4">
          {/* Empty State Aprimorado */}
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-5">
            <Calendar className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">
            {filtro === 'todos' ? 'Nenhum evento criado ainda' : `Nenhum evento ${FILTROS.find(f => f.key === filtro)?.label.toLowerCase()}`}
          </h3>
          <p className="text-slate-500 text-sm mb-6 max-w-sm">
            {filtro === 'todos' 
              ? 'Comece criando o primeiro evento de bem-estar para os colaboradores da instituição.' 
              : 'Tente mudar os filtros para encontrar o que está procurando.'}
          </p>
          {filtro === 'todos' && (
            <Link to="/admin/eventos/novo">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                <Plus className="w-4 h-4" />
                Criar primeiro evento
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventosFiltrados.map(evento => (
            <EventCard
              key={evento.id}
              evento={evento}
              onOpen={() => setActionTarget(evento)}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      {actionTarget && (
        <EventActionsModal
          evento={actionTarget}
          isActing={actionLoadingId === actionTarget.id}
          isEmailActing={emailLoadingId === actionTarget.id}
          onCancelar={() => { setConfirmAction({ evento: actionTarget, tipo: 'cancelar' }); setActionTarget(null); }}
          onDelete={() => { setDeleteTarget(actionTarget); setActionTarget(null); }}
          onEnviarEmails={() => { setConfirmAction({ evento: actionTarget, tipo: 'emails' }); setActionTarget(null); }}
          onRegistrar={() => { setRegistrarTarget(actionTarget); setActionTarget(null); }}
          onListaPresenca={() => { setListaPresencaId(actionTarget.id); setActionTarget(null); }}
          onClose={() => setActionTarget(null)}
        />
      )}

      {confirmAction && (
        <ConfirmActionModal
          evento={confirmAction.evento}
          tipo={confirmAction.tipo}
          loading={
            confirmAction.tipo === 'emails'
              ? emailLoadingId === confirmAction.evento.id
              : actionLoadingId === confirmAction.evento.id
          }
          onCancel={() => setConfirmAction(null)}
          onConfirm={async () => {
            if (confirmAction.tipo === 'emails') {
              await handleEnviarEmails(confirmAction.evento);
            } else {
              await handleCancelar(confirmAction.evento);
            }
            setConfirmAction(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          evento={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      {registrarTarget && (
        <RegistrarParticipanteModal
          evento={registrarTarget}
          onClose={() => setRegistrarTarget(null)}
          onSuccess={carregarEventos}
        />
      )}

      {listaPresencaId !== null && (
        <ListaPresencaModal
          eventoId={listaPresencaId}
          onClose={() => setListaPresencaId(null)}
        />
      )}
    </div>
  );
}