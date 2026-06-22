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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())
  const [mapCenter, setMapCenter] = useState({ lat: 39.5, lng: -98.35 })
  const [mapZoom, setMapZoom] = useState(4)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [showSearchPanel, setShowSearchPanel] = useState(false)
  const [searchLocation, setSearchLocation] = useState('')
  const [direction, setDirection] = useState('up')
  const [animating, setAnimating] = useState(false)
  const [exitingIndex, setExitingIndex] = useState(null)

  const touchStartY = useRef(0)
  const touchStartX = useRef(0)
  const videoContainerRef = useRef(null)
  const wheelTimeout = useRef(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => { loadListings(); checkUser() }, [])

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
  }, [currentIndex, visibleListings.length, animating])

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

    const { data } = await query.limit(150)
    const listingsData = data || []
    setAllListings(listingsData)
    setVisibleListings(listingsData)

    const highlightId = searchParams.get('listing')
    const location = searchParams.get('location')

    if (highlightId) {
      const idx = listingsData.findIndex(function(l) { return l.id === highlightId })
      const highlighted = listingsData[idx]
      if (highlighted && highlighted.lat && highlighted.lng) {
        setMapCenter({ lat: parseFloat(highlighted.lat), lng: parseFloat(highlighted.lng) })
        setMapZoom(14)
        if (idx !== -1) setCurrentIndex(idx)
      }
    } else if (location) {
      geocodeAndCenter(location)
    } else if (listingsData.length > 0 && listingsData[0].lat) {
      setMapCenter({ lat: parseFloat(listingsData[0].lat), lng: parseFloat(listingsData[0].lng) })
      setMapZoom(11)
    }
    setLoading(false)
  }

  async function geocodeAndCenter(location) {
    try {
      const res = await fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(location) + '&key=' + process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
      const data = await res.json()
      if (data.status === 'OK' && data.results.length > 0) {
        const loc = data.results[0].geometry.location
        setMapCenter({ lat: loc.lat, lng: loc.lng })
        setMapZoom(12)
      }
    } catch (e) {}
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

  function goNext() {
    if (currentIndex < visibleListings.length - 1 && !animating) {
      setDirection('up')
      setExitingIndex(currentIndex)
      setAnimating(true)
      setCurrentIndex(function(p) { return p + 1 })
      setTimeout(function() { setAnimating(false); setExitingIndex(null) }, 380)
    }
  }

  function goPrev() {
    if (currentIndex > 0 && !animating) {
      setDirection('down')
      setExitingIndex(currentIndex)
      setAnimating(true)
      setCurrentIndex(function(p) { return p - 1 })
      setTimeout(function() { setAnimating(false); setExitingIndex(null) }, 380)
    }
  }

  function handleTouchStart(e) { touchStartY.current = e.touches[0].clientY; touchStartX.current = e.touches[0].clientX }
  function handleTouchEnd(e) {
    const dy = touchStartY.current - e.changedTouches[0].clientY
    const dx = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 50 && visibleListings[currentIndex]) router.push('/listing/' + visibleListings[currentIndex].id)
    } else {
      if (dy > 50) goNext()
      else if (dy < -50) goPrev()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowUp') goPrev()
    if (e.key === 'ArrowDown') goNext()
    if (e.key === 'ArrowRight' && visibleListings[currentIndex]) router.push('/listing/' + visibleListings[currentIndex].id)
  }

  function handleSearchGo() {
    if (!searchLocation.trim()) return
    geocodeAndCenter(searchLocation)
    setShowSearchPanel(false)
  }

  const fmt = (p) => p >= 1000000 ? '$' + (p/1000000).toFixed(1) + 'M' : '$' + (p/1000).toFixed(0) + 'K'
  const getCover = (l) => l.cover_photo_url || (l.listing_photos && l.listing_photos.length > 0 ? l.listing_photos.sort(function(a,b){return a.position-b.position})[0].url : null)
  const getVid = (l) => l.listing_videos ? l.listing_videos.find(function(v) { return v.video_type === 'short_form' && v.mux_playback_id }) : null

  const currentListing = visibleListings[currentIndex]
  const aName = currentListing && currentListing.agent_profiles ? (currentListing.agent_profiles.full_name || 'Agent') : 'Agent'
  const aBrok = currentListing && currentListing.agent_profiles ? (currentListing.agent_profiles.brokerage || '') : ''
  const aFsbo = currentListing && currentListing.agent_profiles ? currentListing.agent_profiles.is_fsbo : false

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="h-screen flex overflow-hidden bg-black" onKeyDown={handleKeyDown} tabIndex={0}>

      <SidebarNav onSearchClick={() => setShowSearchPanel(true)} onFilterClick={() => setShowFilterPanel(true)} />

      <div
        ref={videoContainerRef}
        className="relative flex-shrink-0 h-screen bg-black"
        style={{ width: 'calc(100vh * 9 / 16)', maxWidth: '420px', minWidth: '280px' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>

        {visibleListings.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-white text-sm opacity-50">No listings with map coordinates yet</p>
            <Link href="/feed" className="text-white border border-white/30 rounded-lg px-4 py-2 text-sm">Browse feed →</Link>
          </div>
        ) : currentListing ? (
          <div className="absolute inset-0">

            {animating && exitingIndex !== null && visibleListings[exitingIndex] && (
              <div key={"exit-" + exitingIndex} className={"absolute inset-0 z-10 " + (direction === 'up' ? 'slide-out-top' : 'slide-out-bottom')}>
                {getVid(visibleListings[exitingIndex]) ? (
                  <video className="w-full h-full object-cover" autoPlay muted loop playsInline
                    src={"https://stream.mux.com/" + getVid(visibleListings[exitingIndex]).mux_playback_id + ".m3u8"} />
                ) : getCover(visibleListings[exitingIndex]) ? (
                  <img src={getCover(visibleListings[exitingIndex])} alt="" className="w-full h-full object-cover" />
                ) : <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><span className="text-6xl">🏠</span></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
              </div>
            )}

            <div className={"absolute inset-0 " + (animating ? (direction === 'up' ? 'slide-in-bottom' : 'slide-in-top') : '')}>
              {getVid(currentListing) ? (
                <video key={currentListing.id} className="w-full h-full object-cover" autoPlay muted loop playsInline
                  src={"https://stream.mux.com/" + getVid(currentListing).mux_playback_id + ".m3u8"} />
              ) : getCover(currentListing) ? (
                <img src={getCover(currentListing)} alt={currentListing.address} className="w-full h-full object-cover" />
              ) : <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><span className="text-6xl">🏠</span></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
            </div>

            <div className="absolute top-0 left-0 right-0 px-3 pt-10 pb-2 flex items-center justify-between">
              <div className="flex gap-1 bg-black/30 backdrop-blur-sm rounded-full p-1">
                <button onClick={() => router.push('/feed')} className="px-3 py-1 rounded-full text-xs text-white/70 hover:text-white transition">For You</button>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-black">Map</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-black/40 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">{currentIndex + 1} / {visibleListings.length}</span>
                <button onClick={() => setShowFilterPanel(true)} className="w-8 h-8 rounded-full bg-black/40 border border-white/30 backdrop-blur-sm flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
                </button>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-14 p-4 pb-6">
              <p className="text-white text-2xl font-bold drop-shadow-lg">{fmt(currentListing.price)}</p>
              <p className="text-white/90 text-sm mt-0.5 drop-shadow">{currentListing.address}</p>
              <p className="text-white/60 text-xs">{currentListing.city}, {currentListing.state}</p>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {[currentListing.bedrooms + ' bed', currentListing.bathrooms + ' bath', (currentListing.sqft||0).toLocaleString() + ' sqft'].map(function(tag) {
                  return <span key={tag} className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-medium">{tag}</span>
                })}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-6 h-6 rounded-full bg-zinc-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">{aName.charAt(0)}</div>
                <Link href={'/agent/profile/' + currentListing.agent_id} className="text-white text-xs font-medium hover:underline">{aName}</Link>
                <span className="text-white/50 text-xs">{aFsbo ? 'FSBO' : aBrok}</span>
              </div>
            </div>

            <div className="absolute right-2 bottom-0 top-0 flex flex-col gap-4 items-center justify-center">
              <button onClick={() => toggleSave(currentListing.id)} className="flex flex-col items-center gap-0.5">
                <div className={'w-10 h-10 rounded-full flex items-center justify-center shadow-lg border ' + (savedIds.has(currentListing.id) ? 'bg-red-500 border-red-400' : 'bg-black/50 border-white/30 backdrop-blur-sm')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={savedIds.has(currentListing.id) ? 'white' : 'none'} stroke="white" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </div>
                <span className="text-white text-xs drop-shadow font-medium">Save</span>
              </button>
              <button onClick={() => router.push('/listing/' + currentListing.id)} className="flex flex-col items-center gap-0.5">
                <div className="w-10 h-10 rounded-full bg-black/50 border border-white/30 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </div>
                <span className="text-white text-xs drop-shadow font-medium">Details</span>
              </button>
              <button onClick={() => { if (!user) { router.push('/auth/login'); return } router.push('/listing/' + currentListing.id + '?contact=true') }} className="flex flex-col items-center gap-0.5">
                <div className="w-10 h-10 rounded-full bg-black/50 border border-white/30 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <span className="text-white text-xs drop-shadow font-medium">Contact</span>
              </button>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 bottom-2 hidden md:flex flex-col gap-1.5 items-center">
              <button onClick={goPrev} disabled={currentIndex === 0}
                className={'w-8 h-8 rounded-full flex items-center justify-center transition border ' + (currentIndex === 0 ? 'border-white/10 text-white/20 cursor-not-allowed' : 'bg-black/50 border-white/40 text-white hover:bg-white/20 backdrop-blur-sm')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6"/></svg>
              </button>
              <button onClick={goNext} disabled={currentIndex === visibleListings.length - 1}
                className={'w-8 h-8 rounded-full flex items-center justify-center transition border ' + (currentIndex === visibleListings.length - 1 ? 'border-white/10 text-white/20 cursor-not-allowed' : 'bg-black/50 border-white/40 text-white hover:bg-white/20 backdrop-blur-sm')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
              </button>
            </div>

            <div className="absolute right-16 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-1.5">
              {visibleListings.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map(function(_, i) {
                const actualIndex = Math.max(0, currentIndex - 2) + i
                return <div key={actualIndex} className={'rounded-full transition-all ' + (actualIndex === currentIndex ? 'w-1.5 h-4 bg-white' : 'w-1.5 h-1.5 bg-white opacity-40')} />
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="hidden md:flex flex-1 relative min-w-0">
        <APIProvider apiKey={apiKey}>
          <Map
            mapId="tourly-map"
            center={mapCenter}
            zoom={mapZoom}
            onCameraChanged={function(ev) { setMapCenter(ev.detail.center); setMapZoom(ev.detail.zoom) }}
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
            }}
            gestureHandling="greedy"
            style={{ width: '100%', height: '100%' }}
          >
            {allListings.map(function(listing) {
              if (!listing.lat || !listing.lng) return null
              const isCurrent = currentListing && currentListing.id === listing.id
              return (
                <AdvancedMarker key={listing.id}
                  position={{ lat: parseFloat(listing.lat), lng: parseFloat(listing.lng) }}
                  onClick={function() {
                    const idx = visibleListings.findIndex(function(l) { return l.id === listing.id })
                    if (idx !== -1) {
                      if (idx > currentIndex) { setDirection('up'); } else { setDirection('down'); }
                      setExitingIndex(currentIndex)
                      setAnimating(true)
                      setCurrentIndex(idx)
                      setTimeout(function() { setAnimating(false); setExitingIndex(null) }, 380)
                    }
                    setMapCenter({ lat: parseFloat(listing.lat), lng: parseFloat(listing.lng) })
                  }}>
                  <div className={'px-2.5 py-1.5 rounded-full text-xs font-semibold shadow-md cursor-pointer transition-all ' + (isCurrent ? 'bg-blue-500 text-white scale-110 shadow-lg' : 'bg-white text-gray-900 hover:bg-gray-50')}>
                    {fmt(listing.price)}
                  </div>
                </AdvancedMarker>
              )
            })}
          </Map>
        </APIProvider>

        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl shadow-md px-3 py-2 flex items-center gap-3">
          <span className="text-xs text-gray-600 font-medium">{visibleListings.length} listing{visibleListings.length !== 1 ? 's' : ''}</span>
          <button onClick={() => setShowFilterPanel(true)} className="text-xs text-gray-900 font-medium border-l border-gray-200 pl-3 hover:text-gray-600 transition">Filters</button>
          <button onClick={() => setShowSearchPanel(true)} className="text-xs text-gray-900 font-medium border-l border-gray-200 pl-3 hover:text-gray-600 transition">Search location</button>
        </div>
      </div>

      {showSearchPanel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Search location</h2>
              <button onClick={() => setShowSearchPanel(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <input
              type="text"
              value={searchLocation}
              onChange={function(e) { setSearchLocation(e.target.value) }}
              onKeyDown={function(e) { if (e.key === 'Enter') handleSearchGo() }}
              placeholder="City, zip code, or address..."
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-400 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowSearchPanel(false)} className="flex-1 border border-gray-200 text-gray-500 rounded-xl py-3 text-sm">Cancel</button>
              <button onClick={handleSearchGo} className="flex-1 bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold">Search →</button>
            </div>
          </div>
        </div>
      )}

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
                className="flex-1 bg-gray-900 text-white rounded-lg py-3 text-sm font-medium">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
