import { useState, useRef, useEffect } from 'react';
import {
  Send, RotateCcw, Sparkles, MessageSquare, History,
  Download, Copy, Check, ChevronLeft, ChevronRight, Clock
} from 'lucide-react';
import { queryRepo, getSessions } from '../../api/client';
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

export default function ChatWindow() {
  const [input, setInput]             = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions]       = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [copied, setCopied]           = useState(false);
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
      setLoadingSessions(true);
      getSessions(activeRepoId)
        .then(setSessions)
        .catch(() => {})
        .finally(() => setLoadingSessions(false));
    }
  }, [showHistory, activeRepoId]);

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
    <div className="flex h-full overflow-hidden">
      {/* Session history panel */}
      {showHistory && (
        <div
          className="shrink-0 flex flex-col overflow-hidden"
          style={{
            width: '240px',
            borderRight: '1px solid rgba(148,163,184,0.08)',
            background: 'rgba(6,8,16,0.95)',
          }}
        >
          <div
            className="px-4 py-3 shrink-0 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">History</span>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="text-slate-600 hover:text-slate-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-6 h-6 mx-auto mb-2 text-slate-700" />
                <p className="text-[11px] text-slate-600">No past sessions</p>
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session._id}
                  onClick={() => loadSession(session)}
                  className="w-full text-left p-3 rounded-xl mb-1 transition-all hover:bg-white/5 group"
                  style={{ border: '1px solid transparent' }}
                  onMouseEnter={e => e.currentTarget.style.border = '1px solid rgba(59,130,246,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}
                >
                  <p className="text-[12px] text-slate-300 truncate mb-1 font-medium">
                    {formatSessionPreview(session)}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-600">
                      {session.messages?.length || 0} messages
                    </span>
                    <span className="text-[10px] text-slate-700">
                      {formatSessionDate(session.updatedAt || session.createdAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex flex-col flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 md:px-5 py-3 shrink-0"
          style={{
            borderBottom:   '1px solid rgba(148,163,184,0.08)',
            background:     'rgba(8,11,20,0.8)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setShowHistory(v => !v)}
              title="Session history"
              className="p-1.5 rounded-lg transition-colors mr-1 shrink-0"
              style={{
                background: showHistory ? 'rgba(59,130,246,0.12)' : 'transparent',
                color: showHistory ? '#60a5fa' : '#475569',
              }}
            >
              {showHistory ? <ChevronLeft className="w-3.5 h-3.5" /> : <History className="w-3.5 h-3.5" />}
            </button>

            <MessageSquare className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-100 truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {activeRepo?.name?.includes('/') ? activeRepo.name.split('/').pop() : activeRepo?.name || 'Chat'}
              </p>
              {activeRepo && (
                <p className="text-[10px] text-slate-600 truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {(activeRepo.totalFiles || 0).toLocaleString()} files
                  {' · '}
                  {(activeRepo.totalChunks || 0).toLocaleString()} chunks
                </p>
              )}
            </div>
          </div>

          {messages.length > 0 && (
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={copyMarkdown}
                title="Copy"
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              <button
                onClick={exportMarkdown}
                title="Export"
                className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
              <button
                onClick={clearMessages}
                className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-300 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">New</span>
              </button>
            </div>
          )}
        </div>

        {/* Messages */}
        <div
          className="px-3 md:px-5 py-4 md:py-5 space-y-4 overflow-y-auto"
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
              <h3
                className="text-[14px] md:text-[15px] font-semibold text-slate-100 mb-1.5"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Ask anything about this codebase
              </h3>
              <p className="text-[12px] text-slate-500 mb-6 max-w-xs leading-relaxed">
                {activeRepoId
                  ? 'Questions are tailored to your detected tech stack and frameworks.'
                  : 'Select or index a repository first.'}
              </p>

              {activeRepoId && (
                <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                  {starters.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-[11px] md:text-[12px] text-slate-500 px-3 py-2.5 rounded-xl hover:text-slate-300 transition-all"
                      style={{ background: 'rgba(16,23,41,0.7)', border: '1px solid rgba(148,163,184,0.08)' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.border     = '1px solid rgba(59,130,246,0.2)';
                        e.currentTarget.style.background = 'rgba(59,130,246,0.06)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.border     = '1px solid rgba(148,163,184,0.08)';
                        e.currentTarget.style.background = 'rgba(16,23,41,0.7)';
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

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-start gap-2.5">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #2563eb, #0ea5e9)', minWidth: '24px' }}
              >
                AI
              </div>
              <div
                className="px-4 py-3 rounded-2xl rounded-tl-sm"
                style={{ background: 'rgba(16,23,41,0.8)', border: '1px solid rgba(148,163,184,0.08)' }}
              >
                <div className="flex gap-1.5 items-center h-4">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="typing-dot w-1.5 h-1.5 rounded-full inline-block"
                      style={{ background: '#60a5fa' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="px-3 md:px-4 py-2.5 md:py-3 shrink-0"
          style={{ borderTop: '1px solid rgba(148,163,184,0.08)' }}
        >
          <div
            className="flex gap-2 items-end rounded-xl px-3 py-2"
            style={{ background: 'rgba(16,23,41,0.9)', border: '1px solid rgba(148,163,184,0.12)' }}
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
              style={{ color: '#e2e8f0', caretColor: '#60a5fa', maxHeight: '120px', fontFamily: "'Manrope', sans-serif" }}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
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
          <p className="text-center text-[10px] text-slate-700 mt-1 hidden sm:block">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}