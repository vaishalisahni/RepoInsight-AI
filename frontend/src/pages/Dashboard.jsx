import { useEffect, useState, useCallback } from 'react';
import Sidebar         from '../components/Sidebar';
import ChatWindow      from '../components/Chat/ChatWindow';
import DependencyGraph from '../components/Graph/DependencyGraph';
import TracePanel      from '../components/Panel/TracePanel';
import ImpactPanel     from '../components/Panel/ImpactPanel';
import RepoSummary     from '../components/Panel/RepoSummary';
import TechStackBadge  from '../components/TechStack/TechStackBadge';
import CodeViewerModal from '../components/Chat/CodeViewerModal';
import useAppStore     from '../store/appStore';
import { getGraph, explainFile }    from '../api/client';
import {
  Loader2, AlertCircle, GitBranch, MessageSquare,
  Activity, Zap, BookOpen, FolderOpen, FileCode,
  ChevronRight, Sparkles, Search, Code2, BarChart2,
  ArrowRight, X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MOBILE_TABS = [
  { id: 'repos',    icon: BookOpen,      label: 'Repos'   },
  { id: 'chat',     icon: MessageSquare, label: 'Chat'    },
  { id: 'graph',    icon: GitBranch,     label: 'Graph'   },
  { id: 'trace',    icon: Activity,      label: 'Trace'   },
  { id: 'impact',   icon: Zap,           label: 'Impact'  },
  { id: 'explorer', icon: FolderOpen,    label: 'Files'   },
];

function getExtColor(ext) {
  const map = {
    js: '#f7df1e', jsx: '#61dafb', ts: '#3178c6', tsx: '#61dafb',
    py: '#3572a5', go: '#00add8', rs: '#de3522', java: '#b07219',
    rb: '#701516', php: '#4f5d95', css: '#563d7c', scss: '#c6538c',
    html: '#e34c26', json: '#6b7280', md: '#083fa1', sh: '#89e051',
    yml: '#cb171e', yaml: '#cb171e', toml: '#9c4221', sql: '#e38d44',
  };
  return map[ext] || '#6b7280';
}

function getLanguageLabel(ext) {
  const map = {
    js: 'JavaScript', jsx: 'React JSX', ts: 'TypeScript', tsx: 'React TSX',
    py: 'Python', go: 'Go', rs: 'Rust', java: 'Java',
    rb: 'Ruby', php: 'PHP', css: 'CSS', scss: 'SCSS',
    html: 'HTML', json: 'JSON', md: 'Markdown', sh: 'Shell',
    yml: 'YAML', yaml: 'YAML', toml: 'TOML', sql: 'SQL',
    mjs: 'JavaScript', cjs: 'JavaScript',
  };
  return map[ext] || ext?.toUpperCase() || 'File';
}

// ── FileDetailPanel: shown in the center when a file is clicked ───────────────
function FileDetailPanel({ filePath, repoId, repoName, onAskInChat, onClose }) {
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [error, setError] = useState('');

  const fileName = filePath?.split('/').pop() || '';
  const ext = fileName.split('.').pop()?.toLowerCase();
  const dotColor = getExtColor(ext);
  const langLabel = getLanguageLabel(ext);

  // Path segments for breadcrumb
  const parts = filePath?.split('/') || [];

  const handleExplain = async () => {
    setExplaining(true);
    setError('');
    setExplanation(null);
    try {
      const data = await explainFile(repoId, filePath);
      setExplanation(data.explanation);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setExplaining(false);
    }
  };

  const handleAskInChat = (question) => {
    onAskInChat(filePath, question);
  };

  const quickQuestions = [
    `Explain what ${fileName} does`,
    `What functions are defined in ${fileName}?`,
    `What does ${fileName} import and export?`,
    `Are there any bugs or issues in ${fileName}?`,
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* File header */}
      <div
        className="shrink-0 px-5 py-4 flex items-start justify-between gap-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-50)' }}
      >
        <div className="flex items-start gap-3 min-w-0">
          {/* File icon with language color */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{
              background: `${dotColor}18`,
              border: `1px solid ${dotColor}35`,
            }}
          >
            <FileCode className="w-5 h-5" style={{ color: dotColor }} />
          </div>

          <div className="min-w-0">
            {/* Breadcrumb */}
            <div className="flex items-center flex-wrap gap-0.5 mb-1">
              {parts.map((part, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  <span
                    className="text-[11px] font-mono"
                    style={{
                      color: i === parts.length - 1 ? 'var(--text-primary)' : 'var(--text-faint)',
                      fontWeight: i === parts.length - 1 ? 600 : 400,
                    }}
                  >
                    {part}
                  </span>
                  {i < parts.length - 1 && (
                    <ChevronRight className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--text-faint)' }} />
                  )}
                </span>
              ))}
            </div>

            {/* Language badge */}
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: `${dotColor}15`,
                border: `1px solid ${dotColor}30`,
                color: dotColor,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
              {langLabel}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors shrink-0"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-200)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ minHeight: 0 }}>

        {/* Action buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Ask in Chat */}
          <button
            onClick={() => handleAskInChat(`Explain what ${fileName} does`)}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold text-white transition-all btn-primary"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Ask in Chat
          </button>

          {/* Explain file */}
          <button
            onClick={handleExplain}
            disabled={explaining}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all"
            style={{
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.25)',
              color: '#a78bfa',
              opacity: explaining ? 0.6 : 1,
            }}
            onMouseEnter={e => !explaining && (e.currentTarget.style.background = 'rgba(139,92,246,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.1)')}
          >
            {explaining
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Sparkles className="w-3.5 h-3.5" />
            }
            {explaining ? 'Explaining…' : 'AI Explain'}
          </button>

          {/* Impact analysis */}
          <button
            onClick={() => handleAskInChat(`What is the change impact if I modify ${fileName}?`)}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all"
            style={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.25)',
              color: '#fbbf24',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'}
          >
            <Zap className="w-3.5 h-3.5" />
            Impact
          </button>
        </div>

        {/* AI Explanation result */}
        {error && (
          <div
            className="p-3 rounded-xl text-[12px]"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
          >
            {error}
          </div>
        )}

        {explanation && (
          <div className="card-glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                AI Explanation
              </p>
            </div>
            <div className="prose-code">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ background: 'var(--code-bg)', borderRadius: '8px', fontSize: '0.73rem', margin: '0.5rem 0' }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : <code>{children}</code>;
                  }
                }}
              >
                {explanation}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Quick questions */}
        <div className="card-glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Quick Questions
            </p>
          </div>
          <div className="space-y-2">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleAskInChat(q)}
                className="w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all group"
                style={{
                  background: 'var(--bg-100)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.border = '1px solid var(--accent-border)';
                  e.currentTarget.style.background = 'var(--bg-200)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.border = '1px solid var(--border)';
                  e.currentTarget.style.background = 'var(--bg-100)';
                }}
              >
                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{q}</span>
                <ArrowRight
                  className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--accent)' }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* File path info */}
        <div
          className="rounded-xl p-3 font-mono text-[11px]"
          style={{ background: 'var(--bg-100)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          <span style={{ color: 'var(--text-faint)' }}>path: </span>
          <span style={{ color: 'var(--text-secondary)' }}>{filePath}</span>
        </div>
      </div>
    </div>
  );
}

// ── Explorer empty state ───────────────────────────────────────────────────────
function ExplorerEmptyState({ activeRepo }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 h-full">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}
      >
        <FolderOpen className="w-6 h-6 text-blue-400" />
      </div>
      <p
        className="text-[14px] font-semibold mb-1"
        style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}
      >
        File Explorer
      </p>
      <p className="text-[12px] max-w-xs leading-relaxed mb-6" style={{ color: 'var(--text-muted)' }}>
        Browse the file tree in the sidebar. Click any file to ask questions about it in Chat.
      </p>

      {/* Quick stats */}
      {activeRepo && (
        <div className="flex items-center gap-4 mb-6">
          {[
            { label: 'Files',   val: activeRepo.totalFiles  || 0 },
            { label: 'Indexed', val: activeRepo.graph?.nodes?.length || activeRepo.keyFiles?.length || 0 },
            { label: 'Chunks',  val: activeRepo.totalChunks || 0 },
          ].map(({ label, val }, i) => (
            <div key={label} className="flex items-center gap-4">
              {i > 0 && <div className="w-px h-8" style={{ background: 'var(--border)' }} />}
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{val.toLocaleString()}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key files quick-pick */}
      {activeRepo?.keyFiles?.length > 0 && (
        <div className="w-full max-w-sm">
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: 'var(--text-faint)' }}>
            Key Files — click to explore
          </p>
          <div className="space-y-1.5">
            {activeRepo.keyFiles.slice(0, 6).map((f, i) => {
              const ext = f.split('.').pop()?.toLowerCase();
              const color = getExtColor(ext);
              return (
                <div
                  key={i}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl"
                  style={{ background: 'var(--bg-100)', border: '1px solid var(--border)' }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{f}</span>
                  <span className="ml-auto text-[9px] font-semibold shrink-0" style={{ color, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {ext?.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const {
    activeRepoId, activeRepo, activeTab, setActiveTab,
    graphData, setGraphData, selectedFile, setSelectedFile,
    addMessage, setSessionId, setLoading: setChatLoading, clearMessages,
  } = useAppStore();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // The file currently "open" in the explorer detail panel
  const [openFile, setOpenFile] = useState(null);

  useEffect(() => {
    if (activeRepoId && activeTab === 'graph' && !graphData) {
      getGraph(activeRepoId)
        .then(setGraphData)
        .catch(err => console.error('[graph]', err.response?.data?.error || err.message));
    }
  }, [activeTab, activeRepoId]);

  // When a file is selected from the sidebar explorer:
  // open the detail panel in the Files tab
  const handleFileSelect = useCallback((filePath) => {
    setOpenFile(filePath);
    setSelectedFile(filePath);
    setActiveTab('explorer');   // stay in / switch to explorer tab to show detail
    setMobileSidebarOpen(false);
  }, [setSelectedFile, setActiveTab]);

  // Send a question about this file straight into the Chat tab
  const handleAskInChat = useCallback((filePath, question) => {
    // Switch to chat tab
    setActiveTab('chat');
    // We use the store's addMessage + a synthetic "pending" input approach:
    // The cleanest way is to store a pendingQuestion that ChatWindow picks up
    // But since ChatWindow uses its own local input state, we use a shared store field
    useAppStore.setState({ pendingQuestion: question });
  }, [setActiveTab]);

  const handleMobileTab = (tabId) => {
    if (tabId === 'repos') {
      setMobileSidebarOpen(true);
    } else {
      setActiveTab(tabId);
      setMobileSidebarOpen(false);
    }
  };

  if (!activeRepoId) {
    return (
      <div className="flex h-full">
        <div className="hidden md:block" style={{ flexShrink: 0 }}>
          <Sidebar onFileSelect={handleFileSelect} />
        </div>
        {mobileSidebarOpen && (
          <>
            <div className="sidebar-mobile-overlay" onClick={() => setMobileSidebarOpen(false)} />
            <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40 }}>
              <Sidebar onClose={() => setMobileSidebarOpen(false)} onFileSelect={handleFileSelect} />
            </div>
          </>
        )}
        <div className="flex-1 flex items-center justify-center text-center px-4" style={{ paddingBottom: '60px' }}>
          <div>
            <GitBranch className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No repository selected.</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-faint)' }}>
              Go home and index a repository first.
            </p>
          </div>
        </div>
        <div className="mobile-bottom-nav md:hidden">
          {MOBILE_TABS.map(tab => (
            <button key={tab.id} onClick={() => handleMobileTab(tab.id)} style={{ color: 'var(--text-muted)' }}>
              <tab.icon style={{ width: 20, height: 20 }} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex overflow-hidden" style={{ height: '100%' }}>
      {/* Desktop Sidebar */}
      <div className="hidden md:block" style={{ flexShrink: 0, height: '100%' }}>
        <Sidebar onFileSelect={handleFileSelect} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <>
          <div className="sidebar-mobile-overlay" onClick={() => setMobileSidebarOpen(false)} />
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40 }}>
            <Sidebar onClose={() => setMobileSidebarOpen(false)} onFileSelect={handleFileSelect} />
          </div>
        </>
      )}

      {/* Main content column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Tech-stack header bar */}
        {activeRepo?.techStack?.frameworks?.length > 0 && (
          <div
            className="shrink-0 px-3 md:px-5 py-2 flex items-center gap-3 overflow-x-auto"
            style={{
              borderBottom:   '1px solid var(--border)',
              background:     'var(--navbar-bg)',
              backdropFilter: 'blur(8px)',
              minHeight:      '42px',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--text-faint)' }}>
              Stack:
            </span>
            <div className="flex items-center gap-2 flex-nowrap">
              {activeRepo.techStack.frameworks.map(fw => (
                <TechStackBadge key={fw.name} framework={fw} />
              ))}
            </div>
            {activeRepo.techStack.primaryLanguage && (
              <span
                className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-md whitespace-nowrap shrink-0"
                style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.15)' }}
              >
                {activeRepo.techStack.primaryLanguage}
              </span>
            )}
          </div>
        )}

        {/* Tab panels */}
        <div
          className="flex-1 overflow-hidden min-h-0"
          style={{
            paddingBottom: activeRepoId
              ? 'calc(var(--mobile-nav-height, 0px) + env(safe-area-inset-bottom))'
              : 0,
          }}
        >
          {/* ── CHAT TAB ── */}
          {activeTab === 'chat' && (
            <div className="flex h-full overflow-hidden">
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                <ChatWindow />
              </div>
              {/* Right summary panel */}
              <div
                className="hidden lg:flex w-72 shrink-0 flex-col overflow-hidden"
                style={{ borderLeft: '1px solid var(--border)', background: 'var(--bg-50)' }}
              >
                <div
                  className="px-4 py-3 shrink-0 flex items-center gap-2"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
                    Repository Overview
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <RepoSummary />
                </div>
              </div>
            </div>
          )}

          {/* ── GRAPH TAB ── */}
          {activeTab === 'graph' && (
            <div className="h-full p-2 md:p-4">
              {!graphData ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading dependency graph…</p>
                  </div>
                </div>
              ) : graphData.nodes?.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No graph data available.</p>
                  </div>
                </div>
              ) : (
                <DependencyGraph
                  graphData={graphData}
                  onNodeClick={id => console.log('Node clicked:', id)}
                />
              )}
            </div>
          )}

          {/* ── TRACE TAB ── */}
          {activeTab === 'trace' && (
            <div className="h-full overflow-y-auto">
              <TracePanel />
            </div>
          )}

          {/* ── IMPACT TAB ── */}
          {activeTab === 'impact' && (
            <div className="h-full overflow-y-auto">
              <ImpactPanel />
            </div>
          )}

          {/* ── EXPLORER TAB ── */}
          {activeTab === 'explorer' && (
            <div className="flex h-full overflow-hidden">
              {/* Centre area: file detail OR empty state */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                {openFile ? (
                  <FileDetailPanel
                    filePath={openFile}
                    repoId={activeRepoId}
                    repoName={activeRepo?.name}
                    onAskInChat={handleAskInChat}
                    onClose={() => setOpenFile(null)}
                  />
                ) : (
                  <ExplorerEmptyState activeRepo={activeRepo} />
                )}
              </div>

              {/* Right summary panel */}
              <div
                className="hidden lg:flex w-72 shrink-0 flex-col overflow-hidden"
                style={{ borderLeft: '1px solid var(--border)', background: 'var(--bg-50)' }}
              >
                <div
                  className="px-4 py-3 shrink-0 flex items-center gap-2"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
                    Repository Overview
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <RepoSummary />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="mobile-bottom-nav md:hidden">
        {MOBILE_TABS.map(tab => {
          const isActive = tab.id === 'repos'
            ? mobileSidebarOpen
            : (activeTab === tab.id && !mobileSidebarOpen);
          return (
            <button
              key={tab.id}
              onClick={() => handleMobileTab(tab.id)}
              style={{ color: isActive ? '#60a5fa' : 'var(--text-muted)' }}
            >
              <tab.icon style={{ width: 20, height: 20 }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <CodeViewerModal />
    </div>
  );
}