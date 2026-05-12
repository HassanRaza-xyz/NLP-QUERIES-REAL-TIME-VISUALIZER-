import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const GROUP_COLORS = { center: '#3b82f6', synonym: '#22d3ee', antonym: '#f87171', hypernym: '#a78bfa', hyponym: '#34d399' };
const REL_INFO = {
  synonym: { label: 'Synonyms', icon: '↔' },
  antonym: { label: 'Antonyms', icon: '⇋' },
  hypernym: { label: 'Hypernyms', icon: '↑' },
  hyponym: { label: 'Hyponyms', icon: '↓' },
};

export default function WordNetGraph({ data }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data?.found || !data.graph?.nodes?.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const rect = containerRef.current?.getBoundingClientRect();
    const width = rect?.width || 700, height = 380;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const nodes = data.graph.nodes.map(n => ({ ...n }));
    const links = data.graph.links.map(l => ({ ...l }));

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(35));

    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', e => g.attr('transform', e.transform)));

    const link = g.selectAll('.link').data(links).join('line')
      .attr('stroke', d => GROUP_COLORS[d.relation] || '#3b82f6')
      .attr('stroke-width', 1.5).attr('stroke-opacity', 0.3)
      .attr('stroke-dasharray', d => d.relation === 'antonym' ? '5,3' : 'none');

    const linkLabel = g.selectAll('.ll').data(links).join('text')
      .attr('font-size', '9px').attr('fill', '#64748b').attr('text-anchor', 'middle')
      .attr('font-family', "'JetBrains Mono', monospace").text(d => d.relation);

    const node = g.selectAll('.node').data(nodes).join('g')
      .call(d3.drag().on('start', (e,d) => { if(!e.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on('drag', (e,d) => { d.fx=e.x; d.fy=e.y; })
        .on('end', (e,d) => { if(!e.active) sim.alphaTarget(0); d.fx=null; d.fy=null; }));

    node.append('circle').attr('r', d => d.group === 'center' ? 20 : 14)
      .attr('fill', d => GROUP_COLORS[d.group] + '18')
      .attr('stroke', d => GROUP_COLORS[d.group]).attr('stroke-width', 1.5);

    node.append('text').attr('dy', d => d.group === 'center' ? 32 : 26)
      .attr('text-anchor', 'middle').attr('fill', '#d8e3fb')
      .attr('font-size', d => d.group === 'center' ? '12px' : '10px')
      .attr('font-weight', d => d.group === 'center' ? '600' : '400')
      .text(d => d.label);

    sim.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      linkLabel.attr('x', d => (d.source.x+d.target.x)/2).attr('y', d => (d.source.y+d.target.y)/2 - 5);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    return () => sim.stop();
  }, [data]);

  if (!data?.found) {
    return (
      <div className="card p-6">
        <h2 className="text-base font-semibold text-text mb-2">WordNet Explorer</h2>
        <p className="text-sm text-text-muted">
          {data ? `No entry found for "${data.word}". Click a word in the tree.` : 'Click a word in the dependency tree to explore.'}
        </p>
      </div>
    );
  }

  const synset = data.synsets?.[0];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-text">WordNet: <span className="text-primary">{data.word}</span></h2>
      </div>

      {/* 2x2 Relation Grid */}
      {synset && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {['synonym', 'antonym', 'hypernym', 'hyponym'].map(rel => {
            const info = REL_INFO[rel];
            const items = synset[rel + 's'] || [];
            return (
              <div key={rel} className={`p-3 rounded-lg rel-${rel}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="font-mono text-xs">{info.icon}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide">{info.label}</span>
                </div>
                {items.length > 0 ? items.map((w, i) => (
                  <p key={i} className="text-sm font-medium text-text py-0.5">{w}</p>
                )) : <p className="text-[11px] opacity-50 italic">None found</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 mb-3 text-[11px]">
        {Object.entries(GROUP_COLORS).filter(([k]) => k !== 'center').map(([k, c]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: c }} />
            <span className="text-text-muted capitalize">{k}</span>
          </span>
        ))}
      </div>

      <div ref={containerRef} className="overflow-hidden rounded-lg border border-border">
        <svg ref={svgRef} className="w-full" style={{ height: 380 }} />
      </div>

      {data.synsets?.length > 0 && (
        <div className="mt-4 space-y-2 max-h-44 overflow-y-auto">
          {data.synsets.map((ss, i) => (
            <div key={i} className="p-3 rounded-lg bg-surface-2 border border-border">
              <p className="text-[11px] font-mono text-primary/70 mb-1">{ss.name} ({ss.pos})</p>
              <p className="text-sm text-text-secondary">{ss.definition}</p>
              {ss.examples?.length > 0 && <p className="text-[11px] text-text-muted mt-1 italic">"{ss.examples[0]}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
