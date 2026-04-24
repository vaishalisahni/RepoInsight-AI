import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github, ArrowRight, Loader2, CheckCircle2, XCircle, Zap, GitBranch, Brain, Sparkles, Code2 } from 'lucide-react';
import { ingestGithub, getRepos, getRepoStatus, deleteRepo } from '../api/client';
import useAppStore from '../store/appStore';

const DEMO_REPOS = [
  'https://github.com/expressjs/express',
  'https://github.com/fastify/fastify',
  'https://github.com/vercel/next.js',
];

const FEATURES = [
  { icon: Brain,    title: 'Semantic Search',    desc: 'Ask natural language questions about any part of your codebase' },
  { icon: Zap,      title: 'Flow Tracing',        desc: 'Trace execution paths across files and services visually' },
  { icon: GitBranch,title: 'Dependency Graph',    desc: 'Interactive visualization of all file and module relationships' },
  { icon: Sparkles, title: 'Impact Analysis',     desc: 'Understand what breaks when you change a file' },
];

function StatusBadge({ status }) {
  const map = { ready: 'badge-ready', indexing: 'badge-indexing', error: 'badge-error', pending: 'badge-pending' };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status] || 'badge-pending'}`}>
      {status}
    </span>
  );
}

export default function Home() {
  const [url,       setUrl]       = useState('');
  const [loading,   setLoading]   = useState(false);
  const [pollingId, setPollingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [error,     setError]     = useState('');
  const { repos, setRepos, setActiveRepo } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => { getRepos().then(setRepos).catch(() => {}); }, []);

  useEffect(() => {
    if (!pollingId) return;
    const iv = setInterval(async () => {
      try {
        const s = await getRepoStatus(pollingId);
        setStatusMsg(`${s.status} · ${s.totalChunks || 0} chunks indexed`);
        if (s.status === 'ready' || s.status === 'error') {
          clearInterval(iv);
          setPollingId(null);
          setLoading(false);
          if (s.status === 'ready') {
            const fresh = await getRepos();
            setRepos(fresh);
            setStatusMsg('');
          } else {
            setError('Indexing failed. Check your repository URL.');
          }
        }
      } catch (_) {}
    }, 2500);
    return () => clearInterval(iv);
  }, [pollingId]);

  const handleIngest = async () => {
    if (!url.trim()) return;
    setError(''); setStatusMsg(''); setLoading(true);
    try {
      const data = await ingestGithub(url.trim());
      setPollingId(data.repoId);
      setStatusMsg('Cloning repository…');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      setLoading(false);
    }
  };

  const openRepo = (repo) => {
    setActiveRepo(repo._id);
    navigate('/dashboard');
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteRepo(id).catch(() => {});
    setRepos(await getRepos());
  };

  const readyRepos    = repos.filter(r => r.status === 'ready');
  const indexingRepos = repos.filter(r => r.status === 'indexing');

  return (
    <div className="min-h-screen mesh-bg relative overflow-x-hidden">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ink-500 to-cyan-500 flex items-center justify-center shadow-[0_0_40px_rgba(92,91,232,0.4)]">
              <Code2 className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse-slow" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 text-ink-400"
             style={{ background:'rgba(92,91,232,0.1)', border:'1px solid rgba(92,91,232,0.2)' }}>
          <Sparkles className="w-3 h-3" /> AI-powered codebase intelligence
        </div>

        <h1 className="font-display text-5xl md:text-6xl font-bold mb-5 leading-[1.08] tracking-tight">
          Understand any
          <span className="relative mx-3">
            <span className="bg-gradient-to-r from-ink-400 via-cyan-400 to-ink-400 bg-clip-text text-transparent">
              codebase
            </span>
            <svg className="absolute -bottom-2 left-0 w-full" height="6" viewBox="0 0 200 6" fill="none">
              <path d="M0 5 Q50 0 100 5 Q150 10 200 5" stroke="url(#ug)" strokeWidth="2" fill="none"/>
              <defs><linearGradient id="ug" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7c7ff5"/><stop offset="100%" stopColor="#22d3ee"/>
              </linearGradient></defs>
            </svg>
          </span>
          <br />in minutes
        </h1>

        <p className="text-lg text-[#8b88a6] max-w-xl mx-auto mb-10 leading-relaxed">
          Index your GitHub repository. Ask questions in plain English.
          Trace execution flows, visualize dependencies, and onboard faster.
        </p>

        {/* Ingest card */}
        <div className="max-w-xl mx-auto card-glass rounded-2xl p-5 mb-4 text-left">
          <label className="text-xs font-semibold text-[#8b88a6] uppercase tracking-wider mb-3 block">
            GitHub Repository URL
          </label>
          <div className="flex gap-2.5">
            <div className="flex-1 flex items-center gap-2.5 input-base rounded-xl px-3.5 py-2.5">
              <Github className="w-4 h-4 text-[#8b88a6] shrink-0" />
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleIngest()}
                placeholder="https://github.com/owner/repo"
                className="flex-1 bg-transparent outline-none text-sm text-[#e8e6f0] placeholder-[#4a476a]"
              />
            </div>
            <button
              onClick={handleIngest}
              disabled={loading || !url.trim()}
              className="btn-primary text-white text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Indexing' : 'Index'}
            </button>
          </div>

          {/* Quick-pick */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-[11px] text-[#4a476a] mr-1">Try:</span>
            {DEMO_REPOS.map(r => (
              <button key={r} onClick={() => setUrl(r)}
                className="text-[11px] text-ink-400 hover:text-ink-300 px-2 py-0.5 rounded-md transition-colors"
                style={{ background: 'rgba(92,91,232,0.08)', border: '1px solid rgba(92,91,232,0.15)' }}>
                {r.split('/').slice(-2).join('/')}
              </button>
            ))}
          </div>

          {/* Status */}
          {statusMsg && (
            <div className="mt-3 flex items-center gap-2 text-xs text-[#8b88a6]">
              <Loader2 className="w-3 h-3 animate-spin text-ink-400" />
              <span className="font-mono">{statusMsg}</span>
            </div>
          )}
          {error && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
              <XCircle className="w-3.5 h-3.5" />{error}
            </div>
          )}
        </div>
      </div>

      {/* Repos */}
      {(readyRepos.length > 0 || indexingRepos.length > 0) && (
        <div className="max-w-4xl mx-auto px-6 pb-16">
          <h2 className="text-sm font-semibold text-[#8b88a6] uppercase tracking-wider mb-4">
            Indexed Repositories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {repos.map(repo => (
              <div
                key={repo._id}
                onClick={() => repo.status === 'ready' && openRepo(repo)}
                className={`card-glass rounded-xl p-4 transition-all duration-200 group ${
                  repo.status === 'ready' ? 'cursor-pointer hover:border-ink-500/30 hover:shadow-[0_0_20px_rgba(92,91,232,0.1)]' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ink-600 to-ink-400 flex items-center justify-center shrink-0">
                    <GitBranch className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={repo.status} />
                    <button
                      onClick={e => handleDelete(e, repo._id)}
                      className="opacity-0 group-hover:opacity-100 text-[#4a476a] hover:text-red-400 transition-all p-0.5 rounded"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm font-semibold text-white truncate mb-1">
                  {repo.name.includes('/') ? repo.name.split('/').pop() : repo.name}
                </p>
                <p className="text-xs text-[#4a476a] truncate font-mono mb-2">{repo.name}</p>
                {repo.status === 'ready' && (
                  <div className="flex gap-3 text-xs text-[#8b88a6]">
                    <span>{repo.totalFiles} files</span>
                    <span>{repo.totalChunks} chunks</span>
                  </div>
                )}
                {repo.status === 'indexing' && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Indexing…
                  </div>
                )}
                {repo.status === 'ready' && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-ink-400 group-hover:text-ink-300 transition-colors flex items-center gap-1">
                      Open <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card-glass rounded-xl p-4 text-center">
                <div className="w-9 h-9 rounded-lg mx-auto mb-3 flex items-center justify-center"
                     style={{ background: 'rgba(92,91,232,0.15)', border: '1px solid rgba(92,91,232,0.2)' }}>
                  <Icon className="w-4.5 h-4.5 text-ink-400" style={{ width:'18px', height:'18px' }} />
                </div>
                <p className="text-xs font-semibold text-white mb-1">{f.title}</p>
                <p className="text-[11px] text-[#4a476a] leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}