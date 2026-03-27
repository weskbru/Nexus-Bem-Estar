import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi, type EventoPublicoDTO } from '../services/api';
import { AlertCircle, Mail, Key, Eye, EyeOff, Loader2, ArrowLeft, Calendar, Clock, User, Sparkles, CheckCircle2, XCircle, Phone } from 'lucide-react';
import type { EventoIndisponivelDTO } from '../services/api';

const TIPO_LABEL: Record<string, string> = {
  massagem:   'Massagem',
  yoga:       'Yoga',
  meditacao:  'Meditação',
  nutricao:   'Nutrição',
  pilates:    'Pilates',
  acupuntura: 'Acupuntura',
  outro:      'Evento',
};

const TIPO_COR: Record<string, string> = {
  massagem:   'from-emerald-600 to-teal-700',
  yoga:       'from-violet-600 to-purple-700',
  meditacao:  'from-sky-600 to-blue-700',
  nutricao:   'from-lime-600 to-green-700',
  pilates:    'from-orange-500 to-amber-600',
  acupuntura: 'from-rose-600 to-pink-700',
  outro:      'from-slate-600 to-slate-700',
};

type Passo = 'carregando' | 'formulario' | 'enviando' | 'erro';

export default function AcessarEvento() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { loginViaEmail } = useAuth();

  const [passo, setPasso] = useState<Passo>('carregando');
  const [evento, setEvento] = useState<EventoPublicoDTO | null>(null);
  const [erroEvento, setErroEvento] = useState<EventoIndisponivelDTO>({ codigo: 'nao_encontrado' });

  const [email, setEmail] = useState('');
  const [palavraChave, setPalavraChave] = useState('');
  const [ramal, setRamal] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!eventoId) {
      setErroEvento({ codigo: 'nao_encontrado' });
      setPasso('erro');
      return;
    }
    authApi.eventoPublico(Number(eventoId))
      .then(data => { setEvento(data); setPasso('formulario'); })
      .catch((err: unknown) => {
        const indisponivel = (err as Error & { indisponivel?: EventoIndisponivelDTO }).indisponivel;
        setErroEvento(indisponivel ?? { codigo: 'nao_encontrado' });
        setPasso('erro');
      });
  }, [eventoId]);

  async function handleConfirmar() {
    setErro('');
    if (!email.trim()) { setErro('Informe seu e-mail corporativo.'); return; }
    if (evento?.requer_palavra_chave && !palavraChave.trim()) {
      setErro('Informe a palavra-chave do convite.'); return;
    }

    setPasso('enviando');
    try {
      const data = await authApi.acessarEvento(
        Number(eventoId),
        email.trim(),
        evento?.requer_palavra_chave ? palavraChave.trim() : undefined,
        ramal.trim() || undefined,
      );
      loginViaEmail(data.access, data.usuario);
      navigate(`/colaborador/eventos/${data.evento_id}`, { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível acessar o evento. Verifique seus dados.');
      setPasso('formulario');
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (passo === 'carregando') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-emerald-500 animate-pulse" />
          </div>
          <p className="text-slate-600 font-semibold">Carregando evento...</p>
        </div>
      </div>
    );
  }

  // ── Erro ───────────────────────────────────────────────────────────────────
  if (passo === 'erro') {
    const encerrado  = erroEvento.codigo === 'encerrado';
    const cancelado  = erroEvento.codigo === 'cancelado';

    const icone = encerrado
      ? <CheckCircle2 className="w-8 h-8 text-slate-400" />
      : cancelado
        ? <XCircle className="w-8 h-8 text-rose-400" />
        : <AlertCircle className="w-8 h-8 text-amber-400" />;

    const iconeBg = encerrado ? 'bg-slate-100' : cancelado ? 'bg-rose-50' : 'bg-amber-50';

    const titulo = encerrado
      ? 'Evento já encerrado'
      : cancelado
        ? 'Evento cancelado'
        : 'Evento não encontrado';

    const dataFormatadaErro = erroEvento.data
      ? new Date(erroEvento.data + 'T00:00:00').toLocaleDateString('pt-BR', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })
      : null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">

          <div className={`w-16 h-16 ${iconeBg} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
            {icone}
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-2">{titulo}</h1>

          {erroEvento.titulo && (
            <p className="text-base font-semibold text-slate-700 mb-1">"{erroEvento.titulo}"</p>
          )}

          {encerrado && (
            <div className="mt-3 mb-6 text-sm text-slate-500 leading-relaxed space-y-1">
              {dataFormatadaErro && (
                <p className="flex items-center justify-center gap-1.5 capitalize">
                  <Calendar className="w-4 h-4 text-slate-400" /> {dataFormatadaErro}
                </p>
              )}
              <p className="mt-3">
                As sessões deste evento já foram realizadas.<br />
                Fique atento aos próximos eventos de bem-estar!
              </p>
            </div>
          )}

          {cancelado && (
            <p className="mt-3 mb-6 text-sm text-slate-500 leading-relaxed">
              Este evento foi cancelado pela organização.<br />
              Em breve novos eventos serão disponibilizados.
            </p>
          )}

          {!encerrado && !cancelado && (
            <p className="mt-3 mb-6 text-sm text-slate-500 leading-relaxed">
              O link que você acessou não corresponde a nenhum evento ativo.<br />
              Verifique se o link está correto ou entre em contato com a organização.
            </p>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Início
          </button>
        </div>
      </div>
    );
  }

  // ── Formulário Principal ───────────────────────────────────────────────────
  const tipo = evento?.tipo ?? 'outro';
  const gradiente = TIPO_COR[tipo] ?? TIPO_COR.outro;
  const tipoLabel = TIPO_LABEL[tipo] ?? 'Evento';

  const dataFormatada = evento?.data
    ? new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 flex items-center justify-center p-4 sm:p-8 pb-12">
      <div className="w-full max-w-5xl flex flex-col sm:flex-row gap-6 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Card do Evento — destaque visual */}
        <div className={`bg-gradient-to-br ${gradiente} rounded-3xl p-6 sm:p-8 text-white shadow-xl flex-1 flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
              {tipoLabel}
            </span>
            <Sparkles className="w-5 h-5 text-white/60" />
          </div>

          <h1 className="text-2xl font-extrabold leading-tight mb-4">
            {evento?.titulo}
          </h1>

          <div className="flex flex-col gap-2 text-sm text-white/90">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0 text-white/70" />
              <span className="capitalize">{dataFormatada}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-white/70" />
              <span>
                {evento?.hora_inicio?.substring(0, 5)} até {evento?.hora_fim?.substring(0, 5)}
              </span>
            </div>
            {evento?.nome_profissional && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 shrink-0 text-white/70" />
                <span>{evento.nome_profissional}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card do Formulário */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 sm:p-10 w-full sm:w-96 shrink-0 flex flex-col justify-center">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-800">Informe seus dados</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Para visualizar e escolher seu horário disponível.
            </p>
          </div>

          {erro && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl px-3.5 py-3 mb-5 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); void handleConfirmar(); }} className="space-y-4">

            {/* E-mail */}
            <div className="space-y-1.5">
              <label htmlFor="email-corporativo" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                E-mail corporativo
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="email-corporativo"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErro(''); }}
                  disabled={passo === 'enviando'}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 text-sm outline-none transition-all disabled:opacity-60"
                  placeholder="nome.sobrenome@aeb.gov.br"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Ramal (opcional) */}
            <div className="space-y-1.5">
              <label htmlFor="ramal" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Ramal <span className="text-slate-400 font-normal normal-case">(opcional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="ramal"
                  type="text"
                  value={ramal}
                  onChange={e => setRamal(e.target.value)}
                  disabled={passo === 'enviando'}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 text-sm outline-none transition-all disabled:opacity-60"
                  placeholder="Ex: 1234"
                  maxLength={20}
                />
              </div>
            </div>

            {/* Palavra-Chave (se necessário) */}
            {evento?.requer_palavra_chave && (
              <div className="space-y-1.5">
                <label htmlFor="palavra-chave" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Palavra-chave do convite
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="palavra-chave"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={palavraChave}
                    onChange={e => { setPalavraChave(e.target.value); setErro(''); }}
                    disabled={passo === 'enviando'}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 text-sm outline-none transition-all disabled:opacity-60"
                    placeholder="Digite a palavra recebida..."
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(v => !v)}
                    disabled={passo === 'enviando'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={mostrarSenha ? 'Ocultar palavra-chave' : 'Mostrar palavra-chave'}
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={passo === 'enviando'}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow-emerald-500/25 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98] mt-2"
            >
              {passo === 'enviando'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                : 'Ver Horários Disponíveis'}
            </button>
          </form>
        </div>

      </div>

      <p className="absolute bottom-4 text-center text-xs text-slate-400 font-medium w-full">
        © {new Date().getFullYear()} Agência Espacial Brasileira — Programa de Bem-Estar
      </p>
    </div>
  );
}
