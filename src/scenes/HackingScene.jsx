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

const SAFEHOUSE_TRAIT_COLOR = {
  cyan:    'text-cyan-400    border-cyan-500/30    bg-cyan-500/10',
  amber:   'text-amber-400   border-amber-500/30   bg-amber-500/10',
  emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  slate:   'text-slate-400   border-slate-500/30   bg-slate-500/10',
  fuchsia: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10',
};

function NodeStatusStrip() {
  const node             = useGameStore(s => s.currentNode);
  const firewallRevealed = useGameStore(s => s.firewallRevealed);
  const heat             = useGameStore(s => s.physicalHeat);
  const safehouse        = useGameStore(s => s.currentSafehouse);

  if (!node) return null;

  const badge = node.specialDefense ? DEFENSE_BADGE[node.specialDefense] : null;
  const showDecryptedBadge = badge && node.specialDefense === 'ENCRYPTED_LOGS' && firewallRevealed;

  const isHeatWarning  = heat >= 50;
  const isHeatCritical = heat >= 80;

  const traitColor = SAFEHOUSE_TRAIT_COLOR[safehouse?.color] ?? SAFEHOUSE_TRAIT_COLOR.cyan;
  const showTrait  = safehouse?.trait && safehouse.trait !== 'Standard';

  return (
    <div className="px-3 py-1.5 border-b border-zinc-800/50 flex items-center justify-between gap-2 bg-zinc-900/40">
      <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest truncate">
        // {node.name}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        {/* Safehouse trait — hidden for Standard (ALPHA) to avoid clutter */}
        {showTrait && (
          <span className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${traitColor}`}
                title={safehouse.desc}>
            {safehouse.trait}
          </span>
        )}

        {/* Heat warning */}
        {isHeatWarning && (
          <span className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded ${
            isHeatCritical ? 'text-red-400 bg-red-500/10 animate-pulse' : 'text-orange-400 bg-orange-500/10'
          }`}>
            HEAT: {heat.toFixed(0)}%
          </span>
        )}

        {/* Defense badge */}
        {badge && (
          <span className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${
            showDecryptedBadge
              ? 'text-green-400 border-green-500/30 bg-green-500/10'
              : badge.color
          }`}>
            {showDecryptedBadge ? 'DECRYPTED' : badge.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Firewall Row ─────────────────────────────────────────────────────────────
// When the node has ENCRYPTED_LOGS and DECRYPT hasn't been used yet,
// show an obfuscated bar instead of the real percentage.

// ─── Firewall Row ─────────────────────────────────────────────────────────────
// Updated: Uses a 10-segment "Armor Block" UI to differentiate from the smooth Trace bar.

function FirewallRow() {
  const firewallHealth   = useGameStore(s => s.firewallHealth);
  const node             = useGameStore(s => s.currentNode);
  const firewallRevealed = useGameStore(s => s.firewallRevealed);

  const isHidden = node?.specialDefense === 'ENCRYPTED_LOGS' && !firewallRevealed;
  const maxHP    = node?.firewallHP ?? 100;
  
  // Calculate how many of the 10 blocks should be lit up
  const totalBlocks = 10;
  const hpPercentage = Math.max(0, firewallHealth / maxHP);
  const activeBlocks = Math.ceil(hpPercentage * totalBlocks);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest w-12 shrink-0 text-zinc-500 font-bold">
        FW_HP
      </span>

      {isHidden ? (
        // Encrypted display — Glitchy static amber block
        <div className="flex-1 flex gap-0.5 h-3">
          <div className="h-full w-full bg-amber-500/40 opacity-80 animate-pulse border border-amber-500/50" />
          <span className="font-mono text-[10px] tabular-nums w-7 text-right text-amber-500/60 ml-2">
            ??
          </span>
        </div>
      ) : (
        // Segmented Armor Blocks display
        <div className="flex-1 flex gap-0.5 h-3">
          {Array.from({ length: totalBlocks }).map((_, i) => {
            const isActive = i < activeBlocks;
            return (
              <div
                key={i}
                className={`flex-1 h-full transition-all duration-150 ${
                  isActive 
                    ? 'bg-violet-500 border-y border-violet-400 shadow-[0_0_5px_rgba(139,92,246,0.3)]' 
                    : 'bg-zinc-800/50 border-y border-zinc-800'
                }`}
              />
            );
          })}
          <span className="font-mono text-[10px] tabular-nums w-8 text-right text-zinc-400 font-bold ml-1 shrink-0">
            {Math.ceil(firewallHealth)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Trace Row ────────────────────────────────────────────────────────────────

// ─── Trace Row ────────────────────────────────────────────────────────────────
// Updated: Smooth, continuous bar with aggressive gradient styling for critical states.

function TraceRow() {
  const trace         = useGameStore(s => s.digitalTrace);
  const node          = useGameStore(s => s.currentNode);
  const pulseActive   = useGameStore(s => s.pulseActive);
  const shakeEnabled  = useGameStore(s => s.settings?.shakeEnabled ?? true);
  const isAccelerated = node?.specialDefense === 'TRACE_ACCELERATOR'
                     || node?.specialDefense === 'DARKNET';

  const isDanger  = trace >= 80;
  const isWarning = trace >= 50;

  const labelColor = isDanger
    ? 'text-red-400'
    : pulseActive
      ? 'text-cyan-300'
      : isWarning
        ? 'text-orange-400'
        : 'text-zinc-500';

  // Instead of flat backgrounds, we use gradients to give Trace a "fluid/digital" feel
  const barGradient = isDanger
    ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'
    : isWarning
      ? 'bg-gradient-to-r from-orange-600 to-orange-400'
      : pulseActive
        ? 'bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
        : 'bg-gradient-to-r from-blue-700 to-blue-500';

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 ${isDanger && shakeEnabled ? 'danger-shake' : ''}`}>
      <span className={`font-mono text-[10px] uppercase tracking-widest w-12 shrink-0 font-bold ${labelColor} ${isDanger || pulseActive ? 'animate-pulse' : ''}`}>
        {isDanger ? '[!]TR' : pulseActive ? 'SYNC' : isAccelerated ? 'TR x2' : 'TRACE'}
      </span>

      {/* Container with an inset shadow to look like a hardware groove */}
      <div className={`flex-1 h-2.5 bg-black rounded-full overflow-hidden border shadow-inner relative transition-all duration-150 ${
        pulseActive ? 'border-cyan-500/60 shadow-[0_0_6px_rgba(34,211,238,0.3)]' : 'border-zinc-800'
      }`}>
        {/* Subtle CRT scanline overlay inside the empty bar */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />

        <div
          className={`h-full rounded-full transition-all duration-300 ${barGradient} ${isAccelerated && !isDanger && !pulseActive ? 'opacity-80 animate-pulse' : ''}`}
          style={{ width: `${Math.min(100, trace)}%` }}
        />
      </div>

      <span className={`font-mono text-[10px] tabular-nums w-8 text-right font-bold shrink-0 ${labelColor}`}>
        {trace.toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Consumable Bar ───────────────────────────────────────────────────────────
// Sits between the gauge rows and the command bar.
// Always rendered; buttons are disabled (greyed) when count is 0.

// ─── Consumable Bar ───────────────────────────────────────────────────────────

function ConsumableBar() {
  const consumables    = useGameStore(s => s.consumables);
  const useConsumable  = useGameStore(s => s.useConsumable);
  const hasBeatenGame  = useGameStore(s => s.hasBeatenGame);
  const intelFragments = useGameStore(s => s.intelFragments);
  const zeroDay        = consumables?.zeroDay ?? 0;
  const coolant        = consumables?.coolant ?? 0;

  if (!hasBeatenGame || (intelFragments < 50 && zeroDay === 0 && coolant === 0)) return null;

  return (
    <div className="flex gap-2 px-3 py-2 border-t border-zinc-800/40 pb-3">
      <button
        onClick={() => useConsumable('zeroDay')}
        disabled={zeroDay === 0}
        className={[
          'flex-1 py-3 px-4 rounded font-mono text-[10px] font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] active:border-b active:translate-y-[2px]',
          zeroDay > 0
            ? 'border-amber-500/60 border-b-amber-700 text-amber-400 bg-amber-500/5 hover:bg-amber-500/15'
            : 'border-zinc-800 border-b-zinc-900 text-zinc-700 cursor-not-allowed',
        ].join(' ')}
      >
        ZER0-DAY [×{zeroDay}]
      </button>
      <button
        onClick={() => useConsumable('coolant')}
        disabled={coolant === 0}
        className={[
          'flex-1 py-3 px-4 rounded font-mono text-[10px] font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] active:border-b active:translate-y-[2px]',
          coolant > 0
            ? 'border-blue-500/60 border-b-blue-700 text-blue-400 bg-blue-500/5 hover:bg-blue-500/15'
            : 'border-zinc-800 border-b-zinc-900 text-zinc-700 cursor-not-allowed',
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
  
  const isBreaching     = useGameStore(s => s.isBreaching);
  const isPerfectBreach = useGameStore(s => s.isPerfectBreach);

  const isTraceDanger = trace >= 80;
  const isHeatDanger  = heat  >= 80;

  // CSS filter class during breach animation — golden glitch for Perfect, standard for normal
  const breachTearClass = isBreaching
    ? isPerfectBreach
      ? "brightness-150 contrast-150 saturate-200 hue-rotate-[25deg] skew-x-[-4deg] scale-105 transition-none"
      : "invert brightness-150 contrast-200 hue-rotate-90 skew-x-[-4deg] scale-105 transition-none"
    : "transition-all duration-300 ease-in";

  return (
    // We apply the breachTearClass right to the main wrapper
    <div className={`flex flex-col h-full bg-zinc-950 relative ${breachTearClass}`}>

      {/* ── Breach Success Overlay — golden for Perfect, green for standard ── */}
      {isBreaching && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          {isPerfectBreach ? (
            <div className="border-y-4 border-yellow-400 w-full py-6 bg-yellow-500/10 flex flex-col items-center shadow-[0_0_40px_rgba(234,179,8,0.5)]">
              <h1 className="font-mono text-4xl font-black text-yellow-400 uppercase tracking-[0.3em] drop-shadow-[0_0_12px_rgba(234,179,8,0.9)] animate-pulse">
                PERFECT
              </h1>
              <p className="font-mono text-sm font-bold text-yellow-300/90 tracking-[0.2em] uppercase mt-1">
                BREACH
              </p>
              <p className="font-mono text-xs text-yellow-300/60 tracking-widest mt-2 uppercase">
                +25% Intel · Extracting payload...
              </p>
            </div>
          ) : (
            <div className="border-y-4 border-green-500 w-full py-6 bg-green-500/10 flex flex-col items-center shadow-[0_0_30px_rgba(34,197,94,0.3)]">
              <h1 className="font-mono text-4xl font-black text-green-400 uppercase tracking-[0.3em] drop-shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse">
                BREACHED
              </h1>
              <p className="font-mono text-xs text-green-300/80 tracking-widest mt-2 uppercase">
                Extracting payload...
              </p>
            </div>
          )}
        </div>
      )}

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
