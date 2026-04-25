import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Github, ArrowRight, Loader2, XCircle, Zap, GitBranch,
  Brain, Sparkles, Upload, ChevronRight, Activity, FileArchive,
  CheckCircle2
} from 'lucide-react';
import { ingestGithub, getRepos, getRepoStatus, deleteRepo } from '../api/client';
import api from '../api/client';
import useAppStore from '../store/appStore';

const DEMO_REPOS = [
  { label: 'expressjs/express', url: 'https://github.com/expressjs/express' },
  { label: 'fastify/fastify',   url: 'https://github.com/fastify/fastify' },
  { label: 'facebook/react',    url: 'https://github.com/facebook/react' },
];

const FEATURES = [
  { icon: Brain,     title: 'Semantic Q&A',     desc: 'Ask natural language questions. Get answers with file references and line numbers.' },
  { icon: GitBranch, title: 'Dependency Graph', desc: 'Interactive visualization of all file imports and module relationships.' },
  { icon: Activity,  title: 'Flow Tracing',     desc: 'Trace execution paths across services and files with Mermaid diagrams.' },
  { icon: Zap,       title: 'Impact Analysis',  desc: 'Know exactly what breaks before you change a single line of code.' },
];

function StatusBadge({ status }) {
  const map = { ready: 'badge-ready', indexing: 'badge-indexing', error: 'badge-error', pending: 'badge-pending' };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[status] || 'badge-pending'}`}>
      {status}
    </span>
  );
}

// ZIP upload via multipart/form-data
async function ingestZip(file, name) {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);
  const res = await api.post('/ingest', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  });
  return res.data;
}

export default function Home() {
  const [url,        setUrl]        = useState('');
  const [loading,    setLoading]    = useState(false);
  const [pollingId,  setPollingId]  = useState(null);
  const [statusMsg,  setStatusMsg]  = useState('');
  const [error,      setError]      = useState('');
  const [inputMode,  setInputMode]  = useState('url'); // 'url' | 'zip'
  const [dragOver,   setDragOver]   = useState(false);
  const [zipFile,    setZipFile]    = useState(null);
  const [zipName,    setZipName]    = useState('');
  const fileInputRef = useRef(null);
  const { repos, setRepos, setActiveRepo } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => { getRepos().then(setRepos).catch(() => {}); }, []);

  // Request notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!pollingId) return;
    const iv = setInterval(async () => {
      try {
        const s = await getRepoStatus(pollingId);
        setStatusMsg(`${s.status} · ${(s.totalChunks || 0).toLocaleString()} chunks indexed`);
        if (s.status === 'ready' || s.status === 'error') {
          clearInterval(iv);
          setPollingId(null);
          setLoading(false);
          if (s.status === 'ready') {
            const fresh = await getRepos();
            setRepos(fresh);
            setStatusMsg('');
            setZipFile(null);
            setZipName('');
            // Browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('RepoInsight — Indexing Complete ✓', {
                body: `${s.name} is ready. ${s.totalFiles} files, ${s.totalChunks} chunks indexed.`,
                icon: '/favicon.svg',
              });
            }
          } else {
            setError('Indexing failed. Check your repository URL and try again.');
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

  const handleZipIngest = async () => {
    if (!zipFile) return;
    setError(''); setStatusMsg(''); setLoading(true);
    try {
      const data = await ingestZip(zipFile, zipName || zipFile.name.replace(/\.zip$/, ''));
      setPollingId(data.repoId);
      setStatusMsg('Extracting ZIP…');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.zip') || file.type === 'application/zip')) {
      setZipFile(file);
      setZipName(file.name.replace(/\.zip$/, ''));
      setInputMode('zip');
    } else {
      setError('Only ZIP files are supported for upload.');
    }
  }, []);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const openRepo = (repo) => {
    setActiveRepo(repo._id);
    navigate('/dashboard');
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this repository?')) return;
    await deleteRepo(id).catch(() => {});
    setRepos(await getRepos());
  };

  const readyRepos = repos.filter(r => r.status === 'ready');

  return (
    <div
      className="min-h-screen mesh-bg"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Global drag overlay */}
      {dragOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: 'rgba(59,130,246,0.15)',
            border: '3px dashed rgba(59,130,246,0.6)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div className="text-center">
            <FileArchive className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <p className="text-xl font-bold text-blue-300" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Drop ZIP to index
            </p>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-16">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <span
            className="inline-flex items-center gap-2 text-[12px] font-semibold px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}
          >
            <Sparkles className="w-3 h-3" />
            AI-Powered Codebase Intelligence
          </span>
        </div>

        {/* Heading */}
        <h1
          className="text-center text-4xl md:text-5xl font-bold mb-5 leading-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#f1f5f9', letterSpacing: '-0.02em' }}
        >
          Understand any codebase
          <br />
          <span style={{ background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            in minutes
          </span>
        </h1>

        <p className="text-center text-[15px] text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Index any GitHub repository or upload a ZIP. Ask questions in plain English. Trace execution flows, visualize dependencies, and onboard faster.
        </p>

        {/* Ingest card */}
        <div
          className="max-w-2xl mx-auto rounded-2xl p-5 mb-3"
          style={{ background: 'rgba(12, 16, 32, 0.9)', border: '1px solid rgba(148,163,184,0.1)', backdropFilter: 'blur(20px)' }}
        >
          {/* Mode tabs */}
          <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'rgba(16,23,41,0.6)' }}>
            {[
              { id: 'url',  icon: Github,      label: 'GitHub URL' },
              { id: 'zip',  icon: FileArchive, label: 'Upload ZIP' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setInputMode(tab.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold transition-all"
                style={{
                  background: inputMode === tab.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: inputMode === tab.id ? '#60a5fa' : '#475569',
                  border: inputMode === tab.id ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
                }}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {inputMode === 'url' ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#475569' }}>
                GitHub Repository URL
              </p>
              <div className="flex gap-2.5">
                <div
                  className="flex-1 flex items-center gap-2.5 rounded-xl px-3.5"
                  style={{ background: 'rgba(16,23,41,0.8)', border: '1px solid rgba(148,163,184,0.12)', height: '44px' }}
                >
                  <Github className="w-4 h-4 shrink-0" style={{ color: '#475569' }} />
                  <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleIngest()}
                    placeholder="https://github.com/owner/repo"
                    className="flex-1 bg-transparent outline-none text-[14px]"
                    style={{ color: '#f1f5f9', fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                </div>
                <button
                  onClick={handleIngest}
                  disabled={loading || !url.trim()}
                  className="btn-primary text-white text-[13px] font-semibold px-5 rounded-xl flex items-center gap-2 whitespace-nowrap"
                  style={{ height: '44px' }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {loading ? 'Indexing…' : 'Index Repo'}
                </button>
              </div>

              {/* Quick picks */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-[11px]" style={{ color: '#334155' }}>Try:</span>
                {DEMO_REPOS.map(r => (
                  <button
                    key={r.url}
                    onClick={() => setUrl(r.url)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors"
                    style={{
                      background: 'rgba(59,130,246,0.06)',
                      border: '1px solid rgba(59,130,246,0.12)',
                      color: '#60a5fa',
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#475569' }}>
                Upload ZIP Archive
              </p>

              {/* Drop zone */}
              <div
                onClick={() => !zipFile && fileInputRef.current?.click()}
                className="relative rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer"
                style={{
                  border: `2px dashed ${zipFile ? 'rgba(16,185,129,0.4)' : 'rgba(59,130,246,0.25)'}`,
                  background: zipFile ? 'rgba(16,185,129,0.05)' : 'rgba(59,130,246,0.04)',
                  minHeight: '120px',
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file?.name.endsWith('.zip')) { setZipFile(file); setZipName(file.name.replace(/\.zip$/, '')); }
                }}
                onDragOver={e => e.preventDefault()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files[0];
                    if (f) { setZipFile(f); setZipName(f.name.replace(/\.zip$/, '')); }
                  }}
                />
                {zipFile ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <div className="text-center">
                      <p className="text-[13px] font-semibold text-emerald-300">{zipFile.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{(zipFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setZipFile(null); setZipName(''); }}
                      className="text-[11px] text-slate-500 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8" style={{ color: '#3b82f6' }} />
                    <div className="text-center">
                      <p className="text-[13px] font-semibold text-slate-300">Drop ZIP here or click to browse</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Max 100 MB • .zip files only</p>
                    </div>
                  </>
                )}
              </div>

              {zipFile && (
                <div className="mt-3 flex gap-2.5">
                  <div
                    className="flex-1 flex items-center rounded-xl px-3.5"
                    style={{ background: 'rgba(16,23,41,0.8)', border: '1px solid rgba(148,163,184,0.12)', height: '40px' }}
                  >
                    <input
                      value={zipName}
                      onChange={e => setZipName(e.target.value)}
                      placeholder="Repository name (optional)"
                      className="flex-1 bg-transparent outline-none text-[13px]"
                      style={{ color: '#f1f5f9' }}
                    />
                  </div>
                  <button
                    onClick={handleZipIngest}
                    disabled={loading}
                    className="btn-primary text-white text-[13px] font-semibold px-5 rounded-xl flex items-center gap-2 whitespace-nowrap"
                    style={{ height: '40px' }}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {loading ? 'Indexing…' : 'Index ZIP'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Status messages */}
          {statusMsg && (
            <div className="mt-3 flex items-center gap-2 text-[12px] text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{statusMsg}</span>
            </div>
          )}
          {error && (
            <div className="mt-3 flex items-center gap-2 text-[12px] text-red-400">
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Repos section */}
      {repos.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-bold uppercase tracking-widest" style={{ color: '#334155' }}>
              Indexed Repositories
            </h2>
            <span className="text-[11px] text-slate-600">{readyRepos.length} ready</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {repos.map(repo => {
              const shortName = repo.name.includes('/') ? repo.name.split('/').pop() : repo.name;
              const isReady = repo.status === 'ready';

              return (
                <div
                  key={repo._id}
                  onClick={() => isReady && openRepo(repo)}
                  className="group rounded-xl p-4 transition-all duration-200"
                  style={{
                    background: 'rgba(12, 16, 32, 0.7)',
                    border: '1px solid rgba(148,163,184,0.08)',
                    cursor: isReady ? 'pointer' : 'default',
                  }}
                  onMouseEnter={e => {
                    if (isReady) {
                      e.currentTarget.style.border = '1px solid rgba(59,130,246,0.2)';
                      e.currentTarget.style.background = 'rgba(12, 16, 32, 0.9)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.border = '1px solid rgba(148,163,184,0.08)';
                    e.currentTarget.style.background = 'rgba(12, 16, 32, 0.7)';
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[14px]"
                      style={{
                        background: 'rgba(59,130,246,0.12)',
                        color: '#60a5fa',
                        fontFamily: "'Space Grotesk', sans-serif",
                        border: '1px solid rgba(59,130,246,0.15)',
                      }}
                    >
                      {shortName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={repo.status} />
                      <button
                        onClick={e => handleDelete(e, repo._id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all text-slate-600 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[13px] font-semibold text-slate-200 truncate mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {shortName}
                  </p>
                  <p className="text-[10px] text-slate-600 truncate mb-3" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {repo.name}
                  </p>

                  {isReady && (
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3">
                        <span className="text-[11px] text-slate-500">{(repo.totalFiles || 0).toLocaleString()} files</span>
                        <span className="text-[11px] text-slate-600">·</span>
                        <span className="text-[11px] text-slate-500">{(repo.totalChunks || 0).toLocaleString()} chunks</span>
                      </div>
                      <span className="text-blue-500 group-hover:text-blue-400 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  )}
                  {repo.status === 'indexing' && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
                      <Loader2 className="w-3 h-3 animate-spin" /> Indexing…
                    </div>
                  )}
                  {repo.status === 'error' && (
                    <p className="text-[11px] text-red-400 truncate">{repo.errorMessage || 'Indexing failed'}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        {repos.length === 0 && (
          <p className="text-center text-[12px] font-bold uppercase tracking-widest mb-6" style={{ color: '#1e2d45' }}>
            What you can do
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-xl p-4"
                style={{ background: 'rgba(12,16,32,0.5)', border: '1px solid rgba(148,163,184,0.07)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: '#60a5fa' }} />
                </div>
                <p className="text-[13px] font-semibold text-slate-200 mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {f.title}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}