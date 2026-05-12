import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const NODE_COLORS = {
  S: '#3b82f6', NP: '#22d3ee', VP: '#a78bfa', PP: '#34d399',
  ADJP: '#f59e0b', ADVP: '#f87171', DET: '#64748b', NOUN: '#22d3ee',
  VERB: '#a78bfa', ADJ: '#f59e0b', ADV: '#f87171', ADP: '#34d399',
  PROPN: '#22d3ee', PRON: '#22d3ee', AUX: '#a78bfa', PUNCT: '#475569',
};

function treeToHierarchy(node) {
  if (!node) return null;
  const result = { name: node.label, prob: node.prob };
  if (node.children?.length) result.children = node.children.map(treeToHierarchy).filter(Boolean);
  return result;
}

export default function ConstituencyTree({ data, mode }) {
  const svgRef = useRef(null);
  const isPCFG = mode === 'pcfg';

  useEffect(() => {
    if (!data?.tree) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const hierarchy = treeToHierarchy(data.tree);
    if (!hierarchy) return;

    const root = d3.hierarchy(hierarchy);
    const width = Math.max(700, root.leaves().length * 85);
    const height = Math.max(400, root.height * 85 + 140);

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');
    const treeLayout = d3.tree().size([width - 80, height - 140]);
    treeLayout(root);
    const g = svg.append('g').attr('transform', 'translate(40, 50)');

    // Links
    g.selectAll('.link').data(root.links()).join('path')
      .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y))
      .attr('fill', 'none').attr('stroke', '#334155').attr('stroke-width', 1.2);

    // PCFG labels
    if (isPCFG) {
      g.selectAll('.prob').data(root.links().filter(l => l.target.data.prob != null)).join('text')
        .attr('x', d => (d.source.x + d.target.x) / 2 + 8)
        .attr('y', d => (d.source.y + d.target.y) / 2)
        .attr('fill', '#f59e0b').attr('font-size', '9px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text(d => d.target.data.prob?.toFixed(2));
    }

    // Nodes
    const node = g.selectAll('.node').data(root.descendants()).join('g')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    node.append('rect').attr('rx', 4).attr('ry', 4)
      .attr('x', d => d.children ? -22 : -18).attr('y', -11)
      .attr('width', d => d.children ? 44 : 36).attr('height', 22)
      .attr('fill', d => (NODE_COLORS[d.data.name] || '#3b82f6') + '15')
      .attr('stroke', d => (NODE_COLORS[d.data.name] || '#3b82f6') + '30').attr('stroke-width', 1);

    node.append('text').attr('text-anchor', 'middle').attr('dy', 4)
      .attr('fill', d => d.children ? (NODE_COLORS[d.data.name] || '#3b82f6') : '#d8e3fb')
      .attr('font-size', d => d.children ? '11px' : '10px')
      .attr('font-weight', d => d.children ? '600' : '400')
      .attr('font-family', d => d.children ? "'Inter', sans-serif" : "'JetBrains Mono', monospace")
      .text(d => d.data.name);
  }, [data, isPCFG]);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-text">{isPCFG ? 'PCFG Parse Tree' : 'Constituency Tree'}</h2>
        {isPCFG && <span className="text-[11px] font-mono text-warning/70">probabilities on branches</span>}
      </div>
      <div className="overflow-x-auto">
        <svg ref={svgRef} className="w-full min-h-[380px]" />
      </div>
    </div>
  );
}
