import { useState } from 'react';

const EXAMPLES = [
  "The quick brown fox jumps over the lazy dog",
  "Hassan is eating an apple in the garden",
  "She gave him the book that was on the table",
  "The scientists discovered a new species of butterfly",
];

export default function SentenceInput({ onAnalyze, loading }) {
  const [text, setText] = useState('');
  const submit = () => { if (text.trim() && !loading) onAnalyze(text.trim()); };

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center gap-2">
        <input
          type="text" value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Type an English sentence..."
          className="flex-1 input-field px-4 py-2.5 text-sm text-text placeholder-text-muted"
        />
        <button onClick={submit} disabled={loading || !text.trim()}
          className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing
            </>
          ) : 'Analyze'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {EXAMPLES.map((ex, i) => (
          <button key={i} onClick={() => { setText(ex); onAnalyze(ex); }}
            className="text-[11px] px-2.5 py-1 rounded border border-border text-text-muted
              hover:border-border-hover hover:text-text-secondary transition-colors cursor-pointer">
            {ex.length > 40 ? ex.slice(0, 40) + '…' : ex}
          </button>
        ))}
      </div>
    </div>
  );
}
