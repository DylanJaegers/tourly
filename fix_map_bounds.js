const fs = require('fs');
const filePath = 'src/app/map/page.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add onBoundsChanged handler after onCameraChanged
content = content.replace(
  'onCameraChanged={function(ev) { setMapCenter(ev.detail.center); setMapZoom(ev.detail.zoom) }}',
  `onCameraChanged={function(ev) { setMapCenter(ev.detail.center); setMapZoom(ev.detail.zoom) }}
            onBoundsChanged={function(ev) {
              const bounds = ev.detail.bounds
              if (!bounds) return
              const filtered = allListings.filter(function(l) {
                if (!l.lat || !l.lng) return false
                const lat = parseFloat(l.lat)
                const lng = parseFloat(l.lng)
                return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east
              })
              const newVisible = filtered.length > 0 ? filtered : []
              setVisibleListings(newVisible)
              setCurrentIndex(0)
            }}`
);

fs.writeFileSync(filePath, content);
console.log('Done - added bounds handler');
