// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adminPenalidadesApi,
  authApi,
  ldapApi,
  type LdapUsuarioDTO,
  type PenalidadeDTO,
  type UsuarioDTO,
} from '../services/api';
import AcessarEvento from './AcessarEvento';
import AcessoViaToken from './AcessoViaToken';
import GestaoUsuarios from './admin/GestaoUsuarios';
import Penalidades from './admin/Penalidades';

const authMocks = vi.hoisted(() => ({
  loginViaEmail: vi.fn(),
  loginViaToken: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    loginViaEmail: authMocks.loginViaEmail,
    loginViaToken: authMocks.loginViaToken,
  }),
}));

const usuarioAdmin: UsuarioDTO = {
  id: 1,
  email: 'admin@aeb.gov.br',
  nome: 'Admin',
  is_admin: true,
  is_superuser: false,
  matricula: '123',
  departamento: 'CTI',
};

const usuarioLdap: LdapUsuarioDTO = {
  nome: 'Maria Silva',
  email: 'maria.silva@aeb.gov.br',
  matricula: '456',
  departamento: 'Gestao',
  no_sistema: false,
  is_admin: false,
  is_superuser: false,
};

const adminLocal: UsuarioDTO = {
  id: 2,
  email: 'joao.admin@aeb.gov.br',
  nome: 'Joao Admin',
  is_admin: true,
  is_superuser: false,
  matricula: '789',
  departamento: 'Eventos',
};

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

function renderRoute(element: React.ReactNode, path: string, route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={element} />
        <Route path="*" element={<span>Destino</span>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('fluxos de administracao e acesso publico', () => {
  beforeEach(() => {
    localStorage.clear();
    authMocks.loginViaEmail.mockReset();
    authMocks.loginViaToken.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('busca usuario LDAP, promove a admin e revoga admin existente', async () => {
    vi.spyOn(ldapApi, 'listarAdmins').mockResolvedValue([adminLocal]);
    vi.spyOn(ldapApi, 'buscar').mockResolvedValue([usuarioLdap]);
    vi.spyOn(ldapApi, 'promover').mockResolvedValue({ ...usuarioAdmin, ...usuarioLdap, is_admin: true });
    vi.spyOn(ldapApi, 'revogar').mockResolvedValue({ mensagem: 'ok' });

    render(<GestaoUsuarios />);

    expect(await screen.findByText('Joao Admin')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/pesquisar por nome/i), {
      target: { value: 'Maria' },
    });

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /promover a admin/i }));

    await waitFor(() => {
      expect(ldapApi.promover).toHaveBeenCalledWith({
        email: 'maria.silva@aeb.gov.br',
        nome: 'Maria Silva',
        matricula: '456',
        departamento: 'Gestao',
      });
    });
    expect(await screen.findByText(/maria silva promovido/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^revogar$/i }));
    expect(screen.getByText(/tem certeza que deseja revogar/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /revogar acesso/i }));

    await waitFor(() => {
      expect(ldapApi.revogar).toHaveBeenCalledWith(2);
    });
  });

  it('lista penalidades, revoga com motivo e alterna filtro', async () => {
    vi.spyOn(adminPenalidadesApi, 'listar').mockResolvedValue([penalidadeAtiva]);
    vi.spyOn(adminPenalidadesApi, 'revogar').mockResolvedValue({ ...penalidadeAtiva, ativa: false });

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
    fireEvent.click(screen.getByRole('button', { name: /confirmar revogacao|confirmar revogação/i }));

    await waitFor(() => {
      expect(adminPenalidadesApi.revogar).toHaveBeenCalledWith(10, 'Falta justificada');
    });
    expect(await screen.findByText(/penalidade de/i)).toBeInTheDocument();
  });

  it('acessa evento publico com palavra-chave e ramal', async () => {
    vi.spyOn(authApi, 'eventoPublico').mockResolvedValue({
      id: 15,
      titulo: 'Pilates no trabalho',
      tipo: 'pilates',
      data: '2026-07-30',
      hora_inicio: '10:00:00',
      hora_fim: '11:00:00',
      nome_profissional: 'Ana',
      requer_palavra_chave: true,
    });
    vi.spyOn(authApi, 'acessarEvento').mockResolvedValue({
      access: 'access-token',
      refresh: 'refresh-token',
      evento_id: 15,
      usuario: usuarioAdmin,
    });

    renderRoute(<AcessarEvento />, '/evento/:eventoId/entrar', '/evento/15/entrar');

    expect(await screen.findByText('Pilates no trabalho')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/e-mail corporativo/i), {
      target: { value: 'colaborador@aeb.gov.br' },
    });
    fireEvent.change(screen.getByLabelText(/ramal/i), {
      target: { value: '1234' },
    });
    fireEvent.change(screen.getByLabelText(/palavra-chave do convite/i), {
      target: { value: 'PILATES' },
    });
    fireEvent.click(screen.getByRole('button', { name: /ver horarios disponiveis|ver horários disponíveis/i }));

    await waitFor(() => {
      expect(authApi.acessarEvento).toHaveBeenCalledWith(15, 'colaborador@aeb.gov.br', 'PILATES', '1234');
    });
    expect(authMocks.loginViaEmail).toHaveBeenCalledWith('access-token', usuarioAdmin);
  });

  it('confirma acesso por token com palavra-chave', async () => {
    vi.spyOn(authApi, 'verificarToken').mockResolvedValue({
      requer_palavra_chave: true,
      evento_titulo: 'Massagem expressa',
      evento_tipo: 'massagem',
      evento_data: '2026-07-30',
      evento_hora_inicio: '09:00:00',
      evento_hora_fim: '10:00:00',
      nome_profissional: 'Ana',
    });
    vi.spyOn(authApi, 'acessoViaTokenComChave').mockResolvedValue({
      access: 'token-evento',
      refresh: 'refresh-evento',
      evento_id: 20,
      chave_mensagem: 'ok',
      usuario: usuarioAdmin,
    });

    renderRoute(<AcessoViaToken />, '/acesso/:token', '/acesso/abc');

    expect(await screen.findByText('Massagem expressa')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/palavra-chave do convite/i), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /acessar inscricao|acessar inscrição/i }));
    expect(screen.getByText(/palavra-chave e obrigatoria|palavra-chave é obrigatória/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/palavra-chave do convite/i), {
      target: { value: 'MASSAGEM' },
    });
    fireEvent.click(screen.getByRole('button', { name: /acessar inscricao|acessar inscrição/i }));

    await waitFor(() => {
      expect(authApi.acessoViaTokenComChave).toHaveBeenCalledWith('abc', 'MASSAGEM');
    });
    expect(localStorage.getItem('access_token')).toBe('token-evento');
    expect(await screen.findByText(/acesso liberado/i)).toBeInTheDocument();
  });
});
