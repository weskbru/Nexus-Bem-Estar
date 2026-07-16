// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi, type UsuarioDTO } from '../services/api';
import { renderRoute } from '../test/utils';
import AcessoViaToken from './AcessoViaToken';

const authMocks = vi.hoisted(() => ({ loginViaToken: vi.fn() }));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ loginViaToken: authMocks.loginViaToken }),
}));

const usuario: UsuarioDTO = {
  id: 1,
  email: 'admin@aeb.gov.br',
  nome: 'Admin',
  is_admin: true,
  is_superuser: false,
  matricula: '123',
  departamento: 'CTI',
};

describe('AcessoViaToken', () => {
  beforeEach(() => {
    localStorage.clear();
    authMocks.loginViaToken.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('confirma o acesso por token com palavra-chave', async () => {
    vi.spyOn(authApi, 'verificarToken').mockResolvedValue({
      requer_palavra_chave: true,
      evento_titulo: 'Massagem expressa',
      evento_tipo: 'massagem',
      evento_data: '2026-07-30',
      evento_hora_inicio: '09:00:00',
      evento_hora_fim: '10:00:00',
      nome_profissional: 'Ana',
    });
    vi.spyOn(authApi, 'acessoViaTokenComChave').mockResolvedValue({
      access: 'token-evento',
      refresh: 'refresh-evento',
      evento_id: 20,
      chave_mensagem: 'ok',
      usuario,
    });

    renderRoute(<AcessoViaToken />, '/acesso/:token', '/acesso/abc');
    expect(await screen.findByText('Massagem expressa')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/palavra-chave do convite/i), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', {
      name: /acessar inscrição/i,
    }));
    expect(screen.getByText(
      /palavra-chave é obrigatória/i,
    )).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/palavra-chave do convite/i), {
      target: { value: 'MASSAGEM' },
    });
    fireEvent.click(screen.getByRole('button', {
      name: /acessar inscrição/i,
    }));

    await waitFor(() => {
      expect(authApi.acessoViaTokenComChave).toHaveBeenCalledWith('abc', 'MASSAGEM');
    });
    expect(localStorage.getItem('access_token')).toBe('token-evento');
    expect(await screen.findByText(/acesso liberado/i)).toBeInTheDocument();
  });
});
