'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function FeedPage() {
  const [listings, setListings] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())
  const [activeTab, setActiveTab] = useState('all')
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [filters, setFilters] = useState({
    listingType: 'all',
    priceMin: '',
    priceMax: '',
    bedrooms: 'any',
    propertyType: 'all',
  })
  const touchStartY = useRef(0)
  const touchStartX = useRef(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadFeed()
    checkUser()
  }, [activeTab])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      const { data: saves } = await supabase.from('saves').select('listing_id').eq('user_id', user.id)
      if (saves) setSavedIds(new Set(saves.map(s => s.listing_id)))
    }
  }

  async function loadFeed() {
    setLoading(true)
    let query = supabase
      .from('listings')
      .select('*, listing_videos (video_type, mux_playback_id, mux_asset_id), listing_photos (url, position), agent_profiles (full_name, brokerage, is_fsbo, avatar_url)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (activeTab === 'saved' && user) {
      const { data: saves } = await supabase.from('saves').select('listing_id').eq('user_id', user.id)
      const savedListingIds = saves?.map(s => s.listing_id) || []
      if (savedListingIds.length === 0) { setListings([]); setLoading(false); return }
      query = query.in('id', savedListingIds)
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
      setSavedIds(prev => { const next = new Set(prev); next.delete(listingId); return next })
    } else {
      await supabase.from('saves').insert({ user_id: user.id, listing_id: listingId })
      setSavedIds(prev => new Set([...prev, listingId]))
    }
  }

  function handleTouchStart(e) {
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    const deltaY = touchStartY.current - e.changedTouches[0].clientY
    const deltaX = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 50 && listings[currentIndex]) router.push('/listing/' + listings[currentIndex].id)
    } else {
      if (deltaY > 50 && currentIndex < listings.length - 1) setCurrentIndex(prev => prev + 1)
      else if (deltaY < -50 && currentIndex > 0) setCurrentIndex(prev => prev - 1)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowUp' && currentIndex > 0) setCurrentIndex(prev => prev - 1)
    if (e.key === 'ArrowDown' && currentIndex < listings.length - 1) setCurrentIndex(prev => prev + 1)
    if (e.key === 'ArrowRight' && listings[currentIndex]) router.push('/listing/' + listings[currentIndex].id)
  }

  const formatPrice = (p) => p >= 1000000 ? '$' + (p/1000000).toFixed(1) + 'M' : '$' + (p/1000).toFixed(0) + 'K'
  const getCoverPhoto = (l) => l.cover_photo_url || l.listing_photos?.sort((a,b) => a.position - b.position)[0]?.url || null
  const getShortFormVideo = (l) => l.listing_videos?.find(v => v.video_type === 'short_form')
  const currentListing = listings[currentIndex]

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white text-sm opacity-50">Loading listings...</p>
    </div>
  )

  return (
    <div className="h-screen bg-black overflow-hidden relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onKeyDown={handleKeyDown} tabIndex={0}>
      {listings.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <p className="text-white text-sm opacity-50">{activeTab === 'saved' ? 'No saved listings yet' : 'No listings available yet'}</p>
          {!user && <Link href="/auth/signup" className="text-white border border-white border-opacity-30 rounded-lg px-4 py-2 text-sm">Sign up to save listings</Link>}
        </div>
      ) : (
        <>
          {currentListing && (
            <div className="absolute inset-0">
              {getShortFormVideo(currentListing)?.mux_playback_id ? (
                <video key={currentListing.id} className="w-full h-full object-cover" autoPlay muted loop playsInline src={'https://stream.mux.com/' + getShortFormVideo(currentListing).mux_playback_id + '.m3u8'} />
              ) : getCoverPhoto(currentListing) ? (
                <img src={getCoverPhoto(currentListing)} alt={currentListing.address} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center"><span className="text-6xl">🏠</span></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-0 left-0 right-0 p-4 pb-8">
                <div className="flex items-end justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-white text-2xl font-medium">{formatPrice(currentListing.price)}</p>
                    <p className="text-white text-sm opacity-80 mt-0.5">{currentListing.address}, {currentListing.city} {currentListing.state}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {[currentListing.bedrooms + ' bed', currentListing.bathrooms + ' bath', currentListing.sqft?.toLocaleString() + ' sqft', currentListing.listing_type === 'for_rent' ? 'For rent' : 'For sale'].map(tag => (
                        <span key={tag} className="bg-white bg-opacity-20 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-medium overflow-hidden">
                        {currentListing.agent_profiles?.avatar_url ? (
                          <img src={currentListing.agent_profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : currentListing.agent_profiles?.full_name?.charAt(0) || 'A'}
                      </div>
                      <div>
                        <p className="text-white text-xs font-medium">{currentListing.agent_profiles?.full_name}</p>
                        <p className="text-white text-xs opacity-60">{currentListing.agent_profiles?.is_fsbo ? 'For Sale By Owner' : currentListing.agent_profiles?.brokerage}</p>
                      </div>
                      <button className="ml-2 text-xs text-white border border-white border-opacity-40 px-2.5 py-1 rounded-full">Follow</button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-5 items-center">
                    <button onClick={() => toggleSave(currentListing.id)} className="flex flex-col items-center gap-1">
                      <div className={'w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm ' + (savedIds.has(currentListing.id) ? 'bg-red-500' : 'bg-white bg-opacity-20')}>
                        <span className="text-white text-lg">♥</span>
                      </div>
                      <span className="text-white text-xs opacity-70">Save</span>
                    </button>
                    <button onClick={() => router.push('/listing/' + currentListing.id)} className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center backdrop-blur-sm"><span className="text-white text-lg">→</span></div>
                      <span className="text-white text-xs opacity-70">Details</span>
                    </button>
                    <button onClick={() => { if (!user) { router.push('/auth/login'); return } router.push('/listing/' + currentListing.id + '?contact=true') }} className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center backdrop-blur-sm"><span className="text-white text-lg">✉</span></div>
                      <span className="text-white text-xs opacity-70">Contact</span>
                    </button>
                    <button onClick={() => router.push('/map?listing=' + currentListing.id)} className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center backdrop-blur-sm"><span className="text-white text-lg">📍</span></div>
                      <span className="text-white text-xs opacity-70">Map</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 left-0 right-0 px-4 pt-12 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-1">
                    {['all', 'for you', 'saved'].map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} className={'px-3 py-1 rounded-full text-xs capitalize transition ' + (activeTab === tab ? 'bg-white text-gray-900 font-medium' : 'text-white opacity-70')}>{tab}</button>
                    ))}
                  </div>
                  <button onClick={() => setShowFilterPanel(true)} className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center backdrop-blur-sm"><span className="text-white text-sm">⚙</span></button>
                </div>
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
                {listings.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_, i) => {
                  const actualIndex = Math.max(0, currentIndex - 2) + i
                  return <div key={actualIndex} className={'rounded-full transition-all ' + (actualIndex === currentIndex ? 'w-1.5 h-4 bg-white' : 'w-1.5 h-1.5 bg-white opacity-40')} />
                })}
              </div>
            </div>
          )}
        </>
      )}
      {showFilterPanel && (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-5 pb-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-medium text-gray-900">Filter listings</h2>
              <button onClick={() => setShowFilterPanel(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Listing type</label>
                <div className="flex gap-2">
                  {['all', 'for_sale', 'for_rent'].map(type => (
                    <button key={type} onClick={() => setFilters(f => ({ ...f, listingType: type }))} className={'flex-1 py-2 text-sm rounded-lg border transition ' + (filters.listingType === type ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500')}>
                      {type === 'all' ? 'All' : type === 'for_sale' ? 'For sale' : 'For rent'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Price range</label>
                <div className="flex gap-2 items-center">
                  <input type="number" placeholder="Min" value={filters.priceMin} onChange={e => setFilters(f => ({ ...f, priceMin: e.target.value }))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none" />
                  <span className="text-gray-400">—</span>
                  <input type="number" placeholder="Max" value={filters.priceMax} onChange={e => setFilters(f => ({ ...f, priceMax: e.target.value }))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Bedrooms</label>
                <div className="flex gap-2">
                  {['any', '1+', '2+', '3+', '4+'].map(b => (
                    <button key={b} onClick={() => setFilters(f => ({ ...f, bedrooms: b }))} className={'flex-1 py-2 text-sm rounded-lg border transition ' + (filters.bedrooms === b ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500')}>{b}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Property type</label>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'house', 'condo', 'townhome', 'land'].map(type => (
                    <button key={type} onClick={() => setFilters(f => ({ ...f, propertyType: type }))} className={'px-3 py-2 text-sm rounded-lg border transition capitalize ' + (filters.propertyType === type ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500')}>
                      {type === 'all' ? 'All types' : type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setFilters({ listingType: 'all', priceMin: '', priceMax: '', bedrooms: 'any', propertyType: 'all' }); setShowFilterPanel(false); loadFeed() }} className="flex-1 border border-gray-200 text-gray-500 rounded-lg py-3 text-sm">Reset</button>
              <button onClick={() => { setShowFilterPanel(false); loadFeed() }} className="flex-1 bg-gray-900 text-white rounded-lg py-3 text-sm font-medium">Show listings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
