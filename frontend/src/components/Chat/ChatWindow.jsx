import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { queryRepo } from '../../api/client';
import useAppStore from '../../store/appStore';
import MessageBubble from './MessageBubble';

export default function ChatWindow() {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const { messages, activeRepoId, sessionId, isLoading,
          addMessage, setSessionId, setLoading } = useAppStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const question = input.trim();
    if (!question || !activeRepoId || isLoading) return;

    setInput('');
    addMessage({ role: 'user', content: question });
    setLoading(true);

    try {
      const data = await queryRepo(activeRepoId, question, sessionId);
      addMessage({ role: 'assistant', content: data.answer, sources: data.sources });
      setSessionId(data.sessionId);
    } catch (err) {
      addMessage({ role: 'assistant', content: '⚠️ Error: ' + (err.response?.data?.error || err.message) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-xl font-semibold text-gray-400">Ask anything about your codebase</p>
            <p className="text-sm mt-2">e.g. "Where is authentication handled?" or "Explain the data flow"</p>
          </div>
        )}
        {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing codebase...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex gap-2 bg-gray-900 rounded-xl border border-gray-700 p-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={activeRepoId ? "Ask about your codebase..." : "Select a repository first"}
            disabled={!activeRepoId}
            rows={2}
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 resize-none outline-none text-sm p-1"
          />
          <button
            onClick={send}
            disabled={!input.trim() || !activeRepoId || isLoading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg p-2 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}