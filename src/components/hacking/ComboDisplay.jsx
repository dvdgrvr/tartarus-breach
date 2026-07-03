import useGameStore from '../../store/useGameStore';

// Phase 3.3: Repurposed from the old SCAN→DECRYPT→PULSE combo chain
// to display the Sync Hit streak counter (Phase 3.1).
export default function ComboDisplay() {
  const streak      = useGameStore(s => s.syncStreak ?? 0);
  const pulseActive = useGameStore(s => s.pulseActive);

  if (streak < 1) return null;

  const isHot = streak >= 3;

  return (
    <div className="px-4 flex items-center gap-2 mb-1 mt-1">
      <span className="font-mono text-xs text-cyan-400 uppercase tracking-tighter">
        Sync_Streak:
      </span>
      <span className={`font-mono text-xs font-black tracking-widest ${
        isHot
          ? 'text-cyan-300 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.5)]'
          : 'text-cyan-500'
      }`}>
        ×{streak}
      </span>
      {isHot && (
        <span className="font-mono text-xs font-black text-cyan-400/80 uppercase tracking-widest">
          IN_THE_RHYTHM
        </span>
      )}
    </div>
  );
}
