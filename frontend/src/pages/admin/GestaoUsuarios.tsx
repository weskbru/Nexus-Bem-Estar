import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  Users,
  Building2,
  BadgeCheck,
  AlertTriangle,
  X,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { ldapApi, type LdapUsuarioDTO, type UsuarioDTO } from '../../services/api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AdminLocal extends UsuarioDTO {
  is_superuser: boolean;
}

type StatusBadgeProps = Readonly<{ usuario: LdapUsuarioDTO }>;

// ─── Badge de status ──────────────────────────────────────────────────────────

function StatusBadge({ usuario }: StatusBadgeProps) {
  if (usuario.is_superuser) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
        <ShieldCheck className="w-3 h-3" /> Super Admin
      </span>
    );
  }
  if (usuario.is_admin) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <BadgeCheck className="w-3 h-3" /> Admin
      </span>
    );
  }
  if (usuario.no_sistema) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
        <UserCheck className="w-3 h-3" /> No sistema
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-500">
      Apenas LDAP
    </span>
  );
}

// ─── Modal de confirmação de revogação ────────────────────────────────────────

interface ConfirmRevogarProps {
  usuario: AdminLocal;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

type ConfirmRevogarModalProps = Readonly<ConfirmRevogarProps>;

function ConfirmRevogarModal({ usuario, onConfirm, onCancel, loading }: ConfirmRevogarModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Revogar Acesso</h3>
            <p className="text-sm text-slate-500">Esta ação remove o acesso administrativo.</p>
          </div>
          <button onClick={onCancel} className="ml-auto text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-700 mb-6">
          Tem certeza que deseja revogar o acesso de{' '}
          <span className="font-semibold">"{usuario.nome}"</span>?
          O usuário não poderá mais acessar o painel administrativo.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Revogar Acesso
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GestaoUsuarios() {
  // ── Busca LDAP ──
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<LdapUsuarioDTO[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Admins locais ──
  const [admins, setAdmins] = useState<AdminLocal[]>([]);
  const [carregandoAdmins, setCarregandoAdmins] = useState(true);
  const [revogarTarget, setRevogarTarget] = useState<AdminLocal | null>(null);
  const [revogarLoading, setRevogarLoading] = useState(false);

  // ── Feedback de ações ──
  const [promovendo, setPromovendo] = useState<string | null>(null); // email
  const [feedbackSucesso, setFeedbackSucesso] = useState('');

  const renderAcaoResultado = useCallback((u: LdapUsuarioDTO) => {
    if (u.is_superuser) {
      return <span className="text-xs text-slate-400 italic">Protegido</span>;
    }
    if (u.is_admin) {
      return <span className="text-xs text-emerald-600 font-medium">Já é admin</span>;
    }

    const isPromovendo = promovendo === u.email;
    const conteudoBotao = isPromovendo
      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Promovendo...</>
      : <><ShieldCheck className="w-3.5 h-3.5" /> Promover a Admin</>;

    return (
      <button
        onClick={() => handlePromover(u)}
        disabled={isPromovendo}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold transition-colors"
      >
        {conteudoBotao}
      </button>
    );
  }, [promovendo]);

  const renderAdminsContent = useCallback(() => {
    if (carregandoAdmins) {
      return (
        <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
        </div>
      );
    }
    if (admins.length === 0) {
      return (
        <div className="text-center py-8 text-slate-400 text-sm">
          Nenhum administrador cadastrado.
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">E-mail</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Departamento</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Nível</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Ação</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a, i) => (
              <tr
                key={a.id}
                className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{a.nome}</div>
                  <div className="text-xs text-slate-400">{a.matricula || '—'}</div>
                </td>
                <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{a.email}</td>
                <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                  {a.departamento || '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {a.is_superuser ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <ShieldCheck className="w-3 h-3" /> Super Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      <BadgeCheck className="w-3 h-3" /> Admin Eventos
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {a.is_superuser ? (
                    <span className="text-xs text-slate-400 italic">Protegido</span>
                  ) : (
                    <button
                      onClick={() => setRevogarTarget(a)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-500 rounded-lg text-xs font-medium transition-colors"
                    >
                      <ShieldOff className="w-3.5 h-3.5" /> Revogar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [admins, carregandoAdmins]);

  // ── Carregar admins atuais ──
  const carregarAdmins = useCallback(async () => {
    setCarregandoAdmins(true);
    try {
      const data = await ldapApi.listarAdmins();
      setAdmins(data as AdminLocal[]);
    } catch {
      // silencioso
    } finally {
      setCarregandoAdmins(false);
    }
  }, []);

  useEffect(() => { carregarAdmins(); }, [carregarAdmins]);

  // ── Busca com debounce ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setResultados([]);
    setErroBusca('');

    if (query.trim().length < 2) return;

    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        setResultados(await ldapApi.buscar(query.trim()));
      } catch (err) {
        setErroBusca(err instanceof Error ? err.message : 'Erro ao buscar.');
      } finally {
        setBuscando(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // ── Promover a admin ──
  async function handlePromover(u: LdapUsuarioDTO) {
    setPromovendo(u.email);
    setFeedbackSucesso('');
    try {
      await ldapApi.promover({
        email:        u.email,
        nome:         u.nome,
        matricula:    u.matricula,
        departamento: u.departamento,
      });
      setFeedbackSucesso(`${u.nome} promovido(a) a administrador com sucesso.`);
      // Atualiza estado local sem nova requisição
      setResultados(prev =>
        prev.map(r => r.email === u.email ? { ...r, no_sistema: true, is_admin: true } : r)
      );
      carregarAdmins();
    } catch (err) {
      setErroBusca(err instanceof Error ? err.message : 'Erro ao promover.');
    } finally {
      setPromovendo(null);
    }
  }

  // ── Revogar acesso ──
  async function handleRevogar() {
    if (!revogarTarget) return;
    setRevogarLoading(true);
    try {
      await ldapApi.revogar(revogarTarget.id);
      setFeedbackSucesso(`Acesso de ${revogarTarget.nome} revogado com sucesso.`);
      setRevogarTarget(null);
      setResultados(prev =>
        prev.map(r => r.email === revogarTarget.email ? { ...r, is_admin: false } : r)
      );
      carregarAdmins();
    } catch (err) {
      setErroBusca(err instanceof Error ? err.message : 'Erro ao revogar acesso.');
      setRevogarTarget(null);
    } finally {
      setRevogarLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gestão de Acessos</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Busque colaboradores no Active Directory e gerencie permissões administrativas.
        </p>
      </div>

      {/* Feedback */}
      {feedbackSucesso && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
          <span>{feedbackSucesso}</span>
          <button onClick={() => setFeedbackSucesso('')} className="ml-4 text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Seção: Busca LDAP ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900">Buscar no Active Directory</h2>
        </div>

        {/* Input com debounce */}
        <div className="relative mb-5">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            {buscando
              ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              : <Search className="w-4 h-4 text-slate-400" />
            }
          </div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pesquisar por nome, e-mail, matrícula ou departamento..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResultados([]); }}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Erro de busca */}
        {erroBusca && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
            {erroBusca}
          </p>
        )}

        {/* Resultados */}
        {query.trim().length >= 2 && !buscando && resultados.length === 0 && !erroBusca && (
          <div className="text-center py-8 text-slate-400 text-sm">
            Nenhum colaborador encontrado para "{query}".
          </div>
        )}

        {resultados.length > 0 && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">E-mail</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Departamento</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Ação</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((u, i) => (
                  <tr
                    key={u.email}
                    className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{u.nome}</div>
                      <div className="text-xs text-slate-400">{u.matricula}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{u.email}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        {u.departamento}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge usuario={u} />
                    </td>
                    <td className="px-4 py-3 text-right">{renderAcaoResultado(u)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {query.trim().length < 2 && (
          <div className="text-center py-8 text-slate-400 text-sm">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Digite ao menos 2 caracteres para iniciar a busca.
          </div>
        )}
      </div>

      {/* ── Seção: Administradores atuais ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900">Administradores Ativos</h2>
            {!carregandoAdmins && (
              <span className="text-xs text-slate-400 font-normal">({admins.length})</span>
            )}
          </div>
          <button
            onClick={carregarAdmins}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${carregandoAdmins ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {renderAdminsContent()}
      </div>

      {revogarTarget && (
        <ConfirmRevogarModal
          usuario={revogarTarget}
          onConfirm={handleRevogar}
          onCancel={() => setRevogarTarget(null)}
          loading={revogarLoading}
        />
      )}
    </div>
  );
}
