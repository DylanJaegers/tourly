'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import SidebarNav from '@/components/shared/sidebar-nav'

export default function MapView() {
  const [allListings, setAllListings] = useState([])
  const [visibleListings, setVisibleListings] = useState([])
  const [selectedListing, setSelectedListing] = useState(null)
  const [feedIndex, setFeedIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())
  const [mapCenter, setMapCenter] = useState({ lat: 39.5, lng: -98.35 })
  const [mapZoom, setMapZoom] = useState(4)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [showFeed, setShowFeed] = useState(false)
  const [filters, setFilters] = useState({ listingType: 'all', priceMin: '', priceMax: '', bedrooms: 'any', propertyType: 'all' })
  const boundsRef = useRef(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => { loadListings(); checkUser() }, [])

  async function checkUser() {
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData ? authData.user : null
    setUser(currentUser)
    if (currentUser) {
      const { data: saves } = await supabase.from('saves').select('listing_id').eq('user_id', currentUser.id)
      if (saves) setSavedIds(new Set(saves.map(function(s) { return s.listing_id })))
    }
  }

  async function loadListings() {
    let query = supabase
      .from('listings')
      .select('*, listing_photos (url, position), listing_videos (video_type, mux_playback_id), agent_profiles (full_name, brokerage, is_fsbo)')
      .eq('status', 'active')
      .not('lat', 'is', null)
      .not('lng', 'is', null)

    const urlType = searchParams.get('type')
    const urlMinPrice = searchParams.get('minPrice')
    const urlMaxPrice = searchParams.get('maxPrice')
    const urlBeds = searchParams.get('beds')

    if (urlType) query = query.eq('listing_type', urlType)
    else if (filters.listingType !== 'all') query = query.eq('listing_type', filters.listingType)
    if (urlMinPrice) query = query.gte('price', parseInt(urlMinPrice))
    else if (filters.priceMin) query = query.gte('price', parseInt(filters.priceMin))
    if (urlMaxPrice) query = query.lte('price', parseInt(urlMaxPrice))
    else if (filters.priceMax) query = query.lte('price', parseInt(filters.priceMax))
    if (urlBeds) query = query.gte('bedrooms', parseInt(urlBeds))
    else if (filters.bedrooms !== 'any') query = query.gte('bedrooms', parseInt(filters.bedrooms))
    if (filters.propertyType !== 'all') query = query.eq('property_type', filters.propertyType)

    const { data } = await query.limit(150)
    const listingsData = data || []
    setAllListings(listingsData)
    setVisibleListings(listingsData)

    const highlightId = searchParams.get('listing')
    const location = searchParams.get('location')

    if (highlightId) {
      const highlighted = listingsData.find(function(l) { return l.id === highlightId })
      if (highlighted && highlighted.lat && highlighted.lng) {
        setMapCenter({ lat: parseFloat(highlighted.lat), lng: parseFloat(highlighted.lng) })
        setMapZoom(14)
        setSelectedListing(highlighted)
      }
    } else if (location) {
      geocodeAndCenter(location)
    } else if (listingsData.length > 0) {
      const first = listingsData[0]
      if (first.lat && first.lng) {
        setMapCenter({ lat: parseFloat(first.lat), lng: parseFloat(first.lng) })
        setMapZoom(11)
      }
    }

    setLoading(false)
  }

  async function geocodeAndCenter(location) {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      const res = await fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(location) + '&key=' + apiKey)
      const data = await res.json()
      if (data.status === 'OK' && data.results.length > 0) {
        const loc = data.results[0].geometry.location
        setMapCenter({ lat: loc.lat, lng: loc.lng })
        setMapZoom(12)
      }
    } catch (e) {}
  }

  function handleBoundsChanged(ev) {
    const bounds = ev.detail.bounds
    if (!bounds) return
    boundsRef.current = bounds
    const filtered = allListings.filter(function(l) {
      if (!l.lat || !l.lng) return false
      const lat = parseFloat(l.lat)
      const lng = parseFloat(l.lng)
      return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east
    })
    setVisibleListings(filtered)
    if (feedIndex >= filtered.length) setFeedIndex(0)
  }

  async function toggleSave(listingId) {
    if (!user) { router.push('/auth/login'); return }
    if (savedIds.has(listingId)) {
      await supabase.from('saves').delete().eq('user_id', user.id).eq('listing_id', listingId)
      setSavedIds(function(prev) { const next = new Set(prev); next.delete(listingId); return next })
    } else {
      await supabase.from('saves').insert({ user_id: user.id, listing_id: listingId })
      setSavedIds(function(prev) { return new Set([...prev, listingId]) })
    }
  }

  const formatPrice = (p) => p >= 1000000 ? '$' + (p / 1000000).toFixed(1) + 'M' : '$' + (p / 1000).toFixed(0) + 'K'
  const getCoverPhoto = (l) => l.cover_photo_url || (l.listing_photos && l.listing_photos.length > 0 ? l.listing_photos.sort(function(a,b){return a.position-b.position})[0].url : null)
  const getVid = (l) => l.listing_videos ? l.listing_videos.find(function(v) { return v.video_type === 'short_form' && v.mux_playback_id }) : null

  const feedListing = visibleListings[feedIndex]
  const aName = feedListing && feedListing.agent_profiles ? (feedListing.agent_profiles.full_name || 'Agent') : 'Agent'
  const aBrok = feedListing && feedListing.agent_profiles ? (feedListing.agent_profiles.brokerage || '') : ''
  const aFsbo = feedListing && feedListing.agent_profiles ? feedListing.agent_profiles.is_fsbo : false

  function feedNext() { if (feedIndex < visibleListings.length - 1) setFeedIndex(function(p) { return p + 1 }) }
  function feedPrev() { if (feedIndex > 0) setFeedIndex(function(p) { return p - 1 }) }

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading map...</p>
    </div>
  )

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  return (
    <div className="h-screen flex">
      <SidebarNav onFilterClick={() => setShowFilterPanel(true)} />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-gray-400 text-sm">🔍</span>
            <input type="text" placeholder="Search by city or zip..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none" />
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:inline">{visibleListings.length} in view</span>
          <button onClick={() => setShowFeed(!showFeed)}
            className={'px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 flex-shrink-0 ' + (showFeed ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            ▶ {showFeed ? 'Hide feed' : 'Show feed'}
          </button>
          <button onClick={() => setShowFilterPanel(true)}
            className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition flex-shrink-0">
            ⚙
          </button>
        </div>

        <div className="relative flex-1 flex min-h-0">
          <div className="relative flex-1">
            <APIProvider apiKey={apiKey}>
              <Map
                mapId="tourly-map"
                center={mapCenter}
                zoom={mapZoom}
                onCameraChanged={function(ev) { setMapCenter(ev.detail.center); setMapZoom(ev.detail.zoom) }}
                onBoundsChanged={handleBoundsChanged}
                gestureHandling="greedy"
                disableDefaultUI={false}
                style={{ width: '100%', height: '100%' }}
              >
                {allListings.map(function(listing) {
                  if (!listing.lat || !listing.lng) return null
                  const isSelected = selectedListing && selectedListing.id === listing.id
                  return (
                    <AdvancedMarker key={listing.id} position={{ lat: parseFloat(listing.lat), lng: parseFloat(listing.lng) }}
                      onClick={function() {
                        setSelectedListing(listing)
                        const idx = visibleListings.findIndex(function(l) { return l.id === listing.id })
                        if (idx !== -1) setFeedIndex(idx)
                      }}>
                      <div className={'px-2.5 py-1.5 rounded-full text-xs font-medium shadow-md cursor-pointer transition-all ' + (isSelected ? 'bg-blue-500 text-white scale-110' : 'bg-white text-gray-900 hover:bg-gray-50')}>
                        {formatPrice(listing.price)}
                      </div>
                    </AdvancedMarker>
                  )
                })}
              </Map>
            </APIProvider>

            {visibleListings.length === 0 && !loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white rounded-xl shadow-lg px-4 py-3 text-center pointer-events-auto">
                  <p className="text-sm text-gray-500">No listings in this area</p>
                  <p className="text-xs text-gray-400 mt-1">Try zooming out or adjusting filters</p>
                </div>
              </div>
            )}

            {selectedListing && !showFeed && (
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-3 flex items-center gap-3">
                <div className="w-16 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                  {getCoverPhoto(selectedListing) ? (
                    <img src={getCoverPhoto(selectedListing)} alt="" className="w-full h-full object-cover" />
                  ) : <div className="w-full h-full flex items-center justify-center text-xl">🏠</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{formatPrice(selectedListing.price)}</p>
                  <p className="text-xs text-gray-500 truncate">{selectedListing.address}</p>
                  <p className="text-xs text-gray-400">{selectedListing.bedrooms} bed · {selectedListing.bathrooms} bath</p>
                </div>
                <Link href={'/listing/' + selectedListing.id} className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-700 transition">View →</Link>
                <button onClick={() => toggleSave(selectedListing.id)}
                  className={'text-xs px-3 py-1.5 rounded-lg border transition ' + (savedIds.has(selectedListing.id) ? 'bg-red-50 border-red-200 text-red-500' : 'border-gray-200 text-gray-500')}>
                  {savedIds.has(selectedListing.id) ? '♥' : '♡'}
                </button>
                <button onClick={() => setSelectedListing(null)} className="text-gray-300 hover:text-gray-500 text-lg">×</button>
              </div>
            )}
          </div>

          {showFeed && (
            <div className="relative flex-shrink-0 bg-black" style={{ width: '300px' }}>
              {visibleListings.length === 0 ? (
                <div className="h-full flex items-center justify-center px-4 text-center">
                  <p className="text-white text-sm opacity-50">No listings visible on the map right now — pan or zoom to find some</p>
                </div>
              ) : feedListing ? (
                <div className="absolute inset-0">
                  {getVid(feedListing) ? (
                    <video key={feedListing.id} className="w-full h-full object-cover" autoPlay muted loop playsInline
                      src={'https://stream.mux.com/' + getVid(feedListing).mux_playback_id + '.m3u8'} />
                  ) : getCoverPhoto(feedListing) ? (
                    <img src={getCoverPhoto(feedListing)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><span className="text-5xl">🏠</span></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />

                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
                    <span className="bg-black/40 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">{feedIndex + 1} / {visibleListings.length}</span>
                    <button onClick={() => setShowFeed(false)} className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center text-sm">×</button>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4 pb-6">
                    <p className="text-white text-xl font-bold drop-shadow-lg">{formatPrice(feedListing.price)}</p>
                    <p className="text-white/90 text-xs mt-0.5">{feedListing.address}</p>
                    <p className="text-white/60 text-xs">{feedListing.city}, {feedListing.state}</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {[feedListing.bedrooms + ' bd', feedListing.bathrooms + ' ba', (feedListing.sqft||0).toLocaleString() + ' sqft'].map(function(tag) {
                        return <span key={tag} className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full">{tag}</span>
                      })}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-5 h-5 rounded-full bg-zinc-500 flex items-center justify-center text-white text-xs flex-shrink-0">{aName.charAt(0)}</div>
                      <span className="text-white text-xs">{aName}</span>
                      <span className="text-white/50 text-xs">{aFsbo ? 'FSBO' : aBrok}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Link href={'/listing/' + feedListing.id} className="flex-1 bg-white text-black text-xs font-semibold py-2 rounded-lg text-center hover:bg-gray-100 transition">View details</Link>
                      <button onClick={() => toggleSave(feedListing.id)}
                        className={'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ' + (savedIds.has(feedListing.id) ? 'bg-red-500 text-white' : 'bg-white/20 backdrop-blur-sm text-white border border-white/30')}>
                        ♥
                      </button>
                    </div>
                  </div>

                  <div className="absolute right-2 bottom-1/2 translate-y-1/2 flex flex-col gap-1.5">
                    <button onClick={feedPrev} disabled={feedIndex === 0}
                      className={'w-7 h-7 rounded-full flex items-center justify-center text-xs border ' + (feedIndex === 0 ? 'border-white/10 text-white/20' : 'bg-black/50 border-white/40 text-white hover:bg-white/20')}>↑</button>
                    <button onClick={feedNext} disabled={feedIndex === visibleListings.length - 1}
                      className={'w-7 h-7 rounded-full flex items-center justify-center text-xs border ' + (feedIndex === visibleListings.length - 1 ? 'border-white/10 text-white/20' : 'bg-black/50 border-white/40 text-white hover:bg-white/20')}>↓</button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {showFilterPanel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center md:justify-center">
          <div className="bg-white w-full md:w-96 rounded-t-2xl md:rounded-2xl p-5 pb-10 md:pb-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-medium text-gray-900">Filter listings</h2>
              <button onClick={() => setShowFilterPanel(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Listing type</label>
                <div className="flex gap-2">
                  {['all', 'for_sale', 'for_rent'].map(function(type) {
                    return (
                      <button key={type} onClick={() => setFilters(function(f) { return { ...f, listingType: type } })}
                        className={'flex-1 py-2 text-sm rounded-lg border transition ' + (filters.listingType === type ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500')}>
                        {type === 'all' ? 'All' : type === 'for_sale' ? 'For sale' : 'For rent'}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Price range</label>
                <div className="flex gap-2 items-center">
                  <input type="number" placeholder="Min" value={filters.priceMin} onChange={function(e) { setFilters(function(f) { return { ...f, priceMin: e.target.value } }) }}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none" />
                  <span className="text-gray-400">—</span>
                  <input type="number" placeholder="Max" value={filters.priceMax} onChange={function(e) { setFilters(function(f) { return { ...f, priceMax: e.target.value } }) }}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Bedrooms</label>
                <div className="flex gap-2">
                  {['any', '1', '2', '3', '4'].map(function(b) {
                    return (
                      <button key={b} onClick={() => setFilters(function(f) { return { ...f, bedrooms: b } })}
                        className={'flex-1 py-2 text-sm rounded-lg border transition ' + (filters.bedrooms === b ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500')}>
                        {b === 'any' ? 'Any' : b + '+'}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setFilters({ listingType: 'all', priceMin: '', priceMax: '', bedrooms: 'any', propertyType: 'all' }); setShowFilterPanel(false); loadListings() }}
                className="flex-1 border border-gray-200 text-gray-500 rounded-lg py-3 text-sm">Reset</button>
              <button onClick={() => { setShowFilterPanel(false); loadListings() }}
                className="flex-1 bg-gray-900 text-white rounded-lg py-3 text-sm font-medium">Show listings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
