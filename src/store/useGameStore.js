import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toolsConfig from '../data/toolsConfig.json';
import upgradesConfig from '../data/upgradesConfig.json';
import {
  BASE_HEAT_PER_TICK,
  BASE_TRACE_LOW,
  BASE_TRACE_HIGH,
  TRACE_ACCEL_THRESHOLD,
  BREACH_CREDITS_MIN,
  BREACH_CREDITS_MAX,
  MAX_LOG_ENTRIES,
  SAVE_VERSION,
  FIREWALL_INITIAL_HP,
} from '../config/constants';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildInitialToolState = () =>
  Object.fromEntries(toolsConfig.map(t => [t.id, { cooldownRemaining: 0 }]));

const buildInitialUpgradeState = () =>
  Object.fromEntries(upgradesConfig.map(u => [u.id, { level: 0 }]));

const appendLog = (log, entry) =>
  [...log, entry].slice(-MAX_LOG_ENTRIES);

// ─── Store ───────────────────────────────────────────────────────────────────

const useGameStore = create(
  persist(
    (set, get) => ({
      // ── Persistent meta ────────────────────────────────────────────────────
      saveVersion: SAVE_VERSION,

      // ── Player resources ───────────────────────────────────────────────────
      credits: 0,

      // ── Upgrades (Phase 4) — keyed by upgradeId ────────────────────────────
      // e.g. { RAM: { level: 1 }, SIGNAL: { level: 0 }, BYPASS_STRENGTH: { level: 2 } }
      upgrades: buildInitialUpgradeState(),

      // ── Session state ──────────────────────────────────────────────────────
      status: 'hacking',        // 'hacking' | 'transit'
      digitalTrace: 0,          // 0-100: server awareness of the player
      physicalHeat: 0,          // 0-100: real-world location exposure
      firewallHealth: FIREWALL_INITIAL_HP,
      sessionCreditsEarned: 0,  // credits earned this session (for summary)
      packUpHeat: 0,            // heat at moment of pack-up (for summary)
      packUpTrace: 0,           // trace at moment of pack-up (for summary)

      // ── Tool cooldowns — keyed by toolId ───────────────────────────────────
      toolState: buildInitialToolState(),

      // ── Terminal log ───────────────────────────────────────────────────────
      terminalLog: [
        '// GHOST PROTOCOL v1.0 INITIALIZED',
        '// ACQUIRING TARGET... DONE',
        '// FIREWALL DETECTED. AWAITING COMMANDS.',
      ],

      // ─── TICK ─────────────────────────────────────────────────────────────
      // Called every TICK_INTERVAL_MS by the global heartbeat in App.jsx.
      // This is the single source of truth for all time-based game events.
      tick: () => {
        const s = get();
        if (s.status !== 'hacking') return;

        // Physical Heat — SIGNAL upgrade reduces rate by 10% per level
        const signalLevel = s.upgrades['SIGNAL']?.level ?? 0;
        const heatMultiplier = Math.max(0, 1 - signalLevel * 0.10);
        const heatGain = BASE_HEAT_PER_TICK * heatMultiplier;

        // Digital Trace — passive rate accelerates above the threshold
        const traceGain =
          s.digitalTrace >= TRACE_ACCEL_THRESHOLD ? BASE_TRACE_HIGH : BASE_TRACE_LOW;

        // Decrement all tool cooldowns by 1 second
        const newToolState = Object.fromEntries(
          Object.entries(s.toolState).map(([id, ts]) => [
            id,
            { cooldownRemaining: Math.max(0, ts.cooldownRemaining - 1) },
          ])
        );

        const newHeat  = Math.min(100, s.physicalHeat  + heatGain);
        const newTrace = Math.min(100, s.digitalTrace + traceGain);

        set({ physicalHeat: newHeat, digitalTrace: newTrace, toolState: newToolState });

        // Auto pack-up on critical thresholds
        if (newHeat >= 100 || newTrace >= 100) {
          get().packUp(false);
        }
      },

      // ─── EXECUTE COMMAND ──────────────────────────────────────────────────
      // All game math resolves here. Components only dispatch the action.
      executeCommand: (toolId) => {
        const s = get();
        if (s.status !== 'hacking') return;

        const tool = toolsConfig.find(t => t.id === toolId);
        if (!tool) return;
        if ((s.toolState[toolId]?.cooldownRemaining ?? 0) > 0) return;

        // RAM upgrade reduces cooldown by 10% per level
        const ramLevel = s.upgrades['RAM']?.level ?? 0;
        const cooldownReduction = ramLevel * 0.10;
        const actualCooldown = Math.max(
          1,
          Math.floor(tool.baseCooldown * (1 - cooldownReduction))
        );

        // BYPASS_STRENGTH upgrade adds +10 firewall damage per level to BYPASS
        let firewallDamage = tool.baseEffect.firewallDamage;
        if (toolId === 'BYPASS') {
          const bsLevel = s.upgrades['BYPASS_STRENGTH']?.level ?? 0;
          firewallDamage += bsLevel * 10;
        }

        const prevFirewall = s.firewallHealth;
        const newFirewall  = Math.max(0, prevFirewall - firewallDamage);
        const newTrace     = Math.min(100, Math.max(0, s.digitalTrace + tool.baseEffect.traceGain));

        // Award credits on firewall breach (first hit that brings it to 0)
        const breached = prevFirewall > 0 && newFirewall <= 0;
        const creditsEarned = breached
          ? Math.floor(BREACH_CREDITS_MIN + Math.random() * (BREACH_CREDITS_MAX - BREACH_CREDITS_MIN))
          : 0;

        let log = appendLog(
          s.terminalLog,
          `> ${toolId} // FW: ${Math.ceil(newFirewall)}% | TRACE: ${newTrace.toFixed(0)}%`
        );
        if (breached) {
          log = appendLog(log, `>> [ACCESS GRANTED] +${creditsEarned} CR TRANSFERRED`);
          log = appendLog(log, '>> NEW TARGET ACQUIRING...');
        }

        set({
          firewallHealth: breached ? FIREWALL_INITIAL_HP : newFirewall,
          digitalTrace: newTrace,
          credits: s.credits + creditsEarned,
          sessionCreditsEarned: s.sessionCreditsEarned + creditsEarned,
          terminalLog: log,
          toolState: {
            ...s.toolState,
            [toolId]: { cooldownRemaining: actualCooldown },
          },
        });
      },

      // ─── PACK UP ──────────────────────────────────────────────────────────
      packUp: (voluntary = true) => {
        const s = get();
        const msg = voluntary
          ? '// PACKING UP. SIGNAL REROUTING...'
          : '!! HEAT CRITICAL — FORCED DISCONNECT !!';
        set({
          status: 'transit',
          physicalHeat: 0,          // heat resets in transit (player relocated)
          packUpHeat: s.physicalHeat,
          packUpTrace: s.digitalTrace,
          terminalLog: appendLog(s.terminalLog, msg),
        });
      },

      // ─── START NEW SESSION ────────────────────────────────────────────────
      startNewSession: () => {
        set({
          status: 'hacking',
          digitalTrace: 0,
          physicalHeat: 0,
          firewallHealth: FIREWALL_INITIAL_HP,
          sessionCreditsEarned: 0,
          packUpHeat: 0,
          packUpTrace: 0,
          terminalLog: [
            '// SIGNAL REROUTED. NEW LOCATION ACQUIRED.',
            '// TARGET LOCKED. AWAITING COMMANDS.',
          ],
          toolState: buildInitialToolState(),
        });
      },

      // ─── PURCHASE UPGRADE (Phase 4) ───────────────────────────────────────
      purchaseUpgrade: (upgradeId) => {
        const s = get();
        const cfg = upgradesConfig.find(u => u.id === upgradeId);
        if (!cfg) return;

        const currentLevel = s.upgrades[upgradeId]?.level ?? 0;
        if (currentLevel >= cfg.maxLevel) return;

        const cost = Math.floor(cfg.baseCost * Math.pow(cfg.costScaling, currentLevel));
        if (s.credits < cost) return;

        set({
          credits: s.credits - cost,
          upgrades: {
            ...s.upgrades,
            [upgradeId]: { level: currentLevel + 1 },
          },
        });
      },
    }),

    // ─── Persist config ───────────────────────────────────────────────────────
    {
      name: 'ghost-protocol-save',
      version: SAVE_VERSION,

      // Migrate older saves that lack the upgrades field (v1 → v2)
      migrate: (persistedState, version) => {
        if (version < 2) {
          return { ...persistedState, upgrades: buildInitialUpgradeState() };
        }
        return persistedState;
      },
    }
  )
);

export default useGameStore;
