import { useState, useRef, useEffect } from 'react';
import {
  Send, RotateCcw, Sparkles, MessageSquare, History,
  Download, Copy, Check, ChevronLeft, Clock, Trash2, X,
  AlertTriangle
} from 'lucide-react';
import { queryRepo, getSessions } from '../../api/client';
import api from '../../api/client';
import useAppStore from '../../store/appStore';
import MessageBubble from './MessageBubble';

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
  const first = session.messages?.find(m => m.role === 'user');
  return first?.content?.slice(0, 50) || 'Empty session';
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

// ── Confirm modal (same pattern as Home.jsx) ────────────────────────────────
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
          <button
            onClick={onCancel}
            className="p-1 rounded-lg transition-colors shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div
          className="px-5 py-4 flex items-center justify-end gap-2"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
            style={{
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              background: 'transparent',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-100)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #dc2626, #ef4444)',
              boxShadow: '0 0 16px rgba(239,68,68,0.25)',
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

export default function ChatWindow() {
  const [input, setInput]             = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions]       = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [copied, setCopied]           = useState(false);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, sessionId: null });

  const bottomRef     = useRef(null);
  const textareaRef   = useRef(null);
  const {
    messages, activeRepoId, activeRepo, sessionId, isLoading,
    addMessage, setSessionId, setLoading, clearMessages,
  } = useAppStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (showHistory && activeRepoId) {
      fetchSessions();
    }
  }, [showHistory, activeRepoId]);

  const fetchSessions = () => {
    setLoadingSessions(true);
    getSessions(activeRepoId)
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
  };

  const starters = buildStarters(activeRepo);

  const send = async (text) => {
    const question = (text || input).trim();
    if (!question || !activeRepoId || isLoading) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    addMessage({ role: 'user', content: question });
    setLoading(true);

    try {
      const data = await queryRepo(activeRepoId, question, sessionId);
      addMessage({ role: 'assistant', content: data.answer, sources: data.sources });
      setSessionId(data.sessionId);
    } catch (err) {
      addMessage({
        role:    'assistant',
        content: `⚠️ **Error:** ${err.response?.data?.error || err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // ── Delete a single session ───────────────────────────────────────────────
  const deleteSession = async (sid) => {
    try {
      await api.delete(`/query/sessions/${sid}`);
      setSessions(prev => prev.filter(s => s._id !== sid));
      // If the deleted session is the current one, clear chat
      if (sessionId === sid) {
        clearMessages();
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  // ── Clear ALL sessions for this repo ─────────────────────────────────────
  const clearAllSessions = async () => {
    try {
      await api.delete(`/query/sessions/repo/${activeRepoId}`);
      setSessions([]);
      clearMessages();
    } catch (err) {
      console.error('Failed to clear all sessions:', err);
    }
  };

  const handleConfirm = async () => {
    const { type, sessionId: sid } = confirmModal;
    setConfirmModal({ open: false, type: null, sessionId: null });
    if (type === 'single') {
      await deleteSession(sid);
    } else if (type === 'all') {
      await clearAllSessions();
    }
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
    setShowHistory(false);
  };

  return (
    <>
      {/* Confirm modal */}
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
            style={{
              width: '230px',
              borderRight: '1px solid var(--border)',
              background: 'var(--sidebar-bg)',
            }}
          >
            <div
              className="px-3 py-3 shrink-0 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  History
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Clear all button */}
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
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
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
                  <div
                    key={session._id}
                    className="group relative mb-1"
                  >
                    <button
                      onClick={() => loadSession(session)}
                      className="w-full text-left p-3 rounded-xl transition-all"
                      style={{
                        border: '1px solid transparent',
                        background: sessionId === session._id ? 'rgba(59,130,246,0.08)' : 'transparent',
                        borderColor: sessionId === session._id ? 'rgba(59,130,246,0.15)' : 'transparent',
                      }}
                      onMouseEnter={e => {
                        if (sessionId !== session._id) {
                          e.currentTarget.style.border = '1px solid var(--border)';
                          e.currentTarget.style.background = 'var(--bg-100)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (sessionId !== session._id) {
                          e.currentTarget.style.border = '1px solid transparent';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <p className="text-[12px] truncate mb-1 font-medium pr-5" style={{ color: 'var(--text-secondary)' }}>
                        {formatSessionPreview(session)}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                          {session.messages?.length || 0} messages
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                          {formatSessionDate(session.updatedAt || session.createdAt)}
                        </span>
                      </div>
                    </button>

                    {/* Per-session delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmModal({ open: true, type: 'single', sessionId: session._id });
                      }}
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
            style={{
              borderBottom:   '1px solid var(--border)',
              background:     'var(--navbar-bg)',
              backdropFilter: 'blur(10px)',
              minHeight: '48px',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setShowHistory(v => !v)}
                title={showHistory ? "Hide history" : "Chat history"}
                className="p-1.5 rounded-lg transition-colors shrink-0"
                style={{
                  background: showHistory ? 'rgba(59,130,246,0.12)' : 'transparent',
                  color: showHistory ? '#60a5fa' : 'var(--text-muted)',
                }}
              >
                <History className="w-3.5 h-3.5" />
              </button>
              <MessageSquare className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold truncate" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>
                  {activeRepo?.name?.includes('/') ? activeRepo.name.split('/').pop() : activeRepo?.name || 'Chat'}
                </p>
              </div>
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
                        style={{
                          background: 'var(--bg-100)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.border = '1px solid rgba(59,130,246,0.2)';
                          e.currentTarget.style.background = 'rgba(59,130,246,0.06)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.border = '1px solid var(--border)';
                          e.currentTarget.style.background = 'var(--bg-100)';
                          e.currentTarget.style.color = 'var(--text-muted)';
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}

            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #0ea5e9)', minWidth: '24px' }}>
                  AI
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm"
                  style={{ background: 'var(--bg-100)', border: '1px solid var(--border)' }}>
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
            style={{
              borderTop: '1px solid var(--border)',
              background: 'var(--navbar-bg)',
              paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
            }}
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
                disabled={!activeRepoId}
                rows={1}
                className="flex-1 bg-transparent outline-none text-[14px] py-0.5 resize-none"
                style={{ color: 'var(--text-primary)', caretColor: '#60a5fa', maxHeight: '100px', fontFamily: "'Manrope', sans-serif", minHeight: '24px', border: 'none', boxShadow: 'none' }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                }}
              />
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