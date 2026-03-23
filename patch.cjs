const fs = require('fs');
const filepath = 'src/scenes/HackingScene.jsx';
let content = fs.readFileSync(filepath, 'utf8');

// We need to inject `parsedLog` into HackingScene and pass it to children.

content = content.replace(
  "function FirewallRow() {",
  "function FirewallRow({ parsedLog }) {"
);

content = content.replace(
  "const log              = useGameStore(s => s.terminalLog); // ADDED: Pull the log state",
  ""
);

content = content.replace(
  "const recentLogs = (log || []).slice(-3).map(l => typeof l === 'string' ? l : (l?.text || ''));",
  "const recentLogs = parsedLog.slice(-3);"
);

content = content.replace(
  "}, [firewallHealth, log]);",
  "}, [firewallHealth, parsedLog]);"
);

content = content.replace(
  "function TraceRow() {",
  "function TraceRow({ parsedLog }) {"
);

content = content.replace(
  "const rawLog        = useGameStore(s => s.terminalLog);",
  ""
);

content = content.replace(
  /const log = useMemo\(\(\) =>[\s\S]*?\[rawLog\]\s*\);/,
  "const log = parsedLog;"
);

content = content.replace(
  "function BossCore({ trace, heat, fwHealth, maxFw }) {",
  "function BossCore({ trace, heat, fwHealth, maxFw, parsedLog }) {"
);

content = content.replace(
  "const rawLog = useGameStore(s => s.terminalLog);",
  ""
);

content = content.replace(
  /const recentLogs = useMemo\(\(\) => \{[\s\S]*?\}, \[rawLog\]\);/,
  "const recentLogs = parsedLog.slice(-3);"
);

content = content.replace(
  "function MashaCodec() {",
  "function MashaCodec({ parsedLog }) {"
);

content = content.replace(
  "const rawLog = useGameStore(s => s.terminalLog);",
  ""
);

content = content.replace(
  /const safeLog = rawLog \|\| \[\];/,
  ""
);

content = content.replace(
  /if \(safeLog.length === 0\) return;/,
  "if (parsedLog.length === 0) return;"
);

content = content.replace(
  /const recentLogs = safeLog.slice\(-3\).map\(l => typeof l === 'string' \? l : l\?.text\).filter\(Boolean\);/,
  "const recentLogs = parsedLog.slice(-3).filter(Boolean);"
);

content = content.replace(
  /}, \[rawLog\]\);/,
  "}, [parsedLog]);"
);

// HackingScene hook changes
content = content.replace(
  "const isTutorial             = useGameStore(s => s.isTutorial);",
  "const isTutorial             = useGameStore(s => s.isTutorial);\n  const rawLog                 = useGameStore(s => s.terminalLog);"
);

content = content.replace(
  "const tutorialStep           = useGameStore(s => s.tutorialStep);",
  "const tutorialStep           = useGameStore(s => s.tutorialStep);\n\n  const parsedLog = useMemo(() =>\n    (rawLog || []).map(entry => typeof entry === 'string' ? entry : (entry?.text || '')),\n  [rawLog]);"
);

// Prop injection
content = content.replace(
  /<BossCore \n          trace=\{trace\} \n          heat=\{heat\} \n          fwHealth=\{firewallHealth\} \n          maxFw=\{node\?.maxFirewallHP \|\| 100\}\n        \/>/g,
  "<BossCore \n          trace={trace} \n          heat={heat} \n          fwHealth={firewallHealth} \n          maxFw={node?.maxFirewallHP || 100}\n          parsedLog={parsedLog}\n        />"
);

content = content.replace(
  /<MashaCodec \/>/g,
  "<MashaCodec parsedLog={parsedLog} />"
);

content = content.replace(
  /<FirewallRow \/>/g,
  "<FirewallRow parsedLog={parsedLog} />"
);

content = content.replace(
  /<TraceRow \/>/g,
  "<TraceRow parsedLog={parsedLog} />"
);

fs.writeFileSync(filepath, content, 'utf8');
console.log("Patched!");
