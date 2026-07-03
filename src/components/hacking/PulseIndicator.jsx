import useGameStore from '../../store/useGameStore';
import { PULSE_INTERVAL_TICKS } from '../../config/constants';

// Phase 3.1 follow-up — Loud visual beat.
// The open state now dominates the meter row: bigger bar, large glowing text,
// and a full-width cyan flash strip renders behind the grid via a CSS class
// toggle on a parent wrapper element (see HackingScene.jsx).
export default function PulseIndicator() {
  const pulseActive     = useGameStore(s => s.pulseActive);
  const tickCount       = useGameStore(s => s.tickCount);
  const status          = useGameStore(s => s.status);
  const reducedMotion   = useGameStore(s => s.settings?.reducedMotion);

  // Only show during active hacking
  if (status !== 'hacking') return null;

  // Calculate how far through the cycle we are (0–3)
  const phase = tickCount % PULSE_INTERVAL_TICKS;
  const chargePercent = (phase / (PULSE_INTERVAL_TICKS - 1)) * 100;

  if (reducedMotion) {
    // Static high-contrast state change — just a bigger label
    return (
      <div className="px-4 mb-1 flex items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-widest font-bold text-zinc-400 w-12 shrink-0">
          SYNC
        </span>
        <div className="flex-1 h-3 bg-zinc-900 rounded-none border-2 border-zinc-800">
          <div
            className={`h-full transition-colors duration-100 ${
              pulseActive
                ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]'
                : 'bg-zinc-700'
            }`}
            style={{ width: pulseActive ? '100%' : `${chargePercent}%` }}
          />
        </div>
        <span className={`font-mono text-xs font-bold tabular-nums shrink-0 w-14 text-right ${
          pulseActive ? 'text-cyan-300' : 'text-zinc-500'
        }`}>
          {pulseActive ? 'OPEN' : `${Math.round(chargePercent)}%`}
        </span>
      </div>
    );
  }

  return (
    <div className="px-4 mb-1 flex items-center gap-2">
      <span className="font-mono text-xs uppercase tracking-widest font-black text-cyan-500/70 w-12 shrink-0">
        SYNC
      </span>

      {/* Charge bar — dramatically bigger when open */}
      <div className={`flex-1 h-3 bg-zinc-900 rounded-none border-2 transition-all duration-100 ${
        pulseActive
          ? 'border-cyan-400 scale-y-125 shadow-[0_0_20px_rgba(34,211,238,0.7),0_0_60px_rgba(34,211,238,0.3)]'
          : 'border-zinc-800 scale-y-100'
      }`}>
        <div
          className={`h-full transition-all duration-100 ${
            pulseActive
              ? 'bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.9)] animate-pulse'
              : 'bg-cyan-700/50'
          }`}
          style={{ width: pulseActive ? '100%' : `${chargePercent}%` }}
        />
      </div>

      {/* Status label — much larger text + glow when open */}
      <span className={`font-mono text-sm font-black tabular-nums shrink-0 w-14 text-right transition-all duration-100 ${
        pulseActive
          ? 'text-cyan-300 scale-125 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse'
          : 'text-zinc-600 text-xs scale-100'
      }`}>
        {pulseActive ? 'NOW' : `${Math.round(chargePercent)}%`}
      </span>
    </div>
  );
}