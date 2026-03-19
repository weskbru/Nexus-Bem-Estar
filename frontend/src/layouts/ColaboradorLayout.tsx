import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logoAeb from '../images/logoaeb.png';

export default function ColaboradorLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-11 h-11 rounded-lg overflow-hidden bg-white flex items-center justify-center border border-slate-200">
                <img src={logoAeb} alt="Logo AEB" className="w-full h-full object-contain" />
              </div>
              <span className="font-semibold text-lg text-slate-900">Agenda Bem-Estar</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 ml-4 border-l border-slate-200 pl-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-blue-700">
                      {usuario?.nome?.charAt(0).toUpperCase() ?? 'U'}
                    </span>
                  </div>
                  <span className="hidden md:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {usuario?.nome ?? 'Colaborador'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sair"
                  className="text-slate-400 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © 2026 Agenda Bem-Estar - Sistema Interno de Qualidade de Vida. Todos os direitos reservados.
      </footer>
    </div>
  );
}
