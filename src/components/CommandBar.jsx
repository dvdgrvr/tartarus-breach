import { useRef, useState, useEffect } from 'react';
import useGameStore from '../store/useGameStore';
import toolsConfig from '../data/toolsConfig.json';
import AudioManager from '../utils/audioManager';

// ─── CYBERDELIC COLOR PALETTE MAPPING ───
const TOOL_STYLES = {
  green: { // Mapped to Crash Override Cyan
    active:   'border-cyan-400/60 border-b-cyan-600/80 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-400/20 shadow-[0_0_12px_rgba(34,211,238,0.2)]',
    disabled: 'border-zinc-800 border-b-zinc-900 text-zinc-700 bg-transparent cursor-not-allowed',
  },
  blue: { // Mapped to Acid Burn Magenta
    active:   'border-fuchsia-500/60 border-b-fuchsia-700/80 text-fuchsia-400 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 shadow-[0_0_12px_rgba(217,70,239,0.2)]',
    disabled: 'border-zinc-800 border-b-zinc-900 text-zinc-700 bg-transparent cursor-not-allowed',
  },
  amber: { // Mapped to Phreak Amber
    active:   'border-amber-400/60 border-b-amber-600/80 text-amber-300 bg-amber-500/10 hover:bg-amber-400/20 shadow-[0_0_12px_rgba(251,191,36,0.2)]',
    disabled: 'border-zinc-800 border-b-zinc-900 text-zinc-700 bg-transparent cursor-not-allowed',
  },
};

const FILL_STYLES = {
  green: 'bg-[url("/noise.png")] bg-cyan-500/20 border-t-2 border-cyan-400/80 opacity-90',
  blue:  'bg-[url("/noise.png")] bg-fuchsia-500/20 border-t-2 border-fuchsia-400/80 opacity-90',
  amber: 'bg-[url("/noise.png")] bg-amber-500/20 border-t-2 border-amber-400/80 opacity-90',
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
  const toolState        = useGameStore(s => s.toolState);
  const executeCommand   = useGameStore(s => s.executeCommand);
  const status           = useGameStore(s => s.status);
  const transitOutcome   = useGameStore(s => s.transitOutcome);
  const settings         = useGameStore(s => s.settings); 
  const digitalTrace     = useGameStore(s => s.digitalTrace);
  const leaveNode        = useGameStore(s => s.leaveNode);
  const retrySession     = useGameStore(s => s.retrySession);
  const siphonVault      = useGameStore(s => s.siphonVault);
  const exposedTicks     = useGameStore(s => s.exposedTicks);
  const systemOverride   = useGameStore(s => s.systemOverride); // Re-added this for the popup block!
  
  const upgrades       = useGameStore(s => s.upgrades);
  const safehouse      = useGameStore(s => s.currentSafehouse);

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
  }, [status, transitOutcome]);

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

  if (status === 'resolved') {
    if (transitOutcome === 'success') {
      return (
        <div className="relative px-4 pt-2 pb-6 flex gap-2 sm:gap-3 justify-center items-stretch min-h-[100px]">
          {/* SIPHON BUTTON */}
          <button
            onPointerDown={(e) => {
              e.target.setPointerCapture(e.pointerId);
              startSiphon();
            }}
            onPointerUp={(e) => {
              if (e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId);
              stopSiphon();
            }}
            onPointerLeave={stopSiphon}
            onPointerCancel={stopSiphon}
            onContextMenu={(e) => { e.preventDefault(); stopSiphon(); }}
            onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); startSiphon(); }}
            onTouchEnd={(e) => { if (e.cancelable) e.preventDefault(); stopSiphon(); }}
            onTouchCancel={stopSiphon}
            className={`flex-1 relative overflow-hidden group py-3 border-[2px] border-b-[6px] rounded flex flex-col items-center justify-center transition-all duration-150 touch-none select-none ${
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
            <span className={`relative z-10 font-display text-[12px] sm:text-[14px] font-black uppercase tracking-[0.2em] transition-colors ${
              disconnectLocked ? 'text-zinc-600' : 'text-fuchsia-400 group-hover:text-fuchsia-300 drop-shadow-[0_0_8px_rgba(217,70,239,0.4)]'
            }`}>
              {disconnectLocked ? 'SECURING' : 'SIPHON'}
            </span>
            <span className={`relative z-10 font-mono text-[8px] font-bold tracking-widest mt-1 uppercase transition-colors ${
              disconnectLocked ? 'text-zinc-700' : 'text-fuchsia-600 group-hover:text-fuchsia-400'
            }`}>
              {disconnectLocked ? '// Sync' : '// Hold to Drain'}
            </span>
          </button>

          {/* DISCONNECT BUTTON */}
          <button
            onClick={() => {
              if (disconnectLocked) return;
              AudioManager.playSFX('thock');
              if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 20, 10]);
              leaveNode();
            }}
            className={`flex-1 relative overflow-hidden group border-[2px] border-b-[6px] rounded flex flex-col items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.2)] touch-none select-none ${
              disconnectLocked 
                ? 'bg-zinc-950 border-zinc-800 opacity-60 cursor-not-allowed grayscale' 
                : 'bg-cyan-950/30 border-cyan-700/80 active:border-b-[2px] active:translate-y-[4px] hover:bg-cyan-900/50 hover:border-cyan-500 cursor-pointer'
            }`}
          >
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            
            <span className={`relative z-10 font-display text-[12px] sm:text-[14px] font-black uppercase tracking-[0.2em] transition-colors ${
              disconnectLocked ? 'text-zinc-600' : 'text-cyan-400 group-hover:text-white drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]'
            }`}>
              {disconnectLocked ? 'SECURING' : 'DISCONNECT'}
            </span>
            <span className={`relative z-10 font-mono text-[8px] font-bold tracking-widest mt-1 uppercase transition-colors ${
              disconnectLocked ? 'text-zinc-700' : 'text-cyan-600 group-hover:text-cyan-400'
            }`}>
              {disconnectLocked ? '// Sync' : '// Sever Connection'}
            </span>
          </button>

          {/* REPLAY BUTTON */}
          <button
            onClick={() => {
              if (disconnectLocked) return;
              AudioManager.playSFX('thock');
              retrySession();
            }}
            title="Replay Mission"
            className={`w-14 sm:w-16 shrink-0 relative overflow-hidden group border-[2px] border-b-[6px] rounded flex items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(52,211,153,0.2)] touch-none select-none ${
              disconnectLocked 
                ? 'bg-zinc-950 border-zinc-800 opacity-60 cursor-not-allowed grayscale' 
                : 'bg-emerald-950/30 border-emerald-700/80 active:border-b-[2px] active:translate-y-[4px] hover:bg-emerald-900/50 hover:border-emerald-500 cursor-pointer'
            }`}
          >
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`relative z-10 transition-colors ${disconnectLocked ? 'text-zinc-600' : 'text-emerald-400 group-hover:text-white drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]'}`}>
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>
      );
    }

    // FAILURE STATE
    return (
      <div className="relative px-4 pt-2 pb-6 flex gap-2 sm:gap-3 justify-center items-stretch min-h-[100px]">
        {/* DISCONNECT BUTTON */}
        <button
          onClick={() => {
            if (disconnectLocked) return;
            AudioManager.playSFX('thock');
            if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 20, 10]);
            leaveNode();
          }}
          className={`flex-1 relative overflow-hidden group border-[2px] border-b-[6px] rounded flex flex-col items-center justify-center transition-all duration-300 shadow-xl touch-none select-none ${
            disconnectLocked 
              ? 'bg-zinc-950 border-zinc-800 opacity-60 cursor-not-allowed grayscale' 
              : 'bg-cyan-950/30 border-cyan-700/80 active:border-b-[2px] active:translate-y-[4px] hover:bg-cyan-900/50 hover:border-cyan-500 cursor-pointer'
          }`}
        >
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          
          <span className={`relative z-10 font-display text-lg font-black uppercase tracking-[0.3em] transition-colors ${
            disconnectLocked ? 'text-zinc-600' : 'text-cyan-400 group-hover:text-white drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]'
          }`}>
            {disconnectLocked ? 'SECURING' : 'DISCONNECT'}
          </span>
          <span className={`relative z-10 font-mono text-[10px] font-bold tracking-widest mt-1.5 uppercase transition-colors ${
            disconnectLocked ? 'text-zinc-700' : 'text-cyan-600 group-hover:text-cyan-400'
          }`}>
            {disconnectLocked ? '// Awaiting_Sync' : '// Sever_Uplink'}
          </span>
        </button>

        {/* REPLAY BUTTON */}
        <button
          onClick={() => {
            if (disconnectLocked) return;
            AudioManager.playSFX('thock');
            retrySession();
          }}
          title="Replay Mission"
          className={`w-16 sm:w-20 shrink-0 relative overflow-hidden group border-[2px] border-b-[6px] rounded flex items-center justify-center transition-all duration-300 shadow-xl touch-none select-none ${
            disconnectLocked 
              ? 'bg-zinc-950 border-zinc-800 opacity-60 cursor-not-allowed grayscale' 
              : 'bg-emerald-950/30 border-emerald-700/80 active:border-b-[2px] active:translate-y-[4px] hover:bg-emerald-900/50 hover:border-emerald-500 cursor-pointer'
          }`}
        >
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`relative z-10 transition-colors ${disconnectLocked ? 'text-zinc-600' : 'text-emerald-400 group-hover:text-white drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]'}`}>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
      </div>
    );
  }

  const ramLevel = upgrades['RAM']?.level ?? 0;

  return (
    <div className="relative px-4 py-2 grid grid-cols-2 gap-2 sm:gap-3"
  style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
    >
      {toolsConfig.map((tool) => {
        const cooldown   = toolState[tool.id]?.cooldownRemaining ?? 0;
        const maxCooldown = Math.max(1, Math.floor(tool.baseCooldown * (1 - ramLevel * 0.10) * (safehouse?.ramMod ?? 1)));
        
        const onCooldown = cooldown > 0;
        
        // --- OVERDRIVE LOGIC ---
        const isOverdriveReady = onCooldown && cooldown <= maxCooldown / 2 && (maxCooldown - cooldown >= 1);
        const isLocked   = onCooldown && !isOverdriveReady;
        
        // Disabled logic blocks clicks if System Override skull is active!
        const disabled   = isLocked || status !== 'hacking' || systemOverride !== null;
        
        const styles     = TOOL_STYLES[tool.color] ?? TOOL_STYLES.green;
        const activeFill = FILL_STYLES[tool.color] ?? FILL_STYLES.green;
        
        const isError     = errorId === tool.id;
        const fillPercent = maxCooldown > 0 ? ((maxCooldown - cooldown) / maxCooldown) * 100 : 100;

        // Determine base button classes for 90s Hackers aesthetic
        let buttonClass = [
          'flex-1 relative overflow-hidden min-h-[64px] py-4 px-2 rounded touch-none',
          'font-display text-[12px] sm:text-[14px] font-black uppercase tracking-[0.2em] text-center',
          // THE CLACK: Springy return on release (duration-150), but instant snap on press (active:duration-0)
          'border-[2px] border-b-[6px] transition-all duration-150 ease-out active:duration-0 select-none',
          isError ? 'danger-shake !bg-red-950/40 !border-red-900 !text-red-500' : '',
          (tool.id === 'BYPASS' && exposedTicks > 0 && !disabled && !isOverdriveReady) ? 'ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)] animate-pulse z-50' : ''
        ];

        // Apply state-specific styles
        if (disabled) {
          buttonClass.push(styles.disabled);
        } else if (isOverdriveReady) {
          // OVERDRIVE CLACK
          buttonClass.push('border-red-500/60 border-b-red-700/80 text-red-400 bg-red-500/10 hover:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.3)] glow-red animate-pulse active:border-b-[2px] active:translate-y-[4px] active:shadow-[inset_0_8px_15px_rgba(0,0,0,0.8)] active:brightness-75');
        } else {
          // STANDARD CLACK
          buttonClass.push(`${styles.active} active:border-b-[2px] active:translate-y-[4px] active:shadow-[inset_0_8px_15px_rgba(0,0,0,0.8)] active:brightness-75`);
        }

        return (
          <button
            key={tool.id}
            onPointerDown={() => handlePointerDown(tool.id, disabled)}
            onContextMenu={(e) => { e.preventDefault(); }}
            title={tool.description}
            className={buttonClass.join(' ')}
          >
            <div className="relative z-10">
              <GlitchLabel 
                text={isOverdriveReady ? 'OVR' : tool.label} 
                isDanger={digitalTrace >= 85 && (settings?.glitchEnabled ?? true)} 
              />
            </div>
            
            <div 
              className={`absolute bottom-0 left-0 w-full transition-all ease-linear z-20 ${isOverdriveReady ? 'bg-red-500/20 border-t border-red-400/60 bg-[url("/noise.png")]' : activeFill}`}
              style={{ 
                height: `${fillPercent}%`,
                transitionDuration: cooldown === maxCooldown ? '0ms' : '1000ms',
                opacity: cooldown > 0 ? 1 : 0
              }} 
            />

            {onCooldown && (
              <div className="absolute top-1.5 right-2 pointer-events-none z-30">
                <span className={`text-[9px] font-bold font-mono tabular-nums ${isOverdriveReady ? 'text-red-400' : 'text-zinc-500'}`}>
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