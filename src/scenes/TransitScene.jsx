import { useState, useEffect, useRef } from 'react';
import useGameStore from '../store/useGameStore';
import upgradesConfig from '../data/upgradesConfig.json';
import storyFragments from '../data/storyFragments.json';
import toolsConfig from '../data/toolsConfig.json';
import AudioManager from '../utils/audioManager';
import { corruptText } from '../utils/textUtils';

// ─── Typewriter Text Effect ───────────────────────────────────────────────────
function TypewriterText({ text, speed = 20 }) {
  const [displayedText, setDisplayedText] = useState('');
  const reducedMotion = useGameStore(s => s.settings?.reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayedText(text);
      return;
    }
    
    setDisplayedText('');
    let i = 0;
    
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i));
      i++;
      if (i > text.length) {
        clearInterval(interval);
      }
    }, speed);
    
    return () => clearInterval(interval);
  }, [text, speed, reducedMotion]);

  return <span>{displayedText}<span className="animate-pulse font-bold text-white">_</span></span>;
}

// ─── Number Scrambler (The Juice #3) ──────────────────────────────────────────

function NumberScrambler({ value, className = "" }) {
  const [displayValue, setDisplayValue] = useState(value);
  const lastValue = useRef(value);

  useEffect(() => {
    if (value === lastValue.current) return;

    const start = lastValue.current;
    const end = value;
    const duration = 600; 
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 0.8) {
        const noise = Math.floor(Math.random() * (Math.abs(end - start) + 10));
        setDisplayValue(Math.floor(start + (end - start) * progress) + (Math.random() > 0.5 ? noise : -noise));
      } else {
        const ease = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.floor(start + (end - start) * ease));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
        lastValue.current = end;
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span className={className}>{displayValue}</span>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcUpgradeCost(cfg, currentLevel) {
  return Math.floor(cfg.baseCost * Math.pow(cfg.costScaling, currentLevel));
}

// ─── Session Summary (The After-Action Report) ────────────────────────────────

const OUTCOME_BADGE = {
  initial:      { label: 'SYSTEM ONLINE',                className: 'text-cyan-400  border-cyan-500/40  bg-cyan-500/10'     },
  success:      { label: 'SYSTEM BREACHED',              className: 'text-green-400 border-green-500/40 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.2)]' },
  escaped:      { label: 'TACTICAL RETREAT',             className: 'text-amber-400 border-amber-500/40 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]' },
  trace_busted: { label: 'CONNECTION SEVERED. 0 INTEL.', className: 'text-red-400   border-red-500/40   bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.2)]' },
  heat_busted:  { label: 'SAFEHOUSE RAIDED. INTEL LOST.',className: 'text-red-400   border-red-500/40   bg-red-500/10 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' },
};

function SessionSummary() {
  const earned    = useGameStore(s => s.sessionIntelEarned);
  const heat      = useGameStore(s => s.packUpHeat);
  const trace     = useGameStore(s => s.packUpTrace);
  const outcome   = useGameStore(s => s.transitOutcome);
  const node      = useGameStore(s => s.currentNode);
  const terminal  = useGameStore(s => s.terminalLog || []);
  const isPerfect = useGameStore(s => s.isPerfectBreach);

  const badge = OUTCOME_BADGE[outcome] ?? OUTCOME_BADGE.escaped;
  
  const filteredLogs = terminal.filter(log => 
    !log.includes('SIPHONING...') && 
    !log.includes('AWAITING MANUAL DISCONNECT')
  );
  
  const finalLogs = filteredLogs.slice(-4);
  const isGhostExit = outcome === 'escaped' && (trace >= 95 || heat >= 95);

  return (
    <div className="flex flex-col gap-4 mb-5">
      
      {/* 1. Target Profile */}
      <div className="glass-panel rounded-lg p-4 border border-zinc-800/80 bg-zinc-900/30">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
          // Target Node
        </p>
        <p className="font-mono text-sm font-bold text-zinc-200 truncate">
          {node?.name || 'UNKNOWN_TARGET'}
        </p>
        <p className="font-mono text-[10px] text-zinc-400 mt-1 uppercase tracking-widest">
          Sec_Profile: <span className="text-cyan-400/80">{node?.specialDefense?.replace('_', ' ') || 'STANDARD'}</span>
        </p>
      </div>

      {/* 2. Core Metrics */}
      <div className="glass-panel rounded-lg p-4">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/50">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-300">
            // After-Action Report
          </p>
          <span className={`font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-sm text-zinc-300">Intel Harvested</span>
            <span className={`font-mono text-base font-bold ${earned > 0 ? 'text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'text-zinc-500'}`}>
              +{earned > 0 ? <NumberScrambler value={earned} /> : '0'} <span className="text-xs opacity-80">IF</span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono text-sm text-zinc-300">Heat at Exit</span>
            <span className={`font-mono text-base font-bold tabular-nums ${heat >= 80 ? 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]' : heat >= 50 ? 'text-orange-400' : 'text-zinc-400'}`}>
              {heat.toFixed(0)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono text-sm text-zinc-300">Trace at Exit</span>
            <span className={`font-mono text-base font-bold tabular-nums ${trace >= 80 ? 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]' : trace >= 50 ? 'text-orange-400' : 'text-zinc-400'}`}>
              {trace.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Tactical Commendations */}
        {(isPerfect || isGhostExit) && (
          <div className="mt-4 pt-3 border-t border-zinc-800/50 flex gap-2">
            {isPerfect && (
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/30">
                + PERFECT BREACH BONUS
              </span>
            )}
            {isGhostExit && (
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-slate-400/10 text-slate-300 border border-slate-400/30">
                + GHOST EXIT BONUS
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. Black Box Recording (Terminal Snapshot) */}
      <div className="glass-panel rounded-lg p-3 bg-black border border-zinc-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-green-900/10 pointer-events-none" />
        <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-2 relative z-10">
          // BLACK_BOX_RECORDING.log
        </p>
        <div className="font-mono text-[10px] text-green-500/70 space-y-1 relative z-10">
          {finalLogs.map((logLine, i) => (
            <p key={i} className="leading-tight pl-2 -indent-2 break-words">
              {logLine}
            </p>
          ))}
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
            i < current ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]' : 'bg-zinc-600'
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
  const [isPurchasing, setIsPurchasing] = useState(false);

  const isMaxed   = level >= cfg.maxLevel;
  const cost      = isMaxed ? null : calcUpgradeCost(cfg, level);
  const canAfford = !isMaxed && intelFragments >= cost;

  const handlePurchase = () => {
    if (!canAfford) return;
    AudioManager.playSFX('thock'); 
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([15, 30]);
    setIsPurchasing(true);
    setTimeout(() => setIsPurchasing(false), 300);
    purchaseUpgrade(cfg.id);
  };

  const cardClass = isMaxed
    ? 'border-green-500/25 bg-green-500/5 opacity-80'
    : isPurchasing 
      ? 'animate-purchase border-white bg-white/20' 
      : canAfford
        ? 'border-white/10 bg-white/5 hover:border-violet-500/40'
        : 'border-zinc-700/50 bg-zinc-800/20';

  return (
    <div className={`glass-panel rounded-lg p-4 border transition-all duration-150 ${cardClass}`}>
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
              onClick={handlePurchase}
              disabled={!canAfford}
              className={[
                'px-6 py-2 rounded border font-mono text-xs font-bold uppercase tracking-widest',
                'transition-all duration-150 active:scale-95',
                canAfford
                  ? 'border-violet-500/50 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-400 glow-violet'
                  : 'border-zinc-700 text-zinc-400 bg-zinc-800/30 cursor-not-allowed',
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
  const [isPurchasing, setIsPurchasing] = useState(false);
  const canAfford      = intelFragments >= cost;

  const handlePurchase = () => {
    if (!canAfford) return;
    AudioManager.playSFX('thock'); 
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([15, 30]);
    setIsPurchasing(true);
    setTimeout(() => setIsPurchasing(false), 300);
    buyConsumable(itemId, cost);
  };

  return (
    <div className={`glass-panel rounded-lg p-4 border flex items-center justify-between gap-3 transition-all duration-150 ${
      isPurchasing ? 'animate-purchase border-white bg-white/20' : 'border-zinc-700/50 bg-zinc-800/10'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-mono text-sm font-bold text-zinc-100">{label}</p>
          <span className="font-mono text-xs font-bold text-violet-300 tabular-nums shrink-0">×{count}</span>
        </div>
        <p className="font-mono text-xs text-zinc-300 truncate">{description}</p>
      </div>
      <button
        onClick={handlePurchase}
        disabled={!canAfford}
        className={[
          'shrink-0 px-5 py-2 rounded border font-mono text-xs font-bold uppercase tracking-widest',
          'transition-all duration-150 active:scale-95',
          canAfford
            ? 'border-violet-500/50 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-400'
            : 'border-zinc-700 text-zinc-400 bg-zinc-800/30 cursor-not-allowed',
        ].join(' ')}
      >
        {cost} IF
      </button>
    </div>
  );
}

// ─── Loot Inventory (Hardware Stash) ──────────────────────────────────────────

function LootInventory() {
  const inventory = useGameStore(s => s.inventory || []);
  const activeModifiers = useGameStore(s => s.activeModifiers || []);
  const useHardware = useGameStore(s => s.useHardware);

  return (
    <div className="mb-6">
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400 mb-3">
        // Hardware Stash
      </p>
      
      {activeModifiers.includes('ADMIN_KEY') && (
        <div className="glass-panel rounded-lg p-3 mb-3 border border-yellow-500/50 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
          <p className="font-mono text-[11px] text-yellow-400 font-bold flex items-center gap-2 tracking-widest uppercase">
            <span className="animate-pulse text-sm">⚠</span> ADMIN KEY ACTIVE: Next node FW HP halved.
          </p>
        </div>
      )}

      {inventory.length === 0 ? (
        <div className="glass-panel rounded-lg p-5 border border-zinc-800/50 bg-zinc-900/30 text-center opacity-70">
          <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest font-bold">Stash is empty</p>
          <p className="font-mono text-[10px] text-zinc-600 mt-1 uppercase">Siphon nodes to extract hardware</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inventory.map((item, idx) => {
            const colorClass = item.rarity === 'epic' ? 'text-yellow-400' : item.rarity === 'rare' ? 'text-cyan-400' : 'text-zinc-200';
            const borderClass = item.rarity === 'epic' ? 'border-yellow-500/30' : item.rarity === 'rare' ? 'border-cyan-500/30' : 'border-zinc-700/50';
            
            const isInRunOnly = item.id === 'LIQUID_COOLER' || item.id === 'SIGNAL_BOOSTER';

            return (
              <div key={idx} className={`glass-panel rounded-lg p-3 border ${borderClass} bg-zinc-800/20 flex justify-between items-center gap-3`}>
                <div className="flex-1 min-w-0 pr-2">
                  <p className={`font-mono text-sm font-bold truncate ${colorClass}`}>
                    {item.name}
                  </p>
                  <p className="font-mono text-[10px] text-zinc-400 mt-0.5 leading-snug">
                    {item.description}
                  </p>
                </div>
                
                {isInRunOnly ? (
                  <span className="shrink-0 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-cyan-500/60 border border-cyan-900/30 bg-cyan-950/20 rounded text-center">
                    LOADS IN<br/>NODE
                  </span>
                ) : (
                  <button
                    onClick={() => useHardware(idx)}
                    className={`shrink-0 px-4 py-2 rounded font-mono text-[10px] font-bold uppercase tracking-widest transition-all duration-150 border border-b-[2px] active:translate-y-[1px] active:border-b ${
                      item.id === 'RED_ONION' 
                        ? 'border-red-900 text-red-500 bg-red-950/30 hover:bg-red-900/50'
                        : 'border-yellow-700/60 text-yellow-300 bg-yellow-900/20 hover:bg-yellow-800/40 hover:text-white'
                    }`}
                  >
                    {item.id === 'RED_ONION' ? 'EXECUTE' : 'EQUIP'}
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

// ─── Black Market ─────────────────────────────────────────────────────────────

function BlackMarket() {
  const hasBeatenGame = useGameStore(s => s.hasBeatenGame);
  const archiveLen    = useGameStore(s => s.storyArchive.length);
  const showConsumables = hasBeatenGame || archiveLen >= 4;

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
            // Dirty Tricks
          </p>
          <div className="space-y-3">
            <ConsumableItem itemId="rabbit" label="RABBIT VIRUS" description="Eats 50 FW HP over 5 seconds" cost={75} />
            <ConsumableItem itemId="ghost" label="GHOST.sys" description="Freezes Trace generation for 4 seconds" cost={75} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Narrative Archive ────────────────────────────────────────────────────────

function NarrativeArchive({ onJackIn }) {
  const storyArchive        = useGameStore(s => s.storyArchive);
  const decryptedFragments  = useGameStore(s => s.decryptedFragments);
  const intelFragments      = useGameStore(s => s.intelFragments);
  const deepDecryptFragment = useGameStore(s => s.deepDecryptFragment);
  
  const total     = storyFragments.length;
  const collected = storyArchive.length;
  const DECRYPT_COST = 50;
  const sortedIndices = [...storyArchive].sort((a, b) => a - b);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-green-300">// Narrative Archive</p>
        <span className="font-mono text-xs font-bold text-zinc-300">{collected}/{total} FRAGS</span>
      </div>

      {collected === 0 ? (
        <div className="glass-panel rounded-lg p-5 text-center border border-red-900/40 bg-red-950/30 relative overflow-hidden">
          <p className="font-mono text-sm text-red-400 font-bold uppercase tracking-widest">[ SEC_CORRUPTED ]</p>
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
                    Fragment #{String(idx + 1).padStart(3, '0')}
                  </p>
                  <button
                    onClick={() => onJackIn('priority', true, idx + 1)}
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

// ─── Deck Manual (Hero Abilities Screen) ──────────────────────────────────────

const TOOL_CARD_COLORS = {
  green: "border-green-500/30 bg-green-500/10",
  blue:  "border-blue-500/30 bg-blue-500/10",
  amber: "border-amber-500/30 bg-amber-500/10"
};

const TOOL_TEXT_COLORS = {
  green: "text-green-400",
  blue:  "text-blue-400",
  amber: "text-amber-400"
};

function DeckManual() {
  const upgrades      = useGameStore(s => s.upgrades);
  const safehouse     = useGameStore(s => s.currentSafehouse);
  const archiveLen    = useGameStore(s => s.storyArchive.length);
  const hasBeatenGame = useGameStore(s => s.hasBeatenGame);

  const ramLevel      = upgrades['RAM']?.level ?? 0;
  const bypassLevel   = upgrades['BYPASS_STRENGTH']?.level ?? 0;
  
  const ramMod = safehouse?.ramMod ?? 1;
  const dmgMod = safehouse?.dmgMod ?? 1;

  const getCooldown = (base) => Math.max(1, Math.floor(base * (1 - ramLevel * 0.10) * ramMod));
  const getDmg = (toolId, base) => {
    let dmg = base;
    if (toolId === 'BYPASS') dmg += bypassLevel * 10;
    return Math.floor(dmg * dmgMod);
  };

  const showConsumables = hasBeatenGame || archiveLen >= 4;

  return (
    <div className="space-y-6 pb-6">
      
      {/* ── CORE TOOLKIT ── */}
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-violet-400 mb-3 flex items-center justify-between">
          <span>// Core Toolkit</span>
          {(ramLevel > 0 || bypassLevel > 0) && (
            <span className="text-[9px] text-zinc-500 normal-case">Live stats w/ Black Market upgrades</span>
          )}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {toolsConfig.map(tool => {
             const actualCd  = getCooldown(tool.baseCooldown);
             const actualDmg = getDmg(tool.id, tool.baseEffect.firewallDamage);
             const traceGain = tool.baseEffect.traceGain;
             const heatGain  = tool.baseEffect.heatGain;
             
             const cardStyle = TOOL_CARD_COLORS[tool.color] || "border-zinc-500/30 bg-zinc-500/10";
             const textStyle = TOOL_TEXT_COLORS[tool.color] || "text-zinc-400";
             
             return (
               <div key={tool.id} className={`glass-panel rounded-lg p-4 border ${cardStyle}`}>
                 <div className="flex justify-between items-start mb-2">
                   <span className={`font-mono text-sm font-bold ${textStyle}`}>{tool.label}</span>
                   <span className="font-mono text-[10px] font-bold text-zinc-400 bg-zinc-950/50 px-2 py-0.5 rounded border border-zinc-800/50">
                     {actualCd}s CD
                   </span>
                 </div>
                 <p className="font-mono text-[11px] text-zinc-300 leading-relaxed mb-3 min-h-[48px]">
                   {tool.description}
                 </p>
                 <div className="flex gap-2 font-mono text-[9px] font-bold uppercase tracking-widest flex-wrap">
                   {actualDmg > 0 && (
                     <span className="bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded border border-violet-500/30 shadow-[0_0_8px_rgba(139,92,246,0.2)]">
                       {actualDmg} DMG
                     </span>
                   )}
                   {traceGain !== 0 && (
                     <span className={`${traceGain > 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'} px-1.5 py-0.5 rounded border`}>
                       {traceGain > 0 ? '+' : ''}{traceGain}% TRACE
                     </span>
                   )}
                   {heatGain > 0 && (
                     <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/30">
                       +{heatGain}% HEAT
                     </span>
                   )}
                 </div>
               </div>
             );
          })}
        </div>
      </div>

      {/* ── TACTICS & SYNERGIES ── */}
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400 mb-3">
          // Tactics & Synergies
        </p>
        <div className="space-y-3">
          <div className="glass-panel rounded-lg p-4 border border-zinc-700/50 bg-zinc-800/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">DECRYPT</span>
              <span className="text-zinc-500 text-xs font-bold">»</span>
              <span className="font-mono text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded">BYPASS</span>
            </div>
            <p className="font-mono text-[11px] text-zinc-100 font-bold mb-1">The Riposte Strike</p>
            <p className="font-mono text-[11px] text-zinc-400 leading-relaxed">
              Using <span className="text-amber-400">DECRYPT</span> applies the <span className="text-amber-300 border border-amber-400/30 px-1 rounded bg-amber-400/10">EXPOSED</span> status to the node for 4 seconds. Landing a <span className="text-green-400">BYPASS</span> while exposed consumes the status to deal <span className="text-white font-bold">CRITICAL (2.0x) DAMAGE</span>.
            </p>
          </div>

          <div className="glass-panel rounded-lg p-4 border border-zinc-700/50 bg-zinc-800/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] font-bold text-cyan-300 animate-pulse">SYNC WINDOW</span>
              <span className="text-zinc-500 text-xs font-bold">»</span>
              <span className="font-mono text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded">PULSE</span>
            </div>
            <p className="font-mono text-[11px] text-zinc-100 font-bold mb-1">Perfect Sync</p>
            <p className="font-mono text-[11px] text-zinc-400 leading-relaxed">
              When the Trace meter flashes <span className="text-cyan-300 font-bold">SYNC</span>, hitting <span className="text-cyan-400">PULSE</span> triggers a Perfect Sync, doubling the amount of Trace removed.
            </p>
          </div>
        </div>
      </div>

      {/* ── THREAT RESPONSE ── */}
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-red-400 mb-3">
          // Threat Response
        </p>
        <div className="space-y-3">
          <div className="glass-panel rounded-lg p-4 border border-red-900/40 bg-red-950/20">
            <p className="font-mono text-[11px] text-red-400 font-bold mb-1">Active Daemons</p>
            <p className="font-mono text-[11px] text-zinc-400 leading-relaxed">
              Nodes will actively inject defensive DAEMONS into your deck (e.g., <span className="text-red-400 font-bold">BLOODHOUND</span>) which rapidly spike your Trace. <span className="text-amber-400 font-bold">DECRYPT</span> is the only tool capable of isolating and killing an active Daemon.
            </p>
          </div>
          <div className="glass-panel rounded-lg p-4 border border-red-900/40 bg-red-950/20">
            <p className="font-mono text-[11px] text-red-400 font-bold mb-1">System Overrides</p>
            <p className="font-mono text-[11px] text-zinc-400 leading-relaxed">
              If the screen flashes red and a <span className="text-red-500 font-bold">SYSTEM OVERRIDE</span> prompt appears, tap the massive red button repeatedly to intercept the counter-measure before the timer expires.
            </p>
          </div>
        </div>
      </div>

      {/* ── DIRTY TRICKS (CONSUMABLES) ── */}
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-fuchsia-400 mb-3">
          // Dirty Tricks (Consumables)
        </p>
        {showConsumables ? (
           <div className="space-y-3">
            <div className="glass-panel rounded-lg p-4 border border-zinc-700/50 bg-zinc-800/10">
              <span className="font-mono text-[11px] text-green-400 font-bold mb-1 block">RABBIT.exe</span>
              <p className="font-mono text-[11px] text-zinc-400 leading-relaxed">
                A highly aggressive, replicating daemon. Injects directly into the target node, eating <span className="text-white font-bold">10 Firewall HP per second for 5 seconds</span>. Note: Cannot land the killing blow; leaves target at 1 HP.
              </p>
            </div>
            <div className="glass-panel rounded-lg p-4 border border-zinc-700/50 bg-zinc-800/10">
              <span className="font-mono text-[11px] text-slate-300 font-bold mb-1 block">GHOST.sys</span>
              <p className="font-mono text-[11px] text-zinc-400 leading-relaxed">
                A thermal-trace suppression script. <span className="text-white font-bold">Freezes all Trace generation for 4 seconds</span>, creating a massive window for aggressive hacking.
              </p>
            </div>
           </div>
        ) : (
           <div className="glass-panel rounded-lg p-6 border border-zinc-800 bg-zinc-900/30 flex flex-col items-center justify-center text-center opacity-70">
             <span className="text-zinc-500 text-xl mb-3">🔒</span>
             <p className="font-mono text-xs font-bold text-zinc-400 tracking-widest">ENCRYPTED BLACK MARKET SECTOR</p>
             <p className="font-mono text-[10px] text-zinc-500 mt-2 uppercase tracking-widest border border-zinc-700 px-3 py-1 rounded bg-zinc-800/50 shadow-inner">
               Reach Act II (4 Fragments) to unlock
             </p>
           </div>
        )}
      </div>

    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }) {
  const collected = useGameStore(s => s.storyArchive.length);
  const inventory = useGameStore(s => s.inventory || []);

  const tabs = [
    { id: 'logs',  label: 'LOGS' },
    { id: 'stash', label: 'STASH', showDot: inventory.length > 0 }, 
    { id: 'deck',  label: 'DECK' }, 
    { id: 'data',  label: 'DATA',  showDot: collected > 0 },
  ];

  return (
    <div className="flex px-2 sm:px-5 gap-1 sm:gap-2 border-b border-zinc-800 shrink-0">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={[
            'flex-1 relative py-3 sm:py-3.5 font-mono text-[11px] sm:text-xs font-bold uppercase tracking-widest',
            'transition-colors duration-150',
            active === tab.id
              ? 'text-green-400 border-b-2 border-green-500 -mb-px'
              : 'text-zinc-400 hover:text-zinc-200',
          ].join(' ')}
        >
          {tab.label}
          {tab.showDot && active !== tab.id && (
            <span className="absolute top-2 right-[calc(50%-16px)] sm:right-[calc(50%-24px)] w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Job Selection Footer ─────────────────────────────────────────────────────

function JobFooter({ isLocked, onJackIn }) {
  const archiveLen      = useGameStore(s => s.storyArchive.length);
  const hasBeatenGame   = useGameStore(s => s.hasBeatenGame);
  const darknetTier     = useGameStore(s => s.darknetTier);

  const isTartarusReady = archiveLen === 11;
  const showTartarus    = isTartarusReady && !hasBeatenGame;
  const showDarknet     = hasBeatenGame;
  const showPriority    = !showTartarus;

  const lockClass = isLocked 
    ? 'opacity-50 cursor-not-allowed pointer-events-none' 
    : 'active:border-b-[1px] active:translate-y-[3px]';

  return (
    <div className="px-4 pt-3 pb-6 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur-sm shrink-0 flex flex-col gap-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
      
      {/* Top Row: Standard Missions (Side-by-Side) */}
      <div className="flex gap-2 w-full">
        <button
          onClick={() => onJackIn('skim')}
          disabled={isLocked}
          className={`flex-1 py-3 px-1 rounded-lg font-mono text-[11px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] border-green-500/60 border-b-green-700 text-green-400 bg-green-500/5 hover:bg-green-500/15 glow-green game-button flex flex-col items-center justify-center text-center ${lockClass}`}
        >
          <span>Data Skim</span>
          <span className="text-[8px] font-normal text-green-300/80 mt-1 normal-case tracking-normal">
            Low-Sec Target
          </span>
        </button>

        {showPriority && (
          <button
            onClick={() => onJackIn('priority')}
            disabled={isLocked}
            className={`flex-1 py-3 px-1 rounded-lg font-mono text-[11px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] border-violet-500/60 border-b-violet-700 text-violet-300 bg-violet-500/5 hover:bg-violet-500/15 glow-violet game-button flex flex-col items-center justify-center text-center ${lockClass}`}
          >
            <span>Priority Lead</span>
            <span className="text-[8px] font-normal text-violet-300/80 mt-1 normal-case tracking-normal">
              Unlock Story
            </span>
          </button>
        )}
      </div>

      {/* Boss / Endgame Missions (Full Width) */}
      {showTartarus && (
        <button
          onClick={() => onJackIn('tartarus')}
          disabled={isLocked}
          className={`w-full py-3 px-4 rounded-lg font-mono text-xs font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] border-red-500/80 border-b-red-700 text-red-400 bg-red-500/10 hover:bg-red-500/20 animate-pulse game-button flex flex-col items-center justify-center ${lockClass}`}
        >
          <span>Assault Tartarus Node</span>
          <span className="text-[9px] font-normal text-red-300/80 mt-1 normal-case tracking-normal">
            400 HP · One chance. No retreat.
          </span>
        </button>
      )}

      {showDarknet && (
        <button
          onClick={() => onJackIn('darknet')}
          disabled={isLocked}
          className={`w-full py-3 px-4 rounded-lg font-mono text-xs font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] border-fuchsia-500/60 border-b-fuchsia-700 text-fuchsia-300 bg-fuchsia-500/5 hover:bg-fuchsia-500/15 game-button flex flex-col items-center justify-center ${lockClass}`}
        >
          <span>Access Darknet Router</span>
          <span className="text-[9px] font-normal text-fuchsia-300/80 mt-1 normal-case tracking-normal">
            Tier {darknetTier} · {150 + darknetTier * 50} HP
          </span>
        </button>
      )}
    </div>
  );
}
          
// ─── Transit Scene (main) ─────────────────────────────────────────────────────

export default function TransitScene() {
  const [activeTab, setActiveTab] = useState('logs');
  const [isLocked, setIsLocked]   = useState(true);
  const [isJackingIn, setIsJackingIn] = useState(false);
  const [memoDismissed, setMemoDismissed] = useState(false); // <--- State added

  useEffect(() => {
    const timer = setTimeout(() => setIsLocked(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // NEW: Auto-dismiss the comms intercept after 15 seconds to free up screen space
  useEffect(() => {
    if (memoDismissed) return;
    const autoDismiss = setTimeout(() => setMemoDismissed(true), 15000);
    return () => clearTimeout(autoDismiss);
  }, [memoDismissed]);

  const intelFragments     = useGameStore(s => s.intelFragments);
  const archiveLen         = useGameStore(s => s.storyArchive.length);
  const currentSafehouse   = useGameStore(s => s.currentSafehouse);
  const hasBeatenGame      = useGameStore(s => s.hasBeatenGame);
  const darknetTier        = useGameStore(s => s.darknetTier);
  const highestDarknetTier = useGameStore(s => s.highestDarknetTier);
  const setPaused           = useGameStore(s => s.setPaused);
  const toggleSettingsModal = useGameStore(s => s.toggleSettingsModal);
  const reducedMotion       = useGameStore(s => s.settings?.reducedMotion);

  // ── THE JACK IN FUNCTION ──
  const handleJackIn = (type, isReplay = false, level = null) => {
    if (isLocked || isJackingIn) return;
    
    // Play a heavy connection sound
    AudioManager.playSFX('thock'); 
    const settings = useGameStore.getState().settings;
    if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 80, 150]); 
    }
    
    setIsJackingIn(true);
    
    // Extend the transition slightly to let the CSS animations play out
    setTimeout(() => {
      useGameStore.getState().startNewSession(type, isReplay, level);
    }, 700); // Increased from 400ms to 700ms for dramatic effect
  };

  const phase = archiveLen >= 11 ? 3 : archiveLen >= 8 ? 2 : archiveLen >= 4 ? 1 : 0;
  const containerBg    = phase >= 3 ? { background: 'linear-gradient(180deg, #09090b 0%, #1a0505 50%, #09090b 100%)' } : undefined;
  
  const transitionClass = isJackingIn 
    ? "contrast-[200%] saturate-200 brightness-[1.5] blur-[4px] scale-[1.1] opacity-0 transition-all duration-700 ease-in" 
    : "opacity-100 transition-all duration-300";

  const containerClass = `flex flex-col h-full overflow-hidden ${(phase >= 3 && !reducedMotion) ? 'alarm-pulse' : ''} ${transitionClass}`;

  // --- ACT-BASED NARRATIVE INJECTION ---
  const MASHA_MEMOS = [
    "// MASHA: The night shift logs are slower. Find a Priority Lead and work the gap.",
    "// MASHA: Ghost-Code? I knew it. They didn't build a new world. They built a cage around the old one.",
    "// MASHA: They aren't just watching what we do, they're learning why we do it. Creepy.",
    "// MASHA: They’re profiling us. They aren't just tracing your IP... they're tracing you.",
    "// MASHA: Jackpot. If the underground sees this, Vertex is finished. You’re becoming an Elite real fast, kid.",
    "// MASHA: He mentioned my name. How does he— [ERROR: SIGNAL_NOISE] —Operator, we need to move. Fast.",
    "// MASHA: They're trying to fry your Deck. I'm injecting some heat-sink code, but stay under that 95% limit!",
    "// MASHA: You weren't supposed to see that. Look, I have a plan to save you, okay? Just... trust me.",
    "// MASHA: They're going to shut down the whole world and blame us? Not on my watch.",
    "// MASHA: Anarchy is better than a cage. We’re at the Core. This is it.",
    "// MASHA: Trace is at 98%! Push it! Redline the deck and upload the Key! DO IT NOW!",
    "// MASHA: HE'S LYING! Don't be a suit, be an ELITE! One. Last. Breach. Sync the world, Operator!",
  ];

  let statusText = MASHA_MEMOS[Math.min(archiveLen, MASHA_MEMOS.length - 1)];

  if (archiveLen >= 11) {
    statusText = "!! ALCHEMIST: YOUR MAC ADDRESS IS LOGGED. THERE IS NO ESCAPE. !!";
  }
  if (hasBeatenGame) {
    statusText = "// MASHA: The mirror is broken. Vertex is blind. We actually did it. [OFFLINE]";
  }

  const isAlchemist = archiveLen >= 11 && !hasBeatenGame;

  return (
    <div 
      className={`${containerClass} relative`} 
      style={{
        ...containerBg,
        paddingTop: 'max(env(safe-area-inset-top), 0px)', 
      }}
    >
      {/* ── THE JACK IN FLASH OVERLAY ── */}
      {isJackingIn && (
        <div className="absolute inset-0 bg-cyan-300/20 mix-blend-overlay pointer-events-none z-50 animate-pulse" />
      )}

      {/* --- COMPACT TERMINAL INTERCEPT --- */}
      <div className="px-4 pt-4 pb-1 z-20 relative animate-slide-down">
        {memoDismissed ? (
           // THE "GHOSTED" STATE (Takes up very little space, prevents layout jumping)
           <div className="border-l-2 p-1 pl-2 border-zinc-800 flex items-center gap-2 opacity-50">
             <span className="w-1.5 h-1.5 bg-zinc-700" />
             <span className="font-mono text-[8px] font-bold tracking-[0.2em] text-zinc-600 uppercase">
               [ COMM_LINK_CLOSED ]
             </span>
           </div>
        ) : (
           // THE ACTIVE STATE (Types out the message)
           <div className={`border-l-2 p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] flex flex-col gap-1 relative overflow-hidden backdrop-blur-md hacker-flicker ${
             isAlchemist ? 'bg-red-950/40 border-red-500' : 'bg-fuchsia-950/20 border-fuchsia-500'
           }`}>
             {/* Header Row */}
             <div className="flex justify-between items-center w-full">
               <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 animate-pulse ${isAlchemist ? 'bg-red-500' : 'bg-fuchsia-500'}`} />
                  <span className={`font-mono text-[9px] font-black tracking-[0.2em] uppercase ${isAlchemist ? 'text-red-500' : 'text-fuchsia-500'}`}>
                    {isAlchemist ? 'PRIORITY_THREAT' : 'SYS_COMMS'}
                  </span>
               </div>
               <button 
                 onClick={() => { AudioManager.playSFX('thock'); setMemoDismissed(true); }}
                 className="font-mono text-[9px] text-zinc-500 hover:text-white font-bold px-2"
               >
                 [x]
               </button>
             </div>

             {/* Typewriter Text Row */}
             <p className="font-mono text-[10px] leading-snug text-zinc-300 min-h-[14px]">
               <span className={isAlchemist ? "text-red-400" : "text-fuchsia-400 font-bold"}>{"> "}</span>
               <TypewriterText text={statusText} speed={15} />
             </p>
           </div>
        )}
      </div>

      <div className="px-5 shrink-0 relative z-10 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono text-[12px] font-bold uppercase tracking-widest text-zinc-100">
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
              <p className="font-mono text-2xl font-bold text-cyan-400 tabular-nums">
                <NumberScrambler value={intelFragments} />
              </p>
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

      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 scrollbar-thin flex flex-col items-center">
        <div className="w-full max-w-md">
          {activeTab === 'logs' && <SessionSummary />}
          
          {activeTab === 'stash' && (
            <>
              <LootInventory />
              <BlackMarket />
            </>
          )}
          
          {activeTab === 'deck' && <DeckManual />}
          
          {activeTab === 'data' && <NarrativeArchive onJackIn={handleJackIn} />}
        </div>
      </div>

      <div className="w-full bg-zinc-950/90 backdrop-blur-sm shrink-0 border-t border-zinc-800 flex justify-center">
        <div className="w-full max-w-md">
          <JobFooter isLocked={isLocked || isJackingIn} onJackIn={handleJackIn} />
        </div>
      </div>
    </div>
  );
}