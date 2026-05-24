'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function ListingStats() {
  const [listing, setListing] = useState(null)
  const [leads, setLeads] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('kpis')
  const [chartRange, setChartRange] = useState('7d')
  const [selectedLead, setSelectedLead] = useState(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    loadStats()
  }, [params.id])

  async function loadStats() {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData ? authData.user : null
    if (!user) { router.push('/auth/login'); return }

    const { data: listingData } = await supabase
      .from('listings')
      .select('*')
      .eq('id', params.id)
      .eq('agent_id', user.id)
      .single()

    if (!listingData) { router.push('/agent/dashboard'); return }
    setListing(listingData)

    const { data: leadsData } = await supabase
      .from('leads')
      .select('*')
      .eq('listing_id', params.id)
      .order('created_at', { ascending: false })
    setLeads(leadsData || [])

    const { data: videosData } = await supabase
      .from('listing_videos')
      .select('*')
      .eq('listing_id', params.id)
    setVideos(videosData || [])

    setLoading(false)
  }

  async function markLeadRead(leadId) {
    await supabase.from('leads').update({ is_read: true }).eq('id', leadId)
    setLeads(prev => prev.map(function(l) {
      return l.id === leadId ? { ...l, is_read: true } : l
    }))
  }

  async function archiveLead(leadId) {
    await supabase.from('leads').update({ is_archived: true }).eq('id', leadId)
    setLeads(prev => prev.filter(function(l) { return l.id !== leadId }))
    setSelectedLead(null)
  }

  async function handleMarkSold() {
    if (!confirm('Mark this listing as sold?')) return
    await supabase.from('listings').update({ status: 'sold' }).eq('id', params.id)
    setListing(prev => ({ ...prev, status: 'sold' }))
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) return
    await supabase.from('listings').delete().eq('id', params.id)
    router.push('/agent/dashboard')
  }

  const formatPrice = (p) => '$' + (p || 0).toLocaleString()
  const leadRate = listing && listing.view_count > 0
    ? ((leads.length / listing.view_count) * 100).toFixed(1) + '%'
    : '0%'

  const shortFormVideo = videos.find(function(v) { return v.video_type === 'short_form' })
  const longFormVideo = videos.find(function(v) { return v.video_type === 'long_form' })

  const daysListed = listing
    ? Math.floor((Date.now() - new Date(listing.created_at)) / 86400000)
    : 0

  const getChartBars = () => {
    const count = chartRange === '7d' ? 7 : chartRange === '30d' ? 30 : 12
    const labels = []
    const values = []
    for (let i = count - 1; i >= 0; i--) {
      if (chartRange === '7d') {
        const d = new Date()
        d.setDate(d.getDate() - i)
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }))
      } else if (chartRange === '30d') {
        labels.push(i === 0 ? 'Today' : i + 'd')
      } else {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        labels.push(d.toLocaleDateString('en-US', { month: 'short' }))
      }
      values.push(Math.floor(Math.random() * 80) + 10)
    }
    return { labels, values }
  }

  const chartData = getChartBars()
  const maxVal = Math.max(...chartData.values)

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading stats...</p>
    </div>
  )

  if (!listing) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/agent/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">←</Link>
        <p className="text-sm font-medium text-gray-900 flex-1">Listing performance</p>
        <Link href={'/agent/upload?edit=' + params.id} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
          Edit
        </Link>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-14 h-11 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
          {listing.cover_photo_url ? (
            <img src={listing.cover_photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl">🏠</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{formatPrice(listing.price)}</p>
          <p className="text-xs text-gray-400 truncate">{listing.address}, {listing.city} {listing.state}</p>
          <p className="text-xs text-gray-300 mt-0.5">{listing.bedrooms} bed · {listing.bathrooms} bath · {(listing.sqft || 0).toLocaleString()} sqft</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className={'w-2 h-2 rounded-full ' + (listing.status === 'active' ? 'bg-green-400' : listing.status === 'pending' ? 'bg-amber-400' : 'bg-gray-300')}></div>
          <span className="text-xs text-gray-500 capitalize">{listing.status}</span>
        </div>
      </div>

      <div className="flex border-b border-gray-100 bg-white">
        {['kpis', 'leads', 'edit'].map(function(tab) {
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={'flex-1 py-3 text-xs font-medium capitalize transition ' + (activeTab === tab ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400 hover:text-gray-600')}>
              {tab === 'leads' ? 'Leads (' + leads.length + ')' : tab === 'edit' ? 'Edit listing' : 'KPIs'}
            </button>
          )
        })}
      </div>

      {activeTab === 'kpis' && (
        <div className="px-4 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total views', value: listing.view_count || 0, delta: '+12 this week' },
              { label: 'Saves', value: listing.save_count || 0, delta: '+3 this week' },
              { label: 'Leads', value: leads.length, delta: '+' + leads.filter(function(l) { return !l.is_read }).length + ' unread' },
              { label: 'Lead rate', value: leadRate, delta: 'views to leads' },
              { label: 'Days listed', value: daysListed, delta: 'since upload' },
              shortFormVideo ? { label: 'Avg watch', value: (shortFormVideo.avg_watch_seconds || 0) + 's', delta: 'short-form' } : null,
            ].filter(Boolean).map(function(stat) {
              return (
                <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                  <p className="text-lg font-medium text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                  <p className="text-xs text-gray-300 mt-0.5">{stat.delta}</p>
                </div>
              )
            })}
          </div>

          {longFormVideo && (
            <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <p className="text-lg font-medium text-gray-900">{longFormVideo.avg_watch_seconds || 0}s</p>
              <p className="text-xs text-gray-400 mt-0.5">Avg watch — long-form tour</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Views</p>
              <div className="flex gap-1">
                {['7d', '30d', 'all'].map(function(range) {
                  return (
                    <button key={range} onClick={() => setChartRange(range)}
                      className={'px-2.5 py-1 text-xs rounded-lg transition ' + (chartRange === range ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500')}>
                      {range}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex items-end gap-1 h-20">
              {chartData.values.map(function(val, i) {
                const height = maxVal > 0 ? (val / maxVal) * 100 : 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-sm transition-all" style={{ height: height + '%', background: height > 70 ? '#1a1a1a' : '#e5e7eb', minHeight: '4px' }}></div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-1 mt-1">
              {chartData.labels.map(function(label, i) {
                return (
                  <div key={i} className="flex-1 text-center text-xs text-gray-300" style={{ fontSize: '9px' }}>{label}</div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Recent leads</p>
            {leads.slice(0, 3).map(function(lead) {
              return (
                <button key={lead.id} onClick={() => { setSelectedLead(lead); setActiveTab('leads'); markLeadRead(lead.id) }}
                  className="bg-white rounded-xl border border-gray-100 p-3 flex items-start gap-3 text-left hover:bg-gray-50 transition">
                  <div className={'w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ' + (lead.is_read ? 'bg-gray-200' : 'bg-blue-400')}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{lead.buyer_name}</p>
                    <p className="text-xs text-gray-400 truncate">{lead.message}</p>
                    <div className="flex gap-2 mt-1">
                      {lead.pre_approved && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Pre-approved</span>}
                      {lead.timeline && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{lead.timeline}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-300 flex-shrink-0">{new Date(lead.created_at).toLocaleDateString()}</span>
                </button>
              )
            })}
            {leads.length > 3 && (
              <button onClick={() => setActiveTab('leads')} className="text-xs text-gray-500 text-center py-2">
                View all {leads.length} leads →
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <Link href={'/listing/' + params.id}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-xs text-center font-medium hover:bg-gray-50 transition">
              Preview listing
            </Link>
            <button onClick={handleMarkSold}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-xs font-medium hover:bg-gray-50 transition">
              Mark sold
            </button>
            <button onClick={handleDelete}
              className="flex-1 border border-red-200 text-red-500 rounded-xl py-2.5 text-xs font-medium hover:bg-red-50 transition">
              Delete
            </button>
          </div>
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="flex flex-col">
          {leads.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">No leads yet for this listing</p>
            </div>
          ) : selectedLead ? (
            <div className="px-4 py-4">
              <button onClick={() => setSelectedLead(null)} className="text-sm text-gray-400 mb-4 flex items-center gap-1">← All leads</button>
              <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-3">
                <div>
                  <p className="text-base font-medium text-gray-900">{selectedLead.buyer_name}</p>
                  <p className="text-sm text-gray-400">{selectedLead.buyer_email}</p>
                  {selectedLead.buyer_phone && <p className="text-sm text-gray-400">{selectedLead.buyer_phone}</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {selectedLead.pre_approved && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Pre-approved</span>}
                  {selectedLead.timeline && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{selectedLead.timeline}</span>}
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedLead.message}</p>
                </div>
                <p className="text-xs text-gray-300">{new Date(selectedLead.created_at).toLocaleString()}</p>
                <div className="flex gap-2 pt-2">
                  <a href={'mailto:' + selectedLead.buyer_email}
                    className="flex-1 bg-gray-900 text-white rounded-xl py-3 text-sm font-medium text-center hover:bg-gray-700 transition">
                    Reply via email
                  </a>
                  {selectedLead.buyer_phone && (
                    <a href={'tel:' + selectedLead.buyer_phone}
                      className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-3 text-sm text-center font-medium hover:bg-gray-50 transition">
                      Call
                    </a>
                  )}
                </div>
                <button onClick={() => archiveLead(selectedLead.id)}
                  className="w-full border border-gray-200 text-gray-400 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition">
                  Archive lead
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 bg-white mt-2 mx-4 rounded-xl border border-gray-100 overflow-hidden">
              {leads.map(function(lead) {
                return (
                  <button key={lead.id} onClick={() => { setSelectedLead(lead); markLeadRead(lead.id) }}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition">
                    <div className={'w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ' + (lead.is_read ? 'bg-gray-200' : 'bg-blue-400')}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{lead.buyer_name}</p>
                        <p className="text-xs text-gray-300">{new Date(lead.created_at).toLocaleDateString()}</p>
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{lead.message}</p>
                      <div className="flex gap-2 mt-1.5">
                        {lead.pre_approved && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Pre-approved</span>}
                        {lead.timeline && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{lead.timeline}</span>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'edit' && (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-400 mb-4">Edit your listing details, photos, or videos</p>
          <Link href={'/agent/upload?edit=' + params.id}
            className="bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl hover:bg-gray-700 transition">
            Open listing editor →
          </Link>
        </div>
      )}
    </div>
  )
}