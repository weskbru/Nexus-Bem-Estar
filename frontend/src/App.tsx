import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginColaborador from './pages/LoginColaborador';
import LoginAdmin from './pages/Login';
import AcessoViaToken from './pages/AcessoViaToken';
import AcessarEvento from './pages/AcessarEvento';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminEventos from './pages/admin/EventosAgendados';
import NovoEvento from './pages/admin/NovoEvento';
import EditarEvento from './pages/admin/EditarEvento';
import Relatorios from './pages/admin/Relatorios';
import GestaoUsuarios from './pages/admin/GestaoUsuarios';
import Comunicados from './pages/admin/Comunicados';
import Manual from './pages/admin/Manual';
import ColaboradorLayout from './layouts/ColaboradorLayout';
import EventDetails from './pages/colaborador/EventDetails';
import Confirmacao from './pages/colaborador/Confirmacao';
import ConfirmarVagaListaEspera from './pages/ConfirmarVagaListaEspera';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Redireciona raiz para login admin */}
          <Route path="/" element={<Navigate to="/admin/login" replace />} />

          {/* Login colaborador */}
          <Route path="/login" element={<LoginColaborador />} />

          {/* Login admin */}
          <Route path="/admin/login" element={<LoginAdmin />} />

          {/* Acesso via link de token (e-mail) */}
          <Route path="/acesso/:token" element={<AcessoViaToken />} />

          {/* Acesso via e-mail + palavra-chave (fluxo lista de distribuição) */}
          <Route path="/evento/:eventoId/entrar" element={<AcessarEvento />} />

          {/* Confirmação de vaga da lista de espera via link do e-mail */}
          <Route path="/confirmar-vaga/:token" element={<ConfirmarVagaListaEspera />} />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute adminOnly>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="agendamentos" element={<AdminEventos />} />
            <Route path="eventos/novo" element={<NovoEvento />} />
            <Route path="eventos/:id/editar" element={<EditarEvento />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="gestao-usuarios" element={<GestaoUsuarios />} />
            <Route path="comunicados" element={<Comunicados />} />
            <Route path="manual" element={<Manual />} />
          </Route>

          <Route
            path="/colaborador/*"
            element={
              <ProtectedRoute>
                <ColaboradorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="eventos" element={<Navigate to="/login" replace />} />
            <Route path="eventos/:id" element={<EventDetails />} />
            <Route path="confirmacao" element={<Confirmacao />} />
            <Route path="agendamentos" element={<Navigate to="/login" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
