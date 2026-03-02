import { useRef, useState, useEffect } from 'react';
import useGameStore from '../store/useGameStore';
import toolsConfig from '../data/toolsConfig.json';
import AudioManager from '../utils/audioManager';

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

function GlitchLabel({ text, isDanger }) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (!isDanger) {
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
  }, [text, isDanger]);

  return <>{display}</>;
}

export default function CommandBar() {
  const toolState      = useGameStore(s => s.toolState);
  const executeCommand = useGameStore(s => s.executeCommand);
  const status         = useGameStore(s => s.status);
  const settings       = useGameStore(s => s.settings); 
  const digitalTrace   = useGameStore(s => s.digitalTrace);
  const leaveNode      = useGameStore(s => s.leaveNode);

  const [holdingId, setHoldingId] = useState(null);
  const [errorId, setErrorId]     = useState(null);
  const holdTimeout = useRef(null);

  // ── THE FIX: Safety lock to prevent spam-tapping through the disconnect screen
  const [disconnectLocked, setDisconnectLocked] = useState(false);

  useEffect(() => {
    if (status === 'resolved') {
      setDisconnectLocked(true);
      const timer = setTimeout(() => setDisconnectLocked(false), 1200); // 1.2 second lock
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handlePointerDown = (toolId, isDangerous, disabled) => {
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
    
    setHoldingId(toolId);
    if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(300); 
    }

    holdTimeout.current = setTimeout(() => {
      executeCommand(toolId);
      setHoldingId(null);
    }, 300); // 300ms hold time for dangerous tools
  };

  const handlePointerUp = () => {
    setHoldingId(null);
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0); 
    }
  };

  if (status === 'resolved') {
    return (
      <div className="relative px-4 py-2 pb-4 flex justify-center items-end">
        <button
          onClick={() => {
            if (disconnectLocked) return; // Prevent spam-clicks
            AudioManager.playSFX('thock');
            if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([30, 20, 10]);
            }
            leaveNode();
          }}
          // Dynamically swap styles based on the lock state
          className={`w-full relative overflow-hidden group py-5 bg-zinc-950 border-2 border-zinc-700 border-b-[6px] rounded-lg flex flex-col items-center justify-center transition-all duration-150 shadow-xl ${
            disconnectLocked 
              ? 'opacity-60 cursor-not-allowed grayscale border-zinc-800' 
              : 'active:border-b-2 active:translate-y-1 hover:bg-zinc-900 hover:border-zinc-500 cursor-pointer'
          }`}
        >
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          
          <span className={`relative z-10 font-mono text-lg font-black uppercase tracking-[0.3em] transition-colors ${
            disconnectLocked ? 'text-zinc-600' : 'text-zinc-300 group-hover:text-white drop-shadow-md'
          }`}>
            {disconnectLocked ? '[ SECURING ]' : '[ DISCONNECT ]'}
          </span>
          <span className={`relative z-10 font-mono text-[10px] font-bold tracking-widest mt-1.5 uppercase transition-colors ${
            disconnectLocked ? 'text-zinc-700' : 'text-zinc-500 group-hover:text-zinc-300'
          }`}>
            {disconnectLocked ? '// Awaiting_Sync' : '// Sever_Uplink'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative px-4 py-2 pb-4 flex gap-3 justify-center items-end">
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
            title={tool.description}
            className={[
              'flex-1 relative overflow-hidden min-h-[64px] py-4 px-4 rounded game-button',
              'font-mono text-[11px] font-bold uppercase tracking-widest text-center',
              'border border-b-[4px] transition-all duration-75 select-none',
              disabled ? styles.disabled : `${styles.active} active:border-b active:translate-y-1`,
              arcTranslate,
              isError ? 'danger-shake !bg-red-950/40 !border-red-900 !text-red-500' : ''
            ].join(' ')}
          >
            <GlitchLabel text={tool.label} isDanger={digitalTrace >= 85} />
            
            {onCooldown && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                <span className="text-[13px] font-bold text-white drop-shadow-md tabular-nums">
                  {cooldown}s
                </span>
              </div>
            )}

            {isHolding && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-amber-400 transition-all ease-linear"
                style={{ width: isHolding ? '100%' : '0%', transitionDuration: isHolding ? '300ms' : '0ms' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}