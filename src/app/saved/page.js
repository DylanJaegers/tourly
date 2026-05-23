'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SavedListings() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [sortBy, setSortBy] = useState('recent')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData ? authData.user : null
    if (!currentUser) {
      router.push('/auth/login')
      return
    }
    setUser(currentUser)
    loadSaved(currentUser.id)
  }

  async function loadSaved(userId) {
    const { data: savesData } = await supabase
      .from('saves')
      .select('*, listings (*, listing_photos (url, position))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (savesData) {
      setListings(savesData.map(function(save) {
        return { ...save.listings, saved_at: save.created_at }
      }).filter(Boolean))
    }
    setLoading(false)
  }

  async function removeSave(listingId) {
    if (!user) return
    await supabase.from('saves').delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
    setListings(prev => prev.filter(function(l) { return l.id !== listingId }))
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

  const formatPrice = (p) => '$' + (p || 0).toLocaleString()

  const getStatusBadge = (status) => {
    if (status === 'active') return { label: 'Active', class: 'bg-green-100 text-green-700' }
    if (status === 'pending') return { label: 'Pending', class: 'bg-blue-100 text-blue-700' }
    if (status === 'sold') return { label: 'Sold', class: 'bg-gray-100 text-gray-500' }
    return { label: status, class: 'bg-gray-100 text-gray-500' }
  }

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading saved homes...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
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
                <button
                  key={sort.key}
                  onClick={() => setSortBy(sort.key)}
                  className={'px-3 py-1.5 rounded-full text-xs font-medium transition ' + (sortBy === sort.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
                >
                  {sort.label}
                </button>
              )
            })}
          </div>

          <div className="divide-y divide-gray-100 bg-white mt-2 rounded-xl mx-4 overflow-hidden border border-gray-100">
            {getSortedListings().map(function(listing) {
              const coverPhoto = getCoverPhoto(listing)
              const badge = getStatusBadge(listing.status)
              const isSold = listing.status === 'sold'
              return (
                <div key={listing.id} className="flex items-center gap-3 p-3">
                  <Link href={'/listing/' + listing.id} className="flex-shrink-0">
                    <div className={'w-20 h-14 rounded-lg overflow-hidden bg-gray-100 ' + (isSold ? 'opacity-50' : '')}>
                      {coverPhoto ? (
                        <img src={coverPhoto} alt={listing.address} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🏠</div>
                      )}
                    </div>
                  </Link>

                  <Link href={'/listing/' + listing.id} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={'text-sm font-medium ' + (isSold ? 'text-gray-400' : 'text-gray-900')}>
                        {formatPrice(listing.price)}
                      </p>
                      <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + badge.class}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {listing.address}, {listing.city} {listing.state}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {listing.bedrooms} bed · {listing.bathrooms} bath · {(listing.sqft || 0).toLocaleString()} sqft
                    </p>
                  </Link>

                  <button
                    onClick={() => removeSave(listing.id)}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 transition rounded-full hover:bg-gray-50"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>

          <div className="h-8"></div>
        </>
      )}
    </div>
  )
}