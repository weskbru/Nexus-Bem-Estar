import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dataAposLimite,
  dataNoPassado,
  getDataLimiteFutura,
  getHojeSemHora,
  horaParaMinutos,
  parseDataISO,
  periodoEmMinutos,
  toDataISO,
} from './eventoRules';

describe('eventoRules', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-09T15:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('normaliza a data atual sem hora', () => {
    expect(toDataISO(getHojeSemHora())).toBe('2026-07-09');
  });

  it('calcula a data limite futura em meses', () => {
    expect(toDataISO(getDataLimiteFutura(2))).toBe('2026-09-09');
  });

  it('converte datas ISO sem deslocamento de dia', () => {
    expect(toDataISO(parseDataISO('2026-12-05'))).toBe('2026-12-05');
  });

  it('identifica datas no passado e ignora valor vazio', () => {
    expect(dataNoPassado('2026-07-08')).toBe(true);
    expect(dataNoPassado('2026-07-09')).toBe(false);
    expect(dataNoPassado('')).toBe(false);
  });

  it('identifica datas depois do limite futuro e ignora valor vazio', () => {
    expect(dataAposLimite('2026-10-10', 3)).toBe(true);
    expect(dataAposLimite('2026-10-09', 3)).toBe(false);
    expect(dataAposLimite('')).toBe(false);
  });

  it('converte horarios para minutos', () => {
    expect(horaParaMinutos('08:30')).toBe(510);
    expect(horaParaMinutos('valor-invalido')).toBe(0);
  });

  it('calcula o periodo entre horarios em minutos', () => {
    expect(periodoEmMinutos('09:15', '10:45')).toBe(90);
  });
});
