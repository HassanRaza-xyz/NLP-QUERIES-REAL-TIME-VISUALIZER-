import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../api';

const CATEGORY_ICONS = { Logic: '◇', Vocabulary: '◆', 'Common Sense': '○', Language: '□' };

export default function CommonSenseQuiz({ onBack }) {
  const [phase, setPhase] = useState('intro');
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const startQuiz = async () => {
    setLoading(true);
    try {
      const resp = await api.getQuiz();
      setQuestions(resp.data.questions);
      setPhase('quiz');
      setCurrentQ(0);
      setAnswers({});
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const selectAnswer = (idx) => {
    setAnswers(prev => ({ ...prev, [questions[currentQ].id]: idx }));
    if (currentQ < questions.length - 1) setTimeout(() => setCurrentQ(currentQ + 1), 300);
  };

  const submitQuiz = async () => {
    setLoading(true);
    try {
      const resp = await api.submitQuiz(answers);
      setResults(resp.data);
      setPhase('results');
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#081425' }}>
        <button onClick={onBack} className="absolute top-6 left-6 btn-secondary px-3 py-1.5 text-sm">← Back</button>
        <div className="text-center max-w-lg">
          <div className="text-6xl mb-5">🧠</div>
          <h1 className="text-3xl font-semibold text-text tracking-tight mb-2">Common Sense Lab</h1>
          <p className="text-text-muted text-sm mb-1">Think you're smart? <span className="text-error">That's adorable.</span></p>
          <p className="text-text-muted text-[12px] mb-8 max-w-sm mx-auto">
            A brutally honest quiz that tests your common sense, vocabulary, and logic — then roasts you for it.
          </p>
          <button onClick={startQuiz} disabled={loading} className="btn-primary px-8 py-3 text-sm font-medium">
            {loading ? 'Loading...' : 'Start Quiz →'}
          </button>
          <div className="flex justify-center gap-5 mt-8 text-[11px] text-text-muted">
            <span>8 Questions</span><span>·</span><span>IQ Score</span><span>·</span><span>Sarcastic Feedback</span>
          </div>
        </div>
      </div>
    );
  }

  // ── QUIZ ──
  if (phase === 'quiz') {
    const q = questions[currentQ];
    const progress = (Object.keys(answers).length / questions.length) * 100;
    const allDone = Object.keys(answers).length === questions.length;

    return (
      <div className="min-h-screen flex flex-col px-6 py-6 max-w-2xl mx-auto" style={{ background: '#081425' }}>
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-sm text-text-muted hover:text-text transition cursor-pointer">← Exit</button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-text-muted">{currentQ + 1}/{questions.length}</span>
            <span className="badge">{CATEGORY_ICONS[q?.category]} {q?.category}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="w-full h-1 rounded-full bg-surface-3 mb-8 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentQ} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
            <h2 className="text-xl font-semibold text-text mb-6 leading-relaxed">{q?.question}</h2>
            <div className="space-y-2">
              {q?.options.map((opt, i) => {
                const selected = answers[q.id] === i;
                return (
                  <button key={i} onClick={() => !answers[q.id] && selectAnswer(i)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all cursor-pointer flex items-center gap-3
                      ${selected ? 'bg-primary-muted border-primary/30 text-text' : 'bg-surface border-border text-text-secondary hover:border-border-hover hover:text-text'}`}>
                    <span className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-mono shrink-0
                      ${selected ? 'bg-primary text-white' : 'bg-surface-3 text-text-muted'}`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-6 pt-4 border-t border-border">
          <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}
            className="btn-secondary px-4 py-2 text-sm disabled:opacity-30">← Prev</button>
          {allDone ? (
            <button onClick={submitQuiz} disabled={loading} className="btn-primary px-6 py-2 text-sm font-medium">
              {loading ? 'Judging...' : 'Submit & Get Roasted 🔥'}
            </button>
          ) : (
            <button onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}
              disabled={currentQ === questions.length - 1}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-30">Next →</button>
          )}
        </div>
      </div>
    );
  }

  // ── RESULTS ──
  if (phase === 'results' && results) {
    const circ = 2 * Math.PI * 42;
    const fill = results.percentage / 100;

    return (
      <div className="min-h-screen px-6 py-8 max-w-3xl mx-auto" style={{ background: '#081425' }}>
        <button onClick={onBack} className="btn-secondary px-3 py-1.5 text-sm mb-8">← Back to NLP Lab</button>

        <h1 className="text-2xl font-semibold text-text tracking-tight mb-1">Your Report Card</h1>
        <p className="text-sm text-text-muted mb-6">Brace yourself.</p>

        {/* Score row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* IQ */}
          <div className="card p-5 flex flex-col items-center">
            <p className="text-[11px] text-text-muted uppercase tracking-wider mb-3">Estimated IQ</p>
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="5" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#3b82f6" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={circ * (1 - fill)} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-semibold text-text">{results.iq}</span>
              </div>
            </div>
            <p className="text-[11px] text-primary mt-2 font-medium">{results.rank}</p>
          </div>

          {/* Score */}
          <div className="card p-5 flex flex-col items-center justify-center">
            <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Score</p>
            <div className="text-4xl font-semibold text-text">{results.score}<span className="text-lg text-text-muted">/{results.total}</span></div>
            <div className="w-full h-1.5 rounded-full bg-surface-3 mt-3 overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${results.percentage}%` }} />
            </div>
            <p className="text-sm font-medium text-primary mt-2">{results.percentage}%</p>
          </div>

          {/* Verdict */}
          <div className="card p-5">
            <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Verdict</p>
            <p className="text-sm text-text-secondary leading-relaxed">{results.verdict}</p>
          </div>
        </div>

        {/* Categories */}
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-text mb-3">Category Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(results.category_scores || {}).map(([cat, s]) => (
              <div key={cat} className="p-3 rounded-lg bg-surface-2 border border-border text-center">
                <span className="text-lg">{CATEGORY_ICONS[cat] || '·'}</span>
                <p className="text-[11px] text-text-muted mt-1">{cat}</p>
                <p className="text-lg font-semibold text-text mt-0.5">{Math.round((s.correct/s.total)*100)}%</p>
                <p className="text-[10px] text-text-muted">{s.correct}/{s.total}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Roasts */}
        <div className="card p-5 mb-8">
          <h3 className="text-sm font-semibold text-text mb-3">Question-by-Question</h3>
          <div className="space-y-2">
            {results.results?.map((r, i) => (
              <div key={i} className={`p-3 rounded-lg border ${r.correct ? 'border-success/20 bg-success/5' : 'border-error/20 bg-error/5'}`}>
                <div className="flex items-start gap-2.5">
                  <span className="text-sm mt-0.5">{r.correct ? '✓' : '✗'}</span>
                  <div>
                    <p className="text-[11px] text-text-muted">Q{i + 1}</p>
                    <p className="text-sm text-text italic mt-0.5">{r.roast}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pb-8">
          <button onClick={() => { setPhase('intro'); setResults(null); }} className="btn-primary px-6 py-2.5 text-sm">Try Again</button>
          <button onClick={onBack} className="btn-secondary px-6 py-2.5 text-sm">← Back to Safety</button>
        </div>
      </div>
    );
  }

  return null;
}
