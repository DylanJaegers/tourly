const fs = require('fs');
const filePath = 'src/app/listing/[id]/page.js';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

const idx = lines.findIndex(function(line) { return line.indexOf('staticmap') !== -1 });
if (idx === -1) {
  console.log('staticmap line not found');
  process.exit(1);
}

console.log('Found staticmap at line', idx + 1);

const indent = lines[idx].match(/^(\s*)/)[1];
lines.splice(idx + 1, 0, indent + 'referrerPolicy="no-referrer"');

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Done - inserted referrerPolicy');
