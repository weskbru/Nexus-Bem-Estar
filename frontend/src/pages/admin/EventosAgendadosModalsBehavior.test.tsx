// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { adminEventosApi, adminPenalidadesApi, type EventoDTO, type FilaHistoricoDTO, type ListaPresencaDTO } from '../../services/api';
import {
  FilaHistoricoModal,
  ListaPresencaModal,
  RegistrarParticipanteModal,
} from './EventosAgendadosModals';

vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

const evento: EventoDTO = {
  id: 20,
  titulo: 'Massagem laboral',
  tipo: 'massagem',
  data: '2026-07-20',
  hora_inicio: '09:00:00',
  hora_fim: '11:00:00',
  duracao_sessao: 30,
  capacidade_por_horario: 2,
  status: 'ATIVO',
  imagem_url: '',
  corpo_email: '<p>Convite</p>',
  nome_profissional: 'Ana Souza',
  palavra_chave: 'bemestar',
  horarios: [
    {
      id: 31,
      hora_inicio: '09:00:00',
      hora_fim: '09:30:00',
      vagas_disponiveis: 2,
      vagas_ocupadas: 1,
      vagas_livres: 1,
      disponivel: true,
    },
    {
      id: 32,
      hora_inicio: '09:30:00',
      hora_fim: '10:00:00',
      vagas_disponiveis: 1,
      vagas_ocupadas: 1,
      vagas_livres: 0,
      disponivel: false,
    },
  ],
};

const filaHistorico: FilaHistoricoDTO = {
  evento: {
    id: 20,
    titulo: 'Massagem laboral',
    data: '2026-07-20',
    status: 'ATIVO',
  },
  total_fila: 2,
  total_cancelamentos: 1,
  horarios: [
    {
      horario_id: 31,
      hora_inicio: '09:00',
      hora_fim: '09:30',
      total_na_fila: 2,
      participantes: [
        {
          id: 1,
          posicao: 1,
          status: 'aguardando',
          nome: 'Maria Silva',
          email: 'maria@aeb.gov.br',
          ramal: '1234',
          matricula: 'A1',
          departamento: 'RH',
          criado_em: '2026-07-19T10:00:00-03:00',
          expira_em: null,
        },
        {
          id: 2,
          posicao: 2,
          status: 'notificado',
          nome: 'Joao Santos',
          email: 'joao@aeb.gov.br',
          ramal: null,
          matricula: 'A2',
          departamento: 'TI',
          criado_em: '2026-07-19T11:00:00-03:00',
          notificado_em: '2026-07-19T12:00:00-03:00',
          expira_em: '2026-07-19T13:00:00-03:00',
        },
      ],
    },
  ],
  cancelamentos: [
    {
      agendamento_id: 88,
      nome: 'Paula Costa',
      email: 'paula@aeb.gov.br',
      ramal: '4321',
      matricula: 'A3',
      departamento: 'DGP',
      hora_inicio: '10:00',
      hora_fim: '10:30',
      agendado_em: '2026-07-18T10:00:00-03:00',
      cancelado_em: '2026-07-19T10:00:00-03:00',
    },
  ],
};

const listaPresenca: ListaPresencaDTO = {
  evento: {
    id: 20,
    titulo: 'Massagem laboral',
    data: '2026-07-20',
    hora_inicio: '09:00',
    hora_fim: '10:00',
    nome_profissional: 'Ana Souza',
    status: 'encerrado',
  },
  total: 2,
  horarios: [
    {
      horario_id: 31,
      hora_inicio: '09:00',
      hora_fim: '09:30',
      participantes: [
        {
          agendamento_id: 101,
          nome: 'Maria Silva',
          email: 'maria@aeb.gov.br',
          ramal: '1234',
          hora_inicio: '09:00',
          hora_fim: '09:30',
          tipo: 'email',
          compareceu: null,
        },
        {
          participante_id: 202,
          nome: 'Carlos Manual',
          email: '',
          ramal: '',
          hora_inicio: '09:00',
          hora_fim: '09:30',
          tipo: 'manual',
          compareceu: null,
        },
      ],
    },
  ],
};

describe('EventosAgendadosModals behavior', () => {
  beforeEach(() => {
    vi.spyOn(adminEventosApi, 'filaHistorico').mockResolvedValue(filaHistorico);
    vi.spyOn(adminEventosApi, 'listaPresenca').mockResolvedValue(listaPresenca);
    vi.spyOn(adminEventosApi, 'removerParticipante').mockResolvedValue(undefined);
    vi.spyOn(adminEventosApi, 'marcarPresenca').mockResolvedValue({ mensagem: 'ok', penalidades_criadas: 1 });
    vi.spyOn(adminEventosApi, 'registrarParticipanteManual').mockResolvedValue({
      id: 77,
      nome: 'Lucia Nova',
      matricula: 'A4',
      departamento: 'RH',
      horario_info: '09:00 - 09:30',
      aviso_penalidade: { id: 55, usuario_nome: 'Lucia Nova' },
    });
    vi.spyOn(adminPenalidadesApi, 'revogar').mockResolvedValue({
      id: 55,
      ativa: false,
      usuario: {
        id: 9,
        email: 'lucia@aeb.gov.br',
        nome: 'Lucia Nova',
        is_admin: false,
        is_superuser: false,
        matricula: 'A4',
        departamento: 'RH',
      },
      criada_em: '2026-07-01T10:00:00-03:00',
      revogada_em: '2026-07-20T10:00:00-03:00',
      motivo_revogacao: 'Liberada',
      evento_origem_titulo: null,
      evento_punicao_titulo: null,
      evento_punicao_status: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('carrega fila, alterna para cancelamentos e fecha o modal', async () => {
    const onClose = vi.fn();

    render(<FilaHistoricoModal eventoId={20} onClose={onClose} />);

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Notificado')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancelamentos/i }));
    expect(await screen.findByText('Paula Costa')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('mostra erro quando historico de fila falha', async () => {
    vi.mocked(adminEventosApi.filaHistorico).mockRejectedValueOnce(new Error('falha'));

    render(<FilaHistoricoModal eventoId={20} onClose={vi.fn()} />);

    expect(await screen.findByText(/possivel carregar fila/i)).toBeInTheDocument();
  });

  it('filtra lista de presenca, exporta planilha, remove manual e confirma presencas', async () => {
    render(<ListaPresencaModal eventoId={20} onClose={vi.fn()} />);

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Carlos Manual')).toBeInTheDocument();

    const busca = screen.getByPlaceholderText(/buscar por nome/i);
    fireEvent.change(busca, { target: { value: 'sem resultado' } });
    expect(screen.getByText(/nenhum participante encontrado/i)).toBeInTheDocument();
    fireEvent.change(busca, { target: { value: '' } });
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /exportar excel/i }));
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'lista-presenca-massagem-laboral.xlsx');

    fireEvent.click(screen.getByTitle(/remover inscri/i));
    await waitFor(() => {
      expect(adminEventosApi.removerParticipante).toHaveBeenCalledWith(20, 202);
    });

    const compareceuButtons = screen.getAllByTitle('Compareceu');
    const faltouButtons = screen.getAllByTitle('Faltou');
    fireEvent.click(compareceuButtons[0]);
    fireEvent.click(faltouButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: /confirmar presen/i }));

    await waitFor(() => {
      expect(adminEventosApi.marcarPresenca).toHaveBeenCalledWith(20, {
        presentes: [101],
        ausentes: [],
        presentes_manuais: [],
        ausentes_manuais: [202],
      });
    });
    expect(await screen.findByText(/presen.as confirmadas com sucesso/i)).toBeInTheDocument();
  });

  it('valida, registra participante manual e revoga penalidade ativa', async () => {
    const onSuccess = vi.fn();

    render(<RegistrarParticipanteModal evento={evento} onClose={vi.fn()} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: /confirmar inscri/i }));
    expect(screen.getByText(/informe o nome completo/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/nome do participante/i), { target: { value: ' Lucia Nova ' } });
    fireEvent.change(screen.getByLabelText(/e-mail corporativo/i), { target: { value: 'lucia@aeb.gov.br' } });
    fireEvent.change(screen.getByLabelText(/setor/i), { target: { value: 'RH' } });
    fireEvent.change(screen.getByLabelText(/hor.rio desejado/i), { target: { value: '31' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar inscri/i }));

    await waitFor(() => {
      expect(adminEventosApi.registrarParticipanteManual).toHaveBeenCalledWith(20, {
        horario_id: 31,
        nome: 'Lucia Nova',
        departamento: 'RH',
        email_verificacao: 'lucia@aeb.gov.br',
      });
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(await screen.findByText(/penalidade ativa/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/motivo da revoga/i), { target: { value: 'Liberada pelo admin' } });
    fireEvent.click(screen.getByRole('button', { name: /revogar penalidade/i }));

    await waitFor(() => {
      expect(adminPenalidadesApi.revogar).toHaveBeenCalledWith(55, 'Liberada pelo admin');
    });
    expect(await screen.findByText(/penalidade revogada/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /registrar novo participante/i }));
    expect(screen.getByLabelText(/nome do participante/i)).toHaveValue('');
  });
});
