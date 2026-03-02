import { useRef, useState, useEffect } from 'react';
import useGameStore from '../store/useGameStore';
import toolsConfig from '../data/toolsConfig.json';
import AudioManager from '../utils/audioManager'; // Imported your AudioManager!

const TOOL_STYLES = {
  green: {
    active:   'border-green-500/60 border-b-green-700/80 text-green-400 bg-green-500/5 hover:bg-green-500/15 glow-green',
    disabled: 'border-zinc-800 border-b-zinc-900 text-zinc-700 bg-transparent cursor-not-allowed',
  },
  blue: {
    active:   'border-blue-500/60 border-b-blue-700/80 text-blue-400 bg-blue-500/5 hover:bg-blue-500/15',
    disabled: 'border-zinc-800 border-b-zinc-900 text-zinc-700 bg-transparent cursor-not-allowed',
  },
  amber: {
    active:   'border-amber-500/60 border-b-amber-700/80 text-amber-400 bg-amber-500/5 hover:bg-amber-500/15',
    disabled: 'border-zinc-800 border-b-zinc-900 text-zinc-700 bg-transparent cursor-not-allowed',
  },
};

// ─── THE UI DEGRADATION EFFECT ───
function GlitchLabel({ text, isDanger }) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (!isDanger) {
      setDisplay(text);
      return;
    }
    
    const chars = '01XYZ!@#$';
    const interval = setInterval(() => {
      // 50% chance to scramble a random character every 50ms
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
  }, [text, isDanger]);

  return <>{display}</>;
}

export default function CommandBar() {
  const toolState      = useGameStore(s => s.toolState);
  const executeCommand = useGameStore(s => s.executeCommand);
  const status         = useGameStore(s => s.status);
  const settings       = useGameStore(s => s.settings); // Grab settings for haptics
  const digitalTrace   = useGameStore(s => s.digitalTrace); // Grab Trace for degradation

  // ─── PHASE 4: OVERRIDE STATE ───
  const systemOverride = useGameStore(s => s.systemOverride);
  const resolveOverride= useGameStore(s => s.resolveOverride);

  // States for Hold-to-Execute and Error animations
  const [holdingId, setHoldingId] = useState(null);
  const [errorId, setErrorId]     = useState(null);
  const holdTimeout = useRef(null);

  const handlePointerDown = (toolId, isDangerous, disabled) => {
    // ─── THE DENIED FRICTION ───
    if (disabled) {
      // 1. Audio constraint feedback
      AudioManager.playSFX('error'); 
      
      // 2. Haptic stutter (like a jammed mechanical switch)
      if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([20, 30, 20]);
      }

      // 3. Visual error shake for 200ms
      setErrorId(toolId);
      setTimeout(() => setErrorId(null), 200);
      return;
    }

    if (!isDangerous) {
      executeCommand(toolId);
      return;
    }
    
    // Dangerous tools (DECRYPT) require a 400ms hold
    setHoldingId(toolId);
    
    // Phase 1 Haptics: Start a continuous 400ms rumble while holding
    if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(400); 
    }

    holdTimeout.current = setTimeout(() => {
      executeCommand(toolId);
      setHoldingId(null);
    }, 400);
  };

  const handlePointerUp = () => {
    setHoldingId(null);
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    
    // Phase 1 Haptics: Instantly kill the vibration if they let go early
    if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0); 
    }
  };

  return (
    // Added 'relative' to wrap the absolute overlay securely
    <div className="relative px-3 py-2 pb-4 flex gap-3 justify-center items-end">
      
      {/* ─── PHASE 4: ACTIVE COUNTER-MEASURE OVERLAY ─── */}
      {systemOverride !== null && (
        <div className="absolute inset-0 z-50 px-3 py-2 pb-4 flex items-stretch">
          <button
            onPointerDown={(e) => { e.preventDefault(); resolveOverride(); }}
            className="w-full flex-1 bg-red-950/95 backdrop-blur-md border-2 border-red-500 border-b-[6px] active:border-b-2 active:translate-y-1 rounded shadow-[0_0_30px_rgba(239,68,68,0.5)] flex flex-col items-center justify-center danger-shake"
          >
            <span className="font-mono text-xl font-black text-red-500 uppercase tracking-[0.2em] animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
              SYSTEM OVERRIDE
            </span>
            <span className="font-mono text-[10px] font-bold text-white uppercase tracking-widest mt-1 bg-red-600/80 px-2 py-0.5 rounded">
              TAP TO INTERCEPT // {systemOverride}s
            </span>
          </button>
        </div>
      )}

      {toolsConfig.map((tool, index) => {
        const cooldown   = toolState[tool.id]?.cooldownRemaining ?? 0;
        const onCooldown = cooldown > 0;
        const disabled   = onCooldown || status !== 'hacking';
        const styles     = TOOL_STYLES[tool.color] ?? TOOL_STYLES.green;
        
        const isDangerous = tool.color === 'amber';
        const isHolding   = holdingId === tool.id;
        const isError     = errorId === tool.id;

        const arcTranslate = index === 1 ? '-translate-y-2' : 'translate-y-2';

        return (
          <button
            key={tool.id}
            onPointerDown={() => handlePointerDown(tool.id, isDangerous, disabled)}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            // We remove the native 'disabled' attribute so pointer events still fire!
            title={tool.description}
            className={[
              'flex-1 relative overflow-hidden min-h-[64px] py-4 px-4 rounded game-button',
              'font-mono text-[10px] font-bold uppercase tracking-widest text-center',
              'border border-b-[4px] transition-all duration-75 select-none',
              disabled ? styles.disabled : `${styles.active} active:border-b active:translate-y-1`,
              arcTranslate,
              // Apply the red danger shake when triggered
              isError ? 'danger-shake !bg-red-950/40 !border-red-900 !text-red-500' : ''
            ].join(' ')}
          >
            {/* The text scrambles when trace hits 85%! */}
            <GlitchLabel text={tool.label} isDanger={digitalTrace >= 85} />
            
            {onCooldown && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                <span className="text-[12px] font-bold text-white drop-shadow-md tabular-nums">
                  {cooldown}s
                </span>
              </div>
            )}

            {isHolding && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-amber-400 transition-all ease-linear"
                style={{ width: isHolding ? '100%' : '0%', transitionDuration: isHolding ? '400ms' : '0ms' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}