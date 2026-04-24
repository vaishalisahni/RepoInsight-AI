import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser
        ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2'
        : 'bg-gray-900 text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-800'
      }`}>
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              className="prose prose-invert prose-sm max-w-none"
              components={{
                code({ node, inline, className, children }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      className="rounded-lg text-xs !bg-gray-950"
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="bg-gray-800 px-1 rounded text-xs">{children}</code>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
            {message.sources?.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Sources:</p>
                {message.sources.slice(0, 3).map((s, i) => (
                  <span key={i} className="inline-block text-xs bg-gray-800 text-blue-400 rounded px-2 py-0.5 mr-1 mb-1 font-mono">
                    {s.filePath}{s.startLine ? `:${s.startLine}` : ''}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}