'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SidebarNav from '@/components/shared/sidebar-nav'

export default function SavedListings() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [sortBy, setSortBy] = useState('recent')
  const [hoveredId, setHoveredId] = useState(null)
  const videoRefs = useRef({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { checkUser() }, [])

  async function checkUser() {
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData ? authData.user : null
    if (!currentUser) { router.push('/auth/login'); return }
    setUser(currentUser)
    loadSaved(currentUser.id)
  }

  async function loadSaved(userId) {
    const { data: savesData } = await supabase
      .from('saves')
      .select('*, listings (*, listing_photos (url, position), listing_videos (video_type, mux_playback_id))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (savesData) {
      setListings(savesData.map(function(save) {
        return save.listings ? { ...save.listings, saved_at: save.created_at } : null
      }).filter(Boolean))
    }
    setLoading(false)
  }

  async function removeSave(listingId) {
    if (!user) return
    await supabase.from('saves').delete().eq('user_id', user.id).eq('listing_id', listingId)
    setListings(function(prev) { return prev.filter(function(l) { return l.id !== listingId }) })
  }

  function handleMouseEnter(listingId) {
    setHoveredId(listingId)
    const vid = videoRefs.current[listingId]
    if (vid) {
      vid.currentTime = 0
      vid.play().catch(function() {})
    }
  }

  function handleMouseLeave(listingId) {
    setHoveredId(null)
    const vid = videoRefs.current[listingId]
    if (vid) {
      vid.pause()
      vid.currentTime = 0
    }
  }

  const getSortedListings = () => {
    const sorted = [...listings]
    if (sortBy === 'recent') return sorted.sort(function(a, b) { return new Date(b.saved_at) - new Date(a.saved_at) })
    if (sortBy === 'price_asc') return sorted.sort(function(a, b) { return a.price - b.price })
    if (sortBy === 'price_desc') return sorted.sort(function(a, b) { return b.price - a.price })
    if (sortBy === 'status') return sorted.sort(function(a, b) { return a.status.localeCompare(b.status) })
    return sorted
  }

  const getCoverPhoto = (listing) => {
    if (listing.cover_photo_url) return listing.cover_photo_url
    const photos = listing.listing_photos
    if (!photos || photos.length === 0) return null
    return photos.sort(function(a, b) { return a.position - b.position })[0].url
  }

  const getShortFormVideo = (listing) => {
    return listing.listing_videos ? listing.listing_videos.find(function(v) { return v.video_type === 'short_form' && v.mux_playback_id }) : null
  }

  const formatPrice = (p) => '$' + (p || 0).toLocaleString()

  const getStatusBadge = (status) => {
    if (status === 'active') return { label: 'Active', cls: 'bg-green-100 text-green-700' }
    if (status === 'pending') return { label: 'Pending', cls: 'bg-blue-100 text-blue-700' }
    if (status === 'sold') return { label: 'Sold', cls: 'bg-gray-100 text-gray-500' }
    return { label: status, cls: 'bg-gray-100 text-gray-500' }
  }

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading saved homes...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      <SidebarNav />
      <div className="flex-1 min-w-0">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/feed" className="text-gray-400 hover:text-gray-600 text-sm">←</Link>
          <h1 className="text-sm font-medium text-gray-900">Saved homes</h1>
        </div>
        <p className="text-xs text-gray-400">{listings.length} saved</p>
      </div>

      {listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 gap-4">
          <div className="text-5xl">♥</div>
          <p className="text-base font-medium text-gray-900">No saved homes yet</p>
          <p className="text-sm text-gray-400 text-center">Browse listings and tap the heart icon to save homes you love</p>
          <Link href="/feed" className="bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-700 transition">
            Browse listings
          </Link>
        </div>
      ) : (
        <>
          <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white border-b border-gray-100">
            {[
              { key: 'recent', label: 'Recent' },
              { key: 'price_asc', label: 'Price ↑' },
              { key: 'price_desc', label: 'Price ↓' },
              { key: 'status', label: 'Status' },
            ].map(function(sort) {
              return (
                <button key={sort.key} onClick={() => setSortBy(sort.key)}
                  className={'px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ' + (sortBy === sort.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                  {sort.label}
                </button>
              )
            })}
          </div>

          <div className="max-w-5xl mx-auto px-4 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getSortedListings().map(function(listing) {
                const coverPhoto = getCoverPhoto(listing)
                const video = getShortFormVideo(listing)
                const badge = getStatusBadge(listing.status)
                const isSold = listing.status === 'sold'
                const isHovered = hoveredId === listing.id

                return (
                  <div key={listing.id}
                    className="bg-white rounded-xl border border-gray-100 overflow-hidden group relative hover:shadow-md transition-shadow"
                    onMouseEnter={() => video && handleMouseEnter(listing.id)}
                    onMouseLeave={() => video && handleMouseLeave(listing.id)}>

                    <Link href={'/listing/' + listing.id} className="block">
                      <div className={'relative aspect-video bg-gray-100 overflow-hidden ' + (isSold ? 'opacity-60' : '')}>
                        {coverPhoto ? (
                          <img src={coverPhoto} alt={listing.address}
                            className={'w-full h-full object-cover transition-opacity duration-200 ' + (isHovered && video ? 'opacity-0' : 'opacity-100')} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🏠</div>
                        )}

                        {video && (
                          <video
                            ref={function(el) { videoRefs.current[listing.id] = el }}
                            className={'absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ' + (isHovered ? 'opacity-100' : 'opacity-0')}
                            muted loop playsInline preload="none"
                            src={'https://stream.mux.com/' + video.mux_playback_id + '.m3u8'}
                          />
                        )}

                        {video && (
                          <div className={'absolute bottom-2 right-2 bg-black bg-opacity-50 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs backdrop-blur-sm transition-opacity ' + (isHovered ? 'opacity-0' : 'opacity-100')}>
                            ▶
                          </div>
                        )}

                        <span className={'absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium ' + badge.cls}>
                          {badge.label}
                        </span>

                        <button
                          onClick={function(e) { e.preventDefault(); e.stopPropagation(); removeSave(listing.id) }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black bg-opacity-40 backdrop-blur-sm text-white flex items-center justify-center text-sm hover:bg-opacity-60 transition opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>

                      <div className="p-3">
                        <p className={'text-sm font-medium ' + (isSold ? 'text-gray-400' : 'text-gray-900')}>
                          {formatPrice(listing.price)}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {listing.address}, {listing.city} {listing.state}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {listing.bedrooms} bed · {listing.bathrooms} bath · {(listing.sqft || 0).toLocaleString()} sqft
                        </p>
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
    </div>
  )
}
