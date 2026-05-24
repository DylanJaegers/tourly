'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminPanel() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('listings')
  const [pendingListings, setPendingListings] = useState([])
  const [pendingAgents, setPendingAgents] = useState([])
  const [flaggedListings, setFlaggedListings] = useState([])
  const [platformStats, setPlatformStats] = useState({
    totalListings: 0,
    totalAgents: 0,
    totalBuyers: 0,
    totalLeads: 0,
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData ? authData.user : null
    if (!currentUser) { router.push('/auth/login'); return }

    const { data: userData } = await supabase
      .from('users').select('role').eq('id', currentUser.id).single()

    if (!userData || userData.role !== 'admin') {
      router.push('/')
      return
    }

    setUser(currentUser)
    loadAdminData()
  }

  async function loadAdminData() {
    const { data: listings } = await supabase
      .from('listings')
      .select('*, agent_profiles (full_name, brokerage, is_fsbo, is_verified), listing_photos (url, position), listing_videos (video_type)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    setPendingListings(listings || [])

    const { data: agents } = await supabase
      .from('agents')
      .select('*, users (full_name, email, created_at)')
      .eq('is_verified', false)
      .order('created_at', { ascending: true })
    setPendingAgents(agents || [])

    const { count: listingCount } = await supabase
      .from('listings').select('id', { count: 'exact' })
    const { count: agentCount } = await supabase
      .from('agents').select('id', { count: 'exact' })
    const { count: buyerCount } = await supabase
      .from('users').select('id', { count: 'exact' }).eq('role', 'buyer')
    const { count: leadCount } = await supabase
      .from('leads').select('id', { count: 'exact' })

    setPlatformStats({
      totalListings: listingCount || 0,
      totalAgents: agentCount || 0,
      totalBuyers: buyerCount || 0,
      totalLeads: leadCount || 0,
    })

    setLoading(false)
  }

  async function approveListing(listingId) {
    setActionLoading(listingId)
    await supabase.from('listings')
      .update({ status: 'active' })
      .eq('id', listingId)
    setPendingListings(prev => prev.filter(function(l) { return l.id !== listingId }))
    setPlatformStats(prev => ({ ...prev, totalListings: prev.totalListings }))
    setActionLoading(null)
  }

  async function rejectListing(listingId) {
    setActionLoading(listingId)
    await supabase.from('listings')
      .update({ status: 'draft' })
      .eq('id', listingId)
    setPendingListings(prev => prev.filter(function(l) { return l.id !== listingId }))
    setRejectModal(null)
    setRejectReason('')
    setActionLoading(null)
  }

  async function approveAgent(agentId) {
    setActionLoading(agentId)
    await supabase.from('agents')
      .update({ is_verified: true })
      .eq('id', agentId)
    setPendingAgents(prev => prev.filter(function(a) { return a.id !== agentId }))
    setActionLoading(null)
  }

  async function rejectAgent(agentId) {
    setActionLoading(agentId)
    await supabase.from('users')
      .update({ role: 'buyer' })
      .eq('id', agentId)
    setPendingAgents(prev => prev.filter(function(a) { return a.id !== agentId }))
    setActionLoading(null)
  }

  const getCoverPhoto = (listing) => {
    if (listing.cover_photo_url) return listing.cover_photo_url
    const photos = listing.listing_photos
    if (!photos || photos.length === 0) return null
    return photos.sort(function(a, b) { return a.position - b.position })[0].url
  }

  const formatPrice = (p) => '$' + (p || 0).toLocaleString()
  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date)
    const hours = Math.floor(diff / 3600000)
    if (hours < 24) return hours + 'h ago'
    return Math.floor(hours / 24) + 'd ago'
  }

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading admin panel...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <p className="text-sm font-medium text-gray-900">Tourly Admin</p>
        </div>
        <p className="text-xs text-gray-400">Signed in as admin</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total listings', value: platformStats.totalListings },
            { label: 'Agents', value: platformStats.totalAgents },
            { label: 'Buyers', value: platformStats.totalBuyers },
            { label: 'Leads sent', value: platformStats.totalLeads },
          ].map(function(stat) {
            return (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-medium text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
              </div>
            )
          })}
        </div>

        <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl overflow-hidden">
          {[
            { key: 'listings', label: 'Listings', count: pendingListings.length },
            { key: 'agents', label: 'Agents', count: pendingAgents.length },
            { key: 'platform', label: 'Platform', count: null },
          ].map(function(tab) {
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={'flex-1 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ' + (activeTab === tab.key ? 'text-gray-900 border-b-2 border-gray-900 bg-white' : 'text-gray-400 hover:text-gray-600')}>
                {tab.label}
                {tab.count > 0 && (
                  <span className="bg-red-500 text-white text-xs font-medium w-5 h-5 rounded-full flex items-center justify-center">
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {activeTab === 'listings' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">Pending listing approvals</p>
              <p className="text-xs text-gray-400">{pendingListings.length} awaiting review</p>
            </div>

            {pendingListings.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 py-12 text-center">
                <p className="text-sm text-gray-400">No listings pending review</p>
                <p className="text-xs text-gray-300 mt-1">All caught up ✓</p>
              </div>
            ) : (
              pendingListings.map(function(listing) {
                const coverPhoto = getCoverPhoto(listing)
                const agentName = listing.agent_profiles ? listing.agent_profiles.full_name : 'Unknown'
                const brokerage = listing.agent_profiles ? listing.agent_profiles.brokerage : ''
                const isFsbo = listing.agent_profiles ? listing.agent_profiles.is_fsbo : false
                const hasShortForm = listing.listing_videos ? listing.listing_videos.some(function(v) { return v.video_type === 'short_form' }) : false
                const hasLongForm = listing.listing_videos ? listing.listing_videos.some(function(v) { return v.video_type === 'long_form' }) : false
                const photoCount = listing.listing_photos ? listing.listing_photos.length : 0

                return (
                  <div key={listing.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-4 p-4">
                      <div className="w-20 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                        {coverPhoto ? (
                          <img src={coverPhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🏠</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{formatPrice(listing.price)} · {listing.address}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{listing.city}, {listing.state} {listing.zip}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-400">{agentName}</p>
                          <span className="text-gray-200">·</span>
                          {isFsbo ? (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">FSBO</span>
                          ) : (
                            <span className="text-xs text-gray-400">{brokerage}</span>
                          )}
                          <span className="text-gray-200">·</span>
                          <p className="text-xs text-gray-300">{timeAgo(listing.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pb-3 flex items-center gap-3 border-t border-gray-50 pt-3">
                      <div className="flex gap-3 flex-1">
                        <div className={'flex items-center gap-1 text-xs ' + (hasShortForm ? 'text-green-600' : 'text-gray-300')}>
                          <span>{hasShortForm ? '✓' : '✗'}</span>
                          <span>Short video</span>
                        </div>
                        <div className={'flex items-center gap-1 text-xs ' + (hasLongForm ? 'text-green-600' : 'text-gray-400')}>
                          <span>{hasLongForm ? '✓' : '—'}</span>
                          <span>Tour video</span>
                        </div>
                        <div className={'flex items-center gap-1 text-xs ' + (photoCount >= 5 ? 'text-green-600' : 'text-red-500')}>
                          <span>{photoCount >= 5 ? '✓' : '✗'}</span>
                          <span>{photoCount} photos</span>
                        </div>
                      </div>
                      <Link href={'/listing/' + listing.id} target="_blank"
                        className="text-xs text-gray-400 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition">
                        Preview
                      </Link>
                      <button
                        onClick={() => setRejectModal(listing.id)}
                        disabled={actionLoading === listing.id}
                        className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-50">
                        Reject
                      </button>
                      <button
                        onClick={() => approveListing(listing.id)}
                        disabled={actionLoading === listing.id}
                        className="text-xs text-white bg-green-500 px-3 py-1.5 rounded-lg hover:bg-green-600 transition disabled:opacity-50">
                        {actionLoading === listing.id ? '...' : 'Approve'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">Pending agent approvals</p>
              <p className="text-xs text-gray-400">{pendingAgents.length} awaiting review</p>
            </div>

            {pendingAgents.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 py-12 text-center">
                <p className="text-sm text-gray-400">No agents pending verification</p>
                <p className="text-xs text-gray-300 mt-1">All caught up ✓</p>
              </div>
            ) : (
              pendingAgents.map(function(agent) {
                const userName = agent.users ? agent.users.full_name : 'Unknown'
                const userEmail = agent.users ? agent.users.email : ''
                const joinedAt = agent.users ? timeAgo(agent.users.created_at) : ''
                return (
                  <div key={agent.id} className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500 flex-shrink-0">
                        {userName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">{userName}</p>
                          {agent.is_fsbo && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">FSBO</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{userEmail}</p>
                        {!agent.is_fsbo && (
                          <>
                            <p className="text-xs text-gray-500 mt-1">
                              License: <span className="font-medium text-gray-700">{agent.license_number || '—'}</span>
                              {agent.license_state && <span className="text-gray-400"> · {agent.license_state}</span>}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {agent.brokerage || 'No brokerage listed'}
                            </p>
                          </>
                        )}
                        <p className="text-xs text-gray-300 mt-1">Joined {joinedAt}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => rejectAgent(agent.id)}
                          disabled={actionLoading === agent.id}
                          className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-50">
                          Reject
                        </button>
                        <button
                          onClick={() => approveAgent(agent.id)}
                          disabled={actionLoading === agent.id}
                          className="text-xs text-white bg-green-500 px-3 py-1.5 rounded-lg hover:bg-green-600 transition disabled:opacity-50">
                          {actionLoading === agent.id ? '...' : 'Approve'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'platform' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-gray-900">Platform overview</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total listings', value: platformStats.totalListings, sub: 'all time' },
                { label: 'Active agents', value: platformStats.totalAgents, sub: 'registered' },
                { label: 'Buyers signed up', value: platformStats.totalBuyers, sub: 'all time' },
                { label: 'Leads generated', value: platformStats.totalLeads, sub: 'all time' },
              ].map(function(stat) {
                return (
                  <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-2xl font-medium text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
                    <p className="text-xs text-gray-300 mt-0.5">{stat.sub}</p>
                  </div>
                )
              })}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-sm font-medium text-gray-900 mb-3">Quick actions</p>
              <div className="flex flex-col gap-2">
                <Link href="/feed" className="text-sm text-gray-600 hover:text-gray-900 transition flex items-center gap-2">
                  <span>▶</span> View buyer feed
                </Link>
                <Link href="/agent/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition flex items-center gap-2">
                  <span>📊</span> Agent dashboard
                </Link>
                <Link href="/map" className="text-sm text-gray-600 hover:text-gray-900 transition flex items-center gap-2">
                  <span>🗺️</span> Map view
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {rejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <p className="text-base font-medium text-gray-900 mb-4">Reject listing</p>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 mb-2 block">Reason for rejection</label>
              <select
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-400"
              >
                <option value="">Select a reason...</option>
                <option value="incomplete">Incomplete content</option>
                <option value="address">Incorrect address</option>
                <option value="policy">Policy violation</option>
                <option value="quality">Poor video/photo quality</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="flex-1 border border-gray-200 text-gray-500 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={() => rejectListing(rejectModal)}
                disabled={!rejectReason}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-600 transition disabled:opacity-50">
                Reject listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}