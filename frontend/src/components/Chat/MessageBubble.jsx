import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileCode, Copy, Check } from 'lucide-react';
import useAppStore from '../../store/appStore';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const setCodeViewer = useAppStore(s => s.setCodeViewer);

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-up">
        <div
          className="max-w-[78%] px-4 py-2.5 rounded-2xl rounded-br-sm text-sm text-white"
          style={{ background: 'linear-gradient(135deg, #4a40d0, #5c5be8)' }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-slide-up">
      <div className="max-w-[88%] w-full">
        {/* AI indicator */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">AI</span>
          </div>
          <span className="text-[10px] text-slate-600 font-medium">RepoInsight</span>
        </div>

        <div
          className="px-4 py-3 rounded-2xl rounded-tl-sm prose-code relative group"
          style={{ background: 'rgba(16,23,41,0.8)', border: '1px solid rgba(148,163,184,0.08)' }}
        >
          {/* Copy button — appears on hover */}
          <button
            onClick={copyMessage}
            title="Copy response"
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg"
            style={{ background: 'rgba(16,23,41,0.9)', border: '1px solid rgba(148,163,184,0.12)', color: copied ? '#34d399' : '#475569' }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>

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
                    customStyle={{ background: '#0a0918', borderRadius: '8px', fontSize: '0.75rem', margin: '0.5rem 0' }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code>{children}</code>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>

          {/* Sources */}
          {message.sources?.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(148,163,184,0.08)' }}>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-1.5">Sources</p>
              <div className="flex flex-wrap gap-1.5">
                {message.sources.slice(0, 5).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setCodeViewer && setCodeViewer({ filePath: s.filePath, startLine: s.startLine, endLine: s.endLine, snippet: s.snippet })}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-mono transition-colors hover:opacity-80"
                    style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)', color: '#93c5fd' }}
                  >
                    <FileCode className="w-2.5 h-2.5" />
                    {s.filePath?.split('/').slice(-2).join('/')}{s.startLine ? `:${s.startLine}` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}