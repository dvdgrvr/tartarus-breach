const fs = require('fs');
const filepath = 'src/scenes/HackingScene.jsx';
let content = fs.readFileSync(filepath, 'utf8');

// I already ran my global patcher but let's make sure it caught everything

if (content.includes('function TraceRow({ parsedLog })')) {
  console.log("TraceRow has parsedLog");
} else {
  console.log("TraceRow does not have parsedLog");
}

if (content.includes('<TraceRow parsedLog={parsedLog} />')) {
  console.log("HackingScene passes parsedLog to TraceRow");
} else {
  console.log("HackingScene does not pass parsedLog to TraceRow");
  content = content.replace('<TraceRow />', '<TraceRow parsedLog={parsedLog} />');
  fs.writeFileSync(filepath, content, 'utf8');
}

if (content.includes('<FirewallRow parsedLog={parsedLog} />')) {
  console.log("HackingScene passes parsedLog to FirewallRow");
} else {
  console.log("HackingScene does not pass parsedLog to FirewallRow");
  content = content.replace('<FirewallRow />', '<FirewallRow parsedLog={parsedLog} />');
  fs.writeFileSync(filepath, content, 'utf8');
}
