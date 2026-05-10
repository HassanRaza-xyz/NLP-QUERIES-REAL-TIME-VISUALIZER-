import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEP_ICONS = ['✂️', '🏷️', '📦', '🔗', '🌲', '✅'];

function TokensView({ data }) {
  return (
    <div className="flex flex-wrap gap-2">
      {data.map((t, i) => (
        <motion.span key={i} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.06 }}
          className="px-3 py-1.5 rounded-lg bg-neon-indigo/15 text-neon-cyan border border-neon-indigo/20 font-mono text-sm">
          {t}
        </motion.span>
      ))}
    </div>
  );
}

function POSView({ data }) {
  return (
    <div className="flex flex-wrap gap-2">
      {data.map((t, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex flex-col items-center px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
          <span className="text-sm font-semibold text-white">{t.text}</span>
          <span className="text-[10px] font-mono text-neon-violet mt-1">{t.pos}</span>
        </motion.div>
      ))}
    </div>
  );
}

function ChunksView({ data }) {
  return (
    <div className="space-y-2">
      {data.map((c, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/10">
          <span className="text-xs font-mono text-neon-cyan bg-neon-cyan/10 px-2 py-0.5 rounded">NP</span>
          <span className="text-sm text-white">{c.text}</span>
          <span className="text-[10px] text-slate-500 ml-auto">root: {c.root}</span>
        </motion.div>
      ))}
    </div>
  );
}

function DepsView({ data }) {
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => (
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-center gap-2 text-sm">
          <span className="text-neon-cyan font-semibold">{d.child}</span>
          <span className="text-slate-600">→</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neon-violet/10 text-neon-violet border border-neon-violet/20">
            {d.relation}
          </span>
          <span className="text-slate-600">→</span>
          <span className="text-neon-emerald font-semibold">{d.head}</span>
        </motion.div>
      ))}
    </div>
  );
}

function SubtreesView({ data }) {
  return (
    <div className="space-y-2">
      {data.map((s, i) => (
        <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-neon-amber">{s.dep}</span>
            <span className="text-xs text-slate-500">head: {s.head}</span>
          </div>
          <p className="text-sm text-white font-mono">[{s.subtree}]</p>
        </motion.div>
      ))}
    </div>
  );
}

function TreePreview({ data }) {
  function renderNode(node, depth = 0) {
    if (!node) return null;
    const indent = '  '.repeat(depth);
    const hasChildren = node.children?.length > 0;
    const isLeaf = !hasChildren || (node.children.length === 1 && !node.children[0].children?.length);

    if (isLeaf && node.children?.length === 1) {
      return <div className="text-xs font-mono"><span className="text-neon-indigo">{indent}({node.label}</span> <span className="text-white">{node.children[0].label}</span><span className="text-neon-indigo">)</span></div>;
    }
    return (
      <div>
        <div className="text-xs font-mono text-neon-indigo">{indent}({node.label}</div>
        {node.children?.map((c, i) => <div key={i}>{renderNode(c, depth + 1)}</div>)}
        <div className="text-xs font-mono text-neon-indigo">{indent})</div>
      </div>
    );
  }
  return <div className="p-4 rounded-lg bg-dark-900/50 overflow-x-auto max-h-60 overflow-y-auto">{renderNode(data)}</div>;
}

const STEP_RENDERERS = {
  tokens: TokensView, pos: POSView, chunks: ChunksView,
  deps: DepsView, subtrees: SubtreesView, tree: TreePreview,
};

export default function StepParser({ data }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!data?.steps?.length) return null;
  const steps = data.steps;
  const step = steps[currentStep];
  const Renderer = STEP_RENDERERS[step.type] || (() => <pre className="text-xs">{JSON.stringify(step.data, null, 2)}</pre>);

  return (
    <motion.div layout className="glass rounded-2xl p-8 glow-indigo">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">👣</span>
        <h2 className="text-xl font-bold text-white">Step-by-Step Parser</h2>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <button key={i} onClick={() => setCurrentStep(i)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer
              ${i === currentStep
                ? 'bg-neon-indigo/20 text-neon-cyan border border-neon-indigo/30'
                : i < currentStep
                  ? 'bg-white/[0.03] text-slate-400 border border-transparent'
                  : 'text-slate-600 border border-transparent'}`}>
            <span>{STEP_ICONS[i] || '🔹'}</span>
            <span className="hidden sm:inline">{s.title}</span>
            <span className="sm:hidden">S{i + 1}</span>
          </button>
        ))}
      </div>

      {/* Current step */}
      <AnimatePresence mode="wait">
        <motion.div key={currentStep} initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
            <p className="text-sm text-slate-400 mt-1">{step.description}</p>
          </div>
          <Renderer data={step.data} />
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-4 border-t border-white/5">
        <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}
          className="px-4 py-2 rounded-lg text-sm border border-white/10 text-slate-400 hover:text-white hover:border-neon-indigo/30 transition disabled:opacity-30 cursor-pointer">
          ← Previous
        </button>
        <span className="text-xs text-slate-500 self-center">Step {currentStep + 1} of {steps.length}</span>
        <button onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))} disabled={currentStep === steps.length - 1}
          className="px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-neon-indigo to-neon-cyan text-white hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition disabled:opacity-30 cursor-pointer">
          Next Step →
        </button>
      </div>
    </motion.div>
  );
}
