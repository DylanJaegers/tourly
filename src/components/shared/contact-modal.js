'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ContactModal({ listing, agent, user, onClose }) {
  const [name, setName] = useState(user?.user_metadata?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: userData } = await supabase
      .from('users')
      .select('pre_approved, timeline')
      .eq('id', user.id)
      .single()

    const { error: leadError } = await supabase.from('leads').insert({
      listing_id: listing.id,
      agent_id: listing.agent_id,
      buyer_id: user.id,
      buyer_name: name,
      buyer_email: email,
      buyer_phone: phone || null,
      message,
      pre_approved: userData?.pre_approved || false,
      timeline: userData?.timeline || null,
    })

    if (leadError) {
      setError(leadError.message)
      setLoading(false)
      return
    }

    await supabase.from('listings')
      .update({ lead_count: (listing.lead_count || 0) + 1 })
      .eq('id', listing.id)

    setLoading(false)
    setSent(true)
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 text-gray-900 bg-white placeholder-gray-400"

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-screen overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1"></div>

        {sent ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-500 text-xl">✓</span>
            </div>
            <p className="text-base font-medium text-gray-900 mb-2">Message sent!</p>
            <p className="text-sm text-gray-500 mb-6">
              {agent?.full_name} will receive your message and contact you via email shortly.
            </p>
            <div className="bg-gray-50 rounded-xl p-3 mb-6 text-left">
              <p className="text-xs text-gray-400 mb-1">You contacted</p>
              <p className="text-sm font-medium text-gray-900">{agent?.full_name}</p>
              <p className="text-xs text-gray-500">Re: {listing.address}</p>
            </div>
            <button onClick={onClose} className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium">
              Back to listing
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
            <div className="mb-2">
              <p className="text-base font-medium text-gray-900">Contact {agent?.full_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Re: {listing.address} · {listing.price?.toLocaleString() ? '$' + listing.price.toLocaleString() : ''}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Your name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputClass} placeholder="Alex Johnson" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Email <span className="text-gray-400 font-normal">(pre-filled)</span></label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
            </div>

            {agent?.phone_contact_allowed && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="(512) 555-0192" />
              </div>
            )}

            {!agent?.phone_contact_allowed && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex gap-2">
                <span>📧</span>
                <span>This agent prefers email contact only. Your message will be sent to their inbox.</span>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                className={inputClass}
                rows={3}
                placeholder="Hi, I'm interested in this property and would love to schedule a showing..."
              />
            </div>

            <p className="text-xs text-gray-400">Your pre-approval status and purchase timeline will be shared with the agent.</p>

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50 mt-1"
            >
              {loading ? 'Sending...' : 'Send message'}
            </button>
            <button type="button" onClick={onClose} className="w-full text-gray-400 text-sm py-2">
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  )
}