import useGameStore from '../../store/useGameStore';
import { DIAGNOSTIC_MAP, SAFEHOUSE_TRAIT_COLOR } from './hackingConstants';

export default function NodeStatusStrip({ onInspect }) {
  const node      = useGameStore(s => s.currentNode);
  const heat      = useGameStore(s => s.physicalHeat);
  const safehouse = useGameStore(s => s.currentSafehouse);

  if (!node) return null;

  const isHeatWarning  = heat >= 50;
  const isHeatCritical = heat >= 80;

  const traitColor = SAFEHOUSE_TRAIT_COLOR[safehouse?.color] ?? SAFEHOUSE_TRAIT_COLOR.cyan;
  const showTrait  = safehouse?.trait && safehouse.trait !== 'Standard';
  const traitData  = DIAGNOSTIC_MAP[safehouse?.trait];

  return (
    <div className="px-4 py-1.5 border-b border-zinc-800/50 flex items-center justify-between gap-2 bg-zinc-900/40">
      <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-widest truncate">
        root@node:~/{node.name}#
      </span>

      <div className="flex items-center gap-2 shrink-0">
        {/* Safehouse Trait Icon Button */}
        {showTrait && (
          <button
            onClick={() => onInspect(safehouse.trait)}
            className={`font-mono text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${traitColor} active:scale-95 transition-transform flex items-center gap-1.5`}
          >
            <span>{traitData?.icon}</span>
            <span className="hidden sm:inline">[{safehouse.trait}]</span>
          </button>
        )}

        {/* Node Defense Icon Button */}
        {node.specialDefense && (
          <button
            onClick={() => onInspect(node.specialDefense)}
            className="font-mono text-xs font-black px-1.5 py-0.5 rounded-sm border border-red-950 bg-red-900/20 text-red-500 animate-pulse flex items-center gap-1.5 active:scale-95"
          >
            <span>{DIAGNOSTIC_MAP[node.specialDefense]?.icon}</span>
            <span className="hidden sm:inline uppercase tracking-tighter">DEFENSE</span>
          </button>
        )}

        {/* --- NEW: Node Mutator Button --- */}
        {node.mutator && (
          <button
            onClick={() => onInspect(node.mutator.id)}
            className={`font-mono text-xs font-black px-1.5 py-0.5 rounded-sm border animate-pulse flex items-center gap-1.5 active:scale-95 ${
              node.mutator.id === 'GOLD_CACHE' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/20 shadow-[0_0_8px_rgba(234,179,8,0.4)]' :
              node.mutator.id === 'VOLATILE' ? 'border-orange-500/50 text-orange-400 bg-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.4)]' :
              'border-fuchsia-500/50 text-fuchsia-400 bg-fuchsia-500/20'
            }`}
          >
            <span>{DIAGNOSTIC_MAP[node.mutator.id]?.icon || '⚠'}</span>
            <span className="hidden sm:inline uppercase tracking-tighter">{node.mutator.id.replace('_', ' ')}</span>
          </button>
        )}

        {isHeatWarning && (
          <span className={`font-mono text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${isHeatCritical ? 'text-red-400 bg-red-500/10 animate-pulse border border-red-500/50' : 'text-orange-400 bg-orange-500/10'}`}>
            HEAT: {heat.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}