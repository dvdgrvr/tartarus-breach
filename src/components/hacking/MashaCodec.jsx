import { useState, useEffect, useRef } from 'react';

export default function MashaCodec({ parsedLog }) {

  const [message, setMessage] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [displayKey, setDisplayKey] = useState(0); // Forces effect reset

  const lastSeenRef = useRef(null);

  useEffect(() => {

    if (parsedLog.length === 0) return;

    const recentLogs = parsedLog.slice(-3).filter(Boolean);
    const latestMashaLog = [...recentLogs].reverse().find(l => l.includes('MASHA'));

    // Trigger if it's a new message
    if (latestMashaLog && latestMashaLog !== lastSeenRef.current) {
      lastSeenRef.current = latestMashaLog;

      const cleanText = latestMashaLog.replace(/^.*MASHA[^a-zA-Z0-9]*\s*/i, '').replace(/['"]/g, '');

      setMessage(cleanText);
      setIsVisible(true);
      setDisplayKey(prev => prev + 1); // Increment key to reset timer logic
    }
  }, [parsedLog]);

  // Dedicated timer effect that handles its own cleanup
  useEffect(() => {
    if (!isVisible) return;

    // 2.2 seconds - Extremely fast, keeps the HUD clean
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, [displayKey, isVisible]);

  return (
    <div className={`absolute top-4 left-4 right-4 z-[60] transition-all duration-300 ease-in-out flex justify-center pointer-events-none ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'}`}>
      <div className="bg-zinc-950/95 backdrop-blur-md border-[2px] border-fuchsia-500/80 shadow-[0_10px_30px_rgba(217,70,239,0.3)] p-3 flex gap-4 items-center w-full max-w-sm">

        <div className="w-12 h-12 shrink-0 bg-fuchsia-950/50 border border-fuchsia-500/50 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 w-full bg-fuchsia-500 text-black font-mono text-xs font-black text-center tracking-widest uppercase leading-tight">
            MASHA
          </div>
          <div className="flex items-end gap-0.5 h-4 mt-2">
            <div className="w-1 bg-fuchsia-400 animate-[bounce_0.8s_infinite] origin-bottom" />
            <div className="w-1 bg-fuchsia-400 animate-[bounce_0.5s_infinite] origin-bottom" style={{ animationDelay: '0.1s' }} />
            <div className="w-1 bg-fuchsia-400 animate-[bounce_1.2s_infinite] origin-bottom" style={{ animationDelay: '0.2s' }} />
            <div className="w-1 bg-fuchsia-400 animate-[bounce_0.6s_infinite] origin-bottom" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-xs text-fuchsia-300 font-bold uppercase tracking-widest">
              Live Transmission
            </span>
          </div>
          <p className="font-mono text-xs text-white leading-snug">
            "{message}"
          </p>
        </div>
      </div>
    </div>
  );
}