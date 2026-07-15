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

// Rotas públicas que não devem enviar token nem redirecionar ao receber 401
const ROTAS_PUBLICAS = ['/auth/evento-publico/', '/auth/acessar-evento/', '/auth/acesso/', '/auth/login/'];

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const ehRotaPublica = ROTAS_PUBLICAS.some(r => path.startsWith(r));
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    // Não envia token em rotas públicas para evitar 401 por token expirado
    ...(!ehRotaPublica && token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('usuario');
    // Só redireciona para login em rotas protegidas (não em páginas públicas)
    if (!ehRotaPublica) {
      window.location.href = '/admin/login';
    }
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!res.ok) {
    const erro = await safeJson(res);
    const err = new Error(
      (erro?.erro as string) ?? (erro?.detail as string) ??
      'Não foi possível completar a operação. Tente novamente.'
    );
    if (erro) Object.assign(err, { data: erro });
    throw err;
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

export interface EventoIndisponivelDTO {
  codigo: 'encerrado' | 'cancelado' | 'nao_encontrado' | 'indisponivel';
  titulo?: string;
  data?: string;
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

  eventoPublico: async (eventoId: number): Promise<EventoPublicoDTO> => {
    const res = await fetch(`${BASE_URL}/auth/evento-publico/${eventoId}/`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body.erro ?? 'Evento não disponível.');
      (err as Error & { indisponivel: EventoIndisponivelDTO }).indisponivel = {
        codigo: body.codigo ?? 'nao_encontrado',
        titulo: body.titulo,
        data: body.data,
      };
      throw err;
    }
    return body as EventoPublicoDTO;
  },

  acessarEvento: (eventoId: number, email: string, palavraChave?: string, ramal?: string) =>
    request<LoginResponse & { evento_id: number }>(
      '/auth/acessar-evento/',
      {
        method: 'POST',
        body: JSON.stringify({ evento_id: eventoId, email, palavra_chave: palavraChave ?? '', ramal: ramal ?? '' }),
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
  emails_enviados_em?: string | null;
  emails_envio_status?: string;
  emails_agendado_para?: string | null;
  emails_tentativas_envio?: number;
  emails_erro_envio?: string;
  presenca_pendente?: boolean;
}

export type ApiError = Error & { data?: Record<string, unknown> };

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
  enviarEmails: (id: number, data?: { modo_envio?: 'imediato' | 'agendado'; agendado_para?: string }) =>
    request<{ mensagem: string; destinatario?: string[]; agendado_para?: string }>(
      `/admin/eventos/${id}/enviar-emails/`,
      { method: 'POST', body: data ? JSON.stringify(data) : undefined }
    ),
  registrarParticipanteManual: (id: number, dados: { horario_id: number; nome: string; departamento?: string; email_verificacao?: string }) =>
    request<{ id: number; nome: string; horario_info: string; matricula: string; departamento: string; aviso_penalidade?: { id: number; usuario_nome: string } }>(`/admin/eventos/${id}/registrar-participante/`, { method: 'POST', body: JSON.stringify(dados) }),
  adicionarParticipantePendente: (id: number, dados: { nome: string; matricula?: string; departamento?: string }) =>
    request<{ id: number; nome: string; horario_info: string; matricula: string; departamento: string }>(`/admin/eventos/${id}/registrar-participante/`, { method: 'POST', body: JSON.stringify(dados) }),
  listaPresenca: (id: number) =>
    request<ListaPresencaDTO>(`/admin/eventos/${id}/lista-presenca/`),
  filaHistorico: (id: number) =>
    request<FilaHistoricoDTO>(`/admin/eventos/${id}/fila-historico/`),
  removerParticipante: (eventoId: number, participanteId: number) =>
    request<void>(`/admin/eventos/${eventoId}/remover-participante/${participanteId}/`, { method: 'DELETE' }),
  marcarPresenca: (eventoId: number, dados: { presentes: number[]; ausentes: number[]; presentes_manuais: number[]; ausentes_manuais: number[] }) =>
    request<{ mensagem: string; penalidades_criadas: number }>(
      `/admin/eventos/${eventoId}/marcar-presenca/`,
      { method: 'POST', body: JSON.stringify(dados) }
    ),
};

// ── Lista de presença ─────────────────────────────────────────────────────────

export interface ParticipantePresencaDTO {
  participante_id?: number;
  agendamento_id?: number;
  nome: string;
  email: string;
  ramal?: string;
  hora_inicio: string;
  hora_fim: string;
  tipo: 'email' | 'manual';
  compareceu?: boolean | null;
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

export interface ParticipanteFilaDTO {
  id: number;
  posicao: number;
  status: 'aguardando' | 'notificado';
  nome: string;
  email: string;
  ramal?: string | null;
  matricula?: string | null;
  departamento?: string | null;
  criado_em: string;
  notificado_em?: string | null;
  expira_em?: string | null;
}

export interface HorarioFilaDTO {
  horario_id: number;
  hora_inicio: string;
  hora_fim: string;
  total_na_fila: number;
  participantes: ParticipanteFilaDTO[];
}

export interface CancelamentoEventoDTO {
  agendamento_id: number;
  nome: string;
  email: string;
  ramal?: string | null;
  matricula?: string | null;
  departamento?: string | null;
  hora_inicio: string;
  hora_fim: string;
  agendado_em: string;
  cancelado_em: string;
}

export interface FilaHistoricoDTO {
  evento: {
    id: number;
    titulo: string;
    data: string;
    status: string;
  };
  horarios: HorarioFilaDTO[];
  total_fila: number;
  cancelamentos: CancelamentoEventoDTO[];
  total_cancelamentos: number;
}

// ── Admin — Penalidades ───────────────────────────────────────────────────

export interface PenalidadeDTO {
  id: number;
  usuario: UsuarioDTO;
  ativa: boolean;
  evento_origem_titulo: string | null;
  evento_punicao_titulo: string | null;
  evento_punicao_status: string | null;
  criada_em: string;
  revogada_em: string | null;
  motivo_revogacao: string;
}

export const adminPenalidadesApi = {
  listar: (params?: { ativa?: boolean }) => {
    const qs = params?.ativa !== undefined ? `?ativa=${params.ativa}` : '';
    return request<PenalidadeDTO[]>(`/admin/penalidades/${qs}`);
  },
  revogar: (id: number, motivo: string) =>
    request<PenalidadeDTO>(`/admin/penalidades/${id}/revogar/`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),
};

// ── Admin — Dashboard ─────────────────────────────────────────────────────

export interface DashboardDTO {
  total_vagas: number;
  vagas_ocupadas: number;
  taxa_ocupacao: number;
  total_eventos_ativos: number;
  vagas_disponiveis: number;
  proximo_evento: {
    id: number;
    titulo: string;
    data: string;
    hora_inicio: string;
    hora_fim: string;
    total_vagas: number;
    vagas_ocupadas: number;
    vagas_livres: number;
  } | null;
  pendencias: {
    total: number;
    eventos_presenca_pendente: number;
    pessoas_fila: number;
    falhas_email: number;
  };
  agendamentos_recentes: AgendamentoResumoDTO[];
}

export interface HorarioResumoDTO {
  id: number;
  hora_inicio: string;
  hora_fim: string;
  vagas_disponiveis: number;
}

export interface AgendamentoResumoDTO {
  id: number;
  usuario: UsuarioDTO;
  horario: HorarioResumoDTO;
  status: string;
  compareceu?: boolean | null;
  evento_id: number;
  evento_titulo: string;
  evento_data: string;
  nome_profissional: string;
  criado_em: string;
  atualizado_em?: string;
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

export interface AdminNotificacoesDTO {
  confirmacoes: Array<{
    evento_id: number;
    evento_titulo: string;
    quantidade: number;
    ultima_confirmacao: string;
  }>;
  eventos: Array<{
    id: number;
    titulo: string;
    data: string;
    hora_inicio: string;
    status: string;
  }>;
}

export const adminNotificacoesApi = {
  obter: () => request<AdminNotificacoesDTO>('/admin/notificacoes/'),
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
