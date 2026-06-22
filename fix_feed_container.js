const fs = require('fs');
const filePath = 'src/app/feed/page.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add videoContainerRef after existing refs
content = content.replace(
  '  const touchStartX = useRef(0)',
  '  const touchStartX = useRef(0)\n  const videoContainerRef = useRef(null)'
);

// Add useEffect to attach non-passive wheel listener
const oldUseEffect = "  useEffect(() => { loadFeed(); checkUser() }, [activeTab])";
const newUseEffect = `  useEffect(() => { loadFeed(); checkUser() }, [activeTab])

  useEffect(() => {
    const el = videoContainerRef.current
    if (!el) return
    function onWheel(e) {
      e.preventDefault()
      if (wheelTimeout.current) return
      wheelTimeout.current = setTimeout(function() { wheelTimeout.current = null }, 600)
      if (e.deltaY > 30) goNext()
      else if (e.deltaY < -30) goPrev()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return function() { el.removeEventListener('wheel', onWheel) }
  }, [currentIndex, listings.length, animating])`;

content = content.replace(oldUseEffect, newUseEffect);

// Remove the onWheel from JSX since we're using native listener now
content = content.replace(
  'onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onWheel={handleWheel}>',
  'onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>'
);

// Replace the video container div with ref and new 9:16 layout
content = content.replace(
  `      <div className="relative flex-shrink-0 h-screen bg-black"\n        style={{ width: 'calc(100vh * 9 / 16)', maxWidth: '400px', minWidth: '260px' }}\n        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>`,
  `      <div\n        ref={videoContainerRef}\n        className="relative flex-shrink-0 h-screen bg-black flex items-center justify-center overflow-hidden"\n        style={{ width: 'calc(100vh * 9 / 16)', maxWidth: '420px', minWidth: '280px' }}\n        onTouchStart={handleTouchStart}\n        onTouchEnd={handleTouchEnd}>`
);

fs.writeFileSync(filePath, content);
console.log('Done - fixed scroll container');
