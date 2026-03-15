'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Avatar } from '@/components/ui/Image'

export default function Sidebar() {
  const path = usePathname()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string>('')
  const active = (href: string) => path === href || (href !== '/dashboard' && path.startsWith(href))

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      // Try profile row first, fall back to Google OAuth metadata
      supabase.from('profiles').select('avatar_url, full_name').eq('id', user.id).single()
        .then(({ data }) => {
          const av = data?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null
          const name = data?.full_name || user.user_metadata?.full_name || user.email || ''
          setAvatarUrl(av)
          setDisplayName(name)
        })
    })
  }, [])

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 64, background: 'white',
      borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '16px 0', gap: 8, zIndex: 100
    }}>
      <Link href="/dashboard" style={{ marginBottom: 16, textDecoration: 'none' }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}><img src="/logo-placeholder.svg" alt="Popular" style={{ width:22, height:22, objectFit:"contain" }} /></div>
      </Link>

      <NavLink href="/dashboard" active={active('/dashboard')} title="Home">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      </NavLink>

      <NavLink href="/societies" active={active('/societies')} title="Societies">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      </NavLink>

      <NavLink href="/events" active={active('/events')} title="Events">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </NavLink>

      <NavLink href="/friends" active={active('/friends')} title="Friends">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      </NavLink>

      <NavLink href="/profile" active={active('/profile')} title="Profile">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </NavLink>

      <div style={{ flex: 1 }} />

      {/* Google avatar synced */}
      <Link href="/profile" style={{ textDecoration: 'none', marginBottom: 8 }}>
        <Avatar
          src={avatarUrl}
          name={displayName}
          size={30}
          color="#4A3FA0"
        />
      </Link>
    </aside>
  )
}

function NavLink({ href, active, title, children }: {
  href: string; active: boolean; title: string; children: React.ReactNode
}) {
  return (
    <Link href={href} className={`sidebar-link${active ? ' active' : ''}`} title={title}>
      {children}
    </Link>
  )
}
