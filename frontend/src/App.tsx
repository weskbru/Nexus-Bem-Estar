import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AcessoViaToken from './pages/AcessoViaToken';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import NovoEvento from './pages/admin/NovoEvento';
import ColaboradorLayout from './layouts/ColaboradorLayout';
import Eventos from './pages/colaborador/Eventos';
import EventDetails from './pages/colaborador/EventDetails';
import Confirmacao from './pages/colaborador/Confirmacao';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/acesso/:token" element={<AcessoViaToken />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="eventos/novo" element={<NovoEvento />} />
          </Route>

          <Route
            path="/colaborador"
            element={
              <ProtectedRoute>
                <ColaboradorLayout />
              </ProtectedRoute>
            }
          >
            <Route path="eventos" element={<Eventos />} />
            <Route path="eventos/:id" element={<EventDetails />} />
            <Route path="confirmacao" element={<Confirmacao />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
