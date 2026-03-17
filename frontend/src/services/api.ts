const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api';

/** Lê o corpo da resposta como JSON com segurança.
 *  Se o servidor devolver HTML (ex: erro 500 do nginx), retorna null em vez de explodir. */
async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return null;
  return res.json().catch(() => null);
}

/** Converte qualquer erro capturado em mensagem amigável para o usuário. */
export function parseFetchError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const raw = err.message;
  if (
    raw.includes('DOCTYPE') || raw.includes('<!') ||
    raw.includes('JSON') || raw.includes('token') ||
    raw.includes('fetch') || raw.includes('Failed to fetch') ||
    raw.includes('NetworkError')
  ) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
  }
  return raw || fallback;
}

function getToken(): string | null {
  return localStorage.getItem('access_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('usuario');
    window.location.href = '/admin/login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!res.ok) {
    const erro = await safeJson(res);
    throw new Error(
      (erro?.erro as string) ?? (erro?.detail as string) ??
      'Não foi possível completar a operação. Tente novamente.'
    );
  }

  const body = await safeJson(res);
  return body as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────

export interface UsuarioDTO {
  id: number;
  email: string;
  nome: string;
  is_admin: boolean;
  is_superuser: boolean;
  matricula: string;
  departamento: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  usuario: UsuarioDTO;
}

export interface AcessoPreviewDTO {
  requer_palavra_chave: true;
  evento_titulo: string;
  evento_tipo: string;
  evento_data: string;
  evento_hora_inicio: string;
  evento_hora_fim: string;
  nome_profissional: string;
}

export type AcessoTokenResponse =
  | (LoginResponse & { evento_id: number; chave_mensagem: string })
  | AcessoPreviewDTO;

export interface EventoPublicoDTO {
  id: number;
  titulo: string;
  tipo: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  nome_profissional: string;
  requer_palavra_chave: boolean;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  verificarToken: (token: string) =>
    request<AcessoTokenResponse>(`/auth/acesso/${token}/`),

  acessoViaToken: (token: string) =>
    request<LoginResponse & { evento_id: number; chave_mensagem: string }>(
      `/auth/acesso/${token}/`
    ),

  acessoViaTokenComChave: (token: string, palavra_chave: string) =>
    request<LoginResponse & { evento_id: number; chave_mensagem: string }>(
      `/auth/acesso/${token}/`,
      { method: 'POST', body: JSON.stringify({ palavra_chave }) }
    ),

  eventoPublico: (eventoId: number) =>
    request<EventoPublicoDTO>(`/auth/evento-publico/${eventoId}/`),

  acessarEvento: (eventoId: number, email: string, palavraChave?: string) =>
    request<LoginResponse & { evento_id: number }>(
      '/auth/acessar-evento/',
      {
        method: 'POST',
        body: JSON.stringify({ evento_id: eventoId, email, palavra_chave: palavraChave ?? '' }),
      }
    ),
};

// ── Admin — Eventos ───────────────────────────────────────────────────────

export interface EventoDTO {
  id: number;
  titulo: string;
  tipo: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  duracao_sessao: number;
  capacidade_por_horario: number;
  status: string;
  imagem_url: string;
  corpo_email: string;
  nome_profissional: string;
  palavra_chave: string;
  horarios: HorarioDTO[];
  total_agendamentos?: number;
}

export interface HorarioDTO {
  id: number;
  hora_inicio: string;
  hora_fim: string;
  vagas_disponiveis: number;
  vagas_ocupadas: number;
  vagas_livres: number;
  disponivel: boolean;
}

export const adminEventosApi = {
  listar: () => request<EventoDTO[]>('/admin/eventos/'),
  obter: (id: number) => request<EventoDTO>(`/admin/eventos/${id}/`),
  criar: (data: Partial<EventoDTO>) =>
    request<EventoDTO>('/admin/eventos/', { method: 'POST', body: JSON.stringify(data) }),
  atualizar: (id: number, data: Partial<EventoDTO>) =>
    request<EventoDTO>(`/admin/eventos/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  publicar: (id: number) =>
    request<{ mensagem: string; horarios_gerados: number }>(`/admin/eventos/${id}/publicar/`, { method: 'POST' }),
  cancelar: (id: number) =>
    request<{ mensagem: string }>(`/admin/eventos/${id}/cancelar/`, { method: 'POST' }),
  enviarEmails: (id: number) =>
    request<{ mensagem: string; enviados: number; erros: unknown[] }>(`/admin/eventos/${id}/enviar-emails/`, { method: 'POST' }),
  registrarParticipanteManual: (id: number, dados: { horario_id: number; nome: string; matricula?: string; departamento?: string }) =>
    request<{ id: number; nome: string; horario_info: string; matricula: string; departamento: string }>(`/admin/eventos/${id}/registrar-participante/`, { method: 'POST', body: JSON.stringify(dados) }),
  adicionarParticipantePendente: (id: number, dados: { nome: string; matricula?: string; departamento?: string }) =>
    request<{ id: number; nome: string; horario_info: string; matricula: string; departamento: string }>(`/admin/eventos/${id}/registrar-participante/`, { method: 'POST', body: JSON.stringify(dados) }),
  listaPresenca: (id: number) =>
    request<ListaPresencaDTO>(`/admin/eventos/${id}/lista-presenca/`),
};

// ── Lista de presença ─────────────────────────────────────────────────────────

export interface ParticipantePresencaDTO {
  nome: string;
  matricula: string;
  departamento: string;
  tipo: 'email' | 'manual';
}

export interface HorarioPresencaDTO {
  horario_id: number;
  hora_inicio: string;
  hora_fim: string;
  participantes: ParticipantePresencaDTO[];
}

export interface ListaPresencaDTO {
  evento: {
    id: number;
    titulo: string;
    data: string;
    hora_inicio: string;
    hora_fim: string;
    nome_profissional: string;
    status: string;
  };
  horarios: HorarioPresencaDTO[];
  total: number;
}

// ── Admin — Dashboard ─────────────────────────────────────────────────────

export interface DashboardDTO {
  total_vagas: number;
  vagas_ocupadas: number;
  taxa_ocupacao: number;
  total_eventos_ativos: number;
  agendamentos_recentes: AgendamentoDTO[];
}

export interface AgendamentoDTO {
  id: number;
  usuario: UsuarioDTO;
  horario: HorarioDTO;
  status: string;
  evento_titulo: string;
  evento_data: string;
  nome_profissional: string;
  criado_em: string;
}

export const adminDashboardApi = {
  obter: () => request<DashboardDTO>('/admin/dashboard/'),
};

// ── SuperAdmin (CTI) — Gestão de Usuários LDAP ────────────────────────────

export interface LdapUsuarioDTO {
  nome: string;
  email: string;
  matricula: string;
  departamento: string;
  no_sistema: boolean;
  is_admin: boolean;
  is_superuser: boolean;
}

export const ldapApi = {
  buscar: (q: string) =>
    request<LdapUsuarioDTO[]>(`/admin/ldap/buscar/?q=${encodeURIComponent(q)}`),
  promover: (dados: { email: string; nome: string; matricula: string; departamento: string }) =>
    request<UsuarioDTO>('/admin/ldap/promover/', { method: 'POST', body: JSON.stringify(dados) }),
  revogar: (usuarioId: number) =>
    request<{ mensagem: string }>(`/admin/ldap/revogar/${usuarioId}/`, { method: 'POST' }),
  listarAdmins: () =>
    request<UsuarioDTO[]>('/admin/ldap/admins/'),
};

// ── Colaborador — Eventos ─────────────────────────────────────────────────

export const colaboradorApi = {
  listarEventos: () => request<EventoDTO[]>('/colaborador/eventos/'),
  detalheEvento: (id: number) => request<EventoDTO>(`/colaborador/eventos/${id}/`),
  reservar: (eventoId: number, horarioId: number) =>
    request<AgendamentoDTO>(`/colaborador/eventos/${eventoId}/horarios/${horarioId}/reservar/`, { method: 'POST' }),
  meusAgendamentos: () => request<AgendamentoDTO[]>('/colaborador/agendamentos/'),
  cancelar: (agendamentoId: number) =>
    request<{ mensagem: string }>(`/colaborador/agendamentos/${agendamentoId}/cancelar/`, { method: 'POST' }),
};
