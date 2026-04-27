import { useEffect, useRef, useState, useCallback } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { ZoomIn, ZoomOut, Maximize2, Search, Download, X, Image } from 'lucide-react';

const TYPE_COLORS = {
  route:      { bg: '#3b82f6', glow: 'rgba(59,130,246,0.5)' },
  service:    { bg: '#10b981', glow: 'rgba(16,185,129,0.5)' },
  model:      { bg: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
  middleware: { bg: '#8b5cf6', glow: 'rgba(139,92,246,0.5)' },
  utility:    { bg: '#6b7280', glow: 'rgba(107,114,128,0.5)' },
  test:       { bg: '#ef4444', glow: 'rgba(239,68,68,0.5)'  },
  entry:      { bg: '#ec4899', glow: 'rgba(236,72,153,0.5)' },
  module:     { bg: '#5c5be8', glow: 'rgba(92,91,232,0.5)'  },
};

const LEGEND = Object.entries(TYPE_COLORS).map(([type, c]) => ({ type, color: c.bg }));

export default function DependencyGraph({ graphData, onNodeClick }) {
  const containerRef = useRef(null);
  const networkRef   = useRef(null);
  const nodesRef     = useRef(null);
  const [selected,   setSelected]   = useState(null);
  const [stats,      setStats]      = useState({ nodes: 0, edges: 0 });
  const [searchVal,  setSearchVal]  = useState('');
  const [matches,    setMatches]    = useState([]);
  const [matchIdx,   setMatchIdx]   = useState(0);
  const [exporting,  setExporting]  = useState(false);

  useEffect(() => {
    if (!graphData || !containerRef.current) return;

    const nodes = new DataSet(graphData.nodes.map(n => {
      const c = TYPE_COLORS[n.type] || TYPE_COLORS.module;
      const fns = (n.functions || []).slice(0, 5).join(', ');
      return {
        id:     n.id,
        label:  n.label?.length > 20 ? n.label.slice(0, 18) + '…' : (n.label || n.id),
        title:  `<div style="font-family:JetBrains Mono,monospace;padding:8px;max-width:260px;background:#131128;border:1px solid rgba(124,127,245,0.2);border-radius:8px;font-size:11px;color:#e8e6f0">
          <b style="color:#a3a9fc">${n.filePath}</b><br/>
          <span style="color:#4a476a">Type: ${n.type}</span><br/>
          ${fns ? `<span style="color:#4a476a">Fns: ${fns}</span>` : ''}
        </div>`,
        color:  { background: c.bg + '22', border: c.bg, highlight: { background: c.bg + '44', border: '#fff' }, hover: { background: c.bg + '33', border: c.bg } },
        font:   { color: '#e8e6f0', size: 11, face: 'DM Sans' },
        shape:  'box',
        borderWidth: 1, borderWidthSelected: 2,
        shapeProperties: { borderRadius: 6 },
        shadow: { enabled: true, color: c.glow, size: 8, x: 0, y: 0 },
        // store metadata for search
        _filePath: n.filePath,
        _type: n.type,
      };
    }));

    nodesRef.current = nodes;

    const edges = new DataSet(graphData.edges.map((e, i) => ({
      id:     i,
      from:   e.from,
      to:     e.to,
      arrows: { to: { enabled: true, scaleFactor: 0.6 } },
      color:  { color: 'rgba(92,91,232,0.25)', highlight: 'rgba(92,91,232,0.8)', hover: 'rgba(92,91,232,0.5)' },
      width:  1,
      smooth: { type: 'dynamic' }
    })));

    setStats({ nodes: nodes.length, edges: edges.length });

    const options = {
      layout: { hierarchical: false },
      physics: {
        enabled: true,
        stabilization: { iterations: 150 },
        barnesHut: { gravitationalConstant: -4000, springLength: 180, springConstant: 0.04, damping: 0.18 }
      },
      interaction: { hover: true, tooltipDelay: 300, navigationButtons: false, keyboard: { enabled: true } },
      nodes:  { margin: { top: 8, bottom: 8, left: 10, right: 10 } },
      edges:  { selectionWidth: 2 },
    };

    if (networkRef.current) networkRef.current.destroy();
    networkRef.current = new Network(containerRef.current, { nodes, edges }, options);

    networkRef.current.on('click', params => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node   = graphData.nodes.find(n => n.id === nodeId);
        setSelected(node);
        if (onNodeClick) onNodeClick(nodeId);
      } else {
        setSelected(null);
      }
    });

    return () => networkRef.current?.destroy();
  }, [graphData]);

  // Graph search
  const handleSearch = useCallback((val) => {
    setSearchVal(val);
    if (!val.trim() || !graphData) { setMatches([]); setMatchIdx(0); return; }
    const q = val.toLowerCase();
    const found = graphData.nodes.filter(n =>
      (n.filePath || '').toLowerCase().includes(q) ||
      (n.label || '').toLowerCase().includes(q) ||
      (n.type || '').toLowerCase().includes(q)
    ).map(n => n.id);
    setMatches(found);
    setMatchIdx(0);
    if (found.length > 0 && networkRef.current) {
      networkRef.current.selectNodes([found[0]]);
      networkRef.current.focus(found[0], { scale: 1.5, animation: { duration: 600 } });
      const node = graphData.nodes.find(n => n.id === found[0]);
      setSelected(node || null);
    }
  }, [graphData]);

  const cycleMatch = (dir) => {
    if (!matches.length) return;
    const next = (matchIdx + dir + matches.length) % matches.length;
    setMatchIdx(next);
    networkRef.current?.selectNodes([matches[next]]);
    networkRef.current?.focus(matches[next], { scale: 1.5, animation: { duration: 400 } });
    const node = graphData.nodes.find(n => n.id === matches[next]);
    setSelected(node || null);
  };

  // Export graph as PNG
  const exportPNG = () => {
    if (!networkRef.current) return;
    setExporting(true);
    try {
      // vis-network canvas export
      const canvas = containerRef.current?.querySelector('canvas');
      if (!canvas) return;
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `dependency-graph-${Date.now()}.png`;
      a.click();
    } finally {
      setExporting(false);
    }
  };

  // Export graph as SVG (positions from vis-network)
  const exportSVG = () => {
    if (!networkRef.current || !graphData) return;
    setExporting(true);
    try {
      const positions = networkRef.current.getPositions();
      // Build SVG
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const id in positions) {
        minX = Math.min(minX, positions[id].x);
        minY = Math.min(minY, positions[id].y);
        maxX = Math.max(maxX, positions[id].x);
        maxY = Math.max(maxY, positions[id].y);
      }
      const pad = 60;
      const W = maxX - minX + pad * 2;
      const H = maxY - minY + pad * 2;

      const edgesSVG = graphData.edges.map(e => {
        const from = positions[e.from];
        const to   = positions[e.to];
        if (!from || !to) return '';
        const x1 = from.x - minX + pad, y1 = from.y - minY + pad;
        const x2 = to.x   - minX + pad, y2 = to.y   - minY + pad;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(92,91,232,0.4)" stroke-width="1" marker-end="url(#arrow)"/>`;
      }).join('\n');

      const nodesSVG = graphData.nodes.map(n => {
        const pos = positions[n.id];
        if (!pos) return '';
        const c = TYPE_COLORS[n.type] || TYPE_COLORS.module;
        const x = pos.x - minX + pad, y = pos.y - minY + pad;
        const label = (n.label || n.id).slice(0, 20);
        return `<g>
          <rect x="${x - 50}" y="${y - 14}" width="100" height="28" rx="6" fill="${c.bg}22" stroke="${c.bg}" stroke-width="1"/>
          <text x="${x}" y="${y + 5}" text-anchor="middle" font-family="monospace" font-size="10" fill="#e8e6f0">${label}</text>
        </g>`;
      }).join('\n');

      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="background:#07060f">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="rgba(92,91,232,0.8)"/>
    </marker>
  </defs>
  ${edgesSVG}
  ${nodesSVG}
</svg>`;

      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `dependency-graph-${Date.now()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden"
         style={{ background: '#07060f', border: '1px solid rgba(124,127,245,0.1)' }}>

      {/* Search bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ background: 'rgba(19,17,40,0.95)', border: '1px solid rgba(124,127,245,0.2)', backdropFilter: 'blur(8px)' }}>
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: '#4a476a' }} />
          <input
            value={searchVal}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search nodes…"
            className="bg-transparent outline-none text-[12px]"
            style={{ color: '#e8e6f0', width: '150px', border: 'none', boxShadow: 'none', background: 'transparent' }}
          />
          {searchVal && (
            <button onClick={() => { setSearchVal(''); setMatches([]); networkRef.current?.unselectAll(); }}
              style={{ color: '#4a476a' }}>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {matches.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]"
            style={{ background: 'rgba(19,17,40,0.95)', border: '1px solid rgba(124,127,245,0.15)', color: '#8b88a6' }}>
            <span>{matchIdx + 1}/{matches.length}</span>
            <button onClick={() => cycleMatch(-1)} className="px-1 hover:text-white">↑</button>
            <button onClick={() => cycleMatch(1)}  className="px-1 hover:text-white">↓</button>
          </div>
        )}
        {/* Stats */}
        <div className="hidden md:flex gap-2">
          {[`${stats.nodes} nodes`, `${stats.edges} edges`].map(t => (
            <span key={t} className="text-[10px] font-mono px-2 py-1 rounded-md"
              style={{ background:'rgba(19,17,40,0.9)', border:'1px solid rgba(124,127,245,0.12)', color:'#4a476a' }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        {[
          { icon: ZoomIn,    onClick: () => networkRef.current?.moveTo({ scale: (networkRef.current.getScale() || 1) * 1.3, animation: true }) },
          { icon: ZoomOut,   onClick: () => networkRef.current?.moveTo({ scale: (networkRef.current.getScale() || 1) * 0.75, animation: true }) },
          { icon: Maximize2, onClick: () => networkRef.current?.fit({ animation: { duration: 600 } }) },
        ].map(({ icon: Icon, onClick }) => (
          <button key={Icon.name} onClick={onClick}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(19,17,40,0.9)', border: '1px solid rgba(124,127,245,0.15)' }}>
            <Icon className="w-3.5 h-3.5 text-[#8b88a6] hover:text-white" />
          </button>
        ))}

        {/* Export dropdown */}
        <div className="relative group">
          <button
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(19,17,40,0.9)', border: '1px solid rgba(124,127,245,0.15)' }}
            title="Export graph">
            <Download className="w-3.5 h-3.5 text-[#8b88a6]" />
          </button>
          <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col gap-1 rounded-lg overflow-hidden"
            style={{ background: 'rgba(13,11,30,0.98)', border: '1px solid rgba(124,127,245,0.2)', minWidth: '100px' }}>
            <button onClick={exportPNG} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-left transition-colors hover:bg-white/5"
              style={{ color: '#8b88a6' }}>
              <Image className="w-3 h-3" /> PNG
            </button>
            <button onClick={exportSVG} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-left transition-colors hover:bg-white/5"
              style={{ color: '#8b88a6' }}>
              <Download className="w-3 h-3" /> SVG
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-xs">
        {LEGEND.map(l => (
          <span key={l.type} className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                style={{ background:'rgba(13,11,30,0.85)', border:'1px solid rgba(255,255,255,0.05)' }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: l.color }} />
            <span style={{ color: '#4a476a' }}>{l.type}</span>
          </span>
        ))}
      </div>

      {/* Selected node panel */}
      {selected && (
        <div className="absolute bottom-3 right-3 z-10 w-56 p-3 rounded-xl text-xs"
             style={{ background:'rgba(13,11,30,0.95)', border:'1px solid rgba(124,127,245,0.15)', backdropFilter:'blur(10px)' }}>
          <p className="font-semibold text-ink-400 mb-1 truncate">{selected.label}</p>
          <p className="text-[#4a476a] font-mono truncate mb-2 text-[10px]">{selected.filePath}</p>
          <p className="text-[#4a476a] mb-1 text-[10px]">Type: <span className="text-[#8b88a6]">{selected.type}</span></p>
          {selected.functions?.length > 0 && (
            <div>
              <p className="text-[#4a476a] mb-1 text-[10px]">Functions:</p>
              {selected.functions.slice(0, 4).map(f => (
                <span key={f} className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded mr-1 mb-1"
                      style={{ background:'rgba(92,91,232,0.1)', color:'#a3a9fc' }}>{f}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}