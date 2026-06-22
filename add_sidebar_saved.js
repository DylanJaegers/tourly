const fs = require('fs');
const filePath = 'src/app/saved/page.js';
let content = fs.readFileSync(filePath, 'utf8');

if (content.indexOf('import SidebarNav') === -1) {
  content = content.replace(
    "import Link from 'next/link'",
    "import Link from 'next/link'\nimport SidebarNav from '@/components/shared/sidebar-nav'"
  );
}

content = content.replace(
  '    <div className="min-h-screen bg-gray-50">\n      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">',
  '    <div className="min-h-screen bg-gray-50 md:flex">\n      <SidebarNav />\n      <div className="flex-1 min-w-0">\n      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">'
);

const lastCloseIdx = content.lastIndexOf('    </div>\n  )\n}');
if (lastCloseIdx !== -1) {
  content = content.slice(0, lastCloseIdx) + '    </div>\n    </div>\n  )\n}' + content.slice(lastCloseIdx + '    </div>\n  )\n}'.length);
}

fs.writeFileSync(filePath, content);
console.log('Done - sidebar added to saved page');
