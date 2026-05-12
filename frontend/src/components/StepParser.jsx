import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

function TokensView({ data }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {data.map((t, i) => (
        <span key={i} className="px-2.5 py-1 rounded badge-primary font-mono text-sm">{t}</span>
      ))}
    </div>
  );
}

function POSView({ data }) {
  return (
    <div className="flex flex-wrap gap-2">
      {data.map((t, i) => (
        <div key={i} className="flex flex-col items-center px-3 py-2 rounded-lg bg-surface-2 border border-border">
          <span className="text-sm font-medium text-text">{t.text}</span>
          <span className="text-[10px] font-mono text-hypernym mt-1">{t.pos}</span>
        </div>
      ))}
    </div>
  );
}

function ChunksView({ data }) {
  return (
    <div className="space-y-1.5">
      {data.map((c, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border">
          <span className="badge-primary text-[11px] font-mono px-2 py-0.5 rounded">NP</span>
          <span className="text-sm text-text">{c.text}</span>
          <span className="text-[10px] text-text-muted ml-auto">root: {c.root}</span>
        </div>
      ))}
    </div>
  );
}

function DepsView({ data }) {
  return (
    <div className="space-y-1">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="text-primary font-medium">{d.child}</span>
          <span className="text-text-muted">→</span>
          <span className="badge text-[10px] font-mono">{d.relation}</span>
          <span className="text-text-muted">→</span>
          <span className="text-success font-medium">{d.head}</span>
        </div>
      ))}
    </div>
  );
}

function SubtreesView({ data }) {
  return (
    <div className="space-y-1.5">
      {data.map((s, i) => (
        <div key={i} className="p-3 rounded-lg bg-surface-2 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-warning">{s.dep}</span>
            <span className="text-[11px] text-text-muted">head: {s.head}</span>
          </div>
          <p className="text-sm text-text font-mono">[{s.subtree}]</p>
        </div>
      ))}
    </div>
  );
}

function TreePreview({ data }) {
  function renderNode(node, depth = 0) {
    if (!node) return null;
    const indent = '  '.repeat(depth);
    const isLeaf = !node.children?.length || (node.children.length === 1 && !node.children[0].children?.length);
    if (isLeaf && node.children?.length === 1) {
      return <div className="text-xs font-mono"><span className="text-primary">{indent}({node.label}</span> <span className="text-text">{node.children[0].label}</span><span className="text-primary">)</span></div>;
    }
    return (
      <div>
        <div className="text-xs font-mono text-primary">{indent}({node.label}</div>
        {node.children?.map((c, i) => <div key={i}>{renderNode(c, depth + 1)}</div>)}
        <div className="text-xs font-mono text-primary">{indent})</div>
      </div>
    );
  }
  return <div className="p-4 rounded-lg bg-base overflow-x-auto max-h-56 overflow-y-auto border border-border">{renderNode(data)}</div>;
}

const RENDERERS = { tokens: TokensView, pos: POSView, chunks: ChunksView, deps: DepsView, subtrees: SubtreesView, tree: TreePreview };

export default function StepParser({ data }) {
  const [step, setStep] = useState(0);
  if (!data?.steps?.length) return null;

  const steps = data.steps;
  const cur = steps[step];
  const Renderer = RENDERERS[cur.type] || (() => <pre className="text-xs">{JSON.stringify(cur.data, null, 2)}</pre>);

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-text mb-4">Step-by-Step Parser</h2>
      {/* Steps */}
      <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <button key={i} onClick={() => setStep(i)}
            className={`px-3 py-1.5 rounded text-[12px] whitespace-nowrap transition-all cursor-pointer
              ${i === step ? 'bg-primary-muted text-primary font-medium' : 'text-text-muted hover:text-text hover:bg-surface-2'}`}>
            {s.title}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-text">{cur.title}</h3>
            <p className="text-[12px] text-text-muted mt-0.5">{cur.description}</p>
          </div>
          <Renderer data={cur.data} />
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between mt-5 pt-4 border-t border-border">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          className="btn-secondary px-4 py-1.5 text-sm disabled:opacity-30">← Previous</button>
        <span className="text-[11px] text-text-muted self-center">{step + 1} / {steps.length}</span>
        <button onClick={() => setStep(Math.min(steps.length - 1, step + 1))} disabled={step === steps.length - 1}
          className="btn-primary px-4 py-1.5 text-sm disabled:opacity-30">Next →</button>
      </div>
    </div>
  );
}
