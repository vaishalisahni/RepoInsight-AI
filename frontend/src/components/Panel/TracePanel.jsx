import { useState } from 'react';
import { Activity, Play, Loader2, FileCode } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { traceFlow } from '../../api/client';
import useAppStore from '../../store/appStore';

export default function TracePanel() {
  const [entryPoint,    setEntryPoint]    = useState('');
  const [functionName,  setFunctionName]  = useState('');
  const [loading,       setLoading]       = useState(false);
  const [result,        setResult]        = useState(null);
  const [error,         setError]         = useState('');
  const { activeRepoId, activeRepo }      = useAppStore();

  const run = async () => {
    if (!entryPoint.trim() || !activeRepoId) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await traceFlow(activeRepoId, entryPoint.trim(), functionName.trim() || undefined);
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b shrink-0 flex items-center gap-2"
           style={{ borderColor:'rgba(124,127,245,0.1)', background:'rgba(13,11,30,0.6)' }}>
        <Activity className="w-4 h-4 text-ink-400" />
        <div>
          <p className="text-sm font-semibold text-white">Execution Tracer</p>
          <p className="text-[10px] text-[#4a476a]">Trace function call paths across files</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Form */}
        <div className="card-glass rounded-xl p-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-[#8b88a6] uppercase tracking-wider block mb-1.5">
              Entry Point File *
            </label>
            <input
              value={entryPoint}
              onChange={e => setEntryPoint(e.target.value)}
              placeholder="src/index.js"
              className="input-base rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#8b88a6] uppercase tracking-wider block mb-1.5">
              Function Name (optional)
            </label>
            <input
              value={functionName}
              onChange={e => setFunctionName(e.target.value)}
              placeholder="handleLogin"
              className="input-base rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <button
            onClick={run}
            disabled={loading || !entryPoint.trim() || !activeRepoId}
            className="btn-primary w-full text-white text-sm px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {loading ? 'Tracing…' : 'Trace Flow'}
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Result */}
        {result && (
          <div className="card-glass rounded-xl p-4">
            {result.sources?.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {result.sources.slice(0, 8).map((s, i) => (
                  <span key={i}
                    className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-md font-mono"
                    style={{ background:'rgba(92,91,232,0.1)', border:'1px solid rgba(92,91,232,0.15)', color:'#a3a9fc' }}>
                    <FileCode className="w-2.5 h-2.5" />{s.split('/').slice(-2).join('/')}
                  </span>
                ))}
              </div>
            )}
            <div className="prose-code">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div"
                        customStyle={{ background:'#0a0918', borderRadius:'8px', fontSize:'0.73rem' }}>
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : <code>{children}</code>;
                  }
                }}
              >
                {result.trace}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="text-center py-12 text-[#2e2a55]">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Enter an entry point file to trace execution flow</p>
          </div>
        )}
      </div>
    </div>
  );
}