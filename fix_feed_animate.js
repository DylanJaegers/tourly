const fs = require('fs');
const filePath = 'src/app/feed/page.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add direction state after the other useState declarations
content = content.replace(
  "  const [showFilterPanel, setShowFilterPanel] = useState(false)",
  "  const [showFilterPanel, setShowFilterPanel] = useState(false)\n  const [direction, setDirection] = useState('up')\n  const [animating, setAnimating] = useState(false)"
);

// Update goNext to set direction and animate
content = content.replace(
  "  function goNext() { if (currentIndex < listings.length - 1) setCurrentIndex(function(p) { return p + 1 }) }",
  `  function goNext() {
    if (currentIndex < listings.length - 1 && !animating) {
      setDirection('up')
      setAnimating(true)
      setTimeout(function() {
        setCurrentIndex(function(p) { return p + 1 })
        setAnimating(false)
      }, 300)
    }
  }`
);

// Update goPrev to set direction and animate
content = content.replace(
  "  function goPrev() { if (currentIndex > 0) setCurrentIndex(function(p) { return p - 1 }) }",
  `  function goPrev() {
    if (currentIndex > 0 && !animating) {
      setDirection('down')
      setAnimating(true)
      setTimeout(function() {
        setCurrentIndex(function(p) { return p - 1 })
        setAnimating(false)
      }, 300)
    }
  }`
);

// Add animation class to the absolute inset-0 container that holds the video
content = content.replace(
  '          <div className="absolute inset-0">',
  '          <div className={"absolute inset-0 transition-transform duration-300 ease-in-out " + (animating ? (direction === \'up\' ? \'-translate-y-full\' : \'translate-y-full\') : \'translate-y-0\')}>'
);

fs.writeFileSync(filePath, content);
console.log('Done - added directional animation to feed');
