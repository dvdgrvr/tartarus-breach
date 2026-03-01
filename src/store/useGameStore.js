import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toolsConfig    from '../data/toolsConfig.json';
import upgradesConfig from '../data/upgradesConfig.json';
import storyFragments from '../data/storyFragments.json';
import AudioManager   from '../utils/audioManager';
import {
  BASE_HEAT_PER_TICK,
  BASE_TRACE_LOW,
  BASE_TRACE_HIGH,
  TRACE_ACCEL_THRESHOLD,
  TRACE_ACCEL_MULTIPLIER,
  SKIM_INTEL_MIN,
  SKIM_INTEL_MAX,
  PRIORITY_INTEL_MIN,
  PRIORITY_INTEL_MAX,
  TARTARUS_INTEL,
  MAX_LOG_ENTRIES,
  SAVE_VERSION,
} from '../config/constants';

// ─── Node Pools ───────────────────────────────────────────────────────────────

const SKIM_NODES = [
  { id: 'DS_01', name: 'Municipal Cache Server',  specialDefense: null,                firewallHP: 60  },
  { id: 'DS_02', name: 'Retail Payment Terminal', specialDefense: null,                firewallHP: 65  },
  { id: 'DS_03', name: 'University Research Hub', specialDefense: null,                firewallHP: 70  },
  { id: 'DS_04', name: 'ISP Backbone Node',        specialDefense: null,                firewallHP: 75  },
  { id: 'DS_05', name: 'Legacy Banking Relay',     specialDefense: null,                firewallHP: 80  },
];

const PRIORITY_NODES = [
  { id: 'PR_01', name: 'Meridian Corp. Relay', specialDefense: null,                firewallHP: 100 },
  { id: 'PR_02', name: 'Axiom Financial Hub',  specialDefense: null,                firewallHP: 120 },
  { id: 'PR_03', name: 'Vault-7 Archive',      specialDefense: 'ENCRYPTED_LOGS',    firewallHP: 100 },
  { id: 'PR_04', name: 'Helix Black Site',     specialDefense: 'ENCRYPTED_LOGS',    firewallHP: 110 },
  { id: 'PR_05', name: 'Nexus Relay Station',  specialDefense: 'TRACE_ACCELERATOR', firewallHP: 100 },
  { id: 'PR_06', name: 'DarkNet Gateway',      specialDefense: 'TRACE_ACCELERATOR', firewallHP: 130 },
];

// Milestone nodes keyed by storyArchive.length at time of job selection
const MILESTONE_NODES = {
  3: { id: 'ML_03', name: 'Omni-Corp Gateway', specialDefense: 'ENCRYPTED_LOGS',    firewallHP: 120 },
  7: { id: 'ML_07', name: 'Helix Blacksite',   specialDefense: 'TRACE_ACCELERATOR', firewallHP: 200 },
};

const TARTARUS_NODE_DEF = {
  id: 'TARTARUS', name: 'Tartarus Node', specialDefense: 'TRACE_ACCELERATOR', firewallHP: 400,
};

// ─── Safehouse Roster ─────────────────────────────────────────────────────────
// On HEAT_BUSTED the player is forced to a new location drawn randomly from
// this roster, excluding the current safehouse.

const SAFEHOUSE_ROSTER = [
  { id: 'ALPHA',  color: 'cyan'    },
  { id: 'TANGO',  color: 'amber'   },
  { id: 'ECHO',   color: 'emerald' },
  { id: 'GHOST',  color: 'slate'   },
  { id: 'WRAITH', color: 'fuchsia' },
];

// ─── Haptics ──────────────────────────────────────────────────────────────────
// Safe wrapper — no-ops silently on desktop and browsers without Vibration API.

const haptic = (pattern) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildInitialToolState = () =>
  Object.fromEntries(toolsConfig.map(t => [t.id, { cooldownRemaining: 0 }]));

const buildInitialUpgradeState = () =>
  Object.fromEntries(upgradesConfig.map(u => [u.id, { level: 0 }]));

const pickSkimNode = () =>
  SKIM_NODES[Math.floor(Math.random() * SKIM_NODES.length)];

const pickPriorityNode = (archiveLen) =>
  MILESTONE_NODES[archiveLen] ??
  PRIORITY_NODES[Math.floor(Math.random() * PRIORITY_NODES.length)];

const appendLog = (log, entry) =>
  [...log, entry].slice(-MAX_LOG_ENTRIES);

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

const calcPotentialIntel = (jobType) => {
  if (jobType === 'tartarus') return TARTARUS_INTEL;
  if (jobType === 'priority') return Math.floor(PRIORITY_INTEL_MIN + Math.random() * (PRIORITY_INTEL_MAX - PRIORITY_INTEL_MIN));
  return Math.floor(SKIM_INTEL_MIN + Math.random() * (SKIM_INTEL_MAX - SKIM_INTEL_MIN));
};

// ─── Store ────────────────────────────────────────────────────────────────────

const _initialNode = pickSkimNode();

const useGameStore = create(
  persist(
    (set, get) => ({
      // ── Persistent meta ──────────────────────────────────────────────────
      saveVersion: SAVE_VERSION,

      // ── Player resources ─────────────────────────────────────────────────
      intelFragments: 0,

      // ── Upgrades ─────────────────────────────────────────────────────────
      upgrades: buildInitialUpgradeState(),

      // ── Narrative archive ─────────────────────────────────────────────────
      storyArchive: [],

      // ── Session state ────────────────────────────────────────────────────
      status:               'hacking',  // 'hacking' | 'transit' | 'victory' | 'game_over'
      transitOutcome:       'escaped',  // 'success' | 'escaped' | 'trace_busted' | 'heat_busted'
      currentJobType:       'skim',     // 'skim' | 'priority' | 'tartarus'
      digitalTrace:         0,
      physicalHeat:         0,
      firewallHealth:       _initialNode.firewallHP,
      sessionIntelEarned:   0,
      sessionPotentialIntel: 0,
      packUpHeat:           0,
      packUpTrace:          0,

      // ── Safehouse ────────────────────────────────────────────────────────
      currentSafehouse: SAFEHOUSE_ROSTER[0],

      // ── User settings ─────────────────────────────────────────────────────
      settings: {
        masterVolume:     0.8,
        sfxEnabled:       true,
        ambienceEnabled:  true,
        hapticsEnabled:   true,
        shakeEnabled:     true,
        crtEnabled:       true,
      },

      // ── Current node ─────────────────────────────────────────────────────
      currentNode:      _initialNode,
      firewallRevealed: false,

      // ── Tool cooldowns ───────────────────────────────────────────────────
      toolState: buildInitialToolState(),

      // ── Terminal log ─────────────────────────────────────────────────────
      terminalLog: nodeBootLog(_initialNode),

      // ─── TICK ─────────────────────────────────────────────────────────
      tick: () => {
        const s = get();
        if (s.status !== 'hacking') return;

        // Physical Heat — SIGNAL upgrade reduces rate by 10% per level
        const signalLevel    = s.upgrades['SIGNAL']?.level ?? 0;
        const heatMultiplier = Math.max(0, 1 - signalLevel * 0.10);
        const heatGain       = BASE_HEAT_PER_TICK * heatMultiplier;

        // Digital Trace — TRACE_ACCELERATOR node multiplies passive rate
        const isTraceAccel    = s.currentNode?.specialDefense === 'TRACE_ACCELERATOR';
        const traceMultiplier = isTraceAccel ? TRACE_ACCEL_MULTIPLIER : 1;
        const traceGain =
          (s.digitalTrace >= TRACE_ACCEL_THRESHOLD ? BASE_TRACE_HIGH : BASE_TRACE_LOW)
          * traceMultiplier;

        // Decrement all tool cooldowns
        const newToolState = Object.fromEntries(
          Object.entries(s.toolState).map(([id, ts]) => [
            id,
            { cooldownRemaining: Math.max(0, ts.cooldownRemaining - 1) },
          ])
        );

        const newHeat  = Math.min(100, s.physicalHeat  + heatGain);
        const newTrace = Math.min(100, s.digitalTrace + traceGain);

        set({ physicalHeat: newHeat, digitalTrace: newTrace, toolState: newToolState });

        // Heat bust is more severe (bank wipe) — check first
        if (newHeat  >= 100) { get().packUp('heat_busted');  return; }
        if (newTrace >= 100) { get().packUp('trace_busted'); return; }
      },

      // ─── EXECUTE COMMAND ──────────────────────────────────────────────
      executeCommand: (toolId) => {
        const s = get();
        if (s.status !== 'hacking') return;

        const tool = toolsConfig.find(t => t.id === toolId);
        if (!tool) return;
        if ((s.toolState[toolId]?.cooldownRemaining ?? 0) > 0) return;

        // Tool is firing — SFX + short haptic tick
        AudioManager.playSFX('thock');
        if (s.settings?.hapticsEnabled) haptic(15);

        // RAM upgrade reduces cooldown by 10% per level
        const ramLevel = s.upgrades['RAM']?.level ?? 0;
        const actualCooldown = Math.max(
          1,
          Math.floor(tool.baseCooldown * (1 - ramLevel * 0.10))
        );

        // Base effects from config
        let firewallDamage = tool.baseEffect.firewallDamage ?? 0;
        const traceGain    = tool.baseEffect.traceGain      ?? 0;
        const heatGain     = tool.baseEffect.heatGain       ?? 0;

        // BYPASS_STRENGTH upgrade adds +10 damage per level
        if (toolId === 'BYPASS') {
          const bsLevel = s.upgrades['BYPASS_STRENGTH']?.level ?? 0;
          firewallDamage += bsLevel * 10;
        }

        // Compute resulting values
        const prevFirewall = s.firewallHealth;
        const newFirewall  = Math.max(0, prevFirewall - firewallDamage);
        const newTrace     = Math.min(100, Math.max(0, s.digitalTrace + traceGain));
        const newHeat      = Math.min(100, s.physicalHeat + heatGain);

        // ── DECRYPT special path ───────────────────────────────────────
        if (toolId === 'DECRYPT') {
          const isEncrypted = s.currentNode?.specialDefense === 'ENCRYPTED_LOGS';
          const alreadyDone = s.firewallRevealed;

          let log = appendLog(s.terminalLog,
            `> DECRYPT // +${heatGain}% HEAT | TRACE: ${newTrace.toFixed(0)}%`);

          if (isEncrypted && !alreadyDone) {
            log = appendLog(log, `>> ENCRYPTED LOGS CRACKED — FW: ${s.firewallHealth}`);
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

          if (newHeat >= 100) get().packUp('heat_busted');
          return;
        }

        // ── Win condition — firewall breached ─────────────────────────
        const breached = prevFirewall > 0 && newFirewall <= 0;

        if (breached) {
          const intelEarned = s.sessionPotentialIntel;
          const isTartarus  = s.currentJobType === 'tartarus';
          const isPriority  = s.currentJobType === 'priority' || isTartarus;

          // Sequential fragment — only for priority/tartarus missions
          let newArchive  = s.storyArchive;
          let fragmentIdx = null;
          if (isPriority && s.storyArchive.length < storyFragments.length) {
            fragmentIdx = s.storyArchive.length;
            newArchive  = [...s.storyArchive, fragmentIdx];
          }

          let log = appendLog(s.terminalLog,
            `> ${toolId} // FW: 0 | TRACE: ${newTrace.toFixed(0)}%`);
          log = appendLog(log, `>> [ACCESS GRANTED] +${intelEarned} FRAGS`);
          if (fragmentIdx !== null) {
            log = appendLog(log,
              `>> FRAGMENT #${String(fragmentIdx + 1).padStart(3, '0')} DECODED — CHECK ARCHIVE`);
          }
          log = appendLog(log,
            isTartarus
              ? '// TARTARUS BREACHED. EXECUTING CELL RELEASE...'
              : '// NODE BREACHED. EXTRACTING AND RELOCATING...');

          set({
            status:               isTartarus ? 'victory' : 'transit',
            transitOutcome:       'success',
            physicalHeat:         0,
            packUpHeat:           s.physicalHeat,
            packUpTrace:          s.digitalTrace,
            firewallHealth:       0,
            digitalTrace:         newTrace,
            intelFragments:       s.intelFragments + intelEarned,
            sessionIntelEarned:   intelEarned,
            storyArchive:         newArchive,
            terminalLog:          log,
            toolState: { ...s.toolState, [toolId]: { cooldownRemaining: actualCooldown } },
          });
          return;
        }

        // ── Ongoing hack — firewall still standing ─────────────────────
        const isEncrypted = s.currentNode?.specialDefense === 'ENCRYPTED_LOGS';
        const fwDisplay   = (isEncrypted && !s.firewallRevealed) ? '???' : `${Math.ceil(newFirewall)}`;

        let log = appendLog(s.terminalLog,
          `> ${toolId} // FW: ${fwDisplay} | TRACE: ${newTrace.toFixed(0)}%`);

        set({
          firewallHealth: newFirewall,
          digitalTrace:   newTrace,
          physicalHeat:   newHeat,
          terminalLog:    log,
          toolState: { ...s.toolState, [toolId]: { cooldownRemaining: actualCooldown } },
        });

        if (newHeat >= 100) get().packUp('heat_busted');
      },

      // ─── PACK UP ──────────────────────────────────────────────────────
      // cause: 'escaped' | 'trace_busted' | 'heat_busted'
      packUp: (cause = 'escaped') => {
        const s = get();

        const isTartarus = s.currentNode?.id === 'TARTARUS';

        // Intel penalty based on exit cause
        let intelEarned = 0;
        let newBank     = s.intelFragments;
        if (cause === 'escaped') {
          intelEarned = Math.floor(s.sessionPotentialIntel * 0.5);
          newBank     = s.intelFragments + intelEarned;
        } else if (cause === 'heat_busted') {
          newBank = 0; // bank wipe
        }
        // trace_busted: 0 earned, bank unchanged

        // Crash haptic for involuntary disconnects
        if (cause !== 'escaped' && s.settings?.hapticsEnabled) haptic([200, 100, 300]);

        const logMsg =
          cause === 'escaped'      ? '// PACKING UP. SIGNAL REROUTING...' :
          cause === 'trace_busted' ? '!! TRACE CRITICAL — CONNECTION SEVERED !!' :
                                     '!! HEAT CRITICAL — SAFEHOUSE COMPROMISED !!';

        // TARTARUS bust (not voluntary escape) → game over
        const nextStatus = (isTartarus && cause !== 'escaped') ? 'game_over' : 'transit';

        // On HEAT_BUSTED: rotate to a random different safehouse
        let nextSafehouse = s.currentSafehouse;
        if (cause === 'heat_busted') {
          const others = SAFEHOUSE_ROSTER.filter(sh => sh.id !== s.currentSafehouse.id);
          nextSafehouse = others[Math.floor(Math.random() * others.length)];
        }

        set({
          status:             nextStatus,
          transitOutcome:     cause,
          physicalHeat:       0,
          packUpHeat:         s.physicalHeat,
          packUpTrace:        s.digitalTrace,
          intelFragments:     newBank,
          sessionIntelEarned: intelEarned,
          currentSafehouse:   nextSafehouse,
          terminalLog:        appendLog(s.terminalLog, logMsg),
        });
      },

      // ─── START NEW SESSION ────────────────────────────────────────────
      // jobType: 'skim' | 'priority' | 'tartarus'
      startNewSession: (jobType = 'skim') => {
        const s = get();

        let nextNode;
        if (jobType === 'tartarus') {
          nextNode = TARTARUS_NODE_DEF;
        } else if (jobType === 'priority') {
          nextNode = pickPriorityNode(s.storyArchive.length);
        } else {
          nextNode = pickSkimNode();
        }

        const potentialIntel = calcPotentialIntel(jobType);

        set({
          status:                'hacking',
          currentJobType:        jobType,
          digitalTrace:          0,
          physicalHeat:          0,
          firewallHealth:        nextNode.firewallHP,
          currentNode:           nextNode,
          firewallRevealed:      false,
          sessionIntelEarned:    0,
          sessionPotentialIntel: potentialIntel,
          packUpHeat:            0,
          packUpTrace:           0,
          terminalLog:           nodeBootLog(nextNode),
          toolState:             buildInitialToolState(),
        });
      },

      // ─── RESET GAME ───────────────────────────────────────────────────
      // Full reset — called from VICTORY and GAME_OVER overlays.
      resetGame: () => {
        const freshNode = pickSkimNode();
        set({
          status:                'hacking',
          intelFragments:        0,
          upgrades:              buildInitialUpgradeState(),
          storyArchive:          [],
          currentJobType:        'skim',
          digitalTrace:          0,
          physicalHeat:          0,
          firewallHealth:        freshNode.firewallHP,
          currentNode:           freshNode,
          firewallRevealed:      false,
          sessionIntelEarned:    0,
          sessionPotentialIntel: 0,
          packUpHeat:            0,
          packUpTrace:           0,
          transitOutcome:        'escaped',
          terminalLog:           nodeBootLog(freshNode),
          toolState:             buildInitialToolState(),
        });
      },

      // ─── UPDATE SETTINGS ──────────────────────────────────────────────
      updateSettings: (patch) => set((state) => ({
        settings: { ...state.settings, ...patch },
      })),

      // ─── PURCHASE UPGRADE ─────────────────────────────────────────────
      purchaseUpgrade: (upgradeId) => {
        const s = get();
        const cfg = upgradesConfig.find(u => u.id === upgradeId);
        if (!cfg) return;

        const currentLevel = s.upgrades[upgradeId]?.level ?? 0;
        if (currentLevel >= cfg.maxLevel) return;

        const cost = Math.floor(cfg.baseCost * Math.pow(cfg.costScaling, currentLevel));
        if (s.intelFragments < cost) return;

        if (s.settings?.hapticsEnabled) haptic(15);
        set({
          intelFragments: s.intelFragments - cost,
          upgrades: {
            ...s.upgrades,
            [upgradeId]: { level: currentLevel + 1 },
          },
        });
      },
    }),

    // ─── Persist ──────────────────────────────────────────────────────────
    {
      name: 'ghost-protocol-save',
      version: SAVE_VERSION,

      migrate: (persistedState, version) => {
        let state = persistedState;

        if (version < 2) {
          state = { ...state, upgrades: buildInitialUpgradeState() };
        }

        if (version < 3) {
          const { credits, sessionCreditsEarned, ...rest } = state;
          state = {
            ...rest,
            intelFragments:     credits ?? 0,
            sessionIntelEarned: 0,
            storyArchive:       [],
            currentNode:        pickSkimNode(),
            firewallRevealed:   false,
            transitOutcome:     'escaped',
          };
        }

        if (version < 4) {
          const outcomeMap = { voluntary: 'escaped', forced: 'trace_busted' };
          state = {
            ...state,
            currentJobType:        state.currentJobType        ?? 'skim',
            sessionPotentialIntel: state.sessionPotentialIntel ?? 0,
            transitOutcome:        outcomeMap[state.transitOutcome] ?? state.transitOutcome ?? 'escaped',
          };
        }

        return state;
      },
    }
  )
);

export default useGameStore;
