import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export default function DependencyTree({ data, onWordClick }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data?.tokens?.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { tokens, edges } = data;
    const width = Math.max(900, tokens.length * 120);
    const height = 360;
    const margin = { top: 50, bottom: 70, left: 50, right: 50 };
    const innerW = width - margin.left - margin.right;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');
    const g = svg.append('g').attr('transform', `translate(${margin.left},0)`);

    const xScale = d3.scalePoint().domain(tokens.map((_, i) => i)).range([0, innerW]).padding(0.5);
    const baseY = height - margin.bottom;

    // Arcs
    edges.forEach(edge => {
      const x1 = xScale(edge.source), x2 = xScale(edge.target);
      const midX = (x1 + x2) / 2;
      const dist = Math.abs(edge.source - edge.target);
      const arcH = 25 + dist * 25;

      g.append('path')
        .attr('d', `M ${x1} ${baseY} Q ${midX} ${baseY - arcH} ${x2} ${baseY}`)
        .attr('fill', 'none').attr('stroke', '#3b82f6').attr('stroke-width', 1.2).attr('opacity', 0.5);

      g.append('text')
        .attr('x', midX).attr('y', baseY - arcH - 3)
        .attr('text-anchor', 'middle').attr('fill', '#64748b')
        .attr('font-size', '9px').attr('font-family', "'JetBrains Mono', monospace")
        .text(edge.label);

      g.append('circle').attr('cx', x2).attr('cy', baseY - 2).attr('r', 2.5).attr('fill', '#3b82f6');
    });

    // Tokens
    tokens.forEach((tok, i) => {
      const x = xScale(i);
      const tg = g.append('g').attr('transform', `translate(${x}, ${baseY})`).style('cursor', 'pointer')
        .on('click', () => onWordClick?.(tok.text, tok.pos));

      tg.append('text').attr('y', 18).attr('text-anchor', 'middle').attr('fill', '#d8e3fb')
        .attr('font-size', '13px').attr('font-weight', '500').text(tok.text);

      tg.append('text').attr('y', 34).attr('text-anchor', 'middle').attr('fill', '#64748b')
        .attr('font-size', '10px').attr('font-family', "'JetBrains Mono', monospace").text(tok.pos);

      if (tok.is_root) {
        tg.append('circle').attr('cy', -6).attr('r', 3).attr('fill', '#3b82f6');
      }

      tg.on('mouseenter', function() { d3.select(this).select('text').attr('fill', '#3b82f6'); })
        .on('mouseleave', function() { d3.select(this).select('text').attr('fill', '#d8e3fb'); });
    });
  }, [data, onWordClick]);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-text">Dependency Tree</h2>
        <span className="text-[11px] text-text-muted font-mono">click words → WordNet</span>
      </div>
      <div className="overflow-x-auto">
        <svg ref={svgRef} className="w-full min-h-[340px]" />
      </div>
      {data?.entities?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border">
          <span className="text-[11px] text-text-muted mr-1">Entities:</span>
          {data.entities.map((e, i) => (
            <span key={i} className="badge text-[11px]">{e.text} <span className="opacity-60">({e.label})</span></span>
          ))}
        </div>
      )}
    </div>
  );
}
