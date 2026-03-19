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
    <div className="max-w-6xl mx-auto">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm transition-all
          ${toast.tipo === 'sucesso' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.tipo === 'sucesso'
            ? <CheckCircle2 className="w-5 h-5 shrink-0" />
            : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Eventos de Bem-Estar</h1>
          <p className="text-slate-500 text-sm">Gerencie todos os eventos criados para os colaboradores.</p>
        </div>
        <Link to="/admin/eventos/novo">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Criar novo evento
          </button>
        </Link>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtro === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
            {f.key !== 'todos' && (
              <span className="ml-1.5 text-xs opacity-70">
                ({eventos.filter(e => normalizeStatus(e.status) === f.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {erro && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
          <span>{erro}</span>
          <button onClick={carregarEventos} className="ml-4 underline font-medium hover:text-red-800">
            Tentar novamente
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : eventosFiltrados.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium mb-1">
            {filtro === 'todos' ? 'Nenhum evento criado ainda.' : `Nenhum evento ${FILTROS.find(f => f.key === filtro)?.label.toLowerCase()}.`}
          </p>
          {filtro === 'todos' && (
            <Link to="/admin/eventos/novo" className="text-blue-600 hover:underline text-sm">
              Criar primeiro evento
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {eventosFiltrados.map(evento => (
            <EventCard
              key={evento.id}
              evento={evento}
              onOpen={() => setActionTarget(evento)}
            />
          ))}
        </div>
      )}

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
