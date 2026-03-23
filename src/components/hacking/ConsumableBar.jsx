import useGameStore from '../../store/useGameStore';

export default function ConsumableBar() {
  const consumables             = useGameStore(s => s.consumables);
  const performConsumable       = useGameStore(s => s.useConsumable);
  const inventory               = useGameStore(s => s.inventory || []);
  const performHardware         = useGameStore(s => s.useHardware);
  const hasBeatenGame           = useGameStore(s => s.hasBeatenGame);
  const getCurrentAct           = useGameStore(s => s.getCurrentAct);
  const globalConsumableCooldown = useGameStore(s => s.globalConsumableCooldown || 0);
  const gameMode                = useGameStore(s => s.gameMode);
  const isTutorial              = useGameStore(s => s.isTutorial);

  const rabbit = consumables?.rabbit ?? 0;
  const ghost  = consumables?.ghost ?? 0;

  const activeHardware = inventory.map((item, idx) => ({ ...item, originalIndex: idx }))
    .filter(item => item.id === 'LIQUID_COOLER' || item.id === 'SIGNAL_BOOSTER');

  const showBar = hasBeatenGame || getCurrentAct() >= 2 || rabbit > 0 || ghost > 0 || activeHardware.length > 0;
  if (!showBar || gameMode === 'arcade' || isTutorial) return null;

  const onGlobalCooldown = globalConsumableCooldown > 0;

  const handleUseRabbit = () => performConsumable('rabbit');
  const handleUseGhost = () => performConsumable('ghost');
  const handleUseHardware = (idx) => performHardware(idx);

  return (
    <div className="flex flex-col gap-2 px-4 py-2 border-t border-zinc-800/40 pb-3">
      {(hasBeatenGame || getCurrentAct() >= 2 || rabbit > 0 || ghost > 0) && (
        <div className="flex gap-2">
          <button
            onClick={handleUseRabbit}
            disabled={rabbit === 0 || onGlobalCooldown}
            className={[
              'flex-1 py-3 px-4 rounded-sm font-mono text-xs font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] active:border-b active:translate-y-[2px]',
              rabbit > 0 && !onGlobalCooldown
                ? 'border-green-500/60 border-b-green-700 text-green-400 bg-green-500/5 hover:bg-green-500/15 glow-green'
                : 'border-zinc-800 border-b-zinc-900 text-zinc-600 bg-zinc-900/50 cursor-not-allowed opacity-50',
            ].join(' ')}
          >
            RABBIT [×{rabbit}]{onGlobalCooldown ? ` — ${globalConsumableCooldown}s` : ''}
          </button>
          <button
            onClick={handleUseGhost}
            disabled={ghost === 0 || onGlobalCooldown}
            className={[
              'flex-1 py-3 px-4 rounded-sm font-mono text-xs font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] active:border-b active:translate-y-[2px]',
              ghost > 0 && !onGlobalCooldown
                ? 'border-slate-400/60 border-b-slate-600 text-slate-300 bg-slate-500/5 hover:bg-slate-500/15 glow-slate'
                : 'border-zinc-800 border-b-zinc-900 text-zinc-600 bg-zinc-900/50 cursor-not-allowed opacity-50',
            ].join(' ')}
          >
            GHOST.sys [×{ghost}]{onGlobalCooldown ? ` — ${globalConsumableCooldown}s` : ''}
          </button>
        </div>
      )}

      {activeHardware.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x mt-1">
          {activeHardware.map((item, i) => (
             <button
               key={`${item.id}-${i}`}
               onClick={() => handleUseHardware(item.originalIndex)}
               disabled={onGlobalCooldown}
               className={[
                 'shrink-0 flex-1 min-w-[120px] py-2.5 px-3 rounded-sm font-mono text-xs font-bold uppercase tracking-widest transition-all duration-75 border border-b-[3px] active:border-b active:translate-y-[2px] snap-center',
                 onGlobalCooldown
                   ? 'border-zinc-800 border-b-zinc-900 text-zinc-600 bg-zinc-900/50 cursor-not-allowed opacity-50'
                   : 'border-cyan-500/50 border-b-cyan-700 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.15)]',
               ].join(' ')}
             >
               INJECT {item.name} {(item.count || 1) > 1 ? `[×${item.count}]` : ''}
             </button>
          ))}
        </div>
      )}
    </div>
  );
}