import { useRef, useState, useEffect } from 'react';
import useGameStore from '../store/useGameStore';
import toolsConfig from '../data/toolsConfig.json';
import AudioManager from '../utils/audioManager';

// ─── CYBERDELIC COLOR PALETTE MAPPING ───
const TOOL_STYLES = {
  green: { 
    active:   'border-cyan-400/60 border-b-cyan-600/80 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-400/20 shadow-[0_0_12px_rgba(34,211,238,0.2)]',
    disabled: 'border-zinc-800 border-b-zinc-900 text-zinc-700 bg-transparent cursor-not-allowed',
  },
  blue: { 
    active:   'border-fuchsia-500/60 border-b-fuchsia-700/80 text-fuchsia-400 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 shadow-[0_0_12px_rgba(217,70,239,0.2)]',
    disabled: 'border-zinc-800 border-b-zinc-900 text-zinc-700 bg-transparent cursor-not-allowed',
  },
  amber: { 
    active:   'border-amber-400/60 border-b-amber-600/80 text-amber-300 bg-amber-500/10 hover:bg-amber-400/20 shadow-[0_0_12px_rgba(251,191,36,0.2)]',
    disabled: 'border-zinc-800 border-b-zinc-900 text-zinc-700 bg-transparent cursor-not-allowed',
  },
};

const FILL_STYLES = {
  green: 'bg-cyan-500/20 border-t-[3px] border-cyan-400 opacity-90',
  blue:  'bg-fuchsia-500/20 border-t-[3px] border-fuchsia-400 opacity-90',
  amber: 'bg-amber-500/20 border-t-[3px] border-amber-400 opacity-90',
};

function GlitchLabel({ text, isDanger }) {
  const [display, setDisplay] = useState(text);
  const glitchEnabled = useGameStore(s => s.settings?.glitchEnabled ?? true);
  const reducedMotion = useGameStore(s => s.settings?.reducedMotion ?? false);

  useEffect(() => {
    if (!isDanger || !glitchEnabled || reducedMotion) {
      setDisplay(text);
      return;
    }
    
    const chars = '01XYZ!@#$';
    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        const arr = text.split('');
        const idx = Math.floor(Math.random() * arr.length);
        arr[idx] = chars[Math.floor(Math.random() * chars.length)];
        setDisplay(arr.join(''));
      } else {
        setDisplay(text);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [text, isDanger, glitchEnabled, reducedMotion]);

  return <>{display}</>;
}

export default function CommandBar() {
  const toolState         = useGameStore(s => s.toolState);
  const executeCommand    = useGameStore(s => s.executeCommand);
  const status            = useGameStore(s => s.status);
  const transitOutcome    = useGameStore(s => s.transitOutcome);
  const settings          = useGameStore(s => s.settings); 
  const digitalTrace      = useGameStore(s => s.digitalTrace);
  const leaveNode         = useGameStore(s => s.leaveNode);
  const retrySession      = useGameStore(s => s.retrySession);
  const siphonVault       = useGameStore(s => s.siphonVault);
  const exposedTicks      = useGameStore(s => s.exposedTicks);
  const systemOverride    = useGameStore(s => s.systemOverride); 
  
  const upgrades       = useGameStore(s => s.upgrades);
  const safehouse      = useGameStore(s => s.currentSafehouse);
  const storyArchive   = useGameStore(s => s.storyArchive);

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
    const isSuccess = transitOutcome === 'success';
    return (
      <div className="relative px-4 pt-2 pb-6 flex gap-2 sm:gap-3 justify-center items-stretch min-h-[100px]">
        {isSuccess && (
          <button
            onPointerDown={(e) => { e.target.setPointerCapture(e.pointerId); startSiphon(); }}
            onPointerUp={(e) => { if (e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId); stopSiphon(); }}
            onPointerLeave={stopSiphon}
            onPointerCancel={stopSiphon}
            className={`flex-1 relative overflow-hidden py-3 border-[2px] border-b-[6px] rounded flex flex-col items-center justify-center transition-all duration-150 touch-none select-none ${
              disconnectLocked 
                ? 'bg-zinc-950 border-zinc-800 opacity-60 cursor-not-allowed grayscale' 
                : 'bg-fuchsia-950/20 border-fuchsia-700/60 active:border-b-[2px] active:translate-y-[4px] hover:bg-fuchsia-900/30 cursor-pointer shadow-[0_0_15px_rgba(217,70,239,0.2)]'
            }`}
          >
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
            <div 
              className="absolute bottom-0 left-0 w-full bg-fuchsia-500/30 border-t-2 border-fuchsia-400 transition-all ease-linear"
              style={{ height: isSiphoning ? '100%' : '0%', transitionDuration: isSiphoning ? '2000ms' : '200ms' }}
            />
            <span className="relative z-10 font-display text-[12px] sm:text-[14px] font-black uppercase tracking-[0.2em]">
              {disconnectLocked ? 'SECURING' : 'SIPHON'}
            </span>
            <span className="relative z-10 font-mono text-[8px] font-bold tracking-widest mt-1 uppercase">
              {disconnectLocked ? '// Sync' : '// Hold to Drain'}
            </span>
          </button>
        )}

        <button
          onClick={() => { if (!disconnectLocked) leaveNode(); }}
          className={`flex-1 relative overflow-hidden border-[2px] border-b-[6px] rounded flex flex-col items-center justify-center transition-all duration-300 touch-none select-none ${
            disconnectLocked 
              ? 'bg-zinc-950 border-zinc-800 opacity-60 cursor-not-allowed grayscale' 
              : 'bg-cyan-950/30 border-cyan-700/80 active:border-b-[2px] active:translate-y-[4px] hover:bg-cyan-900/50 hover:border-cyan-500 cursor-pointer'
          }`}
        >
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
          <span className="relative z-10 font-display text-[12px] sm:text-[14px] font-black uppercase tracking-[0.2em]">
            {disconnectLocked ? 'SECURING' : 'DISCONNECT'}
          </span>
          <span className="relative z-10 font-mono text-[8px] font-bold tracking-widest mt-1 uppercase">
            {disconnectLocked ? '// Sync' : '// Sever Connection'}
          </span>
        </button>

        <button
          onClick={() => { if (!disconnectLocked) retrySession(); }}
          className={`w-14 sm:w-16 shrink-0 relative overflow-hidden border-[2px] border-b-[6px] rounded flex items-center justify-center transition-all duration-300 touch-none select-none ${
            disconnectLocked 
              ? 'bg-zinc-950 border-zinc-800 opacity-60 cursor-not-allowed grayscale' 
              : 'bg-emerald-950/30 border-emerald-700/80 active:border-b-[2px] active:translate-y-[4px] hover:bg-emerald-900/50 hover:border-emerald-500 cursor-pointer'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
          </svg>
        </button>
      </div>
    );
  }

  // ─── ACTIVE HACKING UI ───
  const ramLevel = upgrades['RAM']?.level ?? 0;
  const overdriveUnlocked = storyArchive.length >= 1;

  return (
    <div className="relative px-4 py-2 grid grid-cols-2 gap-2 sm:gap-3"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
    >
      {toolsConfig.map((tool) => {
        const toolInfo = toolState[tool.id];
        let isLockedTool = false;
        if (tool.id === 'DECRYPT' && storyArchive.length < 1) isLockedTool = true;
        if (tool.id === 'SCAN'    && storyArchive.length < 2) isLockedTool = true;
        
        const cooldown   = toolInfo?.cooldownRemaining ?? 0;
        const maxCooldown = Math.max(1, Math.floor(tool.baseCooldown * (1 - ramLevel * 0.10) * (safehouse?.ramMod ?? 1)));
        
        const onCooldown = cooldown > 0;
        const isOverdriveReady = overdriveUnlocked && onCooldown && cooldown <= maxCooldown / 2 && (maxCooldown - cooldown >= 1);
        const disabled = (onCooldown && !isOverdriveReady) || isLockedTool || status !== 'hacking' || systemOverride !== null;
        
        const styles     = TOOL_STYLES[tool.color] ?? TOOL_STYLES.green;
        const activeFill = FILL_STYLES[tool.color] ?? FILL_STYLES.green;
        const isError     = errorId === tool.id;
        const fillPercent = maxCooldown > 0 ? ((maxCooldown - cooldown) / maxCooldown) * 100 : 100;

        let buttonClass = [
          'flex-1 relative overflow-hidden min-h-[60px] sm:min-h-[74px] py-1.5 sm:py-3 px-2 rounded touch-none flex flex-col items-center justify-center',
          'border-[2px] border-b-[6px] transition-all duration-150 ease-out active:duration-0 select-none',
          isError ? 'danger-shake !bg-red-950/40 !border-red-900 !text-red-500' : '',
          (tool.id === 'BYPASS' && exposedTicks > 0 && !disabled && !isOverdriveReady) 
            ? 'border-amber-400/80 border-b-amber-600 shadow-[inset_0_0_20px_rgba(251,191,36,0.25)] animate-pulse z-20' 
            : ''
        ];

        if (isLockedTool) {
          buttonClass.push('bg-zinc-950 border-zinc-900 opacity-30 grayscale cursor-not-allowed pointer-events-none');
        } else if (disabled) {
          buttonClass.push(styles.disabled);
        } else if (isOverdriveReady) {
          buttonClass.push('border-red-500/60 border-b-red-700/80 text-red-400 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.3)] glow-red animate-pulse active:border-b-[2px] active:translate-y-[4px]');
        } else {
          buttonClass.push(`${styles.active} active:border-b-[2px] active:translate-y-[4px] active:shadow-[inset_0_8px_15px_rgba(0,0,0,0.8)]`);
        }

        return (
          <button
            key={tool.id}
            onPointerDown={() => handlePointerDown(tool.id, disabled)}
            className={buttonClass.join(' ')}
          >
            <div className="relative z-10 flex flex-col items-center">
              {/* FIX: Added text-glow to the main label */}
              <span className="font-display text-[12px] sm:text-[14px] font-black uppercase tracking-[0.2em] text-glow">
                <GlitchLabel 
                  text={isLockedTool ? '---' : (isOverdriveReady ? 'OVR' : tool.id)} 
                  isDanger={digitalTrace >= 85 && (settings?.glitchEnabled ?? true)} 
                />
              </span>
              
              {!isLockedTool && (
                /* FIX: Reduced top margin (mt-0 sm:mt-1) to save vertical pixels */
                <span className="font-mono text-[9px] font-black text-zinc-100/70 uppercase tracking-wider mt-0 sm:mt-1 whitespace-nowrap bg-black/40 px-1 rounded-sm">
                  {tool.id === 'BYPASS' && '[ STRIKE CORE ]'}
                  {tool.id === 'PULSE' && '[ DROP TRACE ]'}
                  {tool.id === 'DECRYPT' && '[ CRACK ARMOR ]'}
                  {tool.id === 'SCAN' && '[ FIND WEAKNESS ]'}
                </span>
              )}

              {isLockedTool && (
                <span className="font-mono text-[6px] text-zinc-600 uppercase mt-0 sm:mt-1">
                  OFFLINE_PROTOCOL
                </span>
              )}
            </div>
            
            <div 
              className={`absolute bottom-0 left-0 w-full transition-all ease-linear z-20 overflow-hidden ${isOverdriveReady ? 'bg-red-500/20 border-t border-red-400/60' : activeFill}`}
              style={{ 
                height: `${fillPercent}%`,
                transitionDuration: cooldown === maxCooldown ? '0ms' : '1000ms',
                opacity: (cooldown > 0 && !isLockedTool) ? 1 : 0
              }} 
            />

            {onCooldown && !isLockedTool && (
              <div className="absolute top-1 right-1.5 pointer-events-none z-30">
                <span className={`text-[8px] font-bold font-mono tabular-nums ${isOverdriveReady ? 'text-red-400' : 'text-zinc-500'}`}>
                  {cooldown}s
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}