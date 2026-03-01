import { TopBorder, BottomBorder } from '../components/PeripheralBorder';
import TerminalLog from '../components/TerminalLog';
import CommandBar from '../components/CommandBar';
import useGameStore from '../store/useGameStore';

// ─── Node Status Strip ────────────────────────────────────────────────────────
// Thin persistent header showing target name and active special defense badge.

const DEFENSE_BADGE = {
  ENCRYPTED_LOGS:    { label: 'ENCRYPTED',  color: 'text-amber-400  border-amber-500/30  bg-amber-500/10'  },
  TRACE_ACCELERATOR: { label: 'TRACE x2',   color: 'text-red-400    border-red-500/30    bg-red-500/10'    },
  DARKNET:           { label: 'DARKNET',     color: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10' },
};

function NodeStatusStrip() {
  const node            = useGameStore(s => s.currentNode);
  const firewallRevealed = useGameStore(s => s.firewallRevealed);

  if (!node) return null;

  const badge = node.specialDefense ? DEFENSE_BADGE[node.specialDefense] : null;
  // Show a "DECRYPTED" override badge once the player has used DECRYPT
  const showDecryptedBadge = badge && node.specialDefense === 'ENCRYPTED_LOGS' && firewallRevealed;

  return (
    <div className="px-3 py-1.5 border-b border-zinc-800/50 flex items-center justify-between gap-2">
      <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest truncate">
        // {node.name}
      </span>
      {badge && (
        <span className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0 ${
          showDecryptedBadge
            ? 'text-green-400 border-green-500/30 bg-green-500/10'
            : badge.color
        }`}>
          {showDecryptedBadge ? 'DECRYPTED' : badge.label}
        </span>
      )}
    </div>
  );
}

// ─── Firewall Row ─────────────────────────────────────────────────────────────
// When the node has ENCRYPTED_LOGS and DECRYPT hasn't been used yet,
// show an obfuscated bar instead of the real percentage.

function FirewallRow() {
  const firewallHealth   = useGameStore(s => s.firewallHealth);
  const node             = useGameStore(s => s.currentNode);
  const firewallRevealed = useGameStore(s => s.firewallRevealed);

  const isHidden = node?.specialDefense === 'ENCRYPTED_LOGS' && !firewallRevealed;
  const maxHP    = node?.firewallHP ?? 100;
  const barWidth = Math.min(100, (firewallHealth / maxHP) * 100);

  return (
    <div className="flex items-center gap-2 px-3 py-0.5">
      <span className="font-mono text-[10px] uppercase tracking-widest w-12 shrink-0 text-zinc-500">
        FW
      </span>

      {isHidden ? (
        // Encrypted display — static amber fill instead of a real bar
        <>
          <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full w-full bg-amber-500/40 rounded-full" />
          </div>
          <span className="font-mono text-[10px] tabular-nums w-7 text-right text-amber-500/60">
            ??
          </span>
        </>
      ) : (
        // Normal display — raw HP integer, no %
        <>
          <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-300"
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <span className="font-mono text-[10px] tabular-nums w-7 text-right text-zinc-500">
            {Math.ceil(firewallHealth)}
          </span>
        </>
      )}
    </div>
  );
}

// ─── Trace Row ────────────────────────────────────────────────────────────────

function TraceRow() {
  const trace         = useGameStore(s => s.digitalTrace);
  const node          = useGameStore(s => s.currentNode);
  const shakeEnabled  = useGameStore(s => s.settings?.shakeEnabled ?? true);
  const isAccelerated = node?.specialDefense === 'TRACE_ACCELERATOR'
                     || node?.specialDefense === 'DARKNET';

  const isDanger  = trace >= 80;
  const isWarning = trace >= 50;
  const labelColor = isDanger ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-zinc-500';
  const barColor   = isDanger ? 'bg-red-500'   : isWarning ? 'bg-orange-500'   : 'bg-blue-500';

  return (
    <div className={`flex items-center gap-2 px-3 py-0.5 ${isDanger && shakeEnabled ? 'danger-shake' : ''}`}>
      <span className={`font-mono text-[10px] uppercase tracking-widest w-12 shrink-0 ${labelColor} ${isDanger ? 'animate-pulse' : ''}`}>
        {isDanger ? '[!]TR' : isAccelerated ? 'TR x2' : 'TRACE'}
      </span>
      <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor} ${isAccelerated && !isDanger ? 'opacity-80' : ''}`}
          style={{ width: `${Math.min(100, trace)}%` }}
        />
      </div>
      <span className={`font-mono text-[10px] tabular-nums w-7 text-right ${labelColor}`}>
        {trace.toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Consumable Bar ───────────────────────────────────────────────────────────
// Sits between the gauge rows and the command bar.
// Always rendered; buttons are disabled (greyed) when count is 0.

function ConsumableBar() {
  const consumables    = useGameStore(s => s.consumables);
  const useConsumable  = useGameStore(s => s.useConsumable);
  const hasBeatenGame  = useGameStore(s => s.hasBeatenGame);
  const intelFragments = useGameStore(s => s.intelFragments);
  const zeroDay        = consumables?.zeroDay ?? 0;
  const coolant        = consumables?.coolant ?? 0;

  if (!hasBeatenGame || (intelFragments < 50 && zeroDay === 0 && coolant === 0)) return null;

  return (
    <div className="flex gap-2 px-3 py-1.5 border-t border-zinc-800/40">
      <button
        onClick={() => useConsumable('zeroDay')}
        disabled={zeroDay === 0}
        className={[
          'flex-1 py-3 px-4 rounded border font-mono text-xs uppercase tracking-widest transition-all duration-150',
          zeroDay > 0
            ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10 active:scale-95'
            : 'border-zinc-800 text-zinc-700 cursor-not-allowed',
        ].join(' ')}
      >
        ZER0-DAY [×{zeroDay}]
      </button>
      <button
        onClick={() => useConsumable('coolant')}
        disabled={coolant === 0}
        className={[
          'flex-1 py-3 px-4 rounded border font-mono text-xs uppercase tracking-widest transition-all duration-150',
          coolant > 0
            ? 'border-blue-500/40 text-blue-400 hover:bg-blue-500/10 active:scale-95'
            : 'border-zinc-800 text-zinc-700 cursor-not-allowed',
        ].join(' ')}
      >
        COOLANT [×{coolant}]
      </button>
    </div>
  );
}

// ─── Hacking Scene ────────────────────────────────────────────────────────────

export default function HackingScene() {
  const trace = useGameStore(s => s.digitalTrace);
  const heat  = useGameStore(s => s.physicalHeat);

  const isTraceDanger = trace >= 80;
  const isHeatDanger  = heat  >= 80;

  return (
    <div className="flex flex-col h-full bg-zinc-950 relative">

      {/* Siren vignette — pointer-events-none, pulses when heat is critical */}
      {isHeatDanger && <div className="siren-vignette" />}

      {/* Top — Physical Heat peripheral */}
      <TopBorder />

      {/* Center — Node strip + Terminal + Gauges + Commands */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <NodeStatusStrip />

        {/* Terminal — digital-glitch applied when trace is critical */}
        <TerminalLog className={isTraceDanger ? 'digital-glitch' : ''} />

        <div className="border-t border-zinc-800/60 pt-1 pb-0.5">
          <FirewallRow />
          <TraceRow />
        </div>

        <ConsumableBar />

        <CommandBar />
      </div>

      {/* Bottom — Intel Fragments + Pack Up peripheral */}
      <BottomBorder />
    </div>
  );
}
