import useGameStore from '../store/useGameStore';

// ─── Reusable gauge bar ───────────────────────────────────────────────────────

function GaugeBar({ value, colorClass }) {
  return (
    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// ─── Top peripheral — Physical Heat ──────────────────────────────────────────

export function TopBorder() {
  const heat = useGameStore(s => s.physicalHeat);

  const isDanger  = heat >= 80;
  const isWarning = heat >= 50;
  const colorClass = isDanger ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-green-500';
  const labelClass = isDanger
    ? 'text-red-400'
    : isWarning ? 'text-orange-400' : 'text-zinc-500';

  return (
    <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm flex items-center gap-3">
      <span className={`font-mono text-[10px] uppercase tracking-widest w-16 shrink-0 ${labelClass} ${isDanger ? 'animate-pulse' : ''}`}>
        {isDanger ? '[!] HEAT' : '    HEAT'}
      </span>
      <GaugeBar value={heat} colorClass={colorClass} />
      <span className={`font-mono text-[10px] tabular-nums w-8 text-right ${labelClass}`}>
        {heat.toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Bottom peripheral — Credits + Pack Up ───────────────────────────────────

export function BottomBorder() {
  const credits = useGameStore(s => s.credits);
  const status  = useGameStore(s => s.status);
  const packUp  = useGameStore(s => s.packUp);

  return (
    <div className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-between">
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-lg font-bold text-cyan-400 tabular-nums">{credits}</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-400/50">CR</span>
      </div>

      {status === 'hacking' && (
        <button
          onClick={() => packUp(true)}
          className="px-4 py-1.5 rounded border border-violet-500/40 text-violet-400 font-mono text-xs uppercase tracking-widest hover:bg-violet-500/10 hover:border-violet-400 transition-all duration-150 active:scale-95"
        >
          Pack Up
        </button>
      )}
    </div>
  );
}
