import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Save,
  Send,
  Clock,
  X,
  Info,
  CalendarDays,
  ShieldAlert,
} from 'lucide-react';
import { adminEventosApi, type ApiError } from '../../services/api';
import EditorEmailConvite from '../../components/EditorEmailConvite';
import {
  MAX_MESES_FUTURO,
  dataAposLimite,
  dataNoPassado,
  getDataLimiteFutura,
  getHojeSemHora,
  periodoEmMinutos,
} from '../../lib/eventoRules';

// ─── Mini Calendário ──────────────────────────────────────────────────────────

const DIAS_SEMANA = [
  { key: 'dom', label: 'D' },
  { key: 'seg', label: 'S' },
  { key: 'ter', label: 'T' },
  { key: 'qua', label: 'Q' },
  { key: 'qui', label: 'Q' },
  { key: 'sex', label: 'S' },
  { key: 'sab', label: 'S' },
];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type MiniCalendarProps = Readonly<{ value: string; onChange: (d: string) => void; error?: string }>;

function MiniCalendar({ value, onChange, error }: MiniCalendarProps) {
  const today = getHojeSemHora();
  const maxDate = getDataLimiteFutura();
  const initDate = value ? new Date(value + 'T00:00:00') : today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const canGoPrev = viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());
  const canGoNext = viewYear < maxDate.getFullYear() ||
    (viewYear === maxDate.getFullYear() && viewMonth < maxDate.getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

  type Cell = { day: number; offset: -1 | 0 | 1 };
  const cells: Cell[] = [];
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, offset: -1 });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, offset: 0 });
  let next = 1;
  while (cells.length % 7 !== 0) cells.push({ day: next++, offset: 1 });

  const sel = value ? new Date(value + 'T00:00:00') : null;

  function clickDay(cell: Cell) {
    let y = viewYear, m = viewMonth + cell.offset;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    const date = new Date(y, m, cell.day);
    if (date < today) return;
    onChange(`${y}-${String(m + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`);
  }

  return (
    <div className={`border rounded-xl p-5 bg-white select-none shadow-sm transition-colors duration-200 ${error ? 'border-red-400 ring-1 ring-red-400/50' : 'border-slate-200 hover:border-slate-300'}`}>
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={prevMonth} disabled={!canGoPrev}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-slate-800 tracking-wide">{MESES[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth} disabled={!canGoNext}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {DIAS_SEMANA.map(dia => (
          <div key={dia.key} className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1">{dia.label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map(cell => {
          const isCurrent = cell.offset === 0;
          const mo = (viewMonth + cell.offset + 12) % 12;
          let yearOffset = 0;
          if (cell.offset === -1 && viewMonth === 0) {
            yearOffset = -1;
          } else if (cell.offset === 1 && viewMonth === 11) {
            yearOffset = 1;
          }
          const yo = viewYear + yearOffset;
          const cellKey = `${yo}-${String(mo + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
          const dateCell = new Date(yo, mo, cell.day);
          const isPast = dateCell < today;
          const isAfterMax = dateCell > maxDate;
          const isSelected = sel && isCurrent &&
            sel.getFullYear() === viewYear && sel.getMonth() === viewMonth && sel.getDate() === cell.day;
          const isToday = isCurrent &&
            today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === cell.day;
          
          return (
            <button key={cellKey} type="button" onClick={() => clickDay(cell)}
              disabled={isPast || isAfterMax || !isCurrent}
              className={`flex items-center justify-center w-8 h-8 mx-auto text-xs rounded-full transition-all duration-200
                ${isSelected ? 'bg-emerald-600 text-white font-bold shadow-md scale-105' : ''}
                ${isToday && !isSelected ? 'bg-slate-100 text-emerald-700 font-bold ring-1 ring-inset ring-emerald-200' : ''}
                ${isCurrent && !isPast && !isSelected ? 'hover:bg-emerald-50 cursor-pointer text-slate-700 hover:text-emerald-700' : ''}
                ${isCurrent ? '' : 'text-slate-200 cursor-default'}
                ${(isPast || isAfterMax) && isCurrent ? 'text-slate-300 cursor-not-allowed' : ''}
              `}>
              {cell.day}
            </button>
          );
        })}
      </div>
      {value && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-center text-xs font-semibold text-emerald-700">
            {new Date(value + 'T00:00:00').toLocaleDateString('pt-BR', {
              weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Formulário ───────────────────────────────────────────────────────────────

interface FormState {
  titulo: string;
  tipo: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  duracao_sessao: string;
  capacidade_por_horario: string;
  nome_profissional: string;
  palavra_chave: string;
  corpo_email: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;
type ModoEnvioEvento = 'somente_criar' | 'imediato' | 'agendado';

const TIPOS = [
  { value: 'massagem',   label: '💆  Massagem' },
  { value: 'yoga',       label: '🧘  Yoga' },
  { value: 'meditacao',  label: '🕉️  Meditação' },
  { value: 'nutricao',   label: '🥗  Nutrição' },
  { value: 'pilates',    label: '🤸  Pilates' },
  { value: 'acupuntura', label: '🪡  Acupuntura' },
  { value: 'outro',      label: '✨  Outro' },
];

type FieldErrorProps = Readonly<{ msg?: string }>;

function FieldError({ msg }: FieldErrorProps) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-red-500 animate-in fade-in slide-in-from-top-1">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />{msg}
    </p>
  );
}


function validarCamposBasicos(form: FormState, e: FormErrors): void {
  if (!form.titulo.trim()) e.titulo = 'Nome do evento é obrigatório.';
  if (!form.tipo) e.tipo = 'Selecione o tipo de atividade.';
  if (!form.data) e.data = 'Selecione a data do evento.';
  if (!form.hora_inicio) e.hora_inicio = 'Informe o horário de início.';
  if (!form.hora_fim) e.hora_fim = 'Informe o horário de término.';
}

function validarDataEvento(form: FormState, e: FormErrors): void {
  const limiteFuturo = getDataLimiteFutura();
  if (form.data && dataNoPassado(form.data)) {
    e.data = 'A data do evento não pode ser no passado.';
  }
  if (form.data && dataAposLimite(form.data)) {
    e.data = `A data deve ser até ${limiteFuturo.toLocaleDateString('pt-BR')}.`;
  }
}

function validarHorario(form: FormState, e: FormErrors): void {
  if (form.hora_inicio && form.hora_fim && form.hora_fim <= form.hora_inicio) {
    e.hora_fim = 'Término deve ser após o início.';
  }
}

function validarDuracao(form: FormState, e: FormErrors): void {
  const duracao = Number(form.duracao_sessao);
  if (!form.duracao_sessao || duracao <= 0) {
    e.duracao_sessao = 'Informe a duração (min).';
    return;
  }
  if (!(form.hora_inicio && form.hora_fim)) return;

  const periodoTotal = periodoEmMinutos(form.hora_inicio, form.hora_fim);
  if (periodoTotal > 0 && duracao > periodoTotal) {
    e.duracao_sessao = `A duração não pode exceder o período total (${periodoTotal} min).`;
  }
}

function validarCapacidade(form: FormState, e: FormErrors): void {
  if (!form.capacidade_por_horario || Number(form.capacidade_por_horario) <= 0) {
    e.capacidade_por_horario = 'Informe a capacidade.';
  }
}

function validarFormEvento(form: FormState): FormErrors {
  const e: FormErrors = {};
  validarCamposBasicos(form, e);
  validarDataEvento(form, e);
  validarHorario(form, e);
  validarDuracao(form, e);
  validarCapacidade(form, e);
  return e;
}

const AGENDAMENTO_ENVIO_MINIMO_MINUTOS = 5;

function hojeInputDate(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
}

function montarDataHoraEnvio(data: string, hora: string): Date | null {
  if (!data || !hora) return null;
  const dataHora = new Date(`${data}T${hora}:00`);
  return Number.isNaN(dataHora.getTime()) ? null : dataHora;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function NovoEvento() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    titulo: '', tipo: '', data: '',
    hora_inicio: '08:00', hora_fim: '17:00',
    duracao_sessao: '30', capacidade_por_horario: '1',
    nome_profissional: '', palavra_chave: '', corpo_email: '',
  });
  const [erros, setErros] = useState<FormErrors>({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [presencaBloqueio, setPresencaBloqueio] = useState<{ titulo: string } | null>(null);
  const [modalAgendamentoAberto, setModalAgendamentoAberto] = useState(false);
  const [dataEnvio, setDataEnvio] = useState(hojeInputDate());
  const [horaEnvio, setHoraEnvio] = useState('08:00');

  function update(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (erros[field]) setErros(prev => ({ ...prev, [field]: undefined }));
    setErroGeral('');
  }

  function validar(): boolean {
    const e = validarFormEvento(form);
    setErros(e);
    if (Object.keys(e).length > 0) globalThis.scrollTo({ top: 0, behavior: 'smooth' });
    return Object.keys(e).length === 0;
  }

  function abrirModalAgendamento() {
    if (!validar()) return;
    setErroGeral('');
    setModalAgendamentoAberto(true);
  }

  function validarAgendamentoEnvio(): Date | null {
    const dataHora = montarDataHoraEnvio(dataEnvio, horaEnvio);
    if (!dataHora) {
      setErroGeral('Informe a data e o horario do envio.');
      return null;
    }

    const minimo = Date.now() + AGENDAMENTO_ENVIO_MINIMO_MINUTOS * 60 * 1000;
    if (dataHora.getTime() < minimo) {
      setErroGeral(`Agende o envio para pelo menos ${AGENDAMENTO_ENVIO_MINIMO_MINUTOS} minutos no futuro.`);
      return null;
    }

    return dataHora;
  }

  async function handleSalvar(modoEnvio: ModoEnvioEvento) {
    if (!validar()) return;
    const dataHoraAgendada = modoEnvio === 'agendado' ? validarAgendamentoEnvio() : null;
    if (modoEnvio === 'agendado' && !dataHoraAgendada) return;

    setSalvando(true);
    setErroGeral('');
    try {
      const evento = await adminEventosApi.criar({
        titulo:                 form.titulo.trim(),
        tipo:                   form.tipo,
        data:                   form.data,
        hora_inicio:            form.hora_inicio,
        hora_fim:               form.hora_fim,
        duracao_sessao:         Number(form.duracao_sessao),
        capacidade_por_horario: Number(form.capacidade_por_horario),
        nome_profissional:      form.nome_profissional.trim(),
        palavra_chave:          form.palavra_chave.trim(),
        corpo_email:            form.corpo_email.trim(),
        status:                 'publicado',
      });

      if (modoEnvio === 'imediato') {
        await adminEventosApi.enviarEmails(evento.id, { modo_envio: 'imediato' });
      }

      if (modoEnvio === 'agendado' && dataHoraAgendada) {
        await adminEventosApi.enviarEmails(evento.id, {
          modo_envio: 'agendado',
          agendado_para: dataHoraAgendada.toISOString(),
        });
      }

      navigate('/admin/agendamentos');
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.data?.codigo === 'lista_presenca_pendente') {
        setPresencaBloqueio({ titulo: apiErr.data.evento_titulo as string });
        globalThis.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErroGeral(err instanceof Error ? err.message : 'Erro ao salvar evento.');
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
          <CalendarDays className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Criar Novo Evento</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Configure os detalhes da atividade para a equipe.
          </p>
        </div>
      </div>

      {/* Card Principal */}
      <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 md:p-10">

        {presencaBloqueio && (
          <div className="mb-8 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm font-medium animate-in slide-in-from-top-2">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Lista de presença pendente</p>
              <p>
                Confirme a presença dos participantes no evento <strong>"{presencaBloqueio.titulo}"</strong> antes de criar um novo evento.
              </p>
              <Link
                to="/admin/agendamentos"
                className="inline-block mt-2 text-xs font-bold text-amber-700 underline hover:text-amber-900"
              >
                Ir para Eventos e confirmar presença →
              </Link>
            </div>
          </div>
        )}

        {erroGeral && (
          <div className="mb-8 flex items-start gap-3 bg-red-50/50 border border-red-200 text-red-800 rounded-xl p-4 text-sm font-medium animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <p>{erroGeral}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Seção: Informações Básicas */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Informações Básicas</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="titulo" className="block text-sm font-semibold text-slate-700 mb-2">
                  Nome do Evento <span className="text-red-500">*</span>
                </label>
                <input id="titulo" type="text" value={form.titulo}
                  onChange={e => update('titulo', e.target.value)}
                  placeholder="Ex: Ginástica Laboral Matinal"
                  className={`w-full px-4 py-3 border rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 shadow-sm ${erros.titulo ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}
                />
                <FieldError msg={erros.titulo} />
              </div>

              <div>
                <label htmlFor="tipo" className="block text-sm font-semibold text-slate-700 mb-2">
                  Tipo de Atividade <span className="text-red-500">*</span>
                </label>
                <select id="tipo" value={form.tipo} onChange={e => update('tipo', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 shadow-sm appearance-none cursor-pointer ${erros.tipo ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}>
                  <option value="" disabled>Selecione uma categoria...</option>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <FieldError msg={erros.tipo} />
              </div>

              <div>
                <label htmlFor="palavra_chave" className="block text-sm font-semibold text-slate-700 mb-2">
                  Palavra-chave de Acesso <span className="text-slate-400 font-normal ml-1">(Opcional)</span>
                </label>
                <input
                  id="palavra_chave"
                  type="text"
                  value={form.palavra_chave}
                  onChange={e => update('palavra_chave', e.target.value)}
                  placeholder="Ex: YOGA2026"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 hover:border-slate-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 shadow-sm"
                />
                <p className="mt-2 text-[13px] text-slate-500">
                  Deixe em branco para permitir o acesso livre aos convidados.
                </p>
              </div>
            </div>
          </div>

          {/* Seção: Agenda e Configurações */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Agenda e Capacidade</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Coluna Calendário */}
              <div className="lg:col-span-5">
                <span className="block text-sm font-semibold text-slate-700 mb-2">
                  Data do Evento <span className="text-red-500">*</span>
                </span>
                <input type="hidden" value={form.data} />
                <MiniCalendar value={form.data} onChange={v => update('data', v)} error={erros.data} />
                <p className="mt-2 text-[13px] text-slate-500 text-center">
                  Permitido até {MAX_MESES_FUTURO} meses à frente.
                </p>
                <div className="flex justify-center"><FieldError msg={erros.data} /></div>
              </div>

              {/* Coluna Horários */}
              <div className="lg:col-span-7 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="hora_inicio" className="block text-sm font-semibold text-slate-700 mb-2">
                      Início <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="hora_inicio"
                      type="time"
                      value={form.hora_inicio}
                      onChange={e => update('hora_inicio', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 shadow-sm ${erros.hora_inicio ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}
                    />
                    <FieldError msg={erros.hora_inicio} />
                  </div>
                  <div>
                    <label htmlFor="hora_fim" className="block text-sm font-semibold text-slate-700 mb-2">
                      Término <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="hora_fim"
                      type="time"
                      value={form.hora_fim}
                      onChange={e => update('hora_fim', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 shadow-sm ${erros.hora_fim ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}
                    />
                    <FieldError msg={erros.hora_fim} />
                  </div>
                </div>

                {/* Aviso de bloqueio do almoço */}
                {form.hora_inicio && form.hora_fim && form.hora_fim > form.hora_inicio &&
                  form.hora_inicio < '13:30' && form.hora_fim > '12:00' && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 font-medium">
                    <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      O intervalo de almoço <strong>(12:00 – 13:30)</strong> é bloqueado automaticamente. Sessões que coincidam com esse período serão descartadas ao salvar.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="duracao_sessao" className="block text-sm font-semibold text-slate-700 mb-2">
                      Duração (min) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input id="duracao_sessao" type="number" min={5} max={480} value={form.duracao_sessao}
                        onChange={e => update('duracao_sessao', e.target.value)}
                        className={`w-full px-4 py-3 pr-12 border rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 shadow-sm ${erros.duracao_sessao ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}
                      />
                      <span className="absolute right-4 top-3 text-sm font-medium text-slate-400 pointer-events-none">min</span>
                    </div>
                    <FieldError msg={erros.duracao_sessao} />
                  </div>

                  <div>
                    <label htmlFor="capacidade_por_horario" className="block text-sm font-semibold text-slate-700 mb-2">
                      Capacidade <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input id="capacidade_por_horario" type="number" min={1} max={500} value={form.capacidade_por_horario}
                        onChange={e => update('capacidade_por_horario', e.target.value)}
                        className={`w-full px-4 py-3 pr-16 border rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 shadow-sm ${erros.capacidade_por_horario ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}
                      />
                      <span className="absolute right-4 top-3 text-sm font-medium text-slate-400 pointer-events-none">vagas</span>
                    </div>
                    <FieldError msg={erros.capacidade_por_horario} />
                  </div>
                </div>

                {/* Card de Resumo de Sessões */}
                {form.hora_inicio && form.hora_fim && Number(form.duracao_sessao) > 0 && form.hora_fim > form.hora_inicio && (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between text-sm">
                    <span className="text-emerald-800 font-medium">Estimativa de sessões geradas:</span>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg">
                      ~ {Math.floor(periodoEmMinutos(form.hora_inicio, form.hora_fim) / Number(form.duracao_sessao))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seção: Comunicação */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Comunicação</h2>
            
            <div>
              <label htmlFor="corpo_email" className="block text-sm font-semibold text-slate-700 mb-2">
                Mensagem do E-mail Convite
              </label>
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm focus-within:ring-4 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all duration-200">
                <EditorEmailConvite
                  value={form.corpo_email}
                  onChange={(value) => update('corpo_email', value)}
                />
              </div>
              <p className="mt-2 text-[13px] text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Suporta formatação rica e imagens (PNG, JPG, WEBP até 10 MB). Clique numa imagem inserida para redimensioná-la.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-10 pt-6 border-t border-slate-100">
          {Object.keys(erros).length > 0 && (
            <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Verifique os campos obrigatórios em destaque antes de salvar.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <button type="button" onClick={() => handleSalvar('somente_criar')} disabled={salvando}
              className="w-full py-3.5 px-5 bg-white hover:bg-slate-50 disabled:opacity-70 text-slate-700 border border-slate-200 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm focus:ring-4 focus:ring-slate-500/20 outline-none">
              {salvando
                ? <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Processando...</>
                : <><Save className="w-5 h-5" /> Criar evento</>
              }
            </button>

            <button type="button" onClick={() => handleSalvar('imediato')} disabled={salvando}
              className="w-full py-3.5 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg focus:ring-4 focus:ring-blue-500/30 outline-none">
              {salvando
                ? <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Processando...</>
                : <><Send className="w-5 h-5" /> Criar e enviar agora</>
              }
            </button>

            <button type="button" onClick={abrirModalAgendamento} disabled={salvando}
              className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 disabled:hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg focus:ring-4 focus:ring-emerald-500/30 outline-none">
              <Clock className="w-5 h-5" />
              Criar e agendar envio
            </button>
          </div>

          <div className="mt-5 flex items-start gap-2.5 text-[13px] text-slate-500 bg-slate-50 rounded-xl p-4">
            <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p>
              Ao salvar, este evento será publicado imediatamente. Você poderá gerenciar cancelamentos ou disparar notificações por e-mail posteriormente na aba de agendamentos.
            </p>
          </div>
        </div>

      </div>

      {modalAgendamentoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Agendar envio do convite</h2>
                <p className="mt-1 text-sm text-slate-500">Escolha quando o e-mail sera enviado.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalAgendamentoAberto(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {erroGeral && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{erroGeral}</span>
                </div>
              )}

              <div>
                <label htmlFor="data_envio_evento" className="block text-sm font-semibold text-slate-700 mb-2">
                  Data do envio
                </label>
                <input
                  id="data_envio_evento"
                  type="date"
                  min={hojeInputDate()}
                  value={dataEnvio}
                  onChange={(e) => setDataEnvio(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="hora_envio_evento" className="block text-sm font-semibold text-slate-700 mb-2">
                  Horario do envio
                </label>
                <input
                  id="hora_envio_evento"
                  type="time"
                  value={horaEnvio}
                  onChange={(e) => setHoraEnvio(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-800">
                O evento sera criado e o convite ficara aguardando ate a data e horario definidos.
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setModalAgendamentoAberto(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSalvar('agendado')}
                disabled={salvando}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                {salvando ? 'Processando...' : 'Criar e agendar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
