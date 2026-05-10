import { useState } from 'react';
import { motion } from 'framer-motion';

const EXAMPLES = [
  "The quick brown fox jumps over the lazy dog",
  "Hassan is eating an apple in the garden",
  "She gave him the book that was on the table",
  "The scientists discovered a new species of butterfly",
  "Running quickly through the forest was exhilarating",
];

export default function SentenceInput({ onAnalyze, loading }) {
  const [text, setText] = useState('');

  const submit = () => { if (text.trim() && !loading) onAnalyze(text.trim()); };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="w-full max-w-2xl"
    >
      <div className="glass rounded-2xl p-1.5 glow-indigo">
        <div className="flex items-center">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Type an English sentence..."
            className="flex-1 bg-transparent px-5 py-4 text-white placeholder-slate-500 outline-none text-lg font-light"
          />
          <button
            onClick={submit}
            disabled={loading || !text.trim()}
            className="px-6 py-3 mr-1 rounded-xl bg-gradient-to-r from-neon-indigo to-neon-cyan text-white font-semibold
              hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all disabled:opacity-40 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing
              </span>
            ) : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Example chips */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {EXAMPLES.map((ex, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.08 }}
            onClick={() => { setText(ex); onAnalyze(ex); }}
            className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-slate-400
              hover:border-neon-indigo/40 hover:text-neon-cyan hover:bg-neon-indigo/10 transition-all cursor-pointer"
          >
            {ex.length > 40 ? ex.slice(0, 40) + '…' : ex}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
