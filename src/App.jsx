import { useEffect, useState } from 'react';
import useGameStore from './store/useGameStore';
import HackingScene from './scenes/HackingScene';
import TransitScene from './scenes/TransitScene';
import LoadingScene from './scenes/LoadingScene';
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

        <p className="font-mono text-[10px] uppercase tracking-widest text-green-400/50 mb-2">
          // Mission Complete
        </p>
        <h1 className="font-mono text-2xl font-bold text-green-400 uppercase tracking-widest mb-1">
          Tartarus Breached
        </h1>
        <p className="font-mono text-xs text-zinc-600 mb-8">
          Your team is out. The conspiracy is exposed.
        </p>

        <div className="glass-panel rounded-lg p-4 border border-green-500/20 bg-green-500/[0.03] mb-6">
          <p className="font-mono text-[9px] uppercase tracking-widest text-green-400/40 mb-2">
            Fragment #012 — Final Transmission
          </p>
          <p className="font-mono text-[11px] text-zinc-200 leading-relaxed">
            {finalFragment.text}
          </p>
        </div>

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

      <div className="space-y-3 pb-4">
        <button
          onClick={enterDarknet}
          className="hardware-btn w-full py-3 rounded-lg border-[2px] border-fuchsia-500/60 border-b-fuchsia-700 text-fuchsia-300 font-mono text-sm font-bold uppercase tracking-widest bg-fuchsia-500/10 hover:bg-fuchsia-500/20 hover:border-fuchsia-400"
        >
          Enter the Darknet
          <span className="block text-[9px] font-normal text-fuchsia-400/40 mt-0.5 normal-case tracking-normal">
            Keep your intel · Access Darknet Router · Endless mode
          </span>
        </button>
        <button
          onClick={resetGame}
          className="hardware-btn w-full py-3 rounded-lg border-[2px] border-zinc-700/60 border-b-zinc-800 text-zinc-500 font-mono text-xs uppercase tracking-widest hover:bg-zinc-800/40 hover:text-zinc-400 bg-zinc-900"
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
      <p className="font-mono text-[10px] uppercase tracking-widest text-red-400/50 mb-2 animate-pulse">
        // Connection Lost
      </p>
      <h1 className="font-mono text-2xl font-bold text-red-400 uppercase tracking-widest animate-pulse mb-1">
        Safehouse Raided
      </h1>
      <p className="font-mono text-xs text-zinc-600 mb-8">
        They traced you back. All intel burned. All assets compromised.
      </p>

      <div className="glass-panel rounded-lg p-4 border border-red-500/20 bg-red-500/[0.03] mb-8">
        <p className="font-mono text-[10px] text-red-400/60 leading-relaxed">
          The Tartarus Node is hardened. One wrong move and the trace was complete.
          Your banked intel has been seized. Your upgrades are gone.
        </p>
        <p className="font-mono text-[10px] text-zinc-700 mt-2">
          Start over. Build back up. Hit it again.
        </p>
      </div>

      <button
        onClick={resetGame}
        className="hardware-btn w-full py-4 rounded-lg border-[2px] border-red-500/40 border-b-red-700 text-red-400 bg-red-950/50 font-mono text-sm font-bold uppercase tracking-widest hover:bg-red-900/40 hover:border-red-400"
      >
        Restart
      </button>
    </div>
  );
}

// ─── Safehouse ambient glow ───────────────────────────────────────────────────

const SAFEHOUSE_GLOW = {
  cyan:    '0 40px 80px -20px rgba(6,182,212,0.25),   0 80px 160px -40px rgba(6,182,212,0.15)',
  amber:   '0 40px 80px -20px rgba(245,158,11,0.25),  0 80px 160px -40px rgba(245,158,11,0.15)',
  emerald: '0 40px 80px -20px rgba(16,185,129,0.25),  0 80px 160px -40px rgba(16,185,129,0.15)',
  slate:   '0 40px 80px -20px rgba(100,116,139,0.25), 0 80px 160px -40px rgba(100,116,139,0.15)',
  fuchsia: '0 40px 80px -20px rgba(217,70,239,0.25),  0 80px 160px -40px rgba(217,70,239,0.15)',
};

const PANIC_GLOW =
  '0 40px 80px -20px rgba(239,68,68,0.40), 0 80px 160px -40px rgba(245,158,11,0.25)';

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const status             = useGameStore(s => s.status);
  const tick               = useGameStore(s => s.tick);
  const currentSafehouse   = useGameStore(s => s.currentSafehouse);
  const settings           = useGameStore(s => s.settings);
  const pendingFragmentIdx = useGameStore(s => s.pendingFragmentIdx);
  const physicalHeat       = useGameStore(s => s.physicalHeat);
  const digitalTrace       = useGameStore(s => s.digitalTrace);

  const setPaused         = useGameStore(s => s.setPaused);
  const isFirstBoot       = useGameStore(s => s.isFirstBoot);
  const triggerFirstBoot  = useGameStore(s => s.triggerFirstBoot);

  const isSettingsModalOpen = useGameStore(s => s.isSettingsModalOpen);
  const toggleSettingsModal = useGameStore(s => s.toggleSettingsModal);

  const cyberdeliaMode = settings?.cyberdeliaMode ?? false;

  const isPanic   = (status === 'hacking' || status === 'resolved') && (physicalHeat > 80 || digitalTrace > 80);
  const outerGlow = isPanic
    ? PANIC_GLOW
    : (SAFEHOUSE_GLOW[currentSafehouse?.color] ?? SAFEHOUSE_GLOW.cyan);

  // Outer casing shadow merges the glowing ambient light with a physical heavy drop shadow
  const deviceStyle = {
    boxShadow: outerGlow + ', 0 25px 50px -12px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
  };

  // Screen inset shadow is applied directly to the glass
  const insetBezel = settings?.crtEnabled
    ? 'inset 0 0 20px rgba(0,0,0,0.8), inset 0 0 2px rgba(255,255,255,0.1)'
    : 'inset 0 0 20px rgba(0,0,0,0.8)';

  const screenStyle = {
    boxShadow: insetBezel,
    ...(cyberdeliaMode && { background: '#0D0221' }),
  };

  const envId   = (status === 'hacking' || status === 'resolved') ? 'combat' : (currentSafehouse?.id?.toLowerCase() ?? 'alpha');
  const roomClass = `h-[100svh] w-full flex justify-center items-center overflow-hidden room-environment env-${envId}`;

  useEffect(() => {
    const id = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick]);

  useEffect(() => {
    if (status === 'transit' && isFirstBoot) {
      triggerFirstBoot();
    }
  }, [status, isFirstBoot, triggerFirstBoot]);

  // Determine the active screen content
  let Content;
  if (isBooting) Content = <LoadingScene onComplete={() => setIsBooting(false)} />; // <-- NEW LOGIC
  else if (status === 'victory') Content = <VictoryScene />;
  else if (status === 'game_over') Content = <GameOverScene />;
  else if (status === 'hacking' || status === 'resolved') Content = <HackingScene />;
  else Content = <TransitScene />;

  return (
    <div className={roomClass}>
      
      {/* ── HARDWARE BEZEL (The physical device) ── */}
      {/* ON MOBILE: It spans 100% height/width. ON DESKTOP (sm:): It looks like a physical deck device. */}
      <div 
        className="flex flex-col relative w-full h-[100dvh] bg-black sm:h-[95svh] sm:max-w-md sm:p-3 sm:bg-zinc-900 sm:border-t sm:border-zinc-700 sm:border-x sm:border-zinc-800 sm:border-b-[8px] sm:border-b-black sm:rounded-[32px]" 
        style={deviceStyle}
      >
        
        {/* Device Texture overlay - Hidden on mobile */}
        <div className="hidden sm:block absolute inset-0 rounded-[32px] bg-[url('/noise.png')] opacity-10 pointer-events-none mix-blend-overlay" />

        {/* Top Hardware Details (Sensors / Mic array) - Hidden on mobile */}
        <div className="hidden sm:flex absolute top-2.5 left-1/2 -translate-x-1/2 items-center gap-3 opacity-40 z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-black shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]" />
          <div className="w-12 h-1.5 rounded-full bg-black shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]" />
        </div>

        {/* ── SCREEN CONTAINER (The recessed glass display) ── */}
        <div className="flex-1 w-full relative overflow-hidden bg-black sm:mt-4 sm:ring-4 sm:ring-black sm:rounded-[20px] sm:shadow-[0_0_10px_rgba(0,0,0,1)]">
          <div className={`h-full w-full flex flex-col relative ${cyberdeliaMode ? 'cyberdelia-vibe' : ''} ${settings?.crtEnabled ? 'crt-hardware' : ''}`} style={screenStyle}>
            
            {settings?.crtEnabled && <div className="crt-scanlines" />}
            {cyberdeliaMode && <div className="cyberdelia-scanlines" />}
            
            {isSettingsModalOpen && <SettingsModal onClose={() => { toggleSettingsModal(false); setPaused(false); }} />}
            {pendingFragmentIdx !== null && <FragmentModal />}
            
            {Content}
          </div>
        </div>

        {/* Bottom Hardware Details (Speaker Grill) - Hidden on mobile */}
        <div className="hidden sm:flex h-3 w-full mt-2.5 mb-0.5 justify-center items-center gap-2 opacity-30 z-10">
          {[...Array(6)].map((_, i) => (
             <div key={i} className="w-1 h-3 bg-black rounded-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.3)]" />
          ))}
        </div>

      </div>

    </div>
  );
}