// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, renderRoute } from '../../test/utils';
import EventDetails from './EventDetails';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'token-colaborador' }),
}));

vi.mock('../../components/ModalDetalhesAgendamento', () => ({
  default: ({
    ag,
    modo,
    onClose,
    onConfirmarReserva,
    onAlterarHorario,
  }: {
    ag: { evento_titulo: string; horario: { hora_inicio: string; hora_fim: string } };
    modo: string;
    onClose: () => void;
    onConfirmarReserva?: (otp: string) => void;
    onAlterarHorario?: () => void;
  }) => (
    <section role="dialog" aria-label="Detalhes do agendamento">
      <p>{ag.evento_titulo}</p>
      <p>{modo}</p>
      <p>{ag.horario.hora_inicio} - {ag.horario.hora_fim}</p>
      {onConfirmarReserva && (
        <button type="button" onClick={() => onConfirmarReserva('123456')}>
          Confirmar reserva mock
        </button>
      )}
      {onAlterarHorario && (
        <button type="button" onClick={onAlterarHorario}>Alterar pelo modal</button>
      )}
      <button type="button" onClick={onClose}>Fechar modal</button>
    </section>
  ),
}));

const evento = {
  id: 7,
  titulo: 'Massagem expressa',
  tipo: 'massagem',
  descricao: 'Sessao de bem estar',
  nome_profissional: 'Ana Souza',
  data: '2026-07-20',
  hora_inicio: '09:00:00',
  hora_fim: '10:00:00',
  capacidade_por_horario: 2,
  horarios: [
    {
      id: 11,
      hora_inicio: '09:00:00',
      hora_fim: '09:30:00',
      vagas_disponiveis: 2,
      vagas_livres: 2,
      vagas_ocupadas: 0,
      disponivel: true,
      reservado_para_fila: false,
    },
    {
      id: 12,
      hora_inicio: '09:30:00',
      hora_fim: '10:00:00',
      vagas_disponiveis: 0,
      vagas_livres: 0,
      vagas_ocupadas: 2,
      disponivel: false,
      reservado_para_fila: false,
    },
  ],
};

describe('EventDetails', () => {
  beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()));

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('seleciona um horario e confirma a reserva', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/reservar/')) {
        expect(init?.method).toBe('POST');
        expect(init?.body).toBe(JSON.stringify({ alterar: false, otp: '123456' }));
        return Promise.resolve(jsonResponse({ id: 100 }));
      }
      if (url.includes('/colaborador/eventos/7/')) return Promise.resolve(jsonResponse(evento));
      if (url.includes('/colaborador/agendamentos/')) return Promise.resolve(jsonResponse([]));
      if (url.includes('/colaborador/lista-espera/')) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderRoute(<EventDetails />, '/colaborador/eventos/:id', '/colaborador/eventos/7');
    expect(await screen.findByRole('heading', { name: 'Massagem expressa' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /09:00/i }));
    expect(screen.getByRole('dialog', { name: /detalhes do agendamento/i })).toBeInTheDocument();
    expect(screen.getByText('confirmacao')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva mock/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/colaborador/eventos/7/horarios/11/reservar/'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('entra e sai da fila de espera de um horario lotado', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/colaborador/horarios/12/lista-espera/') && init?.method === 'POST') {
        return Promise.resolve(jsonResponse({
          posicao: 1,
          total_na_fila: 1,
          status: 'aguardando',
        }));
      }
      if (url.includes('/colaborador/horarios/12/lista-espera/') && init?.method === 'DELETE') {
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      if (url.includes('/colaborador/eventos/7/')) return Promise.resolve(jsonResponse(evento));
      if (url.includes('/colaborador/agendamentos/')) return Promise.resolve(jsonResponse([]));
      if (url.includes('/colaborador/lista-espera/')) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderRoute(<EventDetails />, '/colaborador/eventos/:id', '/colaborador/eventos/7');
    expect(await screen.findByRole('heading', { name: 'Massagem expressa' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /entrar na fila/i }));
    await waitFor(() => expect(screen.getByText(/1.*lugar/i)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/colaborador/horarios/12/lista-espera/'),
      expect.objectContaining({ method: 'POST' }),
    );

    fireEvent.click(screen.getByRole('button', { name: /sair da fila/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/colaborador/horarios/12/lista-espera/'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});
