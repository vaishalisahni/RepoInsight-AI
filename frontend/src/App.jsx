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

function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1 flex flex-col overflow-hidden">
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