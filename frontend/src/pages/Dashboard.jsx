import { useEffect, useState } from 'react';
import Sidebar         from '../components/Sidebar';
import ChatWindow      from '../components/Chat/ChatWindow';
import DependencyGraph from '../components/Graph/DependencyGraph';
import TracePanel      from '../components/Panel/TracePanel';
import ImpactPanel     from '../components/Panel/ImpactPanel';
import RepoSummary     from '../components/Panel/RepoSummary';
import TechStackBadge  from '../components/TechStack/TechStackBadge';
import CodeViewerModal from '../components/Chat/CodeViewerModal';
import useAppStore     from '../store/appStore';
import { getGraph }    from '../api/client';
import {
  Loader2, AlertCircle, GitBranch, MessageSquare,
  Activity, Zap, BookOpen, FolderOpen, FileCode
} from 'lucide-react';

const MOBILE_TABS = [
  { id: 'repos',    icon: BookOpen,      label: 'Repos'   },
  { id: 'chat',     icon: MessageSquare, label: 'Chat'    },
  { id: 'graph',    icon: GitBranch,     label: 'Graph'   },
  { id: 'trace',    icon: Activity,      label: 'Trace'   },
  { id: 'impact',   icon: Zap,           label: 'Impact'  },
  { id: 'explorer', icon: FolderOpen,    label: 'Files'   },
];

export default function Dashboard() {
  const {
    activeRepoId, activeRepo, activeTab, setActiveTab,
    graphData, setGraphData, selectedFile, setSelectedFile,
  } = useAppStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (activeRepoId && activeTab === 'graph' && !graphData) {
      getGraph(activeRepoId)
        .then(setGraphData)
        .catch(err => console.error('[graph]', err.response?.data?.error || err.message));
    }
  }, [activeTab, activeRepoId]);

  // When a file is selected from the sidebar explorer, switch to chat
  // and store the selected file so other panels can use it
  const handleFileSelect = (filePath) => {
    setSelectedFile(filePath);
    setActiveTab('chat');
    setMobileSidebarOpen(false);
  };

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
              <Sidebar
                onClose={() => setMobileSidebarOpen(false)}
                onFileSelect={handleFileSelect}
              />
            </div>
          </>
        )}

        <div className="flex-1 flex items-center justify-center text-center px-4" style={{ paddingBottom: '60px' }}>
          <div>
            <GitBranch className="w-12 h-12 mx-auto mb-4" style={{ color: '#1e2d45' }} />
            <p className="text-slate-500 text-sm">No repository selected.</p>
            <p className="text-[12px] mt-1" style={{ color: '#1e2d45' }}>
              Go home and index a repository first.
            </p>
          </div>
        </div>

        <div className="mobile-bottom-nav md:hidden">
          {MOBILE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleMobileTab(tab.id)}
              style={{ color: '#475569' }}
            >
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
            <Sidebar
              onClose={() => setMobileSidebarOpen(false)}
              onFileSelect={handleFileSelect}
            />
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
              borderBottom:   '1px solid rgba(148,163,184,0.08)',
              background:     'rgba(10,14,26,0.8)',
              backdropFilter: 'blur(8px)',
              minHeight:      '42px',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <span className="text-[10px] text-slate-700 font-semibold uppercase tracking-wider whitespace-nowrap">
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

              {/* Right summary panel — hidden on mobile */}
              <div
                className="hidden lg:flex w-72 shrink-0 flex-col overflow-hidden"
                style={{ borderLeft: '1px solid rgba(148,163,184,0.08)', background: 'rgba(8,11,20,0.6)' }}
              >
                <div
                  className="px-4 py-3 shrink-0 flex items-center gap-2"
                  style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#334155' }}>
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
                    <p className="text-slate-500 text-sm">Loading dependency graph…</p>
                  </div>
                </div>
              ) : graphData.nodes?.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: '#1e2d45' }} />
                    <p className="text-slate-500 text-sm">No graph data available.</p>
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

          {/* ── EXPLORER TAB ──
              The file tree lives in the sidebar (left panel).
              This right-hand area shows a hint + repo overview.
              Without this block the screen goes completely blank.
          ── */}
          {activeTab === 'explorer' && (
            <div className="flex h-full overflow-hidden">
              {/* Centre hint */}
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}
                >
                  <FolderOpen className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-[14px] font-semibold text-slate-300 mb-1"
                   style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  File Explorer
                </p>
                <p className="text-[12px] text-slate-500 max-w-xs leading-relaxed">
                  Browse the file tree in the sidebar. Click any file to ask questions about it in Chat.
                </p>

                {/* Quick stats */}
                {activeRepo && (
                  <div className="mt-6 flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-200">
                        {(activeRepo.totalFiles || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-600 uppercase tracking-wider">Files</p>
                    </div>
                    <div className="w-px h-8" style={{ background: 'rgba(148,163,184,0.1)' }} />
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-200">
                        {(activeRepo.graph?.nodes?.length || activeRepo.keyFiles?.length || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-600 uppercase tracking-wider">Indexed</p>
                    </div>
                    <div className="w-px h-8" style={{ background: 'rgba(148,163,184,0.1)' }} />
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-200">
                        {(activeRepo.totalChunks || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-600 uppercase tracking-wider">Chunks</p>
                    </div>
                  </div>
                )}

                {/* Key files quick-pick */}
                {activeRepo?.keyFiles?.length > 0 && (
                  <div className="mt-6 w-full max-w-sm">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-3">
                      Key Files
                    </p>
                    <div className="space-y-1.5">
                      {activeRepo.keyFiles.slice(0, 6).map((f, i) => (
                        <button
                          key={i}
                          onClick={() => handleFileSelect(f)}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
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
                          <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-[11px] font-mono text-slate-400 truncate">{f}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right summary panel */}
              <div
                className="hidden lg:flex w-72 shrink-0 flex-col overflow-hidden"
                style={{ borderLeft: '1px solid rgba(148,163,184,0.08)', background: 'rgba(8,11,20,0.6)' }}
              >
                <div
                  className="px-4 py-3 shrink-0 flex items-center gap-2"
                  style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#334155' }}>
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
              style={{ color: isActive ? '#60a5fa' : '#475569' }}
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