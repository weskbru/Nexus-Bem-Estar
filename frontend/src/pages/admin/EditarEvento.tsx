import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowLeft,
  Save,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { adminEventosApi, type EventoDTO } from '../../services/api';

// ─── Mini Calendário ──────────────────────────────────────────────────────────

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function MiniCalendar({ value, onChange, error }: { value: string; onChange: (d: string) => void; error?: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const initDate = value ? new Date(value + 'T00:00:00') : today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

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
        <button type="button" onClick={prevMonth}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-slate-900">{MESES[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
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
          const isPast = new Date(yo, mo, cell.day) < today;
          const isSelected = sel && isCurrent &&
            sel.getFullYear() === viewYear && sel.getMonth() === viewMonth && sel.getDate() === cell.day;
          const isToday = isCurrent &&
            today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === cell.day;
          return (
            <button key={i} type="button" onClick={() => clickDay(cell)}
              disabled={isPast || !isCurrent}
              className={`text-center text-xs py-1.5 rounded-full transition-colors
                ${isSelected ? 'bg-blue-600 text-white font-bold' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-blue-400 text-blue-700 font-semibold' : ''}
                ${isCurrent && !isPast && !isSelected ? 'hover:bg-blue-50 cursor-pointer text-slate-700' : ''}
                ${!isCurrent ? 'text-slate-200 cursor-default' : ''}
                ${isPast && isCurrent ? 'text-slate-300 cursor-not-allowed' : ''}
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
  nome_profissional: string;
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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function EditarEvento() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState('');
  const [statusEvento, setStatusEvento] = useState('');

  const [form, setForm] = useState<FormState>({
    titulo: '', tipo: '', data: '', hora_inicio: '', hora_fim: '',
    duracao_sessao: '30', capacidade_por_horario: '1', nome_profissional: '', corpo_email: '',
  });
  const [erros, setErros] = useState<FormErrors>({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

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
          nome_profissional:      evento.nome_profissional,
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
    if (!form.titulo.trim())       e.titulo               = 'Nome do evento é obrigatório.';
    if (!form.tipo)                e.tipo                 = 'Selecione o tipo de atividade.';
    if (!form.data)                e.data                 = 'Selecione a data do evento.';
    if (!form.hora_inicio)         e.hora_inicio          = 'Informe o horário de início.';
    if (!form.hora_fim)            e.hora_fim             = 'Informe o horário de término.';
    if (form.hora_inicio && form.hora_fim && form.hora_fim <= form.hora_inicio)
                                   e.hora_fim             = 'Término deve ser após o início.';
    if (!form.duracao_sessao || Number(form.duracao_sessao) <= 0)
                                   e.duracao_sessao       = 'Informe a duração (min).';
    if (!form.capacidade_por_horario || Number(form.capacidade_por_horario) <= 0)
                                   e.capacidade_por_horario = 'Informe a capacidade.';
    if (!form.nome_profissional.trim()) e.nome_profissional = 'Nome do profissional é obrigatório.';
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
      nome_profissional:      form.nome_profissional.trim(),
      corpo_email:            form.corpo_email.trim(),
    };
  }

  async function handleSalvar() {
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

  async function handleSalvarEPublicar() {
    if (!validar()) return;
    setPublicando(true);
    setErroGeral('');
    try {
      await adminEventosApi.atualizar(Number(id), buildPayload());
      await adminEventosApi.publicar(Number(id));
      setSucesso(true);
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : 'Erro ao publicar evento.');
    } finally {
      setPublicando(false);
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

  if (sucesso) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Evento Publicado!</h2>
          <p className="text-slate-500 mb-8">As alterações foram salvas e o evento foi publicado com sucesso.</p>
          <button
            onClick={() => navigate('/admin/agendamentos')}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
          >
            Ver em Agendamentos
          </button>
        </div>
      </div>
    );
  }

  const isRascunho = statusEvento === 'RASCUNHO';

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
          <p className="text-slate-500 text-sm">
            {isRascunho
              ? 'Rascunho — salve as alterações ou publique o evento.'
              : 'Atualize os detalhes do evento.'}
          </p>
        </div>
        {statusEvento && (
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${
            statusEvento === 'ATIVO' ? 'bg-emerald-100 text-emerald-700' :
            statusEvento === 'RASCUNHO' ? 'bg-slate-100 text-slate-600' :
            'bg-amber-100 text-amber-700'
          }`}>
            {statusEvento === 'ATIVO' ? 'Publicado' : statusEvento === 'RASCUNHO' ? 'Rascunho' : 'Encerrado'}
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

        {/* Tipo + Profissional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Profissional Responsável <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.nome_profissional}
              onChange={e => update('nome_profissional', e.target.value)}
              placeholder="Ex: Dra. Ana Lima"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition ${erros.nome_profissional ? 'border-red-400' : 'border-slate-300'}`}
            />
            <FieldError msg={erros.nome_profissional} />
          </div>
        </div>

        {/* Corpo do e-mail */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Mensagem do E-mail <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <textarea value={form.corpo_email}
            onChange={e => update('corpo_email', e.target.value)}
            rows={3}
            placeholder="Olá! Temos uma nova atividade de bem-estar disponível para você..."
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
          />
        </div>

        {/* Aviso validação */}
        {Object.keys(erros).length > 0 && (
          <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Preencha todos os campos obrigatórios destacados acima.
          </div>
        )}

        {/* Botões */}
        <div className={`flex flex-col sm:flex-row gap-3 ${isRascunho ? '' : ''}`}>
          <button type="button" onClick={handleSalvar}
            disabled={salvando || publicando}
            className="flex-1 py-3 px-6 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {salvando
              ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              : <Save className="w-4 h-4" />}
            {salvando ? 'Salvando...' : isRascunho ? 'Salvar Rascunho' : 'Salvar Alterações'}
          </button>

          {isRascunho && (
            <button type="button" onClick={handleSalvarEPublicar}
              disabled={salvando || publicando}
              className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
              {publicando
                ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                : <Send className="w-4 h-4" />}
              {publicando ? 'Publicando...' : 'Salvar e Publicar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
