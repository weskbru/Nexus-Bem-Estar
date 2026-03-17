import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly = false }: Props) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={adminOnly ? '/admin/login' : '/'} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/colaborador/agendamentos" replace />;
  }

  return <>{children}</>;
}
