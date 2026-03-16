import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowLeft,
  Save,
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { adminEventosApi, type EventoDTO } from '../../services/api';
import {
  MAX_MESES_FUTURO,
  dataAposLimite,
  dataNoPassado,
  getDataLimiteFutura,
  getHojeSemHora,
  periodoEmMinutos,
} from '../../lib/eventoRules';

// ─── Mini Calendário ──────────────────────────────────────────────────────────

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function MiniCalendar({ value, onChange, error }: { value: string; onChange: (d: string) => void; error?: string }) {
  const today = getHojeSemHora();
  const maxDate = getDataLimiteFutura();
  const initDate = value ? new Date(value + 'T00:00:00') : today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const canGoPrev = viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());
  const canGoNext = viewYear < maxDate.getFullYear() ||
    (viewYear === maxDate.getFullYear() && viewMonth < maxDate.getMonth());

  // sync when value loads asynchronously
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
    <div className={`border rounded-xl p-4 bg-white select-none ${error ? 'border-red-400' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} disabled={!canGoPrev}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-slate-900">{MESES[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth} disabled={!canGoNext}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, i) => {
          const isCurrent = cell.offset === 0;
          const mo = (viewMonth + cell.offset + 12) % 12;
          const yo = viewYear + (cell.offset === -1 && viewMonth === 0 ? -1 : cell.offset === 1 && viewMonth === 11 ? 1 : 0);
          const dateCell = new Date(yo, mo, cell.day);
          const isPast = dateCell < today;
          const isAfterMax = dateCell > maxDate;
          const isSelected = sel && isCurrent &&
            sel.getFullYear() === viewYear && sel.getMonth() === viewMonth && sel.getDate() === cell.day;
          const isToday = isCurrent &&
            today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === cell.day;
          return (
            <button key={i} type="button" onClick={() => clickDay(cell)}
              disabled={isPast || isAfterMax || !isCurrent}
              className={`text-center text-xs py-1.5 rounded-full transition-colors
                ${isSelected ? 'bg-blue-600 text-white font-bold' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-blue-400 text-blue-700 font-semibold' : ''}
                ${isCurrent && !isPast && !isSelected ? 'hover:bg-blue-50 cursor-pointer text-slate-700' : ''}
                ${!isCurrent ? 'text-slate-200 cursor-default' : ''}
                ${(isPast || isAfterMax) && isCurrent ? 'text-slate-300 cursor-not-allowed' : ''}
              `}>
              {cell.day}
            </button>
          );
        })}
      </div>
      {value && (
        <p className="mt-3 text-center text-xs font-medium text-blue-600">
          {new Date(value + 'T00:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
          })}
        </p>
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

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="w-3 h-3 shrink-0" />{msg}
    </p>
  );
}

const EMAIL_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'align',
  'link',
  'image',
];

// ─── Componente principal ─────────────────────────────────────────────────────

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
        image: () => {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/png,image/jpeg,image/jpg,image/webp');
          input.click();

          input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
              window.alert('A imagem deve ter no máximo 5MB.');
              return;
            }

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
          };
        },
      },
    },
  }), []);

  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState('');
  const [statusEvento, setStatusEvento] = useState('');

  const [form, setForm] = useState<FormState>({
    titulo: '', tipo: '', data: '', hora_inicio: '', hora_fim: '',
    duracao_sessao: '30', capacidade_por_horario: '1', corpo_email: '',
  });
  const [erros, setErros] = useState<FormErrors>({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!id) return;
    adminEventosApi.obter(Number(id))
      .then((evento) => {
        setStatusEvento(evento.status);
        setForm({
          titulo:                 evento.titulo,
          tipo:                   evento.tipo,
          data:                   evento.data,
          hora_inicio:            evento.hora_inicio.substring(0, 5),
          hora_fim:               evento.hora_fim.substring(0, 5),
          duracao_sessao:         String(evento.duracao_sessao),
          capacidade_por_horario: String(evento.capacidade_por_horario),
          corpo_email:            evento.corpo_email ?? '',
        });
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
    const e: FormErrors = {};
    const limiteFuturo = getDataLimiteFutura();
    if (!form.titulo.trim())       e.titulo               = 'Nome do evento é obrigatório.';
    if (!form.tipo)                e.tipo                 = 'Selecione o tipo de atividade.';
    if (!form.data)                e.data                 = 'Selecione a data do evento.';
    if (form.data && dataNoPassado(form.data))
                                   e.data                 = 'A data do evento não pode ser no passado.';
    if (form.data && dataAposLimite(form.data))
                                   e.data                 = `A data deve ser até ${limiteFuturo.toLocaleDateString('pt-BR')}.`;
    if (!form.hora_inicio)         e.hora_inicio          = 'Informe o horário de início.';
    if (!form.hora_fim)            e.hora_fim             = 'Informe o horário de término.';
    if (form.hora_inicio && form.hora_fim && form.hora_fim <= form.hora_inicio)
                                   e.hora_fim             = 'Término deve ser após o início.';
    if (!form.duracao_sessao || Number(form.duracao_sessao) <= 0)
                                   e.duracao_sessao       = 'Informe a duração (min).';
    if (form.hora_inicio && form.hora_fim && Number(form.duracao_sessao) > 0) {
      const periodoTotal = periodoEmMinutos(form.hora_inicio, form.hora_fim);
      if (periodoTotal > 0 && Number(form.duracao_sessao) > periodoTotal) {
        e.duracao_sessao = `A duração não pode ser maior que o período total (${periodoTotal} min).`;
      }
    }
    if (!form.capacidade_por_horario || Number(form.capacidade_por_horario) <= 0)
                     e.capacidade_por_horario = 'Informe a capacidade.';
    setErros(e);
    if (Object.keys(e).length > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // ── Estados especiais ────────────────────────────────────────────────────────

  if (carregando) {
    return (
      <div className="max-w-3xl mx-auto mt-20 text-center">
        <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-slate-500 text-sm">Carregando evento...</p>
      </div>
    );
  }

  if (erroCarregar) {
    return (
      <div className="max-w-3xl mx-auto mt-20 text-center">
        <p className="text-red-600 mb-4">{erroCarregar}</p>
        <Link to="/admin/agendamentos" className="text-blue-600 hover:underline text-sm">
          Voltar para Agendamentos
        </Link>
      </div>
    );
  }

  const normalizedStatus = statusEvento.toUpperCase() === 'PUBLICADO' ? 'ATIVO' : statusEvento.toUpperCase();
  const isCancelado = normalizedStatus === 'CANCELADO';
  const isEncerrado = normalizedStatus === 'ENCERRADO';

  if (isEncerrado || isCancelado) {
    return (
      <div className="max-w-3xl mx-auto mt-10">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin/agendamentos">
            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Editar Evento</h1>
            <p className="text-slate-500 text-sm">Eventos cancelados ou encerrados não podem ser editados.</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-800 text-sm">
          Este evento está {isEncerrado ? 'encerrado' : 'cancelado'}. Para alterar informações, crie um novo evento.
          <div className="mt-3">
            <Link to="/admin/agendamentos" className="text-amber-900 font-semibold hover:underline">
              Voltar para Agendamentos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulário ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/agendamentos">
          <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Editar Evento</h1>
          <p className="text-slate-500 text-sm">Atualize os detalhes do evento.</p>
        </div>
        {statusEvento && (
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${
            normalizedStatus === 'ATIVO' ? 'bg-emerald-100 text-emerald-700' :
            normalizedStatus === 'CANCELADO' ? 'bg-rose-100 text-rose-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {normalizedStatus === 'ATIVO' ? 'Publicado' : normalizedStatus === 'CANCELADO' ? 'Cancelado' : 'Encerrado'}
          </span>
        )}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        {erroGeral && (
          <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{erroGeral}
          </div>
        )}

        {/* Nome */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Nome do Evento <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.titulo}
            onChange={e => update('titulo', e.target.value)}
            className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${erros.titulo ? 'border-red-400' : 'border-slate-300'}`}
          />
          <FieldError msg={erros.titulo} />
        </div>

        {/* Data + Config */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Data do Evento <span className="text-red-500">*</span>
            </label>
            <MiniCalendar value={form.data} onChange={v => update('data', v)} error={erros.data} />
            <p className="mt-1 text-xs text-slate-500">
              Permitido entre hoje e {getDataLimiteFutura().toLocaleDateString('pt-BR')} ({MAX_MESES_FUTURO} meses).
            </p>
            <FieldError msg={erros.data} />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Início <span className="text-red-500">*</span>
                </label>
                <input type="time" value={form.hora_inicio}
                  onChange={e => update('hora_inicio', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition ${erros.hora_inicio ? 'border-red-400' : 'border-slate-300'}`}
                />
                <FieldError msg={erros.hora_inicio} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Término <span className="text-red-500">*</span>
                </label>
                <input type="time" value={form.hora_fim}
                  onChange={e => update('hora_fim', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition ${erros.hora_fim ? 'border-red-400' : 'border-slate-300'}`}
                />
                <FieldError msg={erros.hora_fim} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Duração por Sessão (min) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input type="number" min={5} max={480} value={form.duracao_sessao}
                  onChange={e => update('duracao_sessao', e.target.value)}
                  className={`w-full px-4 py-2.5 pr-12 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition ${erros.duracao_sessao ? 'border-red-400' : 'border-slate-300'}`}
                />
                <span className="absolute right-3 top-2.5 text-sm text-slate-400 pointer-events-none">min</span>
              </div>
              <FieldError msg={erros.duracao_sessao} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Capacidade por Horário <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input type="number" min={1} max={500} value={form.capacidade_por_horario}
                  onChange={e => update('capacidade_por_horario', e.target.value)}
                  className={`w-full px-4 py-2.5 pr-16 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition ${erros.capacidade_por_horario ? 'border-red-400' : 'border-slate-300'}`}
                />
                <span className="absolute right-3 top-2.5 text-sm text-slate-400 pointer-events-none">pessoas</span>
              </div>
              <FieldError msg={erros.capacidade_por_horario} />
            </div>
          </div>
        </div>

        {/* Tipo */}
        <div className="mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tipo de Atividade <span className="text-red-500">*</span>
            </label>
            <select value={form.tipo} onChange={e => update('tipo', e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-white ${erros.tipo ? 'border-red-400' : 'border-slate-300'}`}>
              <option value="">Selecione...</option>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <FieldError msg={erros.tipo} />
          </div>
        </div>

        {/* Corpo do e-mail */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Mensagem do E-mail
          </label>
          <div className="rounded-lg border border-slate-300 overflow-hidden bg-white">
            <ReactQuill
              ref={quillRef}
              className="email-editor"
              value={form.corpo_email}
              onChange={(value) => update('corpo_email', value)}
              placeholder="Olá! Temos uma nova atividade de bem-estar disponível para você..."
              theme="snow"
              modules={emailModules}
              formats={EMAIL_FORMATS}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Este conteúdo suporta formatação e anexos de foto (PNG, JPG, WEBP até 5MB).
          </p>
        </div>

        {/* Aviso validação */}
        {Object.keys(erros).length > 0 && (
          <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Preencha todos os campos obrigatórios destacados acima.
          </div>
        )}

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={handleSalvar}
            disabled={salvando}
            className="flex-1 py-3 px-6 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {salvando
              ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              : <Save className="w-4 h-4" />}
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
