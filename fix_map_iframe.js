const fs = require('fs');
const filePath = 'src/app/listing/[id]/page.js';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

const linkIdx = lines.findIndex(function(l) { return l.indexOf('block relative rounded-xl overflow-hidden h-48 group') !== -1 });
if (linkIdx === -1) { console.log('link not found'); process.exit(1) }

console.log('Found link at line', linkIdx + 1);

const endIdx = lines.findIndex(function(l, i) { return i > linkIdx && l.indexOf('</Link>') !== -1 });
if (endIdx === -1) { console.log('end link not found'); process.exit(1) }

console.log('Found end link at line', endIdx + 1);

const indent = lines[linkIdx].match(/^(\s*)/)[1];

const newBlock = [
  indent + '<Link href={"/map?listing=" + listing.id} className="block relative rounded-xl overflow-hidden h-48 group">',
  indent + '  <div className="w-full h-full relative">',
  indent + '    <iframe',
  indent + '      src={"https://www.google.com/maps/embed/v1/place?key=" + (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "") + "&q=" + listing.lat + "," + listing.lng + "&zoom=14"}',
  indent + '      className="absolute inset-0 w-full h-full border-0 pointer-events-none rounded-xl"',
  indent + '      loading="lazy"',
  indent + '      allowFullScreen',
  indent + '    />',
  indent + '    <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-10 transition flex items-center justify-center">',
  indent + '      <span className="bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition shadow-md">View on map</span>',
  indent + '    </div>',
  indent + '  </div>',
  indent + '</Link>',
];

lines.splice(linkIdx, endIdx - linkIdx + 1, ...newBlock);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Done - replaced static map img with embedded iframe');
