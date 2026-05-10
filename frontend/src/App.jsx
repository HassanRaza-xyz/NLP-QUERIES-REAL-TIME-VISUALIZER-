import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import SentenceInput from './components/SentenceInput';
import DependencyTree from './components/DependencyTree';
import ConstituencyTree from './components/ConstituencyTree';
import WordNetGraph from './components/WordNetGraph';
import VerbNetCard from './components/VerbNetCard';
import StepParser from './components/StepParser';
import ParticlesBg from './components/ParticlesBg';
import ScrollReveal from './components/ScrollReveal';
import * as api from './api';

const VIEWS = [
  { id: 'dependency', label: 'Dependency Tree', icon: '🌳' },
  { id: 'constituency', label: 'Constituency Tree', icon: '🏗️' },
  { id: 'pcfg', label: 'PCFG Mode', icon: '📊' },
  { id: 'wordnet', label: 'WordNet Explorer', icon: '🔗' },
  { id: 'verbnet', label: 'VerbNet Roles', icon: '🎭' },
  { id: 'stepper', label: 'Step-by-Step', icon: '👣' },
];

export default function App() {
  const [sentence, setSentence] = useState('');
  const [activeView, setActiveView] = useState('dependency');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [selectedWord, setSelectedWord] = useState(null);
  const [visibleViews, setVisibleViews] = useState(['dependency']);

  const handleToggleView = (id) => {
    setVisibleViews((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
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
    } catch (e) {
      console.error('Analysis failed:', e);
    }
    setLoading(false);
  }, [visibleViews]);

  const handleWordClick = useCallback(async (word, pos) => {
    setSelectedWord(word);
    try {
      const resp = await api.getWordNet(word, pos);
      setResults((prev) => ({ ...prev, wordnet: resp.data }));
    } catch (e) { console.error(e); }
  }, []);

  return (
    <div className="flex min-h-screen bg-animated">
      <ParticlesBg />
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        views={VIEWS}
        visibleViews={visibleViews}
        onToggleView={handleToggleView}
        activeView={activeView}
        onSetActive={setActiveView}
      />

      <main className="flex-1 transition-all duration-500">
        {/* Hero / Input */}
        <section className="min-h-[50vh] flex flex-col items-center justify-center px-12 pt-24 pb-16">
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl font-black text-center mb-3 bg-gradient-to-r from-neon-indigo via-neon-cyan to-neon-violet bg-clip-text text-transparent"
          >
            NLP Visualizer
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-slate-400 text-lg mb-12 text-center max-w-xl"
          >
            Type any English sentence to explore its syntactic structure, parsing logic & semantic relations
          </motion.p>
          <SentenceInput onAnalyze={handleAnalyze} loading={loading} />
        </section>

        {/* Results area */}
        <section className="px-12 pb-32 space-y-12 max-w-7xl mx-auto">
          <AnimatePresence mode="sync">
            {loading && (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-neon-indigo/30 border-t-neon-cyan rounded-full animate-spin" />
              </motion.div>
            )}

            {!loading && sentence && (
              <>
                {visibleViews.includes('dependency') && results.parse && (
                  <ScrollReveal key="dep">
                    <DependencyTree data={results.parse} onWordClick={handleWordClick} />
                  </ScrollReveal>
                )}
                {visibleViews.includes('constituency') && results.constituency && (
                  <ScrollReveal key="const">
                    <ConstituencyTree data={results.constituency} mode="constituency" />
                  </ScrollReveal>
                )}
                {visibleViews.includes('pcfg') && results.pcfg && (
                  <ScrollReveal key="pcfg">
                    <ConstituencyTree data={results.pcfg} mode="pcfg" />
                  </ScrollReveal>
                )}
                {visibleViews.includes('wordnet') && results.wordnet && (
                  <ScrollReveal key="wn">
                    <WordNetGraph data={results.wordnet} />
                  </ScrollReveal>
                )}
                {visibleViews.includes('verbnet') && results.verbnet && (
                  <ScrollReveal key="vn">
                    <VerbNetCard data={results.verbnet} />
                  </ScrollReveal>
                )}
                {visibleViews.includes('stepper') && results.stepper && (
                  <ScrollReveal key="step">
                    <StepParser data={results.stepper} />
                  </ScrollReveal>
                )}
              </>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
