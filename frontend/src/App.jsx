import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home      from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login     from './pages/Login';
import Register  from './pages/Register';
import Settings  from './pages/Settings';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import useAuthStore from './store/authStore';

export default function App() {
  const initAuth = useAuthStore(s => s.initAuth);

  // On app boot, validate existing session cookie
  useEffect(() => { initAuth(); }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing */}
        <Route path="/" element={<Home />} />

        {/* Guest-only: redirect to dashboard if logged in */}
        <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

        {/* Protected */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/settings"  element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}