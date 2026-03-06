import { useRef, useEffect } from 'react';
import useGameStore from '../store/useGameStore';

export default function TerminalLog({ className = '' }) {
  const rawLog = useGameStore(s => s.terminalLog);
  const scrollRef = useRef(null);

  // --- BULLETPROOF FIX: Convert any legacy log objects from old saves to strings safely ---
  const log = (rawLog || []).map(entry => typeof entry === 'string' ? entry : (entry?.text || ''));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log]);

  // Dynamic syntax highlighting for the terminal (BRIGHTENED FOR READABILITY)
  const getLineColor = (line) => {
    // Errors, Daemons, and Busted states
    if (line.includes('!!') || line.includes('CRITICAL OVERRIDE') || line.includes('FATAL') || line.includes('SEVERED')) {
      return 'text-red-400 font-bold drop-shadow-md';
    }
    // Warnings and Exposures
    if (line.includes('[!]') || line.includes('EXPOSED') || line.includes('WARNING')) {
      return 'text-amber-300 font-bold';
    }
    // Operator/Masha Dialogue
    if (line.includes('// MASHA:') || line.includes('// MEMO_FROM_MASHA:')) {
      return 'text-fuchsia-300 font-bold';
    }
    // Ambient flavor text
    if (line.includes('// AMBIENT:')) {
      return 'text-zinc-400/80';
    }
    // Rabbit Virus
    if (line.includes('(\\_/)')) {
      return 'text-green-400 font-bold';
    }
    // Player Tool Actions & Successes
    if (line.startsWith('> ') || line.startsWith('>> ')) {
      return 'text-green-300 font-bold';
    }
    // Default system text (Brightened significantly)
    return 'text-cyan-300/90';
  };

  return (
    <div className={`flex-1 overflow-hidden relative border-t border-zinc-800/40 bg-transparent ${className}`}>
      
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] pointer-events-none z-10" />
      <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] pointer-events-none z-10" />

      <div
        ref={scrollRef}
        /* FIX: Reduced padding on mobile (px-3 py-2) to reclaim screen space */
        className="h-full overflow-y-auto px-3 py-2 sm:p-4 scrollbar-thin flex flex-col justify-start relative z-0 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black)]"
      >
        {/* FIX: Changed space-y-2 to space-y-0.5 on mobile to pack lines tighter */}
        <div className="mt-auto space-y-0.5 sm:space-y-1 pb-1">
          {log.map((entry, i) => (
            <p 
              key={i} 
              /* FIX: Added text-glow-sm and tightened leading */
              className={`font-mono text-[10px] sm:text-xs leading-snug tracking-wide text-glow-sm ${getLineColor(entry)}`}
            >
              {entry}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}