export const DIAGNOSTIC_MAP = {
  // Safehouse Traits
  Standard:    { icon: '⚪', label: 'STANDARD',    desc: 'Default operational parameters.' },
  Shielded:    { icon: '🛡️', label: 'SHIELDED',    desc: '-20% Heat generation.' },
  Ghost:       { icon: '👻', label: 'GHOST_SYS',   desc: '-20% Trace generation.' },
  Efficient:   { icon: '♻️', label: 'EFFICIENT',   desc: '+20% Intel earned.' },
  Overclocked: { icon: '⚡', label: 'OVERCLOCKED', desc: '+20% FW damage.' },
  // Node Defenses
  ENCRYPTED_LOGS:    { icon: '🔑', label: 'ENCRYPTED',  desc: 'Firewall metrics obfuscated. Run DECRYPT to reveal.' },
  TRACE_ACCELERATOR: { icon: '📡', label: 'TRACE_X2',    desc: 'Advanced tracking. Passive Trace rate x2.' },
  DARKNET:           { icon: '🌑', label: 'DARKNET',    desc: 'Encrypted router. High trace, massive defenses.' },
  // --- NEW: Node Mutators ---
  ARCHITECT:         { icon: '📐', label: 'ARCHITECT',   desc: 'The Architect is actively rebuilding the firewall.' },
  SNIFFER:           { icon: '🐽', label: 'SNIFFER',     desc: 'Deep packet inspection. Trace rate increased by 50%.' },
  ICE_WALL:          { icon: '🧊', label: 'ICE_WALL',    desc: 'Bypass damage halved. Decrypt rapidly recharges.' },
  GOLD_CACHE:        { icon: '💰', label: 'GOLD_CACHE',  desc: 'Massive IF payout. Target is actively pinging trace authorities.' },
  VOLATILE:          { icon: '🔥', label: 'VOLATILE',    desc: 'Hardware instability. Extreme physical heat spikes.' },
};

export const TUTORIAL_PROMPTS = {
  SCAN_INTRO:       { title: 'CALIBRATION REQUIRED',  body: 'Run SCAN to locate node frequency.' },
  DECRYPT_INTRO:    { title: 'FIREWALL DETECTED',      body: 'Run DECRYPT to unmask the kernel.' },
  PULSE_INTRO:      { title: 'SYNERGY PATH INITIATED', body: 'Run PULSE to synchronize signal.' },
  BYPASS_INTRO:     { title: 'PAYLOAD PRIMED',         body: 'Execute BYPASS for a 3.5× Heavy Strike.' },
  TRACE_HEAT_INTRO: { title: 'WARNING: TRACE SPIKE',   body: 'Run PULSE to mask your signature before it hits 100%.' },
  FINISH_NODE:      { title: 'SYSTEMS UNDERSTOOD',     body: 'Destroy the remaining firewall.' },
  SIPHON_INTRO:     { title: 'BREACH SUCCESSFUL',      body: 'Hold SIPHON to extract extra Intel before disconnecting.' },
};

export const SAFEHOUSE_TRAIT_COLOR = {
  cyan:    'text-cyan-400    border-cyan-500/30    bg-cyan-500/10',
  amber:   'text-amber-400   border-amber-500/30   bg-amber-500/10',
  emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  slate:   'text-slate-400   border-slate-500/30   bg-slate-500/10',
  fuchsia: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10',
};

export const MENACING_SKULL_FACE = `
     _[ ]_
    /[_]_[_]\\
   |  [X|X]  |
   |   ===   |
    \\ _|||_ /
     >_____<
`;
