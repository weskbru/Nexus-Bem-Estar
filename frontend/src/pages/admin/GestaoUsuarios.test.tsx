// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ldapApi,
  type LdapUsuarioDTO,
  type UsuarioDTO,
} from '../../services/api';
import GestaoUsuarios from './GestaoUsuarios';

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

describe('GestaoUsuarios', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('busca no LDAP, promove e revoga um administrador', async () => {
    vi.spyOn(ldapApi, 'listarAdmins').mockResolvedValue([adminLocal]);
    vi.spyOn(ldapApi, 'buscar').mockResolvedValue([usuarioLdap]);
    vi.spyOn(ldapApi, 'promover').mockResolvedValue({
      ...usuarioAdmin,
      ...usuarioLdap,
      is_admin: true,
    });
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
    await waitFor(() => expect(ldapApi.revogar).toHaveBeenCalledWith(2));
  });
});
