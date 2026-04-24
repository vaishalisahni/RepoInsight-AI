import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare, GitBranch, Zap, Home, Plus, Code2,
  ChevronLeft, ChevronRight, Activity, Settings, LogOut,
  Search, FolderGit2, Layers,
} from 'lucide-react';
import useAppStore  from '../store/appStore';
import useAuthStore from '../store/authStore';
import { getRepos } from '../api/client';

const NAV_TABS = [
  { id: 'chat',   icon: MessageSquare, label: 'Chat',    desc: 'Ask questions'     },
  { id: 'graph',  icon: GitBranch,     label: 'Graph',   desc: 'Dependency map'    },
  { id: 'trace',  icon: Activity,      label: 'Trace',   desc: 'Execution flow'    },
  { id: 'impact', icon: Zap,           label: 'Impact',  desc: 'Change analysis'   },
];

export default function Sidebar() {
  const {
    repos, activeRepoId, activeTab, sidebarOpen,
    setRepos, setActiveRepo, setActiveTab, setGraphData, toggleSidebar,
  } = useAppStore();
  const { user, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => { getRepos().then(setRepos).catch(() => {}); }, []);

  const readyRepos = repos.filter(r => r.status === 'ready');
  const isDashboard = location.pathname === '/dashboard';

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <aside
      className={`relative flex flex-col shrink-0 h-full transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-60' : 'w-[52px]'}`}
      style={{
        background:    'rgba(8, 11, 20, 0.95)',
        borderRight:   '1px solid rgba(148, 163, 184, 0.08)',
        backdropFilter:'blur(20px)',
      }}
    >
      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3.5 top-[72px] z-20 w-7 h-7 rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-lg"
        style={{ background: '#0c1020', border: '1px solid rgba(148,163,184,0.15)' }}
        title={sidebarOpen ? 'Collapse' : 'Expand'}
      >
        {sidebarOpen
          ? <ChevronLeft  className="w-3 h-3 text-slate-400" />
          : <ChevronRight className="w-3 h-3 text-slate-400" />}
      </button>

      {/* Brand */}
      <div
        className="flex items-center px-3 h-[56px] gap-2.5 shrink-0"
        style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}
      >
        <div
          className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', boxShadow: '0 0 14px rgba(59,130,246,0.25)' }}
        >
          <Code2 className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden min-w-0">
            <p
              className="text-[14px] font-bold text-slate-100 whitespace-nowrap leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              RepoInsight
            </p>
            <p className="text-[10px] text-blue-400 whitespace-nowrap" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              Codebase AI
            </p>
          </div>
        )}
      </div>

      {/* Home nav */}
      <div className="px-2 pt-2 pb-1 shrink-0">
        <SidebarItem
          icon={Home}
          label="Home"
          active={location.pathname === '/'}
          collapsed={!sidebarOpen}
          onClick={() => navigate('/')}
        />
      </div>

      {/* Tools — only when in dashboard + repo selected */}
      {isDashboard && activeRepoId && (
        <div
          className="px-2 py-2 shrink-0"
          style={{ borderTop: '1px solid rgba(148,163,184,0.06)', borderBottom: '1px solid rgba(148,163,184,0.06)' }}
        >
          {sidebarOpen && (
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2 mb-2">
              Tools
            </p>
          )}
          {NAV_TABS.map(tab => (
            <SidebarItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              active={activeTab === tab.id}
              collapsed={!sidebarOpen}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      )}

      {/* Repos list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {sidebarOpen && readyRepos.length > 0 && (
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2 mb-2 mt-1">
            Repositories
          </p>
        )}
        {readyRepos.map(repo => {
          const isActive = activeRepoId === repo._id;
          const shortName = repo.name.includes('/')
            ? repo.name.split('/').pop()
            : repo.name;

          return sidebarOpen ? (
            <button
              key={repo._id}
              onClick={() => { setActiveRepo(repo._id); setGraphData(null); navigate('/dashboard'); }}
              className="w-full text-left px-2.5 py-2.5 rounded-xl mb-0.5 transition-all group"
              style={{
                background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(148,163,184,0.05)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold"
                  style={{
                    background: isActive ? 'rgba(59,130,246,0.2)' : 'rgba(148,163,184,0.08)',
                    color: isActive ? '#60a5fa' : '#475569',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {shortName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold truncate" style={{ color: isActive ? '#e2e8f0' : '#94a3b8' }}>
                    {shortName}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: isActive ? '#475569' : '#334155', fontFamily: "'IBM Plex Mono', monospace" }}>
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
                background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                border: isActive ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
              }}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: isActive ? 'rgba(59,130,246,0.25)' : 'rgba(148,163,184,0.1)',
                  color: isActive ? '#60a5fa' : '#64748b',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {shortName.charAt(0).toUpperCase()}
              </div>
            </button>
          );
        })}

        {readyRepos.length === 0 && sidebarOpen && (
          <div className="px-2 py-4 text-center">
            <FolderGit2 className="w-8 h-8 mx-auto mb-2" style={{ color: '#1e2d45' }} />
            <p className="text-[11px]" style={{ color: '#334155' }}>No repos yet</p>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div
        className="px-2 py-2 shrink-0 space-y-0.5"
        style={{ borderTop: '1px solid rgba(148,163,184,0.08)' }}
      >
        <SidebarItem
          icon={Plus}
          label="Add Repository"
          collapsed={!sidebarOpen}
          onClick={() => navigate('/')}
        />
        <SidebarItem
          icon={Settings}
          label="Settings"
          active={location.pathname === '/settings'}
          collapsed={!sidebarOpen}
          onClick={() => navigate('/settings')}
        />

        {/* User chip */}
        {sidebarOpen && user && (
          <div
            className="flex items-center gap-2 px-2.5 py-2.5 rounded-xl mt-1"
            style={{ background: 'rgba(148,163,184,0.04)', border: '1px solid rgba(148,163,184,0.07)' }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px]"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {user.avatarUrl
                ? <img src={user.avatarUrl} className="w-7 h-7 rounded-full" alt="" />
                : user.name?.charAt(0)?.toUpperCase()
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-600 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-slate-600 hover:text-red-400 transition-colors shrink-0 p-1 rounded-lg hover:bg-red-500/10"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function SidebarItem({ icon: Icon, label, active, collapsed, onClick }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className="w-full flex items-center gap-2.5 rounded-xl transition-all mb-0.5"
      style={{
        padding: collapsed ? '0.5rem' : '0.5rem 0.625rem',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
        border: active ? '1px solid rgba(59,130,246,0.18)' : '1px solid transparent',
        color: active ? '#60a5fa' : '#64748b',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(148,163,184,0.06)';
          e.currentTarget.style.color = '#94a3b8';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#64748b';
        }
      }}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && (
        <span className="text-[13px] font-medium whitespace-nowrap">{label}</span>
      )}
    </button>
  );
}