const fs = require('fs');
const filePath = 'src/app/feed/page.js';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find the start of the ternary: ") : currentListing ? ("
const ternaryIdx = lines.findIndex(function(l) { return l.indexOf(') : currentListing ? (') !== -1 });
console.log('Found ternary at line', ternaryIdx + 1);

// Find the closing of the whole listings ternary - look for ": null}"
const nullIdx = lines.findIndex(function(l, i) { return i > ternaryIdx && l.trim() === ') : null}' });
console.log('Found null close at line', nullIdx + 1);

if (ternaryIdx === -1 || nullIdx === -1) {
  console.log('Could not find markers');
  process.exit(1);
}

const indent = '          ';

const newSection = [
  '        ) : currentListing ? (',
  indent + '<div className="absolute inset-0">',
  '',
  indent + '  {animating && exitingIndex !== null && listings[exitingIndex] && (',
  indent + '    <div key={"exit-" + exitingIndex} className={"absolute inset-0 z-10 " + (direction === "up" ? "slide-out-top" : "slide-out-bottom")}>',
  indent + '      {getVid(listings[exitingIndex]) ? (',
  indent + '        <video className="w-full h-full object-cover" autoPlay muted loop playsInline',
  indent + '          src={"https://stream.mux.com/" + getVid(listings[exitingIndex]).mux_playback_id + ".m3u8"} />',
  indent + '      ) : getCover(listings[exitingIndex]) ? (',
  indent + '        <img src={getCover(listings[exitingIndex])} alt="" className="w-full h-full object-cover" />',
  indent + '      ) : (',
  indent + '        <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><span className="text-6xl">🏠</span></div>',
  indent + '      )}',
  indent + '      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />',
  indent + '    </div>',
  indent + '  )}',
  '',
  indent + '  <div className={"absolute inset-0 " + (animating ? (direction === "up" ? "slide-in-bottom" : "slide-in-top") : "")}>',
  indent + '    {getVid(currentListing) ? (',
  indent + '      <video key={currentListing.id} className="w-full h-full object-cover" autoPlay muted loop playsInline',
  indent + '        src={"https://stream.mux.com/" + getVid(currentListing).mux_playback_id + ".m3u8"} />',
  indent + '    ) : getCover(currentListing) ? (',
  indent + '      <img src={getCover(currentListing)} alt={currentListing.address} className="w-full h-full object-cover" />',
  indent + '    ) : (',
  indent + '      <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><span className="text-6xl">🏠</span></div>',
  indent + '    )}',
  indent + '    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />',
  indent + '  </div>',
];

// Find all lines between ternary and null close that are part of the video section
// We need to replace from ternaryIdx to nullIdx with our new section + keep the overlays
// First find where the overlays start (top bar tabs)
const overlayIdx = lines.findIndex(function(l, i) { return i > ternaryIdx && l.indexOf('absolute top-0 left-0 right-0') !== -1 });
console.log('Found overlay at line', overlayIdx + 1);

// Replace just the video rendering part (from after ternary to before overlays)
lines.splice(ternaryIdx, overlayIdx - ternaryIdx, ...newSection);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Done - replaced video section with two-video animation');
