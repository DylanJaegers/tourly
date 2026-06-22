'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ContactModal from '@/components/shared/contact-modal'

export default function ListingDetail() {
  const [listing, setListing] = useState(null)
  const [agent, setAgent] = useState(null)
  const [photos, setPhotos] = useState([])
  const [videos, setVideos] = useState([])
  const [similarListings, setSimilarListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [saved, setSaved] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [followed, setFollowed] = useState(false)
  const [activeSection, setActiveSection] = useState('details')
  const [showGallery, setShowGallery] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)

  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    loadListing()
    checkUser()
    if (searchParams.get('contact') === 'true') setShowContact(true)
  }, [params.id])

  async function checkUser() {
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData ? authData.user : null
    setUser(currentUser)
    if (currentUser) {
      const { data: save } = await supabase.from('saves')
        .select('id').eq('user_id', currentUser.id).eq('listing_id', params.id).single()
      setSaved(!!save)
    }
  }

  async function loadListing() {
    const { data: listingData } = await supabase
      .from('listings').select('*').eq('id', params.id).single()
    if (!listingData) { router.push('/feed'); return }
    setListing(listingData)

    await supabase.from('listings')
      .update({ view_count: (listingData.view_count || 0) + 1 })
      .eq('id', params.id)

    const { data: photosData } = await supabase
      .from('listing_photos').select('*').eq('listing_id', params.id).order('position')
    setPhotos(photosData || [])

    const { data: videosData } = await supabase
      .from('listing_videos').select('*').eq('listing_id', params.id)
    setVideos(videosData || [])

    const { data: agentData } = await supabase
      .from('agent_profiles').select('*').eq('id', listingData.agent_id).single()
    setAgent(agentData)

    const { data: similar } = await supabase
      .from('listings')
      .select('*, listing_photos (url, position)')
      .eq('status', 'active')
      .eq('city', listingData.city)
      .neq('id', params.id)
      .gte('price', listingData.price * 0.8)
      .lte('price', listingData.price * 1.2)
      .limit(6)
    setSimilarListings(similar || [])
    setLoading(false)
  }

  async function toggleSave() {
    if (!user) { router.push('/auth/login'); return }
    if (saved) {
      await supabase.from('saves').delete().eq('user_id', user.id).eq('listing_id', params.id)
      setSaved(false)
    } else {
      await supabase.from('saves').insert({ user_id: user.id, listing_id: params.id })
      setSaved(true)
    }
  }

  async function toggleFollow() {
    if (!user) { router.push('/auth/login'); return }
    if (followed) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('agent_id', listing.agent_id)
      setFollowed(false)
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, agent_id: listing.agent_id })
      setFollowed(true)
    }
  }

  const formatFullPrice = (p) => '$' + (p || 0).toLocaleString()
  const pricePerSqft = (listing && listing.sqft) ? Math.round(listing.price / listing.sqft) : 0
  const estMonthly = listing ? Math.round((listing.price * 0.8 * 0.065) / 12) : 0
  const longFormVideo = videos.find(function(v) { return v.video_type === 'long_form' })
  const shortFormVideo = videos.find(function(v) { return v.video_type === 'short_form' })
  const displayVideo = longFormVideo || shortFormVideo
  const agentPhone = agent ? (agent.phone || '') : ''
  const agentPhoneAllowed = agent ? (agent.phone_contact_allowed || false) : false
  const agentName = agent ? (agent.full_name || 'Agent') : 'Agent'
  const agentBrokerage = agent ? (agent.brokerage || '') : ''
  const agentIsFsbo = agent ? (agent.is_fsbo || false) : false
  const agentAvatar = agent ? (agent.avatar_url || '') : ''
  const displayPlaybackId = displayVideo ? (displayVideo.mux_playback_id || '') : ''
  const isLongForm = displayVideo ? (displayVideo.video_type === 'long_form') : false

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  )

  if (!listing) return null

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition">←</button>
        <p className="text-sm font-medium text-gray-900 flex-1 truncate">{listing.address}</p>
        <div className="flex items-center gap-3">
          <button onClick={toggleSave} className={saved ? 'text-red-500 text-xl' : 'text-gray-300 hover:text-gray-500 text-xl'}>♥</button>
          <button className="text-gray-300 hover:text-gray-500 text-lg">⬆</button>
        </div>
      </div>

      {displayPlaybackId ? (
        <div className="relative bg-black" style={{ paddingTop: '56.25%' }}>
          <video className="absolute inset-0 w-full h-full object-cover" controls autoPlay playsInline src={'https://stream.mux.com/' + displayPlaybackId + '.m3u8'} />
          {isLongForm && (
            <div className="absolute bottom-3 left-3 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">Full home tour</div>
          )}
        </div>
      ) : photos.length > 0 ? (
        <div className="relative" style={{ paddingTop: '56.25%' }}>
          <img src={photos[0].url} alt={listing.address} className="absolute inset-0 w-full h-full object-cover" />
        </div>
      ) : null}

      {photos.length > 0 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto">
          {photos.map(function(photo, index) {
            return (
              <button key={photo.id} onClick={() => { setGalleryIndex(index); setShowGallery(true) }}
                className={'flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 ' + (index === 0 ? 'border-gray-900' : 'border-transparent')}>
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
              </button>
            )
          })}
          <button onClick={() => setShowGallery(true)} className="flex-shrink-0 w-16 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-medium">
            +{photos.length}
          </button>
        </div>
      )}

      <div className="sticky top-14 z-30 bg-white border-b border-gray-100 flex">
        {['details', 'stats', 'map', 'agent', 'similar'].map(function(section) {
          return (
            <button key={section} onClick={() => { setActiveSection(section); const el = document.getElementById(section); if (el) el.scrollIntoView({ behavior: 'smooth' }) }}
              className={'flex-1 py-2.5 text-xs capitalize transition ' + (activeSection === section ? 'text-gray-900 font-medium border-b-2 border-gray-900' : 'text-gray-400')}>
              {section}
            </button>
          )
        })}
      </div>

      <div className="px-4 py-4" id="details">
        <p className="text-2xl font-medium text-gray-900">{formatFullPrice(listing.price)}</p>
        <p className="text-sm text-gray-500 mt-1">{listing.address}, {listing.city} {listing.state} {listing.zip}</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          {[listing.bedrooms + ' bed', listing.bathrooms + ' bath', (listing.sqft || 0).toLocaleString() + ' sqft', listing.property_type, listing.listing_type === 'for_rent' ? 'For rent' : 'For sale'].map(function(tag) {
            return <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full capitalize">{tag}</span>
          })}
        </div>
      </div>

      <div className="px-4 py-4 border-t border-gray-50" id="stats">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Property stats</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Per sqft', value: '$' + pricePerSqft },
            { label: 'Year built', value: listing.year_built || '—' },
            { label: 'Lot size', value: listing.lot_size ? listing.lot_size + ' ac' : '—' },
            { label: 'Est/month', value: '$' + estMonthly.toLocaleString() },
            { label: 'Garage', value: listing.garage || '—' },
            { label: 'HVAC', value: listing.hvac || '—' },
          ].map(function(stat) {
            return (
              <div key={stat.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-sm font-medium text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-4 py-4 border-t border-gray-50">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Description</p>
        <p className="text-sm text-gray-600 leading-relaxed">{listing.description}</p>
      </div>

      {listing.open_house_date && (
        <div className="px-4 py-4 border-t border-gray-50">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Open house</p>
          <p className="text-sm text-gray-900">{new Date(listing.open_house_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
        </div>
      )}

      <div className="px-4 py-4 border-t border-gray-50" id="agent">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Listing agent</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium overflow-hidden flex-shrink-0">
            {agentAvatar ? <img src={agentAvatar} alt="" className="w-full h-full object-cover" /> : agentName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
<Link href={'/agent/profile/' + listing.agent_id} className="text-sm font-medium text-gray-900 hover:underline">{agentName}</Link>            <p className="text-xs text-gray-400">{agentIsFsbo ? 'For Sale By Owner' : agentBrokerage}</p>
          </div>
          <button onClick={toggleFollow} className={followed ? 'text-xs px-3 py-1.5 rounded-full border bg-gray-900 text-white border-gray-900' : 'text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50'}>
            {followed ? 'Following' : 'Follow'}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-gray-50" id="map">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Location</p>
          <Link href={listing.lat && listing.lng ? ("/map?listing=" + listing.id) : "/map"} className="text-xs text-gray-900 font-medium hover:underline">
            Open full map →
          </Link>
        </div>
        {user ? (
          listing.lat && listing.lng ? (
            <Link href={"/map?listing=" + listing.id} className="block relative rounded-xl overflow-hidden h-48 group">
              <div className="w-full h-full relative">
                <iframe
                  src={"https://www.google.com/maps/embed/v1/place?key=" + (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "") + "&q=" + listing.lat + "," + listing.lng + "&zoom=14"}
                  className="absolute inset-0 w-full h-full border-0 pointer-events-none rounded-xl"
                  loading="lazy"
                  allowFullScreen
                />
                <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-10 transition flex items-center justify-center">
                  <span className="bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition shadow-md">View on map</span>
                </div>
              </div>
            </Link>
          ) : (
            <div className="bg-gray-100 rounded-xl h-40 flex items-center justify-center">
              <p className="text-sm text-gray-400">📍 {listing.address}, {listing.city} {listing.state}</p>
            </div>
          )
        ) : (
          <div className="bg-gray-50 rounded-xl h-40 flex flex-col items-center justify-center gap-2">
            <p className="text-sm text-gray-400">Sign in to see the full address</p>
            <Link href="/auth/login" className="text-xs text-gray-900 font-medium border border-gray-200 rounded-lg px-3 py-1.5">Sign in</Link>
          </div>
        )}
      </div>

      {similarListings.length > 0 && (
        <div className="py-4 border-t border-gray-50" id="similar">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 px-4">Similar listings</p>
          <div className="flex gap-3 px-4 overflow-x-auto pb-2">
            {similarListings.map(function(similar) {
              const coverPhoto = similar.cover_photo_url || (similar.listing_photos && similar.listing_photos.length > 0 ? similar.listing_photos.sort(function(a,b) { return a.position - b.position })[0].url : null)
              const simPrice = similar.price >= 1000000 ? '$' + (similar.price/1000000).toFixed(1) + 'M' : '$' + (similar.price/1000).toFixed(0) + 'K'
              return (
                <Link key={similar.id} href={'/listing/' + similar.id} className="flex-shrink-0 w-36 border border-gray-100 rounded-xl overflow-hidden">
                  <div className="h-24 bg-gray-100 overflow-hidden">
                    {coverPhoto ? <img src={coverPhoto} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🏠</div>}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-900">{simPrice}</p>
                    <p className="text-xs text-gray-400">{similar.bedrooms}bd · {similar.bathrooms}ba · {similar.city}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="h-24"></div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3">
        {agentPhoneAllowed && (
          <a href={user ? ('tel:' + agentPhone) : '/auth/login'} className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-3 text-sm text-center font-medium hover:bg-gray-50 transition">
            📞 Call
          </a>
        )}
        <button onClick={() => { if (!user) { router.push('/auth/login'); return } setShowContact(true) }}
          className="flex-1 bg-gray-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-700 transition">
          Contact agent
        </button>
      </div>

      {showGallery && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setShowGallery(false)} className="text-white text-sm">← Close</button>
            <p className="text-white text-sm">{galleryIndex + 1} / {photos.length}</p>
            <div className="w-12"></div>
          </div>
          <div className="flex-1 flex items-center justify-center px-4">
            <img src={photos[galleryIndex] ? photos[galleryIndex].url : ''} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          </div>
          <div className="flex gap-2 px-4 py-4 overflow-x-auto">
            {photos.map(function(photo, index) {
              return (
                <button key={photo.id} onClick={() => setGalleryIndex(index)} className={'flex-shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 ' + (index === galleryIndex ? 'border-white' : 'border-transparent')}>
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {showContact && (
        <ContactModal listing={listing} agent={agent} user={user} onClose={() => setShowContact(false)} />
      )}
    </div>
  )
}
