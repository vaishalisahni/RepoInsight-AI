import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Code2, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [show,     setShow]     = useState(false);
  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const result = await login(email, password);
    if (result.ok) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 mesh-bg">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ink-500 to-cyan-500 flex items-center justify-center shadow-[0_0_40px_rgba(92,91,232,0.35)] mb-4">
            <Code2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white font-display">Welcome back</h1>
          <p className="text-sm text-[#4a476a] mt-1">Sign in to RepoInsight</p>
        </div>

        <div className="card-glass rounded-2xl p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-[#8b88a6] uppercase tracking-wider block mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="input-base rounded-xl px-4 py-2.5 text-sm w-full"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#8b88a6] uppercase tracking-wider block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-base rounded-xl px-4 py-2.5 pr-10 text-sm w-full"
                />
                <button
                  type="button"
                  onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a476a] hover:text-[#8b88a6] transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
                : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-[#4a476a]">
            Don't have an account?{' '}
            <Link to="/register" className="text-ink-400 hover:text-ink-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}