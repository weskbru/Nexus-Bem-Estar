// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Confirmacao from './Confirmacao';

const authMocks = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ logout: authMocks.logout }),
}));

function renderConfirmacao(state: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/colaborador/confirmacao', state }]}>
      <Routes>
        <Route path="/colaborador/confirmacao" element={<Confirmacao />} />
        <Route path="/login" element={<section>Login colaborador</section>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Confirmacao do colaborador', () => {
  afterEach(() => {
    cleanup();
    authMocks.logout.mockReset();
  });

  it('renderiza o sucesso e permite sair', async () => {
    renderConfirmacao({
      status: 'sucesso',
      evento: {
        id: 12,
        titulo: 'Pilates',
        tipo: 'pilates',
        data: '2026-08-21',
        hora_inicio: '09:00:00',
        hora_fim: '10:00:00',
        nome_profissional: 'Ana',
        local: 'AEB',
      },
    });

    expect(await screen.findByText(
      /confirmação recebida/i,
    )).toBeInTheDocument();
    expect(screen.getByText('Pilates')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /sair/i }));
    expect(authMocks.logout).toHaveBeenCalled();
    expect(await screen.findByText('Login colaborador')).toBeInTheDocument();
  });

  it('renderiza os estados cancelado e erro', async () => {
    renderConfirmacao({
      status: 'cancelado',
      evento: {
        id: 13,
        titulo: 'Yoga',
        tipo: 'yoga',
        data: '2026-08-22',
        hora_inicio: '09:00:00',
        hora_fim: '10:00:00',
        nome_profissional: 'Ana',
        local: 'AEB',
      },
    });

    expect(await screen.findByText(
      /participação cancelada/i,
    )).toBeInTheDocument();

    cleanup();
    renderConfirmacao({ status: 'erro', mensagem: 'Token expirado' });
    expect(await screen.findByText(
      /erro na confirmação/i,
    )).toBeInTheDocument();
    expect(screen.getByText('Token expirado')).toBeInTheDocument();
  });
});
