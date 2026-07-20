// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';

vi.mock('./Relatorios', () => ({
  default: () => <section>Relatorios mock</section>,
}));

describe('Dashboard administrativo', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('carrega as metricas operacionais', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      total_vagas: 123,
      vagas_ocupadas: 45,
      taxa_ocupacao: 37,
      total_eventos_ativos: 2,
      vagas_disponiveis: 78,
      proximo_evento: {
        id: 10,
        titulo: 'Massagem laboral',
        data: '2026-07-20',
        hora_inicio: '09:00:00',
        hora_fim: '10:00:00',
        total_vagas: 20,
        vagas_ocupadas: 15,
        vagas_livres: 5,
      },
      pendencias: {
        total: 7,
        eventos_presenca_pendente: 2,
        pessoas_fila: 4,
        falhas_email: 1,
      },
      agendamentos_recentes: [],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
    localStorage.setItem('access_token', 'token');

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(await screen.findByText('Massagem laboral')).toBeInTheDocument();
    expect(screen.getByText('123 vagas no total da agenda')).toBeInTheDocument();
    expect(screen.getByText('78 livres')).toBeInTheDocument();
    expect(screen.getByText('45 ocupadas')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('eventos')).toBeInTheDocument();
    expect(screen.queryByText('+5%')).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('mostra erro quando a sincronizacao falha', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(await screen.findByText(/sincronizar/i)).toBeInTheDocument();
  });
});
