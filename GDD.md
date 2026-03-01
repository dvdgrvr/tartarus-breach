Tartarus Breach - Game Design Document (GDD)
Current Stage: Verion I (MVP Foundation)
Core Genre: Mobile-First Hacking Survival Simulation
Inspiration: The cinematic, high-stakes energy of Hackers (1995) translated into a modern, tactile mobile experience.

1. Core Vision & Aesthetic
The "Modern Cyber-Rebel" Theme:

Color Palette: OLED pitch-black backgrounds with high-contrast, cinematic neon accents (acid green, electric blue, ultraviolet).

UI Style: Sleek glassmorphism mixed with reactive CSS "Glitch Art." UI elements should stutter or distort aesthetically when taking damage or when traces spike.

Typography: Clean, highly legible modern developer monospace (e.g., Fira Code, JetBrains Mono). No clunky retro 8-bit fonts.

The "Vertical Cyber-Deck" Perspective: The game is played in portrait mode. The screen represents a jailbroken, handheld Cyber-Deck. The UI is split: the central 85% is the active terminal/command interface, while the top and bottom edges (15%) show ambient environmental data (e.g., physical heat warnings, signal strength, or glitchy environmental reflections) to ground the device in the real world.

2. Technical Stack
Framework: React (Bootstrapped via Vite).

Styling: Tailwind CSS (For rapid, standardized "Everything is a Box" UI and easy color swapping).

State Management: Zustand (For lightweight, centralized tracking of game variables).

3. Core Gameplay Loop
The game operates on a continuous, high-tension cycle balancing digital theft with physical survival:

Scan & Target: Identify vulnerable servers.

Infiltrate (Hybrid Typing): Players do not use the native mobile keyboard. Instead, a custom "Command Bar" provides predictive, tap-to-type verbs (e.g., SCAN, BYPASS, PULSE) that instantly populate the terminal.

Manage The Dual-Threat:

Digital Trace (0-100): The server's awareness of the player. Scales non-linearly (slow at first, accelerating rapidly past 80% to induce panic).

Physical Heat (0-100): The real-world tracking of the player's physical location (safe house, cafe, etc.).

Relocate ("Transit Mode"): Before Physical Heat hits 100, the player must hit "Pack Up." This pauses hacking, resets Physical Heat, and enters a brief downtime screen where players can spend credits, read intercepted story logs, and breathe before the next hack.

4. Software Architecture Rules
To prevent spaghetti code and ensure future scalability, adhere to these structural pillars:

Strict MVC Separation: Keep game math and logic (Zustand store) completely isolated from the UI rendering (React components).

Centralized "Heartbeat": All timers, traces, and heat increases must be governed by a single, global "Tick" function (running every 1 second or 100ms) to ensure everything stays perfectly in sync when the game pauses or enters Transit Mode.

Extensible Tool Class: Do not hardcode individual tools. Build a modular system where new hacking tools can be added simply by defining their cost, cooldown, and effect in a configuration array.

5. Future-Proofing & Guardrails
Data-Driven Design: Do not hardcode story text, tool names, or item costs directly into React components. Create a src/data/ directory with JSON configuration files (e.g., toolsConfig.json, storyLogs.json). The UI must dynamically render from these data sources.

Centralized Audio Hooks: Set up an AudioController utility or hook early (e.g., playSFX('keystroke')). Even if audio assets are missing in Verion I, the infrastructure must be in place so sound files can be dropped in seamlessly later.

Accessibility (The "Color + Motion" Rule): Never use color changes as the sole indicator of danger or state change. If the Physical Heat bar turns red, it must also include an icon [!] and a CSS animation (like a pulse or glitch) to ensure legibility and kinetic game feel.

6. Cross-Device Save System (Verion I)
Instead of building a complex cloud database and authentication system for the MVP, we will use a thematic "Encrypted Kernel" approach:

Local Persistence: Use Zustand's built-in persist middleware to save the game state to the device's local browser storage automatically.

Versioning: Include a saveVersion: 1 variable in the Zustand store to prevent future updates from crashing older local saves.

The "Export/Import" Mechanic: Build a settings menu option to "Export Encrypted Kernel." This function will serialize the Zustand store into a base64 encoded string and copy it to the user's clipboard. A corresponding "Inject Kernel" input will decode a pasted string and overwrite the local state, allowing players to manually move their save between devices.

7. Anti-Spaghetti Code Organization
The "Magic Number" Quarantine: No hardcoded gameplay values (timers, trace limits, heat increments, UI delay timings) are allowed in component files or the Zustand store. All tunable gameplay variables must be exported from a single src/config/constants.js file.

Strict Component Atomization: UI components must be small and modular. Do not build monolithic files. For example, the Vertical Cyber-Deck must be broken down into discrete components (e.g., TerminalLog.jsx, CommandBar.jsx, PeripheralBorder.jsx).

Clean Scene Routing: Do not use deeply nested ternary operators to manage game screens. App.jsx should act as a clean View Manager that reads gameStore.status and returns the appropriate top-level scene (e.g., <HackingScene /> or <TransitScene />).

Zustand Actions vs. UI Logic: React components should only dispatch actions (e.g., executeCommand('PULSE')). The actual mathematical resolution of that command (checking RAM, lowering the firewall) must happen inside the Zustand store or dedicated helper functions, never inside the UI click handler.

8. Out of Scope for Verion I
3D graphics or complex environment rendering.

Multiplayer features or cloud databases.

Branching narrative trees (Story will be delivered linearly via simple text/chat logs during Transit Mode).