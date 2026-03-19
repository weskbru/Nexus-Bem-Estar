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
  ArrowRight,
  AlertTriangle
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
  ATIVO: { label: 'Publicado', badgeClass: 'bg-emerald-500/90 backdrop-blur-sm text-white border border-emerald-400/50' },
  CANCELADO: { label: 'Cancelado', badgeClass: 'bg-rose-600/90 backdrop-blur-sm text-white border border-rose-500/50' },
  ENCERRADO: { label: 'Encerrado', badgeClass: 'bg-slate-800/90 backdrop-blur-sm text-white border border-slate-700/50' },
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
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse shadow-sm">
      <div className="h-48 bg-slate-200" />
      <div className="p-5 space-y-4">
        <div className="h-5 w-3/4 bg-slate-200 rounded" />
        <div className="space-y-2">
          <div className="h-3 w-1/2 bg-slate-100 rounded" />
          <div className="h-3 w-2/3 bg-slate-100 rounded" />
        </div>
        <div className="h-10 bg-slate-100 rounded-xl mt-4" />
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
    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header do Modal */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Gerenciar Evento</h3>
            <p className="text-sm text-slate-500 mt-1 font-medium line-clamp-2 pr-4">{evento.titulo}</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ações Principais */}
        <div className="space-y-3">
          {status === 'ATIVO' && (
            <>
              <button
                onClick={onRegistrar}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                <User className="w-5 h-5" />
                Registrar Participante
              </button>
              
              <button
                onClick={onListaPresenca}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                <ClipboardList className="w-5 h-5" />
                Lista de Presença
              </button>
              
              {evento.emails_enviados_em ? (
                <div className="w-full py-3 px-4 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-emerald-800 font-medium">
                    Notificações enviadas em {new Date(evento.emails_enviados_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ) : (
                <button
                  onClick={onEnviarEmails}
                  disabled={isEmailActing || isActing}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                >
                  {isEmailActing ? <Spinner /> : <Mail className="w-5 h-5" />}
                  {isEmailActing ? 'Enviando...' : 'Enviar E-mails de Convite'}
                </button>
              )}
            </>
          )}

          {status === 'CANCELADO' && (
            <>
              <div className="w-full py-3 px-4 bg-rose-50 text-rose-700 rounded-xl font-bold text-sm text-center border border-rose-200 mb-3 flex items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5" /> {/* Nota: adicione AlertTriangle no import do lucide-react caso use essa linha */}
                Este evento foi cancelado
              </div>
              <button
                onClick={onListaPresenca}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <ClipboardList className="w-5 h-5" />
                Ver Inscritos
              </button>
            </>
          )}

          {status === 'ENCERRADO' && (
            <>
              <button
                onClick={onListaPresenca}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <ClipboardList className="w-5 h-5" />
                Ver Lista de Presença
              </button>
              <div className="w-full py-3 px-4 bg-slate-100 text-slate-500 rounded-xl font-medium text-sm text-center border border-slate-200 mt-3">
                Evento concluído
              </div>
            </>
          )}

          {/* Divisória para Ações Destrutivas/Secundárias */}
          <div className="py-2">
            <hr className="border-slate-100" />
          </div>

          <div className="flex gap-3">
            <Link to={`/admin/eventos/${evento.id}/editar`} className="flex-1">
              <button className="w-full py-2.5 px-3 border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                <Pencil className="w-4 h-4" />
                Editar
              </button>
            </Link>
            
            {status === 'ATIVO' && (
               <button
                 onClick={onCancelar}
                 disabled={isActing || isEmailActing}
                 className="flex-1 py-2.5 px-3 border-2 border-amber-200 hover:bg-amber-50 hover:border-amber-300 text-amber-700 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
               >
                 {isActing ? <Spinner /> : <EyeOff className="w-4 h-4" />}
                 Cancelar
               </button>
            )}

            <button
              onClick={onDelete}
              className="px-4 border-2 border-rose-100 hover:bg-rose-50 hover:border-rose-200 text-rose-600 rounded-xl text-sm transition-colors flex items-center justify-center"
              title="Excluir Evento"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventCard({ evento, onOpen }: EventCardProps) {
  const gradient = TIPO_GRADIENT[evento.tipo] ?? 'from-slate-400 to-slate-600';
  const status = normalizeStatus(evento.status);
  const statusCfg = STATUS_CONFIG[status];

  return (
    <button
      onClick={onOpen}
      className="group w-full text-left bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-300 transition-all duration-300"
    >
      {/* Imagem Cover */}
      <div className={`relative h-48 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        {/* Overlay escuro para garantir leitura das badges */}
        <div className="absolute inset-0 bg-black/10 z-10 group-hover:bg-transparent transition-colors duration-300" />
        
        <img
          src={evento.imagem_url || bemEstarImg}
          alt={evento.titulo}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={e => { (e.currentTarget as HTMLImageElement).src = bemEstarImg; }}
        />

        <span className={`absolute top-4 left-4 z-20 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${statusCfg.badgeClass}`}>
          {statusCfg.label}
        </span>

        <span className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
          <Users className="w-3.5 h-3.5" />
          {evento.total_agendamentos ?? 0}
        </span>
      </div>

      {/* Conteúdo do Card */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-slate-900 leading-tight mb-4 line-clamp-2 group-hover:text-blue-700 transition-colors">
          {evento.titulo}
        </h3>

        <div className="space-y-2.5 mb-6">
          <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <span>{formatDate(evento.data)}</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <span>{evento.hora_inicio.substring(0, 5)} - {evento.hora_fim.substring(0, 5)}</span>
          </div>
          
          {evento.nome_profissional && (
            <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
              <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <span className="truncate">{evento.nome_profissional}</span>
            </div>
          )}
        </div>

        {/* Footer do Card / Call to Action */}
        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-sm font-bold text-blue-600 group-hover:underline">
            Gerenciar evento
          </span>
          <ArrowRight className="w-4 h-4 text-blue-600 transform group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </button>
  );
}