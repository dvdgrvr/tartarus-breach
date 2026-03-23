import useGameStore from '../store/useGameStore';
import GlitchLabel from './GlitchLabel';

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

export default function ToolButton({ tool, errorId, handlePointerDown }) {
  const toolState         = useGameStore(s => s.toolState);
  const status            = useGameStore(s => s.status);
  const exposedTicks      = useGameStore(s => s.exposedTicks);
  const systemOverride    = useGameStore(s => s.systemOverride);
  const upgrades          = useGameStore(s => s.upgrades);
  const safehouse         = useGameStore(s => s.currentSafehouse);
  const isTutorial        = useGameStore(s => s.isTutorial);
  const tutorialStep      = useGameStore(s => s.tutorialStep);
  const settings          = useGameStore(s => s.settings);
  const digitalTrace      = useGameStore(s => s.digitalTrace);

  const ramLevel = upgrades['RAM']?.level ?? 0;

  const TUTORIAL_HIGHLIGHT_MAP = {
    SCAN_INTRO: 'SCAN', DECRYPT_INTRO: 'DECRYPT', PULSE_INTRO: 'PULSE',
    BYPASS_INTRO: 'BYPASS', TRACE_HEAT_INTRO: 'PULSE',
  };
  const highlightToolId = isTutorial ? (TUTORIAL_HIGHLIGHT_MAP[tutorialStep] ?? null) : null;

  const toolInfo    = toolState[tool.id];
  const isLockedTool = toolInfo?.isLocked;
  const cooldown    = toolInfo?.cooldownRemaining ?? 0;
  const maxCooldown = Math.max(1, Math.floor(tool.baseCooldown * (1 - ramLevel * 0.10) * (safehouse?.ramMod ?? 1)));
  const onCooldown  = cooldown > 0;
  const disabled    = onCooldown || isLockedTool || status !== 'hacking' || systemOverride !== null;

  const styles     = TOOL_STYLES[tool.color] ?? TOOL_STYLES.green;
  const activeFill = FILL_STYLES[tool.color] ?? FILL_STYLES.green;
  const isError    = errorId === tool.id;
  const fillPercent = maxCooldown > 0 ? ((maxCooldown - cooldown) / maxCooldown) * 100 : 100;

  let buttonClass = [
    'flex-1 relative overflow-hidden min-h-[60px] sm:min-h-[74px] py-1.5 sm:py-3 px-2 rounded touch-none flex flex-col items-center justify-center',
    'border-[2px] border-b-[6px] transition-all duration-150 ease-out active:duration-0 select-none',
    isError ? 'danger-shake !bg-red-950/40 !border-red-900 !text-red-500' : '',
    (tool.id === 'BYPASS' && exposedTicks > 0 && !disabled)
      ? 'border-amber-400/80 border-b-amber-600 shadow-[inset_0_0_20px_rgba(251,191,36,0.25)] animate-pulse z-20'
      : '',
  ];

  // Tutorial: glow the specific tool the player must press
  if (isTutorial && highlightToolId === tool.id) {
    buttonClass.push('shadow-[0_0_18px_rgba(217,70,239,0.9)] !border-fuchsia-400 animate-pulse z-[60] relative');
  }

  if (isLockedTool) {
    buttonClass.push('bg-zinc-950 border-zinc-900 opacity-30 grayscale cursor-not-allowed pointer-events-none');
  } else if (onCooldown) {
    buttonClass.push(styles.disabled);
  } else {
    buttonClass.push(styles.active);
    buttonClass.push('active:border-b-[2px] active:translate-y-[4px] active:shadow-[inset_0_8px_15px_rgba(0,0,0,0.8)]');
  }

  return (
    <button
      onPointerDown={() => handlePointerDown(tool.id, disabled)}
      className={buttonClass.join(' ')}
    >
      <div className="relative z-10 flex flex-col items-center">
        <span className="font-display text-[12px] sm:text-[14px] font-black uppercase tracking-[0.2em] text-glow">
          <GlitchLabel
            text={isLockedTool ? '---' : tool.id}
            isDanger={digitalTrace >= 85 && (settings?.glitchEnabled ?? true)}
          />
        </span>

        {!isLockedTool && (
          <span className="font-mono text-xs font-black text-zinc-100/70 uppercase tracking-wider mt-0 sm:mt-1 whitespace-nowrap bg-black/40 px-1 rounded-sm">
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
        className={`absolute bottom-0 left-0 w-full h-full origin-bottom transition-transform ease-linear z-20 overflow-hidden ${activeFill}`}
        style={{
          transform: `scaleY(${fillPercent / 100})`,
          transformOrigin: 'bottom',
          transitionDuration: cooldown === maxCooldown ? '0ms' : '1000ms',
          opacity: (onCooldown && !isLockedTool) ? 1 : 0,
        }}
      />

      {onCooldown && !isLockedTool && (
        <div className="absolute top-1 right-1.5 pointer-events-none z-30">
          <span className="text-xs font-bold font-mono tabular-nums text-zinc-500">
            {parseFloat(cooldown.toFixed(1))}s
          </span>
        </div>
      )}
    </button>
  );
}