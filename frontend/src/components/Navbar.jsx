import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Code2, Settings, LogOut, Github, ChevronDown, User, AlertTriangle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import useAuthStore from '../store/authStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);
  const dropRef   = useRef(null);

  // Close dropdown on outside click
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

  const navLinks = user
    ? [
        { to: '/',          label: 'Home'      },
        { to: '/dashboard', label: 'Dashboard' },
      ]
    : [
        { to: '/',          label: 'Home'      },
      ];

  return (
    <header
      className="sticky top-0 z-50 w-full border-b"
      style={{ background: 'rgba(7,6,15,0.85)', borderColor: 'rgba(124,127,245,0.1)', backdropFilter: 'blur(16px)' }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ink-500 to-cyan-400 flex items-center justify-center shadow-[0_0_16px_rgba(92,91,232,0.35)] group-hover:shadow-[0_0_24px_rgba(92,91,232,0.5)] transition-shadow">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white font-display hidden sm:block">RepoInsight</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1">
          {navLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                location.pathname === l.to
                  ? 'text-ink-400 bg-ink-600/15'
                  : 'text-[#4a476a] hover:text-white hover:bg-white/5'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              {/* GitHub token warning */}
              {!user.hasGithubToken && (
                <Link
                  to="/settings"
                  className="hidden md:flex items-center gap-1.5 text-[10px] text-amber-400 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-amber-500/10"
                  style={{ border: '1px solid rgba(251,191,36,0.2)' }}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Add GitHub token
                </Link>
              )}

              {/* User dropdown */}
              <div className="relative" ref={dropRef}>
                <button
                  onClick={() => setOpen(v => !v)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors hover:bg-white/5"
                  style={{ border: '1px solid rgba(124,127,245,0.12)' }}
                >
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} className="w-6 h-6 rounded-full" alt={user.name} />
                    : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-ink-500 to-cyan-400 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">{user.name?.charAt(0).toUpperCase()}</span>
                      </div>
                    )
                  }
                  <span className="text-xs text-white hidden sm:block max-w-[120px] truncate">{user.name}</span>
                  <ChevronDown className={`w-3 h-3 text-[#4a476a] transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div
                    className="absolute right-0 top-full mt-1 w-52 rounded-xl py-1 shadow-2xl z-50"
                    style={{ background: 'rgba(13,11,30,0.98)', border: '1px solid rgba(124,127,245,0.15)', backdropFilter: 'blur(12px)' }}
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(124,127,245,0.1)' }}>
                      <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-[#4a476a] truncate">{user.email}</p>
                      <span className={`mt-1 inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${user.plan === 'pro' ? 'badge-ready' : 'badge-pending'}`}>
                        {user.plan}
                      </span>
                    </div>

                    {/* GitHub status */}
                    <div className="px-4 py-2 border-b" style={{ borderColor: 'rgba(124,127,245,0.1)' }}>
                      <div className="flex items-center gap-2">
                        <Github className="w-3 h-3 text-[#4a476a]" />
                        <span className="text-[10px] text-[#4a476a]">GitHub:</span>
                        {user.hasGithubToken
                          ? <span className="text-[10px] text-emerald-400 font-medium">@{user.githubUsername}</span>
                          : <span className="text-[10px] text-amber-400">Not connected</span>
                        }
                      </div>
                    </div>

                    <button
                      onClick={() => { setOpen(false); navigate('/settings'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#8b88a6] hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" /> Settings
                    </button>
                    <button
                      onClick={() => { setOpen(false); navigate('/profile'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#8b88a6] hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <User className="w-3.5 h-3.5" /> Profile
                    </button>

                    <div className="border-t my-1" style={{ borderColor: 'rgba(124,127,245,0.1)' }} />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login"
                className="text-xs font-medium text-[#8b88a6] hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                Sign in
              </Link>
              <Link to="/register"
                className="btn-primary text-white text-xs font-semibold px-4 py-1.5 rounded-lg">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}