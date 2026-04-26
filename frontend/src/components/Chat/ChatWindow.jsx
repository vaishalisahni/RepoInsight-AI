import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, RotateCcw, Sparkles, MessageSquare, History,
  Download, Copy, Check, ChevronLeft, Clock, Trash2, X,
  AlertTriangle, Zap, Pencil, CheckCheck, AlertCircle
} from 'lucide-react';
import { getSessions } from '../../api/client';
import api from '../../api/client';
import useAppStore from '../../store/appStore';
import MessageBubble from './MessageBubble';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Token budget config (approximate — adjust to match your backend limits)
const MAX_TOKENS = 4096;
const WARN_THRESHOLD = 0.75; // warn at 75% used

const DEFAULT_STARTERS = [
  'Where is authentication handled?',
  'Explain the main entry point',
  'What does the routing system do?',
  'List all API endpoints',
  'How is error handling implemented?',
  'What are the key data models?',
];

const FRAMEWORK_STARTERS = {
  'React':     ['What hooks are used?', 'How is state managed?', 'Explain component hierarchy', 'How is routing done?'],
  'Next.js':   ['What pages exist?', 'How does SSR work here?', 'Where is auth handled?', 'What API routes exist?'],
  'Express':   ['What middleware runs?', 'List all routes', 'How is auth set up?', 'How are errors handled?'],
  'NestJS':    ['What modules exist?', 'How are DTOs validated?', 'What guards protect routes?', 'Explain the service layer'],
  'Django':    ['What models are defined?', 'Explain URL routing', 'What middleware is used?', 'How are views structured?'],
  'FastAPI':   ['What Pydantic models exist?', 'How are dependencies injected?', 'What middleware is applied?', 'Explain the router'],
  'Vue.js':    ['What stores exist?', 'Explain component structure', 'How are composables used?', 'What plugins are registered?'],
  'MongoDB/Mongoose': ['What schemas are defined?', 'How are queries structured?', 'What indexes are created?'],
  'Prisma':    ['What models are in schema?', 'How are relations modeled?', 'What queries are used?'],
  'Docker':    ['What services are in compose?', 'How are env vars passed?', 'What volumes are mounted?'],
};

function buildStarters(repo) {
  if (!repo) return DEFAULT_STARTERS;
  const starters = new Set();
  for (const fw of (repo.techStack?.frameworks || [])) {
    (FRAMEWORK_STARTERS[fw.name] || []).forEach(s => starters.add(s));
    if (starters.size >= 6) break;
  }
  DEFAULT_STARTERS.forEach(s => starters.add(s));
  return [...starters].slice(0, 6);
}

function formatSessionPreview(session) {
  return session.title || session.messages?.find(m => m.role === 'user')?.content?.slice(0, 50) || 'Empty session';
}

function formatSessionDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function ConfirmModal({ isOpen, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
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
      style={{ background: 'var(--modal-overlay)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'var(--card-bg-solid)',
          border: '1px solid var(--border)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
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
            style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', boxShadow: '0 0 16px rgba(239,68,68,0.25)' }}
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

// ── Token Budget Bar ─────────────────────────────────────────────────────────
function TokenBudgetBar({ tokensUsed, maxTokens }) {
  if (!tokensUsed) return null;
  const pct = Math.min(tokensUsed / maxTokens, 1);
  const isWarn = pct >= WARN_THRESHOLD;
  const isCrit = pct >= 0.9;
  const color = isCrit ? '#ef4444' : isWarn ? '#f59e0b' : '#3b82f6';
  const remaining = maxTokens - tokensUsed;

  return (
    <div className="flex items-center gap-2 px-3 py-1" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-300)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-mono shrink-0 tabular-nums" style={{ color: isCrit ? '#ef4444' : 'var(--text-faint)' }}>
        {isCrit ? (
          <span className="flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5" />
            {remaining.toLocaleString()} left
          </span>
        ) : (
          `~${remaining.toLocaleString()} tokens left`
        )}
      </span>
    </div>
  );
}

// ── Session Title Editor ──────────────────────────────────────────────────────
function SessionTitleEditor({ sessionId, currentTitle, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(currentTitle || '');
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setVal(currentTitle || ''); }, [currentTitle]);

  const save = async () => {
    const trimmed = val.trim();
    if (!trimmed || trimmed === currentTitle) { setEditing(false); return; }
    try {
      await api.patch(`/query/sessions/${sessionId}/title`, { title: trimmed });
      onSaved(trimmed);
    } catch (_) {}
    setEditing(false);
  };

  if (!sessionId) return null;

  if (editing) {
    return (
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <input
          ref={inputRef}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          onBlur={save}
          className="flex-1 text-[13px] font-semibold px-2 py-0.5 rounded-lg outline-none min-w-0"
          style={{
            background: 'var(--bg-200)',
            border: '1px solid var(--accent-border)',
            color: 'var(--text-primary)',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
          maxLength={80}
        />
        <button onClick={save} className="p-1 rounded" style={{ color: 'var(--accent)' }}>
          <CheckCheck className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Rename session"
      className="flex items-center gap-1.5 group min-w-0 flex-1"
    >
      <span className="text-[13px] font-semibold truncate" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>
        {val || 'Chat'}
      </span>
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" style={{ color: 'var(--text-muted)' }} />
    </button>
  );
}

export default function ChatWindow() {
  const [input, setInput]             = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions]       = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [copied, setCopied]           = useState(false);
  const [streaming, setStreaming]     = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, sessionId: null });
  const [tokensUsed, setTokensUsed]   = useState(0);
  const [sessionTitle, setSessionTitle] = useState('');

  const bottomRef     = useRef(null);
  const textareaRef   = useRef(null);
  const abortRef      = useRef(null);

  const {
    messages, activeRepoId, activeRepo, sessionId, isLoading,
    addMessage, setSessionId, setLoading, clearMessages,
    pendingQuestion, clearPendingQuestion,
  } = useAppStore();

  // Estimate tokens from message content (rough: 4 chars ≈ 1 token)
  useEffect(() => {
    const totalChars = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
    setTokensUsed(Math.round(totalChars / 4));
  }, [messages]);

  useEffect(() => {
    if (pendingQuestion) {
      setInput(pendingQuestion);
      clearPendingQuestion();
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [pendingQuestion, clearPendingQuestion]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streaming]);

  useEffect(() => {
    if (showHistory && activeRepoId) fetchSessions();
  }, [showHistory, activeRepoId]);

  // Sync session title when sessionId changes
  useEffect(() => {
    if (sessionId && sessions.length) {
      const s = sessions.find(s => s._id === sessionId);
      if (s) setSessionTitle(s.title || '');
    }
  }, [sessionId, sessions]);

  const fetchSessions = () => {
    setLoadingSessions(true);
    getSessions(activeRepoId)
      .then(data => { setSessions(data); })
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
  };

  const starters = buildStarters(activeRepo);

  // ── SSE Streaming ─────────────────────────────────────────────────────────
  const sendStream = useCallback(async (question) => {
    if (!question || !activeRepoId || isLoading) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    addMessage({ role: 'user', content: question });
    setLoading(true);
    setStreaming(true);

    let assistantContent = '';
    let assistantSources = [];
    let newSessionId = sessionId;

    addMessage({ role: 'assistant', content: '', sources: [], _streaming: true });

    try {
      const response = await fetch(`${BASE_URL}/api/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ repoId: activeRepoId, question, sessionId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Stream failed' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      abortRef.current = reader;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.token) {
              assistantContent += data.token;
              useAppStore.setState(state => {
                const msgs = [...state.messages];
                const lastIdx = msgs.map(m => m.role).lastIndexOf('assistant');
                if (lastIdx !== -1) {
                  msgs[lastIdx] = { ...msgs[lastIdx], content: assistantContent, _streaming: true };
                }
                return { messages: msgs };
              });
            }

            if (data.done) {
              assistantSources = data.sources || [];
              newSessionId = data.sessionId || newSessionId;
              useAppStore.setState(state => {
                const msgs = [...state.messages];
                const lastIdx = msgs.map(m => m.role).lastIndexOf('assistant');
                if (lastIdx !== -1) {
                  msgs[lastIdx] = {
                    role: 'assistant',
                    content: assistantContent,
                    sources: assistantSources,
                    _streaming: false,
                  };
                }
                return { messages: msgs };
              });
            }

            if (data.error) throw new Error(data.error);
          } catch (_) {}
        }
      }

      if (newSessionId) {
        setSessionId(newSessionId);
        // Refresh sessions list to pick up new/updated title
        if (activeRepoId) {
          getSessions(activeRepoId).then(setSessions).catch(() => {});
        }
      }

    } catch (err) {
      useAppStore.setState(state => {
        const msgs = [...state.messages];
        const lastIdx = msgs.map(m => m.role).lastIndexOf('assistant');
        if (lastIdx !== -1 && msgs[lastIdx]._streaming) {
          msgs[lastIdx] = {
            role: 'assistant',
            content: `⚠️ **Error:** ${err.message}`,
            sources: [],
          };
        }
        return { messages: msgs };
      });
    } finally {
      setLoading(false);
      setStreaming(false);
      abortRef.current = null;
    }
  }, [activeRepoId, sessionId, isLoading, addMessage, setLoading, setSessionId]);

  const send = useCallback(async (text) => {
    const question = (text || input).trim();
    if (!question || !activeRepoId || isLoading) return;
    await sendStream(question);
  }, [input, activeRepoId, isLoading, sendStream]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const cancelStream = () => {
    if (abortRef.current) {
      try { abortRef.current.cancel(); } catch (_) {}
      abortRef.current = null;
    }
    setLoading(false);
    setStreaming(false);
  };

  const deleteSession = async (sid) => {
    try {
      await api.delete(`/query/sessions/${sid}`);
      setSessions(prev => prev.filter(s => s._id !== sid));
      if (sessionId === sid) { clearMessages(); setSessionTitle(''); }
    } catch (_) {}
  };

  const clearAllSessions = async () => {
    try {
      await api.delete(`/query/sessions/repo/${activeRepoId}`);
      setSessions([]);
      clearMessages();
      setSessionTitle('');
    } catch (_) {}
  };

  const handleConfirm = async () => {
    const { type, sessionId: sid } = confirmModal;
    setConfirmModal({ open: false, type: null, sessionId: null });
    if (type === 'single') await deleteSession(sid);
    else if (type === 'all') await clearAllSessions();
  };

  const exportMarkdown = () => {
    if (!messages.length) return;
    const lines = messages.map(m => {
      const role = m.role === 'user' ? '## 👤 You' : '## 🤖 RepoInsight';
      const sources = m.sources?.length
        ? '\n\n**Sources:** ' + m.sources.slice(0, 5).map(s => `\`${s.filePath}${s.startLine ? `:${s.startLine}` : ''}\``).join(', ')
        : '';
      return `${role}\n\n${m.content}${sources}`;
    });
    const md = `# Chat Export — ${activeRepo?.name || 'Repository'}\n\n${new Date().toLocaleString()}\n\n---\n\n${lines.join('\n\n---\n\n')}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repoinsight-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyMarkdown = async () => {
    if (!messages.length) return;
    const lines = messages.map(m => {
      const role = m.role === 'user' ? '**You:**' : '**RepoInsight:**';
      return `${role}\n\n${m.content}`;
    });
    await navigator.clipboard.writeText(lines.join('\n\n---\n\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadSession = (session) => {
    clearMessages();
    session.messages.forEach(m => addMessage({ role: m.role, content: m.content, sources: m.sources }));
    setSessionId(session._id);
    setSessionTitle(session.title || '');
    setShowHistory(false);
  };

  return (
    <>
      <ConfirmModal
        isOpen={confirmModal.open}
        title={confirmModal.type === 'all' ? 'Clear all history?' : 'Delete session?'}
        message={
          confirmModal.type === 'all'
            ? 'All chat sessions for this repository will be permanently deleted. This cannot be undone.'
            : 'This chat session will be permanently deleted. This cannot be undone.'
        }
        confirmLabel={confirmModal.type === 'all' ? 'Clear All' : 'Delete'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmModal({ open: false, type: null, sessionId: null })}
      />

      <div className="flex h-full overflow-hidden">
        {/* Session history panel */}
        {showHistory && (
          <div
            className="shrink-0 flex flex-col overflow-hidden"
            style={{ width: '230px', borderRight: '1px solid var(--border)', background: 'var(--sidebar-bg)' }}
          >
            <div className="px-3 py-3 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>History</span>
              </div>
              <div className="flex items-center gap-1">
                {sessions.length > 0 && (
                  <button
                    onClick={() => setConfirmModal({ open: true, type: 'all', sessionId: null })}
                    title="Clear all history"
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
                  <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>No past sessions</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session._id} className="group relative mb-1">
                    <button
                      onClick={() => loadSession(session)}
                      className="w-full text-left p-3 rounded-xl transition-all"
                      style={{
                        border: '1px solid transparent',
                        background: sessionId === session._id ? 'rgba(59,130,246,0.08)' : 'transparent',
                        borderColor: sessionId === session._id ? 'rgba(59,130,246,0.15)' : 'transparent',
                      }}
                      onMouseEnter={e => { if (sessionId !== session._id) { e.currentTarget.style.border = '1px solid var(--border)'; e.currentTarget.style.background = 'var(--bg-100)'; } }}
                      onMouseLeave={e => { if (sessionId !== session._id) { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.background = 'transparent'; } }}
                    >
                      <p className="text-[12px] truncate mb-1 font-medium pr-5" style={{ color: 'var(--text-secondary)' }}>
                        {formatSessionPreview(session)}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{session.messages?.length || 0} messages</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{formatSessionDate(session.updatedAt || session.createdAt)}</span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmModal({ open: true, type: 'single', sessionId: session._id }); }}
                      title="Delete session"
                      className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-lg"
                      style={{ color: 'var(--text-muted)', background: 'var(--bg-50)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--bg-50)'; }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Main chat area */}
        <div className="flex flex-col flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 md:px-5 py-2.5 shrink-0"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--navbar-bg)', backdropFilter: 'blur(10px)', minHeight: '48px' }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                onClick={() => setShowHistory(v => !v)}
                title={showHistory ? 'Hide history' : 'Chat history'}
                className="p-1.5 rounded-lg transition-colors shrink-0"
                style={{ background: showHistory ? 'rgba(59,130,246,0.12)' : 'transparent', color: showHistory ? '#60a5fa' : 'var(--text-muted)' }}
              >
                <History className="w-3.5 h-3.5" />
              </button>
              <MessageSquare className="w-4 h-4 text-blue-400 shrink-0" />

              {/* Editable session title */}
              <div className="min-w-0 flex-1">
                {sessionId ? (
                  <SessionTitleEditor
                    sessionId={sessionId}
                    currentTitle={sessionTitle}
                    onSaved={(t) => {
                      setSessionTitle(t);
                      setSessions(prev => prev.map(s => s._id === sessionId ? { ...s, title: t } : s));
                    }}
                  />
                ) : (
                  <p className="text-[13px] font-semibold truncate" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>
                    {activeRepo?.name?.includes('/') ? activeRepo.name.split('/').pop() : activeRepo?.name || 'Chat'}
                  </p>
                )}
              </div>

              {/* Streaming indicator */}
              {streaming && (
                <span
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}
                >
                  <Zap className="w-2.5 h-2.5" />
                  streaming
                </span>
              )}
            </div>

            {messages.length > 0 && (
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={copyMarkdown}
                  className="flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ color: copied ? '#34d399' : 'var(--text-muted)' }}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
                <button
                  onClick={exportMarkdown}
                  className="hidden sm:flex items-center gap-1.5 text-[11px] px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Download className="w-3 h-3" />
                </button>
                <button
                  onClick={clearMessages}
                  title="Clear current chat"
                  className="flex items-center gap-1 text-[12px] px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Token budget bar */}
          <TokenBudgetBar tokensUsed={tokensUsed} maxTokens={MAX_TOKENS} />

          {/* Messages */}
          <div
            className="px-3 md:px-5 py-4 space-y-4 overflow-y-auto"
            style={{ flex: '1 1 0', minHeight: 0, WebkitOverflowScrolling: 'touch' }}
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div
                  className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center"
                  style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
                >
                  <Sparkles className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-[14px] md:text-[15px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>
                  Ask anything about this codebase
                </h3>
                <p className="text-[12px] mb-5 max-w-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {activeRepoId ? 'Questions are tailored to your detected tech stack.' : 'Select or index a repository first.'}
                </p>
                {activeRepoId && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                    {starters.map(s => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left text-[11px] md:text-[12px] px-3 py-2.5 rounded-xl transition-all"
                        style={{ background: 'var(--bg-100)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(59,130,246,0.2)'; e.currentTarget.style.background = 'rgba(59,130,246,0.06)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.border = '1px solid var(--border)'; e.currentTarget.style.background = 'var(--bg-100)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}

            {isLoading && !streaming && (
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #0ea5e9)', minWidth: '24px' }}>
                  AI
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: 'var(--bg-100)', border: '1px solid var(--border)' }}>
                  <div className="flex gap-1.5 items-center h-4">
                    {[0,1,2].map(i => (
                      <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#60a5fa' }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="shrink-0 px-3 md:px-4 py-2.5 md:py-3"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--navbar-bg)', paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
          >
            <div
              className="flex gap-2 items-end rounded-xl px-3 py-2"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border-hover)' }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={activeRepoId ? 'Ask about your codebase…' : 'Select a repository first'}
                disabled={!activeRepoId || isLoading}
                rows={1}
                className="flex-1 bg-transparent outline-none text-[14px] py-0.5 resize-none"
                style={{ color: 'var(--text-primary)', caretColor: '#60a5fa', maxHeight: '100px', fontFamily: "'Manrope', sans-serif", minHeight: '24px', border: 'none', boxShadow: 'none' }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                }}
              />
              {streaming && (
                <button
                  onClick={cancelStream}
                  className="flex-shrink-0 p-2 rounded-lg transition-all text-red-400 hover:bg-red-500/10"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => send()}
                disabled={!input.trim() || !activeRepoId || isLoading}
                className="btn-primary text-white rounded-lg p-2 flex-shrink-0 transition-all"
                style={{ opacity: (!input.trim() || !activeRepoId || isLoading) ? 0.3 : 1 }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-center text-[10px] mt-1 hidden sm:block" style={{ color: 'var(--text-faint)' }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </>
  );
}