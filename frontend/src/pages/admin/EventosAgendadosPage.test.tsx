// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminEventosApi, type EventoDTO } from '../../services/api';
import AdminEventos from './EventosAgendados';

vi.mock('./EventosAgendadosModals', () => ({
  ConfirmDeleteModal: ({
    evento,
    onConfirm,
    onCancel,
    loading,
  }: {
    evento: EventoDTO;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
  }) => (
    <section role="dialog" aria-label="Excluir Evento">
      <p>Excluir {evento.titulo}</p>
      <button type="button" onClick={onCancel}>Cancelar exclusao</button>
      <button type="button" disabled={loading} onClick={onConfirm}>Confirmar exclusao</button>
    </section>
  ),
  ConfirmActionModal: ({
    evento,
    tipo,
    onConfirm,
    onCancel,
    loading,
  }: {
    evento: EventoDTO;
    tipo: 'emails' | 'cancelar';
    onConfirm: () => Promise<void>;
    onCancel: () => void;
    loading: boolean;
  }) => (
    <section role="dialog" aria-label={`Confirmar ${tipo}`}>
      <p>{tipo} {evento.titulo}</p>
      <button type="button" onClick={onCancel}>Cancelar acao</button>
      <button type="button" disabled={loading} onClick={onConfirm}>Confirmar acao</button>
    </section>
  ),
  FilaHistoricoModal: ({ eventoId, onClose }: { eventoId: number; onClose: () => void }) => (
    <section role="dialog" aria-label="Fila historico mock">
      <p>Fila {eventoId}</p>
      <button type="button" onClick={onClose}>Fechar fila</button>
    </section>
  ),
  ListaPresencaModal: ({ eventoId, onClose }: { eventoId: number; onClose: () => void }) => (
    <section role="dialog" aria-label="Lista presenca mock">
      <p>Lista {eventoId}</p>
      <button type="button" onClick={onClose}>Fechar lista</button>
    </section>
  ),
  RegistrarParticipanteModal: ({
    evento,
    onClose,
    onSuccess,
  }: {
    evento: EventoDTO;
    onClose: () => void;
    onSuccess: () => void;
  }) => (
    <section role="dialog" aria-label="Registrar participante mock">
      <p>Registrar {evento.titulo}</p>
      <button type="button" onClick={onSuccess}>Registro sucesso</button>
      <button type="button" onClick={onClose}>Fechar registro</button>
    </section>
  ),
  ErroPresencaModal: ({
    mensagem,
    onClose,
    onVerPresenca,
  }: {
    mensagem: string;
    onClose: () => void;
    onVerPresenca?: () => void;
  }) => (
    <section role="dialog" aria-label="Erro presenca mock">
      <p>{mensagem}</p>
      {onVerPresenca && <button type="button" onClick={onVerPresenca}>Ver presenca</button>}
      <button type="button" onClick={onClose}>Fechar erro</button>
    </section>
  ),
}));

const eventoAtivo: EventoDTO = {
  id: 10,
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
  total_agendamentos: 4,
  emails_enviados_em: null,
  horarios: [
    {
      id: 1,
      hora_inicio: '09:00:00',
      hora_fim: '09:30:00',
      vagas_disponiveis: 2,
      vagas_ocupadas: 1,
      vagas_livres: 1,
      disponivel: true,
    },
  ],
};

const eventoCancelado: EventoDTO = {
  ...eventoAtivo,
  id: 11,
  titulo: 'Yoga cancelada',
  tipo: 'yoga',
  status: 'CANCELADO',
  total_agendamentos: 1,
};

const eventoEncerrado: EventoDTO = {
  ...eventoAtivo,
  id: 12,
  titulo: 'Pilates encerrado',
  tipo: 'pilates',
  status: 'ENCERRADO',
  total_agendamentos: 6,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminEventos />
    </MemoryRouter>,
  );
}

function clickEventCard(titulo: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(titulo, 'i') }));
}

describe('AdminEventos page', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'token-admin');
    vi.spyOn(adminEventosApi, 'listar').mockResolvedValue([eventoAtivo, eventoCancelado, eventoEncerrado]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('lista eventos, filtra por status e abre lista de presenca pelo banner pendente', async () => {
    vi.mocked(adminEventosApi.listar).mockResolvedValue([
      { ...eventoAtivo, presenca_pendente: true },
      eventoCancelado,
      eventoEncerrado,
    ]);

    renderPage();

    expect(await screen.findAllByText('Massagem laboral')).toHaveLength(2);
    expect(screen.getByText('Yoga cancelada')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancelados/i }));
    expect(screen.getByText('Yoga cancelada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Massagem laboral.*Gerenciar evento/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /todos/i }));
    fireEvent.click(screen.getByRole('button', { name: /Massagem laboral.*Confirmar presen/i }));

    expect(await screen.findByRole('dialog', { name: /lista presenca mock/i })).toHaveTextContent('Lista 10');
  });

  it('envia convites e cancela evento pelo modal de acoes', async () => {
    vi.spyOn(adminEventosApi, 'enviarEmails').mockResolvedValue({ mensagem: 'ok' });
    vi.spyOn(adminEventosApi, 'cancelar').mockResolvedValue({ mensagem: 'cancelado' });

    renderPage();

    expect(await screen.findByText('Massagem laboral')).toBeInTheDocument();

    clickEventCard('Massagem laboral');
    fireEvent.click(screen.getByRole('button', { name: /enviar e-mails/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar acao/i }));

    await waitFor(() => {
      expect(adminEventosApi.enviarEmails).toHaveBeenCalledWith(10);
    });
    expect(await screen.findByText(/e-mail enviado com sucesso/i)).toBeInTheDocument();

    clickEventCard('Massagem laboral');
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar acao/i }));

    await waitFor(() => {
      expect(adminEventosApi.cancelar).toHaveBeenCalledWith(10);
    });
  });

  it('abre registro manual, recarrega detalhe e fecha modal apos sucesso', async () => {
    vi.spyOn(adminEventosApi, 'obter').mockResolvedValue({ ...eventoAtivo, titulo: 'Massagem detalhada' });

    renderPage();

    expect(await screen.findByText('Massagem laboral')).toBeInTheDocument();

    clickEventCard('Massagem laboral');
    fireEvent.click(screen.getByRole('button', { name: /registrar participante/i }));

    expect(await screen.findByRole('dialog', { name: /registrar participante mock/i }))
      .toHaveTextContent('Massagem detalhada');

    fireEvent.click(screen.getByRole('button', { name: /registro sucesso/i }));

    await waitFor(() => {
      expect(adminEventosApi.listar).toHaveBeenCalledTimes(2);
      expect(adminEventosApi.obter).toHaveBeenCalledTimes(2);
    });
  });

  it('abre fila historico e trata bloqueio por lista de presenca ao excluir', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            erro: 'Lista de presenca pendente',
            evento_id: 10,
            codigo: 'lista_presenca_pendente',
          }),
          { status: 409, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    renderPage();

    expect(await screen.findByText('Massagem laboral')).toBeInTheDocument();

    clickEventCard('Massagem laboral');
    fireEvent.click(screen.getByRole('button', { name: /fila e cancelamentos/i }));
    expect(screen.getByRole('dialog', { name: /fila historico mock/i })).toHaveTextContent('Fila 10');
    fireEvent.click(screen.getByRole('button', { name: /fechar fila/i }));

    clickEventCard('Massagem laboral');
    fireEvent.click(screen.getByTitle(/excluir evento/i));
    fireEvent.click(screen.getByRole('button', { name: /confirmar exclusao/i }));

    expect(await screen.findByRole('dialog', { name: /erro presenca mock/i }))
      .toHaveTextContent('Lista de presenca pendente');

    fireEvent.click(screen.getByRole('button', { name: /ver presenca/i }));
    expect(screen.getByRole('dialog', { name: /lista presenca mock/i })).toHaveTextContent('Lista 10');
  });

  it('mostra erro e permite tentar carregar novamente', async () => {
    vi.mocked(adminEventosApi.listar)
      .mockRejectedValueOnce(new Error('falha'))
      .mockResolvedValueOnce([eventoAtivo]);

    renderPage();

    expect(await screen.findByText(/poss.vel carregar os eventos/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(await screen.findByText('Massagem laboral')).toBeInTheDocument();
  });
});
