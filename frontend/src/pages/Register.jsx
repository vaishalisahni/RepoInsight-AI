import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Code2, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import useAuthStore from '../store/authStore';

function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ characters',    ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number',           ok: /\d/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="flex gap-3 mt-2 flex-wrap">
      {checks.map(c => (
        <span
          key={c.label}
          className="text-[10px] flex items-center gap-1 transition-colors"
          style={{ color: c.ok ? '#34d399' : '#475569' }}
        >
          <CheckCircle2 className="w-3 h-3" />
          {c.label}
        </span>
      ))}
    </div>
  );
}

export default function Register() {
  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [show,       setShow]       = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  // Only pull the register function — not loading/error from store
  const registerFn = useAuthStore(s => s.register);

  const navigate = useNavigate();

  const validate = () => {
    if (!name.trim())         return 'Please enter your full name.';
    if (!email.trim())        return 'Please enter your email address.';
    if (!email.includes('@')) return 'Please enter a valid email address.';
    if (!password)            return 'Please enter a password.';
    if (password.length < 8)  return 'Password must be at least 8 characters.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);

    const result = await registerFn(name.trim(), email.trim(), password);

    setLoading(false);

    if (result.ok) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 mesh-bg">
      <div className="w-full max-w-sm">

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
            Create account
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 text-center">
            Start exploring your codebase with AI
          </p>
        </div>

        <div
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: 'rgba(12, 16, 32, 0.9)',
            border: '1px solid rgba(148,163,184,0.1)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Error banner */}
          {error && (
            <div
              className="flex items-start gap-2.5 text-[13px] p-3 rounded-xl"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171',
              }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Full name */}
            <div className="space-y-1.5">
              <label
                className="text-[11px] font-semibold uppercase tracking-widest block"
                style={{ color: '#475569' }}
              >
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Jane Smith"
                disabled={loading}
                className="input-base rounded-xl px-4 py-2.5 text-sm w-full"
                style={{ opacity: loading ? 0.6 : 1 }}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label
                className="text-[11px] font-semibold uppercase tracking-widest block"
                style={{ color: '#475569' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                disabled={loading}
                className="input-base rounded-xl px-4 py-2.5 text-sm w-full"
                style={{ opacity: loading ? 0.6 : 1 }}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                className="text-[11px] font-semibold uppercase tracking-widest block"
                style={{ color: '#475569' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  disabled={loading}
                  className="input-base rounded-xl px-4 py-2.5 pr-10 text-sm w-full"
                  style={{ opacity: loading ? 0.6 : 1 }}
                />
                <button
                  type="button"
                  onClick={() => setShow(v => !v)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#475569' }}
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Live password strength */}
              <PasswordStrength password={password} />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 rounded-xl text-[14px] text-white flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              style={{ marginTop: password ? '0.25rem' : undefined }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>Create account</span>
                </>
              )}
            </button>

          </form>

          <p className="text-center text-[13px] text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium transition-colors"
              style={{ color: '#60a5fa' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}