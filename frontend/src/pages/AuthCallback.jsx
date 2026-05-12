import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      loginWithToken(token);
      navigate('/');
    } else {
      navigate('/login?error=callback');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-electric font-mono animate-pulse">Authenticating…</div>
    </div>
  );
}
