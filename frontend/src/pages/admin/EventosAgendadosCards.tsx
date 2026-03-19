import { Link } from 'react-router-dom';
import bemEstarImg from '../../images/bem-estar.png';
import {
  Pencil,
  Trash2,
  EyeOff,
  Calendar,
  Clock,
  Users,
  X,
  CheckCircle2,
  User,
  Mail,
  ClipboardList,
} from 'lucide-react';
import { type EventoDTO } from '../../services/api';

const TIPO_GRADIENT: Record<string, string> = {
  massagem: 'from-rose-400 to-rose-600',
  yoga: 'from-violet-400 to-violet-600',
  meditacao: 'from-indigo-400 to-indigo-600',
  nutricao: 'from-emerald-400 to-emerald-600',
  pilates: 'from-sky-400 to-sky-600',
  acupuntura: 'from-amber-400 to-amber-600',
};

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  ATIVO: { label: 'Disponivel', badgeClass: 'bg-emerald-500 text-white' },
  CANCELADO: { label: 'Cancelado', badgeClass: 'bg-rose-600 text-white' },
  ENCERRADO: { label: 'Encerrado', badgeClass: 'bg-slate-800 text-white' },
};

export function normalizeStatus(status: string): 'ATIVO' | 'CANCELADO' | 'ENCERRADO' {
  const s = status.toUpperCase();
  if (s === 'ATIVO' || s === 'PUBLICADO') return 'ATIVO';
  if (s === 'CANCELADO') return 'CANCELADO';
  if (s === 'ENCERRADO') return 'ENCERRADO';
  return 'CANCELADO';
}

export function formatDate(iso: string) {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

interface EventCardProps {
  evento: EventoDTO;
  onOpen: () => void;
}

interface EventActionsModalProps {
  evento: EventoDTO;
  isActing: boolean;
  isEmailActing: boolean;
  onCancelar: () => void;
  onDelete: () => void;
  onEnviarEmails: () => void;
  onRegistrar: () => void;
  onListaPresenca: () => void;
  onClose: () => void;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="h-44 bg-slate-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 bg-slate-200 rounded" />
        <div className="h-3 w-1/2 bg-slate-100 rounded" />
        <div className="h-3 w-2/3 bg-slate-100 rounded" />
        <div className="h-9 bg-slate-200 rounded-lg mt-2" />
      </div>
    </div>
  );
}

export function EventActionsModal({
  evento,
  isActing,
  isEmailActing,
  onCancelar,
  onDelete,
  onEnviarEmails,
  onRegistrar,
  onListaPresenca,
  onClose,
}: EventActionsModalProps) {
  const status = normalizeStatus(evento.status);

  const Spinner = () => (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-slate-900">Acoes do evento</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4 truncate">{evento.titulo}</p>

        <div className="space-y-2">
          {status === 'ATIVO' && (
            <>
              <button
                onClick={onRegistrar}
                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                Registrar Participante
              </button>
              <button
                onClick={onListaPresenca}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <ClipboardList className="w-4 h-4" />
                Lista de Presenca
              </button>
              {evento.emails_enviados_em ? (
                <div className="w-full py-2 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center">
                  <span className="text-slate-500 font-medium flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    E-mails enviados em {new Date(evento.emails_enviados_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ) : (
                <button
                  onClick={onEnviarEmails}
                  disabled={isEmailActing || isActing}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {isEmailActing ? <Spinner /> : <Mail className="w-4 h-4" />}
                  {isEmailActing ? 'Enviando...' : 'Enviar E-mails'}
                </button>
              )}
              <button
                onClick={onCancelar}
                disabled={isActing || isEmailActing}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-60 text-slate-600 rounded-lg font-medium text-sm border border-slate-200 hover:border-amber-200 transition-colors flex items-center justify-center gap-2"
              >
                {isActing ? <Spinner /> : <EyeOff className="w-4 h-4" />}
                {isActing ? 'Cancelando...' : 'Cancelar Evento'}
              </button>
            </>
          )}

          {status === 'CANCELADO' && (
            <>
              <button
                onClick={onListaPresenca}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <ClipboardList className="w-4 h-4" />
                Lista de Presenca
              </button>
              <div className="w-full py-2 px-4 bg-rose-50 text-rose-700 rounded-lg font-medium text-sm text-center border border-rose-200">
                Evento cancelado
              </div>
            </>
          )}

          {status === 'ENCERRADO' && (
            <>
              <button
                onClick={onListaPresenca}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <ClipboardList className="w-4 h-4" />
                Lista de Presenca
              </button>
              <div className="w-full py-2 px-4 bg-slate-50 text-slate-400 rounded-lg font-medium text-sm text-center border border-slate-200">
                Encerrado
              </div>
            </>
          )}

          <div className="flex gap-2 pt-1">
            <Link to={`/admin/eventos/${evento.id}/editar`} className="flex-1">
              <button className="w-full py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </button>
            </Link>
            <button
              onClick={onDelete}
              className="py-1.5 px-3 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-400 rounded-lg text-sm transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventCard({ evento, onOpen }: EventCardProps) {
  const gradient = TIPO_GRADIENT[evento.tipo] ?? 'from-blue-400 to-blue-600';
  const status = normalizeStatus(evento.status);
  const statusCfg = STATUS_CONFIG[status];

  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col hover:shadow-md hover:border-blue-200 transition-all"
    >
      <div className={`relative h-44 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        <img
          src={evento.imagem_url || bemEstarImg}
          alt={evento.titulo}
          className="absolute inset-0 w-full h-full object-cover"
          onError={e => { (e.currentTarget as HTMLImageElement).src = bemEstarImg; }}
        />

        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusCfg.badgeClass}`}>
          {statusCfg.label}
        </span>

        <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 text-white text-xs font-medium px-2 py-1 rounded-full">
          <Users className="w-3 h-3" />
          {evento.total_agendamentos ?? 0}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-slate-900 leading-snug mb-3 line-clamp-2">
          {evento.titulo}
        </h3>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-3.5 h-3.5 shrink-0 text-blue-500" />
            <span>{formatDate(evento.data)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-3.5 h-3.5 shrink-0 text-blue-500" />
            <span>{evento.hora_inicio.substring(0, 5)} - {evento.hora_fim.substring(0, 5)}</span>
          </div>
          {evento.nome_profissional && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <User className="w-3.5 h-3.5 shrink-0 text-blue-500" />
              <span className="truncate">{evento.nome_profissional}</span>
            </div>
          )}
        </div>

        <div className="mt-auto pt-2">
          <div className="inline-flex items-center text-sm font-medium text-blue-600">
            Ver acoes do evento
          </div>
        </div>
      </div>
    </button>
  );
}
