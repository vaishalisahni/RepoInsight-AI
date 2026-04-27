import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Github, ArrowRight, Loader2, XCircle, Zap, GitBranch,
  Brain, Sparkles, Upload, ChevronRight, Activity, FileArchive,
  CheckCircle2, RefreshCw, Trash2, AlertTriangle, X, GitFork
} from 'lucide-react';
import { ingestGithub, getRepos, getRepoStatus, deleteRepo, reindexRepo } from '../api/client';
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

function ConfirmModal({ isOpen, title, message, confirmLabel = 'Delete', onConfirm, onCancel, danger = true }) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'var(--card-bg-solid)',
          border: '1px solid var(--border)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
              border: `1px solid ${danger ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}`,
            }}
          >
            <AlertTriangle className="w-4 h-4" style={{ color: danger ? '#ef4444' : '#3b82f6' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              {title}
            </p>
            <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{message}</p>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg transition-colors shrink-0" style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 flex items-center justify-end gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', background: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-100)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{
              background: danger ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
              boxShadow: danger ? '0 0 20px rgba(239,68,68,0.25)' : '0 0 20px rgba(59,130,246,0.25)',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <span className="flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              {confirmLabel}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [branch,     setBranch]     = useState('main');
  const [showBranch, setShowBranch] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [pollingId,  setPollingId]  = useState(null);
  const [statusMsg,  setStatusMsg]  = useState('');
  const [error,      setError]      = useState('');
  const [inputMode,  setInputMode]  = useState('url');
  const [dragOver,   setDragOver]   = useState(false);
  const [zipFile,    setZipFile]    = useState(null);
  const [zipName,    setZipName]    = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, repoId: null, repoName: '' });

  const fileInputRef = useRef(null);
  const { repos, setRepos, setActiveRepo, activeRepoId, clearMessages } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Always refresh repos list on home page visit
    getRepos().then(setRepos).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      const data = await ingestGithub(url.trim(), branch.trim() || 'main');
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

  const handleDragOver  = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const openRepo = (repo) => {
    setActiveRepo(repo._id);
    navigate('/dashboard');
  };

  const confirmDelete = (e, repo) => {
    e.stopPropagation();
    setDeleteModal({ open: true, repoId: repo._id, repoName: repo.name });
  };

  const handleDelete = async () => {
    const { repoId } = deleteModal;
    setDeleteModal({ open: false, repoId: null, repoName: '' });
    await deleteRepo(repoId).catch(() => {});
    const fresh = await getRepos();
    setRepos(fresh);
    if (activeRepoId === repoId) clearMessages();
  };

  const handleReindex = async (e, id) => {
    e.stopPropagation();
    try {
      await reindexRepo(id);
      if (activeRepoId === id) clearMessages();
      const fresh = await getRepos();
      setRepos(fresh);
    } catch (err) {
      console.error('Reindex failed:', err);
    }
  };

  const readyRepos = repos.filter(r => r.status === 'ready');

  return (
    <div
      className="overflow-y-auto h-full mesh-bg"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <ConfirmModal
        isOpen={deleteModal.open}
        title="Delete repository?"
        message={`"${deleteModal.repoName}" will be permanently removed along with all its indexed data and chat history. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, repoId: null, repoName: '' })}
      />

      {dragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(59,130,246,0.15)', border: '3px dashed rgba(59,130,246,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="text-center">
            <FileArchive className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <p className="text-xl font-bold text-blue-300" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Drop ZIP to index</p>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-12 md:pt-20 pb-10 md:pb-16">
        <div className="flex justify-center mb-5 md:mb-6">
          <span className="inline-flex items-center gap-2 text-[11px] md:text-[12px] font-semibold px-3 md:px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}>
            <Sparkles className="w-3 h-3" />
            AI-Powered Codebase Intelligence
          </span>
        </div>

        <h1 className="text-center font-bold mb-4 md:mb-5 leading-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)', letterSpacing: '-0.02em', fontSize: 'clamp(1.75rem, 5vw, 3rem)' }}>
          Understand any codebase
          <br />
          <span style={{ background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            in minutes
          </span>
        </h1>

        <p className="text-center text-[13px] md:text-[15px] max-w-xl mx-auto mb-8 md:mb-10 leading-relaxed px-2" style={{ color: 'var(--text-muted)' }}>
          Index any GitHub repository or upload a ZIP. Ask questions in plain English. Trace execution flows, visualize dependencies, and onboard faster.
        </p>

        {/* Ingest card */}
        <div className="max-w-2xl mx-auto rounded-2xl p-4 md:p-5 mb-3"
          style={{ background: 'var(--card-bg-solid)', border: '1px solid var(--border)', backdropFilter: 'blur(20px)' }}>
          {/* Mode tabs */}
          <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--bg-100)' }}>
            {[
              { id: 'url',  icon: Github,      label: 'GitHub URL' },
              { id: 'zip',  icon: FileArchive, label: 'Upload ZIP' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setInputMode(tab.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold transition-all"
                style={{
                  background: inputMode === tab.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: inputMode === tab.id ? 'var(--accent-bright)' : 'var(--text-muted)',
                  border: inputMode === tab.id ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
                }}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {inputMode === 'url' ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                GitHub Repository URL
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1 flex items-center gap-2.5 rounded-xl px-3.5"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', height: '44px' }}>
                  <Github className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !loading && handleIngest()}
                    placeholder="https://github.com/owner/repo"
                    disabled={loading}
                    className="flex-1 bg-transparent outline-none text-[13px] md:text-[14px]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", minWidth: 0, border: 'none', boxShadow: 'none', background: 'transparent' }}
                  />
                </div>
                <button
                  onClick={handleIngest}
                  disabled={loading || !url.trim()}
                  className="btn-primary text-white text-[13px] font-semibold px-5 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ height: '44px' }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {loading ? 'Indexing…' : 'Index Repo'}
                </button>
              </div>

              {/* Branch selector */}
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => setShowBranch(v => !v)}
                  className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg transition-colors"
                  style={{
                    background: showBranch ? 'rgba(59,130,246,0.1)' : 'transparent',
                    border: '1px solid var(--border)',
                    color: showBranch ? 'var(--accent-bright)' : 'var(--text-muted)',
                  }}>
                  <GitFork className="w-3 h-3" />
                  Branch: <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{branch}</span>
                </button>
                {showBranch && (
                  <input
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    placeholder="main"
                    className="text-[12px] px-2.5 py-1 rounded-lg outline-none"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--accent-border)',
                      color: 'var(--text-primary)',
                      fontFamily: "'IBM Plex Mono', monospace",
                      width: '140px',
                      boxShadow: '0 0 0 3px var(--accent-glow)',
                    }}
                    autoFocus
                  />
                )}
              </div>

              <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                <span className="text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>Try:</span>
                {DEMO_REPOS.map(r => (
                  <button key={r.url} onClick={() => setUrl(r.url)} disabled={loading}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 shrink-0"
                    style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', color: 'var(--accent-bright)', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                Upload ZIP Archive
              </p>
              <div
                onClick={() => !zipFile && !loading && fileInputRef.current?.click()}
                className="relative rounded-xl p-5 flex flex-col items-center justify-center gap-3 transition-all"
                style={{
                  border: `2px dashed ${zipFile ? 'rgba(16,185,129,0.4)' : 'rgba(59,130,246,0.25)'}`,
                  background: zipFile ? 'rgba(16,185,129,0.05)' : 'rgba(59,130,246,0.04)',
                  minHeight: '100px', cursor: zipFile || loading ? 'default' : 'pointer',
                }}
                onDrop={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file?.name.endsWith('.zip')) { setZipFile(file); setZipName(file.name.replace(/\.zip$/, '')); }
                }}
                onDragOver={e => e.preventDefault()}
              >
                <input ref={fileInputRef} type="file" accept=".zip" className="hidden"
                  onChange={e => {
                    const f = e.target.files[0];
                    if (f) { setZipFile(f); setZipName(f.name.replace(/\.zip$/, '')); }
                  }} />
                {zipFile ? (
                  <>
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    <div className="text-center">
                      <p className="text-[13px] font-semibold text-emerald-300">{zipFile.name}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{(zipFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setZipFile(null); setZipName(''); }} className="text-[11px] transition-colors" style={{ color: 'var(--text-muted)' }}>Remove</button>
                  </>
                ) : (
                  <>
                    <Upload className="w-7 h-7" style={{ color: 'var(--accent)' }} />
                    <div className="text-center">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Drop ZIP here or tap to browse</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Max 100 MB · .zip files only</p>
                    </div>
                  </>
                )}
              </div>

              {zipFile && (
                <div className="mt-3 flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1 flex items-center rounded-xl px-3.5" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', height: '40px' }}>
                    <input value={zipName} onChange={e => setZipName(e.target.value)} placeholder="Repository name (optional)"
                      className="flex-1 bg-transparent outline-none text-[13px]" style={{ border: 'none', boxShadow: 'none', background: 'transparent' }} />
                  </div>
                  <button onClick={handleZipIngest} disabled={loading}
                    className="btn-primary text-white text-[13px] font-semibold px-5 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ height: '40px' }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {loading ? 'Indexing…' : 'Index ZIP'}
                  </button>
                </div>
              )}
            </>
          )}

          {statusMsg && (
            <div className="mt-3 flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              <Loader2 className="w-3 h-3 animate-spin text-blue-400 shrink-0" />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{statusMsg}</span>
            </div>
          )}
          {error && (
            <div className="mt-3 flex items-start gap-2 text-[12px] text-red-400">
              <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Repos section */}
      {repos.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 md:px-6 pb-10 md:pb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Indexed Repositories</h2>
            <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>{readyRepos.length} ready</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {repos.map(repo => {
              const shortName = repo.name.includes('/') ? repo.name.split('/').pop() : repo.name;
              const isReady    = repo.status === 'ready';
              const isIndexing = repo.status === 'indexing';
              return (
                <div key={repo._id} onClick={() => isReady && openRepo(repo)}
                  className="group rounded-xl p-4 transition-all duration-200"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', cursor: isReady ? 'pointer' : 'default', backdropFilter: 'blur(12px)' }}
                  onMouseEnter={e => { if (isReady) { e.currentTarget.style.border = '1px solid var(--accent-border)'; e.currentTarget.style.background = 'var(--card-bg-solid)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.border = '1px solid var(--border)'; e.currentTarget.style.background = 'var(--card-bg)'; }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[14px]"
                      style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--accent-bright)', fontFamily: "'Space Grotesk', sans-serif", border: '1px solid rgba(59,130,246,0.15)', minWidth: '36px' }}>
                      {shortName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={repo.status} />
                      {(isReady || repo.status === 'error') && (
                        <button onClick={e => handleReindex(e, repo._id)} title="Re-index repository"
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-blue-500/10"
                          style={{ color: 'var(--text-faint)' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}>
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={e => confirmDelete(e, repo)} title="Delete repository"
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-red-500/10"
                        style={{ color: 'var(--text-faint)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[13px] font-semibold truncate mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>{shortName}</p>
                  <p className="text-[10px] truncate mb-3" style={{ color: 'var(--text-faint)', fontFamily: "'IBM Plex Mono', monospace" }}>{repo.name}</p>
                  {isReady && (
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3">
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{(repo.totalFiles || 0).toLocaleString()} files</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>·</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{(repo.totalChunks || 0).toLocaleString()} chunks</span>
                      </div>
                      <ChevronRight className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    </div>
                  )}
                  {isIndexing && <div className="flex items-center gap-1.5 text-[11px] text-amber-400"><Loader2 className="w-3 h-3 animate-spin" /> Indexing…</div>}
                  {repo.status === 'error' && <p className="text-[11px] text-red-400 truncate">{repo.errorMessage || 'Indexing failed'}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 pb-16 md:pb-20">
        {repos.length === 0 && (
          <p className="text-center text-[12px] font-bold uppercase tracking-widest mb-6" style={{ color: 'var(--text-faint)' }}>What you can do</p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-xl p-3 md:p-4 card-glass">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center mb-2 md:mb-3"
                  style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: 'var(--accent-bright)' }} />
                </div>
                <p className="text-[12px] md:text-[13px] font-semibold mb-1" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>{f.title}</p>
                <p className="text-[10px] md:text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}