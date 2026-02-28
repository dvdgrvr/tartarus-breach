import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toolsConfig    from '../data/toolsConfig.json';
import upgradesConfig from '../data/upgradesConfig.json';
import nodesConfig    from '../data/nodesConfig.json';
import storyFragments from '../data/storyFragments.json';
import {
  BASE_HEAT_PER_TICK,
  BASE_TRACE_LOW,
  BASE_TRACE_HIGH,
  TRACE_ACCEL_THRESHOLD,
  TRACE_ACCEL_MULTIPLIER,
  BREACH_INTEL_MIN,
  BREACH_INTEL_MAX,
  MAX_LOG_ENTRIES,
  SAVE_VERSION,
} from '../config/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildInitialToolState = () =>
  Object.fromEntries(toolsConfig.map(t => [t.id, { cooldownRemaining: 0 }]));

const buildInitialUpgradeState = () =>
  Object.fromEntries(upgradesConfig.map(u => [u.id, { level: 0 }]));

const pickRandomNode = () =>
  nodesConfig[Math.floor(Math.random() * nodesConfig.length)];

const appendLog = (log, entry) =>
  [...log, entry].slice(-MAX_LOG_ENTRIES);

// Build the opening terminal log lines for a freshly-assigned node
const nodeBootLog = (node) => {
  const lines = [
    '// SIGNAL REROUTED. NEW LOCATION ACQUIRED.',
    `// TARGET: ${node.name.toUpperCase()}`,
  ];
  if (node.specialDefense === 'ENCRYPTED_LOGS') {
    lines.push('// [!] ENCRYPTED LOGS DETECTED — FW METRICS OBFUSCATED');
    lines.push('// USE DECRYPT TO REVEAL FIREWALL HEALTH');
  } else if (node.specialDefense === 'TRACE_ACCELERATOR') {
    lines.push('// [!] TRACE ACCELERATOR DETECTED — PASSIVE TRACE RATE x2');
    lines.push('// OPERATE FAST. ABORT EARLY IF NEEDED.');
  } else {
    lines.push('// STANDARD DEFENSES. AWAITING COMMANDS.');
  }
  return lines;
};

// ─── Store ────────────────────────────────────────────────────────────────────

const _initialNode = pickRandomNode();

const useGameStore = create(
  persist(
    (set, get) => ({
      // ── Persistent meta ──────────────────────────────────────────────────
      saveVersion: SAVE_VERSION,

      // ── Player resources (Phase 5: renamed credits → intelFragments) ─────
      intelFragments: 0,

      // ── Upgrades (Phase 4) ───────────────────────────────────────────────
      upgrades: buildInitialUpgradeState(),

      // ── Narrative archive (Phase 5) ──────────────────────────────────────
      // Array of indices into storyFragments.json that have been collected
      storyArchive: [],

      // ── Session state ────────────────────────────────────────────────────
      status: 'hacking',              // 'hacking' | 'transit'
      digitalTrace: 0,
      physicalHeat: 0,
      firewallHealth: _initialNode.firewallHP,
      sessionIntelEarned: 0,
      packUpHeat: 0,
      packUpTrace: 0,

      // ── Current node (Phase 5) ───────────────────────────────────────────
      currentNode: _initialNode,
      firewallRevealed: false,        // true once DECRYPT has been used on an ENCRYPTED node

      // ── Tool cooldowns ───────────────────────────────────────────────────
      toolState: buildInitialToolState(),

      // ── Terminal log ─────────────────────────────────────────────────────
      terminalLog: nodeBootLog(_initialNode),

      // ─── TICK ──────────────────────────────────────────────────────────
      // The single global heartbeat — all time-based math lives here.
      tick: () => {
        const s = get();
        if (s.status !== 'hacking') return;

        // Physical Heat — SIGNAL upgrade reduces rate by 10% per level
        const signalLevel    = s.upgrades['SIGNAL']?.level ?? 0;
        const heatMultiplier = Math.max(0, 1 - signalLevel * 0.10);
        const heatGain       = BASE_HEAT_PER_TICK * heatMultiplier;

        // Digital Trace — passive rate; TRACE_ACCELERATOR node doubles it
        const isTraceAccel   = s.currentNode?.specialDefense === 'TRACE_ACCELERATOR';
        const traceMultiplier = isTraceAccel ? TRACE_ACCEL_MULTIPLIER : 1;
        const traceGain =
          (s.digitalTrace >= TRACE_ACCEL_THRESHOLD ? BASE_TRACE_HIGH : BASE_TRACE_LOW)
          * traceMultiplier;

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

        if (newHeat >= 100 || newTrace >= 100) get().packUp(false);
      },

      // ─── EXECUTE COMMAND ──────────────────────────────────────────────
      // All game math resolves here. Components only dispatch an action ID.
      executeCommand: (toolId) => {
        const s = get();
        if (s.status !== 'hacking') return;

        const tool = toolsConfig.find(t => t.id === toolId);
        if (!tool) return;
        if ((s.toolState[toolId]?.cooldownRemaining ?? 0) > 0) return;

        // RAM upgrade reduces cooldown
        const ramLevel     = s.upgrades['RAM']?.level ?? 0;
        const actualCooldown = Math.max(
          1,
          Math.floor(tool.baseCooldown * (1 - ramLevel * 0.10))
        );

        // Base effects from config
        let firewallDamage = tool.baseEffect.firewallDamage ?? 0;
        const traceGain    = tool.baseEffect.traceGain      ?? 0;
        const heatGain     = tool.baseEffect.heatGain       ?? 0;

        // BYPASS_STRENGTH upgrade boosts BYPASS firewall damage
        if (toolId === 'BYPASS') {
          const bsLevel = s.upgrades['BYPASS_STRENGTH']?.level ?? 0;
          firewallDamage += bsLevel * 10;
        }

        // Compute resulting values
        const prevFirewall = s.firewallHealth;
        const newFirewall  = Math.max(0, prevFirewall - firewallDamage);
        const newTrace     = Math.min(100, Math.max(0, s.digitalTrace + traceGain));
        const newHeat      = Math.min(100, s.physicalHeat + heatGain);

        // ── DECRYPT special logic ──────────────────────────────────────
        if (toolId === 'DECRYPT') {
          const isEncrypted = s.currentNode?.specialDefense === 'ENCRYPTED_LOGS';
          const alreadyDone = s.firewallRevealed;

          let log = appendLog(s.terminalLog,
            `> DECRYPT // +${heatGain}% HEAT | TRACE: ${newTrace.toFixed(0)}%`);

          if (isEncrypted && !alreadyDone) {
            log = appendLog(log, `>> ENCRYPTED LOGS CRACKED — FW: ${s.firewallHealth}%`);
          } else if (isEncrypted && alreadyDone) {
            log = appendLog(log, '>> ALREADY DECRYPTED — HEAT WASTED');
          } else {
            log = appendLog(log, '>> NO ENCRYPTED LOGS ON THIS NODE — HEAT WASTED');
          }

          set({
            physicalHeat:     newHeat,
            digitalTrace:     newTrace,
            firewallRevealed: isEncrypted ? true : s.firewallRevealed,
            terminalLog:      log,
            toolState: { ...s.toolState, [toolId]: { cooldownRemaining: actualCooldown } },
          });

          if (newHeat >= 100) get().packUp(false);
          return;
        }

        // ── Standard attack/utility logic ─────────────────────────────
        const breached = prevFirewall > 0 && newFirewall <= 0;

        // Intel Fragments earned on breach
        const intelEarned = breached
          ? Math.floor(BREACH_INTEL_MIN + Math.random() * (BREACH_INTEL_MAX - BREACH_INTEL_MIN))
          : 0;

        // Story fragment — pick one not yet collected
        let newArchive = s.storyArchive;
        let fragmentIdx = null;
        if (breached) {
          const pool = storyFragments.map((_, i) => i).filter(i => !s.storyArchive.includes(i));
          if (pool.length > 0) {
            fragmentIdx = pool[Math.floor(Math.random() * pool.length)];
            newArchive  = [...s.storyArchive, fragmentIdx];
          }
        }

        // Next node on breach
        const nextNode = breached ? pickRandomNode() : s.currentNode;

        // FW display respects ENCRYPTED_LOGS obfuscation
        const isEncrypted   = s.currentNode?.specialDefense === 'ENCRYPTED_LOGS';
        const fwDisplay     = (isEncrypted && !s.firewallRevealed) ? '???' : `${Math.ceil(newFirewall)}`;

        // Build terminal log
        let log = appendLog(s.terminalLog,
          `> ${toolId} // FW: ${fwDisplay}% | TRACE: ${newTrace.toFixed(0)}%`);

        if (breached) {
          log = appendLog(log, `>> [ACCESS GRANTED] +${intelEarned} FRAGS`);
          if (fragmentIdx !== null) {
            log = appendLog(log,
              `>> FRAGMENT #${String(fragmentIdx + 1).padStart(3, '0')} DECODED — CHECK ARCHIVE`);
          }
          log = appendLog(log, `>> NEW TARGET: ${nextNode.name.toUpperCase()}`);
          if (nextNode.specialDefense === 'ENCRYPTED_LOGS') {
            log = appendLog(log, '>> [!] ENCRYPTED LOGS DETECTED');
          } else if (nextNode.specialDefense === 'TRACE_ACCELERATOR') {
            log = appendLog(log, '>> [!] TRACE ACCELERATOR DETECTED');
          }
        }

        set({
          firewallHealth:   breached ? nextNode.firewallHP : newFirewall,
          currentNode:      nextNode,
          firewallRevealed: breached ? false : s.firewallRevealed,
          digitalTrace:     newTrace,
          physicalHeat:     newHeat,
          intelFragments:   s.intelFragments   + intelEarned,
          sessionIntelEarned: s.sessionIntelEarned + intelEarned,
          storyArchive:     newArchive,
          terminalLog:      log,
          toolState: { ...s.toolState, [toolId]: { cooldownRemaining: actualCooldown } },
        });
      },

      // ─── PACK UP ─────────────────────────────────────────────────────
      packUp: (voluntary = true) => {
        const s = get();
        const msg = voluntary
          ? '// PACKING UP. SIGNAL REROUTING...'
          : '!! HEAT CRITICAL — FORCED DISCONNECT !!';
        set({
          status:     'transit',
          physicalHeat: 0,
          packUpHeat:  s.physicalHeat,
          packUpTrace: s.digitalTrace,
          terminalLog: appendLog(s.terminalLog, msg),
        });
      },

      // ─── START NEW SESSION ────────────────────────────────────────────
      startNewSession: () => {
        const nextNode = pickRandomNode();
        set({
          status:           'hacking',
          digitalTrace:     0,
          physicalHeat:     0,
          firewallHealth:   nextNode.firewallHP,
          currentNode:      nextNode,
          firewallRevealed: false,
          sessionIntelEarned: 0,
          packUpHeat:       0,
          packUpTrace:      0,
          terminalLog:      nodeBootLog(nextNode),
          toolState:        buildInitialToolState(),
        });
      },

      // ─── PURCHASE UPGRADE (Phase 4) ───────────────────────────────────
      purchaseUpgrade: (upgradeId) => {
        const s = get();
        const cfg = upgradesConfig.find(u => u.id === upgradeId);
        if (!cfg) return;

        const currentLevel = s.upgrades[upgradeId]?.level ?? 0;
        if (currentLevel >= cfg.maxLevel) return;

        const cost = Math.floor(cfg.baseCost * Math.pow(cfg.costScaling, currentLevel));
        if (s.intelFragments < cost) return;

        set({
          intelFragments: s.intelFragments - cost,
          upgrades: {
            ...s.upgrades,
            [upgradeId]: { level: currentLevel + 1 },
          },
        });
      },
    }),

    // ─── Persist config ────────────────────────────────────────────────────
    {
      name: 'ghost-protocol-save',
      version: SAVE_VERSION,

      migrate: (persistedState, version) => {
        let state = persistedState;

        // v1 → v2: add upgrades
        if (version < 2) {
          state = { ...state, upgrades: buildInitialUpgradeState() };
        }

        // v2 → v3: rename credits→intelFragments, add node/archive fields
        if (version < 3) {
          const { credits, sessionCreditsEarned, ...rest } = state;
          state = {
            ...rest,
            intelFragments:    credits ?? 0,
            sessionIntelEarned: 0,
            storyArchive:      [],
            currentNode:       pickRandomNode(),
            firewallRevealed:  false,
          };
        }

        return state;
      },
    }
  )
);

export default useGameStore;
