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

const FILL_STYLES = {
  green: 'bg-green-500/20 border-t border-green-400/60',
  blue:  'bg-blue-500/20 border-t border-blue-400/60',
  amber: 'bg-amber-500/20 border-t border-amber-400/60',
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
  
  const upgrades       = useGameStore(s => s.upgrades);
  const safehouse      = useGameStore(s => s.currentSafehouse);

  const [holdingId, setHoldingId] = useState(null);
  const [errorId, setErrorId]     = useState(null);
  const holdTimeout = useRef(null);

  const [disconnectLocked, setDisconnectLocked] = useState(false);

  useEffect(() => {
    if (status === 'resolved') {
      setDisconnectLocked(true);
      const timer = setTimeout(() => setDisconnectLocked(false), 1200);
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
    if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0); 
    }
  };

  if (status === 'resolved') {
    return (
      <div className="relative px-4 py-2 pb-4 flex justify-center items-end">
        <button
          onClick={() => {
            if (disconnectLocked) return;
            AudioManager.playSFX('thock');
            if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([30, 20, 10]);
            }
            leaveNode();
          }}
          className={`w-full relative overflow-hidden group py-5 border-2 border-b-[6px] rounded-lg flex flex-col items-center justify-center transition-all duration-300 shadow-xl ${
            disconnectLocked 
              ? 'bg-zinc-950 border-zinc-800 opacity-60 cursor-not-allowed grayscale' 
              : 'bg-cyan-950/30 border-cyan-700/80 active:border-b-2 active:translate-y-1 hover:bg-cyan-900/50 hover:border-cyan-500 cursor-pointer'
          }`}
        >
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          
          <span className={`relative z-10 font-mono text-lg font-black uppercase tracking-[0.3em] transition-colors ${
            disconnectLocked ? 'text-zinc-600' : 'text-cyan-400 group-hover:text-white drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]'
          }`}>
            {disconnectLocked ? '[ SECURING ]' : '[ DISCONNECT ]'}
          </span>
          <span className={`relative z-10 font-mono text-[10px] font-bold tracking-widest mt-1.5 uppercase transition-colors ${
            disconnectLocked ? 'text-zinc-700' : 'text-cyan-600 group-hover:text-cyan-400'
          }`}>
            {disconnectLocked ? '// Awaiting_Sync' : '// Sever_Uplink'}
          </span>
        </button>
      </div>
    );
  }

  const ramLevel = upgrades['RAM']?.level ?? 0;

  return (
    <div className="relative px-4 py-2 pb-4 flex gap-3 justify-center items-end">
      {toolsConfig.map((tool) => {
        const cooldown   = toolState[tool.id]?.cooldownRemaining ?? 0;
        const onCooldown = cooldown > 0;
        const disabled   = onCooldown || status !== 'hacking';
        
        const styles     = TOOL_STYLES[tool.color] ?? TOOL_STYLES.green;
        const activeFill = FILL_STYLES[tool.color] ?? FILL_STYLES.green;
        
        const isDangerous = tool.color === 'amber';
        const isHolding   = holdingId === tool.id;
        const isError     = errorId === tool.id;

        const maxCooldown = Math.max(1, Math.floor(tool.baseCooldown * (1 - ramLevel * 0.10) * (safehouse?.ramMod ?? 1)));
        const fillPercent = maxCooldown > 0 ? ((maxCooldown - cooldown) / maxCooldown) * 100 : 100;

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
              isError ? 'danger-shake !bg-red-950/40 !border-red-900 !text-red-500' : ''
            ].join(' ')}
          >
            <div className="relative z-10">
              <GlitchLabel text={tool.label} isDanger={digitalTrace >= 85} />
            </div>
            
            {onCooldown && (
              <div 
                className={`absolute bottom-0 left-0 w-full transition-all duration-1000 ease-linear z-20 ${activeFill}`}
                style={{ height: `${fillPercent}%` }} 
              />
            )}

            {onCooldown && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <span className="text-[13px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tabular-nums">
                  {cooldown}s
                </span>
              </div>
            )}

            {isHolding && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-amber-400 transition-all ease-linear z-40"
                style={{ width: isHolding ? '100%' : '0%', transitionDuration: isHolding ? '400ms' : '0ms' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}