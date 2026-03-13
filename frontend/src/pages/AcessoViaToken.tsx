import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Calendar, Clock, User, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

interface EventoData {
  id: number;
  titulo: string;
  tipo: string;
  descricao: string;
  nome_profissional: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  local: string;
  vagas_disponiveis: number;
}

export default function AcessoViaToken() {
  const { token } = useParams<{ token: string }>();
  const { loginViaToken } = useAuth();
  const navigate = useNavigate();
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [evento, setEvento] = useState<EventoData | null>(null);
  const [email, setEmail] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    if (!token) {
      setErro('Link inválido.');
      setCarregando(false);
      return;
    }

    // Validar token e carregar evento
    carregarDadosEvento();
  }, [token]);

  const carregarDadosEvento = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api'}/eventos/acesso-token/?token=${token}`
      );
      
      if (!response.ok) {
        throw new Error('Token inválido ou expirado');
      }

      const data = await response.json();
      setEvento(data.evento);
      setEmail(data.email || '');
      setCarregando(false);
    } catch {
      setErro('Link inválido ou expirado. Solicite um novo convite.');
      setCarregando(false);
    }
  };

  const handleConfirmar = async () => {
    if (!token || !evento) return;

    setConfirmando(true);
    try {
      // Fazer login via token
      await loginViaToken(token);
      
      // Confirmar participação
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api'}/confirmacoes/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({
            evento_id: evento.id,
            confirmado: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao confirmar participação');
      }

      setConfirmado(true);
      setTimeout(() => {
        navigate(`/colaborador/eventos/${evento.id}`, { replace: true });
      }, 2000);
    } catch {
      setErro('Erro ao confirmar participação. Tente novamente.');
      setConfirmando(false);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <svg className="animate-spin h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">Carregando convite...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-900 text-center mb-2">Link Inválido</h1>
          <p className="text-slate-500 text-center mb-6">{erro}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  if (confirmado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Confirmação Recebida!</h1>
          <p className="text-slate-500 mb-6">
            Sua participação foi confirmada. Você será redirecionado em instantes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header com Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">⭐</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Agenda Bem-Estar</h1>
          </div>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Imagem do Evento */}
          <div className="h-56 bg-gradient-to-br from-blue-400 to-blue-600 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-2">
                  {evento?.tipo === 'massagem' && '💆'}
                  {evento?.tipo === 'yoga' && '🧘'}
                  {evento?.tipo === 'meditacao' && '🕉️'}
                  {evento?.tipo === 'nutricao' && '🥗'}
                  {evento?.tipo === 'pilates' && '🤸'}
                  {evento?.tipo === 'acupuntura' && '🪡'}
                  {!['massagem', 'yoga', 'meditacao', 'nutricao', 'pilates', 'acupuntura'].includes(evento?.tipo || '') && '✨'}
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-8 md:p-10">
            {/* Título e Descrição */}
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {evento?.titulo}
            </h2>
            <p className="text-slate-500 mb-8">
              {evento?.descricao || 'Participe deste evento de bem-estar e relaxe com profissionais especializados.'}
            </p>

            {/* Detalhes do Evento */}
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-grow">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {new Date(evento?.data || '').toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-grow">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Horário</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {evento?.hora_inicio.substring(0, 5)} às {evento?.hora_fim.substring(0, 5)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-grow">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Profissional</p>
                  <p className="text-lg font-semibold text-slate-900">{evento?.nome_profissional}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-grow">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Local</p>
                  <p className="text-lg font-semibold text-slate-900">{evento?.local}</p>
                </div>
              </div>
            </div>

            {/* Campo de Email */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                E-mail corporativo
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 pl-4 border border-slate-300 rounded-xl text-slate-900 bg-slate-50 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Botão de Confirmação */}
            <button
              onClick={handleConfirmar}
              disabled={confirmando}
              className={`w-full px-6 py-3 rounded-xl font-semibold text-white text-lg transition-all ${
                confirmando
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {confirmando ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Confirmando...
                </span>
              ) : (
                'Confirmar Participação'
              )}
            </button>

            {/* Segurança */}
            <div className="flex items-center justify-center gap-2 mt-6 text-slate-500">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="text-sm">SISTEMA INTERNO SEGURO</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-500 text-sm">
          <p>© 2026 Agenda Bem-Estar • Gestão de Qualidade de Vida</p>
        </div>
      </div>
    </div>
  );
}
