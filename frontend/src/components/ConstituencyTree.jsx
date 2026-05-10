import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';

const NODE_COLORS = {
  S: '#6366f1', NP: '#22d3ee', VP: '#a855f7', PP: '#34d399',
  ADJP: '#fbbf24', ADVP: '#fb7185', DET: '#64748b', NOUN: '#22d3ee',
  VERB: '#a855f7', ADJ: '#fbbf24', ADV: '#fb7185', ADP: '#34d399',
  PROPN: '#22d3ee', PRON: '#22d3ee', AUX: '#a855f7', PUNCT: '#475569',
};

function treeToHierarchy(node) {
  if (!node) return null;
  const result = { name: node.label, prob: node.prob };
  if (node.children?.length) {
    result.children = node.children.map(treeToHierarchy).filter(Boolean);
  }
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
    const width = Math.max(700, root.leaves().length * 90);
    const height = Math.max(420, root.height * 90 + 160);

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');

    const treeLayout = d3.tree().size([width - 80, height - 140]);
    treeLayout(root);

    const g = svg.append('g').attr('transform', 'translate(40, 50)');

    // Gradient defs
    const defs = svg.append('defs');
    const lg = defs.append('linearGradient').attr('id', 'linkGrad2');
    lg.append('stop').attr('offset', '0%').attr('stop-color', '#6366f1').attr('stop-opacity', 0.6);
    lg.append('stop').attr('offset', '100%').attr('stop-color', '#22d3ee').attr('stop-opacity', 0.6);

    // Links
    g.selectAll('.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y))
      .attr('fill', 'none')
      .attr('stroke', 'url(#linkGrad2)')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0)
      .each(function () {
        const len = this.getTotalLength();
        d3.select(this).attr('stroke-dasharray', len).attr('stroke-dashoffset', len);
      })
      .transition()
      .delay((_, i) => i * 60)
      .duration(500)
      .attr('stroke-dashoffset', 0)
      .attr('opacity', 0.7);

    // PCFG probability labels on edges
    if (isPCFG) {
      g.selectAll('.prob-label')
        .data(root.links().filter(l => l.target.data.prob != null))
        .join('text')
        .attr('class', 'prob-label')
        .attr('x', d => (d.source.x + d.target.x) / 2 + 8)
        .attr('y', d => (d.source.y + d.target.y) / 2)
        .attr('fill', '#fbbf24')
        .attr('font-size', '9px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('opacity', 0)
        .text(d => d.target.data.prob?.toFixed(2))
        .transition().delay((_, i) => 400 + i * 60).duration(400).attr('opacity', 0.85);
    }

    // Nodes
    const node = g.selectAll('.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    // Background pill
    node.append('rect')
      .attr('rx', d => d.children ? 10 : 6)
      .attr('ry', d => d.children ? 10 : 6)
      .attr('x', d => d.children ? -24 : -20)
      .attr('y', -12)
      .attr('width', d => d.children ? 48 : 40)
      .attr('height', 24)
      .attr('fill', d => {
        const c = NODE_COLORS[d.data.name] || '#6366f1';
        return d.children ? c + '22' : c + '15';
      })
      .attr('stroke', d => (NODE_COLORS[d.data.name] || '#6366f1') + '44')
      .attr('stroke-width', 1)
      .attr('opacity', 0)
      .transition().delay((_, i) => 200 + i * 40).duration(400).attr('opacity', 1);

    // Label
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', d => {
        if (!d.children) return '#e2e8f0';
        return NODE_COLORS[d.data.name] || '#6366f1';
      })
      .attr('font-size', d => d.children ? '12px' : '11px')
      .attr('font-weight', d => d.children ? '700' : '400')
      .attr('font-family', d => d.children ? "'Inter', sans-serif" : "'JetBrains Mono', monospace")
      .text(d => d.data.name)
      .attr('opacity', 0)
      .transition().delay((_, i) => 250 + i * 40).duration(400).attr('opacity', 1);

  }, [data, isPCFG]);

  return (
    <motion.div layout className="glass rounded-2xl p-8 glow-indigo">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{isPCFG ? '📊' : '🏗️'}</span>
        <h2 className="text-xl font-bold text-white">
          {isPCFG ? 'PCFG Parse Tree' : 'Constituency Tree'}
        </h2>
        {isPCFG && (
          <span className="text-xs font-mono text-neon-amber/70 ml-auto">probabilities shown on branches</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <svg ref={svgRef} className="w-full min-h-[400px]" />
      </div>
    </motion.div>
  );
}
