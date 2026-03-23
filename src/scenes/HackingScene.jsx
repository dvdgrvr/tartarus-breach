import { useState, useEffect, useRef, useMemo } from 'react';
import { TopBorder, BottomBorder } from '../components/PeripheralBorder';
import TerminalLog from '../components/TerminalLog';
import CommandBar from '../components/CommandBar';
import useGameStore from '../store/useGameStore';
import AudioManager from '../utils/audioManager';
import ArcadeResults from '../components/ArcadeResults';

import { MENACING_SKULL_FACE } from '../components/hacking/hackingConstants';
import KernelDiagnostic from '../components/hacking/KernelDiagnostic';
import KernelPanicOverlay from '../components/hacking/KernelPanicOverlay';
import TutorialOverlay from '../components/hacking/TutorialOverlay';
import NodeStatusStrip from '../components/hacking/NodeStatusStrip';
import FirewallRow from '../components/hacking/FirewallRow';
import TraceRow from '../components/hacking/TraceRow';
import ConsumableBar from '../components/hacking/ConsumableBar';
import VisualRabbits from '../components/hacking/VisualRabbits';
import BossCore from '../components/hacking/BossCore';
import MashaCodec from '../components/hacking/MashaCodec';
import ComboDisplay from '../components/hacking/ComboDisplay';

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

  const firewallHealth = useGameStore(s => s.firewallHealth);
  const activeDaemon   = useGameStore(s => s.activeDaemon); 
  const rabbitTicks    = useGameStore(s => s.rabbitTicks);

  const gameMode               = useGameStore(s => s.gameMode);
  const arcadeStats            = useGameStore(s => s.arcadeStats);
  const tickArcadeTimer        = useGameStore(s => s.tickArcadeTimer);
  const startArcadeMode        = useGameStore(s => s.startArcadeMode);
  const setStatus              = useGameStore(s => s.setStatus);

  const isTutorial             = useGameStore(s => s.isTutorial);
  const rawLog                 = useGameStore(s => s.terminalLog);
  const tutorialStep           = useGameStore(s => s.tutorialStep);

  const parsedLog = useMemo(() =>
    (rawLog || []).map(entry => typeof entry === 'string' ? entry : (entry?.text || '')),
  [rawLog]);

  const [daemonFlash, setDaemonFlash] = useState(false);
  
  const prevDaemon = useRef(activeDaemon);

  const hapticsEnabled = useGameStore(s => s.settings?.hapticsEnabled);


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
          parsedLog={parsedLog}
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
      <MashaCodec parsedLog={parsedLog} />

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
            <div className={`font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-2 ${labelCls}`}>
              <span>SCORE:</span>
              <span className={isFrenzy ? 'animate-pulse text-glow' : ''}>{arcadeStats.score}</span>
              {mult > 1 && (
                <span className={`text-xs px-1.5 py-0.5 rounded border ${isFrenzy ? 'text-fuchsia-300 border-fuchsia-500/60 bg-fuchsia-500/10 animate-pulse text-glow' : 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10'}`}>
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

      <div className="flex-1 flex flex-col overflow-hidden relative z-10 min-h-0">
        
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
              <span className="font-mono text-xs font-black text-black uppercase tracking-widest">
                SYS_DIALOG.exe
              </span>
              <button 
                onClick={handleDismissPopup}
                className="font-mono text-xs text-black font-bold hover:bg-black/20 px-1"
              >
                [X]
              </button>
            </div>
            
            <div className="p-5 flex flex-col items-center text-center relative overflow-hidden">
              <h2 className={`font-mono text-xl font-black uppercase tracking-widest mb-1 ${popupConfig.titleColor} ${isBusted ? 'animate-pulse' : ''}`}>
                {popupConfig.title}
              </h2>
              
              <p className="font-mono text-xs text-zinc-300 uppercase tracking-widest mb-1 relative z-10">
                {popupConfig.sub}
              </p>
              
              <p className={`font-mono text-sm font-bold uppercase tracking-widest mt-2 relative z-10 ${popupConfig.titleColor}`}>
                {popupConfig.intel}
              </p>
              
              <div className="mt-5 pt-3 border-t border-dashed border-zinc-800 w-full relative z-10 flex flex-col items-center gap-2">
                <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">
                  -- AWAITING MANUAL OVERRIDE --
                </span>
                
                {transitOutcome === 'success' ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono text-xs font-black text-fuchsia-400 uppercase tracking-[0.15em] animate-pulse">
                      {useGameStore.getState().currentJobType === 'tartarus' 
                        ? "HOLD [UPLOAD] TO INJECT SKELETON KEY" 
                        : "HOLD [SIPHON] TO DRAIN VAULT"}
                    </span>
                    <span className="font-mono text-xs font-bold text-cyan-500/80 uppercase tracking-widest">
                      {useGameStore.getState().currentJobType === 'tartarus' 
                        ? "OR [DISCONNECT] TO ABORT MISSION" 
                        : "OR [DISCONNECT] TO SECURE"}
                    </span>
                  </div>
                ) : (
                  <span className="font-mono text-xs font-bold text-cyan-400/90 uppercase tracking-widest">
                    SELECT [DISCONNECT] TO SEVER UPLINK
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {systemOverride !== null && (
          <div className="absolute inset-x-4 top-[15%] bottom-[20%] z-50 flex flex-col justify-center relative overflow-hidden">
            
            <pre className="absolute inset-0 flex items-center justify-center font-mono text-xs sm:text-xs leading-tight text-red-500/20 animate-skull pointer-events-none select-none z-0">
              {MENACING_SKULL_FACE}
            </pre>

            <button
              onPointerDown={(e) => { e.preventDefault(); resolveOverride(); }}
              className="relative z-10 w-full py-8 bg-red-950/80 backdrop-blur-md border-2 border-red-500 border-b-[8px] active:border-b-2 active:translate-y-1.5 rounded-none shadow-[6px_6px_0px_0px_rgba(239,68,68,0.4)] flex flex-col items-center justify-center danger-shake"
            >
              <span className="font-mono text-xl font-black text-red-500 uppercase tracking-[0.2em] animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                {getCurrentAct() === 1 ? "SYSTEM OVERRIDE" : getCurrentAct() === 2 ? "PATTERN RECOGNIZED" : "I SEE YOU, BUG"}
              </span>
              <span className="font-mono text-xs font-bold text-white uppercase tracking-widest mt-3 bg-red-600/90 px-4 py-1.5 rounded-none">
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
          <div className="flex-[0.5] sm:flex-none sm:h-[40%] min-h-[70px] w-full relative pointer-events-auto border-t-[2px] border-zinc-800/80 bg-zinc-950/90 shadow-[0_-15px_40px_rgba(0,0,0,0.6)] flex flex-col transition-all duration-300">
            {/* A sick little hardware tab label for the log box */}
            <div className="absolute top-0 left-4 -translate-y-1/2 bg-zinc-950 px-3 py-0.5 border-[2px] border-zinc-800 text-xs font-mono text-cyan-500 font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(0,0,0,1)] z-20">
              Terminal_Uplink
            </div>
            <TerminalLog className={(isTraceDanger && !reducedMotion) ? 'digital-glitch' : ''} />
          </div>
        </div>

        <div className="border-t border-zinc-800/60 pt-1 pb-0.5 bg-zinc-950/60 backdrop-blur-sm shrink-0">
          <ComboDisplay />
          <FirewallRow parsedLog={parsedLog} />
          <TraceRow parsedLog={parsedLog} />
        </div>

        {isTutorial && tutorialStep && (
          <TutorialOverlay step={tutorialStep} />
        )}

        <div className="shrink-0 bg-zinc-950">
          <CommandBar />
        </div>

        {status === 'hacking' && (
          <div className="bg-zinc-950/60 backdrop-blur-sm shrink-0">
            <ConsumableBar />
          </div>
        )}

      </div>

      <BottomBorder />
    </div>
  );
}
