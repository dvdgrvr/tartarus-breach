import { useEffect, useRef, useState } from 'react';
import useGameStore from '../store/useGameStore';

// A sub-component that rapidly types out its text on mount
function TypewriterLine({ text, className }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      // Type 2 characters at a time to keep it extremely fast and snappy
      setDisplayed(text.slice(0, i + 2));
      i += 2;
      if (i >= text.length) clearInterval(interval);
    }, 10);
    return () => clearInterval(interval);
  }, [text]);

  return <p className={`font-mono text-[11px] leading-relaxed mb-1 ${className}`}>{displayed}</p>;
}

export default function TerminalLog({ className = '' }) {
  const terminalLog = useGameStore(s => s.terminalLog);
  const endRef = useRef(null);

  // Auto-scroll to latest entry
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [terminalLog]);

  return (
    <div className={`flex-1 overflow-y-auto px-3 py-2 scrollbar-thin ${className}`}>
      {terminalLog.map((line, i) => {
        const colorClass = line.startsWith('>>') ? 'text-green-400' :
                           line.startsWith('!!') ? 'text-red-400 font-bold' :
                           line.startsWith('[!]') ? 'text-amber-400 font-bold' :
                           line.startsWith('//') ? 'text-cyan-400/60' :
                           'text-zinc-400';
                           
        return <TypewriterLine key={i} text={line} className={colorClass} />;
      })}
      <div ref={endRef} />
    </div>
  );
}