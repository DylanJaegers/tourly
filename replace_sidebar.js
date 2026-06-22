const fs = require('fs');
const filePath = process.argv[2] || 'src/app/feed/page.js';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '<div className="hidden md:flex flex-col w-52 bg-zinc-950 border-r border-zinc-800 flex-shrink-0">';
const endMarker = '<div className="relative flex-shrink-0 h-screen bg-black"';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.log('Markers not found. Start:', startIdx, 'End:', endIdx);
  process.exit(1);
}

const before = content.slice(0, startIdx);
const after = content.slice(endIdx);

const replacement = '<SidebarNav onSearchClick={() => setShowSearchPanel(true)} onFilterClick={() => setShowFilterPanel(true)} />\n\n      ';

content = before + replacement + after;

const hasImport = content.indexOf('import SidebarNav') !== -1;
if (hasImport === false) {
  content = content.replace(
    "import Link from 'next/link'",
    "import Link from 'next/link'\nimport SidebarNav from '@/components/shared/sidebar-nav'"
  );
}

fs.writeFileSync(filePath, content);
console.log('Done - sidebar replaced with SidebarNav component');
