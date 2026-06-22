const fs = require('fs');
const filePath = 'src/app/feed/page.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the video container div with a snap scroll version
const oldContainer = 'style={{ width: \'calc(100vh * 9 / 16)\', maxWidth: \'400px\', minWidth: \'260px\' }}\n        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>';

const newContainer = 'style={{ width: \'calc(100vh * 9 / 16)\', maxWidth: \'400px\', minWidth: \'260px\' }}\n        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}\n        onWheel={handleWheel}>';

content = content.replace(oldContainer, newContainer);

fs.writeFileSync(filePath, content);
console.log('Done');
