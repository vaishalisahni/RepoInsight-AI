import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Code2, Settings, LogOut, Github, ChevronDown, User, AlertTriangle, Zap } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import useAuthStore from '../store/authStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);
  const dropRef   = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: 'rgba(8, 11, 20, 0.9)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-5 h-[56px] flex items-center gap-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all group-hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #0ea5e9 100%)',
              boxShadow: '0 0 16px rgba(59,130,246,0.3)',
            }}
          >
            <Code2 className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span
            className="font-bold tracking-tight hidden sm:block"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', color: '#f1f5f9' }}
          >
            RepoInsight
          </span>
          <span
            className="hidden md:block text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', fontFamily: "'IBM Plex Mono', monospace" }}
          >
            AI
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1">
          {user && (
            <>
              <NavLink to="/" label="Home" active={isActive('/')} />
              <NavLink to="/dashboard" label="Dashboard" active={isActive('/dashboard')} />
            </>
          )}
          {!user && (
            <NavLink to="/" label="Home" active={isActive('/')} />
          )}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              {/* GitHub token warning pill */}
              {!user.hasGithubToken && (
                <Link
                  to="/settings"
                  className="hidden md:flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    color: '#fbbf24',
                  }}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Add GitHub token
                </Link>
              )}

              {/* User menu */}
              <div className="relative" ref={dropRef}>
                <button
                  onClick={() => setOpen(v => !v)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all"
                  style={{
                    background: open ? 'rgba(148,163,184,0.08)' : 'transparent',
                    border: '1px solid rgba(148,163,184,0.1)',
                  }}
                >
                  <Avatar user={user} size={26} />
                  <span className="text-[13px] font-medium text-slate-200 hidden sm:block max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl py-1.5 z-50"
                    style={{
                      background: 'rgba(10, 14, 26, 0.98)',
                      border: '1px solid rgba(148,163,184,0.12)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    }}
                  >
                    {/* User info */}
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                      <div className="flex items-center gap-2.5">
                        <Avatar user={user} size={32} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-100 truncate">{user.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${user.plan === 'pro' ? 'badge-ready' : 'badge-pending'}`}>
                          {user.plan}
                        </span>
                        {user.hasGithubToken && user.githubUsername && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Github className="w-2.5 h-2.5" />@{user.githubUsername}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      <DropItem icon={Settings} label="Settings" onClick={() => { setOpen(false); navigate('/settings'); }} />
                      <DropItem icon={User} label="Profile" onClick={() => { setOpen(false); navigate('/settings'); }} />
                    </div>

                    <div style={{ borderTop: '1px solid rgba(148,163,184,0.08)', marginTop: '4px', paddingTop: '4px' }}>
                      <DropItem icon={LogOut} label="Sign out" onClick={handleLogout} danger />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-[13px] font-medium px-3.5 py-1.5 rounded-lg transition-colors"
                style={{ color: '#94a3b8' }}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="btn-primary text-white text-[13px] px-4 py-1.5 rounded-lg"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, label, active }) {
  return (
    <Link
      to={to}
      className="text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all"
      style={{
        color: active ? '#60a5fa' : '#64748b',
        background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
      }}
    >
      {label}
    </Link>
  );
}

function Avatar({ user, size }) {
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        className="rounded-full object-cover"
        style={{ width: size, height: size, minWidth: size }}
        alt={user.name}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold"
      style={{
        width: size,
        height: size,
        minWidth: size,
        background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
        fontSize: size * 0.38,
        color: '#fff',
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {user?.name?.charAt(0)?.toUpperCase()}
    </div>
  );
}

function DropItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors text-left"
      style={{ color: danger ? '#f87171' : '#94a3b8' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.08)' : 'rgba(148,163,184,0.06)';
        e.currentTarget.style.color = danger ? '#fca5a5' : '#e2e8f0';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = danger ? '#f87171' : '#94a3b8';
      }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
    </button>
  );
}