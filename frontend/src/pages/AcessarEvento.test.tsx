// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi, type UsuarioDTO } from '../services/api';
import { renderRoute } from '../test/utils';
import AcessarEvento from './AcessarEvento';

const authMocks = vi.hoisted(() => ({ loginViaEmail: vi.fn() }));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ loginViaEmail: authMocks.loginViaEmail }),
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

describe('AcessarEvento', () => {
  beforeEach(() => authMocks.loginViaEmail.mockReset());

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('acessa um evento publico com palavra-chave e ramal', async () => {
    vi.spyOn(authApi, 'eventoPublico').mockResolvedValue({
      id: 15,
      titulo: 'Pilates no trabalho',
      tipo: 'pilates',
      data: '2026-07-30',
      hora_inicio: '10:00:00',
      hora_fim: '11:00:00',
      nome_profissional: 'Ana',
      requer_palavra_chave: true,
    });
    vi.spyOn(authApi, 'acessarEvento').mockResolvedValue({
      access: 'access-token',
      refresh: 'refresh-token',
      evento_id: 15,
      usuario,
    });

    renderRoute(<AcessarEvento />, '/evento/:eventoId/entrar', '/evento/15/entrar');
    expect(await screen.findByText('Pilates no trabalho')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/e-mail corporativo/i), {
      target: { value: 'colaborador@aeb.gov.br' },
    });
    fireEvent.change(screen.getByLabelText(/ramal/i), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText(/palavra-chave do convite/i), {
      target: { value: 'PILATES' },
    });
    fireEvent.click(screen.getByRole('button', {
      name: /ver horários disponíveis/i,
    }));

    await waitFor(() => {
      expect(authApi.acessarEvento).toHaveBeenCalledWith(
        15,
        'colaborador@aeb.gov.br',
        'PILATES',
        '1234',
      );
    });
    expect(authMocks.loginViaEmail).toHaveBeenCalledWith('access-token', usuario);
  });
});
