'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AgentDashboard() {
  const [agent, setAgent] = useState(null)
  const [listings, setListings] = useState([])
  const [stats, setStats] = useState({ active: 0, pending: 0, leads: 0, saves: 0, views: 0 })
  const [activeTab, setActiveTab] = useState('active')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
    const { data: agentData } = await supabase.from('agents').select('*').eq('id', user.id).single()
    setAgent({ ...userData, ...agentData })
    const { data: listingsData } = await supabase
      .from('listings')
      .select('*, listing_photos (url, position), leads (id), saves (id)')
      .eq('agent_id', user.id)
      .order('created_at', { ascending: false })
    if (listingsData) {
      setListings(listingsData)
      setStats({
        active: listingsData.filter(l => l.status === 'active').length,
        pending: listingsData.filter(l => l.status === 'pending').length,
        leads: listingsData.reduce((sum, l) => sum + (l.leads?.length || 0), 0),
        saves: listingsData.reduce((sum, l) => sum + (l.saves?.length || 0), 0),
        views: listingsData.reduce((sum, l) => sum + (l.view_count || 0), 0),
      })
    }
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const filteredListings = listings.filter(l => l.status === activeTab)
  const getCoverPhoto = (l) => l.cover_photo_url || l.listing_photos?.sort((a,b) => a.position - b.position)[0]?.url || null
  const formatPrice = (p) => p >= 1000000 ? `$${(p/1000000).toFixed(1)}M` : p >= 1000 ? `$${(p/1000).toFixed(0)}K` : `$${p}`

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-medium">
            {agent?.full_name?.charAt(0) || 'A'}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{agent?.full_name}</p>
            <p className="text-xs text-gray-400">{agent?.is_fsbo ? 'For Sale By Owner' : agent?.brokerage || 'Agent'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/agent/upload" className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-700 transition">
            + New listing
          </Link>
          <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-gray-600 transition">
            Sign out
          </button>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Active', value: stats.active },
            { label: 'Pending', value: stats.pending },
            { label: 'Leads', value: stats.leads },
            { label: 'Saves', value: stats.saves },
            { label: 'Views', value: stats.views },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <p className="text-lg font-medium text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {['active', 'pending', 'sold', 'draft'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-xs font-medium capitalize transition ${
                  activeTab === tab ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}>
                {tab} ({listings.filter(l => l.status === tab).length})
              </button>
            ))}
          </div>
          {filteredListings.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400 mb-3">No {activeTab} listings yet</p>
              {activeTab === 'active' && (
                <Link href="/agent/upload" className="text-sm text-gray-900 font-medium border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition">
                  Upload your first listing
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredListings.map(listing => (
                <div key={listing.id} className="flex items-center gap-3 p-3">
                  <div className="w-14 h-11 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                    {getCoverPhoto(listing) ? (
                      <img src={getCoverPhoto(listing)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-300 text-lg">🏠</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatPrice(listing.price)} · {listing.address.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {listing.view_count || 0} views · {listing.leads?.length || 0} leads · {listing.saves?.length || 0} saves
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${
                      listing.status === 'active' ? 'bg-green-400' :
                      listing.status === 'pending' ? 'bg-amber-400' : 'bg-gray-300'
                    }`}></div>
                    <Link href={`/agent/listing/${listing.id}/stats`}
                      className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2 py-1 transition">
                      ···
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {!agent?.is_verified && (
          <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-800">Account pending verification</p>
            <p className="text-xs text-amber-600 mt-1">
              Your account is being reviewed. You can upload listings now — they will go live once verified.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}