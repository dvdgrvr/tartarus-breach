# Tartarus Breach — Polish & Focus Spec (v1)

**Goal:** Ship-ready polish pass. Strengthen the core loop's skill expression (timing + greed + reads), cut/hide complexity that adds math instead of skill, fix known bugs, improve readability for a wider audience — WITHOUT breaking the tactile toy layer (buttons, glitches, haptics, Masha) that playtesting validated.

**Prime directive for the implementer:** This is a SUBTRACTION and FOCUS pass. Do not add new systems, screens, currencies, or content beyond what is specified. When in doubt, cut or gate.

**Stack:** React + Vite, Zustand (persist), Tailwind. All gameplay math lives in `src/store/useGameStore.js`; tunables in `src/config/constants.js`; data in `src/data/*.json`.

---

## Phase 1 — Bug Fixes & Repo Hygiene (no gameplay changes)

**1.1 — SAVE_VERSION single source of truth.**
`src/config/constants.js` exports `SAVE_VERSION = 10` but `src/store/useGameStore.js` hardcodes `const SAVE_VERSION = 11`. Delete the local constant in the store, import `SAVE_VERSION` from constants, set the value in constants to `12` (this spec will change persisted state shape in later phases; bump once now). Verify the Zustand `persist` `version` and `migrate` use the imported value.

**1.2 — Missing `noise.png`.**
`src/index.css` (~line 643) references `url("/noise.png")` which does not exist in `public/`. Either (a) generate a small tiling noise texture (128×128 PNG, subtle monochrome, <10KB) and add it to `public/`, or (b) replace the reference with a pure-CSS noise substitute (e.g., an SVG feTurbulence data-URI). Prefer (b) — zero asset weight. Confirm the CRT overlay renders in a production build.

**1.3 — Dead data file.**
`src/data/nodesConfig.json` is never imported; node pools are hardcoded in the store (`SKIM_NODES`, `PRIORITY_NODES`, `MILESTONE_NODES`, `TARTARUS_NODE_DEF`). Move those four definitions INTO `nodesConfig.json` (restructure the JSON as `{ "skim": [...], "priority": [...], "milestones": {...}, "tartarus": {...} }`) and import from the store. Delete the hardcoded arrays. No balance values change.

**1.4 — Delete dev debris from repo root.**
Remove: `patch.cjs`, `patch_trace_row.cjs`, `lint_fix.cjs`, `lint_fix_2.cjs`, `test_patch.cjs`, `bench_logic.js`, `bench_react.jsx`, `benchmark.js`, `run_bench_react.cjs`, `run_benchmark.cjs`.

**1.5 — README.**
Replace the default Vite README with: one-paragraph game description, screenshot placeholder, play link (Vercel), local dev instructions (`npm i && npm run dev`), and a pointer to `GDD.md`.

**1.6 — Icon weight.**
`public/icon-512.png` is 712KB and `icon-192.png` is 112KB. Recompress both (pngquant or equivalent) to under 60KB / 20KB respectively. Verify `manifest.json` still resolves them.

**Acceptance:** `npm run build` clean with no unresolved-asset warnings; repo root contains only config, docs, `public/`, `src/`.

---

## Phase 2 — Onboarding & First-Run Flow

**2.1 — Auto-route new players into the tutorial.**
In the main menu, if `isNewGame` (already computed: `storyArchive.length === 0 && intelFragments === 0 && !tartarusBeaten`), the primary button becomes `[ INITIATE UPLINK ]` but its onClick calls `startTutorial()` instead of `setStatus('transit')`. On tutorial completion, flow directly into the first real skim node (do not bounce back to the menu). Keep the separate `[ NEURAL_CALIBRATION ]` button for replaying the tutorial, but move it below `[ SYS_CONFIG ]` and relabel its subtext "Replay the guided tutorial."

**2.2 — Hide Arcade mode from brand-new players.**
`[ 60-SEC SIMULATION ]` button renders only when `storyArchive.length >= 1` (i.e., the player has breached at least one story node). New players see exactly two meaningful choices: play, or settings.

**2.3 — Progressive system gating.**
Introduce one pressure system at a time. Gate by `storyArchive.length` (campaign progress), stored checks inside the store's `tick` and `startNewSession`:

| System | Currently | Gate to |
|---|---|---|
| Active counter-measures (`systemOverride`) | trace > 30, any non-skim node | `storyArchive.length >= 2` |
| Bloodhound daemon | trace > 20, any non-skim node | `storyArchive.length >= 3` |
| Node mutators (VOLATILE, ICE_WALL, GOLD_CACHE, etc.) | random on priority nodes | `storyArchive.length >= 4` |
| Consumables bar (rabbit/ghost) | always visible | first visible in Transit after `storyArchive.length >= 3` |
| Kernel Overrides menu | always visible | visible after first Root Access Key is earned |

Each system's FIRST appearance must be announced by a one-shot Masha line in the terminal (use the existing `tutorialFlags` pattern — add flags as needed).

**Acceptance:** A fresh profile (cleared localStorage) goes menu → tutorial → first node with zero daemons/overrides/mutators, and each later system introduces itself exactly once.

---

## Phase 3 — Core Loop Skill Pass ("Timing + Greed + Reads")

This is the design heart of the update. The skill expression is: (1) hit timing windows, (2) decide how greedy to be, (3) know when to bail. All three exist in the codebase in buried form; this phase surfaces them and removes the fake-depth systems they replace.

**3.1 — Make the Pulse the visible heartbeat.**
Current: `PULSE_INTERVAL_TICKS = 4`, `PULSE_WINDOW_TICKS = 1`, minor bonus, minimal UI.
New:
- Render a prominent pulse indicator on the hacking screen — a ring or bar that visibly charges over the interval and "opens" during the window (distinct color + scale animation + soft SFX + light haptic on open). Respect `reducedMotion` (swap animation for a static high-contrast state change).
- ANY tool fired during the open window is a **Sync Hit**: +50% firewall damage on damage tools, −50% trace/heat cost on utility tools (PULSE, DECRYPT). Tune constants in `constants.js` (`SYNC_DMG_MULT`, `SYNC_COST_MULT`).
- Track `syncStreak` in session state. Consecutive Sync Hits increment it; a non-synced tool press resets it (no penalty — just streak loss). At streak 3+, add a subtle escalating visual (glow intensity) and a Masha line at first streak-3 ("You're in the rhythm. Keep it.").
- Terminal logs a short `>> SYNC` tag on synced actions.

**3.2 — Surface the greed decision (the "Ghost or Greed" moment).**
When the firewall hits 0, instead of auto-resolving, freeze pressure decay/gain for a beat and present a full-width two-button choice (reuse `ResolvedStateButtons` styling):
- **[ GHOST OUT ]** — bank `sessionPotentialIntel`, end node, outcome `success`.
- **[ SIPHON THE VAULT ]** — enter the existing push-your-luck siphon flow (this already exists in the store as the Siphon Vault mechanic ~line 1505; make it the explicit branch here rather than a discoverable option).
Show the stakes on the buttons themselves: "Bank {X} intel" vs "Risk it — trace is at {Y}%". This choice IS the game; it must be unmissable every breach.

**3.3 — Remove the hidden combo chain.**
Delete the SCAN→DECRYPT→PULSE `comboChain` sequence logic (`executeCommand`, ~lines 584–605), `comboChain` state, and `ComboDisplay.jsx` usages tied to it. The Sync streak (3.1) replaces it as the visible skill-combo. Keep the `ComboDisplay` component file only if repurposed for the sync streak counter; otherwise delete.

**3.4 — Grade the read.**
The existing Masha post-node reactions already grade performance by trace. Extend the end-of-node summary (`SessionSummary` in `TransitScene.jsx`) with a single letter-style grade derived from final trace/heat and sync-hit ratio: GHOST (trace<15), CLEAN (<50), LOUD (<85), RECKLESS (≥85). Display it as the badge headline. No rewards attached — it's purely a legible skill signal.

**Acceptance:** A player who never reads a tooltip can (a) see and hit the pulse window, (b) face an explicit bank-or-risk choice every breach, (c) see a grade that tells them how skillfully they played.

---

## Phase 4 — Simplification & Cuts

**4.1 — Kernel tree trim.**
Reduce from 3 trees × 12 nodes to **2 trees × 4 nodes each** (GHOST = stealth, SLEDGEHAMMER = aggression; delete ARCHITECT). Keep only nodes whose effect a player can FEEL in one sentence (e.g., "start each node at −10 trace"). Delete all percentage-stacking nodes below a 15% effect size. Update `kernelConfig.json` and any capstone checks in the store (`GHOST_CAP`, etc.). Root Access Key economy: reprice so a full tree costs the same total keys as before.

**4.2 — Safehouse simplification.**
Keep the 5 safehouses and their flavor, but reduce each to AT MOST ONE modifier (delete the second stat on TANGO/ECHO/GHOST/WRAITH). One safehouse = one sentence = one feel.

**4.3 — Upgrade tracks.**
Keep all 3 (RAM / SIGNAL / BYPASS_STRENGTH) — they're legible — but cap at level 3 instead of 5 and rescale per-level effects so max-level power is unchanged (e.g., RAM: −8%/level×5 → −13%/level×3). Fewer, chunkier purchases.

**4.4 — Modifier/loot table.**
Keep the 4 hardware modifiers as-is. Do not add more.

**4.5 — Migration.**
`persist` migrate function: players with deleted kernel nodes get their spent keys refunded; upgrade levels above the new cap clamp to cap. Bump handled by Phase 1's version 12.

**Acceptance:** Every purchasable effect in the game can be explained in one plain sentence; no player-facing effect below 10%.

---

## Phase 5 — Readability & Visual Calm Pass (finalized against phone screenshots)

**5.1 — Wire the existing node ring to the Sync mechanic (ties into Phase 3.1).**
The large circular dial at the top of the hacking screen is currently decorative and consumes ~40% of vertical space. Repurpose it AS the sync-window indicator: it visibly charges across `PULSE_INTERVAL_TICKS` and "opens" (color shift + scale beat + soft SFX + light haptic) during the window. Do not build a second, separate pulse indicator. Fix the layout bug where the ring clips behind the TERMINAL_UPLINK panel (z-index/overflow). If the ring cannot carry the sync role for technical reasons, shrink it to ≤25% of vertical space — decoration does not outrank gameplay info.

**5.2 — Unify and label the danger meters.**
Currently HEAT is labeled at the very top of the screen while the trace bar sits unlabeled beneath FW_HP mid-screen. Create a single paired "danger cluster" adjacent to FW_HP: two labeled bars, `TRACE` and `HEAT`, identical styling, percentage readouts. Remove the top-of-screen heat bar (the top strip keeps only SYS). Both meters follow the Phase 5.6 glow hierarchy.

**5.3 — Collapse the consumable/inject sprawl.**
Four full-width slots (RABBIT, GHOST.SYS, two INJECT buttons) currently sit between status readouts and the tool grid. Replace with a single compact horizontal strip of icon chips with count badges, directly above the tool grid, expandable on tap (bottom-sheet or inline expand) to show names/descriptions and confirm use. Tools remain the dominant, thumb-closest interactive row. Additionally: cap consumable/hardware stack counts at 3 (`MAX_CONSUMABLE_STACK` in constants; migration clamps existing stacks) — stacks of 6–11 remove the decision from using one.

**5.4 — Audit tool subtitles vs. actual effects.**
On-screen subtitles read SCAN [FIND WEAKNESS], BYPASS [STRIKE CORE], PULSE [DROP TRACE], DECRYPT [CRACK ARMOR]. Per `toolsConfig.json`, SCAN is the brute-force high-damage/high-trace tool and BYPASS is the surgical low-trace strike — the SCAN/BYPASS subtitles appear swapped, and DECRYPT's actual primary function is revealing firewall metrics. Reconcile so every subtitle states the tool's true primary effect in 2–3 words (suggested: SCAN [RAW DAMAGE / LOUD], BYPASS [QUIET DAMAGE], PULSE [DROP TRACE], DECRYPT [REVEAL / PURGE]). Subtitles live in `toolsConfig.json` as a `subtitle` field, not hardcoded in components.

**5.5 — Fix the "Ghost" naming collision.**
Four unrelated things are named Ghost: safehouse GHOST, safehouse ECHO's trait displayed as "GHOST", the GHOST.SYS consumable, and the GHOST kernel tree. Rename: safehouse GHOST → "SIPHON" (its trait is intel-focused); ECHO's trait chip displays "STEALTH" instead of "GHOST"; kernel tree GHOST may keep its name (it's the thematic anchor); GHOST.SYS consumable keeps its name. Result: the word appears in exactly two places, both meaning stealth.

**5.6 — Attention hierarchy rule (one glow at a time).**
At any moment exactly ONE element may glow/pulse for attention: the sync ring by default; a danger meter overrides it at ≥80%; the Ghost-or-Greed choice (Phase 3.2) overrides everything. Audit and mute simultaneous glows (tool buttons, daemon flash, meter pulses). Implement as a small `attentionPriority` helper the components consult, not per-component ad-hoc logic.

**5.7 — Terminal noise reduction.**
Cap ambient/flavor lines to at most 1 per 10 ticks; gameplay-consequence lines (warnings, sync hits, daemon spawns) always print. Dim flavor lines (existing zinc tone) one step further so consequence lines visually pop.

**5.8 — SYS_COMMS banner behavior.**
The persistent top banner on the safehouse screen currently pins late-game Masha lines (including endgame spoiler text) indefinitely. Banners auto-dismiss after 12 seconds or on tap of [x]; dismissed lines land in the LOGS tab. Never pin story lines across sessions.

**5.9 — Readability toggle.**
Add `settings.readableMode` (default OFF). When ON: bump base font sizes one Tailwind step across terminal, buttons, and meters; render Masha/story/flavor text in sentence case instead of uppercase; increase line-height on `TerminalLog`. Implement as a top-level class on the app root (`readable-mode`) with CSS overrides — do not fork components. Offer it on the existing boot advisory screen as a third, smaller link-style option ("Improve text readability") so it's discoverable at first launch; the boot screen's current two-choice layout and copy otherwise remain exactly as-is (it is the quality bar for the rest of the UI).

**5.10 — Desktop frame.**
On viewports wider than 640px, clamp the game to a centered 420px column with a dark ambient background and subtle grid, so shared links look intentional on desktop.

**Acceptance:** Hacking screen has ≤8 always-visible interactive elements (SYS, consumable strip, 4 tools, PACK_UP, ring); both danger meters labeled and co-located; no two elements glow simultaneously; all tool subtitles match config effects.

---

## Phase 6 (Optional, last) — Store Refactor

Only if time remains in the box. Split `useGameStore.js` (1,786 lines) into slice modules combined into one store: `slices/sessionSlice.js` (tick, trace/heat, node lifecycle), `slices/toolsSlice.js` (executeCommand, cooldowns, sync), `slices/metaSlice.js` (upgrades, kernel, inventory, settings), `slices/arcadeSlice.js`. Zero behavior changes; this is mechanical extraction. Do NOT combine with any other phase — refactor-only commits.

---

## Out of Scope (do not implement)

- New tools, nodes, story content, currencies, or game modes
- Cloud saves, auth, leaderboards
- Any new meta-progression system
- Rebalancing beyond what Phases 3–4 specify

## Suggested commit order

One phase per PR/commit-group, in order. Phases 1–2 are independent of 3–4 and can ship immediately. Phase 5 waits on screenshot review for 5.4. Phase 6 only inside remaining time.