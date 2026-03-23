import { useEffect } from 'react';
import AudioManager from '../../utils/audioManager';
import { DIAGNOSTIC_MAP } from './hackingConstants';

export default function KernelDiagnostic({ modifierId, onClose }) {
  const data = DIAGNOSTIC_MAP[modifierId];

  // TRIGGER: Play scan sound when diagnostic mounts
  useEffect(() => {
    AudioManager.playSFX('scan');
  }, []);

  if (!data) return null;

  return (
    <div
      className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="w-full max-w-xs border-l-4 border-cyan-500 bg-zinc-950 p-4 shadow-[10px_10px_0px_0px_rgba(6,182,212,0.2)]">
        <div className="flex items-center gap-3 mb-3 border-b border-zinc-800 pb-2">
          <span className="text-xl">{data.icon}</span>
          <span className="font-mono text-sm font-black text-cyan-400 tracking-widest uppercase">
            DIAGNOSTIC::{data.label}
          </span>
        </div>

        <p className="font-mono text-xs leading-relaxed text-zinc-300 uppercase italic">
          {data.desc}
        </p>

        <div className="mt-5 flex justify-between items-center opacity-50">
          <span className="font-mono text-xs text-zinc-500 animate-pulse">[ SCANNING... ]</span>
          <span className="font-mono text-xs text-zinc-500 underline uppercase tracking-tighter">Tap to resume</span>
        </div>
      </div>
    </div>
  );
}
