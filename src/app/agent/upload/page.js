'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UploadListing() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [listingId, setListingId] = useState(null)

  const [shortFormVideo, setShortFormVideo] = useState(null)
  const [longFormVideo, setLongFormVideo] = useState(null)
  const [shortFormProgress, setShortFormProgress] = useState(0)
  const [longFormProgress, setLongFormProgress] = useState(0)
  const [shortFormUploaded, setShortFormUploaded] = useState(false)
  const [longFormUploaded, setLongFormUploaded] = useState(false)
  const [shortFormAssetId, setShortFormAssetId] = useState(null)
  const [longFormAssetId, setLongFormAssetId] = useState(null)

  const [photos, setPhotos] = useState([])
  const [photoUrls, setPhotoUrls] = useState([])

  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [price, setPrice] = useState('')
  const [listingType, setListingType] = useState('for_sale')
  const [propertyType, setPropertyType] = useState('house')
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [sqft, setSqft] = useState('')
  const [yearBuilt, setYearBuilt] = useState('')
  const [lotSize, setLotSize] = useState('')
  const [garage, setGarage] = useState('')
  const [hvac, setHvac] = useState('')
  const [description, setDescription] = useState('')
  const [openHouseDate, setOpenHouseDate] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 text-gray-900 bg-white placeholder-gray-400"

  async function uploadVideoToMux(file, onProgress) {
    const res = await fetch('/api/mux', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoType: 'upload' }),
    })
    const { uploadUrl, uploadId } = await res.json()

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      }
      xhr.onload = () => resolve(uploadId)
      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.send(file)
    })

    return uploadId
  }

  async function handleVideoStep(e) {
    e.preventDefault()
    if (!shortFormVideo) {
      setError('Short-form video is required')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const shortId = await uploadVideoToMux(shortFormVideo, setShortFormProgress)
      setShortFormAssetId(shortId)
      setShortFormUploaded(true)

      if (longFormVideo) {
        const longId = await uploadVideoToMux(longFormVideo, setLongFormProgress)
        setLongFormAssetId(longId)
        setLongFormUploaded(true)
      }

      setLoading(false)
      setStep(2)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function handlePhotoStep(e) {
    e.preventDefault()
    if (photos.length < 5) {
      setError('Please upload at least 5 photos')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const uploadedUrls = []

      for (let i = 0; i < photos.length; i++) {
        const file = photos[i]
        const fileName = `${user.id}/${Date.now()}_${i}_${file.name}`
        const { data, error } = await supabase.storage
          .from('listing-photos')
          .upload(fileName, file)

        if (error) throw error
        const { data: urlData } = supabase.storage
          .from('listing-photos')
          .getPublicUrl(fileName)
        uploadedUrls.push(urlData.publicUrl)
      }

      setPhotoUrls(uploadedUrls)
      setLoading(false)
      setStep(3)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function handleDetailsStep(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          agent_id: user.id,
          address,
          city,
          state,
          zip,
          price: parseInt(price),
          listing_type: listingType,
          property_type: propertyType,
          bedrooms: parseInt(bedrooms),
          bathrooms: parseFloat(bathrooms),
          sqft: parseInt(sqft),
          year_built: yearBuilt ? parseInt(yearBuilt) : null,
          lot_size: lotSize ? parseFloat(lotSize) : null,
          garage: garage || null,
          hvac: hvac || null,
          description,
          open_house_date: openHouseDate || null,
          status: 'pending',
          cover_photo_url: photoUrls[0] || null,
        })
        .select()
        .single()

      if (listingError) throw listingError

      for (let i = 0; i < photoUrls.length; i++) {
        await supabase.from('listing_photos').insert({
          listing_id: listing.id,
          url: photoUrls[i],
          position: i,
        })
      }

      if (shortFormAssetId) {
        await supabase.from('listing_videos').insert({
          listing_id: listing.id,
          video_type: 'short_form',
          mux_asset_id: shortFormAssetId,
        })
      }

      if (longFormAssetId) {
        await supabase.from('listing_videos').insert({
          listing_id: listing.id,
          video_type: 'long_form',
          mux_asset_id: longFormAssetId,
        })
      }

      setListingId(listing.id)
      setLoading(false)
      setStep(4)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function handleSubmit() {
    router.push('/agent/dashboard')
  }

  function handlePhotoChange(e) {
    const files = Array.from(e.target.files)
    if (files.length + photos.length > 30) {
      setError('Maximum 30 photos allowed')
      return
    }
    setPhotos(prev => [...prev, ...files])
  }

  function removePhoto(index) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/agent/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
          ← Dashboard
        </Link>
        <span className="text-gray-200">|</span>
        <span className="text-sm font-medium text-gray-900">New listing</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">

        <div className="flex items-center gap-2 mb-8">
          {[
            { n: 1, label: 'Videos' },
            { n: 2, label: 'Photos' },
            { n: 3, label: 'Details' },
            { n: 4, label: 'Review' },
          ].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  n < step ? 'bg-gray-900 text-white' :
                  n === step ? 'bg-gray-900 text-white' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {n < step ? '✓' : n}
                </div>
                <span className="text-xs text-gray-400">{label}</span>
              </div>
              {n < 4 && <div className={`flex-1 h-px mb-4 ${n < step ? 'bg-gray-900' : 'bg-gray-200'}`}></div>}
            </div>
          ))}
        </div>

        {step === 1 && (
          <form onSubmit={handleVideoStep} className="flex flex-col gap-5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Short-form video</label>
                <span className="text-xs text-red-400">Required</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">Vertical 9:16 · max 60 sec · MP4 or MOV · max 500MB</p>
              {shortFormUploaded ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm text-green-700">Short-form video uploaded</span>
                </div>
              ) : (
                <div>
                  <label className="block w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-300 transition">
                    <div className="text-3xl mb-2">📱</div>
                    <p className="text-sm text-gray-500">Tap to select short-form video</p>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime"
                      className="hidden"
                      onChange={e => setShortFormVideo(e.target.files[0])}
                    />
                  </label>
                  {shortFormVideo && (
                    <p className="text-xs text-gray-500 mt-2">Selected: {shortFormVideo.name}</p>
                  )}
                  {shortFormProgress > 0 && shortFormProgress < 100 && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-900 rounded-full transition-all" style={{ width: `${shortFormProgress}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{shortFormProgress}% uploaded</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Long-form tour video</label>
                <span className="text-xs text-gray-400">Optional</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">Horizontal 16:9 · 3–15 min · MP4 or MOV · max 4GB</p>
              {longFormUploaded ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm text-green-700">Long-form video uploaded</span>
                </div>
              ) : (
                <div>
                  <label className="block w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-300 transition">
                    <div className="text-3xl mb-2">🎬</div>
                    <p className="text-sm text-gray-500">Tap to select tour video</p>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime"
                      className="hidden"
                      onChange={e => setLongFormVideo(e.target.files[0])}
                    />
                  </label>
                  {longFormVideo && (
                    <p className="text-xs text-gray-500 mt-2">Selected: {longFormVideo.name}</p>
                  )}
                  {longFormProgress > 0 && longFormProgress < 100 && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-900 rounded-full transition-all" style={{ width: `${longFormProgress}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{longFormProgress}% uploaded</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 leading-relaxed">
              💡 Tip: Your short-form video is your hook — show the best feature in the first 3 seconds. Buyers see this first in the feed.
            </div>

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading || !shortFormVideo}
              className="w-full bg-gray-900 text-white rounded-lg py-3 text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Next: Photos →'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handlePhotoStep} className="flex flex-col gap-5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Property photos</label>
                <span className="text-xs text-gray-400">{photos.length}/30 · min 5</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">First photo becomes the cover. JPG or PNG · max 20MB each</p>

              <label className="block w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-gray-300 transition mb-4">
                <div className="text-3xl mb-2">📷</div>
                <p className="text-sm text-gray-500">Tap to add photos</p>
                <p className="text-xs text-gray-400 mt-1">Select multiple at once</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>

              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt=""
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {index === 0 && (
                        <div className="absolute top-1 left-1 bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded text-center">
                          Cover
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-200 text-gray-500 rounded-lg py-3 text-sm hover:bg-gray-50 transition"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading || photos.length < 5}
                className="flex-2 flex-1 bg-gray-900 text-white rounded-lg py-3 text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50"
              >
                {loading ? 'Uploading photos...' : 'Next: Details →'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleDetailsStep} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Street address <span className="text-red-400">*</span></label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} required className={inputClass} placeholder="2847 Elmwood Ave" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-xs font-medium text-gray-600 mb-1 block">City <span className="text-red-400">*</span></label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)} required className={inputClass} placeholder="Austin" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">State <span className="text-red-400">*</span></label>
                <select value={state} onChange={e => setState(e.target.value)} required className={inputClass}>
                  <option value="">ST</option>
                  {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Zip <span className="text-red-400">*</span></label>
                <input type="text" value={zip} onChange={e => setZip(e.target.value)} required className={inputClass} placeholder="78704" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Price <span className="text-red-400">*</span></label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} required className={inputClass} placeholder="487000" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Listing type <span className="text-red-400">*</span></label>
                <select value={listingType} onChange={e => setListingType(e.target.value)} className={inputClass}>
                  <option value="for_sale">For sale</option>
                  <option value="for_rent">For rent</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Bedrooms <span className="text-red-400">*</span></label>
                <input type="number" value={bedrooms} onChange={e => setBedrooms(e.target.value)} required className={inputClass} placeholder="3" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Bathrooms <span className="text-red-400">*</span></label>
                <input type="number" value={bathrooms} onChange={e => setBathrooms(e.target.value)} required className={inputClass} placeholder="2" step="0.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Sq ft <span className="text-red-400">*</span></label>
                <input type="number" value={sqft} onChange={e => setSqft(e.target.value)} required className={inputClass} placeholder="1842" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Property type <span className="text-red-400">*</span></label>
                <select value={propertyType} onChange={e => setPropertyType(e.target.value)} className={inputClass}>
                  <option value="house">House</option>
                  <option value="condo">Condo</option>
                  <option value="townhome">Townhome</option>
                  <option value="land">Land</option>
                  <option value="multi_family">Multi-family</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Year built</label>
                <input type="number" value={yearBuilt} onChange={e => setYearBuilt(e.target.value)} className={inputClass} placeholder="1985" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Lot size (acres)</label>
                <input type="number" value={lotSize} onChange={e => setLotSize(e.target.value)} className={inputClass} placeholder="0.18" step="0.01" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Garage</label>
                <select value={garage} onChange={e => setGarage(e.target.value)} className={inputClass}>
                  <option value="">None</option>
                  <option value="1-car">1-car</option>
                  <option value="2-car">2-car</option>
                  <option value="3-car">3-car</option>
                  <option value="carport">Carport</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">HVAC</label>
                <select value={hvac} onChange={e => setHvac(e.target.value)} className={inputClass}>
                  <option value="">Unknown</option>
                  <option value="Central">Central</option>
                  <option value="Window units">Window units</option>
                  <option value="Heat pump">Heat pump</option>
                  <option value="Radiant">Radiant</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Description <span className="text-red-400">*</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} required className={inputClass} rows={4} placeholder="Describe the property..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Open house date/time <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="datetime-local" value={openHouseDate} onChange={e => setOpenHouseDate(e.target.value)} className={inputClass} />
            </div>

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="flex-1 border border-gray-200 text-gray-500 rounded-lg py-3 text-sm hover:bg-gray-50 transition">← Back</button>
              <button type="submit" disabled={loading} className="flex-1 bg-gray-900 text-white rounded-lg py-3 text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50">
                {loading ? 'Saving...' : 'Next: Review →'}
              </button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Review your listing</h2>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Short-form video</span>
                  <span className="text-green-600 font-medium">✓ Uploaded</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Long-form video</span>
                  <span className={longFormAssetId ? 'text-green-600 font-medium' : 'text-gray-300'}>
                    {longFormAssetId ? '✓ Uploaded' : '— Not added'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Photos</span>
                  <span className="text-green-600 font-medium">✓ {photoUrls.length} photos</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Property details</span>
                  <span className="text-green-600 font-medium">✓ Complete</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-900">{address}, {city} {state} {zip}</p>
              <p className="text-lg font-medium text-gray-900 mt-1">${parseInt(price).toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">{bedrooms} bed · {bathrooms} bath · {parseInt(sqft).toLocaleString()} sqft</p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-sm font-medium text-amber-800">Pending review</p>
              <p className="text-xs text-amber-600 mt-1">Your listing will be reviewed and go live within a few hours.</p>
            </div>

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}

            <button
              onClick={handleSubmit}
              className="w-full bg-gray-900 text-white rounded-lg py-3 text-sm font-medium hover:bg-gray-700 transition"
            >
              Submit listing
            </button>
            <button
              onClick={() => setStep(3)}
              className="w-full border border-gray-200 text-gray-500 rounded-lg py-3 text-sm hover:bg-gray-50 transition"
            >
              ← Edit details
            </button>
          </div>
        )}

      </div>
    </div>
  )
}