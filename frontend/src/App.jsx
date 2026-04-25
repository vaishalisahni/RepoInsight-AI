import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home      from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login     from './pages/Login';
import Register  from './pages/Register';
import Settings  from './pages/Settings';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import useAuthStore from './store/authStore';
import Navbar from './components/Navbar';
import { Outlet } from 'react-router-dom';

/**
 * Layout: navbar (56px fixed) + scrollable content area
 * Using 100dvh so it handles mobile browser chrome correctly.
 */
function Layout() {
  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        height:        '100dvh',
        overflow:      'hidden',
      }}
    >
      <Navbar />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  const initAuth = useAuthStore(s => s.initAuth);

  // Check session once on mount
  useEffect(() => {
    initAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* Public */}
          <Route path="/" element={<Home />} />

          {/* Guest-only (redirect to dashboard if already logged in) */}
          <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

          {/* Protected (redirect to login if not authenticated) */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/settings"  element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}