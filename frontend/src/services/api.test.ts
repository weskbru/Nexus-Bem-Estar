import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adminDashboardApi,
  adminEventosApi,
  adminPenalidadesApi,
  authApi,
  colaboradorApi,
  ldapApi,
  parseFetchError,
} from './api';

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

function createLocalStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

describe('api service', () => {
  let fetchMock: FetchMock;
  let storage: ReturnType<typeof createLocalStorageMock>;
  let location: { href: string };

  beforeEach(() => {
    fetchMock = vi.fn();
    storage = createLocalStorageMock();
    location = { href: '' };

    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { location });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia token em rotas protegidas', async () => {
    storage.setItem('access_token', 'token-admin');
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 1, titulo: 'Evento' }]));

    const eventos = await adminEventosApi.listar();

    expect(eventos).toEqual([{ id: 1, titulo: 'Evento' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/api/admin/eventos/',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-admin',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('nao envia token em rota publica', async () => {
    storage.setItem('access_token', 'token-expirado');
    fetchMock.mockResolvedValueOnce(jsonResponse({ access: 'novo-token' }));

    await authApi.acessarEvento(10, 'usuario@aeb.gov.br', 'chave', '1234');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers).not.toHaveProperty('Authorization');
    expect(options).toEqual(
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          evento_id: 10,
          email: 'usuario@aeb.gov.br',
          palavra_chave: 'chave',
          ramal: '1234',
        }),
      }),
    );
  });

  it('limpa sessao e redireciona quando rota protegida retorna 401', async () => {
    storage.setItem('access_token', 'token-expirado');
    storage.setItem('usuario', '{"nome":"Admin"}');
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'unauthorized' }, { status: 401 }));

    await expect(adminEventosApi.obter(7)).rejects.toThrow(/login/);

    expect(storage.removeItem).toHaveBeenCalledWith('access_token');
    expect(storage.removeItem).toHaveBeenCalledWith('usuario');
    expect(location.href).toBe('/admin/login');
  });

  it('nao redireciona quando rota publica retorna 401', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'unauthorized' }, { status: 401 }));

    await expect(authApi.verificarToken('abc')).rejects.toThrow(/login/);

    expect(location.href).toBe('');
  });

  it('usa mensagem e dados do erro JSON quando resposta falha', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ erro: 'Data invalida', campo: 'data' }, { status: 400 }));

    await expect(adminEventosApi.criar({ titulo: 'Teste' })).rejects.toMatchObject({
      message: 'Data invalida',
      data: { erro: 'Data invalida', campo: 'data' },
    });
  });

  it('usa mensagem padrao quando erro nao retorna JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<html>erro</html>', {
        status: 500,
        headers: { 'content-type': 'text/html' },
      }),
    );

    await expect(adminEventosApi.cancelar(3)).rejects.toThrow(/completar/);
  });

  it('normaliza erros de conexao para mensagem amigavel', () => {
    expect(parseFetchError(new Error('Failed to fetch'), 'Falha padrao')).toContain('servidor');
    expect(parseFetchError(new Error('Erro especifico'), 'Falha padrao')).toBe('Erro especifico');
    expect(parseFetchError('erro desconhecido', 'Falha padrao')).toBe('Falha padrao');
  });

  it('retorna indisponibilidade estruturada para evento publico indisponivel', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          erro: 'Evento encerrado.',
          codigo: 'encerrado',
          titulo: 'Massagem',
          data: '2026-07-09',
        },
        { status: 404 },
      ),
    );

    await expect(authApi.eventoPublico(5)).rejects.toMatchObject({
      message: 'Evento encerrado.',
      indisponivel: {
        codigo: 'encerrado',
        titulo: 'Massagem',
        data: '2026-07-09',
      },
    });
  });

  it('chama endpoints administrativos restantes com metodo correto', async () => {
    storage.setItem('access_token', 'token-admin');
    fetchMock.mockResolvedValue(jsonResponse({ mensagem: 'ok' }));

    await adminEventosApi.atualizar(1, { titulo: 'Novo titulo' });
    await adminEventosApi.publicar(1);
    await adminEventosApi.enviarEmails(1, { modo_envio: 'agendado', agendado_para: '2026-07-10T10:00:00' });
    await adminEventosApi.registrarParticipanteManual(1, { horario_id: 2, nome: 'Maria' });
    await adminEventosApi.adicionarParticipantePendente(1, { nome: 'Joao' });
    await adminEventosApi.listaPresenca(1);
    await adminEventosApi.filaHistorico(1);
    await adminEventosApi.removerParticipante(1, 9);
    await adminEventosApi.marcarPresenca(1, {
      presentes: [1],
      ausentes: [2],
      presentes_manuais: [3],
      ausentes_manuais: [4],
    });
    await adminDashboardApi.obter();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/api/admin/eventos/1/',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/api/admin/eventos/1/publicar/',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/api/admin/eventos/1/remover-participante/9/',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/api/admin/dashboard/',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('chama endpoints de penalidades, LDAP e colaborador', async () => {
    storage.setItem('access_token', 'token-admin');
    fetchMock.mockResolvedValue(jsonResponse([]));

    await adminPenalidadesApi.listar({ ativa: true });
    await adminPenalidadesApi.listar();
    await adminPenalidadesApi.revogar(3, 'Justificativa');
    await ldapApi.buscar('maria silva');
    await ldapApi.promover({
      email: 'maria@aeb.gov.br',
      nome: 'Maria',
      matricula: '123',
      departamento: 'CTI',
    });
    await ldapApi.revogar(7);
    await ldapApi.listarAdmins();
    await colaboradorApi.listarEventos();
    await colaboradorApi.detalheEvento(5);
    await colaboradorApi.reservar(5, 8);
    await colaboradorApi.meusAgendamentos();
    await colaboradorApi.cancelar(12);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/api/admin/penalidades/?ativa=true',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/api/admin/ldap/buscar/?q=maria%20silva',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/api/colaborador/eventos/5/horarios/8/reservar/',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/api/colaborador/agendamentos/12/cancelar/',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
