const fs = require('fs');
const filePath = 'src/app/feed/page.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the plain object with a proper useRef
content = content.replace(
  "  const wheelTimeout = typeof window !== 'undefined' ? { current: null } : { current: null }",
  "  const wheelTimeout = useRef(null)"
);

// Remove the duplicate handleWheel function (lines with the second wheelTimeout usage)
content = content.replace(
  `  function handleWheel(e) {
    e.preventDefault()
    if (wheelTimeout.current) return
    wheelTimeout.current = setTimeout(function() { wheelTimeout.current = null }, 600)
    if (e.deltaY > 30) goNext()
    else if (e.deltaY < -30) goPrev()
  }

  `,
  '  '
);

fs.writeFileSync(filePath, content);
console.log('Done - fixed wheelTimeout as useRef, removed duplicate handleWheel');
