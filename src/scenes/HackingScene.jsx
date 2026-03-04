import { useState, useEffect, useRef } from 'react';
import { TopBorder, BottomBorder } from '../components/PeripheralBorder';
import TerminalLog from '../components/TerminalLog';
import CommandBar from '../components/CommandBar';
import useGameStore from '../store/useGameStore';
import AudioManager from '../utils/audioManager';

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
  const activeDaemon     = useGameStore(s => s.activeDaemon);
  const exposedTicks     = useGameStore(s => s.exposedTicks);
  const rabbitTicks      = useGameStore(s => s.rabbitTicks);
  const ghostTicks       = useGameStore(s => s.ghostTicks);

  if (!node) return null;

  const badge = node.specialDefense ? DEFENSE_BADGE[node.specialDefense] : null;
  const showDecryptedBadge = badge && node.specialDefense === 'ENCRYPTED_LOGS' && firewallRevealed;

  const isHeatWarning  = heat >= 50;
  const isHeatCritical = heat >= 80;

  const traitColor = SAFEHOUSE_TRAIT_COLOR[safehouse?.color] ?? SAFEHOUSE_TRAIT_COLOR.cyan;
  const showTrait  = safehouse?.trait && safehouse.trait !== 'Standard';

  return (
    <div className="px-4 py-1.5 border-b border-zinc-800/50 flex items-center justify-between gap-2 bg-zinc-900/40">
      <span className="font-mono text-[11px] font-bold text-zinc-400 uppercase tracking-widest truncate">
        // {node.name}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        {rabbitTicks > 0 && (
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border text-green-400 border-green-500/50 bg-green-500/10 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]">
            RABBIT.exe
          </span>
        )}
        
        {ghostTicks > 0 && (
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border text-slate-300 border-slate-400/50 bg-slate-400/10 animate-pulse shadow-[0_0_8px_rgba(148,163,184,0.5)]">
            GHOST.sys
          </span>
        )}

        {activeDaemon && (
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border text-red-500 border-red-500/50 bg-red-500/10 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]">
            ! {activeDaemon} !
          </span>
        )}
        
        {exposedTicks > 0 && (
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border text-amber-300 border-amber-400/50 bg-amber-400/10 shadow-[0_0_8px_rgba(251,191,36,0.5)]">
            EXPOSED
          </span>
        )}

        {showTrait && (
          <span className={`font-mono text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${traitColor}`} title={safehouse.desc}>
            {safehouse.trait}
          </span>
        )}

        {isHeatWarning && (
          <span className={`font-mono text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${isHeatCritical ? 'text-red-400 bg-red-500/10 animate-pulse' : 'text-orange-400 bg-orange-500/10'}`}>
            HEAT: {heat.toFixed(0)}%
          </span>
        )}

        {badge && (
          <span className={`font-mono text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${showDecryptedBadge ? 'text-green-400 border-green-500/30 bg-green-500/10' : badge.color}`}>
            {showDecryptedBadge ? 'DECRYPTED' : badge.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── JUICE FIX #1: THE FIREWALL IMPACT ────────────────────────────────────────

function FirewallRow() {
  const firewallHealth   = useGameStore(s => s.firewallHealth);
  const node             = useGameStore(s => s.currentNode);
  const firewallRevealed = useGameStore(s => s.firewallRevealed);

  const [isHit, setIsHit] = useState(false);
  const prevHP = useRef(firewallHealth);

  // Watch for drops in Firewall HP to trigger the shatter effect
  useEffect(() => {
    if (firewallHealth < prevHP.current) {
      setIsHit(true);
      const timer = setTimeout(() => setIsHit(false), 150); // Flash for 150ms
      prevHP.current = firewallHealth;
      return () => clearTimeout(timer);
    }
    prevHP.current = firewallHealth;
  }, [firewallHealth]);

  const isHidden = node?.specialDefense === 'ENCRYPTED_LOGS' && !firewallRevealed;
  const maxHP    = node?.firewallHP ?? 100;
  
  const totalBlocks = 10;
  const hpPercentage = Math.max(0, firewallHealth / maxHP);
  const activeBlocks = Math.ceil(hpPercentage * totalBlocks);

  return (
    <div className={`flex items-center gap-4 px-4 py-1.5 transition-colors duration-150 ${isHit ? 'bg-white/5' : ''}`}>
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
                    ? isHit
                      ? 'fw-block-hit' // The CSS white shatter effect
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
  );
}

function TraceRow() {
  const trace         = useGameStore(s => s.digitalTrace);
  const node          = useGameStore(s => s.currentNode);
  const pulseActive   = useGameStore(s => s.pulseActive);
  const settings      = useGameStore(s => s.settings);
  const log           = useGameStore(s => s.terminalLog); // <-- Added to listen for the sync

  const [syncFlash, setSyncFlash] = useState(false);

  // Watch the terminal log for the Perfect Sync text
  useEffect(() => {
    if (log.length > 0 && log[log.length - 1].includes('PERFECT SYNC')) {
      setSyncFlash(true);
      const timer = setTimeout(() => setSyncFlash(false), 600); // matches CSS duration
      return () => clearTimeout(timer);
    }
  }, [log]);
  
  const shakeEnabled  = settings?.shakeEnabled ?? true;
  const glitchEnabled = settings?.glitchEnabled ?? true;
  
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
        : 'text-zinc-400';

  const barGradient = isDanger
    ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'
    : isWarning
      ? 'bg-gradient-to-r from-orange-600 to-orange-400'
      : pulseActive
        ? 'bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
        : 'bg-gradient-to-r from-blue-700 to-blue-500';

  return (
    <div className={`flex items-center gap-4 px-4 py-1.5 ${isDanger && shakeEnabled ? 'danger-shake' : ''}`}>
      <span className={`font-mono text-[11px] uppercase tracking-widest w-12 shrink-0 font-bold ${labelColor} ${(isDanger || pulseActive) && glitchEnabled ? 'animate-pulse' : ''}`}>
        {isDanger ? '[!]TR' : pulseActive ? 'SYNC' : isAccelerated ? 'TR x2' : 'TRACE'}
      </span>

      <div className={`flex-1 h-2.5 bg-black rounded-full overflow-hidden border shadow-inner relative transition-all duration-150 ${
        syncFlash ? 'animate-sync-pulse z-10' : pulseActive ? 'border-cyan-500/60 shadow-[0_0_6px_rgba(34,211,238,0.3)]' : 'border-zinc-800'
      }`}>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
        <div
          className={`h-full rounded-full transition-all duration-300 ${barGradient} ${isAccelerated && !isDanger && !pulseActive && glitchEnabled ? 'opacity-80 animate-pulse' : ''}`}
          style={{ width: `${Math.min(100, trace)}%` }}
        />
      </div>

      <span className={`font-mono text-[11px] tabular-nums w-8 text-right font-bold shrink-0 ${labelColor}`}>
        {trace.toFixed(0)}%
      </span>
    </div>
  );
}

function ConsumableBar() {
  const consumables    = useGameStore(s => s.consumables);
  const useConsumable  = useGameStore(s => s.useConsumable);
  const hasBeatenGame  = useGameStore(s => s.hasBeatenGame);
  const getCurrentAct  = useGameStore(s => s.getCurrentAct);
  
  const rabbit = consumables?.rabbit ?? 0;
  const ghost  = consumables?.ghost ?? 0;

  const showBar = hasBeatenGame || getCurrentAct() >= 2 || rabbit > 0 || ghost > 0;
  if (!showBar) return null;

  return (
    <div className="flex gap-2 px-4 py-2 border-t border-zinc-800/40 pb-3">
      <button
        onClick={() => useConsumable('rabbit')}
        disabled={rabbit === 0}
        className={[
          'flex-1 py-3 px-4 rounded font-mono text-[11px] font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] active:border-b active:translate-y-[2px]',
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
          'flex-1 py-3 px-4 rounded font-mono text-[11px] font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] active:border-b active:translate-y-[2px]',
          ghost > 0
            ? 'border-slate-400/60 border-b-slate-600 text-slate-300 bg-slate-500/5 hover:bg-slate-500/15 glow-slate'
            : 'border-zinc-800 border-b-zinc-900 text-zinc-600 bg-zinc-900/50 cursor-not-allowed',
        ].join(' ')}
      >
        GHOST.sys [×{ghost}]
      </button>
    </div>
  );
}

// ─── JUICE FIX #2: DAEMON ALERTS & CRITICAL SCREEN TEAR ──────────────────────

export default function HackingScene() {
  const trace = useGameStore(s => s.digitalTrace);
  const heat  = useGameStore(s => s.physicalHeat);
  
  const status             = useGameStore(s => s.status);
  const transitOutcome     = useGameStore(s => s.transitOutcome);
  const isPerfectBreach    = useGameStore(s => s.isPerfectBreach);
  const reducedMotion      = useGameStore(s => s.settings?.reducedMotion);
  const sessionIntelEarned = useGameStore(s => s.sessionIntelEarned);
  const settings           = useGameStore(s => s.settings);

  const systemOverride  = useGameStore(s => s.systemOverride);
  const resolveOverride = useGameStore(s => s.resolveOverride);
  const getCurrentAct   = useGameStore(s => s.getCurrentAct);

  // Critical Tear Logic
  const exposedTicks   = useGameStore(s => s.exposedTicks);
  const firewallHealth = useGameStore(s => s.firewallHealth);
  const activeDaemon   = useGameStore(s => s.activeDaemon); // <-- Added
  
  const [isCritical, setIsCritical] = useState(false);
  const [daemonFlash, setDaemonFlash] = useState(false); // <-- Added
  
  const prevExposed = useRef(exposedTicks);
  const prevFW = useRef(firewallHealth);
  const prevDaemon = useRef(activeDaemon);

  useEffect(() => {
    if (prevExposed.current > 0 && exposedTicks === 0 && firewallHealth < prevFW.current) {
      setIsCritical(true);
      const timer = setTimeout(() => setIsCritical(false), 350); 
      prevExposed.current = exposedTicks;
      prevFW.current = firewallHealth;
      return () => clearTimeout(timer);
    }
    prevExposed.current = exposedTicks;
    prevFW.current = firewallHealth;
  }, [exposedTicks, firewallHealth]);

  // Watch for Daemons injecting into the node
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

  const handleDismissPopup = () => {
    AudioManager.playSFX('thock');
    if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    setPopupDismissed(true);
  };

  const isTraceDanger = trace >= 80 && (settings?.glitchEnabled ?? true);
  const isHeatDanger  = heat  >= 80;

  const isWin = status === 'resolved' && transitOutcome === 'success';
  const breachTearClass = isWin
    ? isPerfectBreach
      ? "contrast-[1.15] saturate-150 brightness-90 transition-all duration-500"
      : "contrast-[1.15] saturate-150 hue-rotate-[15deg] brightness-90 transition-all duration-500"
    : "transition-all duration-300 ease-in";

  const activeTearClass = isCritical && !reducedMotion ? "animate-critical" : breachTearClass;

  let popupConfig = null;
  if (status === 'resolved') {
    if (transitOutcome === 'success') {
      popupConfig = {
        title: 'ACCESS GRANTED',
        sub: isPerfectBreach ? 'PERFECT BREACH EXECUTION' : 'NODE FIREWALL BYPASSED',
        intel: `PAYLOAD SECURED: +${sessionIntelEarned} IF`,
        border: 'border-green-500/60',
        headerBg: 'bg-green-500/20',
        titleColor: 'text-green-400',
        shadow: 'shadow-[0_0_40px_rgba(34,197,94,0.15)]'
      };
    } else if (transitOutcome === 'escaped') {
      popupConfig = {
        title: 'TACTICAL RETREAT',
        sub: 'CONNECTION CLOSED SAFELY',
        intel: `SALVAGED: +${sessionIntelEarned} IF`,
        border: 'border-amber-500/60',
        headerBg: 'bg-amber-500/20',
        titleColor: 'text-amber-400',
        shadow: 'shadow-[0_0_40px_rgba(245,158,11,0.15)]'
      };
    } else {
      popupConfig = {
        title: 'ACCESS DENIED',
        sub: transitOutcome === 'trace_busted' ? 'TRACE CRITICAL' : 'SAFEHOUSE RAIDED',
        intel: 'INTEL WIPED : 0 IF',
        border: 'border-red-500/60',
        headerBg: 'bg-red-500/20',
        titleColor: 'text-red-500',
        shadow: 'shadow-[0_0_40px_rgba(239,68,68,0.2)]'
      };
    }
  }

  return (
    <div className={`flex flex-col h-full bg-zinc-950 relative ${activeTearClass}`}>
      {/* Dynamic Environmental Overlays */}
      {(isHeatDanger && !reducedMotion) && <div className="siren-vignette" />}
      
      {/* THE DAEMON FLASH OVERLAY */}
      {daemonFlash && !reducedMotion && (
        <div className="absolute inset-0 bg-red-600/30 mix-blend-overlay pointer-events-none z-40 animate-pulse" />
      )}

      <TopBorder />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        
        {status === 'resolved' && popupConfig && !popupDismissed && (
          <div className={`absolute top-[40%] left-6 right-6 -translate-y-1/2 z-50 bg-zinc-950 border ${popupConfig.border} ${popupConfig.shadow} flex flex-col shadow-2xl`}>
            <div className={`px-3 py-1.5 flex justify-between items-center ${popupConfig.headerBg} border-b ${popupConfig.border}`}>
              <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                SYS_DIALOG.exe
              </span>
              <button 
                onClick={handleDismissPopup}
                className="w-6 h-6 flex items-center justify-center hover:bg-black/20 rounded transition-colors"
              >
                <div className={`w-3 h-3 border ${popupConfig.border} flex items-center justify-center`}>
                  <span className={`text-[8px] font-bold leading-none ${popupConfig.titleColor}`}>x</span>
                </div>
              </button>
            </div>
            
            <div className="p-5 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
              
              <h2 className={`font-mono text-xl font-black uppercase tracking-widest mb-1 drop-shadow-md ${popupConfig.titleColor}`}>
                {popupConfig.title}
              </h2>
              
              <p className="font-mono text-[11px] text-zinc-300 uppercase tracking-widest mb-1 relative z-10">
                {popupConfig.sub}
              </p>
              
              <p className={`font-mono text-sm font-bold uppercase tracking-widest relative z-10 ${popupConfig.titleColor}`}>
                {popupConfig.intel}
              </p>
              
              <div className="mt-5 pt-4 border-t border-zinc-800/80 w-full relative z-10 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 opacity-90">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  <span className="font-mono text-[11px] font-bold text-zinc-300 uppercase tracking-widest">
                    CLOSE [X] TO REVIEW LOGS
                  </span>
                </div>
                
                {transitOutcome === 'success' ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono text-[11px] font-black text-fuchsia-400 uppercase tracking-[0.15em] animate-pulse">
                      {useGameStore.getState().currentJobType === 'tartarus' 
                        ? "HOLD [UPLOAD] TO INJECT SKELETON KEY" 
                        : "HOLD [SIPHON] TO DRAIN VAULT"}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-cyan-400/90 uppercase tracking-widest">
                      {useGameStore.getState().currentJobType === 'tartarus' 
                        ? "OR [DISCONNECT] TO ABORT MISSION" 
                        : "OR [DISCONNECT] TO SECURE"}
                    </span>
                  </div>
                ) : (
                  <span className="font-mono text-[11px] font-bold text-cyan-400/90 uppercase tracking-widest">
                    OR SELECT [DISCONNECT] TO EXIT
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {systemOverride !== null && (
          <div className="absolute inset-x-6 top-[20%] z-50 flex flex-col">
            <button
              onPointerDown={(e) => { e.preventDefault(); resolveOverride(); }}
              className="w-full py-6 bg-red-950/95 backdrop-blur-md border-2 border-red-500 border-b-[6px] active:border-b-2 active:translate-y-1 rounded-lg shadow-[0_0_40px_rgba(239,68,68,0.6)] flex flex-col items-center justify-center danger-shake"
            >
              <span className="font-mono text-xl font-black text-red-500 uppercase tracking-[0.2em] animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                {getCurrentAct() === 1 ? "SYSTEM OVERRIDE" : 
                 getCurrentAct() === 2 ? "PATTERN RECOGNIZED" : 
                 "I SEE YOU, BUG"}
              </span>
              <span className="font-mono text-[11px] font-bold text-white uppercase tracking-widest mt-2 bg-red-600/90 px-3 py-1 rounded">
                {getCurrentAct() === 1 ? "TAP TO INTERCEPT // " : 
                 getCurrentAct() === 2 ? "EVADE ALCHEMIST // " : 
                 "KERNEL OVERWRITING // "}{systemOverride}s
              </span>
            </button>
          </div>
        )}

        <NodeStatusStrip />

        <TerminalLog className={(isTraceDanger && !reducedMotion) ? 'digital-glitch' : ''} />

        <div className="border-t border-zinc-800/60 pt-1 pb-0.5">
          <FirewallRow />
          <TraceRow />
        </div>

        <ConsumableBar />

        <CommandBar />
      </div>

      <BottomBorder />
    </div>
  );
}