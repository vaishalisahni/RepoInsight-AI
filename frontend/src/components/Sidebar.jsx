import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare, GitBranch, Zap, Home, Plus, Code2,
  ChevronLeft, ChevronRight, Activity, Settings, LogOut,
} from 'lucide-react';
import useAppStore  from '../store/appStore';
import useAuthStore from '../store/authStore';
import { getRepos } from '../api/client';

const NAV_TABS = [
  { id: 'chat',   icon: MessageSquare, label: 'Chat'   },
  { id: 'graph',  icon: GitBranch,     label: 'Graph'  },
  { id: 'trace',  icon: Activity,      label: 'Trace'  },
  { id: 'impact', icon: Zap,           label: 'Impact' },
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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={`relative flex flex-col shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-14'}`}
      style={{
        background:    'rgba(13,11,30,0.95)',
        borderRight:   '1px solid rgba(124,127,245,0.1)',
        backdropFilter:'blur(20px)',
      }}
    >
      {/* Toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
        style={{ background:'#1a1735', border:'1px solid rgba(124,127,245,0.2)' }}
      >
        {sidebarOpen
          ? <ChevronLeft  className="w-3 h-3 text-ink-400" />
          : <ChevronRight className="w-3 h-3 text-ink-400" />}
      </button>

      {/* Logo */}
      <div className="px-3 py-4 flex items-center gap-2.5 border-b overflow-hidden"
           style={{ borderColor:'rgba(124,127,245,0.1)' }}>
        <div className="w-8 h-8 rounded-xl shrink-0 bg-gradient-to-br from-ink-500 to-cyan-400 flex items-center justify-center shadow-[0_0_16px_rgba(92,91,232,0.4)]">
          <Code2 className="w-4 h-4 text-white" />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white font-display leading-none whitespace-nowrap">RepoInsight</p>
            <p className="text-[10px] text-ink-400 leading-none mt-0.5 whitespace-nowrap">AI · Codebase Intelligence</p>
          </div>
        )}
      </div>

      {/* Home */}
      <div className="p-2 border-b" style={{ borderColor:'rgba(124,127,245,0.1)' }}>
        <button
          onClick={() => navigate('/')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
            location.pathname === '/' ? 'bg-ink-600/20 text-ink-400' : 'text-[#4a476a] hover:text-white hover:bg-white/5'
          }`}
        >
          <Home className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span className="text-xs font-medium whitespace-nowrap">Home</span>}
        </button>
      </div>

      {/* Dashboard tabs */}
      {activeRepoId && location.pathname === '/dashboard' && (
        <div className="p-2 border-b" style={{ borderColor:'rgba(124,127,245,0.1)' }}>
          {sidebarOpen && (
            <p className="text-[10px] font-semibold text-[#2e2a55] uppercase tracking-wider px-2.5 mb-1.5">Tools</p>
          )}
          {NAV_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={!sidebarOpen ? tab.label : undefined}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-xs transition-all ${
                  isActive ? 'bg-ink-600/20 text-ink-400 shadow-[inset_0_0_0_1px_rgba(92,91,232,0.2)]' : 'text-[#4a476a] hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {sidebarOpen && <span className="font-medium whitespace-nowrap">{tab.label}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Repos list */}
      {sidebarOpen && (
        <div className="flex-1 overflow-y-auto p-2">
          {readyRepos.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-[#2e2a55] uppercase tracking-wider px-2.5 py-2">Repositories</p>
              {readyRepos.map(repo => {
                const isActive = activeRepoId === repo._id;
                return (
                  <button
                    key={repo._id}
                    onClick={() => { setActiveRepo(repo._id); setGraphData(null); navigate('/dashboard'); }}
                    className={`w-full text-left px-2.5 py-2.5 rounded-lg mb-0.5 transition-all group ${
                      isActive ? 'bg-ink-600/20 text-white shadow-[inset_0_0_0_1px_rgba(92,91,232,0.3)]' : 'text-[#4a476a] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <GitBranch className={`w-3 h-3 shrink-0 ${isActive ? 'text-ink-400' : ''}`} />
                      <span className="text-xs font-medium truncate">
                        {repo.name.includes('/') ? repo.name.split('/').pop() : repo.name}
                      </span>
                    </div>
                    <p className={`text-[10px] mt-0.5 ml-5 font-mono truncate ${isActive ? 'text-ink-400/60' : 'text-[#2e2a55]'}`}>
                      {repo.totalChunks || 0} chunks
                    </p>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Bottom: Add repo + Settings + User */}
      <div className="p-2 border-t space-y-0.5" style={{ borderColor:'rgba(124,127,245,0.1)' }}>
        <button
          onClick={() => navigate('/')}
          title={!sidebarOpen ? 'Add Repository' : undefined}
          className="w-full flex items-center gap-2 text-xs text-[#2e2a55] hover:text-ink-400 px-2.5 py-2 rounded-lg hover:bg-ink-600/10 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          {sidebarOpen && <span>Add Repository</span>}
        </button>

        <button
          onClick={() => navigate('/settings')}
          title={!sidebarOpen ? 'Settings' : undefined}
          className={`w-full flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg transition-colors ${
            location.pathname === '/settings' ? 'text-ink-400 bg-ink-600/10' : 'text-[#2e2a55] hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings className="w-3.5 h-3.5 shrink-0" />
          {sidebarOpen && <span>Settings</span>}
        </button>

        {/* User chip */}
        {sidebarOpen && user && (
          <div className="flex items-center gap-2 px-2.5 py-2 mt-1 rounded-lg"
               style={{ background:'rgba(19,17,40,0.6)' }}>
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-ink-500 to-cyan-400 flex items-center justify-center shrink-0">
              {user.avatarUrl
                ? <img src={user.avatarUrl} className="w-6 h-6 rounded-full" alt={user.name} />
                : <span className="text-[10px] font-bold text-white">{user.name?.charAt(0).toUpperCase()}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-white truncate">{user.name}</p>
              <p className="text-[9px] text-[#2e2a55] truncate">{user.email}</p>
            </div>
            <button onClick={handleLogout} title="Sign out"
              className="text-[#2e2a55] hover:text-red-400 transition-colors shrink-0">
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}