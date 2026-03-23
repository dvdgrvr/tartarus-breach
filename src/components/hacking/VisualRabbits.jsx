import { useState, useEffect } from 'react';

export default function VisualRabbits({ ticks }) {
  const [rabbits, setRabbits] = useState([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ticks > 0) {
        const RABBIT_ARTS = [ '(\\_/)', '(*^.^*)', '<data>' ];
        const newRabbits = Array.from({ length: 6 }).map((_, i) => {
          const left     = 5 + Math.random() * 85;
          const delay    = Math.random() * -4;
          const duration = 2.5 + Math.random() * 2.5;
          const chosenArt = RABBIT_ARTS[Math.floor(Math.random() * RABBIT_ARTS.length)];
          return { id: i, left, delay, duration, chosenArt };
        });
        setRabbits(newRabbits);
      } else {
        setRabbits([]);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [ticks]);

  if (ticks <= 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {rabbits.map((r) => (
        <div
          key={r.id}
          className="absolute text-green-500/50 font-mono font-bold text-sm pointer-events-none animate-rabbit z-30"
          style={{ left: `${r.left}%`, animationDelay: `${r.delay}s`, animationDuration: `${r.duration}s` }}
        >
          {r.chosenArt}
        </div>
      ))}
    </div>
  );
}