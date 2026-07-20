import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Bell,
  HelpCircle,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Megaphone,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminNotificacoesApi } from '../services/api';

type NotificacaoItem = {
  id: string;
  titulo: string;
  subtitulo: string;
  data_hora: string;
  categoria: 'agendamento' | 'evento_publicado';
};

const NOTIFICACOES_REFRESH_MS = 30000;
const NOTIFICACOES_DEDUP_MS = 15000;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/agendamentos', icon: Calendar, label: 'Agendamentos', end: false },
  { to: '/admin/comunicados', icon: Megaphone, label: 'Comunicados', end: false },
  { to: '/admin/penalidades', icon: ShieldAlert, label: 'Penalidades', end: false },
];

export default function AdminLayout() {
  const { usuario, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);
  const [abrirNotificacoes, setAbrirNotificacoes] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const notificacoesRef = useRef<HTMLDivElement | null>(null);
  const ultimaConsultaNotificacoesRef = useRef(0);

  function handleLogout() {
    setMenuAberto(false);
    logout();
    navigate('/admin/login');
  }

  useEffect(() => {
    fetchNotificacoes();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (!document.hidden) fetchNotificacoes();
    }, NOTIFICACOES_REFRESH_MS);

    function handleFocus() {
      fetchNotificacoes();
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        fetchNotificacoes();
      }
    }

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (abrirNotificacoes) {
      fetchNotificacoes();
    }
  }, [abrirNotificacoes]);

  useEffect(() => {
    if (!abrirNotificacoes) return;

    function handleClickFora(event: MouseEvent) {
      if (!notificacoesRef.current) return;
      if (!notificacoesRef.current.contains(event.target as Node)) {
        setAbrirNotificacoes(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAbrirNotificacoes(false);
      }
    }

    document.addEventListener('mousedown', handleClickFora);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickFora);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [abrirNotificacoes]);

  useEffect(() => {
    if (!menuAberto) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuAberto(false);
    }

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuAberto]);

  async function fetchNotificacoes(forcar = false) {
    const agora = Date.now();
    if (
      !forcar &&
      agora - ultimaConsultaNotificacoesRef.current < NOTIFICACOES_DEDUP_MS
    ) {
      return;
    }
    ultimaConsultaNotificacoesRef.current = agora;

    try {
      const { confirmacoes, eventos } = await adminNotificacoesApi.obter();

      const confirmacoesItens: NotificacaoItem[] = confirmacoes
        .map((confirmacao) => ({
          id: `agendamento-evento-${confirmacao.evento_id}`,
          titulo: `${confirmacao.quantidade} ${confirmacao.quantidade === 1 ? 'agendamento confirmado' : 'agendamentos confirmados'}`,
          subtitulo: confirmacao.evento_titulo,
          data_hora: confirmacao.ultima_confirmacao,
          categoria: 'agendamento',
        }));

      const eventosItens: NotificacaoItem[] = eventos
        .filter((e) => {
          const status = e.status.toUpperCase();
          return status === 'ATIVO' || status === 'PUBLICADO';
        })
        .map((e) => ({
          id: `evento-${e.id}`,
          titulo: e.titulo,
          subtitulo: 'Evento publicado para agendamento',
          data_hora: `${e.data}T${e.hora_inicio}`,
          categoria: 'evento_publicado',
        }));

      const itens = [...confirmacoesItens, ...eventosItens]
        .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())
        .slice(0, 8);

      setNotificacoes(itens);
    } catch {
      setNotificacoes([]);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {menuAberto && (
        <button
          type="button"
          aria-label="Fechar menu principal"
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] xl:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        data-testid="admin-sidebar"
        className={`w-72 xl:w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 left-0 z-50 overflow-x-hidden shadow-2xl xl:shadow-none transition-transform duration-300 ease-out xl:translate-x-0 xl:visible ${
          menuAberto ? 'translate-x-0 visible' : '-translate-x-full invisible'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 xl:px-6 border-b border-slate-200">
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 leading-tight truncate">Agenda Bem-Estar</div>
            <div className="text-xs text-slate-500 truncate">Painel Administrativo</div>
          </div>
          <button
            type="button"
            onClick={() => setMenuAberto(false)}
            className="xl:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Navegação administrativa" className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuAberto(false)}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-5 h-5 mr-3 shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}

          {isSuperAdmin && (
            <NavLink
              to="/admin/gestao-usuarios"
              end={false}
              onClick={() => setMenuAberto(false)}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <ShieldCheck className="w-5 h-5 mr-3 shrink-0" />
              <span className="truncate">Gestão de Usuários</span>
            </NavLink>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-blue-700">
                {usuario?.nome?.charAt(0).toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{usuario?.nome ?? 'Administrador'}</div>
              <div className="text-xs text-slate-500 truncate">{usuario?.email ?? ''}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="text-slate-400 hover:text-red-600 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 ml-0 xl:ml-64 flex flex-col min-h-screen transition-[margin] duration-300">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between xl:justify-end px-4 sm:px-6 xl:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0 xl:hidden">
            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-700 transition-colors"
              aria-label="Abrir menu principal"
              aria-expanded={menuAberto}
              aria-controls="admin-sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">Agenda Bem-Estar</p>
              <p className="hidden sm:block truncate text-xs text-slate-500">Painel Administrativo</p>
            </div>
          </div>

          <div ref={notificacoesRef} className="relative flex items-center gap-4 text-slate-500">
            <button
              onClick={() => setAbrirNotificacoes((v) => !v)}
              className="hover:text-slate-700 relative"
              title="Notificações"
            >
              <Bell className="w-5 h-5" />
              {notificacoes.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 rounded-full text-[10px] leading-4 text-white text-center">
                  {notificacoes.length}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/admin/manual')}
              className="hover:text-slate-700"
              title="Manual do Sistema"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            <div
              className="xl:hidden flex items-center gap-2 pl-3 border-l border-slate-200"
              title={`${usuario?.nome ?? 'Administrador'} — ${usuario?.email ?? ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-blue-700">
                  {usuario?.nome?.charAt(0).toUpperCase() ?? 'A'}
                </span>
              </div>
              <div className="hidden md:block min-w-0 max-w-32">
                <p className="truncate text-xs font-bold text-slate-700">
                  {usuario?.nome ?? 'Administrador'}
                </p>
                <p className="truncate text-[10px] text-slate-400">Administrador</p>
              </div>
            </div>

            {abrirNotificacoes && (
              <div className="absolute right-0 top-10 w-[calc(100vw-2rem)] max-w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-900">Notificações</h3>
                  <button
                    onClick={() => fetchNotificacoes(true)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Atualizar
                  </button>
                </div>

                {notificacoes.length === 0 ? (
                  <p className="text-sm text-slate-500 py-3">Sem notificações no momento.</p>
                ) : (
                  <ul className="space-y-2">
                    {notificacoes.map((n) => (
                      <li key={n.id} className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-sm text-slate-800 font-medium truncate">{n.titulo}</p>
                        <p className="text-xs text-slate-600 truncate">{n.subtitulo}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {n.categoria === 'evento_publicado' ? 'Evento publicado' : 'Última confirmação'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(n.data_hora)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 xl:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
