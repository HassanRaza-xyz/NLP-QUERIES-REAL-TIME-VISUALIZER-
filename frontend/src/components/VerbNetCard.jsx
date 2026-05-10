import { motion } from 'framer-motion';

const ROLE_COLORS = {
  Agent: '#6366f1', Patient: '#fb7185', Theme: '#22d3ee', Recipient: '#34d399',
  'Location/Goal': '#fbbf24', Manner: '#a855f7', Attribute: '#64748b',
  Adjunct: '#475569', 'Purpose/Cause': '#f472b6', Result: '#fbbf24',
  Proposition: '#818cf8', Temporal: '#38bdf8',
};

export default function VerbNetCard({ data }) {
  if (!data?.verbs?.length) {
    return (
      <motion.div layout className="glass rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-2">🎭 VerbNet Roles</h2>
        <p className="text-slate-400 text-sm">No verbs found in this sentence.</p>
      </motion.div>
    );
  }

  return (
    <motion.div layout className="glass rounded-2xl p-8 glow-indigo">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">🎭</span>
        <h2 className="text-xl font-bold text-white">VerbNet Thematic Roles</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.verbs.map((verb, vi) => (
          <motion.div
            key={vi}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: vi * 0.15 }}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-bold text-neon-violet">{verb.verb}</span>
              <span className="text-xs font-mono text-slate-500">({verb.lemma})</span>
            </div>

            {verb.roles.length > 0 ? (
              <div className="space-y-2.5">
                {verb.roles.map((role, ri) => {
                  const color = ROLE_COLORS[role.role] || '#6366f1';
                  return (
                    <motion.div
                      key={ri}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: vi * 0.15 + ri * 0.08 }}
                      className="flex items-start gap-3"
                    >
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shrink-0 mt-0.5"
                        style={{ color, background: color + '18', border: `1px solid ${color}33` }}
                      >
                        {role.role}
                      </span>
                      <div>
                        <p className="text-sm text-white">{role.text}</p>
                        <p className="text-[10px] font-mono text-slate-500">{role.dep}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No thematic roles detected</p>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
