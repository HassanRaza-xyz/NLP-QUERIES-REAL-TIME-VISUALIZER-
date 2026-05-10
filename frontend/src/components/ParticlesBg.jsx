import { useMemo } from 'react';

export default function ParticlesBg() {
  const particles = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 20,
      duration: 15 + Math.random() * 20,
      size: 2 + Math.random() * 3,
      opacity: 0.15 + Math.random() * 0.25,
    })), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            background: p.id % 3 === 0 ? 'rgba(34,211,238,0.3)' : p.id % 3 === 1 ? 'rgba(99,102,241,0.3)' : 'rgba(168,85,247,0.3)',
          }}
        />
      ))}
    </div>
  );
}
