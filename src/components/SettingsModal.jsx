import useGameStore from '../store/useGameStore';

// ─── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({ label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/60 last:border-0">
      <div className="flex-1 mr-4">
        <p className="font-mono text-sm font-bold text-zinc-200">{label}</p>
        {description && (
          <p className="font-mono text-[11px] text-zinc-400 mt-1">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!value)}
        aria-pressed={value}
        className={`relative shrink-0 w-10 h-5 rounded-full border transition-colors duration-200 ${
          value
            ? 'bg-green-500/20 border-green-500/50'
            : 'bg-zinc-800 border-zinc-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-all duration-200 ${
            value ? 'bg-green-400 translate-x-5' : 'bg-zinc-500 translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// ─── Settings Modal ────────────────────────────────────────────────────────────

export default function SettingsModal({ onClose }) {
  const settings         = useGameStore(s => s.settings);
  const updateSettings   = useGameStore(s => s.updateSettings);
  const toggleCyberdelia = useGameStore(s => s.toggleCyberdelia);
  const resetGame        = useGameStore(s => s.resetGame);

  const volumePct = Math.round((settings?.masterVolume ?? 0.8) * 100);

  return (
    <div className="absolute inset-0 z-50 bg-zinc-950/96 backdrop-blur-sm flex flex-col">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between shrink-0">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-green-400/80">
            // System
          </p>
          <h2 className="font-mono text-base font-bold uppercase tracking-widest text-zinc-100 mt-0.5">
            Configuration
          </h2>
        </div>
        <button
          onClick={onClose}
          className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-300 hover:text-red-400 border border-zinc-600 hover:border-red-500/60 bg-zinc-800/50 hover:bg-zinc-800 px-4 py-2 rounded transition-all duration-150"
        >
          Close
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-thin">

        {/* Audio section */}
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
            // Audio
          </p>

          {/* Master Volume slider */}
          <div className="glass-panel rounded-lg px-4 py-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-sm font-bold text-zinc-200">Master Volume</span>
              <span className="font-mono text-sm font-bold text-cyan-300 tabular-nums w-8 text-right">
                {volumePct}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings?.masterVolume ?? 0.8}
              onChange={(e) => updateSettings({ masterVolume: parseFloat(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none bg-zinc-700 accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Audio toggles */}
          <div className="glass-panel rounded-lg px-4 py-1">
            <Toggle
              label="SFX"
              description="Keystroke clicks and interaction sounds"
              value={settings?.sfxEnabled ?? true}
              onChange={(v) => updateSettings({ sfxEnabled: v })}
            />
            <Toggle
              label="Ambient Audio"
              description="Background atmosphere and drone layers"
              value={settings?.ambienceEnabled ?? true}
              onChange={(v) => updateSettings({ ambienceEnabled: v })}
            />
          </div>
        </div>

        {/* Hardware section */}
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
            // Hardware
          </p>
          <div className="glass-panel rounded-lg px-4 py-1">
            <Toggle
              label="Haptic Feedback"
              description="Vibration on tool use and critical events"
              value={settings?.hapticsEnabled ?? true}
              onChange={(v) => updateSettings({ hapticsEnabled: v })}
            />
          </div>
        </div>

        {/* Display section */}
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
            // Display
          </p>
          <div className="glass-panel rounded-lg px-4 py-1">
            <Toggle
              label="Screen Shake"
              description="Micro-tremor on critical threat bars"
              value={settings?.shakeEnabled ?? true}
              onChange={(v) => updateSettings({ shakeEnabled: v })}
            />
            <Toggle
              label="CRT Scanlines"
              description="Phosphor scanline overlay across the display"
              value={settings?.crtEnabled ?? true}
              onChange={(v) => updateSettings({ crtEnabled: v })}
            />
            <Toggle
              label="1995 CYBERDELIA MODE"
              description="// WARNING: HIGH VOLTAGE ANALOG OVERRIDE."
              value={settings?.cyberdeliaMode ?? false}
              onChange={() => toggleCyberdelia()}
            />
          </div>
        </div>

        {/* Data Management section */}
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
            // Data Management
          </p>
          <div className="glass-panel rounded-lg px-4 py-4 space-y-3">
            <button
              onClick={() => {
                const save = localStorage.getItem('tartarus-save');
                if (!save) { alert('No save data found.'); return; }
                navigator.clipboard.writeText(save).then(() => {
                  alert('Save string copied to clipboard!');
                });
              }}
              className="w-full py-2.5 rounded border border-cyan-700/60 bg-cyan-900/10 text-cyan-400 font-mono text-xs font-bold uppercase tracking-widest hover:bg-cyan-900/30 hover:text-cyan-300 hover:border-cyan-500/60 transition-all duration-150"
            >
              Export Save
            </button>
            <button
              onClick={() => {
                const pasted = window.prompt('Paste your save string here:');
                if (!pasted) return;
                try {
                  JSON.parse(pasted);
                } catch {
                  alert('Invalid save string. Import cancelled.');
                  return;
                }
                localStorage.setItem('tartarus-save', pasted);
                window.location.reload();
              }}
              className="w-full py-2.5 rounded border border-zinc-600/60 bg-zinc-800/20 text-zinc-300 font-mono text-xs font-bold uppercase tracking-widest hover:bg-zinc-800/50 hover:text-zinc-100 hover:border-zinc-500/60 transition-all duration-150"
            >
              Import Save
            </button>
          </div>
        </div>

      </div>

      {/* ── Footer ── */}
      <div className="px-5 py-5 border-t border-zinc-800 shrink-0 space-y-4 bg-zinc-950/90">
        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 text-center">
          Settings saved automatically
        </p>
        <button
          onClick={() => {
            const confirmed = window.confirm(
              'RESTART CAMPAIGN\n\nThis will wipe your intel bank, upgrades, and consumables.\n\nYour high score and global unlocks will be preserved.\n\nProceed?'
            );
            if (confirmed) {
              resetGame();
              onClose();
            }
          }}
          className="w-full py-3 rounded-lg border border-red-800/60 bg-red-950/30 text-red-500 font-mono text-xs font-bold uppercase tracking-widest hover:bg-red-900/40 hover:text-red-400 hover:border-red-600/60 transition-all duration-150"
        >
          Restart Campaign
        </button>
      </div>

    </div>
  );
}