import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Code2, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import useAuthStore from '../store/authStore';

function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ characters',    ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number',           ok: /\d/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="flex gap-3 mt-1.5">
      {checks.map(c => (
        <span key={c.label} className={`text-[10px] flex items-center gap-1 ${c.ok ? 'text-emerald-400' : 'text-[#4a476a]'}`}>
          <CheckCircle2 className="w-3 h-3" /> {c.label}
        </span>
      ))}
    </div>
  );
}

export default function Register() {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [show,     setShow]     = useState(false);
  const { register, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const result = await register(name, email, password);
    if (result.ok) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 mesh-bg">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ink-500 to-cyan-500 flex items-center justify-center shadow-[0_0_40px_rgba(92,91,232,0.35)] mb-4">
            <Code2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white font-display">Create account</h1>
          <p className="text-sm text-[#4a476a] mt-1">Start exploring your codebase</p>
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
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Jane Smith"
                className="input-base rounded-xl px-4 py-2.5 text-sm w-full"
              />
            </div>

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
                  autoComplete="new-password"
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
              <PasswordStrength password={password} />
            </div>

            <button
              type="submit"
              disabled={loading || !name || !email || !password}
              className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account…</>
                : 'Create account'}
            </button>
          </form>

          <p className="text-center text-xs text-[#4a476a]">
            Already have an account?{' '}
            <Link to="/login" className="text-ink-400 hover:text-ink-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}