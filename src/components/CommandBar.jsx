import useGameStore from '../store/useGameStore';
import toolsConfig from '../data/toolsConfig.json';

export default function CommandBar() {
  const toolState      = useGameStore(s => s.toolState);
  const executeCommand = useGameStore(s => s.executeCommand);
  const status         = useGameStore(s => s.status);

  return (
    <div className="px-3 py-2 flex gap-2">
      {toolsConfig.map(tool => {
        const cooldown  = toolState[tool.id]?.cooldownRemaining ?? 0;
        const onCooldown = cooldown > 0;
        const disabled   = onCooldown || status !== 'hacking';

        return (
          <button
            key={tool.id}
            onClick={() => executeCommand(tool.id)}
            disabled={disabled}
            title={tool.description}
            className={[
              'flex-1 relative py-3 px-1 rounded border',
              'font-mono text-xs font-bold uppercase tracking-widest',
              'transition-all duration-150 active:scale-95',
              disabled
                ? 'border-zinc-800 text-zinc-600 bg-transparent cursor-not-allowed'
                : 'border-green-500/40 text-green-400 bg-green-500/5',
              !disabled && 'hover:bg-green-500/15 hover:border-green-400 glow-green',
            ].filter(Boolean).join(' ')}
          >
            {tool.label}
            {onCooldown && (
              <span className="absolute bottom-0.5 right-1.5 text-[9px] font-normal text-zinc-600 tabular-nums">
                {cooldown}s
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
