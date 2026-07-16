// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../../test/utils';
import Comunicados from './Comunicados';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'token-admin' }),
}));

vi.mock('../../components/EditorComunicado', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea
      aria-label="Corpo do comunicado"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

const comunicadoAgendado = {
  id: 9,
  assunto: 'Campanha bem estar',
  corpo_html: '<p>Mensagem</p>',
  enviado_por: 'Admin',
  status: 'agendado',
  status_label: 'Agendado',
  agendado_para: '2026-07-20T10:00:00-03:00',
  agendado_para_formatado: '20/07/2026 10:00',
  enviado_em: null,
  cancelado_em: null,
  total_destinatarios: 2,
  tentativas_envio: 0,
  erro_envio: '',
};

function comunicadosPage(results = [comunicadoAgendado]) {
  return {
    count: results.length,
    page: 1,
    page_size: 10,
    total_pages: 1,
    results,
  };
}

describe('Comunicados', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('envia um comunicado imediato e recarrega o historico', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(comunicadosPage()))
      .mockResolvedValueOnce(jsonResponse({ total_enviado: 2 }))
      .mockResolvedValueOnce(jsonResponse(comunicadosPage([])));
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter><Comunicados /></MemoryRouter>);

    expect(await screen.findByText('Campanha bem estar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /novo comunicado/i }));
    fireEvent.change(screen.getByPlaceholderText(/massagem expressa/i), {
      target: { value: 'Aviso de agenda' },
    });
    fireEvent.change(screen.getByLabelText(/corpo do comunicado/i), {
      target: { value: '<p>Horarios liberados</p>' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /enviar agora/i })[0]);
    const botoesConfirmar = screen.getAllByRole('button', { name: /^enviar agora$/i });
    fireEvent.click(botoesConfirmar[botoesConfirmar.length - 1]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/comunicados/'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Aviso de agenda'),
        }),
      );
    });
    expect(await screen.findByText(
      /comunicado enviado para 2 destinatarios/i,
    )).toBeInTheDocument();
  });

  it('cancela um comunicado agendado apos confirmacao', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(comunicadosPage()))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse(comunicadosPage([])));
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter><Comunicados /></MemoryRouter>);

    expect(await screen.findByText('Campanha bem estar')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle(/cancelar agendamento/i));
    expect(screen.getByText(/cancelar o agendamento/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/comunicados/9/'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
    expect(await screen.findByText(/comunicado excluido/i)).toBeInTheDocument();
  });
});
