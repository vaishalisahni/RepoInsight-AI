import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home      from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login     from './pages/Login';
import Register  from './pages/Register';
import Settings  from './pages/Settings';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';
import Navbar from './components/Navbar';
import { Outlet } from 'react-router-dom';

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
  const initAuth  = useAuthStore(s => s.initAuth);
  const initTheme = useThemeStore(s => s.initTheme);

  useEffect(() => {
    initAuth();
    initTheme(); // apply saved theme on mount
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/settings"  element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}