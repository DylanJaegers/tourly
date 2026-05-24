'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function BuyerProfile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [followedAgents, setFollowedAgents] = useState([])
  const [savedCount, setSavedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSavedStatus] = useState(false)
  const [editing, setEditing] = useState(false)

  const [fullName, setFullName] = useState('')
  const [searchArea, setSearchArea] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [bedroomsMin, setBedroomsMin] = useState('')
  const [listingType, setListingType] = useState('for_sale')
  const [timeline, setTimeline] = useState('')
  const [preApproved, setPreApproved] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData ? authData.user : null
    if (!currentUser) { router.push('/auth/login'); return }
    setUser(currentUser)

    const { data: userData } = await supabase
      .from('users').select('*').eq('id', currentUser.id).single()

    if (userData) {
      setProfile(userData)
      setFullName(userData.full_name || '')
      setSearchArea(userData.search_area || '')
      setBudgetMin(userData.budget_min || '')
      setBudgetMax(userData.budget_max || '')
      setBedroomsMin(userData.bedrooms_min || '')
      setListingType(userData.listing_type || 'for_sale')
      setTimeline(userData.timeline || '')
      setPreApproved(userData.pre_approved || false)
    }

    const { data: followsData } = await supabase
      .from('follows')
      .select('agent_id, agent_profiles (id, full_name, avatar_url, brokerage, is_fsbo)')
      .eq('follower_id', currentUser.id)
    setFollowedAgents(followsData || [])

    const { count } = await supabase
      .from('saves')
      .select('id', { count: 'exact' })
      .eq('user_id', currentUser.id)
    setSavedCount(count || 0)

    setLoading(false)
  }

  async function handleSavePreferences(e) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from('users').update({
      full_name: fullName,
      search_area: searchArea,
      budget_min: budgetMin ? parseInt(budgetMin) : null,
      budget_max: budgetMax ? parseInt(budgetMax) : null,
      bedrooms_min: bedroomsMin ? parseInt(bedroomsMin) : null,
      listing_type: listingType,
      timeline,
      pre_approved: preApproved,
    }).eq('id', user.id)

    setSaving(false)
    if (!error) {
      setSavedStatus(true)
      setEditing(false)
      setTimeout(() => setSavedStatus(false), 2000)
    }
  }

  async function handleUnfollow(agentId) {
    await supabase.from('follows').delete()
      .eq('follower_id', user.id).eq('agent_id', agentId)
    setFollowedAgents(prev => prev.filter(function(f) { return f.agent_id !== agentId }))
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 text-gray-900 bg-white placeholder-gray-400"

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading profile...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/feed" className="text-gray-400 hover:text-gray-600 text-sm">←</Link>
          <h1 className="text-sm font-medium text-gray-900">My profile</h1>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">

        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-xl font-medium text-gray-600 flex-shrink-0">
            {fullName ? fullName.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-gray-900">{fullName || 'Buyer'}</p>
            <p className="text-sm text-gray-400">{user ? user.email : ''}</p>
            <p className="text-xs text-gray-300 mt-0.5">
              Member since {user ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}
            </p>
          </div>
        </div>

        <form onSubmit={handleSavePreferences} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Search preferences</p>
            {saved && <span className="text-xs text-green-500 font-medium">Saved ✓</span>}
          </div>
          <div className="p-4 flex flex-col gap-3">
            {editing ? (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Full name</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} placeholder="Your name" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Search area</label>
                  <input type="text" value={searchArea} onChange={e => setSearchArea(e.target.value)} className={inputClass} placeholder="Austin, TX" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Budget range</label>
                  <div className="flex gap-2 items-center">
                    <input type="number" value={budgetMin} onChange={e => setBudgetMin(e.target.value)} className={inputClass} placeholder="Min" />
                    <span className="text-gray-400 text-sm">—</span>
                    <input type="number" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} className={inputClass} placeholder="Max" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Bedrooms</label>
                  <select value={bedroomsMin} onChange={e => setBedroomsMin(e.target.value)} className={inputClass}>
                    <option value="">Any</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Listing type</label>
                  <div className="flex gap-2">
                    {['for_sale', 'for_rent'].map(type => (
                      <button key={type} type="button" onClick={() => setListingType(type)}
                        className={'flex-1 py-2 text-sm rounded-lg border transition ' + (listingType === type ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500')}>
                        {type === 'for_sale' ? 'For sale' : 'For rent'}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={saving}
                  className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50 mt-1">
                  {saving ? 'Saving...' : 'Save preferences'}
                </button>
              </>
            ) : (
              <>
                {[
                  { label: 'Search area', value: searchArea || '—' },
                  { label: 'Budget', value: budgetMin && budgetMax ? '$' + parseInt(budgetMin).toLocaleString() + ' – $' + parseInt(budgetMax).toLocaleString() : '—' },
                  { label: 'Bedrooms', value: bedroomsMin ? bedroomsMin + '+' : 'Any' },
                  { label: 'Listing type', value: listingType === 'for_sale' ? 'For sale' : 'For rent' },
                ].map(function(item) {
                  return (
                    <div key={item.label} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-400">{item.label}</span>
                      <span className="text-sm font-medium text-gray-900">{item.value}</span>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </form>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Buyer info</p>
            <p className="text-xs text-gray-300 mt-0.5">Only shared with agents when you contact them</p>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {editing ? (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Purchase timeline</label>
                  <select value={timeline} onChange={e => setTimeline(e.target.value)} className={inputClass}>
                    <option value="">Not specified</option>
                    <option value="browsing">Just browsing</option>
                    <option value="3-6 months">3–6 months</option>
                    <option value="1-3 months">1–3 months</option>
                    <option value="ready">Ready to buy now</option>
                  </select>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={preApproved} onChange={e => setPreApproved(e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-700">I am pre-approved for a mortgage</span>
                </label>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-sm text-gray-400">Timeline</span>
                  <span className="text-sm font-medium text-gray-900">{timeline || 'Not specified'}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-400">Pre-approval</span>
                  <span className={'text-sm font-medium ' + (preApproved ? 'text-green-600' : 'text-gray-400')}>
                    {preApproved ? 'Yes ✓' : 'No'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Followed agents</p>
          </div>
          {followedAgents.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-400">No followed agents yet</p>
              <p className="text-xs text-gray-300 mt-1">Follow agents from their listings to see their new properties first</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {followedAgents.map(function(follow) {
                const agent = follow.agent_profiles
                if (!agent) return null
                const agentName = agent.full_name || 'Agent'
                const agentBrokerage = agent.is_fsbo ? 'For Sale By Owner' : (agent.brokerage || '')
                return (
                  <div key={follow.agent_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500 flex-shrink-0 overflow-hidden">
                      {agent.avatar_url ? <img src={agent.avatar_url} alt="" className="w-full h-full object-cover" /> : agentName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{agentName}</p>
                      <p className="text-xs text-gray-400">{agentBrokerage}</p>
                    </div>
                    <button onClick={() => handleUnfollow(follow.agent_id)}
                      className="text-xs text-gray-400 border border-gray-200 px-2.5 py-1 rounded-full hover:bg-gray-50 transition">
                      Unfollow
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <Link href="/saved" className="flex items-center justify-between px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition">
            <span className="text-sm text-gray-700">Saved homes</span>
            <span className="text-sm text-blue-500 font-medium">{savedCount} listings →</span>
          </Link>
          <button onClick={handleSignOut} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
            <span className="text-sm text-red-500">Sign out</span>
          </button>
        </div>

      </div>
    </div>
  )
}