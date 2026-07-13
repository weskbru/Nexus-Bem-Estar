import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { EventoDTO } from '../../services/api';
import {
  EventActionsModal,
  EventCard,
  SkeletonCard,
  formatDate,
  normalizeStatus,
} from './EventosAgendadosCards';
import {
  ConfirmActionModal,
  ConfirmDeleteModal,
  ErroPresencaModal,
  FilaHistoricoModal,
  ListaPresencaModal,
  RegistrarParticipanteModal,
} from './EventosAgendadosModals';

const evento: EventoDTO = {
  id: 10,
  titulo: 'Massagem laboral',
  tipo: 'massagem',
  data: '2026-07-20',
  hora_inicio: '09:00',
  hora_fim: '11:00',
  duracao_sessao: 30,
  capacidade_por_horario: 2,
  status: 'ATIVO',
  imagem_url: '',
  corpo_email: '<p>Convite</p>',
  nome_profissional: 'Profissional AEB',
  palavra_chave: 'bemestar',
  total_agendamentos: 4,
  horarios: [
    {
      id: 1,
      hora_inicio: '09:00',
      hora_fim: '09:30',
      vagas_disponiveis: 2,
      vagas_ocupadas: 1,
      vagas_livres: 1,
      disponivel: true,
    },
  ],
};

function renderWithRouter(element: React.ReactNode) {
  return renderToString(<MemoryRouter>{element}</MemoryRouter>);
}

describe('EventosAgendadosCards', () => {
  it('normaliza status conhecidos e fallback', () => {
    expect(normalizeStatus('PUBLICADO')).toBe('ATIVO');
    expect(normalizeStatus('cancelado')).toBe('CANCELADO');
    expect(normalizeStatus('ENCERRADO')).toBe('ENCERRADO');
    expect(normalizeStatus('rascunho')).toBe('CANCELADO');
  });

  it('formata data ISO', () => {
    expect(formatDate('2026-07-20')).toContain('2026');
  });

  it('renderiza skeleton, card e modal de acoes', () => {
    expect(renderToString(<SkeletonCard />)).toContain('animate-pulse');
    expect(renderWithRouter(<EventCard evento={evento} onOpen={vi.fn()} />)).toContain('Massagem laboral');
    expect(
      renderWithRouter(
        <EventActionsModal
          evento={evento}
          isActing={false}
          isEmailActing={false}
          onCancelar={vi.fn()}
          onDelete={vi.fn()}
          onEnviarEmails={vi.fn()}
          onRegistrar={vi.fn()}
          onListaPresenca={vi.fn()}
          onFilaHistorico={vi.fn()}
          onClose={vi.fn()}
        />,
      ),
    ).toContain('Gerenciar Evento');
  });
});

describe('EventosAgendadosModals', () => {
  it('renderiza modais de confirmacao', () => {
    expect(
      renderToString(
        <ConfirmDeleteModal
          evento={evento}
          loading={false}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />,
      ),
    ).toContain('Excluir Evento');

    expect(
      renderToString(
        <ConfirmActionModal
          evento={evento}
          tipo="emails"
          loading={false}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />,
      ),
    ).toContain('Enviar E-mails');

    expect(
      renderToString(
        <ConfirmActionModal
          evento={evento}
          tipo="cancelar"
          loading
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />,
      ),
    ).toContain('Cancelar Evento');
  });

  it('renderiza modal de erro de presenca', () => {
    const html = renderToString(
      <ErroPresencaModal
        mensagem="Lista pendente"
        codigo="email_enviado_evento_ativo"
        onClose={vi.fn()}
        onVerPresenca={vi.fn()}
      />,
    );

    expect(html).toContain('Lista pendente');
  });

  it('renderiza modais que carregam dados inicialmente', () => {
    expect(renderToString(<FilaHistoricoModal eventoId={10} onClose={vi.fn()} />)).toContain('Fila e Cancelamentos');
    expect(renderToString(<ListaPresencaModal eventoId={10} onClose={vi.fn()} />)).toContain('Lista de Presen');
  });

  it('renderiza modal de registro manual', () => {
    const html = renderToString(
      <RegistrarParticipanteModal
        evento={evento}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(html).toContain('Inscrição Manual');
    expect(html).toContain('09:00');
  });
});
