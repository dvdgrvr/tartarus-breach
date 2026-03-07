import useGameStore from '../store/useGameStore';

export default function MainMenuScene() {
  const setStatus          = useGameStore(s => s.setStatus);
  const startArcadeMode    = useGameStore(s => s.startArcadeMode);
  const startTutorial      = useGameStore(s => s.startTutorial);
  const toggleSettingsModal = useGameStore(s => s.toggleSettingsModal);
  const storyArchive       = useGameStore(s => s.storyArchive);
  const intelFragments     = useGameStore(s => s.intelFragments);

  const isNewGame = storyArchive.length === 0 && intelFragments === 0;

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative overflow-hidden">

      {/* Background grid texture */}
      <div className="gibson-environment absolute inset-0 pointer-events-none">
        <div className="gibson-grid opacity-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">

        <div className="glass-panel backdrop-blur-md w-full max-w-sm rounded-2xl p-6 border border-cyan-500/30 bg-zinc-950/60">

          {/* ── Title Block ── */}
          <div className="mb-8 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-cyan-400/40 mb-3">
              // KERNEL_BOOT :: OPERATOR_DECK v10.2
            </p>
            <h1 className="font-display text-3xl font-black uppercase text-cyan-300 leading-none digital-glitch text-glow mb-1" style={{letterSpacing: '0.2em'}}>
              TARTARUS_OS
            </h1>
            <p className="font-mono text-xs text-zinc-600 uppercase tracking-widest">
              v10.2 — UNAUTHORIZED ACCESS TERMINAL
            </p>
          </div>

          {/* ── Menu Buttons ── */}
          <div className="flex flex-col gap-4">

            <button
              onClick={() => setStatus('transit')}
              className="hardware-btn w-full py-5 border-2 border-zinc-600/60 border-b-zinc-800 text-zinc-200 font-mono text-sm font-black uppercase tracking-widest bg-zinc-900/60 hover:bg-zinc-800/60 hover:border-zinc-500 transition-all shadow-[0_0_15px_rgba(217,70,239,0.2)]"
            >
              {isNewGame ? '[ INITIATE UPLINK ]' : '[ RESUME CAMPAIGN ]'}
              <span className="block text-xs font-normal text-zinc-600 mt-1 normal-case tracking-normal">
                {isNewGame ? 'Begin a new operator campaign' : 'Continue your current run'}
              </span>
            </button>

            <button
              onClick={() => startArcadeMode()}
              className="hardware-btn w-full py-5 border-2 border-cyan-500/60 border-b-cyan-700 text-cyan-300 font-mono text-sm font-black uppercase tracking-widest bg-cyan-500/10 hover:bg-cyan-500/20 glow-cyan transition-all"
            >
              <span className="digital-glitch">[ 60-SEC SIMULATION ]</span>
              <span className="block text-xs font-normal text-cyan-400/50 mt-1 normal-case tracking-normal">
                Breach as many nodes as possible in 60 seconds
              </span>
            </button>

            <button
              onClick={() => startTutorial()}
              className="hardware-btn w-full py-4 border border-fuchsia-800/40 border-b-fuchsia-900/60 text-fuchsia-500 font-mono text-xs font-bold uppercase tracking-widest bg-fuchsia-950/20 hover:bg-fuchsia-900/20 hover:text-fuchsia-400 transition-all"
            >
              [ NEURAL_CALIBRATION ]
              <span className="block text-xs font-normal text-fuchsia-600/60 mt-1 normal-case tracking-normal">
                Guided operator tutorial
              </span>
            </button>

            <button
              onClick={() => toggleSettingsModal(true)}
              className="hardware-btn w-full py-4 border border-zinc-800/60 border-b-zinc-900 text-zinc-500 font-mono text-xs font-bold uppercase tracking-widest bg-zinc-950/60 hover:bg-zinc-900/60 hover:text-zinc-400 transition-all"
            >
              [ SYS_CONFIG ]
            </button>

          </div>

        </div>

      </div>

      {/* Footer */}
      <div className="pb-6 text-center relative z-10">
        <p className="font-mono text-xs text-zinc-800 uppercase tracking-widest">
          // SIGNAL ENCRYPTED — OPERATOR AUTHENTICATION CONFIRMED
        </p>
      </div>

    </div>
  );
}
