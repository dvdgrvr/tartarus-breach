import useGameStore from '../store/useGameStore';

function GaugeBar({ value, colorClass, className = '' }) {
  return (
    <div className={`flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function TopBorder() {
  const heat         = useGameStore(s => s.physicalHeat);
  const shakeEnabled = useGameStore(s => s.settings?.shakeEnabled ?? true);

  const setPaused           = useGameStore(s => s.setPaused);
  const toggleSettingsModal = useGameStore(s => s.toggleSettingsModal);

  const isDanger   = heat >= 80;
  const isWarning  = heat >= 50;
  const colorClass = isDanger ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-green-500';
  const labelClass = isDanger ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-zinc-400';

  return (
    <div 
      className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm flex items-center gap-4 shrink-0"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
    >
      <span className={`font-mono text-xs uppercase tracking-widest w-14 shrink-0 font-bold ${labelClass} ${isDanger ? 'animate-pulse' : ''}`}>
        {isDanger ? '[!] HEAT' : 'HEAT'}
      </span>
      
      <GaugeBar value={heat} colorClass={colorClass} className={isDanger && shakeEnabled ? 'danger-shake' : ''} />
      
      <span className={`font-mono text-xs tabular-nums w-8 text-right font-bold shrink-0 ${labelClass}`}>
        {heat.toFixed(0)}%
      </span>

      <button
        onClick={() => {
          toggleSettingsModal(true);
          setPaused(true);
        }}
        className="shrink-0 ml-2 px-2.5 py-1.5 rounded bg-zinc-800/80 border border-zinc-600 border-b-[2px] active:border-b active:translate-y-[1px] text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all flex items-center gap-1.5 select-none"
      >
        <span className="text-[12px] leading-none">⚙</span>
        <span className="font-mono text-xs font-bold uppercase tracking-widest">SYS</span>
      </button>
    </div>
  );
}

export function BottomBorder() {
  const intelFragments = useGameStore(s => s.intelFragments);
  const status         = useGameStore(s => s.status);
  const packUp         = useGameStore(s => s.packUp);
  const gameMode       = useGameStore(s => s.gameMode);

  return (
    <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-between">
      {gameMode === 'arcade' ? (
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400/60">[ ARCADE_MODE ]</span>
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-lg font-bold text-cyan-400 tabular-nums">{intelFragments}</span>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400/80">IF</span>
        </div>
      )}

      {status === 'hacking' && (
        <button
          onClick={() => packUp('escaped')}
          className="px-6 py-3 rounded border-2 border-orange-500/50 border-b-[5px] active:border-b-2 active:translate-y-1 text-orange-400 font-mono text-sm font-bold uppercase tracking-[0.2em] bg-orange-950/20 hover:bg-orange-900/30 transition-all duration-75 shadow-lg"
        >
          PACK_UP
        </button>
      )}
    </div>
  );
}