const fs = require('fs');
const filePath = 'src/app/feed/page.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add handleWheel function after handleTouchEnd
const oldFn = "  function handleKeyDown(e) {";
const newFn = `  const wheelTimeout = typeof window !== 'undefined' ? { current: null } : { current: null }

  function handleWheel(e) {
    e.preventDefault()
    if (wheelTimeout.current) return
    wheelTimeout.current = setTimeout(function() { wheelTimeout.current = null }, 600)
    if (e.deltaY > 30) goNext()
    else if (e.deltaY < -30) goPrev()
  }

  function handleKeyDown(e) {`;

content = content.replace(oldFn, newFn);

// Add onWheel to the video container
content = content.replace(
  'onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>',
  'onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onWheel={handleWheel}>'
);

fs.writeFileSync(filePath, content);
console.log('Done - added scroll snap to feed');
