// ─────────────────────────────────────────────────────────────────────────────
// "Magic Number" Quarantine — all tunable gameplay values live here only.
// Never hardcode these in components or the store.
// ─────────────────────────────────────────────────────────────────────────────

// Heartbeat
export const TICK_INTERVAL_MS = 1000; // ms between each game tick

// Physical Heat
export const BASE_HEAT_PER_TICK = 0.8; // heat gained per second (pre-upgrade)

// Digital Trace (passive, server awareness)
export const BASE_TRACE_LOW  = 0.25; // trace/tick below TRACE_ACCEL_THRESHOLD
export const BASE_TRACE_HIGH = 0.75; // trace/tick at or above (panic zone)
export const TRACE_ACCEL_THRESHOLD  = 80; // % at which trace rate spikes
export const TRACE_ACCEL_MULTIPLIER = 2;  // multiplier applied on TRACE_ACCELERATOR nodes

// Intel Fragments awarded when a firewall is fully breached (Phase 5: renamed from Credits)
export const BREACH_INTEL_MIN = 50;
export const BREACH_INTEL_MAX = 100;

// Terminal display
export const MAX_LOG_ENTRIES = 25;

// Firewall
export const FIREWALL_INITIAL_HP = 100;

// Persist versioning — bump when adding new save-state fields
export const SAVE_VERSION = 3; // v3: nodes, storyArchive, Intel Fragments rename (Phase 5)
