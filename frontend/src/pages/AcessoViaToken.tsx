import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AcessoViaToken() {
  const { token } = useParams<{ token: string }>();
  const { loginViaToken } = useAuth();
  const navigate = useNavigate();
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!token) {
      setErro('Link inválido.');
      return;
    }

    loginViaToken(token)
      .then(({ evento_id }) => navigate(`/colaborador/eventos/${evento_id}`, { replace: true }))
      .catch(() => setErro('Link inválido ou expirado. Solicite um novo convite.'));
  }, [token, loginViaToken, navigate]);

  if (erro) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-medium">{erro}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="text-sm">Autenticando...</span>
      </div>
    </div>
  );
}
