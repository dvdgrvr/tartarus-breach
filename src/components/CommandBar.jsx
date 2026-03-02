import { useRef, useState } from 'react';
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

export default function CommandBar() {
  const toolState      = useGameStore(s => s.toolState);
  const executeCommand = useGameStore(s => s.executeCommand);
  const status         = useGameStore(s => s.status);
  const settings       = useGameStore(s => s.settings); // Grab settings for haptics

  // States for Hold-to-Execute and Error animations
  const [holdingId, setHoldingId] = useState(null);
  const [errorId, setErrorId]     = useState(null);
  const holdTimeout = useRef(null);

  const handlePointerDown = (toolId, isDangerous, disabled) => {
    // ─── THE DENIED FRICTION ───
    if (disabled) {
      AudioManager.playSFX('error'); 
      if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([20, 30, 20]);
      }
      setErrorId(toolId);
      setTimeout(() => setErrorId(null), 200);
      return;
    }

    if (!isDangerous) {
      executeCommand(toolId);
      return;
    }
    
    // ─── TENSION HOLD (DECRYPT) ───
    setHoldingId(toolId);
    
    // Start a continuous 400ms rumble while the player holds the button
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
    
    // Immediately kill the vibration if they chicken out and let go early
    if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0); 
    }
  };

  return (
    <div className="px-5 py-2 pb-5 flex gap-3 justify-center items-end">
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
            {tool.label}
            
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