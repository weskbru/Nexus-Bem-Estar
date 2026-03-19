const DEFAULT_MAX_MESES_FUTURO = 6;

function parseMaxMesesFuturo(): number {
  const raw = import.meta.env.VITE_EVENTO_MAX_MESES_FUTURO;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_MESES_FUTURO;
  }
  return Math.floor(parsed);
}

export const MAX_MESES_FUTURO = parseMaxMesesFuturo();

export function getHojeSemHora(): Date {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

export function getDataLimiteFutura(maxMeses = MAX_MESES_FUTURO): Date {
  const limite = getHojeSemHora();
  limite.setMonth(limite.getMonth() + maxMeses);
  return limite;
}

export function parseDataISO(dataISO: string): Date {
  return new Date(`${dataISO}T00:00:00`);
}

export function toDataISO(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

export function dataNoPassado(dataISO: string): boolean {
  if (!dataISO) return false;
  return parseDataISO(dataISO) < getHojeSemHora();
}

export function dataAposLimite(dataISO: string, maxMeses = MAX_MESES_FUTURO): boolean {
  if (!dataISO) return false;
  return parseDataISO(dataISO) > getDataLimiteFutura(maxMeses);
}

export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function periodoEmMinutos(horaInicio: string, horaFim: string): number {
  return horaParaMinutos(horaFim) - horaParaMinutos(horaInicio);
}
