/* ── Login.jsx ───────────────────────────────────────────────────────────── */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Code2, Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import useAuthStore from '../store/authStore';

export function Login() {
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
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to RepoInsight"
    >
      {error && <ErrorBanner message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email address">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="input-base"
          />
        </Field>

        <Field label="Password">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="input-base"
              style={{ paddingRight: '2.75rem' }}
            />
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="btn-primary w-full py-2.5 rounded-xl text-[14px] text-white flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
            : <><ArrowRight className="w-4 h-4" /> Sign in</>}
        </button>
      </form>

      <p className="text-center text-[13px] text-slate-500 mt-2">
        No account?{' '}
        <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}

/* ── Register.jsx ────────────────────────────────────────────────────────── */
import { CheckCircle2 } from 'lucide-react';

export function Register() {
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

  const checks = [
    { label: '8+ chars', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Number',    ok: /\d/.test(password) },
  ];

  return (
    <AuthLayout
      title="Create account"
      subtitle="Start exploring your codebase with AI"
    >
      {error && <ErrorBanner message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoComplete="name"
            placeholder="Jane Smith"
            className="input-base"
          />
        </Field>

        <Field label="Email address">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="input-base"
          />
        </Field>

        <Field label="Password">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              className="input-base"
              style={{ paddingRight: '2.75rem' }}
            />
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password && (
            <div className="flex gap-3 mt-2">
              {checks.map(c => (
                <span key={c.label} className={`text-[11px] flex items-center gap-1 transition-colors ${c.ok ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <CheckCircle2 className="w-3 h-3" /> {c.label}
                </span>
              ))}
            </div>
          )}
        </Field>

        <button
          type="submit"
          disabled={loading || !name || !email || !password}
          className="btn-primary w-full py-2.5 rounded-xl text-[14px] text-white flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
            : <><ArrowRight className="w-4 h-4" /> Create account</>}
        </button>
      </form>

      <p className="text-center text-[13px] text-slate-500 mt-2">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

/* ── Shared sub-components ───────────────────────────────────────────────── */
function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 mesh-bg">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
              boxShadow: '0 0 40px rgba(59,130,246,0.25)',
            }}
          >
            <Code2 className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <h1
            className="text-[22px] font-bold text-slate-100 text-center"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}
          >
            {title}
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 text-center">{subtitle}</p>
        </div>

        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: 'rgba(12, 16, 32, 0.9)', border: '1px solid rgba(148,163,184,0.1)', backdropFilter: 'blur(20px)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label
        className="text-[11px] font-semibold uppercase tracking-widest block"
        style={{ color: '#475569' }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div
      className="flex items-start gap-2.5 text-[13px] text-red-400 p-3 rounded-xl"
      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
    >
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default Login;