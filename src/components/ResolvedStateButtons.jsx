export default function ResolvedStateButtons({
  transitOutcome,
  isTutorial,
  tutorialStep,
  disconnectLocked,
  startSiphon,
  stopSiphon,
  isSiphoning,
  leaveNode,
  retrySession
}) {
  const isSuccess = transitOutcome === 'success';
  const isSiphonHighlight = isTutorial && tutorialStep === 'SIPHON_INTRO';

  return (
    <div className="relative px-4 pt-2 pb-6 flex gap-2 sm:gap-3 justify-center items-stretch min-h-[100px]">
      {isSuccess && (
        <button
          onPointerDown={(e) => { e.target.setPointerCapture(e.pointerId); startSiphon(); }}
          onPointerUp={(e) => { if (e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId); stopSiphon(); }}
          onPointerLeave={stopSiphon}
          onPointerCancel={stopSiphon}
          className={`flex-1 relative overflow-hidden py-3 border-[2px] border-b-[6px] rounded flex flex-col items-center justify-center transition-all duration-150 touch-none select-none ${
            disconnectLocked
              ? 'bg-zinc-950 border-zinc-800 opacity-60 cursor-not-allowed grayscale'
              : isSiphonHighlight
                ? 'bg-fuchsia-950/40 border-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.9)] animate-pulse active:border-b-[2px] active:translate-y-[4px] cursor-pointer'
                : 'bg-fuchsia-950/20 border-fuchsia-700/60 active:border-b-[2px] active:translate-y-[4px] hover:bg-fuchsia-900/30 cursor-pointer shadow-[0_0_15px_rgba(217,70,239,0.2)]'
          }`}
        >
          <div className="absolute inset-0 noise-bg opacity-10 pointer-events-none" />
          <div
            className="absolute bottom-0 left-0 w-full bg-fuchsia-500/30 border-t-2 border-fuchsia-400 transition-all ease-linear"
            style={{ height: isSiphoning ? '100%' : '0%', transitionDuration: isSiphoning ? '2000ms' : '200ms' }}
          />
          <span className="relative z-10 font-display text-[12px] sm:text-[14px] font-black uppercase tracking-[0.2em]">
            {disconnectLocked ? 'SECURING' : 'SIPHON'}
          </span>
          <span className="relative z-10 font-mono text-xs font-bold tracking-widest mt-1 uppercase">
            {disconnectLocked ? '// Sync' : '// Hold to Drain'}
          </span>
        </button>
      )}

      <button
        onClick={() => { if (!disconnectLocked) leaveNode(); }}
        className={`flex-1 relative overflow-hidden border-[2px] border-b-[6px] rounded flex flex-col items-center justify-center transition-all duration-300 touch-none select-none ${
          disconnectLocked
            ? 'bg-zinc-950 border-zinc-800 opacity-60 cursor-not-allowed grayscale'
            : 'bg-cyan-950/30 border-cyan-700/80 active:border-b-[2px] active:translate-y-[4px] hover:bg-cyan-900/50 hover:border-cyan-500 cursor-pointer'
        }`}
      >
        <div className="absolute inset-0 noise-bg opacity-10 pointer-events-none" />
        <span className="relative z-10 font-display text-[12px] sm:text-[14px] font-black uppercase tracking-[0.2em]">
          {disconnectLocked ? 'SECURING' : 'DISCONNECT'}
        </span>
        <span className="relative z-10 font-mono text-xs font-bold tracking-widest mt-1 uppercase">
          {disconnectLocked ? '// Sync' : '// Sever Connection'}
        </span>
      </button>

      <button
        onClick={() => { if (!disconnectLocked) retrySession(); }}
        className={`w-14 sm:w-16 shrink-0 relative overflow-hidden border-[2px] border-b-[6px] rounded flex items-center justify-center transition-all duration-300 touch-none select-none ${
          disconnectLocked
            ? 'bg-zinc-950 border-zinc-800 opacity-60 cursor-not-allowed grayscale'
            : 'bg-emerald-950/30 border-emerald-700/80 active:border-b-[2px] active:translate-y-[4px] hover:bg-emerald-900/50 hover:border-emerald-500 cursor-pointer'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
        </svg>
      </button>
    </div>
  );
}