export default function VisualRabbits({ ticks }) {
  if (ticks <= 0) return null;
  const RABBIT_ARTS = [ '(\\_/)', '(*^.^*)', '<data>' ];
  const rabbits = Array.from({ length: 6 }).map((_, i) => {
    const left     = 5 + Math.random() * 85;
    const delay    = Math.random() * -4;
    const duration = 2.5 + Math.random() * 2.5;
    const chosenArt = RABBIT_ARTS[Math.floor(Math.random() * RABBIT_ARTS.length)];
    return (
      <div
        key={i}
        className="absolute text-green-500/50 font-mono font-bold text-sm pointer-events-none animate-rabbit z-30"
        style={{ left: `${left}%`, animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
      >
        {chosenArt}
      </div>
    );
  });
  return <div className="absolute inset-0 pointer-events-none overflow-hidden">{rabbits}</div>;
}