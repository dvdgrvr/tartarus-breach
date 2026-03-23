const fs = require('fs');
let content = fs.readFileSync('src/scenes/HackingScene.jsx', 'utf8');

// Remove unused exposedTicks in HackingScene
content = content.replace("  const exposedTicks   = useGameStore(s => s.exposedTicks);\n", "");

fs.writeFileSync('src/scenes/HackingScene.jsx', content, 'utf8');
