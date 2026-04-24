import { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

const TYPE_COLORS = {
  route: '#3b82f6',
  service: '#10b981',
  model: '#f59e0b',
  middleware: '#8b5cf6',
  utility: '#6b7280',
  test: '#ef4444',
  entry: '#ec4899',
  module: '#64748b'
};

export default function DependencyGraph({ graphData, onNodeClick }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  useEffect(() => {
    if (!graphData || !containerRef.current) return;

    const nodes = new DataSet(graphData.nodes.map(n => ({
      id: n.id,
      label: n.label,
      title: `${n.filePath}\nFunctions: ${(n.functions || []).join(', ')}`,
      color: {
        background: TYPE_COLORS[n.type] || '#64748b',
        border: '#1e293b',
        highlight: { background: '#f8fafc', border: '#3b82f6' }
      },
      font: { color: '#f8fafc', size: 12 },
      shape: 'box',
      borderWidth: 1
    })));

    const edges = new DataSet(graphData.edges.map((e, i) => ({
      id: i,
      from: e.from,
      to: e.to,
      arrows: 'to',
      color: { color: '#334155', opacity: 0.7 },
      width: 1
    })));

    const options = {
      layout: { hierarchical: { enabled: false } },
      physics: {
        stabilization: true,
        barnesHut: { gravitationalConstant: -5000, springLength: 150 }
      },
      interaction: { hover: true, tooltipDelay: 200 },
      nodes: { borderRadius: 4 }
    };

    if (networkRef.current) networkRef.current.destroy();
    networkRef.current = new Network(containerRef.current, { nodes, edges }, options);

    networkRef.current.on('click', params => {
      if (params.nodes.length > 0 && onNodeClick) {
        onNodeClick(params.nodes[0]);
      }
    });

    return () => networkRef.current?.destroy();
  }, [graphData]);

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-950 rounded-xl border border-gray-800" />
  );
}