import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import Login from './Login';
import LoginColaborador from './LoginColaborador';
import Dashboard from './admin/Dashboard';
import AdminEventos from './admin/EventosAgendados';
import NovoEvento from './admin/NovoEvento';
import EditarEvento from './admin/EditarEvento';
import GestaoUsuarios from './admin/GestaoUsuarios';
import Comunicados from './admin/Comunicados';
import Manual from './admin/Manual';
import Penalidades from './admin/Penalidades';
import Relatorios from './admin/Relatorios';
import AcessoViaToken from './AcessoViaToken';
import AcessarEvento from './AcessarEvento';
import ConfirmarVagaListaEspera from './ConfirmarVagaListaEspera';
import EventDetails from './colaborador/EventDetails';
import Confirmacao from './colaborador/Confirmacao';
import AdminLayout from '../layouts/AdminLayout';
import ColaboradorLayout from '../layouts/ColaboradorLayout';
import ProtectedRoute from '../components/ProtectedRoute';

vi.mock('react-quill-new', () => ({
  default: () => null,
}));

function createLocalStorageMock(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

const usuarioAdmin = {
  id: 1,
  email: 'admin@aeb.gov.br',
  nome: 'Admin',
  is_admin: true,
  is_superuser: true,
  matricula: '123',
  departamento: 'CTI',
};

function renderWithAuth(element: React.ReactNode, initialEntries = ['/admin']) {
  return renderToString(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>{element}</AuthProvider>
    </MemoryRouter>,
  );
}

describe('renderizacao inicial das telas principais', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'localStorage',
      createLocalStorageMock({
        access_token: 'token',
        usuario: JSON.stringify(usuarioAdmin),
      }),
    );
  });

  it('renderiza login administrativo', () => {
    const html = renderWithAuth(<Login />, ['/admin/login']);

    expect(html).toContain('Agenda Bem-Estar');
    expect(html).toContain('Acesso Restrito');
  });

  it('renderiza login do colaborador', () => {
    const html = renderToString(<LoginColaborador />);

    expect(html).toContain('Agenda Bem-Estar');
    expect(html).toContain('Palavra-chave');
  });

  it('renderiza dashboard em estado inicial', () => {
    const html = renderWithAuth(<Dashboard />);

    expect(html).toContain('Vis');
    expect(html).toContain('Criar Novo Evento');
  });

  it('renderiza layout administrativo com menu de superadmin', () => {
    const html = renderWithAuth(<AdminLayout />);

    expect(html).toContain('Painel Administrativo');
    expect(html).toContain('Gest');
    expect(html).toContain('Comunicados');
  });

  it('renderiza layout de colaborador autenticado', () => {
    const html = renderWithAuth(<ColaboradorLayout />, ['/colaborador/eventos']);

    expect(html).toContain('Agenda Bem-Estar');
    expect(html).toContain('Sistema Interno');
  });

  it('renderiza conteudo protegido para usuario autenticado', () => {
    const html = renderWithAuth(
      <ProtectedRoute adminOnly>
        <span>Conteudo protegido</span>
      </ProtectedRoute>,
    );

    expect(html).toContain('Conteudo protegido');
  });

  it.each([
    ['eventos agendados', <AdminEventos />, ['/admin/agendamentos']],
    ['novo evento', <NovoEvento />, ['/admin/eventos/novo']],
    ['editar evento', <EditarEvento />, ['/admin/eventos/1/editar']],
    ['gestao de usuarios', <GestaoUsuarios />, ['/admin/gestao-usuarios']],
    ['comunicados', <Comunicados />, ['/admin/comunicados']],
    ['manual', <Manual />, ['/admin/manual']],
    ['penalidades', <Penalidades />, ['/admin/penalidades']],
    ['relatorios', <Relatorios />, ['/admin/relatorios']],
    ['acesso via token', <AcessoViaToken />, ['/acesso/abc']],
    ['acessar evento', <AcessarEvento />, ['/evento/10/entrar']],
    ['confirmar vaga', <ConfirmarVagaListaEspera />, ['/confirmar-vaga/abc']],
    ['detalhe do evento', <EventDetails />, ['/colaborador/eventos/10']],
    ['confirmacao', <Confirmacao />, ['/colaborador/confirmacao']],
  ])('renderiza %s sem quebrar', (_nome, element, route) => {
    const html = renderWithAuth(element, route);

    expect(html.length).toBeGreaterThan(0);
  });
});
