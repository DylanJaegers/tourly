'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LeadInbox() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedLead, setSelectedLead] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadLeads()
  }, [])

  async function loadLeads() {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData ? authData.user : null
    if (!user) { router.push('/auth/login'); return }

    const { data: leadsData } = await supabase
      .from('leads')
      .select('*, listings (address, city, state, price, cover_photo_url)')
      .eq('agent_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    setLeads(leadsData || [])
    setLoading(false)
  }

  async function markRead(leadId) {
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

  const getFilteredLeads = () => {
    if (activeTab === 'unread') return leads.filter(function(l) { return !l.is_read })
    if (activeTab === 'contacted') return leads.filter(function(l) { return l.is_read })
    return leads
  }

  const unreadCount = leads.filter(function(l) { return !l.is_read }).length
  const filteredLeads = getFilteredLeads()

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading leads...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/agent/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">←</Link>
        <h1 className="text-sm font-medium text-gray-900 flex-1">Lead inbox</h1>
        {unreadCount > 0 && (
          <span className="bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            {unreadCount} new
          </span>
        )}
      </div>

      <div className="flex border-b border-gray-100 bg-white">
        {[
          { key: 'all', label: 'All (' + leads.length + ')' },
          { key: 'unread', label: 'Unread (' + unreadCount + ')' },
          { key: 'contacted', label: 'Contacted' },
        ].map(function(tab) {
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelectedLead(null) }}
              className={'flex-1 py-3 text-xs font-medium transition ' + (activeTab === tab.key ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400 hover:text-gray-600')}>
              {tab.label}
            </button>
          )
        })}
      </div>

      {selectedLead ? (
        <div className="px-4 py-4 max-w-lg mx-auto">
          <button onClick={() => setSelectedLead(null)} className="text-sm text-gray-400 mb-4 flex items-center gap-1">
            ← All leads
          </button>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {selectedLead.listings && (
              <Link href={'/listing/' + selectedLead.listing_id}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition">
                <div className="w-12 h-9 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {selectedLead.listings.cover_photo_url ? (
                    <img src={selectedLead.listings.cover_photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">🏠</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {selectedLead.listings.address}, {selectedLead.listings.city}
                  </p>
                  <p className="text-xs text-gray-400">
                    ${(selectedLead.listings.price || 0).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs text-gray-300">View →</span>
              </Link>
            )}

            <div className="px-4 py-4 flex flex-col gap-3">
              <div>
                <p className="text-base font-medium text-gray-900">{selectedLead.buyer_name}</p>
                <p className="text-sm text-gray-400">{selectedLead.buyer_email}</p>
                {selectedLead.buyer_phone && (
                  <p className="text-sm text-gray-400">{selectedLead.buyer_phone}</p>
                )}
                <p className="text-xs text-gray-300 mt-1">
                  {new Date(selectedLead.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {selectedLead.pre_approved && (
                  <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                    Pre-approved
                  </span>
                )}
                {selectedLead.timeline && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                    {selectedLead.timeline}
                  </span>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm text-gray-700 leading-relaxed">{selectedLead.message}</p>
              </div>

              <div className="flex gap-2 pt-1">
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
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="py-20 text-center px-4">
          <p className="text-sm text-gray-400 mb-2">
            {activeTab === 'unread' ? 'No unread leads' : activeTab === 'contacted' ? 'No contacted leads yet' : 'No leads yet'}
          </p>
          <p className="text-xs text-gray-300">
            {activeTab === 'all' ? 'Leads appear here when buyers contact you through your listings' : ''}
          </p>
        </div>
      ) : (
        <div className="max-w-lg mx-auto">
          <div className="divide-y divide-gray-50 bg-white mt-2 mx-4 rounded-xl border border-gray-100 overflow-hidden">
            {filteredLeads.map(function(lead) {
              return (
                <button key={lead.id}
                  onClick={() => { setSelectedLead(lead); markRead(lead.id) }}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition">
                  <div className={'w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ' + (lead.is_read ? 'bg-gray-200' : 'bg-blue-400')}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={'text-sm font-medium ' + (lead.is_read ? 'text-gray-700' : 'text-gray-900')}>
                        {lead.buyer_name}
                      </p>
                      <p className="text-xs text-gray-300 flex-shrink-0">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {lead.listings && (
                      <p className="text-xs text-blue-400 mt-0.5 truncate">
                        Re: {lead.listings.address}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 truncate mt-0.5">{lead.message}</p>
                    <div className="flex gap-2 mt-1.5">
                      {lead.pre_approved && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Pre-approved
                        </span>
                      )}
                      {lead.timeline && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {lead.timeline}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="h-8"></div>
        </div>
      )}
    </div>
  )
}