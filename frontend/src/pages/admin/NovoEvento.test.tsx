// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminEventosApi } from '../../services/api';
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

function renderPage() {
  return render(<MemoryRouter><NovoEvento /></MemoryRouter>);
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

describe('NovoEvento', () => {
  beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()));

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('valida os campos obrigatorios', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /criar evento/i }));

    expect(screen.getByText(
      /nome do evento é obrigatório/i,
    )).toBeInTheDocument();
    expect(screen.getByText(/selecione o tipo/i)).toBeInTheDocument();
    expect(screen.getByText(/selecione a data/i)).toBeInTheDocument();
    expect(globalThis.scrollTo).toHaveBeenCalled();
  });

  it('cria o evento e dispara os convites imediatamente', async () => {
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
    renderPage();

    fireEvent.change(screen.getByLabelText(/nome do evento/i), {
      target: { value: 'Yoga laboral' },
    });
    fireEvent.change(screen.getByLabelText(/tipo de atividade/i), {
      target: { value: 'yoga' },
    });
    fireEvent.change(document.querySelector('#hora_inicio') as HTMLInputElement, {
      target: { value: '08:00' },
    });
    fireEvent.change(document.querySelector('#hora_fim') as HTMLInputElement, {
      target: { value: '09:00' },
    });
    fireEvent.change(document.querySelector('#duracao_sessao') as HTMLInputElement, {
      target: { value: '30' },
    });
    fireEvent.change(screen.getByLabelText(/capacidade/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/palavra-chave/i), {
      target: { value: 'YOGA' },
    });
    fireEvent.change(screen.getByLabelText(/mensagem do e-mail/i), {
      target: { value: '<p>Participe</p>' },
    });
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
    expect(adminEventosApi.enviarEmails).toHaveBeenCalledWith(31, {
      modo_envio: 'imediato',
    });
  });
});
