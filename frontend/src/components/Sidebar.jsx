import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare, GitBranch, Zap, Home, Plus,
  ChevronLeft, ChevronRight, Activity, Settings, LogOut,
  FolderGit2, X,
} from 'lucide-react';
import useAppStore  from '../store/appStore';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { getRepos } from '../api/client';

const NAV_TABS = [
  { id: 'chat',   icon: MessageSquare, label: 'Chat',   desc: 'Ask questions'   },
  { id: 'graph',  icon: GitBranch,     label: 'Graph',  desc: 'Dependency map'  },
  { id: 'trace',  icon: Activity,      label: 'Trace',  desc: 'Execution flow'  },
  { id: 'impact', icon: Zap,           label: 'Impact', desc: 'Change analysis' },
];

export default function Sidebar({ onClose }) {
  const {
    repos, activeRepoId, activeTab, sidebarOpen,
    setRepos, setActiveRepo, setActiveTab, setGraphData, toggleSidebar,
  } = useAppStore();
  const { user, logout } = useAuthStore();
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';

  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => { getRepos().then(setRepos).catch(() => {}); }, []);

  const readyRepos  = repos.filter(r => r.status === 'ready');
  const isDashboard = location.pathname === '/dashboard';

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const isOpen = isMobile ? true : sidebarOpen;

  // Theme-aware colors
  const sidebarBg   = isLight ? 'rgba(241,245,249,0.98)' : 'rgba(8,11,20,0.97)';
  const borderColor = isLight ? 'rgba(15,23,42,0.1)'     : 'rgba(148,163,184,0.08)';
  const textMuted   = isLight ? '#64748b' : '#64748b';
  const textLabel   = isLight ? '#94a3b8' : '#475569';
  const emptyColor  = isLight ? '#cbd5e1' : '#1e2d45';
  const toggleBg    = isLight ? '#f1f5f9' : '#0c1020';
  const toggleBorder= isLight ? 'rgba(15,23,42,0.12)' : 'rgba(148,163,184,0.15)';

  return (
    <aside
      className="relative flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        width:         isOpen ? '220px' : '52px',
        height:        '100%',
        background:    sidebarBg,
        borderRight:   `1px solid ${borderColor}`,
        backdropFilter:'blur(20px)',
      }}
    >
      {/* Mobile close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(148,163,184,0.1)', border: `1px solid ${borderColor}` }}
        >
          <X className="w-3.5 h-3.5" style={{ color: textMuted }} />
        </button>
      )}

      {/* Desktop collapse toggle */}
      {!onClose && (
        <button
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="absolute -right-3.5 top-16 z-20 w-7 h-7 rounded-full hidden md:flex items-center justify-center transition-all hover:scale-105 shadow-lg"
          style={{ background: toggleBg, border: `1px solid ${toggleBorder}` }}
        >
          {sidebarOpen
            ? <ChevronLeft  className="w-3 h-3" style={{ color: textMuted }} />
            : <ChevronRight className="w-3 h-3" style={{ color: textMuted }} />}
        </button>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Home nav */}
        <div className="px-2 pt-3 pb-1 shrink-0">
          <SidebarItem
            icon={Home}
            label="Home"
            active={location.pathname === '/'}
            collapsed={!isOpen}
            isLight={isLight}
            onClick={() => { navigate('/'); onClose?.(); }}
          />
        </div>

        {/* Tools */}
        {isDashboard && activeRepoId && (
          <div className="px-2 py-2 shrink-0" style={{ borderTop: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}>
            {isOpen && (
              <p className="text-[9px] font-bold uppercase tracking-widest px-2 mb-2" style={{ color: textLabel }}>
                Tools
              </p>
            )}
            {NAV_TABS.map(tab => (
              <SidebarItem
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                active={activeTab === tab.id}
                collapsed={!isOpen}
                isLight={isLight}
                onClick={() => { setActiveTab(tab.id); onClose?.(); }}
              />
            ))}
          </div>
        )}

        {/* Repos list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isOpen && readyRepos.length > 0 && (
            <p className="text-[9px] font-bold uppercase tracking-widest px-2 mb-2 mt-1" style={{ color: textLabel }}>
              Repositories
            </p>
          )}

          {readyRepos.map(repo => {
            const isActive  = activeRepoId === repo._id;
            const shortName = repo.name.includes('/') ? repo.name.split('/').pop() : repo.name;
            const activeBg     = 'rgba(59,130,246,0.12)';
            const activeBorder = 'rgba(59,130,246,0.2)';
            const hoverBg      = isLight ? 'rgba(15,23,42,0.05)' : 'rgba(148,163,184,0.05)';
            const nameColor    = isActive ? (isLight ? '#1e40af' : '#e2e8f0') : (isLight ? '#334155' : '#94a3b8');
            const metaColor    = isActive ? (isLight ? '#64748b' : '#475569') : (isLight ? '#94a3b8' : '#334155');

            return isOpen ? (
              <button
                key={repo._id}
                onClick={() => { setActiveRepo(repo._id); setGraphData(null); navigate('/dashboard'); onClose?.(); }}
                className="w-full text-left px-2.5 py-2 rounded-xl mb-0.5 transition-all"
                style={{
                  background: isActive ? activeBg : 'transparent',
                  border: isActive ? `1px solid ${activeBorder}` : '1px solid transparent',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = hoverBg; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold"
                    style={{
                      background: isActive ? 'rgba(59,130,246,0.2)' : (isLight ? 'rgba(15,23,42,0.08)' : 'rgba(148,163,184,0.08)'),
                      color: isActive ? '#3b82f6' : textMuted,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {shortName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: nameColor }}>{shortName}</p>
                    <p className="text-[10px] truncate" style={{ color: metaColor, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {(repo.totalChunks || 0).toLocaleString()} chunks
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <button
                key={repo._id}
                title={shortName}
                onClick={() => { setActiveRepo(repo._id); setGraphData(null); navigate('/dashboard'); }}
                className="w-full h-9 rounded-xl mb-0.5 flex items-center justify-center transition-all"
                style={{
                  background: isActive ? activeBg : 'transparent',
                  border: isActive ? `1px solid ${activeBorder}` : '1px solid transparent',
                }}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: isActive ? 'rgba(59,130,246,0.25)' : (isLight ? 'rgba(15,23,42,0.08)' : 'rgba(148,163,184,0.1)'),
                    color: isActive ? '#3b82f6' : textMuted,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {shortName.charAt(0).toUpperCase()}
                </div>
              </button>
            );
          })}

          {readyRepos.length === 0 && isOpen && (
            <div className="px-2 py-6 text-center">
              <FolderGit2 className="w-7 h-7 mx-auto mb-2" style={{ color: emptyColor }} />
              <p className="text-[11px]" style={{ color: emptyColor }}>No repos yet</p>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="px-2 py-2 shrink-0 space-y-0.5" style={{ borderTop: `1px solid ${borderColor}` }}>
          <SidebarItem icon={Plus} label="Add Repository" collapsed={!isOpen} isLight={isLight}
            onClick={() => { navigate('/'); onClose?.(); }} />
          <SidebarItem icon={Settings} label="Settings" active={location.pathname === '/settings'}
            collapsed={!isOpen} isLight={isLight}
            onClick={() => { navigate('/settings'); onClose?.(); }} />

          {/* User chip — expanded */}
          {isOpen && user && (
            <div
              className="flex items-center gap-2 px-2 py-2 rounded-xl mt-1"
              style={{
                background: isLight ? 'rgba(15,23,42,0.04)' : 'rgba(148,163,184,0.04)',
                border: `1px solid ${borderColor}`,
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {user.avatarUrl
                  ? <img src={user.avatarUrl} className="w-7 h-7 object-cover" alt="" />
                  : user.name?.charAt(0)?.toUpperCase()
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: isLight ? '#1e293b' : '#e2e8f0' }}>{user.name}</p>
                <p className="text-[10px] truncate" style={{ color: textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="transition-colors shrink-0 p-1 rounded-lg"
                style={{ color: textMuted }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = textMuted; e.currentTarget.style.background = 'transparent'; }}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Collapsed: logout icon */}
          {!isOpen && user && (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="w-full h-9 rounded-xl flex items-center justify-center transition-all"
              style={{ color: textMuted }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = textMuted; e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({ icon: Icon, label, active, collapsed, onClick, isLight }) {
  const activeColor = '#3b82f6';
  const inactiveColor = isLight ? '#64748b' : '#64748b';
  const activeBg     = 'rgba(59,130,246,0.12)';
  const activeBorder = 'rgba(59,130,246,0.18)';
  const hoverBg      = isLight ? 'rgba(15,23,42,0.05)' : 'rgba(148,163,184,0.06)';
  const hoverColor   = isLight ? '#0f172a' : '#94a3b8';

  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className="w-full flex items-center gap-2.5 rounded-xl transition-all mb-0.5"
      style={{
        padding:        collapsed ? '0.45rem' : '0.45rem 0.625rem',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background:     active ? activeBg : 'transparent',
        border:         active ? `1px solid ${activeBorder}` : '1px solid transparent',
        color:          active ? activeColor : inactiveColor,
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = hoverBg;
          e.currentTarget.style.color = hoverColor;
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = inactiveColor;
        }
      }}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="text-[13px] font-medium whitespace-nowrap">{label}</span>}
    </button>
  );
}