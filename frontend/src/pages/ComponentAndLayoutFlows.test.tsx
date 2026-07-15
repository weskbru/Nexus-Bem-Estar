// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ModalDetalhesAgendamento, { type AgendamentoDetalhes } from '../components/ModalDetalhesAgendamento';
import AdminLayout from '../layouts/AdminLayout';
import Confirmacao from './colaborador/Confirmacao';

const authMocks = vi.hoisted(() => ({
  logout: vi.fn(),
  usuario: {
    id: 1,
    nome: 'Admin Master',
    email: 'admin@aeb.gov.br',
    is_admin: true,
    is_superuser: true,
    matricula: '123',
    departamento: 'CTI',
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    token: 'token',
    usuario: authMocks.usuario,
    isSuperAdmin: true,
    logout: authMocks.logout,
  }),
}));

const agendamento: AgendamentoDetalhes = {
  id: 77,
  status: 'confirmado',
  evento_id: 30,
  evento_titulo: 'Massagem expressa',
  evento_data: '2026-08-20',
  nome_profissional: 'Ana Souza',
  horario: {
    hora_inicio: '10:00:00',
    hora_fim: '10:30:00',
  },
  criado_em: '2026-07-10T09:00:00-03:00',
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

function renderAdminLayout() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<section>Conteudo dashboard</section>} />
        </Route>
        <Route path="/admin/manual" element={<section>Manual aberto</section>} />
        <Route path="/admin/login" element={<section>Login admin</section>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderConfirmacao(state: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/colaborador/confirmacao', state }]}>
      <Routes>
        <Route path="/colaborador/confirmacao" element={<Confirmacao />} />
        <Route path="/login" element={<section>Login colaborador</section>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('componentes e layouts principais', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'token');
    authMocks.logout.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('confirma reserva com OTP no modal de agendamento', async () => {
    const onConfirmarReserva = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ segundos_restantes: 120 }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <ModalDetalhesAgendamento
        ag={{ ...agendamento, status: 'pendente' }}
        modo="confirmacao"
        horarioId={55}
        onClose={vi.fn()}
        onCancelado={vi.fn()}
        onConfirmarReserva={onConfirmarReserva}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /confirmar agendamento/i }));

    expect(await screen.findByRole('heading', { name: /confirmar com codigo|confirmar com código/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/colaborador/horarios/55/solicitar-otp/'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reenviar: false }),
      }),
    );

    const inputs = document.querySelectorAll('input[inputmode="numeric"]');
    ['1', '2', '3', '4'].forEach((digito, index) => {
      fireEvent.change(inputs[index], { target: { value: digito } });
    });
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    expect(onConfirmarReserva).toHaveBeenCalledWith('1234');
  });

  it('cancela agendamento confirmado pelo modal', async () => {
    const onClose = vi.fn();
    const onCancelado = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ mensagem: 'cancelado' }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <ModalDetalhesAgendamento
        ag={agendamento}
        onClose={onClose}
        onCancelado={onCancelado}
        onAlterarHorario={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /cancelar agendamento/i }));
    expect(screen.getByText(/cancelar agendamento/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /sim, quero cancelar/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/colaborador/agendamentos/77/cancelar/'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
    expect(onCancelado).toHaveBeenCalledWith(77);
    expect(onClose).toHaveBeenCalled();
  });

  it('renderiza notificacoes do layout admin e executa atalhos', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/admin/notificacoes/')) {
        return Promise.resolve(jsonResponse({
          agendamentos: [{
            id: 1,
            colaborador_nome: 'Maria Silva',
            servico: 'Massagem',
            data_hora: '2026-08-20T10:00:00-03:00',
            status: 'OCUPADO',
          }],
          eventos: [{
            id: 2,
            titulo: 'Yoga laboral',
            data: '2026-08-21',
            hora_inicio: '09:00:00',
            status: 'PUBLICADO',
          }],
        }));
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderAdminLayout();

    expect(screen.getByText('Conteudo dashboard')).toBeInTheDocument();
    expect(screen.getByText(/gestao de usuarios|gestão de usuários/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/admin/notificacoes/'), expect.any(Object));
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/admin/dashboard/'), expect.any(Object),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/admin/eventos/'), expect.any(Object),
    );

    fireEvent.click(screen.getByTitle(/notificacoes|notificações/i));

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Yoga laboral')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle(/manual do sistema/i));
    expect(await screen.findByText('Manual aberto')).toBeInTheDocument();
  });

  it('renderiza confirmacao de sucesso e permite sair', async () => {
    renderConfirmacao({
      status: 'sucesso',
      evento: {
        id: 12,
        titulo: 'Pilates',
        tipo: 'pilates',
        data: '2026-08-21',
        hora_inicio: '09:00:00',
        hora_fim: '10:00:00',
        nome_profissional: 'Ana',
        local: 'AEB',
      },
    });

    expect(await screen.findByText(/confirmacao recebida|confirmação recebida/i)).toBeInTheDocument();
    expect(screen.getByText('Pilates')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /sair/i }));

    expect(authMocks.logout).toHaveBeenCalled();
    expect(await screen.findByText('Login colaborador')).toBeInTheDocument();
  });

  it('renderiza confirmacao cancelada e erro', async () => {
    renderConfirmacao({
      status: 'cancelado',
      evento: {
        id: 13,
        titulo: 'Yoga',
        tipo: 'yoga',
        data: '2026-08-22',
        hora_inicio: '09:00:00',
        hora_fim: '10:00:00',
        nome_profissional: 'Ana',
        local: 'AEB',
      },
    });

    expect(await screen.findByText(/participacao cancelada|participação cancelada/i)).toBeInTheDocument();

    cleanup();
    renderConfirmacao({ status: 'erro', mensagem: 'Token expirado' });

    expect(await screen.findByText(/erro na confirmacao|erro na confirmação/i)).toBeInTheDocument();
    expect(screen.getByText('Token expirado')).toBeInTheDocument();
  });
});
