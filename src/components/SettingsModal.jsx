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

      {/* ── Header: Fixed for iPhone Notch ── */}
      <div 
        className="px-5 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between shrink-0"
        style={{ paddingTop: 'calc(1rem + var(--sat))', paddingBottom: '1rem' }}
      >
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
          className="hardware-btn font-mono text-xs font-bold uppercase tracking-widest text-zinc-300 hover:text-red-400 border-[2px] border-zinc-600 border-b-zinc-800 bg-zinc-800/50 px-4 py-2 rounded"
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
          <div className="glass-panel rounded-lg px-4 py-4 mb-3 border border-zinc-800 bg-zinc-900/20">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-sm font-bold text-zinc-200">Master Volume</span>
              <span className="font-mono text-sm font-bold text-cyan-300 tabular-nums w-8 text-right">
                {volumePct}%
              </span>
            </div>
            <input
              aria-label="Master Volume"
              type="range" min="0" max="1" step="0.05"
              value={settings?.masterVolume ?? 0.8}
              onChange={(e) => updateSettings({ masterVolume: parseFloat(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none bg-zinc-700 accent-cyan-400 cursor-pointer"
            />
          </div>
          <div className="glass-panel rounded-lg px-4 py-1 border border-zinc-800 bg-zinc-900/20">
            <Toggle label="SFX" description="Interaction sounds" value={settings?.sfxEnabled ?? true} onChange={(v) => updateSettings({ sfxEnabled: v })} />
            <Toggle label="Ambient Audio" description="Background drone layers" value={settings?.ambienceEnabled ?? true} onChange={(v) => updateSettings({ ambienceEnabled: v })} />
          </div>
        </div>

        {/* Hardware & Display */}
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
            // Deck Setup
          </p>
          <div className="glass-panel rounded-lg px-4 py-1 border border-zinc-800 bg-zinc-900/20">
            <Toggle label="Haptic Feedback" description="Tactile response on click" value={settings?.hapticsEnabled ?? true} onChange={(v) => updateSettings({ hapticsEnabled: v })} />
            <Toggle label="Screen Shake" description="Micro-tremors on danger" value={settings?.shakeEnabled ?? true} onChange={(v) => updateSettings({ shakeEnabled: v })} />
            <Toggle label="UI Glitch Effects" description="Text jitter on high trace" value={settings?.glitchEnabled ?? true} onChange={(v) => updateSettings({ glitchEnabled: v })} />
            <Toggle label="CRT Scanlines" description="Phosphor overlay" value={settings?.crtEnabled ?? true} onChange={(v) => updateSettings({ crtEnabled: v })} />
            <Toggle label="1995 CYBERDELIA" description="// ANALOG OVERRIDE" value={settings?.cyberdeliaMode ?? false} onChange={() => toggleCyberdelia()} />
          </div>
        </div>

        {/* Data Management */}
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
            // Data Management
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                const save = localStorage.getItem('tartarus-save');
                if (!save) return;
                navigator.clipboard.writeText(save).then(() => alert('Save copied!'));
              }}
              className="hardware-btn flex-1 py-3 px-2 rounded border-[2px] border-zinc-600 border-b-zinc-800 text-zinc-200 bg-zinc-800/60 font-mono text-xs font-bold uppercase flex flex-col items-center gap-1"
            >
              Export Save
              <span className="text-[8px] text-zinc-500 normal-case">Clipboard</span>
            </button>

            <button
              onClick={() => {
                const pasted = window.prompt('Paste save string:');
                if (!pasted) return;
                localStorage.setItem('tartarus-save', pasted);
                window.location.reload();
              }}
              className="hardware-btn flex-1 py-3 px-2 rounded border-[2px] border-cyan-500/60 border-b-cyan-700 text-cyan-300 bg-cyan-900/50 font-mono text-xs font-bold uppercase flex flex-col items-center"
            >
              Import Save
              <span className="text-[8px] text-cyan-400/60 normal-case">Restore</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Footer: Fixed for iPhone Home Bar ── */}
      <div 
        className="px-5 border-t border-zinc-800 shrink-0 space-y-4 bg-zinc-950/90"
        style={{ paddingBottom: 'calc(1.5rem + var(--sab))', paddingTop: '1.25rem' }}
      >
        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 text-center">
          Settings saved automatically
        </p>
        <button
          onClick={() => {
            if (window.confirm('RESTART CAMPAIGN?\n\nThis wipes all intel and upgrades.')) {
              resetGame();
              onClose();
            }
          }}
          className="hardware-btn w-full py-3 px-4 rounded border-[2px] border-red-500/80 border-b-red-800 text-red-400 bg-red-950/60 font-mono text-xs font-bold uppercase flex flex-col items-center gap-1"
        >
          Erase Safehouse
          <span className="text-[9px] font-normal text-red-400/60 normal-case">Restart campaign</span>
        </button>
      </div>

    </div>
  );
}