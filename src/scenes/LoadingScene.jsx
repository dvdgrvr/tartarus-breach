import useGameStore from '../store/useGameStore';

export default function LoadingScene({ onComplete }) {
  const initializeDeck = useGameStore(s => s.initializeDeck);

  const handleBoot = (isReduced) => {
    initializeDeck(isReduced);
    onComplete(); 
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 px-6 py-12 font-mono">
      <div className="flex-1 flex flex-col justify-center space-y-8">
        
        {/* Boot Sequence Header */}
        <div className="space-y-2">
          <p className="text-cyan-400 text-[10px] tracking-widest uppercase animate-pulse">
            // KERNEL_LOAD_V10.2
          </p>
          <h1 className="text-zinc-100 text-2xl font-bold tracking-tighter uppercase">
            Initializing Deck...
          </h1>
        </div>

        {/* Advisory Panel */}
        <div className="p-5 border border-red-500/30 bg-red-950/20 rounded-lg space-y-4 shadow-[inset_0_0_20px_rgba(220,38,38,0.05)]">
          <p className="text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            VISUAL ADVISORY
          </p>
          <p className="text-zinc-300 text-[12px] leading-relaxed">
            This simulator utilizes high-contrast flickering, rapid color shifts, and hardware-degradation effects to simulate 90s-era terminal failures. 
          </p>
          <p className="text-zinc-400 text-[11px] leading-relaxed italic border-t border-red-900/30 pt-3 mt-1">
            If you are sensitive to flashing lights or rapid motion, please enable Ocular Protection.
          </p>
        </div>
        
      </div>

      {/* Hardware Boot Controls */}
      <div className="space-y-4 shrink-0 mt-8">
        
        <button
          onClick={() => handleBoot(false)}
          className="w-full py-4 px-4 rounded-lg border border-green-500/60 border-b-[4px] border-b-green-700 text-green-300 bg-green-950/40 hover:bg-green-900/60 hover:text-green-100 font-mono text-sm font-bold uppercase tracking-widest transition-all duration-100 active:translate-y-[2px] active:border-b-0 flex flex-col items-center gap-1 select-none shadow-[0_0_15px_rgba(34,197,94,0.1)]"
        >
          Engage Full Immersion
          <span className="text-[10px] font-normal text-green-400/70 normal-case tracking-normal">
            Standard high-intensity visual experience
          </span>
        </button>
        
        <button
          onClick={() => handleBoot(true)}
          className="w-full py-4 px-4 rounded-lg border border-zinc-500/60 border-b-[4px] border-b-zinc-700 text-zinc-200 bg-zinc-800/60 hover:bg-zinc-700/80 hover:text-white font-mono text-sm font-bold uppercase tracking-widest transition-all duration-100 active:translate-y-[2px] active:border-b-0 flex flex-col items-center gap-1 select-none"
        >
          Enable Ocular Protection
          <span className="text-[10px] font-normal text-zinc-400 normal-case tracking-normal">
            Disables screen shake, strobing, and glitch effects
          </span>
        </button>
        
        <p className="text-center text-[10px] text-zinc-300 uppercase tracking-widest pt-2">
          Settings can be recalibrated in SYS menu
        </p>
        
      </div>
    </div>
  );
}