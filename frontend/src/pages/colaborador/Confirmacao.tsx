import { Link } from 'react-router-dom';
import { CheckCircle2, Calendar, Clock, XCircle, AlertCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface ConfirmacaoData {
  status: 'sucesso' | 'cancelado' | 'erro';
  evento?: {
    id: number;
    titulo: string;
    tipo: string;
    data: string;
    hora_inicio: string;
    hora_fim: string;
    nome_profissional: string;
    local: string;
  };
  mensagem?: string;
}

export default function Confirmacao() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dados, setDados] = useState<ConfirmacaoData | null>(null);

  useEffect(() => {
    const state = location.state as ConfirmacaoData | null;
    if (!state) {
      // Redirecionar se veio sem dados
      navigate('/colaborador/eventos');
      return;
    }
    setDados(state);
  }, [location, navigate]);

  if (!dados) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <svg className="animate-spin h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (dados.status === 'sucesso') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Header com ícone de sucesso */}
          <div className="p-8 text-center border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-emerald-100">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Confirmação Recebida!
            </h1>
            <p className="text-slate-600 text-lg">
              Sua participação no evento foi confirmada com sucesso.
            </p>
          </div>

          {/* Conteúdo */}
          <div className="p-8 md:p-10">
            {/* Imagem/Ícone do Evento */}
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-50 text-5xl">
                {dados.evento?.tipo === 'massagem' && '💆'}
                {dados.evento?.tipo === 'yoga' && '🧘'}
                {dados.evento?.tipo === 'meditacao' && '🕉️'}
                {dados.evento?.tipo === 'nutricao' && '🥗'}
                {dados.evento?.tipo === 'pilates' && '🤸'}
                {dados.evento?.tipo === 'acupuntura' && '🪡'}
                {!['massagem', 'yoga', 'meditacao', 'nutricao', 'pilates', 'acupuntura'].includes(dados.evento?.tipo || '') && '✨'}
              </div>
            </div>

            {/* Título do evento */}
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
              {dados.evento?.titulo}
            </h2>

            {/* Detalhes do Agendamento */}
            <h3 className="text-xs font-bold tracking-wider text-slate-500 mb-4 uppercase">
              Detalhes da Confirmação
            </h3>

            <div className="bg-slate-50 rounded-2xl p-6 mb-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-slate-600 gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Data</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {dados.evento?.data && new Date(dados.evento.data).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>

              <div className="h-px bg-slate-200"></div>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-slate-600 gap-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Horário</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {dados.evento?.hora_inicio.substring(0, 5)} às {dados.evento?.hora_fim.substring(0, 5)}
                </span>
              </div>

            </div>

            {/* Mensagem de Confirmação */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8">
              <p className="text-emerald-800 text-center">
                ✓ Enviamos um e-mail de confirmação para seu endereço corporativo.
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/colaborador/agendamentos" className="flex-1">
                <button className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors">
                  Ver Meus Agendamentos
                </button>
              </Link>
              <Link to="/colaborador/eventos" className="flex-1">
                <button className="w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors">
                  Explorar Outros Eventos
                </button>
              </Link>
            </div>

          </div>
        </div>
      </div>
    );
  }

  if (dados.status === 'cancelado') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-8 text-center border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="w-20 h-20 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Participação Cancelada
            </h1>
            <p className="text-slate-600 text-lg">
              Você recusou o convite para o evento.
            </p>
          </div>

          <div className="p-8 md:p-10 text-center">
            <p className="text-slate-600 mb-8">
              Sua recusa foi registrada. Se mudar de ideia, entre em contato com o administrador do sistema.
            </p>

            <Link to="/colaborador/eventos">
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors">
                Voltar para Eventos
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Erro
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="p-8 text-center border-b border-slate-200 bg-gradient-to-r from-red-50 to-red-100">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Erro na Confirmação
          </h1>
          <p className="text-slate-600 text-lg">
            Ocorreu um problema ao processar sua confirmação.
          </p>
        </div>

        <div className="p-8 md:p-10 text-center">
          <p className="text-slate-600 mb-4">
            {dados.mensagem || 'Tente novamente mais tarde ou entre em contato com o administrador.'}
          </p>

          <Link to="/colaborador/eventos">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors">
              Voltar para Eventos
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
