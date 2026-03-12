import { ArrowUpRight, Clock, Info, Mail, HelpCircle } from 'lucide-react';

export default function NovoEvento() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Criar Novo Evento</h1>
        <p className="text-slate-500">Configure os detalhes da atividade de bem-estar para os colaboradores.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
        <form className="space-y-6">
          {/* Nome do Evento */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Evento</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Ex: Ginástica Laboral Matinal"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Data do Evento */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data do Evento</label>
              <div className="border border-slate-200 rounded-xl p-4 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <button type="button" className="text-slate-400 hover:text-slate-600">&lt;</button>
                  <span className="font-semibold text-sm">Outubro 2023</span>
                  <button type="button" className="text-slate-400 hover:text-slate-600">&gt;</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-2">
                  <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-sm">
                  <div className="p-2 text-slate-300">28</div>
                  <div className="p-2 text-slate-300">29</div>
                  <div className="p-2 text-slate-300">30</div>
                  <div className="p-2 hover:bg-slate-100 rounded-full cursor-pointer">1</div>
                  <div className="p-2 hover:bg-slate-100 rounded-full cursor-pointer">2</div>
                  <div className="p-2 hover:bg-slate-100 rounded-full cursor-pointer">3</div>
                  <div className="p-2 hover:bg-slate-100 rounded-full cursor-pointer">4</div>
                  <div className="p-2 bg-blue-600 text-white rounded-full font-medium cursor-pointer">5</div>
                  <div className="p-2 hover:bg-slate-100 rounded-full cursor-pointer">6</div>
                  <div className="p-2 hover:bg-slate-100 rounded-full cursor-pointer">7</div>
                  <div className="p-2 hover:bg-slate-100 rounded-full cursor-pointer">8</div>
                  <div className="p-2 hover:bg-slate-100 rounded-full cursor-pointer">9</div>
                  <div className="p-2 hover:bg-slate-100 rounded-full cursor-pointer">10</div>
                  <div className="p-2 hover:bg-slate-100 rounded-full cursor-pointer">11</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Horários */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Início</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue="08:00 AM"
                    />
                    <Clock className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Término</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue="05:00 PM"
                    />
                    <Clock className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Duração */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Duração por Sessão (minutos)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-12"
                    placeholder="Ex: 30"
                  />
                  <span className="absolute right-4 top-2.5 text-sm text-slate-400">min</span>
                </div>
              </div>

              {/* Capacidade */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Capacidade por Horário</label>
                <div className="relative">
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-16"
                    placeholder="Ex: 10"
                  />
                  <span className="absolute right-4 top-2.5 text-sm text-slate-400">pessoas</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button type="button" className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 mr-2" />
              Publicar Evento
            </button>
          </div>
        </form>

        {/* Notificação Section */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <p className="text-sm text-slate-700">
              Após a publicação, você poderá notificar todos os funcionários automaticamente.
            </p>
          </div>
          <button type="button" className="w-full py-2.5 px-4 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center">
            <Mail className="w-4 h-4 mr-2" />
            Enviar e-mail para todos os funcionários
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500 bg-slate-100 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-slate-400" />
          Precisa de ajuda com o agendamento?
        </div>
        <a href="#" className="font-medium text-blue-600 hover:underline">Ver Tutorial</a>
      </div>
    </div>
  );
}
