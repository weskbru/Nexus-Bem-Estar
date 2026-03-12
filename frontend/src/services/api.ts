const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api';

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

  if (!res.ok) {
    const erro = await res.json().catch(() => ({ erro: 'Erro desconhecido' }));
    throw new Error(erro.erro ?? erro.detail ?? 'Erro na requisição');
  }

  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────

export interface UsuarioDTO {
  id: number;
  email: string;
  nome: string;
  is_admin: boolean;
  matricula: string;
  departamento: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  usuario: UsuarioDTO;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  acessoViaToken: (token: string) =>
    request<LoginResponse & { evento_id: number; chave_mensagem: string }>(
      `/auth/acesso/${token}/`
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
  criar: (data: Partial<EventoDTO>) =>
    request<EventoDTO>('/admin/eventos/', { method: 'POST', body: JSON.stringify(data) }),
  atualizar: (id: number, data: Partial<EventoDTO>) =>
    request<EventoDTO>(`/admin/eventos/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  publicar: (id: number) =>
    request<{ mensagem: string; horarios_gerados: number }>(`/admin/eventos/${id}/publicar/`, { method: 'POST' }),
  encerrar: (id: number) =>
    request<{ mensagem: string }>(`/admin/eventos/${id}/encerrar/`, { method: 'POST' }),
  enviarEmails: (id: number) =>
    request<{ mensagem: string; enviados: number; erros: unknown[] }>(`/admin/eventos/${id}/enviar-emails/`, { method: 'POST' }),
};

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
