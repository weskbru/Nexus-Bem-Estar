// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import Login from './Login';

const usuarioAdmin = {
  id: 1,
  email: 'admin@aeb.gov.br',
  nome: 'Admin',
  is_admin: true,
  is_superuser: false,
  matricula: '123',
  departamento: 'CTI',
};

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Login administrativo', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('valida os campos obrigatorios', () => {
    const { container } = renderLogin();

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    expect(screen.getByText(/preencha/i)).toBeInTheDocument();
  });

  it('autentica e salva a sessao', async () => {
    const user = userEvent.setup();
    vi.spyOn(authApi, 'login').mockResolvedValue({
      access: 'access-token',
      refresh: 'refresh-token',
      usuario: usuarioAdmin,
    });
    renderLogin();

    await user.type(screen.getByLabelText(/e-mail corporativo/i), 'admin@aeb.gov.br');
    await user.type(document.querySelector('#password') as HTMLInputElement, 'senha');
    await user.click(screen.getByRole('button', { name: /entrar no sistema/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('admin@aeb.gov.br', 'senha');
    });
    expect(localStorage.getItem('access_token')).toBe('access-token');
  });

  it('alterna a visibilidade da senha', async () => {
    const user = userEvent.setup();
    renderLogin();
    const senha = document.querySelector('#password') as HTMLInputElement;

    expect(senha).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: /mostrar senha/i }));
    expect(senha).toHaveAttribute('type', 'text');
  });
});
