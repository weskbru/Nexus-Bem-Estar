import { LogIn, ShieldCheck } from 'lucide-react';
import logoAeb from '../images/logoaeb.png';

export default function LoginColaborador() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Header Logo */}
      <div className="absolute top-6 left-6 flex items-center gap-2">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white flex items-center justify-center border border-slate-200">
          <img src={logoAeb} alt="Logo AEB" className="w-full h-full object-contain" />
        </div>
        <span className="font-semibold text-lg text-slate-900">Agenda Bem-Estar</span>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Top Image */}
        <div className="h-48 relative bg-slate-200">
          <img
            src="https://picsum.photos/seed/spa/800/400"
            alt="Bem-Estar"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Form Content */}
        <div className="p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Entrar</h1>
          <p className="text-slate-500 mb-8">
            Use seu e-mail corporativo para agendar sua massagem e relaxar.
          </p>

          <form className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                E-mail corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  id="email"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="nome.sobrenome@empresa.com.br"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Entrar <LogIn className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-sm text-slate-400">
            <ShieldCheck className="w-4 h-4" />
            <span>SISTEMA INTERNO SEGURO</span>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className="mt-8 flex gap-6 text-sm text-slate-500">
        <a href="#" className="hover:text-slate-900">Ajuda</a>
        <a href="#" className="hover:text-slate-900">Privacidade</a>
        <a href="#" className="hover:text-slate-900">Termos de Uso</a>
      </div>

      {/* Copyright */}
      <div className="absolute bottom-6 text-xs text-slate-400">
        © 2026 Agenda Bem-Estar • Gestão de Qualidade de Vida
      </div>
    </div>
  );
}
