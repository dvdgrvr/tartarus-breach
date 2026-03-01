import { useEffect, useRef } from 'react';
import useGameStore from '../store/useGameStore';

export default function TerminalLog({ className = '' }) {
  const terminalLog = useGameStore(s => s.terminalLog);
  const endRef = useRef(null);

  // Auto-scroll to latest entry
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [terminalLog]);

  return (
    <div className={`flex-1 overflow-y-auto px-3 py-2 scrollbar-thin ${className}`}>
      {terminalLog.map((line, i) => (
        <p
          key={i}
          className={`font-mono text-xs leading-relaxed mb-2 ${
            line.startsWith('>>') ? 'text-green-400' :
            line.startsWith('!!') ? 'text-red-400 animate-pulse' :
            line.startsWith('//') ? 'text-cyan-400/60' :
            'text-zinc-400'
          }`}
        >
          {line}
        </p>
      ))}
      <div ref={endRef} />
    </div>
  );
}
