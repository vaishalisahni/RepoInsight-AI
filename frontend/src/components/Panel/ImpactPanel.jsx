import { useState } from 'react';
import { Zap, Search, Loader2, AlertTriangle, FileCode } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { analyzeImpact } from '../../api/client';
import useAppStore from '../../store/appStore';

function RiskBadge({ text }) {
  if (!text) return null;
  const upper = text.toUpperCase();
  const map = {
    HIGH:   { bg:'rgba(239,68,68,0.12)',  color:'#f87171', border:'rgba(248,113,113,0.2)' },
    MEDIUM: { bg:'rgba(245,158,11,0.12)', color:'#fbbf24', border:'rgba(251,191,36,0.2)' },
    LOW:    { bg:'rgba(16,185,129,0.12)', color:'#34d399', border:'rgba(52,211,153,0.2)'  },
  };
  const risk = ['HIGH','MEDIUM','LOW'].find(r => upper.includes(r));
  if (!risk) return null;
  const s = map[risk];
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>
      {risk} RISK
    </span>
  );
}

export default function ImpactPanel() {
  const [filePath, setFilePath] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState('');
  const { activeRepoId, activeRepo } = useAppStore();

  const run = async () => {
    if (!filePath.trim() || !activeRepoId) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await analyzeImpact(activeRepoId, filePath.trim());
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const riskMatch = result?.analysis?.match(/risk.*?(LOW|MEDIUM|HIGH)/i);
  const riskLevel = riskMatch?.[1];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b shrink-0 flex items-center gap-2"
           style={{ borderColor:'rgba(124,127,245,0.1)', background:'rgba(13,11,30,0.6)' }}>
        <Zap className="w-4 h-4 text-ink-400" />
        <div>
          <p className="text-sm font-semibold text-white">Change Impact Analysis</p>
          <p className="text-[10px] text-[#4a476a]">See what breaks if you change a file</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="card-glass rounded-xl p-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-[#8b88a6] uppercase tracking-wider block mb-1.5">
              File Path *
            </label>
            <input
              value={filePath}
              onChange={e => setFilePath(e.target.value)}
              placeholder="src/services/authService.js"
              className="input-base rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>

          {activeRepo?.keyFiles?.length > 0 && (
            <div>
              <p className="text-[10px] text-[#4a476a] mb-1.5">Key files:</p>
              <div className="flex flex-wrap gap-1.5">
                {activeRepo.keyFiles.slice(0, 6).map(f => (
                  <button key={f} onClick={() => setFilePath(f)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md transition-colors hover:text-ink-400"
                    style={{ background:'rgba(92,91,232,0.08)', border:'1px solid rgba(92,91,232,0.12)', color:'#8b88a6' }}>
                    {f.split('/').slice(-2).join('/')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={run}
            disabled={loading || !filePath.trim() || !activeRepoId}
            className="btn-primary w-full text-white text-sm px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Analyzing…' : 'Analyze Impact'}
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <p className="text-sm font-semibold text-white">Impact Report</p>
              {riskLevel && <RiskBadge text={riskLevel} />}
            </div>

            {result.relatedFiles?.length > 0 && (
              <div className="card-glass rounded-xl p-3">
                <p className="text-[10px] font-semibold text-[#8b88a6] uppercase tracking-wider mb-2">Affected Files</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.relatedFiles.slice(0, 10).map((f, i) => (
                    <span key={i}
                      className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-md font-mono"
                      style={{ background:'rgba(92,91,232,0.1)', border:'1px solid rgba(92,91,232,0.15)', color:'#a3a9fc' }}>
                      <FileCode className="w-2.5 h-2.5" />{f.split('/').slice(-2).join('/')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="card-glass rounded-xl p-4 prose-code">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.analysis}</ReactMarkdown>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="text-center py-12 text-[#2e2a55]">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Enter a file path to analyze change impact</p>
          </div>
        )}
      </div>
    </div>
  );
}