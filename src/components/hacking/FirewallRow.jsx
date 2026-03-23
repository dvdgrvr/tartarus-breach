import { useState, useEffect, useRef } from 'react';
import useGameStore from '../../store/useGameStore';

export default function FirewallRow({ parsedLog }) {
  const firewallHealth   = useGameStore(s => s.firewallHealth);
  const node             = useGameStore(s => s.currentNode);
  const firewallRevealed = useGameStore(s => s.firewallRevealed);
  const exposedTicks     = useGameStore(s => s.exposedTicks);
  const rabbitTicks      = useGameStore(s => s.rabbitTicks);

  const [isHit, setIsHit] = useState(false);
  const [isCrit, setIsCrit] = useState(false); // ADDED: Track critical state
  const prevHP = useRef(firewallHealth);

  useEffect(() => {
    if (firewallHealth < prevHP.current) {
      // ADDED: Check the last 3 log entries to see if we triggered the 2.0x Multiplier safely
      const recentLogs = parsedLog.slice(-3);
      const wasCritical = recentLogs.some(l => l.includes('CRITICAL OVERRIDE'));

      // Use a timeout to schedule the state update so it isn't completely synchronous during render cycle
      const delayHit = setTimeout(() => {
        setIsHit(true);
        if (wasCritical) setIsCrit(true);
      }, 0);

      const clearHit = setTimeout(() => {
        setIsHit(false);
        setIsCrit(false);
      }, 300); // 300ms hold so the critical flash feels weighty

      prevHP.current = firewallHealth;
      return () => {
        clearTimeout(delayHit);
        clearTimeout(clearHit);
      };
    }
    prevHP.current = firewallHealth;
  }, [firewallHealth, parsedLog]);

  const isHidden = node?.specialDefense === 'ENCRYPTED_LOGS' && !firewallRevealed;
  const maxHP    = node?.firewallHP ?? 100;

  const totalBlocks = 10;
  const hpPercentage = Math.max(0, firewallHealth / (maxHP || 1));
  const activeBlocks = isNaN(hpPercentage) ? totalBlocks : Math.ceil(hpPercentage * totalBlocks);

  return (
    <div className="flex flex-col px-4 py-1">
      {/* Offense Context Zone */}
      {(exposedTicks > 0 || rabbitTicks > 0 || isHidden) && (
        <div className="flex gap-2 mb-1 pl-16">
          {isHidden && (
             <span className="font-mono text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border text-amber-400 border-amber-500/30 bg-amber-500/10">
               !_ENCRYPTED_!
             </span>
          )}
          {exposedTicks > 0 && (
             <span className="font-mono text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border text-amber-300 border-amber-400/50 bg-amber-400/10 shadow-[0_0_8px_rgba(251,191,36,0.5)] animate-pulse">
               EXPOSED [{exposedTicks}s]
             </span>
          )}
          {rabbitTicks > 0 && (
             <span className="font-mono text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border text-green-400 border-green-500/50 bg-green-500/10 shadow-[0_0_8px_rgba(74,222,128,0.5)]">
               RABBIT.exe [{rabbitTicks}s]
             </span>
          )}
        </div>
      )}

      {/* Shake the entire row aggressively if it's a critical hit! */}
      <div className={`flex items-center gap-4 transition-colors duration-150 ${isHit ? 'bg-white/5' : ''} ${isCrit ? 'danger-shake' : ''}`}>
        <span className={`font-mono text-xs uppercase tracking-widest w-12 shrink-0 font-bold transition-colors ${isHit ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'text-zinc-400'}`}>
          FW_HP
        </span>

        {isHidden ? (
          <div className="flex-1 flex gap-0.5 h-3">
            <div className="h-full w-full bg-amber-500/40 opacity-80 animate-pulse border border-amber-500/50" />
            <span className="font-mono text-xs font-bold tabular-nums w-7 text-right text-amber-500/80 ml-2">
              ??
            </span>
          </div>
        ) : (
          <div className="flex-1 flex gap-0.5 h-3">
            {Array.from({ length: totalBlocks }).map((_, i) => {
              const isActive = i < activeBlocks;
              return (
                <div
                  key={i}
                  className={`flex-1 h-full transition-all duration-75 ${
                    isActive
                      ? isCrit
                        ? 'fw-block-critical' // ADDED: Critical styling
                        : isHit
                          ? 'fw-block-hit'
                          : 'bg-violet-500 border-y border-violet-400 shadow-[0_0_5px_rgba(139,92,246,0.3)]'
                      : 'bg-zinc-800/50 border-y border-zinc-800'
                  }`}
                />
              );
            })}
            <span className={`font-mono text-xs tabular-nums w-8 text-right font-bold ml-1 shrink-0 transition-colors ${isHit ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'text-zinc-300'}`}>
              {Math.ceil(firewallHealth)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}