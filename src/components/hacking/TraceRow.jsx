import { useState, useEffect } from 'react';
import useGameStore from '../../store/useGameStore';

export default function TraceRow({ parsedLog }) {
  const trace         = useGameStore(s => s.digitalTrace);
  const node          = useGameStore(s => s.currentNode);
  const pulseActive   = useGameStore(s => s.pulseActive);
  const settings      = useGameStore(s => s.settings);

  const activeDaemon  = useGameStore(s => s.activeDaemon);
  const ghostTicks    = useGameStore(s => s.ghostTicks);

  const [syncFlash, setSyncFlash] = useState(false);

  const log = parsedLog;

  useEffect(() => {
    if (log.length > 0 && log[log.length - 1].includes('PERFECT SYNC')) {
      const delaySync = setTimeout(() => {
        setSyncFlash(true);
      }, 0);
      const timer = setTimeout(() => setSyncFlash(false), 600);
      return () => {
        clearTimeout(delaySync);
        clearTimeout(timer);
      };
    }
  }, [log]);

  const shakeEnabled  = settings?.shakeEnabled ?? true;
  const glitchEnabled = settings?.glitchEnabled ?? true;

  // Add GOLD_CACHE to the accelerated check
  const isAccelerated = node?.specialDefense === 'TRACE_ACCELERATOR' || node?.specialDefense === 'DARKNET' || node?.mutator?.id === 'GOLD_CACHE';
  const isDanger  = trace >= 80;
  const isWarning = trace >= 50;

  const labelColor = isDanger
    ? 'text-red-400'
    : pulseActive
      ? 'text-cyan-300'
      : isWarning
        ? 'text-orange-400'
        : 'text-zinc-400';

  const barGradient = ghostTicks > 0
    ? 'bg-gradient-to-r from-slate-400 to-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
    : isDanger
      ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'
      : isWarning
        ? 'bg-gradient-to-r from-orange-600 to-orange-400'
        : pulseActive
          ? 'bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
          : 'bg-gradient-to-r from-blue-700 to-blue-500';

  return (
    <div className={`flex flex-col px-4 py-1 ${isDanger && shakeEnabled ? 'danger-shake' : ''}`}>

      {/* Defense Context Zone */}
      {(activeDaemon || ghostTicks > 0 || isAccelerated) && (
        <div className="flex gap-2 mb-1 pl-16">
          {activeDaemon && (
            <span className="font-mono text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border text-red-500 border-red-500/50 bg-red-500/10 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]">
              ! {activeDaemon} ACTIVE !
            </span>
          )}
          {ghostTicks > 0 && (
            <span className="font-mono text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border text-slate-300 border-slate-400/50 bg-slate-400/10 shadow-[0_0_8px_rgba(148,163,184,0.5)]">
              GHOST.sys [{ghostTicks}s]
            </span>
          )}
          {isAccelerated && !ghostTicks && (
             <span className="font-mono text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border text-red-400 border-red-500/30 bg-red-500/10">
               TRACE x2
             </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        <span className={`font-mono text-xs uppercase tracking-widest w-12 shrink-0 font-bold ${labelColor} ${(isDanger || pulseActive) && glitchEnabled ? 'animate-pulse' : ''}`}>
          {isDanger ? '[GHOST_SYNC]' : pulseActive ? 'SYNC' : 'TRACE'}
        </span>

        <div className={`flex-1 h-2.5 bg-black rounded-none overflow-hidden border shadow-inner relative transition-all duration-150 ${
          syncFlash ? 'animate-sync-pulse z-10' : pulseActive ? 'border-cyan-500/60 shadow-[0_0_6px_rgba(34,211,238,0.3)]' : 'border-zinc-800'
        }`}>
          <div className="absolute inset-0 noise-bg opacity-10 pointer-events-none" />
          <div
            className={`h-full rounded-none transition-all duration-300 ${barGradient} ${isAccelerated && !isDanger && !pulseActive && glitchEnabled && !ghostTicks ? 'opacity-80 animate-pulse' : ''}`}
            style={{ width: `${Math.min(100, trace)}%` }}
          />
        </div>

        <span className={`font-mono text-xs tabular-nums w-8 text-right font-bold shrink-0 ${labelColor}`}>
          {trace.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}