const fs = require('fs');
const filePath = 'src/app/agent/upload/page.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add video preview state variables after existing state
content = content.replace(
  "  const [shortFormUploaded, setShortFormUploaded] = useState(false)",
  `  const [shortFormUploaded, setShortFormUploaded] = useState(false)
  const [shortFormPreviewUrl, setShortFormPreviewUrl] = useState(null)
  const [longFormPreviewUrl, setLongFormPreviewUrl] = useState(null)
  const [shortFormWarning, setShortFormWarning] = useState(null)
  const [longFormWarning, setLongFormWarning] = useState(null)`
);

// Replace short form file input handler
content = content.replace(
  "onChange={e => setShortFormVideo(e.target.files[0])}",
  `onChange={e => {
                      const file = e.target.files[0]
                      if (!file) return
                      setShortFormVideo(file)
                      const url = URL.createObjectURL(file)
                      setShortFormPreviewUrl(url)
                      const vid = document.createElement('video')
                      vid.src = url
                      vid.onloadedmetadata = function() {
                        const ratio = vid.videoWidth / vid.videoHeight
                        if (ratio > 1) {
                          setShortFormWarning('This looks like a horizontal (16:9) video. Short-form feed videos should be vertical (9:16) for the best experience. Portrait mode from your phone works great.')
                        } else {
                          setShortFormWarning(null)
                        }
                      }
                    }}`
);

// Replace long form file input handler
content = content.replace(
  "onChange={e => setLongFormVideo(e.target.files[0])}",
  `onChange={e => {
                      const file = e.target.files[0]
                      if (!file) return
                      setLongFormVideo(file)
                      const url = URL.createObjectURL(file)
                      setLongFormPreviewUrl(url)
                      const vid = document.createElement('video')
                      vid.src = url
                      vid.onloadedmetadata = function() {
                        const ratio = vid.videoWidth / vid.videoHeight
                        if (ratio < 1) {
                          setLongFormWarning('This looks like a vertical (9:16) video. Long-form tour videos should be horizontal (16:9) for the best viewing experience.')
                        } else {
                          setLongFormWarning(null)
                        }
                      }
                    }}`
);

// Add short form preview and warning after the file name display
content = content.replace(
  `                  {shortFormVideo && (
                    <p className="text-xs text-gray-500 mt-2">Selected: {shortFormVideo.name}</p>
                  )}`,
  `                  {shortFormVideo && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-2">Selected: {shortFormVideo.name}</p>
                      {shortFormPreviewUrl && (
                        <div className="relative rounded-lg overflow-hidden bg-black mx-auto" style={{width: '120px', height: '213px'}}>
                          <video src={shortFormPreviewUrl} className="w-full h-full object-cover" muted playsInline autoPlay loop />
                          <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded font-medium">9:16</div>
                        </div>
                      )}
                      {shortFormWarning && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700 leading-relaxed">
                          ⚠️ {shortFormWarning}
                        </div>
                      )}
                    </div>
                  )}`
);

// Add long form preview and warning after the file name display
content = content.replace(
  `                  {longFormVideo && (
                    <p className="text-xs text-gray-500 mt-2">Selected: {longFormVideo.name}</p>
                  )}`,
  `                  {longFormVideo && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-2">Selected: {longFormVideo.name}</p>
                      {longFormPreviewUrl && (
                        <div className="relative rounded-lg overflow-hidden bg-black w-full" style={{aspectRatio: '16/9'}}>
                          <video src={longFormPreviewUrl} className="w-full h-full object-cover" muted playsInline autoPlay loop />
                          <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded font-medium">16:9</div>
                        </div>
                      )}
                      {longFormWarning && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700 leading-relaxed">
                          ⚠️ {longFormWarning}
                        </div>
                      )}
                    </div>
                  )}`
);

fs.writeFileSync(filePath, content);
console.log('Done - added video preview and aspect ratio validation');
