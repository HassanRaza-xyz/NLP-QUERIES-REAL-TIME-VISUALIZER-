import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';

const GROUP_COLORS = {
  center: '#6366f1', synonym: '#22d3ee', antonym: '#fb7185',
  hypernym: '#a855f7', hyponym: '#34d399',
};

export default function WordNetGraph({ data }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data?.found || !data.graph?.nodes?.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = containerRef.current?.getBoundingClientRect();
    const width = rect?.width || 700;
    const height = 450;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const nodes = data.graph.nodes.map(n => ({ ...n }));
    const links = data.graph.links.map(l => ({ ...l }));

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(35));

    const g = svg.append('g');

    // Zoom
    svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', (e) => g.attr('transform', e.transform)));

    // Links
    const link = g.selectAll('.link')
      .data(links).join('line')
      .attr('stroke', d => GROUP_COLORS[d.relation === 'antonym' ? 'antonym' : 'synonym'] || '#6366f1')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4);

    // Link labels
    const linkLabel = g.selectAll('.link-label')
      .data(links).join('text')
      .attr('font-size', '8px')
      .attr('fill', '#94a3b8')
      .attr('text-anchor', 'middle')
      .attr('font-family', "'JetBrains Mono', monospace")
      .text(d => d.relation);

    // Nodes
    const node = g.selectAll('.node')
      .data(nodes).join('g')
      .call(d3.drag().on('start', dragStart).on('drag', dragging).on('end', dragEnd));

    node.append('circle')
      .attr('r', d => d.group === 'center' ? 22 : 14)
      .attr('fill', d => GROUP_COLORS[d.group] + '33')
      .attr('stroke', d => GROUP_COLORS[d.group])
      .attr('stroke-width', d => d.group === 'center' ? 2.5 : 1.5);

    node.append('text')
      .attr('dy', d => d.group === 'center' ? 36 : 26)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .attr('font-size', d => d.group === 'center' ? '13px' : '10px')
      .attr('font-weight', d => d.group === 'center' ? '700' : '400')
      .text(d => d.label);

    sim.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      linkLabel.attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 4);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragStart(e, d) { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
    function dragging(e, d) { d.fx = e.x; d.fy = e.y; }
    function dragEnd(e, d) { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }

    return () => sim.stop();
  }, [data]);

  if (!data?.found) {
    return (
      <motion.div layout className="glass rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-2">🔗 WordNet Explorer</h2>
        <p className="text-slate-400 text-sm">
          {data ? `No WordNet entry found for "${data.word}". Click a word in the dependency tree.` : 'Click a word in the dependency tree to explore its semantic relations.'}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div layout className="glass rounded-2xl p-8 glow-cyan">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-2xl">🔗</span>
        <h2 className="text-xl font-bold text-white">WordNet: <span className="text-neon-cyan">{data.word}</span></h2>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {Object.entries(GROUP_COLORS).filter(([k]) => k !== 'center').map(([k, c]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            <span className="text-slate-400 capitalize">{k}</span>
          </span>
        ))}
      </div>
      <div ref={containerRef} className="overflow-hidden rounded-xl border border-white/5">
        <svg ref={svgRef} className="w-full" style={{ height: 450 }} />
      </div>
      {/* Synset definitions */}
      {data.synsets?.length > 0 && (
        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
          {data.synsets.map((ss, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-xs font-mono text-neon-indigo/70 mb-1">{ss.name} ({ss.pos})</p>
              <p className="text-sm text-slate-300">{ss.definition}</p>
              {ss.examples?.length > 0 && (
                <p className="text-xs text-slate-500 mt-1 italic">"{ss.examples[0]}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
