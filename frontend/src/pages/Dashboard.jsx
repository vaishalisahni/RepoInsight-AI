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
import { Loader2, AlertCircle, GitBranch, MessageSquare, Activity, Zap, Menu, X, BookOpen } from 'lucide-react';

const MOBILE_TABS = [
  { id: 'chat',   icon: MessageSquare, label: 'Chat'   },
  { id: 'graph',  icon: GitBranch,     label: 'Graph'  },
  { id: 'trace',  icon: Activity,      label: 'Trace'  },
  { id: 'impact', icon: Zap,           label: 'Impact' },
  { id: 'repos',  icon: BookOpen,      label: 'Repos'  },
];

export default function Dashboard() {
  const { activeRepoId, activeRepo, activeTab, setActiveTab, graphData, setGraphData } = useAppStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (activeRepoId && activeTab === 'graph' && !graphData) {
      getGraph(activeRepoId)
        .then(setGraphData)
        .catch(err => console.error('[graph]', err.response?.data?.error || err.message));
    }
  }, [activeTab, activeRepoId]);

  // Close sidebar on tab change (mobile)
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
        {/* Sidebar — hidden on mobile unless open */}
        <div
          className="hidden md:block"
          style={{ flexShrink: 0 }}
        >
          <Sidebar />
        </div>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <>
            <div className="sidebar-mobile-overlay" onClick={() => setMobileSidebarOpen(false)} />
            <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40 }}>
              <Sidebar onClose={() => setMobileSidebarOpen(false)} />
            </div>
          </>
        )}

        <div className="flex-1 flex items-center justify-center text-center px-4">
          <div>
            <GitBranch className="w-12 h-12 mx-auto mb-4" style={{ color: '#1e2d45' }} />
            <p className="text-slate-500 text-sm">No repository selected.</p>
            <p className="text-[12px] mt-1" style={{ color: '#1e2d45' }}>
              Go home and index a repository first.
            </p>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <div className="mobile-bottom-nav">
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
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <>
          <div className="sidebar-mobile-overlay" onClick={() => setMobileSidebarOpen(false)} />
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40 }}>
            <Sidebar onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* ── Main content column ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Tech-stack header bar — scrollable on mobile */}
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
                style={{
                  background: 'rgba(59,130,246,0.1)',
                  color:      '#60a5fa',
                  border:     '1px solid rgba(59,130,246,0.15)',
                }}
              >
                {activeRepo.techStack.primaryLanguage}
              </span>
            )}
          </div>
        )}

        {/* Tab panels — add bottom padding on mobile for nav bar */}
        <div
          className="flex-1 overflow-hidden min-h-0"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* CHAT TAB */}
          {activeTab === 'chat' && (
            <div className="flex h-full overflow-hidden">
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                <ChatWindow />
              </div>

              {/* Right summary panel — hidden on mobile */}
              <div
                className="hidden lg:flex w-72 shrink-0 flex-col overflow-hidden"
                style={{
                  borderLeft:  '1px solid rgba(148,163,184,0.08)',
                  background:  'rgba(8,11,20,0.6)',
                }}
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

          {/* GRAPH TAB */}
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

          {/* TRACE TAB */}
          {activeTab === 'trace' && <TracePanel />}

          {/* IMPACT TAB */}
          {activeTab === 'impact' && <ImpactPanel />}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="mobile-bottom-nav md:hidden">
        {MOBILE_TABS.map(tab => {
          const isActive = tab.id === 'repos' ? mobileSidebarOpen : (activeTab === tab.id && !mobileSidebarOpen);
          return (
            <button
              key={tab.id}
              onClick={() => handleMobileTab(tab.id)}
              style={{
                color: isActive ? '#60a5fa' : '#475569',
              }}
            >
              <tab.icon style={{ width: 20, height: 20 }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Code viewer modal */}
      <CodeViewerModal />
    </div>
  );
}