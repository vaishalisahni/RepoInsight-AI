import { useEffect, useRef } from 'react';
import { X, FileCode, Copy, Check, ExternalLink } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';
import useAppStore from '../../store/appStore';

function detectLanguage(filePath) {
  if (!filePath) return 'text';
  const ext = filePath.split('.').pop()?.toLowerCase();
  const map = {
    js: 'javascript', jsx: 'jsx', mjs: 'javascript',
    ts: 'typescript', tsx: 'tsx',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    rb: 'ruby',
    php: 'php',
    c: 'c', cpp: 'cpp', h: 'c',
    cs: 'csharp',
    swift: 'swift',
    dart: 'dart',
    kt: 'kotlin',
    sh: 'bash',
    yaml: 'yaml', yml: 'yaml',
    json: 'json',
    toml: 'toml',
    md: 'markdown',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sql: 'sql',
  };
  return map[ext] || 'text';
}

export default function CodeViewerModal() {
  const codeViewer   = useAppStore(s => s.codeViewer);
  const setCodeViewer = useAppStore(s => s.setCodeViewer);
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setCodeViewer(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  if (!codeViewer) return null;

  const { filePath, startLine, endLine, snippet } = codeViewer;
  const lang = detectLanguage(filePath);

  const shortPath = filePath?.split('/').slice(-3).join('/') || filePath;
  const lineInfo = startLine ? (endLine && endLine !== startLine ? `lines ${startLine}–${endLine}` : `line ${startLine}`) : null;

  const copyCode = async () => {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === overlayRef.current) setCodeViewer(null); }}
    >
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: '#080d1a',
          border: '1px solid rgba(59,130,246,0.2)',
          maxHeight: '80vh',
          boxShadow: '0 0 80px rgba(59,130,246,0.1), 0 40px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 shrink-0"
          style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', background: 'rgba(10,14,26,0.9)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p
                className="text-[13px] font-semibold text-slate-100 truncate"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {shortPath}
              </p>
              {lineInfo && (
                <p className="text-[10px] text-slate-600 mt-0.5">{lineInfo}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {snippet && (
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.06)',
                  border: `1px solid ${copied ? 'rgba(52,211,153,0.2)' : 'rgba(148,163,184,0.1)'}`,
                  color: copied ? '#34d399' : '#94a3b8',
                }}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
            <button
              onClick={() => setCodeViewer(null)}
              className="p-1.5 rounded-lg transition-colors text-slate-500 hover:text-slate-300 hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Code content */}
        <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
          {snippet ? (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={lang}
              showLineNumbers={!!startLine}
              startingLineNumber={startLine || 1}
              customStyle={{
                margin: 0,
                background: '#080d1a',
                padding: '1.25rem 1rem',
                fontSize: '0.8rem',
                minHeight: '100%',
              }}
              lineNumberStyle={{
                color: '#2d3a52',
                minWidth: '3em',
                paddingRight: '1em',
                userSelect: 'none',
              }}
              wrapLines={true}
              lineProps={lineNumber => {
                if (startLine && lineNumber >= startLine && (!endLine || lineNumber <= endLine)) {
                  return {
                    style: {
                      background: 'rgba(59,130,246,0.08)',
                      display: 'block',
                      borderLeft: '2px solid rgba(59,130,246,0.5)',
                      paddingLeft: '0.5rem',
                      marginLeft: '-0.5rem',
                    }
                  };
                }
                return {};
              }}
            >
              {snippet}
            </SyntaxHighlighter>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileCode className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-[13px] text-slate-500">No code preview available</p>
              <p className="text-[11px] text-slate-700 mt-1">
                The AI service returned a reference without a code snippet.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 shrink-0 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(148,163,184,0.06)', background: 'rgba(6,8,16,0.8)' }}
        >
          <p className="text-[10px] text-slate-700 font-mono truncate">{filePath}</p>
          <p className="text-[10px] text-slate-700">{lang}</p>
        </div>
      </div>
    </div>
  );
}