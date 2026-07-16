// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../test/utils';
import AdminLayout from './AdminLayout';

const authMocks = vi.hoisted(() => ({
  logout: vi.fn(),
  usuario: {
    id: 1,
    nome: 'Admin Master',
    email: 'admin@aeb.gov.br',
    is_admin: true,
    is_superuser: true,
    matricula: '123',
    departamento: 'CTI',
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    token: 'token',
    usuario: authMocks.usuario,
    isSuperAdmin: true,
    logout: authMocks.logout,
  }),
}));

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<section>Conteudo dashboard</section>} />
        </Route>
        <Route path="/admin/manual" element={<section>Manual aberto</section>} />
        <Route path="/admin/login" element={<section>Login admin</section>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'token');
    authMocks.logout.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renderiza notificacoes agrupadas e executa atalhos', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/admin/notificacoes/')) {
        return Promise.resolve(jsonResponse({
          confirmacoes: [{
            evento_id: 1,
            evento_titulo: 'Massagem',
            quantidade: 3,
            ultima_confirmacao: '2026-08-20T10:00:00-03:00',
          }],
          eventos: [{
            id: 2,
            titulo: 'Yoga laboral',
            data: '2026-08-21',
            hora_inicio: '09:00:00',
            status: 'PUBLICADO',
          }],
        }));
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderLayout();

    expect(screen.getByText('Conteudo dashboard')).toBeInTheDocument();
    expect(screen.getByText(/gestão de usuários/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/notificacoes/'),
        expect.any(Object),
      );
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/admin/dashboard/'),
      expect.any(Object),
    );

    fireEvent.click(screen.getByTitle(/notificações/i));
    expect(await screen.findByText('3 agendamentos confirmados')).toBeInTheDocument();
    expect(screen.getByText('Massagem')).toBeInTheDocument();
    expect(screen.getByText('Yoga laboral')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle(/manual do sistema/i));
    expect(await screen.findByText('Manual aberto')).toBeInTheDocument();
  });
});
