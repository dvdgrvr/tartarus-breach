import useGameStore from '../store/useGameStore';

export default function LoadingScene({ onComplete }) {
  const initializeDeck = useGameStore(s => s.initializeDeck);
  const reducedMotion  = useGameStore(s => s.settings?.reducedMotion);

  const handleBoot = (isReduced) => {
    initializeDeck(isReduced);
    onComplete(); 
  };

  // --- NEW DYNAMIC LOGO STYLING ---
  const logoStyle = reducedMotion 
    ? "text-cyan-500 drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]" // Calm, static, cool blue
    : "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-logo-flicker animate-logo-shift"; // Aggressive, glitchy red

  return (
    // CHANGED: overflow-y-auto ensures the user can scroll to the buttons on small screens like iPhone SE
    <div className="flex flex-col min-h-[100dvh] bg-zinc-950 px-4 sm:px-6 py-8 sm:py-12 font-mono overflow-y-auto scrollbar-none">
      <div className="flex-1 flex flex-col justify-center space-y-6 sm:space-y-8 max-w-md mx-auto w-full">
        
        {/* Boot Sequence Header */}
        <div className="space-y-4">
          
          {/* THE ASCII LOGO - Responsive & Centered */}
          <div className="w-full flex justify-center overflow-hidden">
            <pre className={`font-mono text-[5px] min-[380px]:text-[7px] sm:text-[10px] leading-none tracking-tighter font-bold select-none whitespace-pre ${logoStyle}`}>
{`
████████╗ █████╗ ██████╗ ████████╗ █████╗ ██████╗ ██╗   ██╗███████╗
╚══██╔══╝██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗██╔══██╗██║   ██║██╔════╝
   ██║   ███████║██████╔╝   ██║   ███████║██████╔╝██║   ██║███████╗
   ██║   ██╔══██║██╔══██╗   ██║   ██╔══██║██╔══██╗██║   ██║╚════██║
   ██║   ██║  ██║██║  ██║   ██║   ██║  ██║██║  ██║╚██████╔╝███████╗
   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
`}
            </pre>
          </div>
          
          <div className="space-y-1 text-center">
            <p className="text-cyan-400 text-[10px] tracking-widest uppercase animate-pulse">
              // KERNEL_LOAD_V10.2
            </p>
            <h1 className="text-zinc-100 text-lg sm:text-xl font-bold tracking-tighter uppercase">
              Initializing Deck...
            </h1>
          </div>
        </div>

        {/* Advisory Panel - Condensing padding and gap for smaller screens */}
        <div className="p-4 sm:p-5 border border-red-500/30 bg-red-950/20 rounded-lg space-y-3 shadow-[inset_0_0_20px_rgba(220,38,38,0.05)]">
          <p className="text-red-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
            VISUAL ADVISORY
          </p>
          <p className="text-zinc-300 text-[11px] sm:text-[12px] leading-snug sm:leading-relaxed">
            This simulator utilizes high-contrast flickering, rapid color shifts, and hardware-degradation effects to simulate 90s-era terminal failures. 
          </p>
          <p className="text-zinc-400 text-[10px] sm:text-[11px] leading-snug italic border-t border-red-900/30 pt-2 mt-1">
            If you are sensitive to flashing lights or rapid motion, please enable Ocular Protection.
          </p>
        </div>

        {/* Hardware Boot Controls */}
        <div className="space-y-3 sm:space-y-4 pt-2 pb-6">
          
          <button
            onClick={() => handleBoot(false)}
            className="w-full py-3 sm:py-4 px-4 rounded-lg border border-green-500/60 border-b-[4px] border-b-green-700 text-green-300 bg-green-950/40 hover:bg-green-900/60 hover:text-green-100 font-mono text-[12px] sm:text-sm font-bold uppercase tracking-widest transition-all duration-100 active:translate-y-[2px] active:border-b-0 flex flex-col items-center gap-1 select-none shadow-[0_0_15px_rgba(34,197,94,0.1)]"
          >
            Engage Full Immersion
            <span className="text-[9px] sm:text-[10px] font-normal text-green-400/70 normal-case tracking-normal">
              Standard high-intensity visual experience
            </span>
          </button>
          
          <button
            onClick={() => handleBoot(true)}
            className="w-full py-3 sm:py-4 px-4 rounded-lg border border-zinc-500/60 border-b-[4px] border-b-zinc-700 text-zinc-200 bg-zinc-800/60 hover:bg-zinc-700/80 hover:text-white font-mono text-[12px] sm:text-sm font-bold uppercase tracking-widest transition-all duration-100 active:translate-y-[2px] active:border-b-0 flex flex-col items-center gap-1 select-none"
          >
            Enable Ocular Protection
            <span className="text-[9px] sm:text-[10px] font-normal text-zinc-400 normal-case tracking-normal">
              Disables screen shake, strobing, and glitch effects
            </span>
          </button>
          
          <p className="text-center text-[9px] sm:text-[10px] text-zinc-600 uppercase tracking-widest pt-1">
            Settings can be recalibrated in SYS menu
          </p>
          
        </div>
        
      </div>
    </div>
  );
}