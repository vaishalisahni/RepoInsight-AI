import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, Code2 } from 'lucide-react';
import useAuthStore from '../store/authStore';

/**
 * Wraps routes that require authentication.
 * Shows a loading screen only during the initial session check (app mount),
 * never during form submits.
 */
export function ProtectedRoute({ children }) {
  const user    = useAuthStore(s => s.user);
  // `loading` is only true during initAuth() called once at mount.
  // It is NOT set true during login/register form submissions.
  const loading = useAuthStore(s => s.loading);
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: '#080b14' }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
            boxShadow: '0 0 24px rgba(59,130,246,0.3)',
          }}
        >
          <Code2 className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#3b82f6' }} />
          <p className="text-[13px]" style={{ color: '#475569' }}>Restoring session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/**
 * Wraps routes that should NOT be accessible when logged in (login, register).
 * Redirects to /dashboard if already authenticated.
 */
export function GuestRoute({ children }) {
  const user    = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);

  // Don't flash login page while checking initial session
  if (loading) return null;

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}