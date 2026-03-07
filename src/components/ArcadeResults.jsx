import useGameStore from '../store/useGameStore';

function getRank(score, eliteCombos) {
  if (score >= 30 || eliteCombos >= 12)
    return { letter: 'S', title: 'SYSTEM_KILLER', color: 'text-cyan-300',    border: 'border-cyan-400',    glow: 'text-glow' };
  if (score >= 18)
    return { letter: 'A', title: 'VOID_RUNNER',   color: 'text-fuchsia-300', border: 'border-fuchsia-400', glow: '' };
  if (score >= 10)
    return { letter: 'B', title: 'DATA_GHOST',    color: 'text-amber-300',   border: 'border-amber-400',   glow: '' };
  return   { letter: 'C', title: 'SIGNAL_STATIC', color: 'text-zinc-400',    border: 'border-zinc-500',    glow: '' };
}

export default function ArcadeResults({ onRestart, onExit }) {
  const arcadeStats     = useGameStore(s => s.arcadeStats);
  const arcadeHighScore = useGameStore(s => s.arcadeHighScore ?? 0);

  const eliteCombos    = arcadeStats.eliteCombos ?? 0;
  const rank           = getRank(arcadeStats.score, eliteCombos);
  const isPersonalBest = arcadeStats.score > 0 && arcadeStats.score >= arcadeHighScore;

  return (
    <div className="absolute inset-0 z-[100] bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6">

      <div className="glass-panel backdrop-blur-md w-full max-w-sm rounded-2xl p-6 border border-cyan-500/30 bg-zinc-950/60 flex flex-col gap-4">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-mono text-xs uppercase tracking-widest text-cyan-400/50 mb-1">
              // SIM_TERMINATED :: POST_MORTEM_DIAGNOSTIC
            </p>
            <h1 className="font-display font-black uppercase text-cyan-300 text-2xl text-glow" style={{letterSpacing: '0.2em'}}>
              SIMULATION OVER
            </h1>
            <p className={`font-mono text-xs uppercase tracking-widest mt-1 ${rank.color}`}>
              {rank.title}
            </p>
          </div>
          {/* ── Letter Grade ── */}
          <div className={`glass-panel border-2 ${rank.border} w-14 h-14 flex items-center justify-center rounded-lg shrink-0`}>
            <span className={`font-display text-3xl font-black ${rank.color} ${rank.glow}`}>
              {rank.letter}
            </span>
          </div>
        </div>

        {/* ── Primary Stat ── */}
        <div className="glass-panel border-2 border-cyan-500/60 bg-cyan-500/5 p-5 flex flex-col items-center rounded-lg relative">
          {isPersonalBest && (
            <span className="absolute top-2 right-2 font-mono text-xs uppercase tracking-widest text-amber-400 border border-amber-400/50 bg-amber-400/10 px-1.5 py-0.5 rounded animate-pulse">
              PERSONAL BEST
            </span>
          )}
          <span className="font-mono text-xs uppercase tracking-widest text-cyan-400/60 mb-2">
            Total Systems Breached
          </span>
          <span className="font-display text-7xl font-black tabular-nums text-cyan-300 leading-none text-glow">
            {arcadeStats.score}
          </span>
        </div>

        {/* ── Secondary Stats Grid ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-panel border border-fuchsia-500/30 bg-zinc-900/40 p-4 flex flex-col items-center rounded-lg">
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-500 mb-1">
              Keystrokes
            </span>
            <span className="font-mono text-2xl font-black tabular-nums text-fuchsia-400">
              {arcadeStats.keystrokes}
            </span>
            <span className="font-mono text-xs text-zinc-600 uppercase tracking-widest">
              APM
            </span>
          </div>
          <div className="glass-panel border border-fuchsia-500/30 bg-zinc-900/40 p-4 flex flex-col items-center rounded-lg">
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-500 mb-1">
              Elite Combos
            </span>
            <span className="font-mono text-2xl font-black tabular-nums text-fuchsia-400">
              {eliteCombos}
            </span>
            <span className="font-mono text-xs text-zinc-600 uppercase tracking-widest">
              COMBOS
            </span>
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onRestart}
            className="hardware-btn w-full py-4 border-2 border-cyan-500/70 border-b-cyan-700 text-cyan-300 font-mono text-sm font-black uppercase tracking-widest bg-cyan-500/10 hover:bg-cyan-500/20 glow-cyan animate-pulse"
          >
            [ REBOOT_SIM ]
          </button>
          <button
            onClick={onExit}
            className="hardware-btn w-full py-3 border border-zinc-700/60 border-b-zinc-800 text-zinc-500 font-mono text-xs font-bold uppercase tracking-widest bg-zinc-900/50 hover:bg-zinc-800/40 hover:text-zinc-400"
          >
            [ EXIT ]
          </button>
        </div>

      </div>

    </div>
  );
}
