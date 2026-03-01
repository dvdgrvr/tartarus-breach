import { useEffect, useState } from 'react';
import useGameStore from './store/useGameStore';
import HackingScene from './scenes/HackingScene';
import TransitScene from './scenes/TransitScene';
import SettingsModal from './components/SettingsModal';
import FragmentModal from './components/FragmentModal';
import storyFragments from './data/storyFragments.json';
import { TICK_INTERVAL_MS } from './config/constants';

// ─── Victory Screen ───────────────────────────────────────────────────────────

function VictoryScene() {
  const resetGame      = useGameStore(s => s.resetGame);
  const enterDarknet   = useGameStore(s => s.enterDarknet);
  const intelFragments = useGameStore(s => s.intelFragments);
  const finalFragment  = storyFragments[storyFragments.length - 1];

  return (
    <div className="h-full flex flex-col bg-zinc-950 px-6 py-8 overflow-y-auto">
      <div className="flex-1 flex flex-col justify-center">

        {/* Status header */}
        <p className="font-mono text-[10px] uppercase tracking-widest text-green-400/50 mb-2">
          // Mission Complete
        </p>
        <h1 className="font-mono text-2xl font-bold text-green-400 uppercase tracking-widest mb-1">
          Tartarus Breached
        </h1>
        <p className="font-mono text-xs text-zinc-600 mb-8">
          Your team is out. The conspiracy is exposed.
        </p>

        {/* Final fragment */}
        <div className="glass-panel rounded-lg p-4 border border-green-500/20 bg-green-500/[0.03] mb-6">
          <p className="font-mono text-[9px] uppercase tracking-widest text-green-400/40 mb-2">
            Fragment #012 — Final Transmission
          </p>
          <p className="font-mono text-[11px] text-zinc-200 leading-relaxed">
            {finalFragment.text}
          </p>
        </div>

        {/* Stats */}
        <div className="glass-panel rounded-lg p-4 border border-zinc-800/50 mb-6">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs text-zinc-500">Intel Banked</span>
            <span className="font-mono text-sm font-bold text-cyan-400 tabular-nums">
              {intelFragments} <span className="text-[10px] text-cyan-400/50">IF</span>
            </span>
          </div>
          <div className="flex justify-between items-center mt-2.5">
            <span className="font-mono text-xs text-zinc-500">Fragments Decoded</span>
            <span className="font-mono text-sm font-bold text-green-400">
              {storyFragments.length}/{storyFragments.length}
            </span>
          </div>
        </div>

        {/* Narrative bridge to Endless Mode */}
        <div className="glass-panel rounded-lg p-4 border border-fuchsia-500/20 bg-fuchsia-500/[0.03] mb-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fuchsia-400/50 mb-1">
            // Override Complete
          </p>
          <p className="font-mono text-[11px] text-zinc-400 leading-relaxed">
            Tartarus override complete. Global DAEMON deployed. The conspiracy is exposed — but the war is not over.
            Escape into the Darknet.
          </p>
        </div>

      </div>

      {/* Post-game actions */}
      <div className="space-y-2">
        <button
          onClick={enterDarknet}
          className="w-full py-3 rounded-lg border border-fuchsia-500/60 text-fuchsia-300 font-mono text-sm font-bold uppercase tracking-widest bg-fuchsia-500/10 hover:bg-fuchsia-500/20 hover:border-fuchsia-400 transition-all duration-200 active:scale-[0.99]"
        >
          Enter the Darknet
          <span className="block text-[9px] font-normal text-fuchsia-400/40 mt-0.5 normal-case tracking-normal">
            Keep your intel · Access Darknet Router · Endless mode
          </span>
        </button>
        <button
          onClick={resetGame}
          className="w-full py-2 rounded-lg border border-zinc-700/60 text-zinc-500 font-mono text-xs uppercase tracking-widest hover:bg-zinc-800/40 hover:text-zinc-400 transition-all duration-200 active:scale-[0.99]"
        >
          Start New Campaign
          <span className="block text-[9px] font-normal text-zinc-700 mt-0.5 normal-case tracking-normal">
            Wipes bank and upgrades · High score preserved
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── Game Over Screen ─────────────────────────────────────────────────────────

function GameOverScene() {
  const resetGame = useGameStore(s => s.resetGame);

  return (
    <div className="h-full flex flex-col bg-zinc-950 px-6 py-8 justify-center">

      {/* Status header */}
      <p className="font-mono text-[10px] uppercase tracking-widest text-red-400/50 mb-2 animate-pulse">
        // Connection Lost
      </p>
      <h1 className="font-mono text-2xl font-bold text-red-400 uppercase tracking-widest animate-pulse mb-1">
        Safehouse Raided
      </h1>
      <p className="font-mono text-xs text-zinc-600 mb-8">
        They traced you back. All intel burned. All assets compromised.
      </p>

      {/* Loss detail */}
      <div className="glass-panel rounded-lg p-4 border border-red-500/20 bg-red-500/[0.03] mb-8">
        <p className="font-mono text-[10px] text-red-400/60 leading-relaxed">
          The Tartarus Node is hardened. One wrong move and the trace was complete.
          Your banked intel has been seized. Your upgrades are gone.
        </p>
        <p className="font-mono text-[10px] text-zinc-700 mt-2">
          Start over. Build back up. Hit it again.
        </p>
      </div>

      {/* Restart */}
      <button
        onClick={resetGame}
        className="w-full py-3 rounded-lg border border-red-500/40 text-red-400 font-mono text-sm font-bold uppercase tracking-widest hover:bg-red-500/10 hover:border-red-400 transition-all duration-200 active:scale-[0.99]"
      >
        Restart
      </button>
    </div>
  );
}

// ─── Safehouse ambient glow ───────────────────────────────────────────────────
// Inline styles (not Tailwind classes) so values are never purged by the scanner.

const SAFEHOUSE_GLOW = {
  cyan:    '0 0 80px -20px rgba(6,182,212,0.18),   0 0 160px -40px rgba(6,182,212,0.09)',
  amber:   '0 0 80px -20px rgba(245,158,11,0.18),  0 0 160px -40px rgba(245,158,11,0.09)',
  emerald: '0 0 80px -20px rgba(16,185,129,0.18),  0 0 160px -40px rgba(16,185,129,0.09)',
  slate:   '0 0 80px -20px rgba(100,116,139,0.18), 0 0 160px -40px rgba(100,116,139,0.09)',
  fuchsia: '0 0 80px -20px rgba(217,70,239,0.18),  0 0 160px -40px rgba(217,70,239,0.09)',
};

// ─── App ──────────────────────────────────────────────────────────────────────

const CONTAINER_BASE = 'h-[100svh] w-screen max-w-sm mx-auto flex flex-col overflow-hidden relative';

export default function App() {
  const status             = useGameStore(s => s.status);
  const tick               = useGameStore(s => s.tick);
  const currentSafehouse   = useGameStore(s => s.currentSafehouse);
  const settings           = useGameStore(s => s.settings);
  const pendingFragmentIdx = useGameStore(s => s.pendingFragmentIdx);

  const [showSettings, setShowSettings] = useState(false);

  const cyberdeliaMode = settings?.cyberdeliaMode ?? false;
  const containerClass = cyberdeliaMode
    ? `${CONTAINER_BASE} cyberdelia-vibe`
    : CONTAINER_BASE;

  const glowStyle = {
    boxShadow: SAFEHOUSE_GLOW[currentSafehouse?.color] ?? SAFEHOUSE_GLOW.cyan,
    ...(cyberdeliaMode && { background: '#0D0221' }),
  };

  // Global heartbeat — the single timer driving all time-based game events.
  // All logic resolves inside the store's tick(); this component only fires it.
  useEffect(() => {
    const id = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick]);

  const settingsButton = (
    <button
      onClick={() => setShowSettings(true)}
      title="System Configuration"
      className="absolute top-2 right-2 z-40 font-mono text-[10px] uppercase tracking-widest text-zinc-700 hover:text-zinc-400 border border-transparent hover:border-zinc-700/60 px-1.5 py-0.5 rounded transition-all duration-150"
    >
      [SYS]
    </button>
  );

  if (status === 'victory') return (
    <div className={containerClass} style={glowStyle}>
      {settings?.crtEnabled && <div className="crt-scanlines" />}
      {cyberdeliaMode && <div className="cyberdelia-scanlines" />}
      {settingsButton}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {pendingFragmentIdx !== null && <FragmentModal />}
      <VictoryScene />
    </div>
  );

  if (status === 'game_over') return (
    <div className={containerClass} style={glowStyle}>
      {settings?.crtEnabled && <div className="crt-scanlines" />}
      {cyberdeliaMode && <div className="cyberdelia-scanlines" />}
      {settingsButton}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      <GameOverScene />
    </div>
  );

  return (
    <div className={containerClass} style={glowStyle}>
      {settings?.crtEnabled && <div className="crt-scanlines" />}
      {cyberdeliaMode && <div className="cyberdelia-scanlines" />}
      {settingsButton}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {pendingFragmentIdx !== null && <FragmentModal />}
      {status === 'hacking' ? <HackingScene /> : <TransitScene />}
    </div>
  );
}
