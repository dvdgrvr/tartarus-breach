import { useState, useEffect, useRef } from 'react';
import { TopBorder, BottomBorder } from '../components/PeripheralBorder';
import TerminalLog from '../components/TerminalLog';
import CommandBar from '../components/CommandBar';
import useGameStore from '../store/useGameStore';
import AudioManager from '../utils/audioManager';
import ArcadeResults from '../components/ArcadeResults';

// ─── MODIFIER DATA (For Quick Look) ──────────────────────────────────────────

const DIAGNOSTIC_MAP = {
  // Safehouse Traits
  Standard:    { icon: '⚪', label: 'STANDARD',    desc: 'Default operational parameters.' },
  Shielded:    { icon: '🛡️', label: 'SHIELDED',    desc: '-20% Heat generation, +10% RAM cooldowns.' },
  Ghost:       { icon: '👻', label: 'GHOST_SYS',   desc: '-20% Trace generation, -10% FW damage.' },
  Efficient:   { icon: '♻️', label: 'EFFICIENT',   desc: '+20% Intel earned, +15% Heat generation.' },
  Overclocked: { icon: '⚡', label: 'OVERCLOCKED', desc: '+20% FW damage, +15% Trace generation.' },
  // Node Defenses
  ENCRYPTED_LOGS:    { icon: '🔑', label: 'ENCRYPTED',  desc: 'Firewall metrics obfuscated. Run DECRYPT to reveal.' },
  TRACE_ACCELERATOR: { icon: '📡', label: 'TRACE_X2',    desc: 'Advanced tracking. Passive Trace rate x2.' },
  DARKNET:           { icon: '🌑', label: 'DARKNET',    desc: 'Encrypted router. High trace, massive defenses.' },
  // --- NEW: Node Mutators ---
  ARCHITECT:         { icon: '📐', label: 'ARCHITECT',   desc: 'The Architect is actively rebuilding the firewall.' },
  SNIFFER:           { icon: '🐽', label: 'SNIFFER',     desc: 'Deep packet inspection. Trace rate increased by 50%.' },
  ICE_WALL:          { icon: '🧊', label: 'ICE_WALL',    desc: 'Bypass damage halved. Decrypt rapidly recharges.' },
  GOLD_CACHE:        { icon: '💰', label: 'GOLD_CACHE',  desc: 'Massive IF payout. Target is actively pinging trace authorities.' },
  VOLATILE:          { icon: '🔥', label: 'VOLATILE',    desc: 'Hardware instability. Extreme physical heat spikes.' },
};

// ─── KERNEL DIAGNOSTIC OVERLAY (Quick Look) ──────────────────────────────────

function KernelDiagnostic({ modifierId, onClose }) {
  const data = DIAGNOSTIC_MAP[modifierId];
  
  // TRIGGER: Play scan sound when diagnostic mounts
  useEffect(() => {
    AudioManager.playSFX('scan');
  }, []);

  if (!data) return null;

  return (
    <div 
      className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-200"
      onClick={onClose} 
    >
      <div className="w-full max-w-xs border-l-4 border-cyan-500 bg-zinc-950 p-4 shadow-[10px_10px_0px_0px_rgba(6,182,212,0.2)]">
        <div className="flex items-center gap-3 mb-3 border-b border-zinc-800 pb-2">
          <span className="text-xl">{data.icon}</span>
          <span className="font-mono text-sm font-black text-cyan-400 tracking-widest uppercase">
            DIAGNOSTIC::{data.label}
          </span>
        </div>
        
        <p className="font-mono text-[11px] leading-relaxed text-zinc-300 uppercase italic">
          {data.desc}
        </p>

        <div className="mt-5 flex justify-between items-center opacity-50">
          <span className="font-mono text-[9px] text-zinc-500 animate-pulse">[ SCANNING... ]</span>
          <span className="font-mono text-[9px] text-zinc-500 underline uppercase tracking-tighter">Tap to resume</span>
        </div>
      </div>
    </div>
  );
}

// ─── GARBAGE DATA GENERATOR (For Busted State) ──────────────
function KernelPanicOverlay() {
  const [garbage, setGarbage] = useState([]);
  
  useEffect(() => {
    const chars = '0123456789ABCDEF!@#$%^&*()_+GARBAGE_FILE_SYS_ERR_0x00A';
    const interval = setInterval(() => {
      setGarbage(prev => {
        const newLine = Array.from({ length: 40 }).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
        const next = [...prev, newLine];
        if (next.length > 30) next.shift();
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-40 bg-red-950/90 flex flex-col justify-end overflow-hidden pointer-events-none mix-blend-overlay opacity-80">
      {garbage.map((line, i) => (
        <div key={i} className="font-mono text-[8px] text-red-500 leading-none break-all whitespace-nowrap opacity-50">
          {line}
        </div>
      ))}
    </div>
  );
}

// ─── TUTORIAL OVERLAY ────────────────────────────────────────────────────────

const TUTORIAL_PROMPTS = {
  SCAN_INTRO:       { title: 'CALIBRATION REQUIRED',  body: 'Run SCAN to locate node frequency.' },
  DECRYPT_INTRO:    { title: 'FIREWALL DETECTED',      body: 'Run DECRYPT to unmask the kernel.' },
  PULSE_INTRO:      { title: 'SYNERGY PATH INITIATED', body: 'Run PULSE to synchronize signal.' },
  BYPASS_INTRO:     { title: 'PAYLOAD PRIMED',         body: 'Execute BYPASS for a 3.5× Heavy Strike.' },
  TRACE_HEAT_INTRO: { title: 'WARNING: TRACE SPIKE',   body: 'Run PULSE to mask your signature before it hits 100%.' },
  OVERDRIVE_INTRO:  { title: 'HARDWARE LIMITS',        body: 'Fire SCAN now — costs heavy HEAT but breaks the cooldown.' },
  FINISH_NODE:      { title: 'SYSTEMS UNDERSTOOD',     body: 'Destroy the remaining firewall.' },
  SIPHON_INTRO:     { title: 'BREACH SUCCESSFUL',      body: 'Hold SIPHON to extract extra Intel before disconnecting.' },
};

function TutorialOverlay({ step }) {
  const prompt = TUTORIAL_PROMPTS[step];
  if (!prompt) return null;
  return (
    // Full-screen dim — pointer-events-none throughout so CommandBar stays clickable
    <div className="absolute inset-0 z-[50] pointer-events-none">
      {/* Background vignette — leaves CommandBar area interactive */}
      <div className="absolute inset-0 bg-black/55" />
      {/* Dialogue box pinned to the top-third of the screen */}
      <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[90%] max-w-sm">
        <div className="glass-panel border-2 border-fuchsia-500/80 bg-zinc-950/95 backdrop-blur-md p-4 rounded-lg shadow-[0_0_30px_rgba(217,70,239,0.6)]">
          <p className="font-mono text-[9px] uppercase tracking-widest text-fuchsia-400/60 mb-1">
            [ NEURAL_CALIBRATION :: {step} ]
          </p>
          <p className="font-display font-black text-fuchsia-300 text-sm uppercase tracking-widest mb-1" style={{letterSpacing:'0.15em'}}>
            {prompt.title}
          </p>
          <p className="font-mono text-[11px] text-zinc-300 leading-relaxed">
            {prompt.body}
          </p>
        </div>
      </div>
    </div>
  );
}

const SAFEHOUSE_TRAIT_COLOR = {
  cyan:    'text-cyan-400    border-cyan-500/30    bg-cyan-500/10',
  amber:   'text-amber-400   border-amber-500/30   bg-amber-500/10',
  emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  slate:   'text-slate-400   border-slate-500/30   bg-slate-500/10',
  fuchsia: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10',
};

function NodeStatusStrip({ onInspect }) {
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
      <span className="font-mono text-[11px] font-bold text-zinc-400 uppercase tracking-widest truncate">
        root@node:~/{node.name}#
      </span>

      <div className="flex items-center gap-2 shrink-0">
        {/* Safehouse Trait Icon Button */}
        {showTrait && (
          <button 
            onClick={() => onInspect(safehouse.trait)}
            className={`font-mono text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${traitColor} active:scale-95 transition-transform flex items-center gap-1.5`}
          >
            <span>{traitData?.icon}</span>
            <span className="hidden sm:inline">[{safehouse.trait}]</span>
          </button>
        )}

        {/* Node Defense Icon Button */}
        {node.specialDefense && (
          <button 
            onClick={() => onInspect(node.specialDefense)}
            className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded-sm border border-red-950 bg-red-900/20 text-red-500 animate-pulse flex items-center gap-1.5 active:scale-95"
          >
            <span>{DIAGNOSTIC_MAP[node.specialDefense]?.icon}</span>
            <span className="hidden sm:inline uppercase tracking-tighter">DEFENSE</span>
          </button>
        )}

        {/* --- NEW: Node Mutator Button --- */}
        {node.mutator && (
          <button 
            onClick={() => onInspect(node.mutator.id)}
            className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded-sm border animate-pulse flex items-center gap-1.5 active:scale-95 ${
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
          <span className={`font-mono text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${isHeatCritical ? 'text-red-400 bg-red-500/10 animate-pulse border border-red-500/50' : 'text-orange-400 bg-orange-500/10'}`}>
            HEAT: {heat.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

function FirewallRow() {
  const firewallHealth   = useGameStore(s => s.firewallHealth);
  const node             = useGameStore(s => s.currentNode);
  const firewallRevealed = useGameStore(s => s.firewallRevealed);
  const exposedTicks     = useGameStore(s => s.exposedTicks);
  const rabbitTicks      = useGameStore(s => s.rabbitTicks);
  const log              = useGameStore(s => s.terminalLog); // ADDED: Pull the log state

  const [isHit, setIsHit] = useState(false);
  const [isCrit, setIsCrit] = useState(false); // ADDED: Track critical state
  const prevHP = useRef(firewallHealth);

  useEffect(() => {
    if (firewallHealth < prevHP.current) {
      setIsHit(true);

      // ADDED: Check the last 3 log entries to see if we triggered the 2.0x Multiplier safely
      const recentLogs = (log || []).slice(-3).map(l => typeof l === 'string' ? l : (l?.text || ''));
      const wasCritical = recentLogs.some(l => l.includes('CRITICAL OVERRIDE'));
      if (wasCritical) setIsCrit(true);

      const timer = setTimeout(() => {
        setIsHit(false);
        setIsCrit(false);
      }, 300); // 300ms hold so the critical flash feels weighty
      
      prevHP.current = firewallHealth;
      return () => clearTimeout(timer);
    }
    prevHP.current = firewallHealth;
  }, [firewallHealth, log]);

  const isHidden = node?.specialDefense === 'ENCRYPTED_LOGS' && !firewallRevealed;
  const maxHP    = node?.firewallHP ?? 100;
  
  const totalBlocks = 10;
  const hpPercentage = Math.max(0, firewallHealth / maxHP);
  const activeBlocks = Math.ceil(hpPercentage * totalBlocks);

  return (
    <div className="flex flex-col px-4 py-1">
      {/* Offense Context Zone */}
      {(exposedTicks > 0 || rabbitTicks > 0 || isHidden) && (
        <div className="flex gap-2 mb-1 pl-16">
          {isHidden && (
             <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border text-amber-400 border-amber-500/30 bg-amber-500/10">
               !_ENCRYPTED_!
             </span>
          )}
          {exposedTicks > 0 && (
             <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border text-amber-300 border-amber-400/50 bg-amber-400/10 shadow-[0_0_8px_rgba(251,191,36,0.5)] animate-pulse">
               EXPOSED [{exposedTicks}s]
             </span>
          )}
          {rabbitTicks > 0 && (
             <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border text-green-400 border-green-500/50 bg-green-500/10 shadow-[0_0_8px_rgba(74,222,128,0.5)]">
               RABBIT.exe [{rabbitTicks}s]
             </span>
          )}
        </div>
      )}

      {/* Shake the entire row aggressively if it's a critical hit! */}
      <div className={`flex items-center gap-4 transition-colors duration-150 ${isHit ? 'bg-white/5' : ''} ${isCrit ? 'danger-shake' : ''}`}>
        <span className={`font-mono text-[11px] uppercase tracking-widest w-12 shrink-0 font-bold transition-colors ${isHit ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'text-zinc-400'}`}>
          FW_HP
        </span>

        {isHidden ? (
          <div className="flex-1 flex gap-0.5 h-3">
            <div className="h-full w-full bg-amber-500/40 opacity-80 animate-pulse border border-amber-500/50" />
            <span className="font-mono text-[11px] font-bold tabular-nums w-7 text-right text-amber-500/80 ml-2">
              ??
            </span>
          </div>
        ) : (
          <div className="flex-1 flex gap-0.5 h-3">
            {Array.from({ length: totalBlocks }).map((_, i) => {
              const isActive = i < activeBlocks;
              return (
                <div
                  key={i}
                  className={`flex-1 h-full transition-all duration-75 ${
                    isActive 
                      ? isCrit 
                        ? 'fw-block-critical' // ADDED: Critical styling
                        : isHit
                          ? 'fw-block-hit'
                          : 'bg-violet-500 border-y border-violet-400 shadow-[0_0_5px_rgba(139,92,246,0.3)]' 
                      : 'bg-zinc-800/50 border-y border-zinc-800'
                  }`}
                />
              );
            })}
            <span className={`font-mono text-[11px] tabular-nums w-8 text-right font-bold ml-1 shrink-0 transition-colors ${isHit ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'text-zinc-300'}`}>
              {Math.ceil(firewallHealth)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function TraceRow() {
  const trace         = useGameStore(s => s.digitalTrace);
  const node          = useGameStore(s => s.currentNode);
  const pulseActive   = useGameStore(s => s.pulseActive);
  const settings      = useGameStore(s => s.settings);
  const rawLog        = useGameStore(s => s.terminalLog);
  const activeDaemon  = useGameStore(s => s.activeDaemon);
  const ghostTicks    = useGameStore(s => s.ghostTicks);

  const [syncFlash, setSyncFlash] = useState(false);

  useEffect(() => {
    const log = (rawLog || []).map(entry => typeof entry === 'string' ? entry : (entry?.text || ''));
    if (log.length > 0 && log[log.length - 1].includes('PERFECT SYNC')) {
      setSyncFlash(true);
      const timer = setTimeout(() => setSyncFlash(false), 600);
      return () => clearTimeout(timer);
    }
  }, [rawLog]);
  
  const shakeEnabled  = settings?.shakeEnabled ?? true;
  const glitchEnabled = settings?.glitchEnabled ?? true;
  
  // Add GOLD_CACHE to the accelerated check
  const isAccelerated = node?.specialDefense === 'TRACE_ACCELERATOR' || node?.specialDefense === 'DARKNET' || node?.mutator?.id === 'GOLD_CACHE';
  const isDanger  = trace >= 80;
  const isWarning = trace >= 50;

  const labelColor = isDanger
    ? 'text-red-400'
    : pulseActive
      ? 'text-cyan-300'
      : isWarning
        ? 'text-orange-400'
        : 'text-zinc-400';

  const barGradient = ghostTicks > 0
    ? 'bg-gradient-to-r from-slate-400 to-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
    : isDanger
      ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'
      : isWarning
        ? 'bg-gradient-to-r from-orange-600 to-orange-400'
        : pulseActive
          ? 'bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
          : 'bg-gradient-to-r from-blue-700 to-blue-500';

  return (
    <div className={`flex flex-col px-4 py-1 ${isDanger && shakeEnabled ? 'danger-shake' : ''}`}>
      
      {/* Defense Context Zone */}
      {(activeDaemon || ghostTicks > 0 || isAccelerated) && (
        <div className="flex gap-2 mb-1 pl-16">
          {activeDaemon && (
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border text-red-500 border-red-500/50 bg-red-500/10 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]">
              ! {activeDaemon} ACTIVE !
            </span>
          )}
          {ghostTicks > 0 && (
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border text-slate-300 border-slate-400/50 bg-slate-400/10 shadow-[0_0_8px_rgba(148,163,184,0.5)]">
              GHOST.sys [{ghostTicks}s]
            </span>
          )}
          {isAccelerated && !ghostTicks && (
             <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border text-red-400 border-red-500/30 bg-red-500/10">
               TRACE x2
             </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        <span className={`font-mono text-[11px] uppercase tracking-widest w-12 shrink-0 font-bold ${labelColor} ${(isDanger || pulseActive) && glitchEnabled ? 'animate-pulse' : ''}`}>
          {isDanger ? '[GHOST_SYNC]' : pulseActive ? 'SYNC' : 'TRACE'}
        </span>

        <div className={`flex-1 h-2.5 bg-black rounded-none overflow-hidden border shadow-inner relative transition-all duration-150 ${
          syncFlash ? 'animate-sync-pulse z-10' : pulseActive ? 'border-cyan-500/60 shadow-[0_0_6px_rgba(34,211,238,0.3)]' : 'border-zinc-800'
        }`}>
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
          <div
            className={`h-full rounded-none transition-all duration-300 ${barGradient} ${isAccelerated && !isDanger && !pulseActive && glitchEnabled && !ghostTicks ? 'opacity-80 animate-pulse' : ''}`}
            style={{ width: `${Math.min(100, trace)}%` }}
          />
        </div>

        <span className={`font-mono text-[11px] tabular-nums w-8 text-right font-bold shrink-0 ${labelColor}`}>
          {trace.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function ConsumableBar() {
  const consumables    = useGameStore(s => s.consumables);
  const useConsumable  = useGameStore(s => s.useConsumable);
  const inventory      = useGameStore(s => s.inventory || []);
  const useHardware    = useGameStore(s => s.useHardware);
  const hasBeatenGame  = useGameStore(s => s.hasBeatenGame);
  const getCurrentAct  = useGameStore(s => s.getCurrentAct);
  
  const rabbit = consumables?.rabbit ?? 0;
  const ghost  = consumables?.ghost ?? 0;

  const activeHardware = inventory.map((item, idx) => ({ ...item, originalIndex: idx }))
    .filter(item => item.id === 'LIQUID_COOLER' || item.id === 'SIGNAL_BOOSTER');

  const showBar = hasBeatenGame || getCurrentAct() >= 2 || rabbit > 0 || ghost > 0 || activeHardware.length > 0;
  if (!showBar) return null;

  return (
    <div className="flex flex-col gap-2 px-4 py-2 border-t border-zinc-800/40 pb-3">
      {(hasBeatenGame || getCurrentAct() >= 2 || rabbit > 0 || ghost > 0) && (
        <div className="flex gap-2">
          <button
            onClick={() => useConsumable('rabbit')}
            disabled={rabbit === 0}
            className={[
              'flex-1 py-3 px-4 rounded-sm font-mono text-[11px] font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] active:border-b active:translate-y-[2px]',
              rabbit > 0
                ? 'border-green-500/60 border-b-green-700 text-green-400 bg-green-500/5 hover:bg-green-500/15 glow-green'
                : 'border-zinc-800 border-b-zinc-900 text-zinc-600 bg-zinc-900/50 cursor-not-allowed',
            ].join(' ')}
          >
            RABBIT [×{rabbit}]
          </button>
          <button
            onClick={() => useConsumable('ghost')}
            disabled={ghost === 0}
            className={[
              'flex-1 py-3 px-4 rounded-sm font-mono text-[11px] font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] active:border-b active:translate-y-[2px]',
              ghost > 0
                ? 'border-slate-400/60 border-b-slate-600 text-slate-300 bg-slate-500/5 hover:bg-slate-500/15 glow-slate'
                : 'border-zinc-800 border-b-zinc-900 text-zinc-600 bg-zinc-900/50 cursor-not-allowed',
            ].join(' ')}
          >
            GHOST.sys [×{ghost}]
          </button>
        </div>
      )}

      {activeHardware.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x mt-1">
          {activeHardware.map((item, i) => (
             <button
               key={`${item.id}-${i}`}
               onClick={() => useHardware(item.originalIndex)}
               className="shrink-0 flex-1 min-w-[120px] py-2.5 px-3 rounded-sm font-mono text-[10px] font-bold uppercase tracking-widest transition-all duration-75 border border-b-[3px] active:border-b active:translate-y-[2px] border-cyan-500/50 border-b-cyan-700 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 snap-center shadow-[0_0_10px_rgba(34,211,238,0.15)]"
             >
               INJECT {item.name} {(item.count || 1) > 1 ? `[×${item.count}]` : ''}
             </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VisualRabbits({ ticks }) {
  if (ticks <= 0) return null;
  const RABBIT_ARTS = [ '(\\_/)', '(*^.^*)', '<data>' ];
  const rabbits = Array.from({ length: 6 }).map((_, i) => {
    const left     = 5 + Math.random() * 85; 
    const delay    = Math.random() * -4; 
    const duration = 2.5 + Math.random() * 2.5; 
    const chosenArt = RABBIT_ARTS[Math.floor(Math.random() * RABBIT_ARTS.length)];
    return (
      <div 
        key={i} 
        className="absolute text-green-500/50 font-mono font-bold text-sm pointer-events-none animate-rabbit z-30"
        style={{ left: `${left}%`, animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
      >
        {chosenArt}
      </div>
    );
  });
  return <div className="absolute inset-0 pointer-events-none overflow-hidden">{rabbits}</div>;
}

const MENACING_SKULL_FACE = `
     _[ ]_
    /[_]_[_]\\
   |  [X|X]  |
   |   ===   |
    \\ _|||_ /
     >_____<
`;

// ─── THE ENEMY: BOSS CORE ────────────────────────────────────────────────────
function BossCore({ trace, heat, fwHealth, maxFw }) {
  const rawLog = useGameStore(s => s.terminalLog); 
  const exposedTicks = useGameStore(s => s.exposedTicks);
  const isHitStopped = useGameStore(s => s.isHitStopped);
  
  // ── THE MAGIC MATH ──
  const getCurrentAct = useGameStore(s => s.getCurrentAct);
  const act = getCurrentAct ? getCurrentAct() : 1;
  const gameMode    = useGameStore(s => s.gameMode);
  const arcadeScore = useGameStore(s => s.arcadeStats?.score ?? 0);
  const hueShift = gameMode === 'arcade' ? arcadeScore * 15 : (act - 1) * 60;
  
  const safeLog = rawLog || [];
  const recentLogs = safeLog.slice(-3).map(l => typeof l === 'string' ? l : (l?.text || ''));
  
  // Detection Logic
  const isStaggered = recentLogs.some(l => l.includes('CRITICAL OVERRIDE') || l.includes('2.0x MULTIPLIER'));
  const isTripleThreat = recentLogs.some(l => l.includes('TRIPLE_THREAT_DETONATION'));

  const maxDanger = Math.max(trace, heat);
  const healthPercent = fwHealth / maxFw;
  const isEnraged = maxDanger >= 80;
  const isAlert = maxDanger >= 50;

  const borderColor = isEnraged ? 'border-red-500' : isAlert ? 'border-amber-500' : 'border-cyan-500';
  const shadowColor = isEnraged ? 'shadow-[0_0_60px_rgba(239,68,68,0.6)]' : isAlert ? 'shadow-[0_0_50px_rgba(245,158,11,0.5)]' : 'shadow-[0_0_40px_rgba(34,211,238,0.4)]';
  const coreBg      = isEnraged ? 'bg-red-500' : isAlert ? 'bg-amber-500' : 'bg-cyan-500';
  const innerColor  = isEnraged ? 'bg-red-500/20' : isAlert ? 'bg-amber-500/20' : 'bg-cyan-500/10';

  const [particles, setParticles] = useState([]);
  const [beams, setBeams] = useState([]);         
  const prevFw = useRef(fwHealth);

  useEffect(() => {
    if (fwHealth < prevFw.current) {
      const dmg = prevFw.current - fwHealth;
      
      const newParticle = {
        id: Date.now() + Math.random(),
        dmg: Math.ceil(dmg),
        isCrit: isStaggered || isTripleThreat,
        isMega: isTripleThreat,
        x: (Math.random() - 0.5) * 140, 
        y: (Math.random() - 0.5) * 80,
        rot: (Math.random() - 0.5) * 40 
      };
      
      const numTracers = isTripleThreat ? 12 : (isStaggered ? 5 : 1); 
      const newBeams = Array.from({ length: numTracers }).map((_, i) => ({
        id: Date.now() + Math.random(),
        isCrit: isStaggered || isTripleThreat,
        x: (Math.random() - 0.5) * (isTripleThreat ? 250 : 160), 
        delay: i * (isTripleThreat ? 30 : 60), 
        tailHeight: 150 + Math.random() * 100,
        hex: Math.floor(Math.random() * 65535).toString(16).toUpperCase() 
      }));

      setParticles(p => [...p, newParticle]);
      setBeams(b => [...b, ...newBeams]);
      setTimeout(() => setParticles(p => p.filter(x => x.id !== newParticle.id)), 1200);
      setTimeout(() => {
        const bIds = newBeams.map(b => b.id);
        setBeams(b => b.filter(x => !bIds.includes(x.id)));
      }, 1000);
    }
    prevFw.current = fwHealth;
  }, [fwHealth, isStaggered, isTripleThreat]);

  const playState = isHitStopped ? 'paused' : 'running';
  const staggerEffect = isStaggered ? 'scale-95 brightness-150 contrast-125 danger-shake' : 'scale-100 brightness-100 contrast-100 animate-boss-breathe';
  const finisherClass = isTripleThreat ? 'animate-shake-extreme brightness-[2] saturate-200' : '';

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* ─── FULL SCREEN FLASH ─── */}
      {isTripleThreat && <div className="absolute inset-0 z-[100] bg-white animate-supernova" />}

      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/10 via-zinc-950/40 to-zinc-950" />
      
      {/* MASSIVE CONTAINER (Filter Applied Here) */}
      <div className={`absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96 flex items-center justify-center opacity-90 mix-blend-screen transition-all duration-75 ease-out ${staggerEffect} ${finisherClass}`}
           style={{ 
             animationPlayState: playState,
             filter: `hue-rotate(${hueShift}deg)` // <--- This shifts the color!
           }}>
        
        {/* ─── 90s TARGET LOCK ─── */}
        {exposedTicks > 0 && (
          <div className="absolute inset-[-40px] flex items-center justify-center z-20 animate-[spin_4s_linear_infinite]"
               style={{ animationPlayState: playState }}>
            <div className="w-full h-full border-[3px] border-amber-400/80 rounded-full border-dashed opacity-80" />
            <div className="absolute w-[120%] h-[2px] bg-amber-400/40" />
            <div className="absolute h-[120%] w-[2px] bg-amber-400/40" />
            <div className="absolute font-display text-[10px] md:text-xs text-black font-black bg-amber-400 tracking-widest px-2 shadow-[0_0_15px_rgba(251,191,36,0.8)]">
              CRITICAL_LOCK_ACQUIRED
            </div>
          </div>
        )}

        {/* ─── TRIPLE RING GEOMETRY ─── */}
        
        {/* Ring 1: Outer Shield (Heavy) */}
        <div className={`absolute inset-0 rounded-full border-t-[10px] border-b-[4px] border-r-[6px] border-dashed ${borderColor} ${shadowColor} animate-[spin_10s_linear_infinite] transition-all duration-500`}
             style={{ opacity: 0.3 + (healthPercent * 0.7), animationPlayState: playState }} />
        
        {/* Ring 2: Mid Processing (Dotted) */}
        <div className={`absolute inset-8 rounded-full border-[6px] border-dotted ${borderColor} ${shadowColor} animate-[spin_15s_linear_infinite_reverse] opacity-80`}
             style={{ animationPlayState: playState }} />

        {/* Ring 3: Inner Data (Thin) */}
        <div className={`absolute inset-16 rounded-full border-[2px] border-dashed ${borderColor} opacity-40 animate-[spin_5s_linear_infinite]`}
             style={{ animationPlayState: playState }} />
        
        {/* The Core Eye */}
        <div className={`absolute w-16 h-16 md:w-24 md:h-24 rounded-sm border-[4px] rotate-45 ${borderColor} ${shadowColor} ${innerColor} transition-colors duration-500 flex items-center justify-center`}
             style={{ animationPlayState: playState }}>
          <div className={`w-1/2 h-1/2 rounded-full ${coreBg} ${isEnraged ? 'animate-pulse' : ''}`} 
               style={{ animationPlayState: playState }} />
          {(fwHealth < prevFw.current) && <div className="absolute inset-0 bg-white rounded-sm animate-ping" />}
        </div>

        {/* ─── DATA BEAMS ─── */}
        {beams.map(b => (
          <div
            key={b.id}
            className="absolute z-10 flex flex-col items-center pointer-events-none animate-data-strike opacity-0-start"
            style={{
              left: `calc(50% + ${b.x}px)`,
              bottom: '-120px', 
              animationDelay: `${b.delay}ms`,
              animationPlayState: playState 
            }}
          >
            <span className={`font-mono text-xs sm:text-sm font-black leading-none mb-1 ${b.isCrit ? 'text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,1)]' : 'text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,1)]'}`}>
              0x{b.hex}
            </span>
            <div 
              className={`w-3 sm:w-4 ${b.isCrit ? 'text-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.5)]' : 'text-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.5)]'}`} 
              style={{ 
                height: `${b.tailHeight}px`,
                backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 2px, currentColor 2px, currentColor 6px)' 
              }} 
            />
          </div>
        ))}

        {/* ─── DAMAGE NUMBERS ─── */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute z-50 font-display uppercase tracking-widest pointer-events-none animate-damage opacity-0-start flex flex-col items-center justify-center"
            style={{
              left: `calc(50% + ${p.x}px)`,
              top:  `calc(50% + ${p.y}px)`,
              transform: `translate(-50%, -50%) rotate(${p.rot}deg)`,
              animationDelay: p.isCrit ? '250ms' : '100ms',
              animationPlayState: playState
            }}
          >
            <span className={`font-black uppercase tracking-tighter ${p.isMega ? 'text-6xl sm:text-8xl text-white drop-shadow-[0_0_30px_rgba(255,255,255,1)]' : 'text-4xl sm:text-5xl text-amber-400'}`}>
              -{p.dmg} {p.isMega && '!!!'}
            </span>
          </div>
        ))}

      </div>
    </div>
  );
}

// ─── MASHA COMMS OVERLAY (The Codec) ─────────────────────────────────────────
function MashaCodec() {
  const rawLog = useGameStore(s => s.terminalLog);
  const [message, setMessage] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [displayKey, setDisplayKey] = useState(0); // Forces effect reset
  
  const lastSeenRef = useRef(null);

  useEffect(() => {
    const safeLog = rawLog || [];
    if (safeLog.length === 0) return;
    
    const recentLogs = safeLog.slice(-3).map(l => typeof l === 'string' ? l : l?.text).filter(Boolean);
    const latestMashaLog = [...recentLogs].reverse().find(l => l.includes('MASHA'));
    
    // Trigger if it's a new message
    if (latestMashaLog && latestMashaLog !== lastSeenRef.current) {
      lastSeenRef.current = latestMashaLog;

      const cleanText = latestMashaLog.replace(/^.*MASHA[^a-zA-Z0-9]*\s*/i, '').replace(/['"]/g, '');
      
      setMessage(cleanText);
      setIsVisible(true);
      setDisplayKey(prev => prev + 1); // Increment key to reset timer logic
    }
  }, [rawLog]);

  // Dedicated timer effect that handles its own cleanup
  useEffect(() => {
    if (!isVisible) return;

    // 2.2 seconds - Extremely fast, keeps the HUD clean
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, [displayKey, isVisible]);

  return (
    <div className={`absolute top-4 left-4 right-4 z-[60] transition-all duration-300 ease-in-out flex justify-center pointer-events-none ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'}`}>
      <div className="bg-zinc-950/95 backdrop-blur-md border-[2px] border-fuchsia-500/80 shadow-[0_10px_30px_rgba(217,70,239,0.3)] p-3 flex gap-4 items-center w-full max-w-sm">
        
        <div className="w-12 h-12 shrink-0 bg-fuchsia-950/50 border border-fuchsia-500/50 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 w-full bg-fuchsia-500 text-black font-mono text-[8px] font-black text-center tracking-widest uppercase leading-tight">
            MASHA
          </div>
          <div className="flex items-end gap-0.5 h-4 mt-2">
            <div className="w-1 bg-fuchsia-400 animate-[bounce_0.8s_infinite] origin-bottom" />
            <div className="w-1 bg-fuchsia-400 animate-[bounce_0.5s_infinite] origin-bottom" style={{ animationDelay: '0.1s' }} />
            <div className="w-1 bg-fuchsia-400 animate-[bounce_1.2s_infinite] origin-bottom" style={{ animationDelay: '0.2s' }} />
            <div className="w-1 bg-fuchsia-400 animate-[bounce_0.6s_infinite] origin-bottom" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-[9px] text-fuchsia-300 font-bold uppercase tracking-widest">
              Live Transmission
            </span>
          </div>
          <p className="font-mono text-xs text-white leading-snug">
            "{message}"
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── COMBO INDICATOR: SCAN -> DECRYPT -> PULSE ──────────────────────────────
function ComboDisplay() {
  const chain = useGameStore(s => s.comboChain) || [];
  const exposed = useGameStore(s => s.exposedTicks > 0);
  
  // Detection for the "Break" visual
  const isBroken = chain.length === 0 && !exposed;

  const TARGET = [
    { id: 'SCAN',    color: 'text-cyan-400',    icon: '📡' },
    { id: 'DECRYPT', color: 'text-fuchsia-400', icon: '🔑' },
    { id: 'PULSE',   color: 'text-emerald-400', icon: '⚡' }
  ];

  return (
    <div className={`px-4 flex items-center gap-3 mb-1 mt-1 transition-all ${isBroken ? 'animate-combo-break' : ''}`}>
      <span className="font-mono text-[8px] text-zinc-600 uppercase tracking-tighter">Chain_Buffer:</span>
      <div className="flex gap-1">
        {TARGET.map((step, i) => {
          const isActive = chain[i] === step.id;
          
          return (
            <div 
              key={i}
              className={`w-6 h-4 border flex items-center justify-center text-[10px] transition-all duration-200 ${
                isActive 
                  ? `${step.color} border-current bg-current/5 shadow-[0_0_5px_currentColor]` 
                  : 'text-zinc-900 border-zinc-900 bg-transparent'
              }`}
            >
              {isActive ? step.icon : ''}
            </div>
          );
        })}
      </div>
      
      {chain.length === 3 && exposed && (
        <span className="font-mono text-[9px] font-black text-amber-500/80 animate-pulse ml-auto tracking-tighter">
          [!] PAYLOAD_READY
        </span>
      )}
    </div>
  );
}

export default function HackingScene() {
  const [inspectingModifier, setInspectingModifier] = useState(null);

  const trace = useGameStore(s => s.digitalTrace);
  const heat  = useGameStore(s => s.physicalHeat);
  
  const status             = useGameStore(s => s.status);
  const transitOutcome     = useGameStore(s => s.transitOutcome);
  const isPerfectBreach    = useGameStore(s => s.isPerfectBreach);
  const reducedMotion      = useGameStore(s => s.settings?.reducedMotion);
  const sessionIntelEarned = useGameStore(s => s.sessionIntelEarned);
  const settings           = useGameStore(s => s.settings);
  const setPaused          = useGameStore(s => s.setPaused);

  const systemOverride  = useGameStore(s => s.systemOverride);
  const resolveOverride = useGameStore(s => s.resolveOverride);
  const getCurrentAct   = useGameStore(s => s.getCurrentAct);

  const exposedTicks   = useGameStore(s => s.exposedTicks);
  const firewallHealth = useGameStore(s => s.firewallHealth);
  const activeDaemon   = useGameStore(s => s.activeDaemon); 
  const rabbitTicks    = useGameStore(s => s.rabbitTicks);

  const gameMode               = useGameStore(s => s.gameMode);
  const arcadeStats            = useGameStore(s => s.arcadeStats);
  const tickArcadeTimer        = useGameStore(s => s.tickArcadeTimer);
  const startArcadeMode        = useGameStore(s => s.startArcadeMode);
  const setStatus              = useGameStore(s => s.setStatus);

  const isTutorial             = useGameStore(s => s.isTutorial);
  const tutorialStep           = useGameStore(s => s.tutorialStep);

  const [daemonFlash, setDaemonFlash] = useState(false);
  
  const prevExposed = useRef(exposedTicks);
  const prevFW = useRef(firewallHealth);
  const prevDaemon = useRef(activeDaemon);

  const hapticsEnabled = useGameStore(s => s.settings?.hapticsEnabled);

  // This logic chooses the animation based on your settings
  const transitionClass = (status === 'hacking') 
    ? (reducedMotion ? "animate-fade-in" : "animate-rip-in") 
    : "";

  // --- HANDLE INSPECT ---
  const handleInspect = (id) => {
    AudioManager.playSFX('thock');
    setInspectingModifier(id);
    setPaused(true); 
  };

  const handleCloseInspect = () => {
    setInspectingModifier(null);
    setPaused(false); 
  };

  // --- AUDIO TRIGGER: FAILURE & SUCCESS STATES ---
  useEffect(() => {
    if (status === 'resolved') {
      if (transitOutcome === 'success') {
        AudioManager.playSFX('success');
      } else if (transitOutcome === 'trace_busted' || transitOutcome === 'heat_busted') {
        AudioManager.playSFX('glitch');
      }
    }
  }, [status, transitOutcome]);

  useEffect(() => {
    if (status !== 'hacking' || !hapticsEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    const maxDanger = Math.max(trace, heat);
    if (maxDanger < 75) return;
    const intervalTime = Math.max(300, 1000 - ((maxDanger - 75) * 28));
    const interval = setInterval(() => navigator.vibrate([15, 60, 20]), intervalTime);
    return () => clearInterval(interval);
  }, [trace, heat, status, hapticsEnabled]);

  useEffect(() => {
    if (activeDaemon && !prevDaemon.current) {
      setDaemonFlash(true);
      const timer = setTimeout(() => setDaemonFlash(false), 400);
      prevDaemon.current = activeDaemon;
      return () => clearTimeout(timer);
    }
    prevDaemon.current = activeDaemon;
  }, [activeDaemon]);

  const [popupDismissed, setPopupDismissed] = useState(false);

  useEffect(() => {
    if (status !== 'resolved') setPopupDismissed(false);
  }, [status]);

  // ── ARCADE: 1-second countdown ──
  useEffect(() => {
    if (gameMode !== 'arcade' || status !== 'hacking') return;
    const interval = setInterval(() => tickArcadeTimer(), 1000);
    return () => clearInterval(interval);
  }, [gameMode, status]);

  const handleDismissPopup = () => {
    AudioManager.playSFX('thock');
    if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    setPopupDismissed(true);
  };

  const isTraceDanger = trace >= 80 && (settings?.glitchEnabled ?? true);
  const isHeatDanger  = heat  >= 80;

  const node = useGameStore(s => s.currentNode);
  const isGoldCache = node?.mutator?.id === 'GOLD_CACHE';
  const isVolatile  = node?.mutator?.id === 'VOLATILE';

  const isWin = status === 'resolved' && transitOutcome === 'success';
  const isBusted = status === 'resolved' && (transitOutcome === 'trace_busted' || transitOutcome === 'heat_busted');
  
  const entranceClass = (status === 'hacking') 
    ? (reducedMotion ? "animate-fade-in" : "animate-rip-in") 
    : "";

  // 2. Handle the "End of Mission" Success/Failure Tints
  const outcomeClass = isWin
    ? isPerfectBreach
      ? "contrast-[1.15] saturate-150 brightness-90 transition-all duration-500"
      : "contrast-[1.15] saturate-150 hue-rotate-[15deg] brightness-90 transition-all duration-500"
    : "transition-all duration-300 ease-in";

  // Combine them into one clean string
  const finalTransitionClass = `${entranceClass} ${outcomeClass}`;

  let popupConfig = null;
  if (status === 'resolved') {
    const isTartarus = useGameStore.getState().currentJobType === 'tartarus';
    if (transitOutcome === 'success') {
      popupConfig = {
        title: isTartarus ? 'THE PLANET IS HACKED' : 'ACCESS GRANTED',
        sub: isTartarus ? 'Vertex is blind. We actually did it.' : (isPerfectBreach ? 'PERFECT BREACH EXECUTION' : 'NODE FIREWALL BYPASSED'),
        intel: isTartarus ? 'SKELETON_KEY.EXE EXECUTED' : `PAYLOAD SECURED: +${sessionIntelEarned} IF`,
        border: 'border-green-500',
        headerBg: 'bg-green-500',
        titleColor: 'text-green-400',
        shadow: 'shadow-[8px_8px_0px_0px_rgba(34,197,94,0.2)]'
      };
    } else if (transitOutcome === 'escaped') {
      popupConfig = {
        title: 'TACTICAL RETREAT',
        sub: 'CONNECTION CLOSED SAFELY',
        intel: `SALVAGED: +${sessionIntelEarned} IF`,
        border: 'border-amber-500',
        headerBg: 'bg-amber-500',
        titleColor: 'text-amber-400',
        shadow: 'shadow-[8px_8px_0px_0px_rgba(245,158,11,0.2)]'
      };
    } else {
      const isHeat = transitOutcome === 'heat_busted';
      popupConfig = {
        title: isHeat ? 'HARDWARE FAILURE' : 'TRACE CRITICAL',
        sub: isHeat ? 'Core temp exceeded safety limits.' : 'IP Leaked. Remote lockout initiated.',
        intel: 'INTEL WIPED : 0 IF',
        border: 'border-red-600', 
        headerBg: 'bg-red-600',
        titleColor: 'text-red-500',
        shadow: 'shadow-[8px_8px_0px_0px_rgba(220,38,38,0.2)]'
      };
    }
  }

  return (
    <div 
      key={status} // THIS IS THE TRIGGER: Forces the animation to play on status change
      className={`flex flex-col h-full bg-zinc-950 relative overflow-hidden ${finalTransitionClass}`}
    >
      
      {/* ─── QUICK LOOK OVERLAY ─── */}
      {inspectingModifier && (
        <KernelDiagnostic 
          modifierId={inspectingModifier} 
          onClose={handleCloseInspect} 
        />
      )}

      {!reducedMotion && (
        <div className="gibson-environment">
          <div className="gibson-grid opacity-20" />
        </div>
      )}

      {/* THE NEW BOSS ENTITY */}
      {!reducedMotion && status !== 'resolved' && (
        <BossCore 
          trace={trace} 
          heat={heat} 
          fwHealth={firewallHealth} 
          maxFw={node?.maxFirewallHP || 100}
        />
      )}

      {/* Hex Data Waterfall when you win! */}
      {status === 'resolved' && transitOutcome === 'success' && !reducedMotion && (
        <div className="hex-stream-bg" />
      )}

      {(isHeatDanger && !reducedMotion) && <div className="siren-vignette" />}
      
      {isBusted && !reducedMotion && <KernelPanicOverlay />}

      {daemonFlash && !reducedMotion && (
        <div className="absolute inset-0 bg-red-600/30 mix-blend-overlay pointer-events-none z-40 animate-pulse" />
      )}

      <TopBorder />

      {/* ── THE LIVE COMMS OVERLAY ── */}
      <MashaCodec />

      {/* ── ARCADE: COUNTDOWN TIMER ── */}
      {gameMode === 'arcade' && status === 'hacking' && (() => {
        const mult      = arcadeStats.multiplier ?? 1;
        const isDanger  = arcadeStats.timeRemaining <= 10;
        const isFrenzy  = mult >= 3;
        const borderCls = isDanger ? 'border-red-500 danger-shake' : isFrenzy ? 'border-fuchsia-400 danger-shake' : 'border-cyan-500';
        const labelCls  = isDanger ? 'text-red-400' : isFrenzy ? 'text-fuchsia-400' : 'text-cyan-400';
        const timeCls   = isDanger ? 'text-red-400 text-glow danger-shake' : isFrenzy ? 'text-fuchsia-300 text-glow' : 'text-cyan-300';
        return (
          <div className={`absolute top-16 left-1/2 -translate-x-1/2 z-[55] glass-panel border-2 px-6 py-3 flex flex-col items-center gap-1 pointer-events-none ${borderCls}`}>
            <div className={`font-mono text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 ${labelCls}`}>
              <span>SCORE:</span>
              <span className={isFrenzy ? 'animate-pulse text-glow' : ''}>{arcadeStats.score}</span>
              {mult > 1 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded border ${isFrenzy ? 'text-fuchsia-300 border-fuchsia-500/60 bg-fuchsia-500/10 animate-pulse text-glow' : 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10'}`}>
                  x{mult} MULT
                </span>
              )}
            </div>
            <div className={`font-mono text-4xl font-black tabular-nums leading-none ${timeCls}`}>
              00:{String(arcadeStats.timeRemaining).padStart(2, '0')}
            </div>
          </div>
        );
      })()}

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        
        {/* --- Extreme Overlay Effects --- */}
        {isGoldCache && !reducedMotion && (
          <div className="absolute inset-0 pointer-events-none z-30 shadow-[inset_0_0_120px_rgba(250,204,21,0.15)] border-[2px] border-yellow-500/30 mix-blend-screen" />
        )}
        {isVolatile && !reducedMotion && (
          <div className="absolute inset-0 pointer-events-none z-30 shadow-[inset_0_0_120px_rgba(249,115,22,0.15)] border-[2px] border-orange-500/30 animate-pulse mix-blend-screen" />
        )}
        
        {gameMode === 'arcade' && status === 'resolved' && (
          <ArcadeResults
            onRestart={startArcadeMode}
            onExit={() => setStatus('main_menu')}
          />
        )}

        {gameMode !== 'arcade' && status === 'resolved' && popupConfig && !popupDismissed && (
          <div className={`absolute top-[40%] left-4 right-4 -translate-y-1/2 z-50 bg-black border-2 ${popupConfig.border} ${popupConfig.shadow} flex flex-col`}>
            <div className={`px-2 py-1 flex justify-between items-center ${popupConfig.headerBg}`}>
              <span className="font-mono text-[10px] font-black text-black uppercase tracking-widest">
                SYS_DIALOG.exe
              </span>
              <button 
                onClick={handleDismissPopup}
                className="font-mono text-[10px] text-black font-bold hover:bg-black/20 px-1"
              >
                [X]
              </button>
            </div>
            
            <div className="p-5 flex flex-col items-center text-center relative overflow-hidden">
              <h2 className={`font-mono text-xl font-black uppercase tracking-widest mb-1 ${popupConfig.titleColor} ${isBusted ? 'animate-pulse' : ''}`}>
                {popupConfig.title}
              </h2>
              
              <p className="font-mono text-[11px] text-zinc-300 uppercase tracking-widest mb-1 relative z-10">
                {popupConfig.sub}
              </p>
              
              <p className={`font-mono text-sm font-bold uppercase tracking-widest mt-2 relative z-10 ${popupConfig.titleColor}`}>
                {popupConfig.intel}
              </p>
              
              <div className="mt-5 pt-3 border-t border-dashed border-zinc-800 w-full relative z-10 flex flex-col items-center gap-2">
                <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest mb-1">
                  -- AWAITING MANUAL OVERRIDE --
                </span>
                
                {transitOutcome === 'success' ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono text-[11px] font-black text-fuchsia-400 uppercase tracking-[0.15em] animate-pulse">
                      {useGameStore.getState().currentJobType === 'tartarus' 
                        ? "HOLD [UPLOAD] TO INJECT SKELETON KEY" 
                        : "HOLD [SIPHON] TO DRAIN VAULT"}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-cyan-500/80 uppercase tracking-widest">
                      {useGameStore.getState().currentJobType === 'tartarus' 
                        ? "OR [DISCONNECT] TO ABORT MISSION" 
                        : "OR [DISCONNECT] TO SECURE"}
                    </span>
                  </div>
                ) : (
                  <span className="font-mono text-[11px] font-bold text-cyan-400/90 uppercase tracking-widest">
                    SELECT [DISCONNECT] TO SEVER UPLINK
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {systemOverride !== null && (
          <div className="absolute inset-x-4 top-[15%] bottom-[20%] z-50 flex flex-col justify-center relative overflow-hidden">
            
            <pre className="absolute inset-0 flex items-center justify-center font-mono text-[8px] sm:text-[10px] leading-tight text-red-500/20 animate-skull pointer-events-none select-none z-0">
              {MENACING_SKULL_FACE}
            </pre>

            <button
              onPointerDown={(e) => { e.preventDefault(); resolveOverride(); }}
              className="relative z-10 w-full py-8 bg-red-950/80 backdrop-blur-md border-2 border-red-500 border-b-[8px] active:border-b-2 active:translate-y-1.5 rounded-none shadow-[6px_6px_0px_0px_rgba(239,68,68,0.4)] flex flex-col items-center justify-center danger-shake"
            >
              <span className="font-mono text-xl font-black text-red-500 uppercase tracking-[0.2em] animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                {getCurrentAct() === 1 ? "SYSTEM OVERRIDE" : getCurrentAct() === 2 ? "PATTERN RECOGNIZED" : "I SEE YOU, BUG"}
              </span>
              <span className="font-mono text-[11px] font-bold text-white uppercase tracking-widest mt-3 bg-red-600/90 px-4 py-1.5 rounded-none">
                {getCurrentAct() === 1 ? "TAP TO INTERCEPT // " : getCurrentAct() === 2 ? "EVADE ALCHEMIST // " : "KERNEL OVERWRITING // "}{systemOverride}s
              </span>
            </button>
          </div>
        )}

        <NodeStatusStrip onInspect={handleInspect} />

        {/* ── HUD SEPARATION: BOSS TOP / LOGS BOTTOM ── */}
        <div className="flex-1 relative overflow-hidden flex flex-col justify-end min-h-0 pointer-events-none">
          <div className="absolute inset-0 pointer-events-none">
            <VisualRabbits ticks={rabbitTicks} />
          </div>

          {/* The "RPG Chat Box" Constrained Terminal */}
          {/* FIX: Swapped hard percentages for flex properties and a min-height */}
          <div className="flex-[0.5] sm:flex-none sm:h-[40%] min-h-[110px] w-full relative pointer-events-auto border-t-[2px] border-zinc-800/80 bg-zinc-950/90 shadow-[0_-15px_40px_rgba(0,0,0,0.6)] flex flex-col transition-all duration-300">
            {/* A sick little hardware tab label for the log box */}
            <div className="absolute top-0 left-4 -translate-y-1/2 bg-zinc-950 px-3 py-0.5 border-[2px] border-zinc-800 text-[9px] font-mono text-cyan-500 font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(0,0,0,1)] z-20">
              Terminal_Uplink
            </div>
            <TerminalLog className={(isTraceDanger && !reducedMotion) ? 'digital-glitch' : ''} />
          </div>
        </div>

        <div className="border-t border-zinc-800/60 pt-1 pb-0.5 bg-zinc-950/60 backdrop-blur-sm shrink-0">
          <ComboDisplay />
          <FirewallRow />
          <TraceRow />
        </div>

        {status === 'hacking' && (
          <div className="bg-zinc-950/60 backdrop-blur-sm shrink-0">
            <ConsumableBar />
          </div>
        )}

        {isTutorial && tutorialStep && (
          <TutorialOverlay step={tutorialStep} />
        )}

        <div className="shrink-0 bg-zinc-950">
          <CommandBar />
        </div>

      </div>

      <BottomBorder />
    </div>
  );
}