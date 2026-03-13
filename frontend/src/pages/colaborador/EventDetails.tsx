import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { ChevronRight, Calendar as CalendarIcon, Clock, Users, ArrowLeft, CheckCircle } from 'lucide-react';

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

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [evento, setEvento] = useState<EventoData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [jaConfirmado] = useState(false);

  useEffect(() => {
    carregarEvento();
  }, [id, token]);

  const carregarEvento = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api'}/eventos/${id}/`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) {
        throw new Error('Evento não encontrado');
      }

      const data = await response.json();
      setEvento(data);
      setCarregando(false);
    } catch {
      setErro('Erro ao carregar evento. Tente novamente.');
      setCarregando(false);
    }
  };

  const handleConfirmar = async () => {
    if (!id || !evento) return;

    setConfirmando(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api'}/confirmacoes/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            evento_id: parseInt(id),
            confirmado: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao confirmar participação');
      }

      // Redirecionar para a página de confirmação com sucesso
      navigate('/colaborador/confirmacao', {
        state: {
          status: 'sucesso',
          evento: evento,
        },
      });
    } catch {
      setErro('Erro ao confirmar participação. Tente novamente.');
    } finally {
      setConfirmando(false);
    }
  };

  if (carregando) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-center">
        <div className="flex justify-center mb-4">
          <svg className="animate-spin h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
        <p className="text-slate-500 font-medium">Carregando evento...</p>
      </div>
    );
  }

  if (erro || !evento) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800 font-medium mb-4">{erro}</p>
          <Link to="/colaborador/eventos">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
              Voltar aos Eventos
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const dataFormatada = new Date(evento.data).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500 mb-6">
        <CalendarIcon className="w-4 h-4 mr-2" />
        <span>{dataFormatada}</span>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-blue-600 font-medium">{evento.titulo}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-6 mb-6">
          <div className="text-6xl">
            {evento.tipo === 'massagem' && '💆'}
            {evento.tipo === 'yoga' && '🧘'}
            {evento.tipo === 'meditacao' && '🕉️'}
            {evento.tipo === 'nutricao' && '🥗'}
            {evento.tipo === 'pilates' && '🤸'}
            {evento.tipo === 'acupuntura' && '🪡'}
            {!['massagem', 'yoga', 'meditacao', 'nutricao', 'pilates', 'acupuntura'].includes(evento.tipo) && '✨'}
          </div>
          <div className="flex-grow">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{evento.titulo}</h1>
            <p className="text-slate-600 text-lg">{evento.descricao}</p>
          </div>
        </div>
      </div>

      {/* Detalhes do Evento */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-8">
          <div>
            <h3 className="text-xs font-bold tracking-wider text-slate-500 mb-4 uppercase">
              Informações
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Data</p>
                  <p className="text-slate-900 font-medium">{dataFormatada}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Horário</p>
                  <p className="text-slate-900 font-medium">
                    {evento.hora_inicio.substring(0, 5)} às {evento.hora_fim.substring(0, 5)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Vagas Disponíveis</p>
                  <p className="text-slate-900 font-medium">{evento.vagas_disponiveis} vagas</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold tracking-wider text-slate-500 mb-4 uppercase">
              Profissional
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Nome</p>
                <p className="text-slate-900 font-medium">{evento.nome_profissional}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Local</p>
                <p className="text-slate-900 font-medium">{evento.local}</p>
              </div>

              {evento.vagas_disponiveis > 0 ? (
                <div className="inline-block">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    ✓ Disponível
                  </span>
                </div>
              ) : (
                <div className="inline-block">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    Indisponível
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ícone de Confirmação */}
      {jaConfirmado && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-emerald-800 font-medium">Sua participação já foi confirmada neste evento.</p>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
          <p className="text-red-800 text-sm">{erro}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        {evento.vagas_disponiveis > 0 && !jaConfirmado && (
          <button
            onClick={handleConfirmar}
            disabled={confirmando}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
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
        )}

        <Link to="/colaborador/eventos" className={!jaConfirmado && evento.vagas_disponiveis > 0 ? '' : 'flex-1'}>
          <button className={`w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2`}>
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Eventos
          </button>
        </Link>
      </div>

      {/* Informação Adicional */}
      <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">📌 Importante:</span> Chegue com 10 minutos de antecedência. Se precisar cancelar, avise com antecedência através do seu gestor.
        </p>
      </div>
    </div>
  );
}
