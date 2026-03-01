import { useEffect, useState } from 'react';
import useGameStore from '../store/useGameStore';
import storyFragments from '../data/storyFragments.json';

// ─── Fragment 12 — Tartarus special script ─────────────────────────────────────
// Shown instead of the archive text when the Tartarus node is breached.

const TARTARUS_SCRIPT =
`[SYSTEM]: Trace at 99%. Safety Orange override active.
[LOG]: This is it, Operator. The Meridian Corp. firewall isn't just cracking—it's dissolving. I can see the core. It's not just data; it's a god-code.
[SYSTEM]: Bypassing kernel level 0... Injecting logic bomb...
[LOG]: They think they can park their secrets behind a 'Tartarus' gate? They forgot one thing. Information wants to be free. And tonight, we're the ones holding the bolt cutters.
[SYSTEM]: // BREACH INITIALIZED. //
[LOG]: The Gibson is open. Grab what you can before the room melts. Hack the planet.`;

// ─── Cyberdelia palette (inline — never purged by Tailwind JIT) ───────────────

const CYBER_BG    = '#0d001a';   // deep space purple
const CYBER_GREEN = '#39FF14';   // acid green

// ─── FragmentModal ────────────────────────────────────────────────────────────

export default function FragmentModal() {
  const pendingFragmentIdx   = useGameStore(s => s.pendingFragmentIdx);
  const dismissFragmentModal = useGameStore(s => s.dismissFragmentModal);
  const enterDarknet         = useGameStore(s => s.enterDarknet);
  const cyberdelia           = useGameStore(s => s.settings?.cyberdeliaMode ?? false);

  const [displayed, setDisplayed] = useState('');
  const [done,      setDone]      = useState(false);
  const [exiting,   setExiting]   = useState(false);

  const isFragment12 = pendingFragmentIdx === 11;
  const fragment     = storyFragments[pendingFragmentIdx];
  const fullText     = isFragment12 ? TARTARUS_SCRIPT : (fragment?.text ?? '');

  // Typewriter — restart whenever the fragment changes
  useEffect(() => {
    if (pendingFragmentIdx === null) return;
    setDisplayed('');
    setDone(false);
    setExiting(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(id);
        setDone(true);
      }
    }, 16);
    return () => clearInterval(id);
  }, [pendingFragmentIdx, fullText]);

  if (pendingFragmentIdx === null) return null;

  const handleDismiss = () => {
    if (isFragment12) {
      // Screen-shake + white flash, then transition straight to Darknet
      setExiting(true);
      setTimeout(() => {
        dismissFragmentModal();
        enterDarknet();
      }, 700);
    } else {
      dismissFragmentModal();
    }
  };

  // ── Derived style values (inline to bypass JIT purge) ──────────────────────
  const borderCol = cyberdelia ? 'rgba(57,255,20,0.2)'  : 'rgba(63,63,70,0.6)';
  const dimCol    = cyberdelia ? 'rgba(57,255,20,0.4)'  : 'rgba(161,161,170,0.4)';
  const textCol   = cyberdelia ? CYBER_GREEN             : '#d4d4d8';
  const cursorCol = cyberdelia ? CYBER_GREEN             : '#4ade80';

  return (
    <div
      className={[
        'absolute inset-0 z-50 flex flex-col',
        exiting   ? 'fragment-exit-shake' : '',
        cyberdelia ? 'cyberdelia-flicker'  : '',
      ].join(' ')}
      style={{ background: cyberdelia ? CYBER_BG : 'rgba(9,9,11,0.99)' }}
    >
      {/* CRT scanlines — always on for cyberdelia */}
      {cyberdelia && <div className="crt-scanlines" />}

      {/* White flash overlay — mounts on Tartarus exit */}
      {exiting && <div className="absolute inset-0 z-20 pointer-events-none white-flash-overlay" />}

      {/* ── Header ── */}
      <div
        className="px-4 py-4 border-b shrink-0 relative z-10"
        style={{ borderColor: borderCol }}
      >
        <p
          className="font-mono text-[9px] uppercase tracking-widest mb-1.5 leading-relaxed"
          style={{ color: dimCol }}
        >
          {isFragment12
            ? 'TARTARUS_KEYS_VALIDATED // ENCRYPTED_HANDSHAKE_COMPLETE'
            : `// Fragment #${String(pendingFragmentIdx + 1).padStart(3, '0')} — Decrypted`}
        </p>
        <h2
          className="font-mono text-sm font-bold uppercase tracking-widest"
          style={{ color: textCol }}
        >
          {isFragment12 ? '// Cell Release Authorized //' : 'Decryption in Progress'}
        </h2>
      </div>

      {/* ── Scrollable text ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 relative z-10">
        <pre
          className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words"
          style={{ color: textCol }}
        >
          {displayed}
          {!done && (
            <span className="animate-pulse" style={{ color: cursorCol }}>█</span>
          )}
        </pre>
      </div>

      {/* ── Footer ── */}
      <div
        className="px-4 py-4 border-t shrink-0 relative z-10"
        style={{ borderColor: borderCol }}
      >
        {!isFragment12 && (
          <p
            className="font-mono text-[9px] uppercase tracking-widest text-center mb-3"
            style={{ color: dimCol }}
          >
            Fragment {pendingFragmentIdx + 1} of {storyFragments.length} in archive
          </p>
        )}

        <button
          onClick={handleDismiss}
          className={[
            'w-full py-3 rounded border font-mono text-xs font-bold uppercase tracking-widest',
            'transition-all duration-150 active:scale-[0.99]',
            isFragment12
              ? 'border-fuchsia-500/60 text-fuchsia-300 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 hover:border-fuchsia-400 animate-pulse'
              : '',
          ].join(' ')}
          style={!isFragment12 ? {
            border: `1px solid ${cyberdelia ? 'rgba(57,255,20,0.4)' : 'rgba(113,113,122,0.5)'}`,
            color: cyberdelia ? CYBER_GREEN : '#a1a1aa',
          } : undefined}
        >
          {isFragment12 ? '// Enter the Darknet //' : 'Continue to Safe House'}
        </button>
      </div>
    </div>
  );
}
