// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminEventosApi, type EventoDTO } from '../../services/api';
import { renderRoute } from '../../test/utils';
import EditarEvento from './EditarEvento';

vi.mock('../../components/EditorEmailConvite', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea
      aria-label="Mensagem do convite"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

const evento: EventoDTO = {
  id: 4,
  titulo: 'Yoga laboral',
  tipo: 'yoga',
  data: '2026-07-22',
  hora_inicio: '08:00:00',
  hora_fim: '09:00:00',
  duracao_sessao: 30,
  capacidade_por_horario: 3,
  status: 'PUBLICADO',
  imagem_url: '',
  corpo_email: '<p>Convite</p>',
  nome_profissional: 'Joao',
  palavra_chave: 'YOGA',
  horarios: [],
  emails_enviados_em: null,
};

describe('EditarEvento', () => {
  beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()));

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('carrega o evento e salva as alteracoes', async () => {
    vi.spyOn(adminEventosApi, 'obter').mockResolvedValue(evento);
    vi.spyOn(adminEventosApi, 'atualizar').mockResolvedValue({
      ...evento,
      titulo: 'Yoga atualizada',
    });

    renderRoute(<EditarEvento />, '/admin/eventos/:id/editar', '/admin/eventos/4/editar');
    expect(await screen.findByDisplayValue('Yoga laboral')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/nome do evento/i), {
      target: { value: 'Yoga atualizada' },
    });
    fireEvent.change(screen.getByLabelText(/tipo de atividade/i), {
      target: { value: 'pilates' },
    });
    fireEvent.change(screen.getByLabelText(/palavra-chave/i), {
      target: { value: 'PILATES' },
    });
    fireEvent.change(screen.getByLabelText(/mensagem do convite/i), {
      target: { value: '<p>Novo texto</p>' },
    });
    fireEvent.change(document.querySelector('#hora-inicio') as HTMLInputElement, {
      target: { value: '08:30' },
    });
    fireEvent.change(document.querySelector('#hora-fim') as HTMLInputElement, {
      target: { value: '09:30' },
    });
    fireEvent.change(document.querySelector('#duracao-sessao') as HTMLInputElement, {
      target: { value: '20' },
    });
    fireEvent.change(document.querySelector('#capacidade-horario') as HTMLInputElement, {
      target: { value: '4' },
    });
    fireEvent.click(screen.getByRole('button', {
      name: /salvar alterações/i,
    }));

    await waitFor(() => {
      expect(adminEventosApi.atualizar).toHaveBeenCalledWith(4, expect.objectContaining({
        titulo: 'Yoga atualizada',
        tipo: 'pilates',
        hora_inicio: '08:30',
        hora_fim: '09:30',
        duracao_sessao: 20,
        capacidade_por_horario: 4,
        palavra_chave: 'PILATES',
        corpo_email: '<p>Novo texto</p>',
      }));
    });
  });

  it('bloqueia a edicao quando o e-mail ja foi disparado', async () => {
    vi.spyOn(adminEventosApi, 'obter').mockResolvedValue({
      ...evento,
      emails_enviados_em: '20/07/2026 08:00',
    });

    renderRoute(<EditarEvento />, '/admin/eventos/:id/editar', '/admin/eventos/4/editar');

    expect(await screen.findByText(
      /e-mail já disparado/i,
    )).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /salvar/i })).not.toBeInTheDocument();
  });
});
