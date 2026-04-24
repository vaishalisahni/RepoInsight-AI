import { BookOpen, FileCode, Layers, GitBranch, Sparkles } from 'lucide-react';
import useAppStore from '../../store/appStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function RepoSummary() {
  const { activeRepo } = useAppStore();
  if (!activeRepo) return null;

  return (
    <div className="p-5 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: FileCode, label: 'Files',  val: activeRepo.totalFiles  || 0 },
          { icon: Layers,   label: 'Chunks', val: activeRepo.totalChunks || 0 },
          { icon: GitBranch,label: 'Nodes',  val: activeRepo.graph?.nodes?.length || 0 },
        ].map(({ icon: Icon, label, val }) => (
          <div key={label} className="card-glass rounded-xl p-3 text-center">
            <Icon className="w-4 h-4 text-ink-400 mx-auto mb-1.5" />
            <p className="text-lg font-bold text-white font-display">{val.toLocaleString()}</p>
            <p className="text-[10px] text-[#4a476a]">{label}</p>
          </div>
        ))}
      </div>

      {/* Summary */}
      {activeRepo.summary && (
        <div className="card-glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-ink-400" />
            <p className="text-xs font-semibold text-[#8b88a6] uppercase tracking-wider">AI Summary</p>
          </div>
          <div className="prose-code">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeRepo.summary}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Key files */}
      {activeRepo.keyFiles?.length > 0 && (
        <div className="card-glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-3.5 h-3.5 text-ink-400" />
            <p className="text-xs font-semibold text-[#8b88a6] uppercase tracking-wider">Key Files</p>
          </div>
          <div className="space-y-1.5">
            {activeRepo.keyFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-default">
                <span className="text-[10px] font-mono text-[#2e2a55] w-4">{i + 1}.</span>
                <FileCode className="w-3 h-3 text-ink-400/60 shrink-0" />
                <span className="text-xs font-mono text-[#8b88a6] truncate">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}