const fs = require('fs');
const content = fs.readFileSync('src/scenes/HackingScene.jsx', 'utf8');
if (content.includes('const log              = useGameStore(s => s.terminalLog); // ADDED: Pull the log state')) {
  console.log("Failed to remove log from FirewallRow");
} else {
  console.log("Successfully removed log from FirewallRow");
}
if (content.includes('function FirewallRow({ parsedLog }) {')) {
  console.log("Successfully added parsedLog to FirewallRow");
} else {
  console.log("Failed to add parsedLog to FirewallRow");
}
