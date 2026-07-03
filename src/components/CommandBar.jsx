import { useRef, useState, useEffect } from 'react';
import useGameStore from '../store/useGameStore';
import toolsConfig from '../data/toolsConfig.json';
import AudioManager from '../utils/audioManager';
import ToolButton from './ToolButton';
import ResolvedStateButtons from './ResolvedStateButtons';

export default function CommandBar() {
  const executeCommand    = useGameStore(s => s.executeCommand);
  const status            = useGameStore(s => s.status);
  const transitOutcome    = useGameStore(s => s.transitOutcome);
  const settings          = useGameStore(s => s.settings); 
  const leaveNode         = useGameStore(s => s.leaveNode);
  const retrySession      = useGameStore(s => s.retrySession);
  const siphonVault       = useGameStore(s => s.siphonVault);
  const isTutorial     = useGameStore(s => s.isTutorial);
  const tutorialStep   = useGameStore(s => s.tutorialStep);
  const ghostOut          = useGameStore(s => s.ghostOut);
  const enterSiphonFromBreach = useGameStore(s => s.enterSiphonFromBreach);
  const pendingBreachIntel = useGameStore(s => s.pendingBreachIntel);
  const digitalTrace      = useGameStore(s => s.digitalTrace);

  const [errorId, setErrorId]     = useState(null);
  
  const siphonInterval = useRef(null);
  const [isSiphoning, setIsSiphoning] = useState(false);
  const [disconnectLocked, setDisconnectLocked] = useState(false);

  useEffect(() => {
    if (status === 'resolved') {
      const lockDelay = setTimeout(() => setDisconnectLocked(true), 0);
      const timer = setTimeout(() => setDisconnectLocked(false), 1200);
      return () => {
        clearTimeout(lockDelay);
        clearTimeout(timer);
      };
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'resolved' || transitOutcome !== 'success') {
      const timer = setTimeout(() => {
        setIsSiphoning(prev => {
          if (prev) return false;
          return prev;
        });
      }, 0);
      if (siphonInterval.current) {
        clearInterval(siphonInterval.current);
        siphonInterval.current = null;
      }
      return () => clearTimeout(timer);
    }
    return () => {
      if (siphonInterval.current) clearInterval(siphonInterval.current);
    };
  }, [status, transitOutcome]);

  const handlePointerDown = (toolId, disabled) => {
    if (disabled) {
      AudioManager.playSFX('error'); 
      if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([20, 30, 20]);
      }
      setErrorId(toolId);
      setTimeout(() => setErrorId(null), 200);
      return;
    }
    executeCommand(toolId);
  };

  const startSiphon = () => {
    if (disconnectLocked) return;
    if (siphonInterval.current) clearInterval(siphonInterval.current);
    setIsSiphoning(true);
    siphonInterval.current = setInterval(() => {
      siphonVault();
    }, 100);
  };

  const stopSiphon = () => {
    setIsSiphoning(false);
    if (siphonInterval.current) {
      clearInterval(siphonInterval.current);
      siphonInterval.current = null;
    }
  };

  // ─── BREACHED STATE — Ghost-or-Greed choice (Phase 3.2) ───
  if (status === 'breached') {
    return (
      <div className="relative px-4 pt-2 pb-6 flex gap-2 sm:gap-3 justify-center items-stretch min-h-[100px]">
        <button
          onClick={() => ghostOut()}
          className="flex-1 relative overflow-hidden border-[2px] border-b-[6px] rounded flex flex-col items-center justify-center transition-all duration-150 bg-cyan-950/30 border-cyan-700/80 active:border-b-[2px] active:translate-y-[4px] hover:bg-cyan-900/50 hover:border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
        >
          <div className="absolute inset-0 noise-bg opacity-10 pointer-events-none" />
          <span className="relative z-10 font-display text-[12px] sm:text-[14px] font-black uppercase tracking-[0.2em] text-cyan-300">
            GHOST OUT
          </span>
          <span className="relative z-10 font-mono text-xs font-bold tracking-widest mt-1 uppercase text-cyan-400/80">
            Bank {pendingBreachIntel} IF
          </span>
        </button>

        <button
          onClick={() => { enterSiphonFromBreach(); startSiphon(); }}
          className="flex-1 relative overflow-hidden border-[2px] border-b-[6px] rounded flex flex-col items-center justify-center transition-all duration-150 bg-fuchsia-950/20 border-fuchsia-700/60 active:border-b-[2px] active:translate-y-[4px] hover:bg-fuchsia-900/30 shadow-[0_0_15px_rgba(217,70,239,0.2)]"
        >
          <div className="absolute inset-0 noise-bg opacity-10 pointer-events-none" />
          <span className="relative z-10 font-display text-[12px] sm:text-[14px] font-black uppercase tracking-[0.2em] text-fuchsia-300">
            SIPHON THE VAULT
          </span>
          <span className="relative z-10 font-mono text-xs font-bold tracking-widest mt-1 uppercase text-fuchsia-400/80">
            Risk it — trace at {Math.ceil(digitalTrace)}%
          </span>
        </button>
      </div>
    );
  }

  // ─── RESOLVED STATE UI (Win/Loss) ───
  if (status === 'resolved') {
    return (
      <ResolvedStateButtons
        transitOutcome={transitOutcome}
        isTutorial={isTutorial}
        tutorialStep={tutorialStep}
        disconnectLocked={disconnectLocked}
        startSiphon={startSiphon}
        stopSiphon={stopSiphon}
        isSiphoning={isSiphoning}
        leaveNode={leaveNode}
        retrySession={retrySession}
      />
    );
  }

  // ─── ACTIVE HACKING UI ───
  return (
    <div className="relative px-4 py-2 grid grid-cols-2 gap-2 sm:gap-3">
      {toolsConfig.map((tool) => (
        <ToolButton
          key={tool.id}
          tool={tool}
          errorId={errorId}
          handlePointerDown={handlePointerDown}
        />
      ))}
    </div>
  );
}