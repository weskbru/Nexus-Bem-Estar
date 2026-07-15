// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { adminDashboardApi, adminEventosApi, type AgendamentoResumoDTO, type EventoDTO } from '../../services/api';
import Relatorios from './Relatorios';

vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

const eventoBase: EventoDTO = {
  id: 1,
  titulo: 'Massagem laboral',
  tipo: 'massagem',
  data: '2026-07-20',
  hora_inicio: '09:00',
  hora_fim: '11:00',
  duracao_sessao: 30,
  capacidade_por_horario: 2,
  status: 'ATIVO',
  imagem_url: '',
  corpo_email: '',
  nome_profissional: 'Profissional AEB',
  palavra_chave: '',
  total_agendamentos: 12,
  horarios: [],
};

const agendamentoBase: AgendamentoResumoDTO = {
  id: 1,
  usuario: {
    id: 2,
    email: 'usuario@aeb.gov.br',
    nome: 'Maria Silva',
    is_admin: false,
    is_superuser: false,
    matricula: '456',
    departamento: 'RH',
  },
  horario: {
    id: 1,
    hora_inicio: '09:00',
    hora_fim: '09:30',
    vagas_disponiveis: 2,
  },
  status: 'CONFIRMADO',
  evento_titulo: 'Massagem laboral',
  evento_data: '2026-07-20',
  nome_profissional: 'Profissional AEB',
  evento_id: 1,
  criado_em: '2026-07-10T10:00:00',
};

describe('Relatorios', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('carrega dados analiticos e exporta XLSX', async () => {
    const user = userEvent.setup();
    vi.spyOn(adminDashboardApi, 'obter').mockResolvedValue({
      total_vagas: 20,
      vagas_ocupadas: 12,
      taxa_ocupacao: 60,
      total_eventos_ativos: 1,
      vagas_disponiveis: 8,
      proximo_evento: null,
      pendencias: { total: 0, eventos_presenca_pendente: 0, pessoas_fila: 0, falhas_email: 0 },
      agendamentos_recentes: [agendamentoBase],
    });
    vi.spyOn(adminEventosApi, 'listar').mockResolvedValue([
      eventoBase,
      { ...eventoBase, id: 2, titulo: 'Yoga', status: 'ENCERRADO', total_agendamentos: 4 },
      { ...eventoBase, id: 3, titulo: 'Pilates', status: 'CANCELADO', total_agendamentos: 1 },
    ]);

    render(<Relatorios />);

    expect(await screen.findAllByText('Massagem laboral')).not.toHaveLength(0);
    expect(screen.getByText(/Publicados/i)).toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /exportar xlsx/i }));

    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(3);
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), expect.stringMatching(/^relatorio-aeb-/));
  });

  it('reutiliza o dashboard recebido quando esta embutido', async () => {
    const dashboardSpy = vi.spyOn(adminDashboardApi, 'obter');
    vi.spyOn(adminEventosApi, 'listar').mockResolvedValue([eventoBase]);

    render(
      <Relatorios
        embedded
        dashboardData={{
          total_vagas: 20,
          vagas_ocupadas: 12,
          taxa_ocupacao: 60,
          total_eventos_ativos: 1,
          vagas_disponiveis: 8,
          proximo_evento: null,
          pendencias: { total: 0, eventos_presenca_pendente: 0, pessoas_fila: 0, falhas_email: 0 },
          agendamentos_recentes: [agendamentoBase],
        }}
      />,
    );

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(dashboardSpy).not.toHaveBeenCalled();
    expect(adminEventosApi.listar).toHaveBeenCalledTimes(1);
  });

  it('mostra estados vazios quando nao ha dados', async () => {
    vi.spyOn(adminDashboardApi, 'obter').mockResolvedValue({
      total_vagas: 0,
      vagas_ocupadas: 0,
      taxa_ocupacao: 0,
      total_eventos_ativos: 0,
      vagas_disponiveis: 0,
      proximo_evento: null,
      pendencias: { total: 0, eventos_presenca_pendente: 0, pessoas_fila: 0, falhas_email: 0 },
      agendamentos_recentes: [],
    });
    vi.spyOn(adminEventosApi, 'listar').mockResolvedValue([]);

    render(<Relatorios />);

    expect(await screen.findByText(/Nenhum evento registrado/i)).toBeInTheDocument();
    expect(screen.getByText(/Nenhum dado para o ranking/i)).toBeInTheDocument();
    expect(screen.getByText(/Nenhum hist/i)).toBeInTheDocument();
  });

  it('mostra erro quando nao consegue carregar dados', async () => {
    vi.spyOn(adminDashboardApi, 'obter').mockRejectedValue(new Error('Falha nos relatorios'));
    vi.spyOn(adminEventosApi, 'listar').mockResolvedValue([]);

    render(<Relatorios />);

    await waitFor(() => {
      expect(screen.getByText('Falha nos relatorios')).toBeInTheDocument();
    });
  });
});
