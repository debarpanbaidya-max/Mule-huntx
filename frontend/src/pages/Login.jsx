import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Shield, Zap, Eye, Github, Chrome } from 'lucide-react';

export default function Login() {
  const { loginDemo } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const handleDemo = async () => {
    setLoading(true);
    try {
      await loginDemo();
      navigate('/');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-electric/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-neon/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-crimson/3 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-electric/10 border border-electric/20 mb-4 glow-electric">
            <Shield className="w-8 h-8 text-electric" />
          </div>
          <h1 className="text-3xl font-display font-bold gradient-electric mb-2">MuleGuard</h1>
          <p className="text-gray-500 text-sm font-mono">FRAUD INTELLIGENCE PLATFORM</p>
        </div>

        {/* Card */}
        <div className="card p-8 space-y-6">
          <div>
            <h2 className="text-xl font-display font-semibold text-white mb-1">Sign in to continue</h2>
            <p className="text-gray-500 text-sm">Connect with OAuth 2.0 or use demo access</p>
          </div>

          {/* OAuth buttons */}
          <div className="space-y-3">
            <a
              href={`${API_URL}/api/auth/google`}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white font-medium text-sm group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>

            <a
              href={`${API_URL}/api/auth/github`}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white font-medium text-sm"
            >
              <Github className="w-5 h-5" />
              Continue with GitHub
            </a>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-gray-600 text-xs font-mono">OR</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Demo login */}
          <button
            onClick={handleDemo}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-electric/10 border border-electric/30 hover:bg-electric/20 hover:border-electric/50 transition-all text-electric font-medium text-sm disabled:opacity-50 glow-electric"
          >
            <Zap className="w-4 h-4" />
            {loading ? 'Entering...' : 'Demo Access (No auth required)'}
          </button>

          <p className="text-xs text-gray-600 text-center">
            Demo mode uses pre-seeded transaction data for exploration
          </p>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: <Shield className="w-4 h-4" />, label: '10 Fraud Rules' },
            { icon: <Eye className="w-4 h-4" />,    label: 'Graph Analysis' },
            { icon: <Zap className="w-4 h-4" />,    label: '<500ms Latency' },
          ].map((f) => (
            <div key={f.label} className="card p-3 text-center">
              <div className="flex justify-center text-electric/60 mb-1">{f.icon}</div>
              <p className="text-gray-500 text-xs">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
