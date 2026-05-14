import { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  User,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { adminPenalidadesApi, type PenalidadeDTO } from '../../services/api';

type FiltroAtiva = 'ativas' | 'todas';

type RevogarModalState = {
  penalidade: PenalidadeDTO;
  motivo: string;
  carregando: boolean;
  erro: string;
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Penalidades() {
  const [penalidades, setPenalidades] = useState<PenalidadeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState<FiltroAtiva>('ativas');
  const [modal, setModal] = useState<RevogarModalState | null>(null);
  const [sucessoRevogar, setSucessoRevogar] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    setErro('');
    try {
      const params = filtro === 'ativas' ? { ativa: true } : undefined;
      const lista = await adminPenalidadesApi.listar(params);
      setPenalidades(lista);
    } catch {
      setErro('Não foi possível carregar as penalidades. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, [filtro]);

  async function handleRevogar() {
    if (!modal) return;
    setModal(prev => prev ? { ...prev, carregando: true, erro: '' } : null);
    try {
      await adminPenalidadesApi.revogar(modal.penalidade.id, modal.motivo);
      setSucessoRevogar(modal.penalidade.usuario.nome);
      setModal(null);
      carregar();
    } catch (err) {
      setModal(prev => prev
        ? { ...prev, carregando: false, erro: err instanceof Error ? err.message : 'Erro ao revogar penalidade.' }
        : null
      );
    }
  }

  const ativas = penalidades.filter(p => p.ativa).length;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-rose-500" />
            Penalidades
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie usuários bloqueados por ausência em eventos.
          </p>
        </div>
        <button
          onClick={carregar}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Banner de sucesso de revogação */}
      {sucessoRevogar && (
        <div className="mb-6 flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-emerald-500" />
          <span>
            Penalidade de <strong>{sucessoRevogar}</strong> revogada com sucesso. O usuário pode se agendar normalmente.
          </span>
          <button onClick={() => setSucessoRevogar(null)} className="ml-auto shrink-0 text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros + contador */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setFiltro('ativas')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filtro === 'ativas'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ativas {ativas > 0 && filtro === 'ativas' && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-600 text-[11px] font-extrabold">
                {ativas}
              </span>
            )}
          </button>
          <button
            onClick={() => setFiltro('todas')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filtro === 'todas'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas
          </button>
        </div>
        {!loading && (
          <span className="text-sm text-slate-500 font-medium">
            {penalidades.length} {penalidades.length === 1 ? 'registro' : 'registros'}
          </span>
        )}
      </div>

      {/* Estado de carregamento */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-sm font-medium">Carregando penalidades...</span>
        </div>
      )}

      {/* Erro */}
      {!loading && erro && (
        <div className="py-16 flex flex-col items-center gap-3">
          <AlertTriangle className="w-10 h-10 text-red-500 opacity-80" />
          <p className="text-red-600 font-medium text-center">{erro}</p>
          <button onClick={carregar} className="text-sm font-bold text-red-700 underline hover:text-red-900">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Lista vazia */}
      {!loading && !erro && penalidades.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 mb-1">
            {filtro === 'ativas' ? 'Nenhuma penalidade ativa' : 'Nenhuma penalidade registrada'}
          </h3>
          <p className="text-sm text-slate-500">
            {filtro === 'ativas'
              ? 'Todos os usuários estão livres para agendar.'
              : 'Nenhuma penalidade foi criada até agora.'}
          </p>
        </div>
      )}

      {/* Lista de penalidades */}
      {!loading && !erro && penalidades.length > 0 && (
        <div className="space-y-3">
          {penalidades.map(p => (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border shadow-sm transition-all ${
                p.ativa ? 'border-rose-200' : 'border-slate-200 opacity-70'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4">
                {/* Avatar + nome */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    p.ativa ? 'bg-rose-100' : 'bg-slate-100'
                  }`}>
                    <User className={`w-5 h-5 ${p.ativa ? 'text-rose-500' : 'text-slate-400'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{p.usuario.nome}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                        p.ativa
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {p.ativa ? 'Bloqueado' : 'Revogada'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{p.usuario.email}</p>
                  </div>
                </div>

                {/* Info do evento */}
                <div className="flex flex-col gap-1 sm:text-right min-w-0 sm:max-w-xs">
                  {p.evento_origem_titulo && (
                    <div className="flex items-center gap-1.5 sm:justify-end text-xs text-slate-600">
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">
                        Faltou em: <strong>{p.evento_origem_titulo}</strong>
                      </span>
                    </div>
                  )}
                  {p.evento_punicao_titulo && (
                    <div className="flex items-center gap-1.5 sm:justify-end text-xs text-slate-500">
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Punição: {p.evento_punicao_titulo}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 sm:text-right">
                    Criada em {formatarData(p.criada_em)}
                  </p>
                  {!p.ativa && p.revogada_em && (
                    <p className="text-[11px] text-emerald-600 sm:text-right">
                      Revogada em {formatarData(p.revogada_em)}
                      {p.motivo_revogacao && ` — ${p.motivo_revogacao}`}
                    </p>
                  )}
                </div>

                {/* Botão de revogar */}
                {p.ativa && (
                  <button
                    onClick={() => setModal({ penalidade: p, motivo: '', carregando: false, erro: '' })}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Revogar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmação de revogação */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Revogar Penalidade</h3>
                  <p className="text-sm text-emerald-600 font-medium">Liberar acesso do usuário</p>
                </div>
              </div>
              <button
                onClick={() => setModal(null)}
                className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-5">
              <p className="text-sm text-slate-700 leading-relaxed">
                Revogar a penalidade de{' '}
                <strong className="text-slate-900">{modal.penalidade.usuario.nome}</strong>?
                O usuário poderá se agendar normalmente no próximo evento.
              </p>
              {modal.penalidade.evento_origem_titulo && (
                <p className="text-xs text-slate-500 mt-2">
                  Penalidade por ausência em: <strong>{modal.penalidade.evento_origem_titulo}</strong>
                </p>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Motivo da revogação <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <textarea
                value={modal.motivo}
                onChange={e => setModal(prev => prev ? { ...prev, motivo: e.target.value } : null)}
                placeholder="Ex: Falta justificada, ausência por motivo de saúde..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 text-sm transition-all outline-none resize-none"
              />
            </div>

            {modal.erro && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {modal.erro}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                disabled={modal.carregando}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 rounded-xl transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRevogar}
                disabled={modal.carregando}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {modal.carregando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Revogando...</>
                  : <><ShieldCheck className="w-4 h-4" /> Confirmar Revogação</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
