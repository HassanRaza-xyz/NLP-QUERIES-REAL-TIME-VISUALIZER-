const ROLE_COLORS = {
  Agent: '#3b82f6', Patient: '#f87171', Theme: '#22d3ee', Recipient: '#34d399',
  'Location/Goal': '#f59e0b', Manner: '#a78bfa', Attribute: '#64748b',
  Adjunct: '#475569', 'Purpose/Cause': '#f472b6', Result: '#f59e0b',
  Proposition: '#818cf8', Temporal: '#38bdf8',
};

export default function VerbNetCard({ data }) {
  if (!data?.verbs?.length) {
    return (
      <div className="card p-6">
        <h2 className="text-base font-semibold text-text mb-2">VerbNet Roles</h2>
        <p className="text-sm text-text-muted">No verbs found in this sentence.</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-text mb-4">VerbNet Thematic Roles</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {data.verbs.map((verb, vi) => (
          <div key={vi} className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-lg font-semibold text-primary">{verb.verb}</span>
              <span className="text-[11px] font-mono text-text-muted">({verb.lemma})</span>
            </div>
            {verb.roles.length > 0 ? (
              <div className="space-y-2">
                {verb.roles.map((role, ri) => {
                  const color = ROLE_COLORS[role.role] || '#3b82f6';
                  return (
                    <div key={ri} className="flex items-start gap-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 mt-0.5"
                        style={{ color, background: color + '15', border: `1px solid ${color}25` }}>
                        {role.role}
                      </span>
                      <div>
                        <p className="text-sm text-text">{role.text}</p>
                        <p className="text-[10px] font-mono text-text-muted">{role.dep}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-[11px] text-text-muted">No thematic roles detected</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
