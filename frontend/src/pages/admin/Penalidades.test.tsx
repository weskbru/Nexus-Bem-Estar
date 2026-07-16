// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminPenalidadesApi, type PenalidadeDTO } from '../../services/api';
import Penalidades from './Penalidades';

const penalidadeAtiva: PenalidadeDTO = {
  id: 10,
  usuario: {
    id: 9,
    email: 'faltou@aeb.gov.br',
    nome: 'Usuario Faltante',
    is_admin: false,
    is_superuser: false,
    matricula: '999',
    departamento: 'Operacoes',
  },
  ativa: true,
  evento_origem_titulo: 'Massagem',
  evento_punicao_titulo: 'Yoga',
  evento_punicao_status: 'PUBLICADO',
  criada_em: '2026-07-01T10:00:00-03:00',
  revogada_em: null,
  motivo_revogacao: '',
};

describe('Penalidades', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('lista, filtra e revoga uma penalidade com motivo', async () => {
    vi.spyOn(adminPenalidadesApi, 'listar').mockResolvedValue([penalidadeAtiva]);
    vi.spyOn(adminPenalidadesApi, 'revogar').mockResolvedValue({
      ...penalidadeAtiva,
      ativa: false,
    });

    render(<Penalidades />);
    expect(await screen.findByText('Usuario Faltante')).toBeInTheDocument();
    expect(adminPenalidadesApi.listar).toHaveBeenCalledWith({ ativa: true });

    fireEvent.click(screen.getByRole('button', { name: /^todas$/i }));
    await waitFor(() => {
      expect(adminPenalidadesApi.listar).toHaveBeenCalledWith(undefined);
    });

    fireEvent.click(screen.getByRole('button', { name: /^revogar$/i }));
    fireEvent.change(screen.getByPlaceholderText(/falta justificada/i), {
      target: { value: 'Falta justificada' },
    });
    fireEvent.click(screen.getByRole('button', {
      name: /confirmar revogação/i,
    }));

    await waitFor(() => {
      expect(adminPenalidadesApi.revogar).toHaveBeenCalledWith(10, 'Falta justificada');
    });
    expect(await screen.findByText(/penalidade de/i)).toBeInTheDocument();
  });
});
