import { useState, useEffect, useMemo, useRef, type RefObject } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowLeft,
  Save,
  Lock,
  Info,
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { adminEventosApi, type EventoDTO } from '../../services/api';
import {
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

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

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
          if (cell.offset === -1 && viewMonth === 0) { yearOffset = -1; } 
          else if (cell.offset === 1 && viewMonth === 11) { yearOffset = 1; }
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

function mapEventoToForm(evento: EventoDTO): FormState {
  return {
    titulo: evento.titulo,
    tipo: evento.tipo,
    data: evento.data,
    hora_inicio: evento.hora_inicio.substring(0, 5),
    hora_fim: evento.hora_fim.substring(0, 5),
    duracao_sessao: String(evento.duracao_sessao),
    capacidade_por_horario: String(evento.capacidade_por_horario),
    palavra_chave: evento.palavra_chave ?? '',
    corpo_email: evento.corpo_email ?? '',
  };
}

function validarCamposBasicos(form: FormState, e: FormErrors): void {
  if (!form.titulo.trim()) e.titulo = 'Nome do evento é obrigatório.';
  if (!form.tipo) e.tipo = 'Selecione o tipo de atividade.';
  if (!form.hora_inicio) e.hora_inicio = 'Informe o horário de início.';
  if (!form.hora_fim) e.hora_fim = 'Informe o horário de término.';
}

function validarDataEvento(form: FormState, e: FormErrors): void {
  const limiteFuturo = getDataLimiteFutura();
  if (!form.data) {
    e.data = 'Selecione a data do evento.';
    return;
  }
  if (dataNoPassado(form.data)) {
    e.data = 'A data do evento não pode ser no passado.';
  }
  if (dataAposLimite(form.data)) {
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

type StatusBadgeInfo = Readonly<{ label: string; className: string }>;

function getStatusBadgeInfo(status: string): StatusBadgeInfo {
  if (status === 'ATIVO' || status === 'PUBLICADO') {
    return { label: 'Publicado', className: 'bg-emerald-100 text-emerald-800 border border-emerald-200/60' };
  }
  if (status === 'CANCELADO') {
    return { label: 'Cancelado', className: 'bg-rose-100 text-rose-800 border border-rose-200/60' };
  }
  return { label: 'Encerrado', className: 'bg-slate-100 text-slate-700 border border-slate-200/60' };
}

const EMAIL_FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'align', 'link', 'image',
];

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function EditarEvento() {
  const { id } = useParams<{ id: string }>();
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

  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState('');
  const [statusEvento, setStatusEvento] = useState('');

  const [form, setForm] = useState<FormState>({
    titulo: '', tipo: '', data: '', hora_inicio: '', hora_fim: '',
    duracao_sessao: '30', capacidade_por_horario: '1', palavra_chave: '', corpo_email: '',
  });
  const [erros, setErros] = useState<FormErrors>({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!id) return;
    adminEventosApi.obter(Number(id))
      .then((evento) => {
        setStatusEvento(evento.status);
        setForm(mapEventoToForm(evento));
      })
      .catch(() => setErroCarregar('Não foi possível carregar o evento.'))
      .finally(() => setCarregando(false));
  }, [id]);

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

  function buildPayload(): Partial<EventoDTO> {
    return {
      titulo:                 form.titulo.trim(),
      tipo:                   form.tipo,
      data:                   form.data,
      hora_inicio:            form.hora_inicio,
      hora_fim:               form.hora_fim,
      duracao_sessao:         Number(form.duracao_sessao),
      capacidade_por_horario: Number(form.capacidade_por_horario),
      palavra_chave:          form.palavra_chave.trim(),
      corpo_email:            form.corpo_email.trim(),
    };
  }

  async function handleSalvar() {
    if (statusEvento.toUpperCase() === 'ENCERRADO') return;
    if (!validar()) return;
    setSalvando(true);
    setErroGeral('');
    try {
      await adminEventosApi.atualizar(Number(id), buildPayload());
      navigate('/admin/agendamentos');
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : 'Erro ao salvar evento.');
    } finally {
      setSalvando(false);
    }
  }

  // ── Estados Especiais ────────────────────────────────────────────────────────

  if (carregando) {
    return (
      <div className="max-w-6xl mx-auto py-20 text-center animate-in fade-in duration-500">
        <svg className="animate-spin h-10 w-10 text-emerald-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-slate-500 font-medium">Carregando informações do evento...</p>
      </div>
    );
  }

  if (erroCarregar) {
    return (
      <div className="max-w-6xl mx-auto py-20 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <p className="text-slate-800 font-bold text-lg mb-2">{erroCarregar}</p>
        <Link to="/admin/agendamentos" className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
          Voltar para Agendamentos
        </Link>
      </div>
    );
  }

  const normalizedStatus = statusEvento.toUpperCase() === 'PUBLICADO' ? 'ATIVO' : statusEvento.toUpperCase();
  const isCancelado = normalizedStatus === 'CANCELADO';
  const isEncerrado = normalizedStatus === 'ENCERRADO';
  const statusBadgeInfo = getStatusBadgeInfo(normalizedStatus);

  if (isEncerrado || isCancelado) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin/agendamentos" className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 text-slate-500 transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Editar Evento</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Eventos cancelados ou encerrados não podem ser alterados.</p>
          </div>
        </div>

        <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-8 md:p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
            <Lock className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Evento {isEncerrado ? 'Encerrado' : 'Cancelado'}</h2>
          <p className="text-slate-500 font-medium max-w-md mx-auto mb-6">
            Por questões de histórico e auditoria, as informações deste evento estão bloqueadas para edição. Para realizar uma nova atividade, crie um novo evento.
          </p>
          <Link to="/admin/agendamentos" className="inline-flex items-center justify-center px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm focus:ring-4 focus:ring-slate-100 outline-none">
            Voltar para Agendamentos
          </Link>
        </div>
      </div>
    );
  }

  // ── Formulário Ativo ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <Link to="/admin/agendamentos" className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 text-slate-500 transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Editar Evento</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Atualize os detalhes da atividade.</p>
          </div>
        </div>
        {statusEvento && (
          <div className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${statusBadgeInfo.className}`}>
            {statusBadgeInfo.label}
          </div>
        )}
      </div>

      {/* Card Principal */}
      <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 md:p-10">
        
        {erroGeral && (
          <div className="mb-8 flex items-start gap-3 bg-red-50/50 border border-red-200 text-red-800 rounded-xl p-4 text-sm font-medium animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <p>{erroGeral}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Coluna Esquerda: Info Básica & Comunicação */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Informações Básicas</h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="evento-titulo" className="block text-sm font-semibold text-slate-700 mb-2">
                    Nome do Evento <span className="text-red-500">*</span>
                  </label>
                  <input id="evento-titulo" type="text" value={form.titulo} onChange={e => update('titulo', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 shadow-sm ${erros.titulo ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}
                  />
                  <FieldError msg={erros.titulo} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="tipo-atividade" className="block text-sm font-semibold text-slate-700 mb-2">
                      Tipo de Atividade <span className="text-red-500">*</span>
                    </label>
                    <select id="tipo-atividade" value={form.tipo} onChange={e => update('tipo', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 shadow-sm appearance-none cursor-pointer ${erros.tipo ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}>
                      <option value="" disabled>Selecione...</option>
                      {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <FieldError msg={erros.tipo} />
                  </div>

                  <div>
                    <label htmlFor="palavra-chave-acesso" className="block text-sm font-semibold text-slate-700 mb-2">
                      Palavra-chave <span className="text-slate-400 font-normal ml-1">(Opcional)</span>
                    </label>
                    <input id="palavra-chave-acesso" type="text" value={form.palavra_chave} onChange={e => update('palavra_chave', e.target.value)}
                      placeholder="Ex: YOGA2026"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 hover:border-slate-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Comunicação</h2>
              <div>
                <p id="mensagem-email-label" className="block text-sm font-semibold text-slate-700 mb-2">
                  Mensagem do E-mail Convite
                </p>
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm focus-within:ring-4 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all duration-200">
                  <ReactQuill
                    ref={quillRef}
                    className="email-editor border-none"
                    aria-labelledby="mensagem-email-label"
                    value={form.corpo_email}
                    onChange={(value: string) => update('corpo_email', value)}
                    theme="snow"
                    modules={emailModules}
                    formats={EMAIL_FORMATS}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Calendário & Horários */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Agenda</h2>
              <div className="space-y-6">
                <div>
                  <p className="block text-sm font-semibold text-slate-700 mb-2">
                    Data do Evento <span className="text-red-500">*</span>
                  </p>
                  <MiniCalendar value={form.data} onChange={v => update('data', v)} error={erros.data} />
                  <FieldError msg={erros.data} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="hora-inicio" className="block text-sm font-semibold text-slate-700 mb-2">
                      Início <span className="text-red-500">*</span>
                    </label>
                    <input id="hora-inicio" type="time" value={form.hora_inicio} onChange={e => update('hora_inicio', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 shadow-sm ${erros.hora_inicio ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}
                    />
                    <FieldError msg={erros.hora_inicio} />
                  </div>
                  <div>
                    <label htmlFor="hora-fim" className="block text-sm font-semibold text-slate-700 mb-2">
                      Término <span className="text-red-500">*</span>
                    </label>
                    <input id="hora-fim" type="time" value={form.hora_fim} onChange={e => update('hora_fim', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 shadow-sm ${erros.hora_fim ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}
                    />
                    <FieldError msg={erros.hora_fim} />
                  </div>
                </div>

                {/* Aviso de bloqueio do almoço */}
                {form.hora_inicio && form.hora_fim && form.hora_fim > form.hora_inicio &&
                  form.hora_inicio < '13:30' && form.hora_fim > '11:40' && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 font-medium">
                    <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      O intervalo de almoço <strong>(11:40 – 13:30)</strong> é bloqueado automaticamente. Sessões que coincidam com esse período serão descartadas ao salvar.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="duracao-sessao" className="block text-sm font-semibold text-slate-700 mb-2">
                      Duração (min) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input id="duracao-sessao" type="number" min={5} max={480} value={form.duracao_sessao} onChange={e => update('duracao_sessao', e.target.value)}
                        className={`w-full px-4 py-3 pr-12 border rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 shadow-sm ${erros.duracao_sessao ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}
                      />
                      <span className="absolute right-4 top-3 text-sm font-medium text-slate-400 pointer-events-none">min</span>
                    </div>
                    <FieldError msg={erros.duracao_sessao} />
                  </div>
                  <div>
                    <label htmlFor="capacidade-horario" className="block text-sm font-semibold text-slate-700 mb-2">
                      Capacidade <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input id="capacidade-horario" type="number" min={1} max={500} value={form.capacidade_por_horario} onChange={e => update('capacidade_por_horario', e.target.value)}
                        className={`w-full px-4 py-3 pr-16 border rounded-xl text-sm font-medium text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 shadow-sm ${erros.capacidade_por_horario ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}
                      />
                      <span className="absolute right-4 top-3 text-sm font-medium text-slate-400 pointer-events-none">vagas</span>
                    </div>
                    <FieldError msg={erros.capacidade_por_horario} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-4">
          {Object.keys(erros).length > 0 && (
            <div className="w-full sm:w-auto flex-1 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Verifique os campos obrigatórios.
            </div>
          )}

          <div className="w-full sm:w-auto flex flex-col-reverse sm:flex-row gap-3 ml-auto">
            <Link to="/admin/agendamentos" className="w-full sm:w-auto px-6 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm text-center transition-colors shadow-sm focus:ring-4 focus:ring-slate-100 outline-none">
              Cancelar
            </Link>
            <button type="button" onClick={handleSalvar} disabled={salvando}
              className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white rounded-xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg focus:ring-4 focus:ring-emerald-500/30 outline-none">
              {salvando
                ? <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Salvando...</>
                : <><Save className="w-5 h-5" /> Salvar Alterações</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}