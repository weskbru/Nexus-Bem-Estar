import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Save,
  Info,
  CalendarDays,
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { adminEventosApi } from '../../services/api';
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

function minutosParaHora(totalMinutos: number): string {
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

const HORARIOS_OPCOES = Array.from({ length: 24 * 12 }, (_, index) => minutosParaHora(index * 5));

type TimePickerSelectProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}>;

function TimePickerSelect({
  value,
  onChange,
  error,
  placeholder,
}: TimePickerSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`w-full px-4 py-3 rounded-xl border text-sm text-left outline-none transition-all duration-200 bg-white shadow-sm
          hover:border-emerald-300 hover:bg-slate-50
          focus-visible:ring-4 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500
          ${error ? 'border-red-400 bg-red-50/30' : 'border-slate-200'}`}
      >
        <span className={value ? 'text-slate-800 font-medium' : 'text-slate-400'}>{value || placeholder || 'Selecione...'}</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {HORARIOS_OPCOES.map((horario) => {
              const isSelected = value === horario;
              return (
                <button
                  key={horario}
                  type="button"
                  onClick={() => {
                    onChange(horario);
                    setOpen(false);
                  }}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors mb-0.5 last:mb-0
                    ${isSelected
                      ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                      : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                >
                  {horario}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const EMAIL_FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'align', 'link', 'image',
];

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

function inserirImagemNoEditor(file: File, quillRef: RefObject<ReactQuill | null>): void {
  const reader = new FileReader();
  reader.onload = () => {
    const editor = quillRef.current?.getEditor();
    if (!editor || typeof reader.result !== 'string') return;
    const range = editor.getSelection(true);
    const index = range ? range.index : editor.getLength();
    editor.insertEmbed(index, 'image', reader.result, 'user');
    editor.setSelection(index + 1);
  };
  reader.readAsDataURL(file);
}

function abrirSeletorImagem(quillRef: RefObject<ReactQuill | null>): void {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'image/png,image/jpeg,image/jpg,image/webp');
  input.click();

  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      globalThis.alert('A imagem deve ter no máximo 5MB.');
      return;
    }
    inserirImagemNoEditor(file, quillRef);
  };
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function NovoEvento() {
  const navigate = useNavigate();
  const quillRef = useRef<ReactQuill | null>(null);

  const emailModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link', 'image', 'clean'],
      ],
      handlers: {
        image: () => abrirSeletorImagem(quillRef),
      },
    },
  }), []);

  const [form, setForm] = useState<FormState>({
    titulo: '', tipo: '', data: '',
    hora_inicio: '08:00', hora_fim: '17:00',
    duracao_sessao: '30', capacidade_por_horario: '1',
    nome_profissional: '', palavra_chave: '', corpo_email: '',
  });
  const [erros, setErros] = useState<FormErrors>({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);

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

  async function handleSalvar() {
    if (!validar()) return;
    setSalvando(true);
    setErroGeral('');
    try {
      await adminEventosApi.criar({
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
      navigate('/admin/agendamentos');
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : 'Erro ao salvar evento.');
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
                    <span className="block text-sm font-semibold text-slate-700 mb-2">
                      Início <span className="text-red-500">*</span>
                    </span>
                    <TimePickerSelect value={form.hora_inicio} onChange={(v) => update('hora_inicio', v)} error={erros.hora_inicio} />
                    <FieldError msg={erros.hora_inicio} />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-slate-700 mb-2">
                      Término <span className="text-red-500">*</span>
                    </span>
                    <TimePickerSelect value={form.hora_fim} onChange={(v) => update('hora_fim', v)} error={erros.hora_fim} />
                    <FieldError msg={erros.hora_fim} />
                  </div>
                </div>

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
              <input id="corpo_email" type="hidden" value={form.corpo_email} />
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm focus-within:ring-4 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all duration-200">
                <ReactQuill
                  ref={quillRef}
                  className="email-editor border-none"
                  value={form.corpo_email}
                  onChange={(value) => update('corpo_email', value)}
                  placeholder="Escreva os detalhes que os convidados precisam saber..."
                  theme="snow"
                  modules={emailModules}
                  formats={EMAIL_FORMATS}
                />
              </div>
              <p className="mt-2 text-[13px] text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Suporta formatação rica e imagens (PNG, JPG, WEBP até 5MB).
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

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button type="button" onClick={handleSalvar} disabled={salvando}
              className="w-full sm:w-auto flex-1 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 disabled:hover:bg-emerald-600 text-white rounded-xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg focus:ring-4 focus:ring-emerald-500/30 outline-none">
              {salvando
                ? <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Processando...</>
                : <><Save className="w-5 h-5" /> Salvar e Publicar Evento</>
              }
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
    </div>
  );
}