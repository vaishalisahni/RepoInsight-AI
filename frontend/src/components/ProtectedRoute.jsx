import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import useAuthStore from '../store/authStore';

/**
 * Wraps routes that require authentication.
 * Redirects to /login with ?next= param if not authenticated.
 */
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-ink-400 animate-spin" />
          <p className="text-xs text-[#4a476a]">Restoring session…</p>
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
  const { user, loading } = useAuthStore();

  if (loading) return null; // don't flash login page

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}