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

  const [errorId, setErrorId]     = useState(null);
  
  const siphonInterval = useRef(null);
  const [isSiphoning, setIsSiphoning] = useState(false);
  const [disconnectLocked, setDisconnectLocked] = useState(false);

  useEffect(() => {
    if (status === 'resolved') {
      setDisconnectLocked(true);
      const timer = setTimeout(() => setDisconnectLocked(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'resolved' || transitOutcome !== 'success') {
      setIsSiphoning(false);
      if (siphonInterval.current) clearInterval(siphonInterval.current);
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