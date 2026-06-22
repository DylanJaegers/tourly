'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function SidebarNav({ onSearchClick, onFilterClick, activeTab }) {
  const [user, setUser] = useState(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(function(res) {
      setUser(res.data ? res.data.user : null)
    })
  }, [])

  const isForYou = pathname === '/feed'
  const isMap = pathname === '/map'
  const isSaved = pathname === '/saved'

  return (
    <div className="hidden md:flex flex-col w-52 bg-zinc-950 border-r border-zinc-800 flex-shrink-0 h-screen">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-black text-xs font-bold">T</span>
        </div>
        <span className="text-white text-base font-semibold">Tourly</span>
      </div>

      <div className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        <button onClick={() => { if (onSearchClick) onSearchClick(); else router.push('/feed') }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition w-full text-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          Search
        </button>
        <button onClick={() => router.push('/feed')}
          className={'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition w-full text-left ' + (isForYou ? 'bg-white text-black font-semibold' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          For You
        </button>
        <button onClick={() => router.push('/map')}
          className={'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition w-full text-left ' + (isMap ? 'bg-white text-black font-semibold' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
          Map view
        </button>
        <button onClick={() => router.push('/saved')}
          className={'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition w-full text-left ' + (isSaved ? 'bg-white text-black font-semibold' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          Saved
        </button>
        <button onClick={() => router.push(user ? '/profile' : '/auth/login')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition w-full text-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profile
        </button>
        {onFilterClick && (
          <>
            <div className="my-2 border-t border-zinc-800"></div>
            <button onClick={onFilterClick}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition w-full text-left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              Filters
            </button>
          </>
        )}
      </div>

      <div className="px-3 py-4 border-t border-zinc-800">
        {!user ? (
          <div className="flex flex-col gap-2">
            <Link href="/auth/login" className="w-full border border-zinc-600 text-zinc-300 text-sm py-2 rounded-xl text-center hover:bg-zinc-800 hover:text-white transition">Sign in</Link>
            <Link href="/auth/signup" className="w-full bg-white text-black text-sm font-medium py-2 rounded-xl text-center hover:bg-zinc-100 transition">Sign up free</Link>
          </div>
        ) : (
          <button onClick={() => router.push('/profile')} className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl hover:bg-zinc-800 transition">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 text-left">
              <p className="text-white text-xs font-medium truncate">{user.email}</p>
              <p className="text-zinc-500 text-xs">My profile</p>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}