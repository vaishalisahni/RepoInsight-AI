import { useState, useEffect } from 'react';
import { MessageCircle, GitBranch, FileCode, Zap } from 'lucide-react';
import ChatWindow from '../components/Chat/ChatWindow';
import DependencyGraph from '../components/Graph/DependencyGraph';
import useAppStore from '../store/appStore';
import { getGraph, explainFile, traceFlow } from '../api/client';

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'graph', label: 'Dependency Graph', icon: GitBranch },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('chat');
  const { activeRepoId, graphData, setGraphData } = useAppStore();

  useEffect(() => {
    if (activeRepoId && activeTab === 'graph' && !graphData) {
      getGraph(activeRepoId).then(setGraphData).catch(console.error);
    }
  }, [activeTab, activeRepoId]);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 bg-gray-900">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <ChatWindow />}
        {activeTab === 'graph' && (
          <div className="h-full p-4">
            {graphData
              ? <DependencyGraph graphData={graphData} onNodeClick={id => console.log('Clicked:', id)} />
              : <p className="text-gray-500 text-center pt-20">
                  {activeRepoId ? 'Loading graph...' : 'Select a repository to view its dependency graph.'}
                </p>
            }
          </div>
        )}
      </div>
    </div>
  );
}