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
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-300">
          // Session Log
        </p>
        <span className={`font-mono text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${badge.className}`}>
          {badge.label}
        </span>
      </div>
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="font-mono text-sm text-zinc-300">Intel Harvested</span>
          <span className="font-mono text-base font-bold text-green-400">
            +{earned} <span className="text-green-400/90 text-xs">IF</span>
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-mono text-sm text-zinc-300">Heat at Exit</span>
          <span className={`font-mono text-base font-bold ${heat >= 80 ? 'text-red-400' : heat >= 50 ? 'text-orange-400' : 'text-zinc-200'}`}>
            {heat.toFixed(0)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-mono text-sm text-zinc-300">Trace at Exit</span>
          <span className={`font-mono text-base font-bold ${trace >= 80 ? 'text-red-400' : trace >= 50 ? 'text-orange-400' : 'text-zinc-200'}`}>
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
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-sm transition-colors duration-300 ${
            i < current ? 'bg-green-400' : 'bg-zinc-600'
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
      : 'border-zinc-700/50 bg-zinc-800/20'; // Boosted from white/[0.02] so inactive cards remain clearly visible

  return (
    <div className={`glass-panel rounded-lg p-4 border transition-colors duration-200 ${cardClass}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">{cfg.icon}</span>
          <div>
            <p className="font-mono text-sm font-bold text-zinc-100 leading-tight">{cfg.label}</p>
            <p className="font-mono text-xs text-zinc-300 mt-0.5">{cfg.effectSummary}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <LevelPips current={level} max={cfg.maxLevel} />
          <span className="font-mono text-xs text-zinc-300">Lv {level}/{cfg.maxLevel}</span>
        </div>
      </div>

      <p className="font-mono text-xs text-zinc-300 leading-relaxed mb-3">
        {cfg.description}
      </p>

      <div className="flex items-center justify-between">
        {isMaxed ? (
          <span className="font-mono text-sm font-bold text-green-400 uppercase tracking-widest">
            ✓ Max Level
          </span>
        ) : (
          <>
            <span className={`font-mono text-base font-bold tabular-nums ${canAfford ? 'text-cyan-400' : 'text-zinc-400'}`}>
              {cost} <span className={`text-xs ${canAfford ? 'text-cyan-400/90' : 'text-zinc-500'}`}>IF</span>
            </span>
            <button
              onClick={() => purchaseUpgrade(cfg.id)}
              disabled={!canAfford}
              className={[
                'px-6 py-2 rounded border font-mono text-xs font-bold uppercase tracking-widest',
                'transition-all duration-150 active:scale-95',
                canAfford
                  ? 'border-violet-500/50 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-400 glow-violet'
                  : 'border-zinc-700 text-zinc-400 bg-zinc-800/30 cursor-not-allowed', // Boosted so inactive buttons are legible
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
    <div className="glass-panel rounded-lg p-4 border border-zinc-700/50 flex items-center justify-between gap-3 bg-zinc-800/10">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-mono text-sm font-bold text-zinc-100">{label}</p>
          <span className="font-mono text-xs font-bold text-violet-300 tabular-nums shrink-0">×{count}</span>
        </div>
        <p className="font-mono text-xs text-zinc-300 truncate">{description}</p>
      </div>
      <button
        onClick={() => buyConsumable(itemId, cost)}
        disabled={!canAfford}
        className={[
          'shrink-0 px-5 py-2 rounded border font-mono text-xs font-bold uppercase tracking-widest',
          'transition-all duration-150 active:scale-95',
          canAfford
            ? 'border-violet-500/50 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-400'
            : 'border-zinc-700 text-zinc-400 bg-zinc-800/30 cursor-not-allowed', // Boosted so inactive buttons are legible
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
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-violet-300 mb-3">
        // Black Market
      </p>
      <div className="space-y-3">
        {upgradesConfig.map(cfg => (
          <UpgradeCard key={cfg.id} cfg={cfg} />
        ))}
      </div>

      {showConsumables && (
        <div className="mt-6">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-violet-300 mb-3">
            // Consumables
          </p>
          <div className="space-y-3">
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
      <div className="flex items-baseline justify-between mb-4">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-green-300">
          // Narrative Archive
        </p>
        <span className="font-mono text-xs font-bold text-zinc-300">
          {collected}/{total} FRAGS
        </span>
      </div>

      {collected === 0 ? (
        <div className="glass-panel rounded-lg p-5 text-center border border-red-900/40 bg-red-950/30 relative overflow-hidden">
          <p className="font-mono text-sm text-red-400 font-bold uppercase tracking-widest mb-2">[ SEC_CORRUPTED ]</p>
          <p className="font-mono text-xs text-red-400/90 leading-relaxed mb-1">0x000F4A: Drive completely fragmented.</p>
          <div className="w-full bg-red-950/80 h-2.5 rounded mt-4 mb-3 overflow-hidden border border-red-900/50">
             <div className="w-1/3 h-full bg-red-500/50 animate-pulse" />
          </div>
          <p className="font-mono text-xs text-zinc-300 mt-3">Breach a Priority Lead to rebuild sector index.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedIndices.map(idx => {
            const isDecrypted = decryptedFragments.includes(idx);
            const rawText = storyFragments[idx].text;
            const displayText = isDecrypted ? rawText : corruptText(rawText);

            return (
              <div key={idx} className="glass-panel rounded-lg p-5 border border-green-500/20 bg-green-500/[0.03]">
                <div className="flex items-center justify-between mb-3">
                  <p className={`font-mono text-[11px] font-bold uppercase tracking-widest ${isDecrypted ? 'text-green-400/80' : 'text-amber-500/90'}`}>
                    Fragment #{String(idx + 1).padStart(3, '0')} — {isDecrypted ? 'Decoded' : 'Encrypted'}
                  </p>
                  <button
                    onClick={() => startNewSession('priority', true, idx + 1)}
                    className="font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-300 hover:text-amber-400 border border-zinc-600 hover:border-amber-500/60 px-3 py-1 rounded transition-all duration-150 shrink-0 ml-2 bg-zinc-800/50"
                  >
                    Re-Run
                  </button>
                </div>
                <p className={`font-mono text-xs leading-relaxed ${isDecrypted ? 'text-zinc-100' : 'text-zinc-400'}`}>
                  {displayText}
                </p>
                {!isDecrypted && (
                  <button
                    onClick={() => deepDecryptFragment(idx, DECRYPT_COST)}
                    disabled={intelFragments < DECRYPT_COST}
                    className={`mt-5 w-full py-3 rounded border font-mono text-xs font-bold uppercase tracking-widest transition-all duration-150 ${
                      intelFragments >= DECRYPT_COST 
                        ? 'border-green-500/60 text-green-400 bg-green-500/10 hover:bg-green-500/20 active:scale-95 glow-green' 
                        : 'border-zinc-700 text-zinc-400 bg-zinc-800/30 cursor-not-allowed'
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
    <div className="flex px-5 gap-3 border-b border-zinc-800 shrink-0">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={[
            'flex-1 relative py-3.5 font-mono text-xs font-bold uppercase tracking-widest',
            'transition-colors duration-150',
            active === tab.id
              ? 'text-green-400 border-b-2 border-green-500 -mb-px'
              : 'text-zinc-400 hover:text-zinc-200',
          ].join(' ')}
        >
          {tab.label}
          {tab.showDot && active !== tab.id && (
            <span className="absolute top-3 right-[calc(50%-22px)] w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
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
    <div className="px-5 py-5 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur-sm shrink-0 space-y-3 pb-6">
      <button
        onClick={() => startNewSession('skim')}
        disabled={isLocked}
        className={`w-full py-3 px-6 rounded-lg font-mono text-sm font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] border-green-500/60 border-b-green-700 text-green-400 bg-green-500/5 hover:bg-green-500/15 glow-green game-button ${lockClass}`}
      >
        Initiate Data Skim
        <span className="block px-2 text-[11px] font-normal text-green-300 mt-1.5 normal-case tracking-normal">
          Low-sec target · Low intel · No story data
        </span>
      </button>

      {showPriority && (
        <button
          onClick={() => startNewSession('priority')}
          disabled={isLocked}
          className={`w-full py-3 px-6 rounded-lg font-mono text-sm font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] border-violet-500/60 border-b-violet-700 text-violet-300 bg-violet-500/5 hover:bg-violet-500/15 glow-violet game-button ${lockClass}`}
        >
          Pursue Priority Lead
          <span className="block px-2 text-[11px] font-normal text-violet-300 mt-1.5 normal-case tracking-normal">
            Secure target · Higher intel · Unlocks story fragment
          </span>
        </button>
      )}

      {showTartarus && (
        <button
          onClick={() => startNewSession('tartarus')}
          disabled={isLocked}
          className={`w-full py-3 px-6 rounded-lg font-mono text-sm font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] border-red-500/80 border-b-red-700 text-red-400 bg-red-500/10 hover:bg-red-500/20 animate-pulse game-button ${lockClass}`}
        >
          Assault Tartarus Node
          <span className="block px-2 text-[11px] font-normal text-red-300 mt-1.5 normal-case tracking-normal">
            400 HP · TRACE_ACCELERATOR · One chance. No retreat.
          </span>
        </button>
      )}

      {showDarknet && (
        <button
          onClick={() => startNewSession('darknet')}
          disabled={isLocked}
          className={`w-full py-3 px-6 rounded-lg font-mono text-sm font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] border-fuchsia-500/60 border-b-fuchsia-700 text-fuchsia-300 bg-fuchsia-500/5 hover:bg-fuchsia-500/15 game-button ${lockClass}`}
        >
          Access Darknet Router
          <span className="block px-2 text-[11px] font-normal text-fuchsia-300 mt-1.5 normal-case tracking-normal">
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

  const phase = archiveLen >= 11 ? 3 : archiveLen >= 8 ? 2 : archiveLen >= 4 ? 1 : 0;
  const containerBg    = phase >= 3 ? { background: 'linear-gradient(180deg, #09090b 0%, #1a0505 50%, #09090b 100%)' } : undefined;
  const containerClass = `flex flex-col h-full overflow-hidden ${phase >= 3 ? 'alarm-pulse' : ''}`;

  const statusText  = phase >= 2 ? '// WARNING — THEY ARE WATCHING' : '// Transit Mode — Signal Rerouted';
  const statusClass = phase >= 2 ? 'text-red-400/90 red-blink font-bold' : 'text-green-400 font-bold';
  const headerColor = phase >= 2 ? 'text-red-500' : 'text-zinc-100';
  const headerAnim  = phase === 1 ? 'transit-header-flicker' : '';

  return (
    <div className={containerClass} style={containerBg}>
      <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm shrink-0">
        <p className={`font-mono text-xs uppercase tracking-widest ${statusClass}`}>
          {statusText}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <div>
            <h2 className={`font-mono text-base font-bold uppercase tracking-widest ${headerColor} ${headerAnim}`}>
              Safe House // {currentSafehouse?.id ?? 'ALPHA'}
            </h2>
            {hasBeatenGame && (
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-fuchsia-300 mt-1">
                // Darknet Tier: {darknetTier} (Best: {highestDarknetTier})
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[11px] font-bold text-cyan-300 uppercase tracking-widest">Balance</span>
              <span className="font-mono text-2xl font-bold text-cyan-400 tabular-nums">{intelFragments}</span>
              <span className="font-mono text-[11px] font-bold text-cyan-300 uppercase">IF</span>
            </div>

            <button
              onClick={() => {
                toggleSettingsModal(true);
                setPaused(true);
              }}
              className="shrink-0 px-3 py-2 rounded bg-zinc-800/80 border border-zinc-600 border-b-[2px] active:border-b active:translate-y-[1px] text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all flex items-center gap-1.5 select-none"
            >
              <span className="text-sm leading-none">⚙</span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest">SYS</span>
            </button>
          </div>
        </div>
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />

      <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-thin">
        {activeTab === 'debrief' ? (
          <>
            <SessionSummary />
            <BlackMarket />
          </>
        ) : (
          <NarrativeArchive />
        )}
      </div>

      <JobFooter isLocked={isLocked} />
    </div>
  );
}