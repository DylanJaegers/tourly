'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'

export default function MapView() {
  const [listings, setListings] = useState([])
  const [selectedListing, setSelectedListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())
  const [mapCenter, setMapCenter] = useState({ lat: 39.5, lng: -98.35 })
  const [mapZoom, setMapZoom] = useState(4)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [filters, setFilters] = useState({
    listingType: 'all',
    priceMin: '',
    priceMax: '',
    bedrooms: 'any',
    propertyType: 'all',
  })

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    loadListings()
    checkUser()
  }, [])

  async function checkUser() {
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData ? authData.user : null
    setUser(currentUser)
    if (currentUser) {
      const { data: saves } = await supabase
        .from('saves').select('listing_id').eq('user_id', currentUser.id)
      if (saves) setSavedIds(new Set(saves.map(function(s) { return s.listing_id })))
    }
  }

  async function loadListings() {
    let query = supabase
      .from('listings')
      .select('*, listing_photos (url, position)')
      .eq('status', 'active')
      .not('lat', 'is', null)
      .not('lng', 'is', null)

    if (filters.listingType !== 'all') query = query.eq('listing_type', filters.listingType)
    if (filters.priceMin) query = query.gte('price', parseInt(filters.priceMin))
    if (filters.priceMax) query = query.lte('price', parseInt(filters.priceMax))
    if (filters.bedrooms !== 'any') query = query.gte('bedrooms', parseInt(filters.bedrooms))
    if (filters.propertyType !== 'all') query = query.eq('property_type', filters.propertyType)

    const { data } = await query.limit(100)
    const listingsData = data || []
    setListings(listingsData)

    const highlightId = searchParams.get('listing')
    if (highlightId) {
      const highlighted = listingsData.find(function(l) { return l.id === highlightId })
      if (highlighted && highlighted.lat && highlighted.lng) {
        setMapCenter({ lat: parseFloat(highlighted.lat), lng: parseFloat(highlighted.lng) })
        setMapZoom(14)
        setSelectedListing(highlighted)
      }
    } else if (listingsData.length > 0) {
      const first = listingsData[0]
      if (first.lat && first.lng) {
        setMapCenter({ lat: parseFloat(first.lat), lng: parseFloat(first.lng) })
        setMapZoom(11)
      }
    }

    setLoading(false)
  }

  async function toggleSave(listingId) {
    if (!user) { router.push('/auth/login'); return }
    if (savedIds.has(listingId)) {
      await supabase.from('saves').delete()
        .eq('user_id', user.id).eq('listing_id', listingId)
      setSavedIds(prev => { const next = new Set(prev); next.delete(listingId); return next })
    } else {
      await supabase.from('saves').insert({ user_id: user.id, listing_id: listingId })
      setSavedIds(prev => new Set([...prev, listingId]))
    }
  }

  const formatPrice = (p) => {
    if (p >= 1000000) return '$' + (p / 1000000).toFixed(1) + 'M'
    return '$' + (p / 1000).toFixed(0) + 'K'
  }

  const getCoverPhoto = (listing) => {
    if (listing.cover_photo_url) return listing.cover_photo_url
    const photos = listing.listing_photos
    if (!photos || photos.length === 0) return null
    return photos.sort(function(a, b) { return a.position - b.position })[0].url
  }

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading map...</p>
    </div>
  )

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <Link href="/feed" className="text-gray-400 hover:text-gray-600 text-sm">←</Link>
        <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by city or zip..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilterPanel(true)}
          className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition flex-shrink-0"
        >
          ⚙
        </button>
      </div>

      <div className="relative flex-1">
        <APIProvider apiKey={apiKey}>
          <Map
            mapId="tourly-map"
            center={mapCenter}
            zoom={mapZoom}
            onCameraChanged={(ev) => {
              setMapCenter(ev.detail.center)
              setMapZoom(ev.detail.zoom)
            }}
            gestureHandling="greedy"
            disableDefaultUI={false}
            style={{ width: '100%', height: '100%' }}
          >
            {listings.map(function(listing) {
              if (!listing.lat || !listing.lng) return null
              const isSelected = selectedListing && selectedListing.id === listing.id
              return (
                <AdvancedMarker
                  key={listing.id}
                  position={{ lat: parseFloat(listing.lat), lng: parseFloat(listing.lng) }}
                  onClick={() => setSelectedListing(listing)}
                >
                  <div className={
                    'px-2.5 py-1.5 rounded-full text-xs font-medium shadow-md cursor-pointer transition-all ' +
                    (isSelected
                      ? 'bg-blue-500 text-white scale-110'
                      : 'bg-white text-gray-900 hover:bg-gray-50')
                  }>
                    {formatPrice(listing.price)}
                  </div>
                </AdvancedMarker>
              )
            })}
          </Map>
        </APIProvider>

        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            onClick={() => router.push('/feed')}
            className="bg-white shadow-md rounded-xl px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-1.5"
          >
            ▶ Feed
          </button>
        </div>

        {listings.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-xl shadow-lg px-4 py-3 text-center pointer-events-auto">
              <p className="text-sm text-gray-500">No listings in this area</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
            </div>
          </div>
        )}

        {selectedListing && (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-3 flex items-center gap-3">
            <div className="w-16 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
              {getCoverPhoto(selectedListing) ? (
                <img src={getCoverPhoto(selectedListing)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">🏠</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{formatPrice(selectedListing.price)}</p>
              <p className="text-xs text-gray-500 truncate">{selectedListing.address}</p>
              <p className="text-xs text-gray-400">
                {selectedListing.bedrooms} bed · {selectedListing.bathrooms} bath · {(selectedListing.sqft || 0).toLocaleString()} sqft
              </p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Link
                href={'/listing/' + selectedListing.id}
                className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-700 transition text-center"
              >
                View →
              </Link>
              <button
                onClick={() => toggleSave(selectedListing.id)}
                className={'text-xs px-3 py-1.5 rounded-lg border transition ' + (savedIds.has(selectedListing.id) ? 'bg-red-50 border-red-200 text-red-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}
              >
                {savedIds.has(selectedListing.id) ? '♥ Saved' : '♡ Save'}
              </button>
            </div>
            <button onClick={() => setSelectedListing(null)} className="text-gray-300 hover:text-gray-500 flex-shrink-0 text-lg">×</button>
          </div>
        )}
      </div>

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
                  <input type="number" placeholder="Min" value={filters.priceMin}
                    onChange={function(e) { setFilters(function(f) { return { ...f, priceMin: e.target.value } }) }}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none" />
                  <span className="text-gray-400">—</span>
                  <input type="number" placeholder="Max" value={filters.priceMax}
                    onChange={function(e) { setFilters(function(f) { return { ...f, priceMax: e.target.value } }) }}
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