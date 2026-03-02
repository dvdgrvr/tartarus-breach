import { useState, useEffect } from 'react';
import useGameStore from '../store/useGameStore';
import upgradesConfig from '../data/upgradesConfig.json';
import storyFragments from '../data/storyFragments.json';

// ─── Corrupt Text ─────────────────────────────────────────────────────────────

export function corruptText(text) {
  const chars = '!<>-_\\\\/[]{}—=+*^?#_';
  return text.split('').map(char => {
    if (char.match(/[a-zA-Z0-9]/) && Math.random() > 0.3) {
      return chars[Math.floor(Math.random() * chars.length)];
    }
    return char;
  }).join('');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcUpgradeCost(cfg, currentLevel) {
  return Math.floor(cfg.baseCost * Math.pow(cfg.costScaling, currentLevel));
}

// ─── Session Summary ──────────────────────────────────────────────────────────

const OUTCOME_BADGE = {
  initial:      { label: 'SYSTEM ONLINE',                className: 'text-cyan-400  border-cyan-500/40  bg-cyan-500/10'     },
  success:      { label: 'SYSTEM BREACHED',              className: 'text-green-400 border-green-500/40 bg-green-500/10'    },
  escaped:      { label: 'TACTICAL RETREAT',             className: 'text-amber-400 border-amber-500/40 bg-amber-500/10'    },
  trace_busted: { label: 'CONNECTION SEVERED. 0 INTEL.', className: 'text-red-400   border-red-500/40   bg-red-500/10'      },
  heat_busted:  { label: 'SAFEHOUSE RAIDED. INTEL LOST.',className: 'text-red-400   border-red-500/40   bg-red-500/10 animate-pulse' },
};

function SessionSummary() {
  const earned  = useGameStore(s => s.sessionIntelEarned);
  const heat    = useGameStore(s => s.packUpHeat);
  const trace   = useGameStore(s => s.packUpTrace);
  const outcome = useGameStore(s => s.transitOutcome);

  const badge = OUTCOME_BADGE[outcome] ?? OUTCOME_BADGE.escaped;

  return (
    <div className="glass-panel rounded-lg p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400/50">
          // Session Log
        </p>
        <span className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border ${badge.className}`}>
          {badge.label}
        </span>
      </div>
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="font-mono text-xs text-zinc-500">Intel Harvested</span>
          <span className="font-mono text-sm font-bold text-green-400">
            +{earned} <span className="text-green-400/50 text-[10px]">IF</span>
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
  const intelFragments  = useGameStore(s => s.intelFragments);
  const level           = useGameStore(s => s.upgrades[cfg.id]?.level ?? 0);
  const purchaseUpgrade = useGameStore(s => s.purchaseUpgrade);

  const isMaxed   = level >= cfg.maxLevel;
  const cost      = isMaxed ? null : calcUpgradeCost(cfg, level);
  const canAfford = !isMaxed && intelFragments >= cost;

  const cardClass = isMaxed
    ? 'border-green-500/25 bg-green-500/5'
    : canAfford
      ? 'border-white/10 bg-white/5 hover:border-violet-500/40'
      : 'border-white/[0.04] bg-white/[0.02]';

  return (
    <div className={`glass-panel rounded-lg p-4 border transition-colors duration-200 ${cardClass}`}>
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

      <p className="font-mono text-[10px] text-zinc-600 leading-relaxed mb-3">
        {cfg.description}
      </p>

      <div className="flex items-center justify-between">
        {isMaxed ? (
          <span className="font-mono text-xs text-green-400 uppercase tracking-widest">
            ✓ Max Level
          </span>
        ) : (
          <>
            <span className={`font-mono text-sm font-bold tabular-nums ${canAfford ? 'text-cyan-400' : 'text-zinc-700'}`}>
              {cost} <span className={`text-[10px] ${canAfford ? 'text-cyan-400/50' : 'text-zinc-700'}`}>IF</span>
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

// ─── Consumable Item ──────────────────────────────────────────────────────────

function ConsumableItem({ itemId, label, description, cost }) {
  const intelFragments = useGameStore(s => s.intelFragments);
  const count          = useGameStore(s => s.consumables?.[itemId] ?? 0);
  const buyConsumable  = useGameStore(s => s.buyConsumable);
  const canAfford      = intelFragments >= cost;

  return (
    <div className="glass-panel rounded-lg p-4 border border-zinc-800/50 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-mono text-xs font-bold text-zinc-100">{label}</p>
          <span className="font-mono text-[10px] text-violet-400/70 tabular-nums shrink-0">×{count}</span>
        </div>
        <p className="font-mono text-[10px] text-zinc-600 truncate">{description}</p>
      </div>
      <button
        onClick={() => buyConsumable(itemId, cost)}
        disabled={!canAfford}
        className={[
          'shrink-0 px-4 py-1.5 rounded border font-mono text-xs uppercase tracking-widest',
          'transition-all duration-150 active:scale-95',
          canAfford
            ? 'border-violet-500/50 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-400'
            : 'border-zinc-800 text-zinc-700 cursor-not-allowed',
        ].join(' ')}
      >
        {cost} IF
      </button>
    </div>
  );
}

// ─── Black Market ─────────────────────────────────────────────────────────────

function BlackMarket() {
  const hasBeatenGame = useGameStore(s => s.hasBeatenGame);
  const archiveLen    = useGameStore(s => s.storyArchive.length);
  const showConsumables = hasBeatenGame || archiveLen >= 12;

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

      {/* Consumables — locked until Tartarus is beaten at least once */}
      {showConsumables && (
        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-violet-400/40 mb-3">
            // Consumables
          </p>
          <div className="space-y-2">
            <ConsumableItem
              itemId="zeroDay"
              label="ZER0-DAY PAYLOAD"
              description="Instant −50 FW damage on use"
              cost={200}
            />
            <ConsumableItem
              itemId="coolant"
              label="COOLANT FLUSH"
              description="Instant −30% Physical Heat on use"
              cost={200}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Narrative Archive ────────────────────────────────────────────────────────

function NarrativeArchive() {
  const storyArchive        = useGameStore(s => s.storyArchive);
  const decryptedFragments  = useGameStore(s => s.decryptedFragments);
  const intelFragments      = useGameStore(s => s.intelFragments);
  const deepDecryptFragment = useGameStore(s => s.deepDecryptFragment);
  const startNewSession     = useGameStore(s => s.startNewSession);
  
  const total     = storyFragments.length;
  const collected = storyArchive.length;
  const DECRYPT_COST = 50;

  const sortedIndices = [...storyArchive].sort((a, b) => a - b);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-green-400/60">
          // Narrative Archive
        </p>
        <span className="font-mono text-[10px] text-zinc-600">
          {collected}/{total} FRAGS
        </span>
      </div>

      {collected === 0 ? (
        <div className="glass-panel rounded-lg p-5 text-center border border-red-900/30 bg-red-950/20 relative overflow-hidden">
          <p className="font-mono text-xs text-red-500/80 font-bold uppercase tracking-widest mb-2">[ SEC_CORRUPTED ]</p>
          <p className="font-mono text-[10px] text-red-400/60 leading-relaxed mb-1">0x000F4A: Drive completely fragmented.</p>
          <div className="w-full bg-red-950/50 h-2 rounded mt-3 mb-2 overflow-hidden border border-red-900/50">
             <div className="w-1/3 h-full bg-red-500/30 animate-pulse" />
          </div>
          <p className="font-mono text-[9px] text-zinc-500 mt-2">Breach a Priority Lead to rebuild sector index.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedIndices.map(idx => {
            const isDecrypted = decryptedFragments.includes(idx);
            const rawText = storyFragments[idx].text;
            const displayText = isDecrypted ? rawText : corruptText(rawText);

            return (
              <div key={idx} className="glass-panel rounded-lg p-4 border border-green-500/10 bg-green-500/[0.02]">
                <div className="flex items-center justify-between mb-2">
                  <p className={`font-mono text-[9px] uppercase tracking-widest ${isDecrypted ? 'text-green-400/40' : 'text-amber-500/60'}`}>
                    Fragment #{String(idx + 1).padStart(3, '0')} — {isDecrypted ? 'Decoded' : 'Encrypted'}
                  </p>
                  <button
                    onClick={() => startNewSession('priority', true, idx + 1)}
                    className="font-mono text-[8px] uppercase tracking-widest text-zinc-600 hover:text-amber-400 border border-zinc-800 hover:border-amber-500/40 px-2 py-0.5 rounded transition-all duration-150 shrink-0 ml-2"
                  >
                    Re-Run
                  </button>
                </div>
                <p className={`font-mono text-[11px] leading-relaxed ${isDecrypted ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {displayText}
                </p>
                {!isDecrypted && (
                  <button
                    onClick={() => deepDecryptFragment(idx, DECRYPT_COST)}
                    disabled={intelFragments < DECRYPT_COST}
                    className={`mt-4 w-full py-2.5 rounded border font-mono text-xs font-bold uppercase tracking-widest transition-all duration-150 ${
                      intelFragments >= DECRYPT_COST 
                        ? 'border-green-500/50 text-green-400 bg-green-500/10 hover:bg-green-500/20 active:scale-95 glow-green' 
                        : 'border-zinc-800 text-zinc-600 bg-transparent cursor-not-allowed'
                    }`}
                  >
                    Decrypt Data // {DECRYPT_COST} IF
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }) {
  const collected = useGameStore(s => s.storyArchive.length);

  const tabs = [
    { id: 'debrief', label: 'DEBRIEF' },
    { id: 'archive', label: 'ARCHIVE', showDot: collected > 0 },
  ];

  return (
    <div className="flex px-5 gap-2 border-b border-zinc-800 shrink-0">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={[
            'flex-1 relative py-2.5 font-mono text-[10px] uppercase tracking-widest',
            'transition-colors duration-150',
            active === tab.id
              ? 'text-green-400 border-b-2 border-green-500 -mb-px'
              : 'text-zinc-600 hover:text-zinc-400',
          ].join(' ')}
        >
          {tab.label}
          {/* Green dot on ARCHIVE tab when frags exist and tab is inactive */}
          {tab.showDot && active !== tab.id && (
            <span className="absolute top-2 right-[calc(50%-18px)] w-1.5 h-1.5 rounded-full bg-green-400" />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Job Selection Footer ─────────────────────────────────────────────────────

function JobFooter({ isLocked }) {
  const startNewSession = useGameStore(s => s.startNewSession);
  const archiveLen      = useGameStore(s => s.storyArchive.length);
  const hasBeatenGame   = useGameStore(s => s.hasBeatenGame);
  const darknetTier     = useGameStore(s => s.darknetTier);

  const isTartarusReady = archiveLen === 11;
  const showTartarus    = isTartarusReady && !hasBeatenGame;
  const showDarknet     = hasBeatenGame;
  const showPriority    = !showTartarus;

  const lockClass = isLocked ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'active:border-b active:translate-y-[2px]';

  return (
    <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur-sm shrink-0 space-y-2 pb-4">
      {/* DATA SKIM — always visible */}
      <button
        onClick={() => startNewSession('skim')}
        disabled={isLocked}
        className={`w-full py-2.5 px-6 rounded-lg font-mono text-xs font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] border-green-500/60 border-b-green-700 text-green-400 bg-green-500/5 hover:bg-green-500/15 glow-green game-button ${lockClass}`}
      >
        Initiate Data Skim
        <span className="block px-2 text-[9px] font-normal text-green-400/50 mt-0.5 normal-case tracking-normal">
          Low-sec target · Low intel · No story data
        </span>
      </button>

      {/* PRIORITY LEAD */}
      {showPriority && (
        <button
          onClick={() => startNewSession('priority')}
          disabled={isLocked}
          className={`w-full py-2.5 px-6 rounded-lg font-mono text-xs font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] border-violet-500/60 border-b-violet-700 text-violet-300 bg-violet-500/5 hover:bg-violet-500/15 glow-violet game-button ${lockClass}`}
        >
          Pursue Priority Lead
          <span className="block px-2 text-[9px] font-normal text-violet-400/50 mt-0.5 normal-case tracking-normal">
            Secure target · Higher intel · Unlocks story fragment
          </span>
        </button>
      )}

      {/* ASSAULT TARTARUS */}
      {showTartarus && (
        <button
          onClick={() => startNewSession('tartarus')}
          disabled={isLocked}
          className={`w-full py-2.5 px-6 rounded-lg font-mono text-xs font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] border-red-500/80 border-b-red-700 text-red-400 bg-red-500/10 hover:bg-red-500/20 animate-pulse game-button ${lockClass}`}
        >
          Assault Tartarus Node
          <span className="block px-2 text-[9px] font-normal text-red-400/70 mt-0.5 normal-case tracking-normal">
            400 HP · TRACE_ACCELERATOR · One chance. No retreat.
          </span>
        </button>
      )}

      {/* ACCESS DARKNET */}
      {showDarknet && (
        <button
          onClick={() => startNewSession('darknet')}
          disabled={isLocked}
          className={`w-full py-2.5 px-6 rounded-lg font-mono text-xs font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] border-fuchsia-500/60 border-b-fuchsia-700 text-fuchsia-300 bg-fuchsia-500/5 hover:bg-fuchsia-500/15 game-button ${lockClass}`}
        >
          Access Darknet Router
          <span className="block px-2 text-[9px] font-normal text-fuchsia-400/50 mt-0.5 normal-case tracking-normal">
            Tier {darknetTier} · {150 + darknetTier * 50} HP · Severe trace rate
          </span>
        </button>
      )}
    </div>
  );
}

// ─── Transit Scene (main) ─────────────────────────────────────────────────────

export default function TransitScene() {
  const [activeTab, setActiveTab] = useState('debrief');
  const [isLocked, setIsLocked]   = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLocked(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const intelFragments     = useGameStore(s => s.intelFragments);
  const archiveLen         = useGameStore(s => s.storyArchive.length);
  const currentSafehouse   = useGameStore(s => s.currentSafehouse);
  const hasBeatenGame      = useGameStore(s => s.hasBeatenGame);
  const darknetTier        = useGameStore(s => s.darknetTier);
  const highestDarknetTier = useGameStore(s => s.highestDarknetTier);
  const setPaused           = useGameStore(s => s.setPaused);
  const toggleSettingsModal = useGameStore(s => s.toggleSettingsModal);

  // Escalation phase: 0 = normal, 1 = flicker, 2 = warning, 3 = alarm
  const phase = archiveLen >= 11 ? 3 : archiveLen >= 8 ? 2 : archiveLen >= 4 ? 1 : 0;

  // Container: phase 3 adds maroon gradient background + inset alarm pulse
  const containerBg    = phase >= 3
    ? { background: 'linear-gradient(180deg, #09090b 0%, #1a0505 50%, #09090b 100%)' }
    : undefined;
  const containerClass = `flex flex-col h-full overflow-hidden ${phase >= 3 ? 'alarm-pulse' : ''}`;

  // Status line text + colour
  const statusText  = phase >= 2 ? '// WARNING — THEY ARE WATCHING' : '// Transit Mode — Signal Rerouted';
  const statusClass = phase >= 2 ? 'text-red-400/80 red-blink' : 'text-green-400/50';

  // Header colour + flicker
  const headerColor = phase >= 2 ? 'text-red-500' : 'text-zinc-200';
  const headerAnim  = phase === 1 ? 'transit-header-flicker' : '';

  return (
    <div className={containerClass} style={containerBg}>

    {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm shrink-0">
        <p className={`font-mono text-[10px] uppercase tracking-widest ${statusClass}`}>
          {statusText}
        </p>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h2 className={`font-mono text-sm font-bold uppercase tracking-widest ${headerColor} ${headerAnim}`}>
              Safe House // {currentSafehouse?.id ?? 'ALPHA'}
            </h2>
            {hasBeatenGame && (
              <p className="font-mono text-[9px] uppercase tracking-widest text-fuchsia-400/50 mt-0.5">
                // Darknet Tier: {darknetTier} (Best: {highestDarknetTier})
              </p>
            )}
          </div>
          
          {/* We wrap the Balance and SYS button together here */}
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[10px] text-cyan-400/50 uppercase tracking-widest">Balance</span>
              <span className="font-mono text-xl font-bold text-cyan-400 tabular-nums">{intelFragments}</span>
              <span className="font-mono text-[10px] text-cyan-400/50 uppercase">IF</span>
            </div>

            {/* The High-Visibility Settings Button */}
            <button
              onClick={() => {
                toggleSettingsModal(true);
                setPaused(true);
              }}
              className="shrink-0 px-2.5 py-1.5 rounded bg-zinc-800/80 border border-zinc-600 border-b-[2px] active:border-b active:translate-y-[1px] text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all flex items-center gap-1.5 select-none"
            >
              <span className="text-[12px] leading-none">⚙</span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest">SYS</span>
            </button>
          </div>
          
        </div>
      </div>

      {/* ── Tab navigation ── */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
        {activeTab === 'debrief' ? (
          <>
            <SessionSummary />
            <BlackMarket />
          </>
        ) : (
          <NarrativeArchive />
        )}
      </div>

      {/* ── Job selection footer ── */}
      <JobFooter isLocked={isLocked} />
    </div>
  );
}