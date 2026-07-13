// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminEventosApi } from '../../services/api';
import Comunicados from './Comunicados';
import NovoEvento from './NovoEvento';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'token-admin' }),
}));

vi.mock('../../components/EditorEmailConvite', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea
      aria-label="Mensagem do e-mail"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
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

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

function comunicadosPage(results = [comunicadoAgendado]) {
  return {
    count: results.length,
    page: 1,
    page_size: 10,
    total_pages: 1,
    results,
  };
}

function renderAdminPage(element: React.ReactNode) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
}

function hojeIso() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
}

async function selecionarHojeNoCalendario() {
  const dia = String(new Date().getDate());
  const candidatos = screen.getAllByRole('button', { name: dia }) as HTMLButtonElement[];
  const botaoDiaAtual = candidatos.find((botao) => !botao.disabled);
  expect(botaoDiaAtual).toBeDefined();
  fireEvent.click(botaoDiaAtual as HTMLButtonElement);
}

describe('fluxos administrativos adicionais', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('scrollTo', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('valida campos obrigatorios antes de criar evento', () => {
    renderAdminPage(<NovoEvento />);

    fireEvent.click(screen.getByRole('button', { name: /criar evento/i }));

    expect(screen.getByText(/nome do evento e obrigatorio|nome do evento é obrigatório/i)).toBeInTheDocument();
    expect(screen.getByText(/selecione o tipo/i)).toBeInTheDocument();
    expect(screen.getByText(/selecione a data/i)).toBeInTheDocument();
    expect(globalThis.scrollTo).toHaveBeenCalled();
  });

  it('cria evento e dispara convites imediatamente', async () => {
    vi.spyOn(adminEventosApi, 'criar').mockResolvedValue({
      id: 31,
      titulo: 'Yoga laboral',
      tipo: 'yoga',
      data: hojeIso(),
      hora_inicio: '08:00',
      hora_fim: '09:00',
      duracao_sessao: 30,
      capacidade_por_horario: 3,
      status: 'publicado',
      imagem_url: '',
      corpo_email: '',
      nome_profissional: 'Ana',
      palavra_chave: 'YOGA',
      horarios: [],
    });
    vi.spyOn(adminEventosApi, 'enviarEmails').mockResolvedValue({ mensagem: 'ok' });

    renderAdminPage(<NovoEvento />);

    fireEvent.change(screen.getByLabelText(/nome do evento/i), { target: { value: 'Yoga laboral' } });
    fireEvent.change(screen.getByLabelText(/tipo de atividade/i), { target: { value: 'yoga' } });
    fireEvent.change(document.querySelector('#hora_inicio') as HTMLInputElement, { target: { value: '08:00' } });
    fireEvent.change(document.querySelector('#hora_fim') as HTMLInputElement, { target: { value: '09:00' } });
    fireEvent.change(document.querySelector('#duracao_sessao') as HTMLInputElement, { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/capacidade/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/palavra-chave/i), { target: { value: 'YOGA' } });
    fireEvent.change(screen.getByLabelText(/mensagem do e-mail/i), { target: { value: '<p>Participe</p>' } });
    await selecionarHojeNoCalendario();

    fireEvent.click(screen.getByRole('button', { name: /criar e enviar agora/i }));

    await waitFor(() => {
      expect(adminEventosApi.criar).toHaveBeenCalledWith(expect.objectContaining({
        titulo: 'Yoga laboral',
        tipo: 'yoga',
        capacidade_por_horario: 3,
        palavra_chave: 'YOGA',
        corpo_email: '<p>Participe</p>',
      }));
    });
    expect(adminEventosApi.enviarEmails).toHaveBeenCalledWith(31, { modo_envio: 'imediato' });
  });

  it('envia comunicado imediato e recarrega historico', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(comunicadosPage()))
      .mockResolvedValueOnce(jsonResponse({ total_enviado: 2 }))
      .mockResolvedValueOnce(jsonResponse(comunicadosPage([])));
    vi.stubGlobal('fetch', fetchMock);

    renderAdminPage(<Comunicados />);

    expect(await screen.findByText('Campanha bem estar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /novo comunicado/i }));
    fireEvent.change(screen.getByPlaceholderText(/massagem expressa/i), {
      target: { value: 'Aviso de agenda' },
    });
    fireEvent.change(screen.getByLabelText(/corpo do comunicado/i), {
      target: { value: '<p>Horarios liberados</p>' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /enviar agora/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /^enviar agora$/i }).at(-1) as HTMLElement);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/comunicados/'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Aviso de agenda'),
        }),
      );
    });
    expect(await screen.findByText(/comunicado enviado para 2 destinatarios/i)).toBeInTheDocument();
  });

  it('cancela comunicado agendado apos confirmacao', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(comunicadosPage()))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse(comunicadosPage([])));
    vi.stubGlobal('fetch', fetchMock);

    renderAdminPage(<Comunicados />);

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
