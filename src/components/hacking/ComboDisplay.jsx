import useGameStore from '../../store/useGameStore';

export default function ComboDisplay() {
  const chain = useGameStore(s => s.comboChain) || [];
  const exposed = useGameStore(s => s.exposedTicks > 0);

  // Detection for the "Break" visual
  const isBroken = chain.length === 0 && !exposed;

  const TARGET = [
    { id: 'SCAN',    color: 'text-cyan-400',    icon: '📡' },
    { id: 'DECRYPT', color: 'text-fuchsia-400', icon: '🔑' },
    { id: 'PULSE',   color: 'text-emerald-400', icon: '⚡' }
  ];

  return (
    <div className={`px-4 flex items-center gap-3 mb-1 mt-1 transition-all ${isBroken ? 'animate-combo-break' : ''}`}>
      <span className="font-mono text-xs text-zinc-600 uppercase tracking-tighter">Chain_Buffer:</span>
      <div className="flex gap-1">
        {TARGET.map((step, i) => {
          const isActive = chain[i] === step.id;

          return (
            <div
              key={i}
              className={`w-6 h-4 border flex items-center justify-center text-xs transition-all duration-200 ${
                isActive
                  ? `${step.color} border-current bg-current/5 shadow-[0_0_5px_currentColor]`
                  : 'text-zinc-900 border-zinc-900 bg-transparent'
              }`}
            >
              {isActive ? step.icon : ''}
            </div>
          );
        })}
      </div>

      {chain.length === 3 && exposed && (
        <span className="font-mono text-xs font-black text-amber-500/80 animate-pulse ml-auto tracking-tighter">
          [!] PAYLOAD_READY
        </span>
      )}
    </div>
  );
}