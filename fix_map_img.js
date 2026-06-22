const fs = require('fs');
const filePath = 'src/app/listing/[id]/page.js';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

const srcIdx = lines.findIndex(function(l) { return l.indexOf('staticmap?center=') !== -1 });
if (srcIdx === -1) { console.log('not found'); process.exit(1) }

const indent = lines[srcIdx].match(/^(\s*)/)[1];

lines[srcIdx] = indent + 'src={`https://maps.googleapis.com/maps/api/staticmap?center=${listing.lat},${listing.lng}&zoom=14&size=600x300&scale=2&maptype=roadmap&markers=color:0x1a1a1a%7C${listing.lat},${listing.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}';

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Done - fixed map src to use template literal');
