import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import useAppStore from './store/appStore';
import { getRepos } from './api/client';
import { useEffect } from 'react';

function Layout({ children }) {
  const { repos, activeRepoId, setActiveRepo, setRepos } = useAppStore();

  useEffect(() => {
    getRepos().then(setRepos).catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col p-3">
        <h1 className="text-sm font-bold text-blue-400 mb-4 px-2">🧠 Codebase AI</h1>
        <p className="text-xs text-gray-500 px-2 mb-2">Repositories</p>
        {repos.filter(r => r.status === 'ready').map(repo => (
          <button
            key={repo._id}
            onClick={() => setActiveRepo(repo._id)}
            className={`text-left text-xs px-2 py-2 rounded-lg mb-1 truncate transition-colors ${
              activeRepoId === repo._id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {repo.name.split('/').pop()}
          </button>
        ))}
        <div className="mt-auto">
          <a href="/" className="text-xs text-gray-500 hover:text-white px-2 py-2 block">+ Add Repository</a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}