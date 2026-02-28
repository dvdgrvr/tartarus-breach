import useGameStore from '../store/useGameStore';
import upgradesConfig from '../data/upgradesConfig.json';

// ─── Helper ───────────────────────────────────────────────────────────────────

function calcUpgradeCost(cfg, currentLevel) {
  return Math.floor(cfg.baseCost * Math.pow(cfg.costScaling, currentLevel));
}

// ─── Session Summary ──────────────────────────────────────────────────────────

function SessionSummary() {
  const earned    = useGameStore(s => s.sessionCreditsEarned);
  const heat      = useGameStore(s => s.packUpHeat);
  const trace     = useGameStore(s => s.packUpTrace);

  return (
    <div className="glass-panel rounded-lg p-4 mb-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400/50 mb-3">
        // Session Log
      </p>
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="font-mono text-xs text-zinc-500">Credits Harvested</span>
          <span className="font-mono text-sm font-bold text-green-400">
            +{earned} <span className="text-green-400/50 text-[10px]">CR</span>
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-mono text-xs text-zinc-500">Heat at Exit</span>
          <span className={`font-mono text-xs font-bold ${heat >= 80 ? 'text-red-400' : heat >= 50 ? 'text-orange-400' : 'text-zinc-400'}`}>
            {heat.toFixed(0)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-mono text-xs text-zinc-500">Trace at Exit</span>
          <span className={`font-mono text-xs font-bold ${trace >= 80 ? 'text-red-400' : trace >= 50 ? 'text-orange-400' : 'text-zinc-400'}`}>
            {trace.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Level Pips ───────────────────────────────────────────────────────────────

function LevelPips({ current, max }) {
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-sm transition-colors duration-300 ${
            i < current ? 'bg-green-400' : 'bg-zinc-700'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Upgrade Card ─────────────────────────────────────────────────────────────

function UpgradeCard({ cfg }) {
  const credits         = useGameStore(s => s.credits);
  const level           = useGameStore(s => s.upgrades[cfg.id]?.level ?? 0);
  const purchaseUpgrade = useGameStore(s => s.purchaseUpgrade);

  const isMaxed    = level >= cfg.maxLevel;
  const cost       = isMaxed ? null : calcUpgradeCost(cfg, level);
  const canAfford  = !isMaxed && credits >= cost;

  // Border and background shift based on state
  const cardClass = isMaxed
    ? 'border-green-500/25 bg-green-500/5'
    : canAfford
      ? 'border-white/10 bg-white/5 hover:border-violet-500/40'
      : 'border-white/[0.04] bg-white/[0.02]';

  return (
    <div className={`glass-panel rounded-lg p-4 border transition-colors duration-200 ${cardClass}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">{cfg.icon}</span>
          <div>
            <p className="font-mono text-xs font-bold text-zinc-100 leading-tight">{cfg.label}</p>
            <p className="font-mono text-[10px] text-zinc-600 mt-0.5">{cfg.effectSummary}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <LevelPips current={level} max={cfg.maxLevel} />
          <span className="font-mono text-[10px] text-zinc-600">Lv {level}/{cfg.maxLevel}</span>
        </div>
      </div>

      {/* Description */}
      <p className="font-mono text-[10px] text-zinc-600 leading-relaxed mb-3">
        {cfg.description}
      </p>

      {/* Buy row */}
      <div className="flex items-center justify-between">
        {isMaxed ? (
          <span className="font-mono text-xs text-green-400 uppercase tracking-widest">
            ✓ Max Level
          </span>
        ) : (
          <>
            <span className={`font-mono text-sm font-bold tabular-nums ${canAfford ? 'text-cyan-400' : 'text-zinc-700'}`}>
              {cost} <span className={`text-[10px] ${canAfford ? 'text-cyan-400/50' : 'text-zinc-700'}`}>CR</span>
            </span>
            <button
              onClick={() => purchaseUpgrade(cfg.id)}
              disabled={!canAfford}
              className={[
                'px-5 py-1.5 rounded border font-mono text-xs uppercase tracking-widest',
                'transition-all duration-150 active:scale-95',
                canAfford
                  ? 'border-violet-500/50 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-400 glow-violet'
                  : 'border-zinc-800 text-zinc-700 cursor-not-allowed',
              ].join(' ')}
            >
              BUY
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Black Market Section ─────────────────────────────────────────────────────

function BlackMarket() {
  return (
    <div className="mb-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-violet-400/60 mb-3">
        // Black Market
      </p>
      <div className="space-y-3">
        {upgradesConfig.map(cfg => (
          <UpgradeCard key={cfg.id} cfg={cfg} />
        ))}
      </div>
    </div>
  );
}

// ─── Transit Scene (main) ─────────────────────────────────────────────────────

export default function TransitScene() {
  const credits        = useGameStore(s => s.credits);
  const startNewSession = useGameStore(s => s.startNewSession);

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">

      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm shrink-0">
        <p className="font-mono text-[10px] uppercase tracking-widest text-green-400/50">
          // Transit Mode — Signal Rerouted
        </p>
        <div className="flex items-center justify-between mt-1">
          <h2 className="font-mono text-sm font-bold text-zinc-200 uppercase tracking-widest">
            Safe House
          </h2>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[10px] text-cyan-400/50 uppercase tracking-widest">Balance</span>
            <span className="font-mono text-xl font-bold text-cyan-400 tabular-nums">{credits}</span>
            <span className="font-mono text-[10px] text-cyan-400/50 uppercase">CR</span>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        <SessionSummary />
        <BlackMarket />
      </div>

      {/* ── Footer CTA ── */}
      <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur-sm shrink-0">
        <button
          onClick={startNewSession}
          className="w-full py-3 rounded-lg border border-green-500/40 text-green-400 font-mono text-sm font-bold uppercase tracking-widest hover:bg-green-500/10 hover:border-green-400 transition-all duration-200 active:scale-[0.99] glow-green"
        >
          New Job
        </button>
      </div>
    </div>
  );
}
