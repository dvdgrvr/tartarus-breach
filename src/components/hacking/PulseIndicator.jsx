import useGameStore from '../../store/useGameStore';
import { PULSE_INTERVAL_TICKS, PULSE_WINDOW_TICKS } from '../../config/constants';

// Phase 3.1 — Visible sync-window indicator.
// Per Phase 5.1, this is intended to eventually merge into the existing BossCore
// ring component; for now it stands alone as a small charge bar near the meters.
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
    // Static high-contrast state change — just the label
    return (
      <div className="px-4 mb-1 flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-zinc-400 w-12 shrink-0">
          SYNC
        </span>
        <div className="flex-1 h-2 bg-zinc-900 rounded-none border border-zinc-800">
          <div
            className={`h-full transition-colors duration-100 ${
              pulseActive
                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                : 'bg-zinc-700'
            }`}
            style={{ width: pulseActive ? '100%' : `${chargePercent}%` }}
          />
        </div>
        <span className={`font-mono text-[10px] font-bold tabular-nums shrink-0 w-14 text-right ${
          pulseActive ? 'text-cyan-300' : 'text-zinc-500'
        }`}>
          {pulseActive ? 'OPEN' : `${Math.round(chargePercent)}%`}
        </span>
      </div>
    );
  }

  return (
    <div className="px-4 mb-1 flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-zinc-400 w-12 shrink-0">
        SYNC
      </span>
      <div className={`flex-1 h-2 bg-zinc-900 rounded-none border transition-all duration-75 ${
        pulseActive
          ? 'border-cyan-400 scale-105 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
          : 'border-zinc-800'
      }`}>
        <div
          className={`h-full transition-all duration-300 ${
            pulseActive
              ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]'
              : 'bg-cyan-700/50'
          }`}
          style={{ width: pulseActive ? '100%' : `${chargePercent}%` }}
        />
      </div>
      <span className={`font-mono text-[10px] font-bold tabular-nums shrink-0 w-14 text-right transition-colors ${
        pulseActive ? 'text-cyan-300 animate-pulse' : 'text-zinc-500'
      }`}>
        {pulseActive ? 'SYNC' : `${Math.round(chargePercent)}%`}
      </span>
    </div>
  );
}