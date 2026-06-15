import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, AlertCircle, Loader2, ArrowLeft, Ticket } from 'lucide-react';
import logoAeb from '../images/logoaeb.png';

const API = import.meta.env.VITE_API_URL || '/api';

type Estado = 'carregando' | 'sucesso' | 'erro';

export default function ConfirmarVagaListaEspera() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { loginViaEmail } = useAuth();

  const [estado, setEstado] = useState<Estado>('carregando');
  const [mensagemErro, setMensagemErro] = useState('');
  const [eventoId, setEventoId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) { 
      setMensagemErro('Link de confirmação ausente ou inválido.'); 
      setEstado('erro'); 
      return; 
    }

    fetch(`${API}/auth/confirmar-vaga/${token}/`, { method: 'POST' })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro ?? 'Erro ao confirmar sua vaga.');
        loginViaEmail(data.access, data.usuario);
        setEventoId(data.evento_id);
        setEstado('sucesso');
      })
      .catch(err => {
        setMensagemErro(err instanceof Error ? err.message : 'Não foi possível confirmar a vaga no momento.');
        setEstado('erro');
      });
      
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (estado === 'carregando') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600 mb-4" />
        <p className="text-slate-500 font-bold tracking-wide">Validando seu link e garantindo a vaga...</p>
      </div>
    );
  }

  // ── Estrutura Base para Telas de Resultado ─────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
        
        {/* Identidade Visual */}
        <div className="mb-8 text-center flex flex-col items-center">
          <img
            src={logoAeb}
            alt="Logo Agência Espacial Brasileira"
            className="h-16 sm:h-20 w-auto mb-4 drop-shadow-sm"
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Agenda Bem-Estar
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
            Fila de Espera
          </p>
        </div>

        {/* Card Dinâmico de Sucesso ou Erro */}
        <div className="w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:px-12 sm:py-16 text-center">
          
          {estado === 'sucesso' ? (
            <>
              <div className="w-20 h-20 bg-emerald-50 border-4 border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-bounce" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-3">Vaga Confirmada!</h2>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                Parabéns! Seu agendamento foi ativado com sucesso. Você receberá um e-mail com os detalhes do seu ingresso em instantes.
              </p>
              
              {eventoId && (
                <button
                  onClick={() => navigate(`/colaborador/eventos/${eventoId}`, { replace: true })}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow-emerald-500/20 text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                >
                  <Ticket className="w-5 h-5" />
                  Visualizar Meu Ingresso
                </button>
              )}
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-3">Link Inválido</h2>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                {mensagemErro}
              </p>
              
              <button
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para a página inicial
              </button>
            </>
          )}

        </div>

        {/* Rodapé Dinâmico */}
        <footer className="mt-8 text-center text-xs font-medium text-slate-400">
          © {new Date().getFullYear()} Agência Espacial Brasileira
        </footer>
      </div>
    </div>
  );
}
