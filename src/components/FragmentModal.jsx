import { useEffect, useState } from 'react';
import useGameStore from '../store/useGameStore';
import storyFragments from '../data/storyFragments.json';
import { corruptText } from "../utils/textUtils";

const TARTARUS_SCRIPT =
`[SYSTEM]: Trace at 99%. Safety Orange override active.
[LOG]: This is it, Operator. The Meridian Corp. firewall isn't just cracking—it's dissolving. I can see the core. It's not just data; it's a god-code.
[SYSTEM]: Bypassing kernel level 0... Injecting logic bomb...
[LOG]: They think they can park their secrets behind a 'Tartarus' gate? They forgot one thing. Information wants to be free. And tonight, we're the ones holding the bolt cutters.
[SYSTEM]: // BREACH INITIALIZED. //
[LOG]: The Gibson is open. Grab what you can before the room melts. Hack the planet.`;

const CYBER_BG    = '#0d001a';
const CYBER_GREEN = '#39FF14';

export default function FragmentModal() {
  const pendingFragmentIdx   = useGameStore(s => s.pendingFragmentIdx);
  const dismissFragmentModal = useGameStore(s => s.dismissFragmentModal);
  const enterDarknet         = useGameStore(s => s.enterDarknet);
  const cyberdelia           = useGameStore(s => s.settings?.cyberdeliaMode ?? false);

  // 3 Phases: 'decrypting' -> 'typing' -> 'done'
  const [phase, setPhase]         = useState('decrypting');
  const [scrambled, setScrambled] = useState('');
  const [displayed, setDisplayed] = useState('');
  const [exiting,   setExiting]   = useState(false);

  const decryptedFragments = useGameStore(s => s.decryptedFragments);
  
  const isFragment12 = pendingFragmentIdx === 11;
  const isDecrypted  = decryptedFragments?.includes(pendingFragmentIdx);
  const fragment     = storyFragments[pendingFragmentIdx];
  
  const baseText = isFragment12 ? TARTARUS_SCRIPT : (fragment?.text ?? '');
  const fullText = (!isFragment12 && !isDecrypted) ? corruptText(baseText) : baseText;

  // Phase 1: Rapidly scramble hex characters for ~500ms
  useEffect(() => {
    if (pendingFragmentIdx === null) return;
    setPhase('decrypting');
    setDisplayed('');
    setExiting(false);

    let ticks = 0;
    const id = setInterval(() => {
      let s = '';
      const chars = '0123456789ABCDEF!@#$';
      for(let i=0; i<250; i++) s += chars[Math.floor(Math.random() * chars.length)];
      setScrambled(s);
      
      ticks++;
      if (ticks > 15) {
        clearInterval(id);
        setPhase('typing');
      }
    }, 30);
    return () => clearInterval(id);
  }, [pendingFragmentIdx]);

  // Phase 2: Type out the real text
  useEffect(() => {
    if (phase !== 'typing') return;
    let i = 0;
    const id = setInterval(() => {
      i += 3; // Type 3 chars at a time
      setDisplayed(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(id);
        setPhase('done');
      }
    }, 16);
    return () => clearInterval(id);
  }, [phase, fullText]);

  if (pendingFragmentIdx === null) return null;

  const handleDismiss = () => {
    if (isFragment12) {
      setExiting(true);
      setTimeout(() => {
        dismissFragmentModal();
        enterDarknet();
      }, 700);
    } else {
      dismissFragmentModal();
    }
  };

  const borderCol = cyberdelia ? 'rgba(57,255,20,0.2)'  : 'rgba(63,63,70,0.6)';
  const dimCol    = cyberdelia ? 'rgba(57,255,20,0.4)'  : 'rgba(161,161,170,0.4)';
  const textCol   = cyberdelia ? CYBER_GREEN             : '#d4d4d8';
  const cursorCol = cyberdelia ? CYBER_GREEN             : '#4ade80';

  return (
    <div
      className={['absolute inset-0 z-50 flex flex-col', exiting ? 'fragment-exit-shake' : '', cyberdelia ? 'cyberdelia-flicker' : ''].join(' ')}
      style={{ background: cyberdelia ? CYBER_BG : 'rgba(9,9,11,0.99)' }}
    >
      {cyberdelia && <div className="crt-scanlines" />}
      {exiting && <div className="absolute inset-0 z-20 pointer-events-none white-flash-overlay" />}

      <div className="px-4 py-4 border-b shrink-0 relative z-10" style={{ borderColor: borderCol }}>
        <p className="font-mono text-[9px] uppercase tracking-widest mb-1.5 leading-relaxed" style={{ color: dimCol }}>
          {phase === 'decrypting' ? '// DECRYPTING SECTOR //' : 
            isFragment12 ? 'TARTARUS_KEYS_VALIDATED // ENCRYPTED_HANDSHAKE_COMPLETE' : 
            `// Fragment #${String(pendingFragmentIdx + 1).padStart(3, '0')} — Decrypted`}
        </p>
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest" style={{ color: textCol }}>
          {phase === 'decrypting' ? 'DOWNLOADING FRAGMENT...' :
            isFragment12 ? '// Cell Release Authorized //' : 
            isDecrypted ? 'Decryption Complete' : 'DATA ENCRYPTED — DECRYPT IN ARCHIVE'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 relative z-10">
        <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: textCol }}>
          {phase === 'decrypting' ? (
            <span className="opacity-40 animate-pulse text-red-500/50">{scrambled}</span>
          ) : (
            <>
              {displayed}
              {phase === 'typing' && <span className="animate-pulse" style={{ color: cursorCol }}>█</span>}
            </>
          )}
        </pre>
      </div>

      <div className="px-4 py-4 border-t shrink-0 relative z-10" style={{ borderColor: borderCol }}>
        <button
          onClick={handleDismiss}
          disabled={phase === 'decrypting'}
          className={[
            'hardware-btn w-full py-4 rounded border-[2px] font-mono text-xs font-bold uppercase tracking-widest',
            phase === 'decrypting' 
              ? 'border-zinc-800 border-b-zinc-900 text-zinc-700 bg-transparent cursor-wait'
              : isFragment12
                ? 'border-fuchsia-500/60 border-b-fuchsia-700 text-fuchsia-300 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 animate-pulse'
                : 'border-zinc-600 border-b-zinc-800 text-zinc-300 bg-zinc-900 hover:text-white hover:bg-zinc-800',
          ].join(' ')}
          style={!isFragment12 && phase !== 'decrypting' ? { border: `2px solid ${cyberdelia ? 'rgba(57,255,20,0.4)' : ''}`, borderBottomWidth: '6px', color: cyberdelia ? CYBER_GREEN : '' } : undefined}
        >
          {phase === 'decrypting' ? 'DECRYPTING...' : isFragment12 ? '// Enter the Darknet //' : 'Continue to Safe House'}
        </button>
      </div>
    </div>
  );
}