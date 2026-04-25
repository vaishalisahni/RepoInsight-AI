import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Code2, Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [show,     setShow]     = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // Only pull the login function — never pull loading/error from store
  // so store re-renders don't wipe our local error state
  const loginFn = useAuthStore(s => s.login);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation first (never clears existing error from a previous attempt)
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { setError('Please enter your email address.'); return; }
    if (!password)     { setError('Please enter your password.');       return; }

    setError('');
    setLoading(true);

    const result = await loginFn(trimmedEmail, password);

    setLoading(false);

    if (result.ok) {
      navigate(from, { replace: true });
    } else {
      const msg = (result.error || '').toLowerCase();
      if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('password') || msg.includes('credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (msg.includes('too many') || msg.includes('rate')) {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else if (msg.includes('not found') || msg.includes('no account')) {
        setError('No account found with this email address.');
      } else if (result.error) {
        setError(result.error);
      } else {
        setError('Something went wrong. Please try again.');
      }
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
              boxShadow:  '0 0 40px rgba(59,130,246,0.25)',
            }}
          >
            <Code2 className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <h1
            className="text-[22px] font-bold text-slate-100 text-center"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}
          >
            Welcome back
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 text-center">
            Sign in to RepoInsight
          </p>
        </div>

        <div
          className="rounded-2xl p-6 space-y-4"
          style={{
            background:     'rgba(12, 16, 32, 0.9)',
            border:         '1px solid rgba(148,163,184,0.1)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Error banner — only cleared on successful submit, never on typing */}
          {error && (
            <div
              className="flex items-start gap-2.5 p-3 rounded-xl text-[13px]"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border:     '1px solid rgba(239,68,68,0.2)',
                color:      '#f87171',
              }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

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
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={loading}
                  className="input-base rounded-xl px-4 py-2.5 pr-10 text-sm w-full"
                  style={{ opacity: loading ? 0.6 : 1 }}
                />
                <button
                  type="button"
                  onClick={() => setShow(v => !v)}
                  disabled={loading}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#475569' }}
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 rounded-xl text-[14px] text-white flex items-center justify-center gap-2"
              style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>Sign in</span>
                </>
              )}
            </button>

          </form>

          <p className="text-center text-[13px] text-slate-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium transition-colors" style={{ color: '#60a5fa' }}>
              Create one
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}