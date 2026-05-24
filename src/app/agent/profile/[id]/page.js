'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ContactModal from '@/components/shared/contact-modal'

export default function AgentPublicProfile() {
  const [agent, setAgent] = useState(null)
  const [listings, setListings] = useState([])
  const [user, setUser] = useState(null)
  const [followed, setFollowed] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showContact, setShowContact] = useState(false)
  const [showFullBio, setShowFullBio] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
    checkUser()
  }, [params.id])

  async function checkUser() {
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData ? authData.user : null
    setUser(currentUser)
    if (currentUser) {
      const { data: follow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('agent_id', params.id)
        .single()
      setFollowed(!!follow)
    }
  }

  async function loadProfile() {
    const { data: agentData } = await supabase
      .from('agent_profiles')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!agentData) { router.push('/feed'); return }
    setAgent(agentData)
    setFollowerCount(agentData.follower_count || 0)

    const { data: listingsData } = await supabase
      .from('listings')
      .select('*, listing_photos (url, position)')
      .eq('agent_id', params.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    setListings(listingsData || [])
    setLoading(false)
  }

  async function toggleFollow() {
    if (!user) { router.push('/auth/login'); return }
    if (followed) {
      await supabase.from('follows').delete()
        .eq('follower_id', user.id).eq('agent_id', params.id)
      setFollowed(false)
      setFollowerCount(prev => Math.max(0, prev - 1))
    } else {
      await supabase.from('follows').insert({
        follower_id: user.id,
        agent_id: params.id,
      })
      setFollowed(true)
      setFollowerCount(prev => prev + 1)
    }
  }

  const getCoverPhoto = (listing) => {
    if (listing.cover_photo_url) return listing.cover_photo_url
    const photos = listing.listing_photos
    if (!photos || photos.length === 0) return null
    return photos.sort(function(a, b) { return a.position - b.position })[0].url
  }

  const formatPrice = (p) => {
    if (p >= 1000000) return '$' + (p / 1000000).toFixed(1) + 'M'
    return '$' + (p / 1000).toFixed(0) + 'K'
  }

  const agentName = agent ? (agent.full_name || 'Agent') : 'Agent'
  const agentBio = agent ? (agent.bio || '') : ''
  const agentBrokerage = agent ? (agent.brokerage || '') : ''
  const agentIsFsbo = agent ? (agent.is_fsbo || false) : false
  const agentAvatar = agent ? (agent.avatar_url || '') : ''
  const agentYears = agent ? (agent.years_experience || null) : null
  const agentShowYears = agent ? (agent.show_years_experience !== false) : false
  const agentServiceArea = agent ? (agent.service_area || '') : ''
  const agentPhoneAllowed = agent ? (agent.phone_contact_allowed || false) : false

  const bioTruncated = agentBio.length > 150 ? agentBio.slice(0, 150) + '...' : agentBio

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading profile...</p>
    </div>
  )

  if (!agent) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">←</button>
        <p className="text-sm font-medium text-gray-900 flex-1">Agent profile</p>
        <button className="text-gray-400 hover:text-gray-600 text-lg">⬆</button>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 py-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-medium text-gray-500 overflow-hidden mx-auto mb-3">
          {agentAvatar ? (
            <img src={agentAvatar} alt={agentName} className="w-full h-full object-cover" />
          ) : agentName.charAt(0)}
        </div>
        <p className="text-lg font-medium text-gray-900">{agentName}</p>
        <p className="text-sm text-gray-400 mt-0.5">
          {agentIsFsbo ? 'For Sale By Owner' : agentBrokerage}
        </p>
        {agentServiceArea && (
          <p className="text-xs text-gray-300 mt-1">{agentServiceArea}</p>
        )}

        <div className="flex items-center justify-center gap-6 mt-4 mb-5">
          <div className="text-center">
            <p className="text-base font-medium text-gray-900">{listings.length}</p>
            <p className="text-xs text-gray-400">Listings</p>
          </div>
          <div className="w-px h-8 bg-gray-100"></div>
          <div className="text-center">
            <p className="text-base font-medium text-gray-900">{followerCount}</p>
            <p className="text-xs text-gray-400">Followers</p>
          </div>
          {agentShowYears && agentYears && (
            <>
              <div className="w-px h-8 bg-gray-100"></div>
              <div className="text-center">
                <p className="text-base font-medium text-gray-900">{agentYears}yr</p>
                <p className="text-xs text-gray-400">Experience</p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 justify-center">
          <button
            onClick={toggleFollow}
            className={'px-5 py-2.5 rounded-xl text-sm font-medium transition ' + (followed ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-700')}
          >
            {followed ? 'Following' : 'Follow'}
          </button>
          <button
            onClick={() => {
              if (!user) { router.push('/auth/login'); return }
              setShowContact(true)
            }}
            className="px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
          >
            Contact
          </button>
        </div>
      </div>

      {agentBio && (
        <div className="bg-white border-b border-gray-100 px-4 py-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">About</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            {showFullBio ? agentBio : bioTruncated}
          </p>
          {agentBio.length > 150 && (
            <button onClick={() => setShowFullBio(!showFullBio)} className="text-xs text-gray-900 font-medium mt-1">
              {showFullBio ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      <div className="px-4 py-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
          Active listings ({listings.length})
        </p>

        {listings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 py-10 text-center">
            <p className="text-sm text-gray-400">No active listings</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {listings.map(function(listing) {
              const coverPhoto = getCoverPhoto(listing)
              return (
                <Link key={listing.id} href={'/listing/' + listing.id}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition">
                  <div className="h-28 bg-gray-100 overflow-hidden">
                    {coverPhoto ? (
                      <img src={coverPhoto} alt={listing.address} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🏠</div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-sm font-medium text-gray-900">{formatPrice(listing.price)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {listing.bedrooms}bd · {listing.bathrooms}ba · {listing.city}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="h-8"></div>

      {showContact && (
        <ContactModal
          listing={listings[0] || null}
          agent={agent}
          user={user}
          onClose={() => setShowContact(false)}
        />
      )}
    </div>
  )
}