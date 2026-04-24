import { useEffect } from 'react';
import Sidebar     from '../components/Sidebar';
import ChatWindow  from '../components/Chat/ChatWindow';
import DependencyGraph from '../components/Graph/DependencyGraph';
import TracePanel  from '../components/Panel/TracePanel';
import ImpactPanel from '../components/Panel/ImpactPanel';
import RepoSummary from '../components/Panel/RepoSummary';
import TechStackBadge from '../components/TechStack/TechStackBadge';
import useAppStore from '../store/appStore';
import { getGraph } from '../api/client';
import { Loader2, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const { activeRepoId, activeRepo, activeTab, graphData, setGraphData } = useAppStore();

  // Load graph when switching to graph tab
  useEffect(() => {
    if (activeRepoId && activeTab === 'graph' && !graphData) {
      getGraph(activeRepoId)
        .then(setGraphData)
        .catch(err => console.error('[graph]', err.response?.data?.error || err.message));
    }
  }, [activeTab, activeRepoId]);

  if (!activeRepoId) {
    return (
      <div className="flex h-full">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <AlertCircle className="w-12 h-12 text-[#2e2a55] mx-auto mb-4" />
            <p className="text-[#4a476a] text-sm">No repository selected.</p>
            <p className="text-[#2e2a55] text-xs mt-1">Go home and index a repository first.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Tech stack header bar */}
        {activeRepo?.techStack?.frameworks?.length > 0 && (
          <div
            className="shrink-0 px-5 py-2 flex items-center gap-3 border-b overflow-x-auto"
            style={{ borderColor:'rgba(124,127,245,0.1)', background:'rgba(13,11,30,0.7)', backdropFilter:'blur(8px)' }}
          >
            <span className="text-[10px] text-[#2e2a55] font-semibold uppercase tracking-wider whitespace-nowrap">Stack:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {activeRepo.techStack.frameworks.map(fw => (
                <TechStackBadge key={fw.name} framework={fw} />
              ))}
            </div>
            {activeRepo.techStack.primaryLanguage && (
              <span
                className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-md whitespace-nowrap"
                style={{ background:'rgba(92,91,232,0.1)', color:'#a3a9fc', border:'1px solid rgba(92,91,232,0.15)' }}
              >
                {activeRepo.techStack.primaryLanguage}
              </span>
            )}
          </div>
        )}

        {/* Panel content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <div className="flex h-full">
              <div className="flex-1 flex flex-col overflow-hidden">
                <ChatWindow />
              </div>
              {/* Sidebar panel: summary + key files */}
              <div
                className="w-72 shrink-0 border-l overflow-y-auto"
                style={{ borderColor:'rgba(124,127,245,0.1)', background:'rgba(10,9,24,0.6)' }}
              >
                <RepoSummary />
              </div>
            </div>
          )}

          {activeTab === 'graph' && (
            <div className="h-full p-4">
              {!graphData ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-ink-400 animate-spin mx-auto mb-3" />
                    <p className="text-[#4a476a] text-sm">Loading dependency graph…</p>
                    <p className="text-[#2e2a55] text-xs mt-1">This may take a moment for large repos</p>
                  </div>
                </div>
              ) : graphData.nodes?.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-[#2e2a55] mx-auto mb-3" />
                    <p className="text-[#4a476a] text-sm">No graph data available.</p>
                    <p className="text-[#2e2a55] text-xs mt-1">Re-index the repository to generate a dependency graph.</p>
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

          {activeTab === 'trace'  && <TracePanel  />}
          {activeTab === 'impact' && <ImpactPanel />}
        </div>
      </div>
    </div>
  );
}