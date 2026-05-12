import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SentenceInput from './components/SentenceInput';
import DependencyTree from './components/DependencyTree';
import ConstituencyTree from './components/ConstituencyTree';
import WordNetGraph from './components/WordNetGraph';
import VerbNetCard from './components/VerbNetCard';
import StepParser from './components/StepParser';
import CommonSenseQuiz from './components/CommonSenseQuiz';
import * as api from './api';

const NAV_ITEMS = [
  { id: 'dependency', label: 'Dependency Tree', icon: '⊞' },
  { id: 'constituency', label: 'Constituency Tree', icon: '⊟' },
  { id: 'pcfg', label: 'PCFG Mode', icon: '⊠' },
  { id: 'wordnet', label: 'WordNet Explorer', icon: '◎' },
  { id: 'verbnet', label: 'VerbNet Roles', icon: '◉' },
  { id: 'stepper', label: 'Step-by-Step', icon: '▷' },
];

export default function App() {
  const [sentence, setSentence] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [visibleViews, setVisibleViews] = useState(['dependency']);
  const [showQuiz, setShowQuiz] = useState(false);

  const toggleView = (id) => {
    setVisibleViews(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const handleAnalyze = useCallback(async (text) => {
    if (!text.trim()) return;
    setSentence(text);
    setLoading(true);
    setResults({});
    try {
      const promises = {};
      if (visibleViews.includes('dependency')) promises.parse = api.parseSentence(text);
      if (visibleViews.includes('constituency')) promises.constituency = api.getConstituency(text);
      if (visibleViews.includes('pcfg')) promises.pcfg = api.getPCFG(text);
      if (visibleViews.includes('verbnet')) promises.verbnet = api.getVerbNet(text);
      if (visibleViews.includes('stepper')) promises.stepper = api.getStepParse(text);
      const keys = Object.keys(promises);
      const responses = await Promise.all(Object.values(promises));
      const res = {};
      keys.forEach((k, i) => (res[k] = responses[i].data));
      setResults(res);
    } catch (e) { console.error('Analysis failed:', e); }
    setLoading(false);
  }, [visibleViews]);

  const handleWordClick = useCallback(async (word, pos) => {
    try {
      const resp = await api.getWordNet(word, pos);
      setResults(prev => ({ ...prev, wordnet: resp.data }));
    } catch (e) { console.error(e); }
  }, []);

  // ── Quiz mode ──
  if (showQuiz) {
    return <CommonSenseQuiz onBack={() => setShowQuiz(false)} />;
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#081425' }}>
      {/* ═══ Sidebar ═══ */}
      <aside className={`sidebar sticky top-0 h-screen flex flex-col shrink-0 transition-all duration-200 ${sidebarOpen ? 'w-[240px]' : 'w-[56px]'}`}>
        {/* Toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-center h-12 border-b border-border hover:bg-surface-2 transition-colors cursor-pointer">
          <span className="text-text-muted text-sm">{sidebarOpen ? '◂' : '▸'}</span>
        </button>

        {/* Brand */}
        {sidebarOpen && (
          <div className="px-4 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text">NLP Lab</h2>
            <p className="text-[11px] text-text-muted mt-0.5">Analysis Dashboard</p>
          </div>
        )}

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {sidebarOpen && <p className="text-[10px] uppercase tracking-widest text-text-muted px-2 mb-2 mt-1">Modules</p>}
          {NAV_ITEMS.map(item => {
            const active = visibleViews.includes(item.id);
            return (
              <button key={item.id} onClick={() => toggleView(item.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-[13px] transition-all duration-150 cursor-pointer
                  ${active ? 'bg-primary-muted text-primary' : 'text-text-secondary hover:bg-surface-2 hover:text-text'}`}>
                <span className="text-sm shrink-0 w-5 text-center font-mono">{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
                {sidebarOpen && <span className={`ml-auto w-1.5 h-1.5 rounded-full ${active ? 'bg-primary' : 'bg-surface-4'}`} />}
              </button>
            );
          })}
        </div>

        {/* Common Sense Quiz button */}
        <div className="px-2 py-3 border-t border-border">
          <button onClick={() => setShowQuiz(true)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded text-[13px] btn-secondary cursor-pointer`}>
            <span className="text-base">🧠</span>
            {sidebarOpen && <span>Common Sense Quiz</span>}
          </button>
        </div>

        {/* Footer */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-t border-border text-[10px] text-text-muted">
            Powered by spaCy · NLTK · D3.js
          </div>
        )}
      </aside>

      {/* ═══ Main Content ═══ */}
      <main className="flex-1 min-h-screen">
        {/* Header / Input */}
        <header className="border-b border-border px-8 py-6">
          <div className="max-w-4xl">
            <h1 className="text-2xl font-semibold text-text tracking-tight">NLP Lab</h1>
            <p className="text-sm text-text-muted mt-1 mb-5">
              Type any English sentence to explore its syntactic structure, parsing logic & semantic relations
            </p>
            <SentenceInput onAnalyze={handleAnalyze} loading={loading} />
          </div>
        </header>

        {/* Results */}
        <section className="px-8 py-8 space-y-6 max-w-6xl">
          <AnimatePresence mode="sync">
            {loading && (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 py-16 justify-center">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-sm text-text-muted">Analyzing...</span>
              </motion.div>
            )}

            {!loading && sentence && (
              <>
                {visibleViews.includes('dependency') && results.parse && (
                  <motion.div key="dep" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <DependencyTree data={results.parse} onWordClick={handleWordClick} />
                  </motion.div>
                )}
                {visibleViews.includes('constituency') && results.constituency && (
                  <motion.div key="const" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <ConstituencyTree data={results.constituency} mode="constituency" />
                  </motion.div>
                )}
                {visibleViews.includes('pcfg') && results.pcfg && (
                  <motion.div key="pcfg" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <ConstituencyTree data={results.pcfg} mode="pcfg" />
                  </motion.div>
                )}
                {visibleViews.includes('wordnet') && results.wordnet && (
                  <motion.div key="wn" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <WordNetGraph data={results.wordnet} />
                  </motion.div>
                )}
                {visibleViews.includes('verbnet') && results.verbnet && (
                  <motion.div key="vn" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <VerbNetCard data={results.verbnet} />
                  </motion.div>
                )}
                {visibleViews.includes('stepper') && results.stepper && (
                  <motion.div key="step" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <StepParser data={results.stepper} />
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
