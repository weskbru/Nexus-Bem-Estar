import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi, type EventoPublicoDTO } from '../services/api';
import { AlertCircle, Mail, Key, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import logoAeb from '../images/logoaeb.png';

type Passo = 'carregando' | 'formulario' | 'enviando' | 'erro';

export default function AcessarEvento() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { loginViaEmail } = useAuth();

  const [passo, setPasso] = useState<Passo>('carregando');
  const [evento, setEvento] = useState<EventoPublicoDTO | null>(null);
  const [erroEvento, setErroEvento] = useState('');

  const [email, setEmail] = useState('');
  const [palavraChave, setPalavraChave] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!eventoId) { setErroEvento('Link de evento inválido.'); setPasso('erro'); return; }
    authApi.eventoPublico(Number(eventoId))
      .then(data => { setEvento(data); setPasso('formulario'); })
      .catch(() => { setErroEvento('Este evento não foi encontrado ou não está mais disponível para agendamentos.'); setPasso('erro'); });
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600 mb-4" />
        <p className="text-slate-500 font-bold tracking-wide">Buscando detalhes do evento...</p>
      </div>
    );
  }

  // ── Erro ───────────────────────────────────────────────────────────────────
  if (passo === 'erro') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:px-12 sm:py-16 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Evento Indisponível</h1>
          <p className="text-slate-500 mb-8 font-medium leading-relaxed">{erroEvento}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Início
          </button>
        </div>
      </div>
    );
  }

  // ── Formulário Principal ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
      
      {/* Container Centralizado */}
      <div className="w-full max-w-md flex flex-col items-center animate-in fade-in duration-300">
        
        {/* Identidade Visual Topo */}
        <div className="mb-8 text-center flex flex-col items-center">
          <img
            src={logoAeb}
            alt="Logo Agência Espacial Brasileira"
            className="h-16 sm:h-20 w-auto mb-4 drop-shadow-sm"
          />
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Agenda Bem-Estar
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
            Novo Agendamento
          </p>
        </div>

        {/* Card do Formulário */}
        <main className="w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:p-10 transition-all">
          
          {/* Header do Card (Preview do Evento) */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-800 leading-tight">
              {evento?.titulo}
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              Preencha seus dados para visualizar os horários.
            </p>
          </div>

          {/* Erro de Validação */}
          {erro && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm font-medium animate-pulse">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); void handleConfirmar(); }} className="space-y-5">
            
            {/* Campo: E-mail Corporativo */}
            <div className="space-y-2">
              <label htmlFor="email-corporativo" className="block text-sm font-semibold text-slate-700">
                E-mail corporativo <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email-corporativo"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErro(''); }}
                  disabled={passo === 'enviando'}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 text-sm transition-all duration-200 outline-none disabled:opacity-60"
                  placeholder="nome.sobrenome@aeb.gov.br"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Campo: Palavra-Chave (Apenas se o evento exigir) */}
            {evento?.requer_palavra_chave && (
              <div className="space-y-2">
                <label htmlFor="palavra-chave" className="block text-sm font-semibold text-slate-700">
                  Palavra-chave do convite <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-400">
                    <Key className="h-5 w-5" />
                  </div>
                  <input
                    id="palavra-chave"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={palavraChave}
                    onChange={e => { setPalavraChave(e.target.value); setErro(''); }}
                    disabled={passo === 'enviando'}
                    className="block w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 text-sm transition-all duration-200 outline-none disabled:opacity-60"
                    placeholder="Digite a palavra recebida..."
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(v => !v)}
                    disabled={passo === 'enviando'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none disabled:opacity-60"
                    aria-label={mostrarSenha ? "Ocultar palavra-chave" : "Mostrar palavra-chave"}
                  >
                    {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Botão de Submit */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={passo === 'enviando'}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md hover:shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
              >
                {passo === 'enviando' && <Loader2 className="animate-spin h-5 w-5 text-white" />}
                {passo === 'enviando' ? 'Autenticando...' : 'Acessar Horários'}
              </button>
            </div>
          </form>
        </main>

        {/* Rodapé Dinâmico */}
        <footer className="mt-8 flex flex-col items-center gap-4">
          <div className="text-xs font-medium text-slate-400 text-center">
            © {new Date().getFullYear()} Agência Espacial Brasileira - CTI
          </div>
        </footer>
      </div>
    </div>
  );
}