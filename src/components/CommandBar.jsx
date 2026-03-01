import useGameStore from '../store/useGameStore';
import toolsConfig from '../data/toolsConfig.json';

// Per-color active/disabled style sets — maps to the tool's "color" field in toolsConfig
const TOOL_STYLES = {
  green: {
    active:   'border-green-500/40 text-green-400 bg-green-500/5 hover:bg-green-500/15 hover:border-green-400 glow-green',
    disabled: 'border-zinc-800 text-zinc-700 bg-transparent cursor-not-allowed',
  },
  blue: {
    active:   'border-blue-500/40 text-blue-400 bg-blue-500/5 hover:bg-blue-500/15 hover:border-blue-400',
    disabled: 'border-zinc-800 text-zinc-700 bg-transparent cursor-not-allowed',
  },
  // DECRYPT: amber signals "dangerous tactical action"
  amber: {
    active:   'border-amber-500/40 text-amber-400 bg-amber-500/5 hover:bg-amber-500/15 hover:border-amber-400',
    disabled: 'border-zinc-800 text-zinc-700 bg-transparent cursor-not-allowed',
  },
};

export default function CommandBar() {
  const toolState      = useGameStore(s => s.toolState);
  const executeCommand = useGameStore(s => s.executeCommand);
  const status         = useGameStore(s => s.status);

  return (
    <div className="px-3 py-2 flex gap-3">
      {toolsConfig.map(tool => {
        const cooldown   = toolState[tool.id]?.cooldownRemaining ?? 0;
        const onCooldown = cooldown > 0;
        const disabled   = onCooldown || status !== 'hacking';
        const styles     = TOOL_STYLES[tool.color] ?? TOOL_STYLES.green;

        return (
          <button
            key={tool.id}
            onClick={() => executeCommand(tool.id)}
            disabled={disabled}
            title={tool.description}
            className={[
              'flex-1 relative min-h-[60px] py-4 px-4 rounded border game-button',
              'font-mono text-[10px] font-bold uppercase tracking-widest text-center',
              'transition-all duration-150 active:scale-95',
              disabled ? styles.disabled : styles.active,
            ].join(' ')}
          >
            {tool.label}
            {onCooldown && (
              <span className="absolute bottom-0.5 right-1 text-[8px] font-normal text-zinc-600 tabular-nums">
                {cooldown}s
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
