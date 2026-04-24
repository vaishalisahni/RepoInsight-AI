import { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw, Sparkles } from 'lucide-react';
import { queryRepo } from '../../api/client';
import useAppStore from '../../store/appStore';
import MessageBubble from './MessageBubble';

/* ── Default starters ─────────────────────────────────────────────────────── */
const DEFAULT_STARTERS = [
  'Where is authentication handled?',
  'Explain the main entry point',
  'What does the routing system do?',
  'List all API endpoints',
  'How is error handling implemented?',
  'What are the key data models?',
];

/* ── Framework-specific starters ─────────────────────────────────────────── */
const FRAMEWORK_STARTERS = {
  'React':          ['What React hooks are used?', 'How is state managed globally?', 'Explain the component hierarchy', 'How is routing handled?'],
  'Vue.js':         ['What Vuex/Pinia stores exist?', 'Explain the component structure', 'How are Vue composables used?', 'What plugins are registered?'],
  'Next.js':        ['What pages and API routes exist?', 'How does SSR/SSG work here?', 'Where are middleware applied?', 'How is auth handled with Next?'],
  'Nuxt.js':        ['What Nuxt modules are used?', 'Explain the page structure', 'How does Nuxt composable work here?', 'What plugins are configured?'],
  'Svelte':         ['How are Svelte stores used?', 'Explain the component layout', 'What actions are defined?', 'How is routing set up?'],
  'SvelteKit':      ['What load functions are defined?', 'Explain the routing structure', 'How is form actions used?', 'Where is auth handled?'],
  'Angular':        ['What NgModules are declared?', 'Explain the service layer', 'How are routes configured?', 'What guards protect routes?'],
  'Express':        ['What middleware chain is set up?', 'List all routes and handlers', 'How is error handling configured?', 'What auth strategy is used?'],
  'Fastify':        ['What plugins are registered?', 'Explain the hook lifecycle', 'How are schemas validated?', 'What routes exist?'],
  'NestJS':         ['What modules exist?', 'How are DTOs validated?', 'Explain the guard/interceptor setup', 'What decorators are used?'],
  'Django':         ['What models are defined?', 'Explain the URL routing', 'What middleware is used?', 'How are views structured?'],
  'Flask':          ['What blueprints are registered?', 'How is Flask-SQLAlchemy used?', 'Explain the auth flow', 'What extensions are loaded?'],
  'FastAPI':        ['What Pydantic models are defined?', 'How are dependencies injected?', 'Explain the router structure', 'What middleware is applied?'],
  'Ruby on Rails':  ['What ActiveRecord models exist?', 'Explain the controller structure', 'How are routes configured?', 'What concerns are shared?'],
  'Laravel':        ['What Eloquent models exist?', 'Explain the middleware pipeline', 'How are service providers set up?', 'What facades are used?'],
  'Spring Boot':    ['What REST controllers exist?', 'Explain the service layer', 'How is Spring Security configured?', 'What JPA entities are defined?'],
  'Gin':            ['What route groups are defined?', 'How is middleware applied?', 'Explain the handler structure', 'How are models bound?'],
  'Fiber':          ['What Fiber middleware is used?', 'Explain the routing setup', 'How are errors handled?', 'What hooks are registered?'],
  'Actix Web':      ['What actors are defined?', 'Explain the handler functions', 'How is state shared?', 'What middleware is applied?'],
  'MongoDB/Mongoose':['What schemas/models are defined?', 'How are queries structured?', 'What indexes are created?', 'How are virtuals used?'],
  'PostgreSQL':     ['What SQL queries exist?', 'How is connection pooling handled?', 'What migrations are defined?', 'Are transactions used?'],
  'Prisma':         ['What Prisma schema models exist?', 'How are relations modeled?', 'Explain the seed file', 'What queries are used?'],
  'GraphQL':        ['What types are defined?', 'Explain the resolver structure', 'How are mutations handled?', 'What subscriptions exist?'],
  'Docker':         ['What services are in docker-compose?', 'How are environment variables passed?', 'What volumes are mounted?', 'Explain the network setup?'],
  'Kubernetes':     ['What deployments are defined?', 'How are services exposed?', 'What ConfigMaps/Secrets exist?', 'Explain the ingress rules?'],
  'Frappe Framework':['What DocTypes are defined?', 'How are Server Scripts used?', 'What hooks are registered?', 'Explain the permission model?'],
  'Frappe/ERPNext': ['What custom DocTypes exist?', 'How are Frappe controllers used?', 'What scheduled jobs run?', 'How is data validated?'],
  'Flutter/Dart':   ['What widgets are defined?', 'How is state managed?', 'Explain the navigation setup', 'What services are injected?'],
  'Elixir/Mix':     ['What GenServers are defined?', 'Explain the supervision tree', 'What Phoenix contexts exist?', 'How are Ecto schemas defined?'],
  'Tailwind CSS':   ['What custom theme tokens exist?', 'How are utility classes extended?', 'What plugins are added?', 'Are custom components defined?'],
};

/* ── Category starters ────────────────────────────────────────────────────── */
const CATEGORY_STARTERS = {
  database: ['What database schema is used?', 'How are migrations run?', 'What indexes are defined?'],
  testing:  ['How are unit tests structured?', 'What testing utilities exist?', 'How is mocking done?'],
  infra:    ['How is the app deployed?', 'What environment variables are needed?', 'How is scaling handled?'],
  ci:       ['What CI steps run on PR?', 'How are deployments triggered?', 'What secrets are needed?'],
  ml:       ['What models are trained?', 'How is data preprocessed?', 'What metrics are tracked?'],
};

function buildStarters(repo) {
  if (!repo) return DEFAULT_STARTERS;

  const starters = new Set();
  const frameworks = repo.techStack?.frameworks || [];

  // Add framework-specific starters first
  for (const fw of frameworks) {
    const fwStarters = FRAMEWORK_STARTERS[fw.name];
    if (fwStarters) fwStarters.forEach(s => starters.add(s));
    const catStarters = CATEGORY_STARTERS[fw.category];
    if (catStarters) catStarters.forEach(s => starters.add(s));
    if (starters.size >= 8) break;
  }

  // Fill with defaults if not enough
  DEFAULT_STARTERS.forEach(s => starters.add(s));

  return [...starters].slice(0, 6);
}

/* ── Component ────────────────────────────────────────────────────────────── */
export default function ChatWindow() {
  const [input, setInput] = useState('');
  const bottomRef         = useRef(null);
  const textareaRef       = useRef(null);
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
    addMessage({ role: 'user', content: question });
    setLoading(true);

    try {
      const data = await queryRepo(activeRepoId, question, sessionId);
      addMessage({ role: 'assistant', content: data.answer, sources: data.sources });
      setSessionId(data.sessionId);
    } catch (err) {
      addMessage({
        role: 'assistant',
        content: `⚠️ **Error:** ${err.response?.data?.error || err.message}`,
      });
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
        className="flex items-center justify-between px-5 py-3 border-b shrink-0"
        style={{ borderColor:'rgba(124,127,245,0.1)', background:'rgba(13,11,30,0.6)' }}
      >
        <div>
          <p className="text-sm font-semibold text-white">
            {activeRepo?.name?.includes('/')
              ? activeRepo.name.split('/').pop()
              : activeRepo?.name || 'Chat'}
          </p>
          {activeRepo && (
            <p className="text-[10px] text-[#4a476a] font-mono">
              {activeRepo.totalFiles} files · {activeRepo.totalChunks} chunks
              {activeRepo.techStack?.primaryLanguage && ` · ${activeRepo.techStack.primaryLanguage}`}
            </p>
          )}
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="flex items-center gap-1.5 text-xs text-[#4a476a] hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
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
              className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center"
              style={{ background:'rgba(92,91,232,0.1)', border:'1px solid rgba(92,91,232,0.2)' }}
            >
              <Sparkles className="w-7 h-7 text-ink-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1.5">
              Ask anything about your codebase
            </h3>
            <p className="text-xs text-[#4a476a] mb-6 max-w-xs">
              {activeRepoId
                ? 'Questions are tailored to your detected tech stack.'
                : 'Select or index a repository first to get started.'}
            </p>

            {activeRepoId && (
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {starters.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-[11px] text-[#8b88a6] px-3 py-2.5 rounded-lg hover:text-ink-400 transition-colors"
                    style={{ background:'rgba(19,17,40,0.8)', border:'1px solid rgba(124,127,245,0.08)' }}
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
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-ink-500 to-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[9px] font-bold text-white">AI</span>
            </div>
            <div
              className="px-4 py-3 rounded-2xl rounded-tl-sm"
              style={{ background:'rgba(19,17,40,0.8)', border:'1px solid rgba(124,127,245,0.1)' }}
            >
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <span key={i} className={`typing-dot w-1.5 h-1.5 rounded-full bg-ink-400 inline-block`} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 shrink-0 border-t" style={{ borderColor:'rgba(124,127,245,0.1)' }}>
        <div
          className="flex gap-2 items-end rounded-xl px-3 py-2"
          style={{ background:'rgba(19,17,40,0.9)', border:'1px solid rgba(124,127,245,0.15)' }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={activeRepoId ? 'Ask about your codebase…' : 'Select a repository first'}
            disabled={!activeRepoId}
            rows={1}
            style={{ resize:'none', maxHeight:'120px' }}
            className="flex-1 bg-transparent text-[#e8e6f0] placeholder-[#2e2a55] outline-none text-sm py-0.5 font-sans"
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || !activeRepoId || isLoading}
            className="btn-primary text-white rounded-lg p-2 flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-center text-[10px] text-[#2e2a55] mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}