import { Link } from 'react-router-dom';
import { CheckCircle2, Calendar, Clock, User, XCircle } from 'lucide-react';
import { useState } from 'react';

export default function Confirmacao() {
  const [showCancelModal, setShowCancelModal] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 text-center border-b border-slate-100">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Seu horário foi reservado com sucesso!
          </h1>
          <p className="text-slate-500">
            Tudo pronto para o seu atendimento de bem-estar. Enviamos um e-mail de confirmação para você.
          </p>
        </div>

        <div className="p-8">
          <div className="h-48 relative rounded-xl overflow-hidden mb-8">
            <img
              src="https://picsum.photos/seed/massage/800/400"
              alt="Massagem"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <h3 className="text-xs font-bold tracking-wider text-slate-500 mb-4 uppercase">
            Detalhes do Agendamento
          </h3>

          <div className="bg-slate-50 rounded-xl p-4 space-y-4 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-slate-500">
                <Calendar className="w-5 h-5 mr-3 text-blue-600" />
                <span>Data</span>
              </div>
              <span className="font-medium text-slate-900">25 de Outubro, 2023</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-slate-500">
                <Clock className="w-5 h-5 mr-3 text-blue-600" />
                <span>Horário</span>
              </div>
              <span className="font-medium text-slate-900">14:30</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-slate-500">
                <User className="w-5 h-5 mr-3 text-blue-600" />
                <span>Profissional</span>
              </div>
              <span className="font-medium text-slate-900">Dra. Helena Souza</span>
            </div>
          </div>

          <div className="space-y-3">
            <Link to="/colaborador/eventos" className="block w-full">
              <button className="w-full flex items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                <Calendar className="w-5 h-5 mr-2" />
                Ver meus agendamentos
              </button>
            </Link>
            <button 
              onClick={() => setShowCancelModal(true)}
              className="w-full flex items-center justify-center py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
            >
              <XCircle className="w-5 h-5 mr-2 text-slate-400" />
              Cancelar agendamento
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-4 text-center text-sm text-slate-500 border-t border-slate-100">
          Precisa de ajuda? <a href="#" className="text-blue-600 hover:underline">Entre em contato com o suporte</a>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center text-red-600 font-medium">
                <XCircle className="w-5 h-5 mr-2" />
                Confirmação
              </div>
              <button 
                onClick={() => setShowCancelModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8" />
                <div className="absolute w-5 h-5 bg-white rounded-full flex items-center justify-center right-1/2 translate-x-6 translate-y-4">
                  <XCircle className="w-4 h-4 text-red-500" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Deseja cancelar seu agendamento?
              </h3>
              <p className="text-slate-500 mb-8">
                Esta ação não pode ser desfeita e a vaga será liberada para outros colaboradores.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => setShowCancelModal(false)}
                  className="w-full py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Sim, cancelar
                </button>
                <button 
                  onClick={() => setShowCancelModal(false)}
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  Manter agendamento
                </button>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 text-center text-xs text-slate-500 border-t border-slate-100">
              Você pode reagendar uma nova data a qualquer momento, sujeito a disponibilidade.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
