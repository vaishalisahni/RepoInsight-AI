import { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw, Sparkles, MessageSquare } from 'lucide-react';
import { queryRepo } from '../../api/client';
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

export default function ChatWindow() {
  const [input, setInput] = useState('');
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const {
    messages, activeRepoId, activeRepo, sessionId, isLoading,
    addMessage, setSessionId, setLoading, clearMessages,
  } = useAppStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      addMessage({ role: 'assistant', content: `⚠️ **Error:** ${err.response?.data?.error || err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', background: 'rgba(8,11,20,0.7)', backdropFilter: 'blur(10px)' }}
      >
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-[13px] font-semibold text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {activeRepo?.name?.includes('/') ? activeRepo.name.split('/').pop() : activeRepo?.name || 'Chat'}
            </p>
            {activeRepo && (
              <p className="text-[10px] text-slate-600" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {(activeRepo.totalFiles || 0).toLocaleString()} files · {(activeRepo.totalChunks || 0).toLocaleString()} chunks
                {activeRepo.techStack?.primaryLanguage && ` · ${activeRepo.techStack.primaryLanguage}`}
              </p>
            )}
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> New chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div
              className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <h3
              className="text-[15px] font-semibold text-slate-100 mb-1.5"
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
                    className="text-left text-[12px] text-slate-500 px-3 py-2.5 rounded-xl hover:text-slate-300 transition-all"
                    style={{
                      background: 'rgba(16,23,41,0.7)',
                      border: '1px solid rgba(148,163,184,0.08)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.border = '1px solid rgba(59,130,246,0.2)';
                      e.currentTarget.style.background = 'rgba(59,130,246,0.06)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.border = '1px solid rgba(148,163,184,0.08)';
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
                  <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#60a5fa' }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        className="p-4 shrink-0"
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
            style={{
              color: '#e2e8f0',
              caretColor: '#60a5fa',
              maxHeight: '120px',
              fontFamily: "'Manrope', sans-serif",
            }}
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
        <p className="text-center text-[10px] text-slate-700 mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}