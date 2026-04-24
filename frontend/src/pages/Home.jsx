import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { ingestGithub, getRepos, getRepoStatus } from '../api/client';
import useAppStore from '../store/appStore';

export default function Home() {
  const [githubUrl, setGithubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [pollingId, setPollingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const { repos, setRepos, setActiveRepo } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    getRepos().then(setRepos).catch(console.error);
  }, []);

  useEffect(() => {
    if (!pollingId) return;
    const interval = setInterval(async () => {
      const status = await getRepoStatus(pollingId);
      setStatusMsg(`${status.status} — ${status.totalChunks || 0} chunks indexed`);
      if (status.status === 'ready' || status.status === 'error') {
        clearInterval(interval);
        setPollingId(null);
        setLoading(false);
        if (status.status === 'ready') {
          setRepos(await getRepos());
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [pollingId]);

  const handleIngest = async () => {
    if (!githubUrl.trim()) return;
    setLoading(true);
    setStatusMsg('Cloning repository...');
    try {
      const data = await ingestGithub(githubUrl);
      setPollingId(data.repoId);
      setStatusMsg('Indexing... this may take a minute.');
    } catch (err) {
      setStatusMsg('Error: ' + (err.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  const openRepo = (repoId) => {
    setActiveRepo(repoId);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        Codebase AI
      </h1>
      <p className="text-gray-400 mb-10 text-center">
        Index any repository. Ask questions. Understand your code.
      </p>

      {/* Ingest form */}
      <div className="w-full max-w-lg bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Github className="w-5 h-5" /> Index a GitHub Repository
        </h2>
        <div className="flex gap-2">
          <input
            value={githubUrl}
            onChange={e => setGithubUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={handleIngest}
            disabled={loading || !githubUrl.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Index'}
          </button>
        </div>
        {statusMsg && (
          <p className="mt-3 text-sm text-gray-400 flex items-center gap-2">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 text-green-400" />}
            {statusMsg}
          </p>
        )}
      </div>

      {/* Existing repos */}
      {repos.length > 0 && (
        <div className="w-full max-w-lg">
          <h3 className="text-gray-400 text-sm font-medium mb-3">Indexed Repositories</h3>
          <div className="space-y-2">
            {repos.map(repo => (
              <button
                key={repo._id}
                onClick={() => repo.status === 'ready' && openRepo(repo._id)}
                className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-4 text-left transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{repo.name}</p>
                  <p className="text-xs text-gray-500">{repo.totalChunks} chunks • {repo.totalFiles} files</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  repo.status === 'ready' ? 'bg-green-900 text-green-400' :
                  repo.status === 'indexing' ? 'bg-yellow-900 text-yellow-400' :
                  'bg-red-900 text-red-400'
                }`}>
                  {repo.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}