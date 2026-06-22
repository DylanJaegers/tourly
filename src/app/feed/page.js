'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SidebarNav from '@/components/shared/sidebar-nav'

export default function FeedPage() {
  const [listings, setListings] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())
  const [activeTab, setActiveTab] = useState('all')
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [showSearchPanel, setShowSearchPanel] = useState(false)
  const [searchLocation, setSearchLocation] = useState('')
  const [filters, setFilters] = useState({ listingType: 'all', priceMin: '', priceMax: '', bedrooms: 'any', propertyType: 'all' })
  const touchStartY = useRef(0)
  const touchStartX = useRef(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadFeed(); checkUser() }, [activeTab])

  async function checkUser() {
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData ? authData.user : null
    setUser(currentUser)
    if (currentUser) {
      const { data: saves } = await supabase.from('saves').select('listing_id').eq('user_id', currentUser.id)
      if (saves) setSavedIds(new Set(saves.map(function(s) { return s.listing_id })))
    }
  }

  async function loadFeed() {
    setLoading(true)
    let query = supabase
      .from('listings')
      .select('*, listing_videos (video_type, mux_playback_id), listing_photos (url, position), agent_profiles (full_name, brokerage, is_fsbo, avatar_url)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (activeTab === 'saved' && user) {
      const { data: saves } = await supabase.from('saves').select('listing_id').eq('user_id', user.id)
      const ids = saves ? saves.map(function(s) { return s.listing_id }) : []
      if (ids.length === 0) { setListings([]); setLoading(false); return }
      query = query.in('id', ids)
    }
    const { data } = await query
    setListings(data || [])
    setCurrentIndex(0)
    setLoading(false)
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

  function goNext() { if (currentIndex < listings.length - 1) setCurrentIndex(function(p) { return p + 1 }) }
  function goPrev() { if (currentIndex > 0) setCurrentIndex(function(p) { return p - 1 }) }
  function handleTouchStart(e) { touchStartY.current = e.touches[0].clientY; touchStartX.current = e.touches[0].clientX }
  function handleTouchEnd(e) {
    const dy = touchStartY.current - e.changedTouches[0].clientY
    const dx = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(dx) > Math.abs(dy)) { if (dx > 50 && listings[currentIndex]) router.push('/listing/' + listings[currentIndex].id) }
    else { if (dy > 50) goNext(); else if (dy < -50) goPrev() }
  }
  function handleKeyDown(e) {
    if (e.key === 'ArrowUp') goPrev()
    if (e.key === 'ArrowDown') goNext()
    if (e.key === 'ArrowRight' && listings[currentIndex]) router.push('/listing/' + listings[currentIndex].id)
  }

  function handleSearchGo() {
    if (!searchLocation.trim()) return
    const params = new URLSearchParams()
    params.set('location', searchLocation.trim())
    if (filters.listingType !== 'all') params.set('type', filters.listingType)
    if (filters.priceMin) params.set('minPrice', filters.priceMin)
    if (filters.priceMax) params.set('maxPrice', filters.priceMax)
    if (filters.bedrooms !== 'any') params.set('beds', filters.bedrooms)
    router.push('/map?' + params.toString())
  }

  const fmt = (p) => p >= 1000000 ? '$' + (p/1000000).toFixed(1) + 'M' : '$' + (p/1000).toFixed(0) + 'K'
  const fmtFull = (p) => '$' + (p || 0).toLocaleString()
  const getCover = (l) => l.cover_photo_url || (l.listing_photos && l.listing_photos.length > 0 ? l.listing_photos.sort(function(a,b){return a.position-b.position})[0].url : null)
  const getVid = (l) => l.listing_videos ? l.listing_videos.find(function(v) { return v.video_type === 'short_form' }) : null

  const cl = currentListing = listings[currentIndex]
  const ppsf = cl && cl.sqft ? Math.round(cl.price / cl.sqft) : 0
  const mo = cl ? Math.round((cl.price * 0.8 * 0.065) / 12) : 0
  const aName = cl && cl.agent_profiles ? (cl.agent_profiles.full_name || 'Agent') : 'Agent'
  const aBrok = cl && cl.agent_profiles ? (cl.agent_profiles.brokerage || '') : ''
  const aFsbo = cl && cl.agent_profiles ? cl.agent_profiles.is_fsbo : false

  var currentListing = listings[currentIndex]

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-white text-sm opacity-50">Loading...</p></div>

  return (
    <div className="h-screen bg-black overflow-hidden flex" onKeyDown={handleKeyDown} tabIndex={0}>

      <SidebarNav onSearchClick={() => setShowSearchPanel(true)} onFilterClick={() => setShowFilterPanel(true)} />

      <div className="relative flex-shrink-0 h-screen bg-black"
        style={{ width: 'calc(100vh * 9 / 16)', maxWidth: '400px', minWidth: '260px' }}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

        {listings.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-white text-sm opacity-50">No listings available</p>
            {!user && <Link href="/auth/signup" className="text-white border border-white border-opacity-30 rounded-lg px-4 py-2 text-sm">Sign up free</Link>}
          </div>
        ) : currentListing ? (
          <div className="absolute inset-0">
            {getVid(currentListing) && getVid(currentListing).mux_playback_id ? (
              <video key={currentListing.id} className="w-full h-full object-cover" autoPlay muted loop playsInline
                src={'https://stream.mux.com/' + getVid(currentListing).mux_playback_id + '.m3u8'} />
            ) : getCover(currentListing) ? (
              <img src={getCover(currentListing)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><span className="text-6xl">🏠</span></div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />

            <div className="absolute top-0 left-0 right-0 px-3 pt-10 pb-2 flex items-center justify-between">
              <div className="flex gap-1 bg-black/30 backdrop-blur-sm rounded-full p-1">
                {['All', 'For You', 'Saved'].map(function(tab) {
                  const key = tab.toLowerCase().replace(' ', ' ')
                  const isActive = (tab === 'All' && activeTab === 'all') || (tab === 'For You' && activeTab === 'for you')
                  return (
                    <button key={tab} onClick={() => {
                      if (tab === 'Saved') { router.push('/saved'); return }
                      setActiveTab(tab === 'All' ? 'all' : 'for you')
                    }} className={'px-3 py-1 rounded-full text-xs font-semibold transition ' + (isActive ? 'bg-white text-black' : 'text-white hover:text-white/80')}>
                      {tab}
                    </button>
                  )
                })}
              </div>
              <button onClick={() => setShowFilterPanel(true)}
                className="w-8 h-8 rounded-full bg-black/40 border border-white/30 backdrop-blur-sm flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              </button>
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
                <button className="text-xs text-white border border-white/40 px-2 py-0.5 rounded-full hover:bg-white/20 transition flex-shrink-0">Follow</button>
              </div>
            </div>

            <div className="absolute right-2 bottom-6 flex flex-col gap-3 items-center">
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
              <button onClick={() => router.push('/map?listing=' + currentListing.id)} className="flex flex-col items-center gap-0.5">
                <div className="w-10 h-10 rounded-full bg-black/50 border border-white/30 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <span className="text-white text-xs drop-shadow font-medium">Map</span>
              </button>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 bottom-2 hidden md:flex flex-col gap-1.5 items-center">
              <button onClick={goPrev} disabled={currentIndex === 0}
                className={'w-8 h-8 rounded-full flex items-center justify-center transition border ' + (currentIndex === 0 ? 'border-white/10 text-white/20 cursor-not-allowed' : 'bg-black/50 border-white/40 text-white hover:bg-white/20 backdrop-blur-sm')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6"/></svg>
              </button>
              <button onClick={goNext} disabled={currentIndex === listings.length - 1}
                className={'w-8 h-8 rounded-full flex items-center justify-center transition border ' + (currentIndex === listings.length - 1 ? 'border-white/10 text-white/20 cursor-not-allowed' : 'bg-black/50 border-white/40 text-white hover:bg-white/20 backdrop-blur-sm')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {currentListing && (
        <div className="hidden md:flex flex-col flex-1 bg-white overflow-hidden min-w-0">
          <div className="flex-shrink-0 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-gray-900">{fmtFull(currentListing.price)}</p>
              <p className="text-sm text-gray-400 mt-0.5">{currentListing.address}, {currentListing.city} {currentListing.state}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => toggleSave(currentListing.id)}
                className={'w-9 h-9 rounded-full border flex items-center justify-center transition ' + (savedIds.has(currentListing.id) ? 'bg-red-50 border-red-200' : 'border-gray-200 hover:border-gray-400')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={savedIds.has(currentListing.id) ? '#ef4444' : 'none'} stroke={savedIds.has(currentListing.id) ? '#ef4444' : '#9ca3af'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
              <Link href={'/listing/' + currentListing.id} className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-700 transition whitespace-nowrap">
                Full tour →
              </Link>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-50">
              <div className="flex gap-2 flex-wrap">
                {[currentListing.bedrooms + ' bed', currentListing.bathrooms + ' bath', (currentListing.sqft||0).toLocaleString() + ' sqft', currentListing.property_type, currentListing.listing_type === 'for_rent' ? 'For rent' : 'For sale'].filter(Boolean).map(function(tag) {
                  return <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full capitalize">{tag}</span>
                })}
              </div>
            </div>
            <div className="px-6 py-4 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Property stats</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Per sqft', value: '$' + ppsf },
                  { label: 'Year built', value: currentListing.year_built || '—' },
                  { label: 'Lot size', value: currentListing.lot_size ? currentListing.lot_size + ' ac' : '—' },
                  { label: 'Est/month', value: '$' + mo.toLocaleString() },
                  { label: 'Garage', value: currentListing.garage || '—' },
                  { label: 'HVAC', value: currentListing.hvac || '—' },
                ].map(function(s) {
                  return (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-sm font-semibold text-gray-900">{s.value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  )
                })}
              </div>
            </div>
            {currentListing.description && (
              <div className="px-6 py-4 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Description</p>
                <p className="text-sm text-gray-600 leading-relaxed">{currentListing.description}</p>
              </div>
            )}
            <div className="px-6 py-4 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Listing agent</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold flex-shrink-0">{aName.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <Link href={'/agent/profile/' + currentListing.agent_id} className="text-sm font-semibold text-gray-900 hover:underline">{aName}</Link>
                  <p className="text-xs text-gray-400">{aFsbo ? 'For Sale By Owner' : aBrok}</p>
                </div>
                <button className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-50 transition flex-shrink-0">Follow</button>
              </div>
            </div>
            {currentListing.open_house_date && (
              <div className="px-6 py-4 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Open house</p>
                <p className="text-sm text-gray-900">{new Date(currentListing.open_house_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
              </div>
            )}
            <div className="h-20"></div>
          </div>

          <div className="flex-shrink-0 border-t border-gray-100 px-6 py-4 flex gap-3 bg-white">
            <button onClick={() => { if (!user) { router.push('/auth/login'); return } router.push('/listing/' + currentListing.id + '?contact=true') }}
              className="flex-1 bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-gray-700 transition">
              Contact agent
            </button>
            <Link href={'/listing/' + currentListing.id} className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-3 text-sm font-medium text-center hover:bg-gray-50 transition">
              Full tour →
            </Link>
          </div>
        </div>
      )}

      {showSearchPanel && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Search listings</h2>
              <button onClick={() => setShowSearchPanel(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Location</label>
                <input
                  type="text"
                  value={searchLocation}
                  onChange={function(e) { setSearchLocation(e.target.value) }}
                  onKeyDown={function(e) { if (e.key === 'Enter') { handleSearchGo(); setShowSearchPanel(false) } }}
                  placeholder="City, zip code, or address..."
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Listing type</label>
                <div className="flex gap-2">
                  {['all', 'for_sale', 'for_rent'].map(function(type) {
                    return (
                      <button key={type} onClick={() => setFilters(function(f) { return { ...f, listingType: type } })}
                        className={'flex-1 py-2 text-sm rounded-xl border transition ' + (filters.listingType === type ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                        {type === 'all' ? 'All' : type === 'for_sale' ? 'For sale' : 'For rent'}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Price range</label>
                <div className="flex gap-2 items-center">
                  <input type="number" placeholder="Min price" value={filters.priceMin}
                    onChange={function(e) { setFilters(function(f) { return { ...f, priceMin: e.target.value } }) }}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-400" />
                  <span className="text-gray-300 font-medium">—</span>
                  <input type="number" placeholder="Max price" value={filters.priceMax}
                    onChange={function(e) { setFilters(function(f) { return { ...f, priceMax: e.target.value } }) }}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Bedrooms</label>
                <div className="flex gap-2">
                  {['any', '1', '2', '3', '4'].map(function(b) {
                    return (
                      <button key={b} onClick={() => setFilters(function(f) { return { ...f, bedrooms: b } })}
                        className={'flex-1 py-2 text-sm rounded-xl border transition ' + (filters.bedrooms === b ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                        {b === 'any' ? 'Any' : b + '+'}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSearchPanel(false)}
                className="flex-1 border border-gray-200 text-gray-500 rounded-xl py-3 text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={() => { handleSearchGo(); setShowSearchPanel(false) }}
                className="flex-1 bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-gray-700 transition">
                Search on map →
              </button>
            </div>
          </div>
        </div>
      )}

      {showFilterPanel && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-end md:items-center md:justify-center">
          <div className="bg-white w-full md:w-96 rounded-t-2xl md:rounded-2xl p-5 pb-10 md:pb-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Filter listings</h2>
              <button onClick={() => setShowFilterPanel(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Listing type</label>
                <div className="flex gap-2">
                  {['all', 'for_sale', 'for_rent'].map(function(type) {
                    return (
                      <button key={type} onClick={() => setFilters(function(f) { return { ...f, listingType: type } })}
                        className={'flex-1 py-2 text-sm rounded-xl border transition ' + (filters.listingType === type ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500')}>
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
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none" />
                  <span className="text-gray-300">—</span>
                  <input type="number" placeholder="Max" value={filters.priceMax} onChange={function(e) { setFilters(function(f) { return { ...f, priceMax: e.target.value } }) }}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Bedrooms</label>
                <div className="flex gap-2">
                  {['any', '1', '2', '3', '4'].map(function(b) {
                    return (
                      <button key={b} onClick={() => setFilters(function(f) { return { ...f, bedrooms: b } })}
                        className={'flex-1 py-2 text-sm rounded-xl border transition ' + (filters.bedrooms === b ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500')}>
                        {b === 'any' ? 'Any' : b + '+'}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Property type</label>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'house', 'condo', 'townhome', 'land'].map(function(type) {
                    return (
                      <button key={type} onClick={() => setFilters(function(f) { return { ...f, propertyType: type } })}
                        className={'px-3 py-2 text-sm rounded-xl border transition capitalize ' + (filters.propertyType === type ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500')}>
                        {type === 'all' ? 'All types' : type}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setFilters({ listingType: 'all', priceMin: '', priceMax: '', bedrooms: 'any', propertyType: 'all' }); setShowFilterPanel(false); loadFeed() }}
                className="flex-1 border border-gray-200 text-gray-500 rounded-xl py-3 text-sm">Reset</button>
              <button onClick={() => { setShowFilterPanel(false); loadFeed() }}
                className="flex-1 bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold">Apply filters</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
