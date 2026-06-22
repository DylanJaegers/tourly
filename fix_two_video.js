const fs = require('fs');
const filePath = 'src/app/feed/page.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add exitingIndex state
content = content.replace(
  "  const [direction, setDirection] = useState('up')\n  const [animating, setAnimating] = useState(false)",
  "  const [direction, setDirection] = useState('up')\n  const [animating, setAnimating] = useState(false)\n  const [exitingIndex, setExitingIndex] = useState(null)"
);

// Replace goNext
const oldGoNext = `  function goNext() {
    if (currentIndex < listings.length - 1 && !animating) {
      setDirection('up')
      setAnimating(true)
      setTimeout(function() {
        setCurrentIndex(function(p) { return p + 1 })
        setAnimating(false)
      }, 300)
    }
  }`;

const newGoNext = `  function goNext() {
    if (currentIndex < listings.length - 1 && !animating) {
      setDirection('up')
      setExitingIndex(currentIndex)
      setAnimating(true)
      setCurrentIndex(function(p) { return p + 1 })
      setTimeout(function() {
        setAnimating(false)
        setExitingIndex(null)
      }, 380)
    }
  }`;

content = content.replace(oldGoNext, newGoNext);

// Replace goPrev
const oldGoPrev = `  function goPrev() {
    if (currentIndex > 0 && !animating) {
      setDirection('down')
      setAnimating(true)
      setTimeout(function() {
        setCurrentIndex(function(p) { return p - 1 })
        setAnimating(false)
      }, 300)
    }
  }`;

const newGoPrev = `  function goPrev() {
    if (currentIndex > 0 && !animating) {
      setDirection('down')
      setExitingIndex(currentIndex)
      setAnimating(true)
      setCurrentIndex(function(p) { return p - 1 })
      setTimeout(function() {
        setAnimating(false)
        setExitingIndex(null)
      }, 380)
    }
  }`;

content = content.replace(oldGoPrev, newGoPrev);

// Replace the animated container div
const oldAnimDiv = '          <div className={"absolute inset-0 transition-transform duration-300 ease-in-out " + (animating ? (direction === \'up\' ? \'-translate-y-full\' : \'translate-y-full\') : \'translate-y-0\')}>';

const newAnimDiv = `          {animating && exitingIndex !== null && listings[exitingIndex] && (
            <div key={'exit-' + exitingIndex} className={'absolute inset-0 z-10 ' + (direction === 'up' ? 'slide-out-top' : 'slide-out-bottom')}>
              {getVid(listings[exitingIndex]) ? (
                <video className="w-full h-full object-cover" autoPlay muted loop playsInline
                  src={'https://stream.mux.com/' + getVid(listings[exitingIndex]).mux_playback_id + '.m3u8'} />
              ) : getCover(listings[exitingIndex]) ? (
                <img src={getCover(listings[exitingIndex])} alt="" className="w-full h-full object-cover" />
              ) : <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><span className="text-6xl">🏠</span></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
            </div>
          )}
          <div className={'absolute inset-0 ' + (animating ? (direction === 'up' ? 'slide-in-bottom' : 'slide-in-top') : '')}>`;

content = content.replace(oldAnimDiv, newAnimDiv);

fs.writeFileSync(filePath, content);
console.log('Done - two video animation implemented');
