import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';

export default function DependencyTree({ data, onWordClick }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data?.tokens?.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { tokens, edges } = data;
    const width = Math.max(900, tokens.length * 130);
    const height = 400;
    const margin = { top: 60, bottom: 80, left: 60, right: 60 };
    const innerW = width - margin.left - margin.right;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g').attr('transform', `translate(${margin.left},0)`);

    // Token positions
    const xScale = d3.scalePoint()
      .domain(tokens.map((_, i) => i))
      .range([0, innerW])
      .padding(0.5);
    const baseY = height - margin.bottom;

    // Draw arcs for dependencies
    const arcG = g.append('g');
    edges.forEach((edge, idx) => {
      const x1 = xScale(edge.source);
      const x2 = xScale(edge.target);
      const midX = (x1 + x2) / 2;
      const dist = Math.abs(edge.source - edge.target);
      const arcH = 30 + dist * 28;

      const path = arcG.append('path')
        .attr('d', `M ${x1} ${baseY} Q ${midX} ${baseY - arcH} ${x2} ${baseY}`)
        .attr('fill', 'none')
        .attr('stroke', 'url(#arcGrad)')
        .attr('stroke-width', 1.8)
        .attr('opacity', 0);

      // Animate arc
      const totalLen = path.node().getTotalLength();
      path
        .attr('stroke-dasharray', totalLen)
        .attr('stroke-dashoffset', totalLen)
        .transition()
        .delay(300 + idx * 80)
        .duration(600)
        .attr('stroke-dashoffset', 0)
        .attr('opacity', 0.8);

      // Dep label on arc
      arcG.append('text')
        .attr('x', midX)
        .attr('y', baseY - arcH - 4)
        .attr('text-anchor', 'middle')
        .attr('fill', '#22d3ee')
        .attr('font-size', '9px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('opacity', 0)
        .text(edge.label)
        .transition()
        .delay(600 + idx * 80)
        .duration(400)
        .attr('opacity', 0.9);

      // Arrowhead
      arcG.append('circle')
        .attr('cx', x2).attr('cy', baseY - 3)
        .attr('r', 3)
        .attr('fill', '#6366f1')
        .attr('opacity', 0)
        .transition().delay(800 + idx * 80).duration(300).attr('opacity', 1);
    });

    // Gradient def
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'arcGrad');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#6366f1');
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#22d3ee');

    // Draw tokens
    tokens.forEach((tok, i) => {
      const x = xScale(i);
      const tokenG = g.append('g')
        .attr('transform', `translate(${x}, ${baseY})`)
        .style('cursor', 'pointer')
        .on('click', () => onWordClick?.(tok.text, tok.pos));

      // Word
      tokenG.append('text')
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('fill', '#e2e8f0')
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .text(tok.text)
        .attr('opacity', 0)
        .transition().delay(i * 60).duration(400).attr('opacity', 1);

      // POS tag
      tokenG.append('text')
        .attr('y', 38)
        .attr('text-anchor', 'middle')
        .attr('fill', '#a855f7')
        .attr('font-size', '10px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text(tok.pos)
        .attr('opacity', 0)
        .transition().delay(100 + i * 60).duration(400).attr('opacity', 0.8);

      // Root indicator
      if (tok.is_root) {
        tokenG.append('circle')
          .attr('cy', -8).attr('r', 4)
          .attr('fill', '#22d3ee')
          .attr('opacity', 0)
          .transition().delay(200).duration(500).attr('opacity', 1);
      }

      // Hover effect
      tokenG.on('mouseenter', function () {
        d3.select(this).select('text').attr('fill', '#22d3ee');
      }).on('mouseleave', function () {
        d3.select(this).select('text').attr('fill', '#e2e8f0');
      });
    });
  }, [data, onWordClick]);

  return (
    <motion.div layout className="glass rounded-2xl p-8 glow-indigo">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🌳</span>
        <h2 className="text-xl font-bold text-white">Dependency Tree</h2>
        <span className="text-xs text-slate-500 font-mono ml-auto">click words to explore WordNet</span>
      </div>
      <div className="overflow-x-auto">
        <svg ref={svgRef} className="w-full min-h-[380px]" />
      </div>
      {/* Entity badges */}
      {data?.entities?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
          <span className="text-xs text-slate-500">Entities:</span>
          {data.entities.map((e, i) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-neon-emerald/15 text-neon-emerald border border-neon-emerald/20">
              {e.text} <span className="text-[10px] opacity-60">({e.label})</span>
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
