// ─────────────────────────────────────────────────────────────────────────────
// "Magic Number" Quarantine — all tunable gameplay values live here only.
// Never hardcode these in components or the store.
// ─────────────────────────────────────────────────────────────────────────────

// Heartbeat
export const TICK_INTERVAL_MS = 1000; // ms between each game tick

// Physical Heat
export const BASE_HEAT_PER_TICK = 1.5; // heat gained per second (pre-upgrade)

// Digital Trace (passive, server awareness)
export const BASE_TRACE_LOW  = 2.5; // trace/tick below TRACE_ACCEL_THRESHOLD
export const BASE_TRACE_HIGH = 6.0; // trace/tick at or above (panic zone)
export const TRACE_ACCEL_THRESHOLD  = 80; // % at which trace rate spikes
export const TRACE_ACCEL_MULTIPLIER = 2.5;  // multiplier applied on TRACE_ACCELERATOR nodes

// Intel Fragments — tiered by job type (Phase 7)
export const SKIM_INTEL_MIN      = 10;
export const SKIM_INTEL_MAX      = 25;
export const PRIORITY_INTEL_MIN  = 30;
export const PRIORITY_INTEL_MAX  = 75;
export const TARTARUS_INTEL      = 150;

// Terminal display
export const MAX_LOG_ENTRIES = 25;

// Firewall
export const FIREWALL_INITIAL_HP = 100;

// Pulse Mechanic — SCAN "perfect timing" window
export const PULSE_INTERVAL_TICKS = 4; // ticks between pulse windows
export const PULSE_WINDOW_TICKS   = 1; // how many ticks the pulse is active (legacy, replaced by PULSE_WINDOW_DURATION_MS)
export const PULSE_WINDOW_DURATION_MS = 300; // ms the pulse window stays open (independent of tick rate)

// Sync Hit — Phase 3.1: ANY tool during pulse window
export const SYNC_DMG_MULT  = 1.5; // +50% firewall damage on damage tools
export const SYNC_COST_MULT = 0.5; // −50% trace/heat cost on utility tools

// Persist versioning — bump when adding new save-state fields
export const SAVE_VERSION = 13; // v13: Phase 4 simplification — kernel trim, safehouse simplification, upgrade rescale
