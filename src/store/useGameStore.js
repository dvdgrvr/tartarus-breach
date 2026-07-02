import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toolsConfig    from '../data/toolsConfig.json';
import upgradesConfig from '../data/upgradesConfig.json';
import storyFragments from '../data/storyFragments.json';
import modifiersData  from '../data/modifiers.json';
import nodesConfig    from '../data/nodesConfig.json';
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
  PULSE_INTERVAL_TICKS,
  PULSE_WINDOW_TICKS,
  SAVE_VERSION,
} from '../config/constants';

// ─── Node Pools — imported from src/data/nodesConfig.json ───────────────────

const { skim: SKIM_NODES, priority: PRIORITY_NODES, milestones: MILESTONE_NODES, tartarus: TARTARUS_NODE_DEF } = nodesConfig;

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
  Object.fromEntries(toolsConfig.map(t => [t.id, {
    cooldownRemaining: 0,
    isLocked: false,
  }]));

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

const _initialNode = pickSkimNode();

const useGameStore = create(
  persist(
    (set, get) => ({
      // ── Persistent meta ──────────────────────────────────────────────────
      saveVersion: SAVE_VERSION,

      // ── Player resources ─────────────────────────────────────────────────
      intelFragments: 0,
      rootAccessKeys: 0,       // Deep skill tree currency
      inventory: [],           // <--- NEW: Holds looted hardware
      activeModifiers: [],     // <--- NEW: Holds active buffs like Admin Key
      lootAccumulator: 0,      // <--- NEW: Tracks how much data you've siphoned
      comboChain:           [], // Stores the IDs of the last few tools used

      // ── Upgrades ─────────────────────────────────────────────────────────
      upgrades: buildInitialUpgradeState(),
      kernelNodes: [],         // IDs of unlocked Kernel Overrides

      // ── Narrative archive ─────────────────────────────────────────────────
      storyArchive:       [],
      decryptedFragments: [],

      // ── Pulse mechanic ───────────────────────────────────────────────────
      tickCount:            0,         // persistent counter driving the pulse window

      // ── Narrative State ──────────────────────────────────────────────────
      getCurrentAct: () => {
        const fragments = get().storyArchive.length;
        if (fragments < 4) return 1;       // Act I: Neon Underground
        if (fragments < 8) return 2;       // Act II: The Deep Trace
        return 3;                          // Act III: The Zero-Day Event
      },

      // ── Session state ────────────────────────────────────────────────────
      status:               'transit',  // 'loading' | 'hacking' | 'transit' | 'victory' | 'game_over'
      nextStatus:           'transit',  // Tracks where the Disconnect button should go
      isBreaching:          false,
      isPerfectBreach:      false,
      isPaused:             false,
      isHitStopped:         false,
      pulseActive:          false,
      systemOverride:       null,       // ── PHASE 4: Override State
      activeDaemon:         null,       // 'BLOODHOUND' | null
      exposedTicks:         0,          // How long the node remains exposed
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

      // ── Game mode ─────────────────────────────────────────────────────────
      gameMode:   'campaign',
      arcadeStats: { timeRemaining: 60, score: 0, keystrokes: 0, eliteCombos: 0, multiplier: 1, toolUsage: {} },
      arcadeHighScore: 0,        // all-time best — never wiped by resetGame

      // ── Tutorial ──────────────────────────────────────────────────────────
      isTutorial:   false,
      tutorialStep: null,  // 'SCAN_INTRO' | 'DECRYPT_INTRO' | 'PULSE_INTRO' | 'BYPASS_INTRO' | 'TRACE_HEAT_INTRO' | 'FINISH_NODE' | 'SIPHON_INTRO'

      // ── Endless mode ──────────────────────────────────────────────────────
      hasBeatenGame:     false,  // global unlock — never wiped by resetGame
      tartarusBeaten:    false,  // per-run flag, reset on new campaign
      darknetTier:       1,
      highestDarknetTier: 1,     // all-time best — never wiped by resetGame
      consumables:       { rabbit: 0, ghost: 0 },
      globalConsumableCooldown: 0,

      // ── User settings ─────────────────────────────────────────────────────
      settings: {
        masterVolume:    0.8,
        sfxEnabled:      true,
        ambienceEnabled: true,
        hapticsEnabled:  true,
        shakeEnabled:    true,
        crtEnabled:      true,
        cyberdeliaMode:  false,  // global 1995 Cyberdelia visual override
        reducedMotion:   false,  // NEW: Ocular protection protocol
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

      // ─── STATUS ───────────────────────────────────────────────────────
      setStatus: (newStatus) => set({ status: newStatus }),

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

      // ── THE REPLAY ACTION ──
      // Instantly resets the current run and launches a new one of the exact same type
      retrySession: () => {
        const s = get();
        // If it's the end of the game, route them to the proper ending screen instead
        if (s.nextStatus === 'game_over' || s.nextStatus === 'victory') {
          set({ status: s.nextStatus });
          return;
        }
        
        // Clear out lingering physical heat/trace states before rebooting
        set({
          physicalHeat: 0,
          digitalTrace: 0,
          isPerfectBreach: false
        });
        
        // Instantly launch the same job type
        get().startNewSession(s.currentJobType, s.isReplay, s.currentReplayLevel);
      },

triggerFirstBoot: () => {
        set(cur => {
          let log = appendLog(cur.terminalLog, '// KERNEL_INITIALIZED: Safehouse ALPHA online.');
          log = appendLog(log, '// ENCRYPTION_ACTIVE: Signal routed through Belgrade Node.');
          log = appendLog(log, "// MEMO_FROM_MASHA: 'Operator, you're clear. If you forget your tool protocols, check the DECK MANUAL in the Safehouse.'");
          log = appendLog(log, "// MASHA: 'Target acquired. Don't fry the hardware. Good luck.'");
          return { 
            terminalLog: log, 
            isFirstBoot: false
          };
        });
      },

// ─── TICK ─────────────────────────────────────────────────────────
      tick: () => {
        const s = get();
        if (s.status !== 'hacking' || s.isPaused) return;

        // Tutorial: freeze all environmental pressure; only tick cooldowns
        if (s.isTutorial) {
          const newToolState = Object.fromEntries(
            Object.entries(s.toolState).map(([id, ts]) => [id, { cooldownRemaining: Math.max(0, ts.cooldownRemaining - 1) }])
          );
          set({ toolState: newToolState });
          return;
        }

        let currentOverride = s.systemOverride;
        let spikeTrace      = 0;
        let logMsg          = null;

        if (currentOverride !== null) {
          currentOverride -= 1;
          if (currentOverride <= 0) {
            spikeTrace = 25;
            currentOverride = null;
            logMsg = '!! ACTIVE COUNTER-MEASURE FAILED — TRACE SPIKE !!';
            AudioManager.playSFX('error');
            if (s.settings?.hapticsEnabled) haptic([200, 50, 200]);
          }
        } else if (s.digitalTrace > 30 && s.currentJobType !== 'skim' && Math.random() < 0.05) {
          currentOverride = 3;
          logMsg = '[!] WARNING: ACTIVE COUNTER-MEASURE DETECTED. INTERCEPT REQUIRED.';
          AudioManager.playSFX('error');
          if (s.settings?.hapticsEnabled) haptic([50, 100, 50]);
        }

        let newExposedTicks = Math.max(0, (s.exposedTicks || 0) - 1);
        let currentDaemon   = s.activeDaemon;
        let daemonTrace     = 0;

        if (s.exposedTicks === 1) logMsg = '> NODE HAS RECOVERED. TARGET HARDENED.';

        if (currentDaemon === 'BLOODHOUND') {
          daemonTrace = 2.0; 
        } else if (!currentDaemon && s.digitalTrace > 20 && s.currentJobType !== 'skim' && Math.random() < 0.02) {
          currentDaemon = 'BLOODHOUND';
          logMsg = '!! WARNING: BLOODHOUND DAEMON INJECTED. TRACE SPIKING. RUN DECRYPT TO KILL !!';
          AudioManager.playSFX('error');
          if (s.settings?.hapticsEnabled) haptic([50, 100, 50]);
        }

        const signalLevel    = s.upgrades['SIGNAL']?.level ?? 0;
        const heatMultiplier = Math.max(0, 1 - signalLevel * 0.10);
        
        // Changed to 'let' so we can modify it for the Volatile mutator
        let heatGain = BASE_HEAT_PER_TICK * heatMultiplier * (s.currentSafehouse?.heatMod ?? 1);

        // --- NEW: Volatile Heat Spike ---
        if (s.currentNode?.mutator?.id === 'VOLATILE') {
          heatGain *= 2.0; // Rig heats up twice as fast
        }

        // KERNEL: The Ghost Tier 1 - Phantom Thread
        let kernelTraceMod = 1.0;
        if (s.kernelNodes.includes('GHOST_1')) kernelTraceMod -= 0.10;
        // KERNEL: Void Walker (Capstone)
        if (s.kernelNodes.includes('GHOST_CAP') && s.highestDarknetTier) {
           const bonus = Math.floor(s.highestDarknetTier / 5) * 0.02;
           kernelTraceMod -= bonus;
        }
        kernelTraceMod = Math.max(0.1, kernelTraceMod);

        const isTraceAccel    = s.currentNode?.specialDefense === 'TRACE_ACCELERATOR';
        const traceMultiplier = s.currentNode?.traceMultiplier ?? (isTraceAccel ? TRACE_ACCEL_MULTIPLIER : 1);
        let traceGain         = (s.digitalTrace >= TRACE_ACCEL_THRESHOLD ? BASE_TRACE_HIGH : BASE_TRACE_LOW)
                                * traceMultiplier * (s.currentSafehouse?.traceMod ?? 1) * kernelTraceMod;

        if (s.currentNode?.mutator?.id === 'SNIFFER') traceGain *= 1.5;

        // KERNEL: Emergency Vent (Architect Tier 2)
        if (s.kernelNodes.includes('ARCH_2') && s.physicalHeat + heatGain >= 95) {
          const coolerIndex = s.inventory.findIndex(item => item.id === 'LIQUID_COOLER');
          if (coolerIndex !== -1) {
            heatGain = -s.physicalHeat; // instantly drop heat to 0
            logMsg = '>> KERNEL OVERRIDE: EMERGENCY VENT INITIATED. LIQUID COOLER CONSUMED.';
            const newInv = [...s.inventory];
            if (newInv[coolerIndex].count > 1) {
              newInv[coolerIndex].count -= 1;
            } else {
              newInv.splice(coolerIndex, 1);
            }
            set({ inventory: newInv });
            if (s.settings?.hapticsEnabled) haptic([50, 100, 50]);
          }
        }

        const newTickCount = s.tickCount + 1;

        let newRabbitTicks = Math.max(0, (s.rabbitTicks || 0) - 1);
        let newGhostTicks  = Math.max(0, (s.ghostTicks || 0) - 1);
        
        let rabbitDamage = 0;
        if (s.rabbitTicks > 0) {
          rabbitDamage = 10; 
          const rabbitMultiplier = Math.min(5, 6 - s.rabbitTicks);
          const bunnies = "(\\_/) ".repeat(rabbitMultiplier);
          logMsg = `>> ${bunnies} *chomp* [ DATA_CONSUMED ]`;
          if (s.settings?.hapticsEnabled) haptic(10); 
        }
        
        if (s.ghostTicks > 0) {
          traceGain = 0;
          daemonTrace = 0;
          spikeTrace = 0;
          if (newGhostTicks === 0) logMsg = '>> GHOST.sys EXPIRED. TRACE RESUMING.';
        }

        const prevFirewall = s.firewallHealth;
        
        let architectHeal = 0;
        if (s.currentNode?.mutator?.id === 'ARCHITECT' && prevFirewall > 0) {
          architectHeal = 2; 
        }

        let newFirewall = prevFirewall - rabbitDamage + architectHeal;
        newFirewall = Math.max(rabbitDamage > 0 ? 1 : 0, newFirewall);
        if (s.currentNode?.maxFirewallHP) {
          newFirewall = Math.min(s.currentNode.maxFirewallHP, newFirewall);
        }

        const newToolState = Object.fromEntries(
          Object.entries(s.toolState).map(([id, ts]) => [id, { cooldownRemaining: Math.max(0, ts.cooldownRemaining - 1) }])
        );

        const newConsumableCooldown = Math.max(0, (s.globalConsumableCooldown || 0) - 1);

        const newHeat      = Math.min(100, s.physicalHeat  + heatGain);
        const newTrace     = Math.min(100, s.digitalTrace + traceGain + spikeTrace + daemonTrace);

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
          activeDaemon: currentDaemon,
          exposedTicks: newExposedTicks,
          rabbitTicks: newRabbitTicks,
          ghostTicks: newGhostTicks,
          firewallHealth: newFirewall,
          terminalLog: newLog,
          globalConsumableCooldown: newConsumableCooldown,
        });

        if (newTrace >= 50 && !s.tutorialFlags.scanPrompt) {
          set(cur => ({
            terminalLog:  appendLog(cur.terminalLog, "// MASHA: 'They are sniffing our packets. Mask your signature before they trace the uplink.'"),
            tutorialFlags: { ...cur.tutorialFlags, scanPrompt: true },
          }));
        }
        if (newHeat >= 60 && !s.tutorialFlags.heatTutorial) {
          set(cur => ({
            terminalLog:  appendLog(cur.terminalLog, "// MASHA: 'Rig temperatures are climbing. We're going to fry the hardware if you don't let it cool.'"),
            tutorialFlags: { ...cur.tutorialFlags, heatTutorial: true },
          }));
        }
        if (isPulse && !s.tutorialFlags.pulsePrompt) {
          set(cur => ({
            terminalLog: appendLog(cur.terminalLog, "// MASHA: 'I'm seeing a momentary sync gap in their security rotation. That's your window.'"),
            tutorialFlags: { ...cur.tutorialFlags, pulsePrompt: true },
          }));
        }

        if (newTrace > 80 && !s.tutorialFlags.traceWarning) {
          set(cur => ({
            terminalLog:  appendLog(cur.terminalLog, '[!] STROBE_DETECTION: Firewall is actively mapping your IP.'),
            tutorialFlags: { ...cur.tutorialFlags, traceWarning: true },
          }));
        }
        if (newHeat > 80 && !s.tutorialFlags.heatWarning) {
          set(cur => ({
            terminalLog:  appendLog(cur.terminalLog, '[!] THERMAL_FLARE: Safehouse emission levels critical.'),
            tutorialFlags: { ...cur.tutorialFlags, heatWarning: true },
          }));
        }

        if (newHeat >= 100) {
          if (s.gameMode === 'arcade') {
            AudioManager.playSFX('error');
            const newTime = Math.max(0, s.arcadeStats.timeRemaining - 5);
            let penaltyLog = appendLog(newLog, `!! THERMAL OVERLOAD — PENALTY: -5s | TIME: ${newTime}s REMAINING !!`);
            penaltyLog = appendLog(penaltyLog, `>> ARCADE: Multiplier Reset — Connection Unstable`);
            set({ physicalHeat: 0, arcadeStats: { ...s.arcadeStats, timeRemaining: newTime, multiplier: 1 }, terminalLog: penaltyLog });
            return;
          }
          get().packUp('heat_busted');
          return;
        }
        if (newTrace >= 100) {
          if (s.gameMode === 'arcade') { get().applyArcadeTracePenalty(); return; }
          get().packUp('trace_busted');
          return;
        }
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
        if (s.status !== 'hacking' || s.isPaused) return;

        // ── TUTORIAL GATE: only allow the specific tool for this step ──────
        if (s.isTutorial && s.tutorialStep !== 'FINISH_NODE') {
          const TUTORIAL_ALLOWED = {
            SCAN_INTRO:       'SCAN',
            DECRYPT_INTRO:    'DECRYPT',
            PULSE_INTRO:      'PULSE',
            BYPASS_INTRO:     'BYPASS',
            TRACE_HEAT_INTRO: 'PULSE',
          };
          if (toolId !== (TUTORIAL_ALLOWED[s.tutorialStep] ?? null)) return;
        }

        // ── ARCADE: Track keystrokes ───────────────────────────────────────
        if (s.gameMode === 'arcade') {
          set(cur => ({ arcadeStats: { ...cur.arcadeStats, keystrokes: cur.arcadeStats.keystrokes + 1 } }));
        }

        const tool = toolsConfig.find(t => t.id === toolId);
        if (!tool) return;

        let currentLog = [...s.terminalLog];

        // ─── COMBO CHAIN TRACKING ───
        const sequenceOrder = ['SCAN', 'DECRYPT', 'PULSE'];
        let newComboChain = [...s.comboChain];

        // LOGIC: If the current tool matches the next step in the sequence, add it.
        // If it breaks the sequence and isn't a BYPASS, reset the chain to the current tool.
        const nextExpectedStep = sequenceOrder[newComboChain.length];
        
        if (toolId === nextExpectedStep) {
          newComboChain.push(toolId);
        } else if (toolId !== 'BYPASS') {
          // If the chain was active and we just broke it
          if (newComboChain.length > 0) {
            if (s.settings?.hapticsEnabled) haptic(10); // A tiny, sharp 10ms 'click'
            AudioManager.playSFX('thud'); // A low-freq muffled sound, not an error beep
          }
          newComboChain = toolId === 'SCAN' ? ['SCAN'] : [];
        }

        const isPerfectSequence = newComboChain.length === 3;

        // ─── COOLDOWN GATE ───
        const cooldownRemaining = s.toolState[toolId]?.cooldownRemaining ?? 0;

        // Block execution if tool is still recovering
        if (cooldownRemaining > 0) return;

        const ramLevel = s.upgrades['RAM']?.level ?? 0;
        let actualCooldown = Math.max(
          1,
          Math.floor(tool.baseCooldown * (1 - ramLevel * 0.10) * (s.currentSafehouse?.ramMod ?? 1))
        );

        // ─── HAPTICS & AUDIO ───
        AudioManager.playSFX('thock');
        if (s.settings?.hapticsEnabled) {
          if (toolId === 'SCAN') haptic(10);
          else if (toolId === 'BYPASS') haptic([30, 40, 30]);
          else if (toolId === 'PULSE') haptic([15, 20, 15]);
          else if (toolId === 'DECRYPT') haptic(50);
          else haptic(15);
        }

        let firewallDamage = tool.baseEffect.firewallDamage ?? 0;
        let traceGain      = tool.baseEffect.traceGain       ?? 0;
        let heatGain       = tool.baseEffect.heatGain ?? 0;

        // KERNEL: Wide-Band SCAN (Sledgehammer Tier 1)
        if (toolId === 'SCAN' && s.kernelNodes.includes('SLEDGE_1')) {
          firewallDamage += 10;
          heatGain += 5;
        }

        // KERNEL: Thermal Overdrive (Sledgehammer Tier 3)
        if (s.physicalHeat > 80 && s.kernelNodes.includes('SLEDGE_3')) {
          firewallDamage = Math.floor(firewallDamage * 1.2);
        }

        // KERNEL: Ghost Protocol (Ghost Tier 3)
        let didGhostRefresh = false;
        if (toolId === 'PULSE' && s.kernelNodes.includes('GHOST_3') && Math.random() < 0.20) {
          didGhostRefresh = true;
          actualCooldown = 0; // Cooldown immediately resets
        }
        
        let newExposedTicks = s.exposedTicks;
        let newFirewallRevealed = s.firewallRevealed;
        let newActiveDaemon = s.activeDaemon;

        // ─── TOOL: DECRYPT ───
        if (toolId === 'DECRYPT') {
          currentLog = appendLog(currentLog, `> DECRYPT // +${heatGain.toFixed(0)}% HEAT | TRACE: ${Math.min(100, s.digitalTrace + traceGain).toFixed(0)}%`);
          if (s.currentNode?.mutator?.id === 'ICE_WALL') {
            actualCooldown = 1; 
            currentLog = appendLog(currentLog, '>> ICE-WALL BRITTLE. DECRYPT RAPIDLY RECHARGED.');
          }
          if (s.activeDaemon) {
            currentLog = appendLog(currentLog, `>> DAEMON '${s.activeDaemon}' KILLED.`);
            newActiveDaemon = null;
          }

        // KERNEL: Cold Boot (Ghost Tier 2) is applied upon starting a session (startNewSession)
          const isEncrypted = s.currentNode?.specialDefense === 'ENCRYPTED_LOGS';
          if (isEncrypted && !s.firewallRevealed) {
            currentLog = appendLog(currentLog, `>> ENCRYPTED LOGS CRACKED — FW: ${s.firewallHealth}`);
            newFirewallRevealed = true;
          }
          currentLog = appendLog(currentLog, '>> TARGET EXPOSED. CRITICAL STRIKE WINDOW OPEN.');
          newExposedTicks = 4;

          set({
            physicalHeat:     Math.min(100, s.physicalHeat + heatGain),
            digitalTrace:     Math.min(100, s.digitalTrace + traceGain),
            firewallRevealed: newFirewallRevealed,
            activeDaemon:     newActiveDaemon,
            exposedTicks:     newExposedTicks,
            terminalLog:      currentLog,
            comboChain:       newComboChain,
            toolState: { ...s.toolState, [toolId]: { cooldownRemaining: actualCooldown } },
            ...(s.isTutorial && s.tutorialStep === 'DECRYPT_INTRO' ? { tutorialStep: 'PULSE_INTRO' } : {}),
          });
          if (s.physicalHeat + heatGain >= 100 && s.gameMode !== 'arcade' && !s.isTutorial) get().packUp('heat_busted');
          return;
        }

        // Arcade-specific stat deltas — collected here and applied in the final set
        let arcadeTimeDelta        = 0;
        let newArcadeMult          = s.arcadeStats?.multiplier ?? 1;
        let arcadeEliteCombosDelta = 0;

        // ─── TOOL: BYPASS ───
        let hasFirstBypass = s.hasFirstBypass;
        if (toolId === 'BYPASS') {
          const bsLevel = s.upgrades['BYPASS_STRENGTH']?.level ?? 0;
          firewallDamage += bsLevel * 10;

          // KERNEL: Juggernaut (Sledgehammer Capstone)
          if (s.kernelNodes.includes('SLEDGE_CAP') && s.highestDarknetTier) {
            firewallDamage += Math.floor(s.highestDarknetTier / 5) * 5;
          }

          if (s.exposedTicks > 0) {
            if (isPerfectSequence) {
              firewallDamage *= 3.5;
              currentLog = appendLog(currentLog, `>> [!!!] TRIPLE_THREAT_DETONATION [!!!] — 3.5x COMBO MAXIMIZED`);
              if (s.gameMode === 'arcade') {
                arcadeTimeDelta        += 2;
                newArcadeMult           = Math.min(5, newArcadeMult + 1);
                arcadeEliteCombosDelta += 1;
                currentLog = appendLog(currentLog, `>> ARCADE BONUS: Triple Threat +2s`);
                currentLog = appendLog(currentLog, `>> ARCADE: Multiplier increased to x${newArcadeMult}`);
              }
              if (s.settings?.hapticsEnabled) haptic([50, 50, 50, 50, 200]);
              AudioManager.playSFX('error');
            } else {
              firewallDamage *= 2;
              currentLog = appendLog(currentLog, `>> [!!] CRITICAL OVERRIDE [!!] — 2.0x MULTIPLIER APPLIED`);
              if (s.settings?.hapticsEnabled) haptic([100, 100, 150]);
            }
            newExposedTicks = 0; 
            newComboChain = []; // Always reset on Bypass strike

            set({ isHitStopped: true });
            setTimeout(() => {
              useGameStore.setState({ isHitStopped: false });
            }, 120);
          } else if (s.kernelNodes.includes('SLEDGE_2')) {
            // KERNEL: Momentum Strike (Sledgehammer Tier 2)
            firewallDamage = Math.floor(firewallDamage * 1.5);
            currentLog = appendLog(currentLog, `>> KERNEL: MOMENTUM STRIKE APPLIED`);
          }
          if (s.currentNode?.specialDefense === 'ENCRYPTED_LOGS' && !s.firewallRevealed && !s.tutorialFlags.decryptWarning) {
            currentLog = appendLog(currentLog, '[!] DATA_OBFUSCATION: Target metrics encrypted. Blind strikes are inefficient. Recommend structural dissection.');
            set(cur => ({ tutorialFlags: { ...cur.tutorialFlags, decryptWarning: true } }));
          }
          if (!hasFirstBypass) {
            currentLog = appendLog(currentLog, "// MASHA: 'First strike confirmed. We're in the system. Keep the pressure up.'");
            hasFirstBypass = true;
          }
        }

        // ─── DAMAGE & MODIFIERS ───
        firewallDamage = Math.floor(firewallDamage * (s.currentSafehouse?.dmgMod ?? 1));
        if (toolId === 'BYPASS' && s.currentNode?.mutator?.id === 'ICE_WALL') firewallDamage = Math.floor(firewallDamage * 0.5);

        const prevFirewall = s.firewallHealth;
        const newFirewall  = Math.max(0, prevFirewall - firewallDamage);
        
        // ─── TOOL: PULSE / SYNC ───
        const isPerfectSync = toolId === 'PULSE' && s.pulseActive;
        const finalTrace    = isPerfectSync
          ? Math.max(0, s.digitalTrace + (traceGain * 2))
          : Math.min(100, Math.max(0, s.digitalTrace + traceGain));

        if (isPerfectSync && s.settings?.hapticsEnabled) haptic([30, 50, 30]);
        let newHeat = Math.min(100, s.physicalHeat + heatGain);

        if (didGhostRefresh) {
           currentLog = appendLog(currentLog, `>> KERNEL: GHOST PROTOCOL FIRED. PULSE COOLDOWN RESET.`);
        }
        if (s.gameMode === 'arcade' && toolId === 'PULSE') {
          newHeat = Math.max(0, s.physicalHeat - 20); // fully offset heatGain + deep vent
          currentLog = appendLog(currentLog, `>> ARCADE_VENT: Thermal load reduced -20%`);
        }

        // ─── WIN STATE ───
        if (newFirewall <= 0 && prevFirewall > 0) {
          // In arcade mode, advance to the next node directly from the store
          if (s.gameMode === 'arcade') {
            // NOTE: arcade block handled below, before tutorial check
            set({
              firewallHealth: 0,
              digitalTrace:   finalTrace,
              physicalHeat:   newHeat,
              exposedTicks:   newExposedTicks,
              comboChain:     [],
              terminalLog:    appendLog(currentLog, `> ${toolId} // FW: 0 | TRACE: ${finalTrace.toFixed(0)}%`),
              toolState:      { ...s.toolState, [toolId]: { cooldownRemaining: actualCooldown } },
              arcadeStats:    { ...s.arcadeStats, eliteCombos: (s.arcadeStats.eliteCombos ?? 0) + arcadeEliteCombosDelta, timeRemaining: Math.min(99, s.arcadeStats.timeRemaining + arcadeTimeDelta), multiplier: newArcadeMult },
            });
            AudioManager.playSFX('success');
            get().nextArcadeNode();
            return;
          }

          // ── TUTORIAL WIN STATE ──────────────────────────────────────────
          if (s.isTutorial) {
            AudioManager.playSFX('success');
            currentLog = appendLog(currentLog, '>> [!] TARGET SECURED. TRACE ROUTING RESET. SAFE TO EXTRACT.');
            currentLog = appendLog(currentLog, '// TRAINING_SIM COMPLETE. HOLD SIPHON TO EXTRACT INTEL.');
            set({
              status:         'resolved',
              nextStatus:     'transit',
              transitOutcome: 'success',
              tutorialStep:   'SIPHON_INTRO',
              firewallHealth: 0,
              digitalTrace:   20,
              physicalHeat:   newHeat,
              exposedTicks:   newExposedTicks,
              comboChain:     [],
              systemOverride: null,
              toolState:      { ...s.toolState, [toolId]: { cooldownRemaining: actualCooldown } },
              hasFirstBypass: hasFirstBypass,
              terminalLog:    currentLog,
            });
            return;
          }

          if (s.settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 150]);
          const isPerfect    = finalTrace >= 90;

          let intelEarned = s.sessionPotentialIntel;
          if (isPerfect) {
             let bonusMult = 1.25;
             if (s.kernelNodes.includes('ARCH_1')) bonusMult += 0.20; // KERNEL: Deep Siphon
             intelEarned = Math.floor(s.sessionPotentialIntel * bonusMult);
          }
          const isTartarus   = s.currentJobType === 'tartarus';
          const isDarknet    = s.currentJobType === 'darknet';
          const isPriority   = s.currentJobType === 'priority' || isTartarus;

          let newArchive = s.storyArchive;
          let fragmentIdx = null;
          let rootKeysEarned = 0;

          if (isPriority && !s.isReplay && s.storyArchive.length < storyFragments.length) {
            fragmentIdx = s.storyArchive.length;
            newArchive = [...s.storyArchive, fragmentIdx];
          }

          // KERNEL: Grant 1 RAK for milestone/boss nodes (even if story is complete or in replay)
          if ((s.currentNode?.id === 'ML_03' || s.currentNode?.id === 'ML_07' || isTartarus) && !s.isReplay) {
            rootKeysEarned += 1;
          }

          if (isDarknet && ((s.darknetTier) % 5 === 0)) {
            rootKeysEarned += 1;
          }

          let kernelLoot = null;
          // KERNEL: Silicon Baron (Architect Capstone)
          if (s.kernelNodes.includes('ARCH_CAP') && s.highestDarknetTier) {
            const chance = Math.floor(s.highestDarknetTier / 5) * 0.02;
            if (Math.random() < chance) {
               kernelLoot = modifiersData[Math.floor(Math.random() * modifiersData.length)];
            }
          }

          currentLog = appendLog(currentLog, `> ${toolId} // FW: 0 | TRACE: ${finalTrace.toFixed(0)}%`);
          currentLog = appendLog(currentLog, `>> [ ACCESS GRANTED ]`);
          const mashaLine = getMashaReaction('breach', finalTrace);
          if (mashaLine) currentLog = appendLog(currentLog, mashaLine);
          if (isPerfect) currentLog = appendLog(currentLog, '>> PERFECT BREACH: Tactical risk recognized. Bonus Intel applied.');
          currentLog = appendLog(currentLog, `>> NODE BREACHED. PAYLOAD SECURED: +${intelEarned} IF.`);
          if (fragmentIdx !== null) currentLog = appendLog(currentLog, `>> FRAGMENT #${String(fragmentIdx + 1).padStart(3, '0')} DECODED — CHECK ARCHIVE.`);
          if (rootKeysEarned > 0) currentLog = appendLog(currentLog, `>> [!] ROOT ACCESS KEY ACQUIRED.`);

          let nextInv = [...s.inventory];
          if (kernelLoot) {
             currentLog = appendLog(currentLog, `>> KERNEL BARON LOOT: ${kernelLoot.name} extracted.`);
             const extIndex = nextInv.findIndex(i => i.id === kernelLoot.id);
             if (extIndex >= 0) {
                 nextInv[extIndex].count = (nextInv[extIndex].count || 1) + 1;
             } else {
                 nextInv.push({...kernelLoot, count: 1});
             }
          }

          currentLog = appendLog(currentLog, '// AWAITING MANUAL DISCONNECT...');

          set({
            status:             'resolved',
            nextStatus:         isTartarus ? 'victory' : 'transit',
            transitOutcome:     'success',
            packUpHeat:         newHeat, 
            packUpTrace:        finalTrace,
            systemOverride:     null,
            firewallHealth:     0,
            digitalTrace:       finalTrace,
            physicalHeat:       newHeat,
            intelFragments:     s.intelFragments + intelEarned,
            rootAccessKeys:     s.rootAccessKeys + rootKeysEarned,
            sessionIntelEarned: intelEarned,
            inventory:          nextInv,
            storyArchive:       newArchive,
            hasBeatenGame:      s.hasBeatenGame || isTartarus,
            tartarusBeaten:     s.tartarusBeaten || isTartarus,
            darknetTier:        isDarknet ? s.darknetTier + 1 : s.darknetTier,
            highestDarknetTier: Math.max(s.highestDarknetTier, isDarknet ? s.darknetTier + 1 : s.darknetTier),
            pendingFragmentIdx: s.isReplay ? null : fragmentIdx,
            terminalLog:        currentLog,
            comboChain:         [], 
            toolState: { ...s.toolState, [toolId]: { cooldownRemaining: actualCooldown } },
            isPerfectBreach:    isPerfect,
            isBreaching:        false,
            exposedTicks:       newExposedTicks,
            hasFirstBypass:     hasFirstBypass
          });
          return;
        }

        // ─── STANDARD EXECUTION LOG ───
        const fwDisplay = (s.currentNode?.specialDefense === 'ENCRYPTED_LOGS' && !newFirewallRevealed) ? '???' : `${Math.ceil(newFirewall)}`;
        currentLog = appendLog(currentLog, `> ${toolId} // FW: ${fwDisplay} | TRACE: ${finalTrace.toFixed(0)}%`);

        let syncBonus = 0;
        if (isPerfectSync) {
          currentLog = appendLog(currentLog, '>> PERFECT SYNC: Trace reduction efficiency doubled.');
          if (s.gameMode === 'arcade') {
            arcadeTimeDelta        += 1;
            newArcadeMult           = Math.min(5, newArcadeMult + 1);
            arcadeEliteCombosDelta += 1;
            currentLog = appendLog(currentLog, `>> ARCADE BONUS: Perfect Sync +1s`);
            currentLog = appendLog(currentLog, `>> ARCADE: Multiplier increased to x${newArcadeMult}`);
          }
          if (Math.random() < 0.3) {
             syncBonus = Math.floor(Math.random() * 5) + 3;
             currentLog = appendLog(currentLog, `>> [DATA_SNAGGED]: Perfect sync extracted +${syncBonus} IF.`);
          }
        }

        // ── ADRENALINE: Every tool use reduces all other tools' cooldowns (universal) ──
        let finalToolState = { ...s.toolState, [toolId]: { cooldownRemaining: actualCooldown } };
        const adrenalineReduction = toolId === 'BYPASS' ? 1.5 : 0.5;
        finalToolState = Object.fromEntries(
          Object.entries(finalToolState).map(([key, val]) =>
            key !== toolId && (val?.cooldownRemaining ?? 0) > 0
              ? [key, { ...val, cooldownRemaining: Math.max(0, val.cooldownRemaining - adrenalineReduction) }]
              : [key, val]
          )
        );

        const finalArcadeStats = s.gameMode === 'arcade'
          ? { ...s.arcadeStats, eliteCombos: (s.arcadeStats.eliteCombos ?? 0) + arcadeEliteCombosDelta, timeRemaining: Math.min(99, s.arcadeStats.timeRemaining + arcadeTimeDelta), multiplier: newArcadeMult }
          : s.arcadeStats;

        // ── TUTORIAL: compute step advance patch ──────────────────────────
        let tutorialPatch = {};
        if (s.isTutorial && s.tutorialStep !== 'FINISH_NODE') {
          const TUTORIAL_ADVANCE = {
            SCAN_INTRO:       'DECRYPT_INTRO',
            PULSE_INTRO:      'BYPASS_INTRO',
            BYPASS_INTRO:     'TRACE_HEAT_INTRO',
            TRACE_HEAT_INTRO: 'FINISH_NODE',
          };
          const nextStep = TUTORIAL_ADVANCE[s.tutorialStep];
          if (nextStep) {
            tutorialPatch.tutorialStep = nextStep;
            // BYPASS_INTRO → wipe all cooldowns & heat so PULSE is ready, then spike trace
            if (s.tutorialStep === 'BYPASS_INTRO') {
              tutorialPatch.physicalHeat = 0;
              tutorialPatch.toolState   = Object.fromEntries(
                Object.entries(finalToolState).map(([id]) => [id, { cooldownRemaining: 0 }])
              );
              currentLog = appendLog(currentLog, '>> [!] DIAGNOSTIC_RESET: Hardware cooled. Deck refreshed.');
              tutorialPatch.digitalTrace = 85;
            }
          }
        }

        set({
          firewallHealth: newFirewall,
          digitalTrace:   finalTrace,
          physicalHeat:   newHeat,
          terminalLog:    currentLog,
          intelFragments: s.intelFragments + syncBonus,
          sessionIntelEarned: s.sessionIntelEarned + syncBonus,
          exposedTicks:   newExposedTicks,
          hasFirstBypass: hasFirstBypass,
          comboChain:     newComboChain,
          toolState:      finalToolState,
          arcadeStats:    finalArcadeStats,
          ...tutorialPatch,
        });

        if (newHeat >= 100 && s.gameMode !== 'arcade' && !s.isTutorial) get().packUp('heat_busted');
      },

    // ─── PACK UP ──────────────────────────────────────────────────────
      packUp: (cause = 'escaped') => {
        const s = get();
        const isTartarus = s.currentNode?.id === 'TARTARUS';

        let intelEarned = 0;
        let newBank     = s.intelFragments;
        let isGhostExit = false;

        // --- PROGRESS CALCULATION ---
        const maxHP = s.currentNode?.maxFirewallHP || 100;
        const progress = Math.max(0, 1 - (s.firewallHealth / maxHP));

        if (cause === 'escaped') {
          isGhostExit = s.digitalTrace >= 95 || s.physicalHeat >= 95;
          const baseMultiplier = isGhostExit ? 0.75 : 0.5; 
          
          intelEarned = progress >= 0.2
            ? Math.floor(s.sessionPotentialIntel * baseMultiplier * progress * (s.currentSafehouse?.intelMod ?? 1))
            : 0;

          newBank = s.intelFragments + intelEarned;
        } else if (cause === 'heat_busted') {
          newBank = 0; 
        } else if (cause === 'trace_busted') {
          // NEW: You dropped the payload! Remove what you earned this session from your bank.
          newBank = Math.max(0, s.intelFragments - s.sessionIntelEarned);
          intelEarned = 0; // Ensures the summary screen accurately reflects the loss
        }

        if (cause !== 'escaped' && s.settings?.hapticsEnabled) haptic([200, 100, 300]);
        if (isGhostExit && s.settings?.hapticsEnabled) haptic([40, 60, 150]);

        let log = s.terminalLog;
        if (cause === 'escaped') {
          log = appendLog(log, '>> [ CONNECTION CLOSED ]');
          
          if (progress < 0.2) {
            log = appendLog(log, "!! SYSTEM: Connection closed too early. No meaningful data extracted.");
          } else {
            const mashaLine = getMashaReaction('escaped', s.digitalTrace);
            if (mashaLine) log = appendLog(log, mashaLine);
            if (isGhostExit) log = appendLog(log, '>> GHOST EXIT: Danger close. 1.5x Intel recovery bonus applied.');
            log = appendLog(log, `>> TACTICAL RETREAT SUCCESSFUL. SALVAGED +${intelEarned} IF.`);
          }
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
          activeDaemon:       null,       // 'BLOODHOUND' | null
          exposedTicks:       0,          // How long the node remains exposed
          rabbitTicks:        0,          // Duration of the Rabbit virus DOT
          ghostTicks:         0,          // Duration of the Ghost.sys trace freeze
          intelFragments:     newBank,
          sessionIntelEarned: intelEarned,
          currentSafehouse:   nextSafehouse,
          darknetTier:        nextDarknetTier,
          terminalLog:        log,
        });
      },

      // ─── START NEW SESSION ────────────────────────────────────────────
      startNewSession: (jobType = 'skim', isReplay = false, replayLevel = null) => {
        const s = get();
        const archiveLen = s.storyArchive.length; // Current progress
        const frontierLevel = archiveLen + 1;

        let nextNode;
        let firewallHP;

        if (jobType === 'tartarus') {
          nextNode   = TARTARUS_NODE_DEF;
          firewallHP = TARTARUS_NODE_DEF.firewallHP;
        } else if (jobType === 'darknet') {
          const tier = s.darknetTier || 1;
          nextNode   = {
            id:              `DARKNET_T${tier}`,
            name:            `Darknet Router — Tier ${tier}`,
            specialDefense:  'DARKNET',
            firewallHP:      150 + tier * 50,
            traceMultiplier: 2 + tier * 0.5,
          };
          firewallHP = nextNode.firewallHP;
        } else if (jobType === 'priority') {
          const level = (isReplay && replayLevel !== null) ? replayLevel : frontierLevel;
          nextNode   = pickPriorityNode(s.storyArchive.length);
          firewallHP = calcScaledFW(level);
        } else {
          nextNode   = pickSkimNode();
          firewallHP = Math.floor(calcScaledFW(frontierLevel) * 0.70);
        }

        const basePotential = jobType === 'darknet'
          ? 100 + s.darknetTier * 25
          : calcPotentialIntel(jobType);

        let potentialIntel = isReplay ? Math.floor(basePotential * 0.5) : basePotential;

        let activeMods = [...s.activeModifiers];
        if (activeMods.includes('ADMIN_KEY')) {
          firewallHP = Math.floor(firewallHP * 0.5);
          activeMods.splice(activeMods.indexOf('ADMIN_KEY'), 1);
        }

        let mutator = null;
        let finalTraceMultiplier = nextNode.traceMultiplier || 1.0;

        // --- HIGH-RISK MUTATOR LOGIC ---
        if (jobType !== 'tartarus' && Math.random() < 0.40) {
          const MUTATORS = [
            { id: 'ARCHITECT', name: 'The Architect', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
            { id: 'SNIFFER',   name: 'The Sniffer',   color: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10' },
            { id: 'ICE_WALL',  name: 'Ice-Wall',      color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
            { id: 'GOLD_CACHE', name: 'Legacy Data Cache', color: 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10' },
            { id: 'VOLATILE',   name: 'Volatile Relay',   color: 'text-orange-500 border-orange-600/50 bg-orange-600/10' }
          ];
          mutator = MUTATORS[Math.floor(Math.random() * MUTATORS.length)];
          
          if (mutator.id === 'SNIFFER') potentialIntel = Math.floor(potentialIntel * 1.5);
          else if (mutator.id === 'GOLD_CACHE') {
            potentialIntel = Math.floor(potentialIntel * 3.0);
            finalTraceMultiplier *= 2.0;
          } else if (mutator.id === 'VOLATILE') {
            potentialIntel = Math.floor(potentialIntel * 1.5);
          }
        }

        const sessionNode = { 
          ...nextNode, 
          firewallHP, 
          maxFirewallHP: firewallHP, 
          mutator, 
          traceMultiplier: finalTraceMultiplier 
        };

        // --- CUSTOM BOOT LOGS ---
        let initialLogs = nodeBootLog(sessionNode);

        if (mutator?.id === 'GOLD_CACHE') {
          initialLogs.push('// [$$$] GOLDEN CACHE DETECTED: Unusually high data density.');
          initialLogs.push('// [!] WARNING: Target is actively pinging trace authorities. SPRINT REQUIRED.');
        } else if (mutator?.id === 'VOLATILE') {
          initialLogs.push('// [!] VOLATILE RELAY: Hardware instability detected. Expect severe physical heat spikes.');
        }

        initialLogs.push(`// SAFEHOUSE ${s.currentSafehouse?.id ?? 'ALPHA'} ACTIVE: ${(s.currentSafehouse?.trait ?? 'Standard').toUpperCase()} PROTOCOLS ENGAGED.`);

        // KERNEL: Cold Boot (Ghost Tier 2)
        let startingTrace = 0;
        if (s.kernelNodes.includes('GHOST_2')) {
          startingTrace = -10;
          initialLogs.push(`// KERNEL: COLD BOOT ACTIVE. TRACE BUFFERED AT -10%.`);
        }

        set({
          status:                'hacking',
          nextStatus:            'transit',
          currentJobType:        jobType,
          currentReplayLevel:    replayLevel,
          isReplay,
          gameMode:              'campaign',
          isTutorial:            false,
          tutorialStep:          null,
          digitalTrace:          startingTrace,
          activeDaemon:          null,
          exposedTicks:          0,
          physicalHeat:          0,
          firewallHealth:        firewallHP,
          currentNode:           sessionNode,
          firewallRevealed:      false,
          sessionIntelEarned:    0,
          sessionPotentialIntel: potentialIntel,
          packUpHeat:            0,
          packUpTrace:           0,
          systemOverride:        null,
          activeModifiers:       activeMods,
          terminalLog:           initialLogs,
          toolState:             buildInitialToolState(),
        });
      },

      // ─── START ARCADE MODE ────────────────────────────────────────────
      startArcadeMode: () => {
        const arcadeNode = {
          id:             'ARCADE_01',
          name:           'SIM_TARGET_01',
          firewallHP:     50,
          maxFirewallHP:  50,
          specialDefense: null,
        };
        set({
          gameMode:         'arcade',
          arcadeStats:      { timeRemaining: 60, score: 0, keystrokes: 0, eliteCombos: 0, multiplier: 1, toolUsage: {} },
          status:           'hacking',
          transitOutcome:   null,
          digitalTrace:     0,
          physicalHeat:     0,
          firewallRevealed: true,
          currentNode:      arcadeNode,
          firewallHealth:   50,
          isTutorial:       false,
          tutorialStep:     null,
          terminalLog: [
            '// ARCADE_MODE :: SIM_TARGET_01 ONLINE',
            '// BREACH AS MANY NODES AS POSSIBLE IN 60 SECONDS.',
            '// TRACE OVERFLOW = -10s PENALTY. GOOD LUCK.',
          ],
          toolState: buildInitialToolState(),
        });
      },

      // ─── START TUTORIAL ───────────────────────────────────────────────
      startTutorial: () => {
        const tutNode = {
          id:            'TUTORIAL_01',
          name:          'TRAINING_SIMULATION',
          specialDefense: null,
          firewallHP:    100,
          maxFirewallHP: 100,
          mutator:       null,
        };
        set({
          isTutorial:            true,
          tutorialStep:          'SCAN_INTRO',
          gameMode:              'campaign',
          status:                'hacking',
          nextStatus:            'transit',
          currentJobType:        'skim',
          digitalTrace:          0,
          physicalHeat:          0,
          firewallHealth:        100,
          firewallRevealed:      true,
          currentNode:           tutNode,
          sessionIntelEarned:    0,
          sessionPotentialIntel: 20,
          exposedTicks:          0,
          activeDaemon:          null,
          systemOverride:        null,
          packUpHeat:            0,
          packUpTrace:           0,
          comboChain:            [],
          transitOutcome:        null,
          isReplay:              false,
          toolState:             buildInitialToolState(999),
          terminalLog: [
            '// NEURAL_CALIBRATION :: TRAINING_SIMULATION_ONLINE',
            '// MASHA: "No live traffic. This is a safe environment."',
            '// MASHA: "Follow the prompts. Your operator license depends on it."',
          ],
        });
      },

      // ─── TICK ARCADE TIMER ────────────────────────────────────────────
      tickArcadeTimer: () => {
        const s = get();
        const newTime = s.arcadeStats.timeRemaining - 1;
        if (newTime <= 0) {
          set({
            arcadeStats:     { ...s.arcadeStats, timeRemaining: 0 },
            arcadeHighScore: Math.max(s.arcadeHighScore ?? 0, s.arcadeStats.score),
            status:          'resolved',
            transitOutcome:  'arcade_timeout',
          });
        } else {
          set({ arcadeStats: { ...s.arcadeStats, timeRemaining: newTime } });
        }
      },

      // ─── NEXT ARCADE NODE ─────────────────────────────────────────────
      nextArcadeNode: () => {
        const s = get();
        const prevMaxHP  = s.currentNode?.maxFirewallHP ?? 50;
        const multiplier = s.arcadeStats.multiplier ?? 1;
        const newHP      = prevMaxHP + 15;
        const newScore   = s.arcadeStats.score + multiplier;
        const newTime    = Math.min(99, s.arcadeStats.timeRemaining + 5);

        const ARCADE_MUTATORS = [
          { id: 'ARCHITECT', name: 'The Architect', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
          { id: 'SNIFFER',   name: 'The Sniffer',   color: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10' },
          { id: 'ICE_WALL',  name: 'Ice-Wall',      color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
          { id: 'VOLATILE',  name: 'Volatile Relay', color: 'text-orange-500 border-orange-600/50 bg-orange-600/10' },
        ];
        const mutator = (newScore % 3 === 0)
          ? ARCADE_MUTATORS[Math.floor(Math.random() * ARCADE_MUTATORS.length)]
          : null;

        const nodeIdx = newScore + 1;
        const nextNode = {
          id:             `ARCADE_${String(nodeIdx).padStart(2, '0')}`,
          name:           `SIM_TARGET_${String(nodeIdx).padStart(2, '0')}`,
          firewallHP:     newHP,
          maxFirewallHP:  newHP,
          specialDefense: null,
          mutator,
        };

        const scoreLog   = multiplier > 1 ? `+${multiplier} (x${multiplier} MULT)` : `+1`;
        const mutatorLog = mutator ? ` | MUTATOR: ${mutator.name.toUpperCase()}` : '';
        set({
          arcadeStats:     { ...s.arcadeStats, score: newScore, timeRemaining: newTime },
          digitalTrace:    0,
          currentNode:     nextNode,
          firewallHealth:  newHP,
          firewallRevealed: true,
          terminalLog:     appendLog(s.terminalLog, `// NODE BREACHED. SCORE ${scoreLog} | NEXT: ${nextNode.name} | FW: ${newHP} | TIME +5s${mutatorLog}`),
        });
      },

      // ─── APPLY ARCADE TRACE PENALTY ──────────────────────────────────
      applyArcadeTracePenalty: () => {
        const s = get();
        AudioManager.playSFX('error');
        const newTime = Math.max(0, s.arcadeStats.timeRemaining - 10);
        let penaltyLog = appendLog(s.terminalLog, `!! TRACE CRITICAL — PENALTY: -10s | TIME: ${newTime}s REMAINING !!`);
        penaltyLog = appendLog(penaltyLog, `>> ARCADE: Multiplier Reset — Connection Unstable`);
        set({
          digitalTrace: 0,
          arcadeStats:  { ...s.arcadeStats, timeRemaining: newTime, multiplier: 1 },
          terminalLog:  penaltyLog,
        });
      },

      // ─── RESET GAME ───────────────────────────────────────────────────
      // Full reset — called from VICTORY and GAME_OVER overlays.
      resetGame: () => {
        const freshNode = pickSkimNode();
        set({
          status:                'transit',
          gameMode:              'campaign',
          nextStatus:            'transit',
          isBreaching:           false,
          transitOutcome:        'initial',
          intelFragments:        0,
          upgrades:              buildInitialUpgradeState(),
          storyArchive:          [],
          currentJobType:        'skim',
          digitalTrace:          0,
          inventory:             [],
          activeModifiers:       [],
          lootAccumulator:       0,
          physicalHeat:          0,
          firewallHealth:        freshNode.firewallHP,
          currentNode:           freshNode,
          firewallRevealed:      false,
          sessionIntelEarned:    0,
          sessionPotentialIntel: 0,
          packUpHeat:            0,
          packUpTrace:           0,
          activeDaemon:          null,       // 'BLOODHOUND' | null
          exposedTicks:          0,          // How long the node remains exposed
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
          isTutorial:            false,
          tutorialStep:          null,
          // NOTE: hasBeatenGame / highestDarknetTier / settings intentionally omitted — preserved via shallow merge
          terminalLog:           nodeBootLog(freshNode),
          toolState:             buildInitialToolState(),
        });
      },

      // ─── ENTER DARKNET ────────────────────────────────────────────────
      // Transitions from the victory screen directly into the transit hub
      // so the player can access the Darknet Router without a full reset.
      enterDarknet: () => {
        const freshNode = pickSkimNode();
        set({
          status: 'transit',
          currentJobType: 'darknet',
          transitOutcome: 'initial',
          physicalHeat: 0,
          digitalTrace: 0,
          packUpHeat: 0,
          packUpTrace: 0,
          firewallHealth: freshNode.firewallHP,
          currentNode: freshNode,
          systemOverride: null,
          activeDaemon: null,
          exposedTicks: 0,
          rabbitTicks: 0,
          ghostTicks: 0,
          terminalLog: nodeBootLog(freshNode),
          toolState: buildInitialToolState(),
          isTutorial: false,
          tutorialStep: null,
          isReplay: false
        });
      },

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

      // ─── INITIALIZE DECK ─────────────────────────────────────────────
      initializeDeck: (isReduced) => {
        set((s) => ({
          // REMOVED the status line from here!
          settings: { 
            ...s.settings, 
            reducedMotion: isReduced,
            shakeEnabled:  isReduced ? false : s.settings.shakeEnabled,
            crtEnabled:    isReduced ? false : s.settings.crtEnabled,
            glitchEnabled: isReduced ? false : s.settings.glitchEnabled,
          }
        }));
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
      useConsumable: (itemId) => {
        const s = get();
        if (s.status !== 'hacking') return;
        if ((s.globalConsumableCooldown || 0) > 0) return;
        if ((s.consumables[itemId] ?? 0) <= 0) return;

        if (s.settings?.hapticsEnabled) haptic(15);
        AudioManager.playSFX('thock');

        const newConsumables = {
          ...s.consumables,
          [itemId]: s.consumables[itemId] - 1,
        };

        let cd = 3;
        if (s.kernelNodes.includes('ARCH_3')) cd = Math.max(1, Math.floor(cd * 0.5)); // KERNEL: Efficient Hardware

        if (itemId === 'ghost') {
          set({
            ghostTicks:  4, // 4 seconds of trace freeze
            consumables: newConsumables,
            terminalLog: appendLog(s.terminalLog, '>> GHOST.sys ACTIVATED. TRACE METRICS FROZEN.'),
            globalConsumableCooldown: cd,
          });
          return;
        }

        if (itemId === 'rabbit') {
          set({
            rabbitTicks: 5, // 5 seconds of DOT
            consumables: newConsumables,
            terminalLog: appendLog(s.terminalLog, '>> RABBIT VIRUS INJECTED — THEY ARE MULTIPLYING.'),
            globalConsumableCooldown: cd,
          });
          return;
        }
      },

    // ─── SIPHON VAULT / UPLOAD SKELETON KEY (Push Your Luck) ──────────
      siphonVault: () => {
        const s = get();

        // Tutorial SIPHON — run normal math; complete when trace reaches 30%
        if (s.isTutorial && s.tutorialStep === 'SIPHON_INTRO') {
          AudioManager.playSFX('thock');
          const newTrace    = s.digitalTrace + 3.5;
          const newIntel    = s.collectedIntel + 1;
          const isComplete  = newTrace >= 30;
          let newLog = appendLog(s.terminalLog, `>> SIPHON PULSE ${newIntel}: +3.5% TRACE EXPOSURE — INTEL EXTRACTED.`);
          if (isComplete) {
            newLog = appendLog(newLog, '>> [!] CALIBRATION COMPLETE. SECURING CONNECTION AND RETURNING TO SAFEHOUSE.');
          }
          set({
            digitalTrace:   newTrace,
            collectedIntel: newIntel,
            terminalLog:    newLog,
            ...(isComplete ? {
              isTutorial:     false,
              tutorialStep:   null,
              status:         'transit',
              transitOutcome: 'success',
              physicalHeat:   0,
            } : {}),
          });
          return;
        }

        if (s.status !== 'resolved' || s.transitOutcome !== 'success') return;

        const isTartarus = s.currentJobType === 'tartarus';
        const tracePenalty = isTartarus ? 15 : 3.5; 
        const intelReward  = 1;   

        const newTrace = s.digitalTrace + tracePenalty;

        if (newTrace >= 100) {
          if (isTartarus) {
            set({
              digitalTrace: 100,
              packUpTrace: 100,
              hasBeatenGame: true,
              tartarusBeaten: true,
              status: 'victory', 
              terminalLog: appendLog(s.terminalLog, ">> SKELETON KEY INJECTED. TARTARUS NODE OVERWRITTEN. SYSTEM OFFLINE.")
            });
          } else {
            get().packUp('trace_busted');
            set(cur => ({
              terminalLog: appendLog(cur.terminalLog, "// MEMO_FROM_MASHA: 'You stayed too long! I told you to get out!'")
            }));
          }
          return;
        }

        if (s.settings?.hapticsEnabled) haptic(isTartarus ? [50, 50] : 10); 

        // --- FIXED LOOT ROLL LOGIC ---
        let foundItem = null;
        let newAccumulator = s.lootAccumulator + intelReward;
        let lootLog = null;

        if (!isTartarus && newAccumulator >= 20) {
          const roll = Math.random();
          foundItem = modifiersData.find(m => roll < m.chance);

          if (foundItem) {
            newAccumulator = 0; 
            lootLog = `>> [LOOT_FOUND]: ${foundItem.name} extracted.`;
          }
        }

        let newLog = appendLog(s.terminalLog, 
          isTartarus 
            ? `>> INJECTING KEY... TRACE: ${newTrace.toFixed(0)}% [WARNING: FATAL KERNEL ERROR IMMINENT]` 
            : `>> SIPHONING... TRACE: ${newTrace.toFixed(0)}% (+${intelReward} IF)`
        );

        if (lootLog) newLog = appendLog(newLog, lootLog);

        // --- NEW: Stacking Logic ---
        let nextInventory = [...s.inventory];
        if (foundItem) {
          const existingIndex = nextInventory.findIndex(item => item.id === foundItem.id);
          if (existingIndex >= 0) {
            const existingItem = nextInventory[existingIndex];
            nextInventory[existingIndex] = { ...existingItem, count: (existingItem.count || 1) + 1 };
          } else {
            nextInventory.push({ ...foundItem, count: 1 });
          }
        }

        set({
          digitalTrace:       newTrace,
          packUpTrace:        newTrace, 
          sessionIntelEarned: s.sessionIntelEarned + intelReward,
          intelFragments:     s.intelFragments + intelReward, 
          lootAccumulator:    newAccumulator,
          inventory:          nextInventory,
          terminalLog:        newLog,
        });
      },

      // ─── USE HARDWARE / LOOT ──────────────────────────────────────────
      useHardware: (inventoryIndex) => {
        const s = get();
        if ((s.globalConsumableCooldown || 0) > 0) return;
        if (inventoryIndex < 0 || inventoryIndex >= s.inventory.length) return;

        const item = s.inventory[inventoryIndex];
        const newInventory = [...s.inventory];
        
        // --- NEW: Count Decrement Logic ---
        const currentCount = item.count || 1;
        if (currentCount > 1) {
          newInventory[inventoryIndex] = { ...item, count: currentCount - 1 };
        } else {
          newInventory.splice(inventoryIndex, 1); // Remove if it was the last one
        }

        let update = { inventory: newInventory };
        let logMsg = `>> [HARDWARE_USED]: ${item.name} activated.`;

        if (item.id === 'LIQUID_COOLER') {
          update.physicalHeat = 0;
          update.packUpHeat = 0;
        } else if (item.id === 'SIGNAL_BOOSTER') {
          update.digitalTrace = Math.max(0, s.digitalTrace - 30);
          update.packUpTrace = Math.max(0, s.packUpTrace - 30);
        } else if (item.id === 'ADMIN_KEY') {
          update.activeModifiers = [...s.activeModifiers, 'ADMIN_KEY'];
        } else if (item.id === 'RED_ONION') {
          logMsg = `// MEMO_FROM_MASHA: 'Ugh, delete that. Nobody wants RED_ONION.exe in the system.'`;
        }

        if (s.settings?.hapticsEnabled) haptic(15);
        AudioManager.playSFX('thock');

        let cd = 3;
        if (s.kernelNodes.includes('ARCH_3')) cd = Math.max(1, Math.floor(cd * 0.5)); // KERNEL: Efficient Hardware

        set(state => ({
          ...update,
          terminalLog: appendLog(state.terminalLog, logMsg),
          globalConsumableCooldown: cd,
        }));
      },

      // ─── KERNEL PURCHASES ─────────────────────────────────────────────
      purchaseKernelNode: (nodeId, cost) => {
        const s = get();
        if (s.rootAccessKeys >= cost && !s.kernelNodes.includes(nodeId)) {
          if (s.settings?.hapticsEnabled) haptic([30, 60, 30]);
          AudioManager.playSFX('success');
          set({
            rootAccessKeys: s.rootAccessKeys - cost,
            kernelNodes: [...s.kernelNodes, nodeId],
          });
        }
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
          // eslint-disable-next-line no-unused-vars
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

        if (version < 11) {
          state = { ...state, kernelNodes: [], rootAccessKeys: 0 };
        }

        if (version < 12) {
          // v12: Phase 1 polish — schema placeholder for future migrations
        }

        return state;
      },
    }
  )
);

export default useGameStore;