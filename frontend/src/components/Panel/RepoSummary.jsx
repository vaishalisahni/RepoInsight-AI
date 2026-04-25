import { BookOpen, FileCode, Layers, GitBranch, Sparkles, Code2 } from 'lucide-react';
import useAppStore from '../../store/appStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// Color palette for language badges
const LANG_COLORS = {
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  Python:     '#3572A5',
  Go:         '#00ADD8',
  Rust:       '#DEA584',
  Java:       '#b07219',
  Ruby:       '#701516',
  PHP:        '#4F5D95',
  C:          '#555555',
  'C++':      '#f34b7d',
  'C#':       '#178600',
  Swift:      '#FA7343',
  Kotlin:     '#A97BFF',
  Dart:       '#00B4AB',
  Elixir:     '#6e4a7e',
  Scala:      '#c22d40',
  Lua:        '#000080',
  Shell:      '#89e051',
  HTML:       '#e34c26',
  CSS:        '#563d7c',
};

const FALLBACK_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#a855f7',
];

function getLangColor(lang, idx) {
  return LANG_COLORS[lang] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-lg text-[12px]"
        style={{ background: 'rgba(10,14,26,0.95)', border: '1px solid rgba(148,163,184,0.15)' }}
      >
        <span style={{ color: payload[0].payload.color }}>{payload[0].name}</span>
        <span className="text-slate-400 ml-2">{payload[0].value}%</span>
      </div>
    );
  }
  return null;
};

export default function RepoSummary() {
  const { activeRepo } = useAppStore();
  if (!activeRepo) return null;

  // Build language chart data
  const langData = Object.entries(activeRepo.languages || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([lang, count], idx) => {
      const total = Object.values(activeRepo.languages || {}).reduce((a, b) => a + b, 0) || 1;
      return {
        name: lang,
        value: Math.round(count / total * 100),
        count,
        color: getLangColor(lang, idx),
      };
    });

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
            <Icon className="w-4 h-4 text-blue-400 mx-auto mb-1.5" />
            <p className="text-lg font-bold text-white">{val.toLocaleString()}</p>
            <p className="text-[10px] text-slate-600">{label}</p>
          </div>
        ))}
      </div>

      {/* Language breakdown donut chart */}
      {langData.length > 0 && (
        <div className="card-glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Languages</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Donut */}
            <div style={{ width: 100, height: 100, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={langData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={44}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {langData.map((entry, idx) => (
                      <Cell key={entry.name} fill={entry.color} opacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-1.5 min-w-0">
              {langData.slice(0, 5).map(({ name, value, color }) => (
                <div key={name} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-[11px] text-slate-400 truncate flex-1">{name}</span>
                  <span
                    className="text-[10px] font-mono shrink-0"
                    style={{ color }}
                  >
                    {value}%
                  </span>
                </div>
              ))}
              {langData.length > 5 && (
                <p className="text-[10px] text-slate-700 mt-1">+{langData.length - 5} more</p>
              )}
            </div>
          </div>

          {/* All language pills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {langData.map(({ name, value, color }) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: `${color}15`,
                  border: `1px solid ${color}30`,
                  color,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {activeRepo.summary && (
        <div className="card-glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Summary</p>
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
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Key Files</p>
          </div>
          <div className="space-y-1.5">
            {activeRepo.keyFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-default">
                <span className="text-[10px] font-mono text-slate-700 w-4">{i + 1}.</span>
                <FileCode className="w-3 h-3 text-blue-400/60 shrink-0" />
                <span className="text-xs font-mono text-slate-500 truncate">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}