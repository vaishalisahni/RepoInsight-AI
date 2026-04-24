import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Brain, Plus, GitBranch, MessageSquare, Home as HomeIcon } from 'lucide-react';
import Home      from './pages/Home';
import Dashboard from './pages/Dashboard';
import useAppStore from './store/appStore';
import { getRepos } from './api/client';

function Sidebar() {
  const { repos, activeRepoId, setActiveRepo, setRepos, setGraphData } = useAppStore();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    getRepos().then(setRepos).catch(() => {});
  }, []);

  const readyRepos = repos.filter(r => r.status === 'ready');

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800/60 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">RepoInsight</p>
            <p className="text-xs text-gray-500 leading-none mt-0.5">AI</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="p-2 border-b border-gray-800/60">
        <button
          onClick={() => navigate('/')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            location.pathname === '/' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
          }`}
        >
          <HomeIcon className="w-4 h-4" /> Home
        </button>
      </div>

      {/* Repos list */}
      <div className="flex-1 overflow-y-auto p-2">
        {readyRepos.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 py-2">
              Repositories
            </p>
            {readyRepos.map(repo => {
              const isActive = activeRepoId === repo._id;
              return (
                <button
                  key={repo._id}
                  onClick={() => {
                    setActiveRepo(repo._id);
                    setGraphData(null);
                    navigate('/dashboard');
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-all group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GitBranch className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-200' : 'text-gray-600 group-hover:text-gray-400'}`} />
                    <span className="text-xs font-medium truncate">
                      {repo.name.includes('/') ? repo.name.split('/').pop() : repo.name}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ml-5.5 truncate ${isActive ? 'text-blue-200' : 'text-gray-600'}`}>
                    {repo.totalChunks || 0} chunks
                  </p>
                </button>
              );
            })}
          </>
        )}

        {readyRepos.length === 0 && (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-gray-600">No repos indexed yet</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-800/60">
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-2 text-xs text-gray-500 hover:text-white px-3 py-2.5 rounded-lg hover:bg-gray-800/60 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Repository
        </button>
      </div>
    </aside>
  );
}

function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
      </Routes>
    </BrowserRouter>
  );
}