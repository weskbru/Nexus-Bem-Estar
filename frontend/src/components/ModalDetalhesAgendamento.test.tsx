// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../test/utils';
import ModalDetalhesAgendamento, { type AgendamentoDetalhes } from './ModalDetalhesAgendamento';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'token-colaborador' }),
}));

const agendamento: AgendamentoDetalhes = {
  id: 77,
  status: 'confirmado',
  evento_id: 30,
  evento_titulo: 'Massagem expressa',
  evento_data: '2026-08-20',
  nome_profissional: 'Ana Souza',
  horario: {
    hora_inicio: '10:00:00',
    hora_fim: '10:30:00',
  },
  criado_em: '2026-07-10T09:00:00-03:00',
};

describe('ModalDetalhesAgendamento', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('confirma uma reserva com OTP', async () => {
    const onConfirmarReserva = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ segundos_restantes: 120 }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <ModalDetalhesAgendamento
        ag={{ ...agendamento, status: 'pendente' }}
        modo="confirmacao"
        horarioId={55}
        onClose={vi.fn()}
        onCancelado={vi.fn()}
        onConfirmarReserva={onConfirmarReserva}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /confirmar agendamento/i }));
    expect(await screen.findByRole('heading', {
      name: /confirmar com código/i,
    })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/colaborador/horarios/55/solicitar-otp/'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reenviar: false }),
      }),
    );

    const inputs = document.querySelectorAll('input[inputmode="numeric"]');
    ['1', '2', '3', '4'].forEach((digito, index) => {
      fireEvent.change(inputs[index], { target: { value: digito } });
    });
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    expect(onConfirmarReserva).toHaveBeenCalledWith('1234');
  });

  it('cancela um agendamento confirmado', async () => {
    const onClose = vi.fn();
    const onCancelado = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ mensagem: 'cancelado' }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <ModalDetalhesAgendamento
        ag={agendamento}
        onClose={onClose}
        onCancelado={onCancelado}
        onAlterarHorario={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /cancelar agendamento/i }));
    expect(screen.getByText(/cancelar agendamento/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /sim, quero cancelar/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/colaborador/agendamentos/77/cancelar/'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
    expect(onCancelado).toHaveBeenCalledWith(77);
    expect(onClose).toHaveBeenCalled();
  });
});
