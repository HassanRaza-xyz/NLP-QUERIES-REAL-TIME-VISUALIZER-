import { motion } from 'framer-motion';

export default function Sidebar({ open, onToggle, views, visibleViews, onToggleView, onSetActive }) {
  return (
    <motion.aside
      animate={{ width: open ? 220 : 56 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="sticky top-0 h-screen z-40 glass-strong flex flex-col shrink-0"
    >
      {/* Toggle */}
      <button onClick={onToggle}
        className="w-full flex items-center justify-center h-14 border-b border-white/5 hover:bg-white/5 transition cursor-pointer">
        <motion.span animate={{ rotate: open ? 0 : 180 }} className="text-neon-cyan text-lg">
          {open ? '◀' : '▶'}
        </motion.span>
      </button>

      {/* Logo */}
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-3 border-b border-white/5">
          <h2 className="text-base font-bold bg-gradient-to-r from-neon-indigo to-neon-cyan bg-clip-text text-transparent">
            NLP Lab
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Visualizer & Learning Lab</p>
        </motion.div>
      )}

      {/* View toggles */}
      <div className="flex-1 overflow-y-auto py-3 space-y-1 px-1.5">
        {open && <p className="text-[9px] uppercase tracking-widest text-slate-500 px-2 mb-2">Visualizations</p>}
        {views.map((v) => {
          const active = visibleViews.includes(v.id);
          return (
            <button
              key={v.id}
              onClick={() => onToggleView(v.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer
                ${active
                  ? 'bg-neon-indigo/15 text-neon-cyan border border-neon-indigo/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'}`}
            >
              <span className="text-base shrink-0">{v.icon}</span>
              {open && <span className="truncate">{v.label}</span>}
              {open && (
                <span className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-neon-cyan shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'bg-slate-600'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {open && (
        <div className="px-4 py-3 border-t border-white/5 text-[9px] text-slate-600">
          Powered by spaCy · NLTK · D3.js
        </div>
      )}
    </motion.aside>
  );
}
