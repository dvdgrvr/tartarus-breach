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
  FIREWALL_INITIAL_HP,
  SKIM_INTEL_MIN,
  SKIM_INTEL_MAX,
  PRIORITY_INTEL_MIN,
  PRIORITY_INTEL_MAX,
  TARTARUS_INTEL,
  MAX_LOG_ENTRIES,
  SAVE_VERSION,
  PULSE_INTERVAL_TICKS,
  PULSE_WINDOW_TICKS,
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
  { id: 'ALPHA',  color: 'cyan',    trait: 'Standard',    desc: 'No buffs or debuffs.'                                       },
  { id: 'TANGO',  color: 'amber',   trait: 'Shielded',    desc: '-20% Heat generation, +10% RAM cooldowns.', heatMod: 0.8,  ramMod: 1.1  },
  { id: 'ECHO',   color: 'emerald', trait: 'Ghost',       desc: '-20% Trace generation, -10% FW damage.',    traceMod: 0.8, dmgMod: 0.9  },
  { id: 'GHOST',  color: 'slate',   trait: 'Efficient',   desc: '+20% Intel earned, +15% Heat generation.',  intelMod: 1.2, heatMod: 1.15 },
  { id: 'WRAITH', color: 'fuchsia', trait: 'Overclocked', desc: '+20% FW damage, +15% Trace generation.',    dmgMod: 1.2,   traceMod: 1.15 },
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

// Dynamic FW scaling — 1.15× curve from the base 100 HP.
// level is 1-based (fragment 1 = level 1 = FW 100).
// Formula: Math.floor(FIREWALL_INITIAL_HP * 1.15^(level-1))
//   Level 1  →  100 HP   Level 5  →  175 HP   Level  9  →  305 HP
//   Level 2  →  115 HP   Level 6  →  201 HP   Level 10  →  351 HP
//   Level 3  →  132 HP   Level 7  →  231 HP   Level 11  →  404 HP
//   Level 4  →  152 HP   Level 8  →  266 HP   Level 12  →  465 HP
const calcScaledFW = (level) =>
  Math.floor(FIREWALL_INITIAL_HP * Math.pow(1.15, level - 1));

const AMBIENT_DETAILS = [
  '// AMBIENT: Safehouse ALPHA is currently 12ms from the nearest patrol.',
  '// AMBIENT: Cooling fans at 80% to mask thermal signature.',
  '// AMBIENT: Last operator through this node was 3 hours ago.',
  '// AMBIENT: Municipal grid is under light surveillance. Window is open.',
  '// AMBIENT: Rain interference masking our signal. Good timing.',
  '// AMBIENT: Masha says the night shift logs slower. Work the gap.',
];

const getMashaReaction = (type, trace) => {
  if (type === 'breach') {
    if (trace < 15) return "// MEMO_FROM_MASHA: 'Total ghost. They never even saw the packet. Impressive work.'";
    if (trace > 85) return "// MEMO_FROM_MASHA: 'That was way too loud. You're leaving footprints everywhere—next time, be more surgical.'";
    return "// MEMO_FROM_MASHA: 'Node down. Clean enough. Bank the intel and move.'";
  }
  if (type === 'escaped') {
    if (trace > 95) return "// MEMO_FROM_MASHA: 'My heart stopped. You almost didn't make it out. Don't push your luck like that again.'";
    return "// MEMO_FROM_MASHA: 'Good call on the retreat. Live to hack another day.'";
  }
  if (type === 'bust') {
    return "// MEMO_FROM_MASHA: 'Damn it! They traced the uplink. That node is burned and our signal is blacklisted. Drop the connection!'";
  }
  return null;
};

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
  lines.push(AMBIENT_DETAILS[Math.floor(Math.random() * AMBIENT_DETAILS.length)]);
  return lines;
};

const calcPotentialIntel = (jobType) => {
  if (jobType === 'tartarus') return TARTARUS_INTEL;
  if (jobType === 'priority') return Math.floor(PRIORITY_INTEL_MIN + Math.random() * (PRIORITY_INTEL_MAX - PRIORITY_INTEL_MIN));
  return Math.floor(SKIM_INTEL_MIN + Math.random() * (SKIM_INTEL_MAX - SKIM_INTEL_MIN));
};

// ─── Store ────────────────────────────────────────────────────────────────────

// A hidden, low-threat node specifically for the very first time the app loads
const TEST_NODE = { 
  id: 'TEST_01', 
  name: 'Local Test Router', 
  specialDefense: null, 
  firewallHP: 200, 
  traceMultiplier: 0.2,
  heatMultiplier: 0.2,
  damageMod: 2.5
};
const _initialNode = TEST_NODE;

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
      storyArchive:       [],
      decryptedFragments: [],

      // ── Pulse mechanic ───────────────────────────────────────────────────
      tickCount:            0,         // persistent counter driving the pulse window

      // ── Session state ────────────────────────────────────────────────────
      status:               'transit',  // 'hacking' | 'transit' | 'victory' | 'game_over' | 'resolved'
      nextStatus:           'transit',  // Tracks where the Disconnect button should go
      isBreaching:          false,
      isPerfectBreach:      false,
      isPaused:             false,
      pulseActive:          false,
      systemOverride:       null,       // ── PHASE 4: Override State
      transitOutcome:       'initial',  // 'initial' | 'success' | 'escaped' | 'trace_busted' | 'heat_busted'
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

      // ── Endless mode ──────────────────────────────────────────────────────
      hasBeatenGame:     false,  // global unlock — never wiped by resetGame
      tartarusBeaten:    false,  // per-run flag, reset on new campaign
      darknetTier:       1,
      highestDarknetTier: 1,     // all-time best — never wiped by resetGame
      consumables:       { zeroDay: 0, coolant: 0 },

      // ── User settings ─────────────────────────────────────────────────────
      settings: {
        masterVolume:    0.8,
        sfxEnabled:      true,
        ambienceEnabled: true,
        hapticsEnabled:  true,
        shakeEnabled:    true,
        crtEnabled:      true,
        cyberdeliaMode:  false,  // global 1995 Cyberdelia visual override
      },

      isSettingsModalOpen: false,
      toggleSettingsModal: (isOpen) => set({ isSettingsModalOpen: isOpen }),

      // ── Tutorial flags — one-shot hardware alerts ─────────────────────────
      // Each flag fires once and is then persisted so it never repeats.
      tutorialFlags: {
        traceWarning:   false,
        heatWarning:    false,
        decryptWarning: false,
        siphonWarning:  false,
        bypassPrompt:   false,
        scanPrompt:     false,
        heatTutorial:   false,
        decryptPrompt:  false,
        pulsePrompt:    false,
      },

      // ── Narrative flags — one-shot story moments ──────────────────────────
      isFirstBoot:    true,   // triggers the intro transmission on first load
      hasFirstBypass: false,  // triggers operator flavor line on first BYPASS use

      // ── Narrative modal ───────────────────────────────────────────────────
      // Set to the fragment index when a new fragment is first unlocked; null otherwise.
      // isReplay suppresses the modal entirely for grind runs.
      pendingFragmentIdx: null,
      isReplay:           false,

      // ── Current node ─────────────────────────────────────────────────────
      currentNode:      _initialNode,
      firewallRevealed: false,

      // ── Tool cooldowns ───────────────────────────────────────────────────
      toolState: buildInitialToolState(),

      // ── Terminal log ─────────────────────────────────────────────────────
      terminalLog: nodeBootLog(_initialNode),

      // ─── TICK ─────────────────────────────────────────────────────────
      setPaused: (paused) => set({ isPaused: paused }),

      // ── THE DISCONNECT ACTION ──
      // Fired when the player is ready to leave the frozen 'resolved' state
      leaveNode: () => set(s => ({
        status: s.nextStatus || 'transit',
        physicalHeat: 0,
        digitalTrace: 0,
        isPerfectBreach: false
      })),

triggerFirstBoot: () => {
        set(cur => {
          let log = appendLog(cur.terminalLog, '// KERNEL_INITIALIZED: Safehouse ALPHA online.');
          log = appendLog(log, '// ENCRYPTION_ACTIVE: Signal routed through Belgrade Node.');
          log = appendLog(log, "// MEMO_FROM_MASHA: 'Operator, you're clear. The Tartarus Node is dark, but municipal servers are vulnerable. We need fragments to map the breach.'");
          log = appendLog(log, "// MASHA: 'Target acquired. Use [ BYPASS ] to hammer their firewall.'"); // <-- Added Instruction
          return { 
            terminalLog: log, 
            isFirstBoot: false,
            tutorialFlags: { ...cur.tutorialFlags, bypassPrompt: true } // <-- Turns on the UI Glow
          };
        });
      },

      tick: () => {
        const s = get();
        if (s.status !== 'hacking' || s.isPaused) return;

        // ── PHASE 4: SYSTEM OVERRIDE TICK LOGIC ──
        let currentOverride = s.systemOverride;
        let spikeTrace      = 0;
        let logMsg          = null;

        if (currentOverride !== null) {
          currentOverride -= 1;
          if (currentOverride <= 0) {
            spikeTrace = 25; // Massive penalty for failing
            currentOverride = null;
            logMsg = '!! ACTIVE COUNTER-MEASURE FAILED — TRACE SPIKE !!';
            AudioManager.playSFX('error');
            if (s.settings?.hapticsEnabled) haptic([200, 50, 200]);
          }
        } else {
          // 5% chance per tick to spawn an override if trace > 30% and not in low-sec
          if (s.digitalTrace > 30 && s.currentJobType !== 'skim' && Math.random() < 0.05) {
            currentOverride = 3; // 3 seconds to react
            logMsg = '[!] WARNING: ACTIVE COUNTER-MEASURE DETECTED. INTERCEPT REQUIRED.';
            AudioManager.playSFX('error');
            if (s.settings?.hapticsEnabled) haptic([50, 100, 50]);
          }
        }

        // Physical Heat — SIGNAL upgrade reduces rate by 10% per level
        const signalLevel    = s.upgrades['SIGNAL']?.level ?? 0;
        const heatMultiplier = Math.max(0, 1 - signalLevel * 0.10);
        const heatGain       = BASE_HEAT_PER_TICK * heatMultiplier * (s.currentSafehouse?.heatMod ?? 1);

        // Digital Trace — node may supply its own traceMultiplier (darknet tiers);
        // otherwise fall back to the TRACE_ACCELERATOR constant or 1.
        const isTraceAccel    = s.currentNode?.specialDefense === 'TRACE_ACCELERATOR';
        const traceMultiplier = s.currentNode?.traceMultiplier
          ?? (isTraceAccel ? TRACE_ACCEL_MULTIPLIER : 1);
        const traceGain =
          (s.digitalTrace >= TRACE_ACCEL_THRESHOLD ? BASE_TRACE_HIGH : BASE_TRACE_LOW)
          * traceMultiplier
          * (s.currentSafehouse?.traceMod ?? 1);

        // Decrement all tool cooldowns
        const newToolState = Object.fromEntries(
          Object.entries(s.toolState).map(([id, ts]) => [
            id,
            { cooldownRemaining: Math.max(0, ts.cooldownRemaining - 1) },
          ])
        );

        const newHeat  = Math.min(100, s.physicalHeat  + heatGain);
        const newTrace = Math.min(100, s.digitalTrace + traceGain + spikeTrace);

        const newTickCount = s.tickCount + 1;
        const isPulse      = (newTickCount % PULSE_INTERVAL_TICKS) < PULSE_WINDOW_TICKS;

        let newLog = s.terminalLog;
        if (logMsg) newLog = appendLog(newLog, logMsg);

        set({
          physicalHeat: newHeat,
          digitalTrace: newTrace,
          toolState: newToolState,
          tickCount: newTickCount,
          pulseActive: isPulse,
          systemOverride: currentOverride,
          terminalLog: newLog
        });

      // ── In-World Tutorial Prompts (Only triggers during the first node) ──
        if (newTrace >= 40 && !s.tutorialFlags.scanPrompt && !s.tutorialFlags.siphonWarning) {
          set(cur => ({
            terminalLog:  appendLog(cur.terminalLog, "// MASHA: 'Watch your Trace meter! If it hits 100%, they kill the uplink. Use [ SCAN ] to drop it.'"),
            tutorialFlags: { ...cur.tutorialFlags, scanPrompt: true },
          }));
        }
        if (newHeat >= 40 && !s.tutorialFlags.heatTutorial && !s.tutorialFlags.siphonWarning) {
          set(cur => ({
            terminalLog:  appendLog(cur.terminalLog, "// MASHA: 'Our physical Heat is rising. If it hits 100%, the safehouse gets raided. Work fast.'"),
            tutorialFlags: { ...cur.tutorialFlags, heatTutorial: true },
          }));
        }
        if (s.pulseActive && !s.tutorialFlags.pulsePrompt && !s.tutorialFlags.siphonWarning) {
          set(cur => ({
            terminalLog: appendLog(cur.terminalLog, "// MASHA: 'See the Trace bar pulsing? Hit [ PULSE ] when it says SYNC and drop Trace twice as fast!'"),
            tutorialFlags: { ...cur.tutorialFlags, pulsePrompt: true },
          }));
        }

        // ── Hardware Alerts — one-shot stealth tutorial messages ───────────
        if (newTrace > 70 && !s.tutorialFlags.traceWarning) {
          set(cur => ({
            terminalLog:  appendLog(cur.terminalLog, '[!] STROBE_DETECTION: Firewall is mapping your IP. Use SCAN to recalibrate.'),
            tutorialFlags: { ...cur.tutorialFlags, traceWarning: true },
          }));
        }
        if (newHeat > 70 && !s.tutorialFlags.heatWarning) {
          set(cur => ({
            terminalLog:  appendLog(cur.terminalLog, '[!] THERMAL_FLARE: Safehouse emission levels critical. Prepare to PACK UP.'),
            tutorialFlags: { ...cur.tutorialFlags, heatWarning: true },
          }));
        }

        // Heat bust is more severe (bank wipe) — check first
        if (newHeat  >= 100) { get().packUp('heat_busted');  return; }
        if (newTrace >= 100) { get().packUp('trace_busted'); return; }
      },

      // ─── PHASE 4: RESOLVE OVERRIDE ───
      resolveOverride: () => {
        const s = get();
        if (s.systemOverride === null) return;
        
        if (s.settings?.hapticsEnabled) haptic([50, 50, 50]);
        AudioManager.playSFX('thock');
        
        set({
          systemOverride: null,
          terminalLog: appendLog(s.terminalLog, '>> COUNTER-MEASURE INTERCEPTED. TRACE NEUTRALIZED.')
        });
      },

      // ─── EXECUTE COMMAND ──────────────────────────────────────────────
      executeCommand: (toolId) => {
        const s = get();
        if (s.status !== 'hacking') return;

        const tool = toolsConfig.find(t => t.id === toolId);
        if (!tool) return;
        if ((s.toolState[toolId]?.cooldownRemaining ?? 0) > 0) return;

        // Tool is firing — SFX + Asymmetric Haptics
        AudioManager.playSFX('thock');
        if (s.settings?.hapticsEnabled) {
          if (toolId === 'SCAN') {
            haptic(10); // Light, snappy click
          } else if (toolId === 'BYPASS') {
            haptic([30, 40, 30]); // Heavy double-thud
          } else if (toolId === 'PULSE') {
            haptic([15, 20, 15]); // Quick flutter
          } else if (toolId === 'DECRYPT') {
            haptic(50); // Sharp, heavy strike upon successful completion of the hold
          } else {
            haptic(15); // Fallback
          }
        }

        // Clear tutorial flags if the player follows Masha's instructions
        if (toolId === 'BYPASS' && s.tutorialFlags.bypassPrompt) set(cur => ({ tutorialFlags: { ...cur.tutorialFlags, bypassPrompt: false } }));
        if (toolId === 'SCAN' && s.tutorialFlags.scanPrompt) set(cur => ({ tutorialFlags: { ...cur.tutorialFlags, scanPrompt: false } }));
        if (toolId === 'PULSE' && s.tutorialFlags.pulsePrompt) set(cur => ({ tutorialFlags: { ...cur.tutorialFlags, pulsePrompt: false } }));
        if (toolId === 'DECRYPT' && s.tutorialFlags.decryptPrompt) set(cur => ({ tutorialFlags: { ...cur.tutorialFlags, decryptPrompt: false } }));

        // RAM upgrade reduces cooldown by 10% per level; TANGO safehouse adds 10%
        const ramLevel = s.upgrades['RAM']?.level ?? 0;
        const actualCooldown = Math.max(
          1,
          Math.floor(tool.baseCooldown * (1 - ramLevel * 0.10) * (s.currentSafehouse?.ramMod ?? 1))
        );

        // Base effects from config
        let firewallDamage = tool.baseEffect.firewallDamage ?? 0;
        const traceGain    = tool.baseEffect.traceGain      ?? 0;
        const heatGain     = tool.baseEffect.heatGain       ?? 0;

        // BYPASS_STRENGTH upgrade adds +10 damage per level
        if (toolId === 'BYPASS') {
          const bsLevel = s.upgrades['BYPASS_STRENGTH']?.level ?? 0;
          firewallDamage += bsLevel * 10;

        // Hardware Alert — warn once if FW is hidden and player hasn't run DECRYPT
        if (s.currentNode?.specialDefense === 'ENCRYPTED_LOGS' && !s.firewallRevealed && !s.tutorialFlags.decryptWarning) {
          set(cur => ({
            terminalLog:  appendLog(cur.terminalLog, '[!] DATA_OBFUSCATION: Target metrics are hidden. Run DECRYPT to reveal FW health.'),
            tutorialFlags: { ...cur.tutorialFlags, decryptWarning: true, decryptPrompt: true }, // Add prompt here
          }));
        }

          // Narrative flavor — fires once on the player's very first BYPASS
          if (!s.hasFirstBypass) {
            set(cur => ({
              terminalLog:    appendLog(cur.terminalLog, '// OPERATOR: First breach established. The grid is watching. Move fast.'),
              hasFirstBypass: true,
            }));
          }
        }

        // Safehouse damage modifier (ECHO: −10%, WRAITH: +20%)
        const nodeDmgMod = s.currentNode?.damageMod ?? 1;
        firewallDamage = Math.floor(firewallDamage * (s.currentSafehouse?.dmgMod ?? 1));

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
          // 1. Violent haptic shockwave for the breach
          if (s.settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
             navigator.vibrate([100, 50, 150]);
          }

          const isPerfect    = newTrace >= 90;
          const intelEarned  = isPerfect
            ? Math.floor(s.sessionPotentialIntel * 1.25)
            : s.sessionPotentialIntel;
          const isTartarus   = s.currentJobType === 'tartarus';
          const isDarknet    = s.currentJobType === 'darknet';
          const isPriority   = s.currentJobType === 'priority' || isTartarus;

          let newArchive  = s.storyArchive;
          let fragmentIdx = null;
          if (isPriority && !s.isReplay && s.storyArchive.length < storyFragments.length) {
            fragmentIdx = s.storyArchive.length;
            newArchive  = [...s.storyArchive, fragmentIdx];
          }

          const newDarknetTier = isDarknet ? s.darknetTier + 1 : s.darknetTier;
          const newHighestTier = Math.max(s.highestDarknetTier, newDarknetTier);

          let log = appendLog(s.terminalLog,
            `> ${toolId} // FW: 0 | TRACE: ${newTrace.toFixed(0)}%`);
          log = appendLog(log, `>> [ ACCESS GRANTED ]`);

          const mashaLine = getMashaReaction('breach', newTrace);
          if (mashaLine) log = appendLog(log, mashaLine);

          if (isPerfect) {
            log = appendLog(log, '>> PERFECT BREACH: Tactical risk recognized. +25% Intel bonus applied.');
          }
          log = appendLog(log, `>> NODE BREACHED. PAYLOAD SECURED: +${intelEarned} IF.`);
          if (fragmentIdx !== null) {
            log = appendLog(log,
              `>> FRAGMENT #${String(fragmentIdx + 1).padStart(3, '0')} DECODED — CHECK ARCHIVE.`);
          }
          log = appendLog(log, '// AWAITING MANUAL DISCONNECT...');

          set({
            status:             'resolved', // Pauses the hacking loop without leaving the screen
            nextStatus:         isTartarus ? 'victory' : 'transit',
            transitOutcome:     'success',
            packUpHeat:         s.physicalHeat, // Freeze heat gauge
            packUpTrace:        newTrace,       // Freeze trace gauge
            systemOverride:     null,
            firewallHealth:     0,
            digitalTrace:       newTrace,
            intelFragments:     s.intelFragments + intelEarned,
            sessionIntelEarned: intelEarned,
            storyArchive:       newArchive,
            hasBeatenGame:      s.hasBeatenGame || isTartarus,
            tartarusBeaten:     s.tartarusBeaten || isTartarus,
            darknetTier:        newDarknetTier,
            highestDarknetTier: newHighestTier,
            pendingFragmentIdx: s.isReplay ? null : fragmentIdx,
            terminalLog:        log,
            toolState: { ...s.toolState, [toolId]: { cooldownRemaining: actualCooldown } },
            isPerfectBreach:    isPerfect,
            isBreaching:        false, // Remove overlay logic
          });
          return;
        }

        // ── Ongoing hack — firewall still standing ─────────────────────
        const isEncrypted = s.currentNode?.specialDefense === 'ENCRYPTED_LOGS';
        const fwDisplay   = (isEncrypted && !s.firewallRevealed) ? '???' : `${Math.ceil(newFirewall)}`;

        // Perfect Sync: PULSE during pulse window negates and doubles the trace cost
        const isPerfectSync = toolId === 'PULSE' && s.pulseActive;
        const finalTrace    = isPerfectSync
          ? Math.max(0, s.digitalTrace + (traceGain * 2))
          : newTrace;

        if (isPerfectSync && s.settings?.hapticsEnabled) haptic([30, 50, 30]);

        let log = appendLog(s.terminalLog,
          `> ${toolId} // FW: ${fwDisplay} | TRACE: ${finalTrace.toFixed(0)}%`);
        if (isPerfectSync) {
          log = appendLog(log, '>> PERFECT SYNC: Trace reduction efficiency doubled.');
        }

        set({
          firewallHealth: newFirewall,
          digitalTrace:   finalTrace,
          physicalHeat:   newHeat,
          terminalLog:    log,
          toolState: { ...s.toolState, [toolId]: { cooldownRemaining: actualCooldown } },
        });

        if (newHeat >= 100) get().packUp('heat_busted');
      },

    // ─── PACK UP ──────────────────────────────────────────────────────
      packUp: (cause = 'escaped') => {
        const s = get();
        const isTartarus = s.currentNode?.id === 'TARTARUS';

        let intelEarned = 0;
        let newBank     = s.intelFragments;
        let isGhostExit = false;

        if (cause === 'escaped') {
          isGhostExit = s.digitalTrace >= 95 || s.physicalHeat >= 95;
          const baseMultiplier = isGhostExit ? 0.75 : 0.5; 
          intelEarned = Math.floor(s.sessionPotentialIntel * baseMultiplier * (s.currentSafehouse?.intelMod ?? 1));
          newBank     = s.intelFragments + intelEarned;
        } else if (cause === 'heat_busted') {
          newBank = 0; 
        }

        if (cause !== 'escaped' && s.settings?.hapticsEnabled) haptic([200, 100, 300]);
        if (isGhostExit && s.settings?.hapticsEnabled) haptic([40, 60, 150]);

        let log = s.terminalLog;
        if (cause === 'escaped') {
          log = appendLog(log, '>> [ CONNECTION CLOSED ]');
          const mashaLine = getMashaReaction('escaped', s.digitalTrace);
          if (mashaLine) log = appendLog(log, mashaLine);
          if (isGhostExit) log = appendLog(log, '>> GHOST EXIT: Danger close. 1.5x Intel recovery bonus applied.');
          log = appendLog(log, `>> TACTICAL RETREAT SUCCESSFUL. SALVAGED +${intelEarned} IF.`);
        } else if (cause === 'trace_busted') {
          log = appendLog(log, '!! [ ACCESS DENIED ] !!');
          const mashaLine = getMashaReaction('bust', s.digitalTrace);
          if (mashaLine) log = appendLog(log, mashaLine);
          log = appendLog(log, '!! TRACE CRITICAL — CONNECTION SEVERED.');
        } else {
          log = appendLog(log, '!! [ SYSTEM LOCKDOWN ] !!');
          log = appendLog(log, '!! SAFEHOUSE COMPROMISED. INTEL WIPED.');
        }
        log = appendLog(log, '// AWAITING MANUAL DISCONNECT...');

        const nextStatus = (isTartarus && cause !== 'escaped') ? 'game_over' : 'transit';
        const isDarknet       = s.currentJobType === 'darknet';
        const nextDarknetTier = (isDarknet && cause !== 'escaped') ? 1 : s.darknetTier;

        let nextSafehouse = s.currentSafehouse;
        if (cause === 'heat_busted') {
          const others = SAFEHOUSE_ROSTER.filter(sh => sh.id !== s.currentSafehouse.id);
          nextSafehouse = others[Math.floor(Math.random() * others.length)];
        }

        set({
          status:             'resolved', // ALWAYS pause the UI here
          nextStatus:         nextStatus, // Save where we go when they hit DISCONNECT
          transitOutcome:     cause,
          systemOverride:     null,
          packUpHeat:         s.physicalHeat, 
          packUpTrace:        s.digitalTrace,
          intelFragments:     newBank,
          sessionIntelEarned: intelEarned,
          currentSafehouse:   nextSafehouse,
          darknetTier:        nextDarknetTier,
          terminalLog:        log,
        });
      },

      // ─── START NEW SESSION ────────────────────────────────────────────
      // jobType:     'skim' | 'priority' | 'tartarus' | 'darknet'
      // isReplay:    when true, halve intel and suppress the narrative modal
      // replayLevel: 1-based fragment level for replay runs (sets FW difficulty
      //              to that archived mission's level rather than the frontier)
      startNewSession: (jobType = 'skim', isReplay = false, replayLevel = null) => {
        const s = get();

        // Current story frontier (1-based): the level the *next* fragment sits at.
        // All dynamic FW calculations use this as the baseline for live runs.
        const frontierLevel = s.storyArchive.length + 1;

        let nextNode;
        let firewallHP;

        if (jobType === 'tartarus') {
          // Tartarus is a fixed-difficulty endgame node — not subject to curve scaling.
          nextNode    = TARTARUS_NODE_DEF;
          firewallHP  = TARTARUS_NODE_DEF.firewallHP;

        } else if (jobType === 'darknet') {
          // Darknet has its own tier-based scaling independent of the story curve.
          const tier = s.darknetTier;
          nextNode   = {
            id:              `DARKNET_T${tier}`,
            name:            `Darknet Router — Tier ${tier}`,
            specialDefense:  'DARKNET',
            firewallHP:      150 + tier * 50,
            traceMultiplier: 2 + tier * 0.5,
          };
          firewallHP = nextNode.firewallHP;

        } else if (jobType === 'priority') {
          // Priority Lead: use the 1.15× curve.
          // - First-time run → frontier level (next fragment to unlock).
          // - Archive replay  → the specific fragment's original level, so older
          //   missions stay at their recorded difficulty, not the current frontier.
          const level = (isReplay && replayLevel !== null) ? replayLevel : frontierLevel;
          nextNode   = pickPriorityNode(s.storyArchive.length);
          firewallHP = calcScaledFW(level);

        } else {
          // Use siphonWarning to see if they've finished the tutorial node
          if (!s.tutorialFlags.siphonWarning && !isReplay) {
            nextNode   = TEST_NODE;
            firewallHP = TEST_NODE.firewallHP;
          } else {
            nextNode   = pickSkimNode();
            firewallHP = Math.floor(calcScaledFW(frontierLevel) * 0.70);
          }
        }

        // Darknet intel scales with tier; others use config ranges.
        const basePotential = jobType === 'darknet'
          ? 100 + s.darknetTier * 25
          : calcPotentialIntel(jobType);

        // Replay penalty: 50% intel to prevent archive-grind exploits.
        const potentialIntel = isReplay
          ? Math.floor(basePotential * 0.5)
          : basePotential;

        // Sync firewallHP back onto the node object so any reader of
        // currentNode.firewallHP gets the correct dynamic value.
        const sessionNode = { ...nextNode, firewallHP };

        set({
          status:                'hacking',
          nextStatus:            'transit',
          currentJobType:        jobType,
          isReplay,
          digitalTrace:          0,
          physicalHeat:          0,
          firewallHealth:        firewallHP,
          currentNode:           sessionNode,
          firewallRevealed:      false,
          sessionIntelEarned:    0,
          sessionPotentialIntel: potentialIntel,
          packUpHeat:            0,
          packUpTrace:           0,
          systemOverride:        null, // Reset Phase 4
          terminalLog:           appendLog(
            nodeBootLog(sessionNode),
            `// SAFEHOUSE ${s.currentSafehouse?.id ?? 'ALPHA'} ACTIVE: ${(s.currentSafehouse?.trait ?? 'Standard').toUpperCase()} PROTOCOLS ENGAGED.`
          ),
          toolState:             buildInitialToolState(),
        });
      },

      // ─── RESET GAME ───────────────────────────────────────────────────
      // Full reset — called from VICTORY and GAME_OVER overlays.
      resetGame: () => {
        // A full wipe should always start them back at the tutorial node
        const freshNode = TEST_NODE;
        set({
          status:                'transit',
          nextStatus:            'transit',
          isBreaching:           false,
          transitOutcome:        'initial',
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
          systemOverride:        null, // Reset Phase 4
          tartarusBeaten:        false,      // per-run flag — reset each campaign
          darknetTier:           1,          // streak resets; highestDarknetTier + hasBeatenGame persist
          consumables:           { zeroDay: 0, coolant: 0 },
          pendingFragmentIdx:    null,
          isReplay:              false,
          tutorialFlags: {
            traceWarning: false,
            heatWarning: false,
            decryptWarning: false, 
            siphonWarning: false,
            bypassPrompt: false, 
            scanPrompt: false,
            heatTutorial: false,
            decryptPrompt: false,
            pulsePrompt: false
          },
          isFirstBoot:           true,
          hasFirstBypass:        false,
          // NOTE: hasBeatenGame / highestDarknetTier / settings intentionally omitted — preserved via shallow merge
          terminalLog:           nodeBootLog(freshNode),
          toolState:             buildInitialToolState(),
        });
      },

      // ─── ENTER DARKNET ────────────────────────────────────────────────
      // Transitions from the victory screen directly into the transit hub
      // so the player can access the Darknet Router without a full reset.
      enterDarknet: () => set({ status: 'transit' }),

      // ─── DISMISS FRAGMENT MODAL ───────────────────────────────────────
      dismissFragmentModal: () => set({ pendingFragmentIdx: null }),

      // ─── DEEP DECRYPT FRAGMENT ────────────────────────────────────────
      deepDecryptFragment: (fragmentIndex, cost) => {
        const s = get();
        if (s.intelFragments >= cost && !s.decryptedFragments.includes(fragmentIndex)) {
          if (s.settings?.hapticsEnabled) haptic([20, 50, 20]);
          AudioManager.playSFX('thock');
          set({
            intelFragments:     s.intelFragments - cost,
            decryptedFragments: [...s.decryptedFragments, fragmentIndex],
          });
        }
      },

      // ─── TOGGLE CYBERDELIA MODE ───────────────────────────────────────
      toggleCyberdelia: () => set((s) => ({
        settings: { ...s.settings, cyberdeliaMode: !s.settings?.cyberdeliaMode },
      })),

      // ─── UPDATE SETTINGS ──────────────────────────────────────────────
      updateSettings: (patch) => set((state) => ({
        settings: { ...state.settings, ...patch },
      })),

      // ─── BUY CONSUMABLE ───────────────────────────────────────────────
      // itemId: 'zeroDay' | 'coolant'
      buyConsumable: (itemId, cost) => {
        const s = get();
        if (s.intelFragments < cost) return;
        set({
          intelFragments: s.intelFragments - cost,
          consumables: {
            ...s.consumables,
            [itemId]: (s.consumables[itemId] ?? 0) + 1,
          },
        });
      },

      // ─── USE CONSUMABLE ───────────────────────────────────────────────
      // Applies the item effect immediately; if zeroDay breaches the
      // firewall the full breach path runs (mirrors executeCommand breach).
      useConsumable: (itemId) => {
        const s = get();
        if (s.status !== 'hacking') return;
        if ((s.consumables[itemId] ?? 0) <= 0) return;

        if (s.settings?.hapticsEnabled) haptic(15);
        AudioManager.playSFX('thock');

        const newConsumables = {
          ...s.consumables,
          [itemId]: s.consumables[itemId] - 1,
        };

        // ── COOLANT: reduce heat ──────────────────────────────────────
        if (itemId === 'coolant') {
          const newHeat = Math.max(0, s.physicalHeat - 30);
          set({
            physicalHeat: newHeat,
            consumables:  newConsumables,
            terminalLog:  appendLog(s.terminalLog, `>> COOLANT FLUSH — HEAT: ${newHeat.toFixed(0)}%`),
          });
          return;
        }

        // ── ZERO-DAY: deal 50 FW damage; may breach ──────────────────
        if (itemId === 'zeroDay') {
          const newFirewall = Math.max(0, s.firewallHealth - 50);
          const baseLog     = appendLog(s.terminalLog, `>> ZER0-DAY PAYLOAD — FW: ${Math.ceil(newFirewall)}`);

          if (newFirewall > 0) {
            set({ firewallHealth: newFirewall, consumables: newConsumables, terminalLog: baseLog });
            return;
          }

          // ── Firewall breached via Consumable ──
          
          // 1. Violent haptic shockwave
          if (s.settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
             navigator.vibrate([100, 50, 150]);
          }

          const currentState = useGameStore.getState();
          const isPerfect    = currentState.digitalTrace >= 90;
          const intelEarned  = isPerfect
            ? Math.floor(currentState.sessionPotentialIntel * 1.25)
            : currentState.sessionPotentialIntel;
          const isTartarus   = currentState.currentJobType === 'tartarus';
          const isDarknet    = currentState.currentJobType === 'darknet';
          const isPriority   = currentState.currentJobType === 'priority' || isTartarus;

          let newArchive  = currentState.storyArchive;
          let fragmentIdx = null;
          if (isPriority && !currentState.isReplay && currentState.storyArchive.length < storyFragments.length) {
            fragmentIdx = currentState.storyArchive.length;
            newArchive  = [...currentState.storyArchive, fragmentIdx];
          }

          const newDarknetTier = isDarknet ? currentState.darknetTier + 1 : currentState.darknetTier;
          const newHighestTier = Math.max(currentState.highestDarknetTier, newDarknetTier);

          let log = appendLog(baseLog, `>> [ ACCESS GRANTED ]`);
          const mashaLine = getMashaReaction('breach', currentState.digitalTrace);
          if (mashaLine) log = appendLog(log, mashaLine);
          if (isPerfect) {
            log = appendLog(log, '>> PERFECT BREACH: Tactical risk recognized. +25% Intel bonus applied.');
          }
          log = appendLog(log, `>> NODE BREACHED. PAYLOAD SECURED: +${intelEarned} IF.`);
          if (fragmentIdx !== null) {
            log = appendLog(log,
              `>> FRAGMENT #${String(fragmentIdx + 1).padStart(3, '0')} DECODED — CHECK ARCHIVE.`);
          }
          log = appendLog(log, '// AWAITING MANUAL DISCONNECT...');

          set({
            status:             'resolved',
            nextStatus:         isTartarus ? 'victory' : 'transit',
            transitOutcome:     'success',
            packUpHeat:         currentState.physicalHeat,
            packUpTrace:        currentState.digitalTrace,
            systemOverride:     null,
            firewallHealth:     0,
            intelFragments:     currentState.intelFragments + intelEarned,
            sessionIntelEarned: intelEarned,
            storyArchive:       newArchive,
            hasBeatenGame:      currentState.hasBeatenGame || isTartarus,
            tartarusBeaten:     currentState.tartarusBeaten || isTartarus,
            darknetTier:        newDarknetTier,
            highestDarknetTier: newHighestTier,
            pendingFragmentIdx: currentState.isReplay ? null : fragmentIdx,
            terminalLog:        log,
            consumables:        newConsumables,
            isPerfectBreach:    isPerfect,
            isBreaching:        false,
          });
        }
      },

    // ─── SIPHON VAULT (Push Your Luck) ────────────────────────────────
      siphonVault: () => {
        const s = get();
        if (s.status !== 'resolved' || s.transitOutcome !== 'success') return;

        const tracePenalty = 3.5; 
        const intelReward  = 1;   

        const newTrace = s.digitalTrace + tracePenalty;

        if (newTrace >= 100) {
          get().packUp('trace_busted');
          set(cur => ({
            terminalLog: appendLog(cur.terminalLog, "// MEMO_FROM_MASHA: 'You stayed too long! I told you to get out!'")
          }));
          return;
        }

        if (s.settings?.hapticsEnabled) haptic(10); 

        set({
          digitalTrace:       newTrace,
          packUpTrace:        newTrace, 
          sessionIntelEarned: s.sessionIntelEarned + intelReward,
          intelFragments:     s.intelFragments + intelReward, 
          terminalLog:        appendLog(s.terminalLog, `>> SIPHONING... TRACE: ${newTrace.toFixed(0)}% (+${intelReward} IF)`),
        });
      },

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
      name: 'tartarus-save',
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

        if (version < 5) {
          state = {
            ...state,
            pendingFragmentIdx: null,
            settings: {
              ...state.settings,
              cyberdeliaEnabled: state.settings?.cyberdeliaEnabled ?? false,
            },
          };
        }

        if (version < 6) {
          // Rename cyberdeliaEnabled → cyberdeliaMode; add isReplay
          const { cyberdeliaEnabled, ...otherSettings } = state.settings ?? {};
          state = {
            ...state,
            isReplay: false,
            settings: {
              ...otherSettings,
              cyberdeliaMode: cyberdeliaEnabled ?? false,
            },
          };
        }

        if (version < 7) {
          state = {
            ...state,
            tutorialFlags: {
              traceWarning:   false,
              heatWarning:    false,
              decryptWarning: false,
            },
          };
        }

        if (version < 8) {
          state = {
            ...state,
            isFirstBoot:    false,  // existing players skip the intro
            hasFirstBypass: true,   // existing players skip the first-BYPASS flavor
          };
        }

        if (version < 9) {
          state = { ...state, tickCount: 0 };
        }

        if (version < 10) {
          state = { ...state, decryptedFragments: [] };
        }

        return state;
      },
    }
  )
);

export default useGameStore;