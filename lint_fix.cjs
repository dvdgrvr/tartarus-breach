const fs = require('fs');
let content = fs.readFileSync('src/scenes/HackingScene.jsx', 'utf8');

// Remove unused variables
content = content.replace("  const prevExposed = useRef(exposedTicks);\n", "");
content = content.replace("  const prevFW = useRef(firewallHealth);\n", "");
content = content.replace(/  \/\/ This logic chooses the animation based on your settings\n  const transitionClass = \(status === 'hacking'\) \n    \? \(reducedMotion \? "animate-fade-in" : "animate-rip-in"\) \n    : "";\n/m, "");

fs.writeFileSync('src/scenes/HackingScene.jsx', content, 'utf8');
