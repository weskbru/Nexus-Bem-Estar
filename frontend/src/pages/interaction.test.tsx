// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import Login from './Login';
import LoginColaborador from './LoginColaborador';
import Dashboard from './admin/Dashboard';

vi.mock('./admin/Relatorios', () => ({
  default: () => <section>Relatorios mock</section>,
}));

const usuarioAdmin = {
  id: 1,
  email: 'admin@aeb.gov.br',
  nome: 'Admin',
  is_admin: true,
  is_superuser: false,
  matricula: '123',
  departamento: 'CTI',
};

function renderWithProviders(element: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AuthProvider>{element}</AuthProvider>
    </MemoryRouter>,
  );
}

describe('interacoes principais', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('valida campos obrigatorios do login admin', async () => {
    const { container } = renderWithProviders(<Login />);

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    expect(screen.getByText(/preencha/i)).toBeInTheDocument();
  });

  it('faz login admin e salva a sessao', async () => {
    const user = userEvent.setup();
    vi.spyOn(authApi, 'login').mockResolvedValue({
      access: 'access-token',
      refresh: 'refresh-token',
      usuario: usuarioAdmin,
    });

    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText(/e-mail corporativo/i), 'admin@aeb.gov.br');
    await user.type(document.querySelector('#password') as HTMLInputElement, 'senha');
    await user.click(screen.getByRole('button', { name: /entrar no sistema/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('admin@aeb.gov.br', 'senha');
    });
    expect(localStorage.getItem('access_token')).toBe('access-token');
  });

  it('alterna visibilidade da senha no login admin', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const senha = document.querySelector('#password') as HTMLInputElement;
    expect(senha).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /mostrar senha/i }));

    expect(senha).toHaveAttribute('type', 'text');
  });

  it('valida e conclui fluxo simulado do login colaborador', async () => {
    const { container } = render(<LoginColaborador />);

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    expect(screen.getByText(/^Preencha e-mail/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/e-mail corporativo/i), {
      target: { value: 'colaborador@aeb.gov.br' },
    });
    fireEvent.change(document.querySelector('#palavraChave') as HTMLInputElement, {
      target: { value: 'convite' },
    });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    expect(screen.getByText(/autenticando/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrar no sistema/i })).toBeEnabled();
    }, { timeout: 2500 });
  });

  it('carrega metricas do dashboard', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({
          total_vagas: 123,
          vagas_ocupadas: 45,
          taxa_ocupacao: 37,
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    localStorage.setItem('access_token', 'token');

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText('123')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('37%')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('mostra erro quando dashboard falha', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 500 })),
    );

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/sincronizar/i)).toBeInTheDocument();
  });
});
