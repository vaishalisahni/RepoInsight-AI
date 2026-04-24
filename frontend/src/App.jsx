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
 * Layout:  navbar (56px, shrink-0)  +  content (flex-1, overflow-hidden)
 *
 * Using 100dvh (or 100vh fallback) on the root ensures the app never
 * overflows the viewport. Each child that needs scroll manages it
 * internally via overflow-y-auto on its own scrollable container.
 */
function Layout() {
  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        height:        '100dvh',   // dynamic viewport height — handles mobile chrome bar
        overflow:      'hidden',
      }}
    >
      <Navbar />
      {/* Content area fills the remaining height exactly */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  const initAuth = useAuthStore(s => s.initAuth);
  useEffect(() => { initAuth(); }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* Public */}
          <Route path="/" element={<Home />} />

          {/* Guest-only */}
          <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

          {/* Protected */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/settings"  element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}