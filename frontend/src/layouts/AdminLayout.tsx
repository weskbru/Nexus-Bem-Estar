import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Bell,
  HelpCircle,
  LogOut,
  ShieldCheck,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logoAeb from '../images/logoaeb.png';

type AgendamentoNotificacao = {
  id: number;
  colaborador_nome: string;
  servico: string;
  data_hora: string;
  status: 'DISPONIVEL' | 'OCUPADO' | 'CANCELADO';
};

type EventoResumo = {
  id: number;
  titulo: string;
  data: string;
  hora_inicio: string;
  status: string;
};

type NotificacaoItem = {
  id: string;
  titulo: string;
  subtitulo: string;
  data_hora: string;
  categoria: 'agendamento' | 'evento_publicado';
};

type DashboardResumo = {
  agendamentos: AgendamentoNotificacao[];
};

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api';
const NOTIFICACOES_REFRESH_MS = 30000;

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
];

export default function AdminLayout() {
  const { usuario, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);
  const [abrirNotificacoes, setAbrirNotificacoes] = useState(false);
  const notificacoesRef = useRef<HTMLDivElement | null>(null);

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  useEffect(() => {
    fetchNotificacoes();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchNotificacoes();
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

  async function fetchNotificacoes() {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [dashboardRes, eventosRes] = await Promise.all([
        fetch(`${API_BASE}/admin/dashboard/`, { headers }),
        fetch(`${API_BASE}/admin/eventos/`, { headers }),
      ]);

      const agendamentos: AgendamentoNotificacao[] = dashboardRes.ok
        ? ((await dashboardRes.json()) as DashboardResumo).agendamentos ?? []
        : [];
      const eventos: EventoResumo[] = eventosRes.ok
        ? await eventosRes.json()
        : [];

      const agendamentosItens: NotificacaoItem[] = agendamentos
        .filter((a) => a.status === 'OCUPADO')
        .map((a) => ({
          id: `agendamento-${a.id}`,
          titulo: a.colaborador_nome,
          subtitulo: a.servico,
          data_hora: a.data_hora,
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

      const itens = [...agendamentosItens, ...eventosItens]
        .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())
        .slice(0, 8);

      setNotificacoes(itens);
    } catch {
      setNotificacoes([]);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 left-0 z-20">
        <div className="h-20 flex items-center px-6 border-b border-slate-200">
          <img
            src={logoAeb}
            alt="Logo AEB"
            className="h-10 w-auto mr-3"
          />
          <div>
            <div className="font-semibold text-slate-900 leading-tight">Agenda Bem-Estar</div>
            <div className="text-xs text-slate-500">Painel Administrativo</div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-5 h-5 mr-3 shrink-0" />
              {label}
            </NavLink>
          ))}

          {isSuperAdmin && (
            <NavLink
              to="/admin/gestao-usuarios"
              end={false}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <ShieldCheck className="w-5 h-5 mr-3 shrink-0" />
              Gestão de Usuários
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
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-8 sticky top-0 z-10">
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

            {abrirNotificacoes && (
              <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-900">Notificações</h3>
                  <button
                    onClick={fetchNotificacoes}
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
                          {n.categoria === 'evento_publicado' ? 'Evento publicado' : 'Agendamento confirmado'}
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
        <main className="flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
