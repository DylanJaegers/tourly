const fs = require('fs');
const filePath = 'src/app/agent/dashboard/page.js';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  '        {!agent?.is_verified && (',
  `        <div className="mt-4 bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Browse listings as a buyer</p>
            <p className="text-xs text-gray-400 mt-0.5">See Tourly the way your buyers do</p>
          </div>
          <button onClick={() => router.push('/feed')}
            className="bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition flex-shrink-0">
            Browse feed →
          </button>
        </div>

        {!agent?.is_verified && (`
);

fs.writeFileSync(filePath, content);
console.log('Done - added Browse listings button to agent dashboard');
