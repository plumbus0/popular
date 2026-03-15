'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Avatar, CoverImage } from '@/components/ui/Image'
import type { Profile, Friendship, Event } from '@/types'

import Sidebar from '@/components/layout/Sidebar'

export default function UserProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [me, setMe] = useState<Profile | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [friendship, setFriendship] = useState<Friendship | null>(null)
  const [sharedEvents, setSharedEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      if (user.id === id) { router.push('/profile'); return }

      const { data: myP } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (myP) setMe(myP as Profile)

      const { data: p } = await supabase.from('profiles').select('*').eq('id', id as string).single()
      if (p) setProfile(p as Profile)

      // Check friendship
      const { data: fs } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`)
        .maybeSingle()
      if (fs) setFriendship(fs as Friendship)

      // Show events if friends and they allow it
      if (fs?.status === 'accepted' && p?.show_events_to_friends) {
        const { data: regs } = await supabase
          .from('event_registrations')
          .select('event:events(*, society:societies(*))')
          .eq('user_id', id as string)
          .limit(6)
          // @ts-ignore
        if (regs) setSharedEvents(regs.map((r: { event: Event }) => r.event).filter(Boolean))
      }

      setLoading(false)
    }
    fetchData()
  }, [id])

  const sendRequest = async () => {
    if (!me || !profile) return
    setActioning(true)
    await supabase.from('friendships').insert({ requester_id: me.id, addressee_id: profile.id })
    const { data: fs } = await supabase.from('friendships').select('*')
      .eq('requester_id', me.id).eq('addressee_id', profile.id).single()
    if (fs) setFriendship(fs as Friendship)
    setActioning(false)
  }

  const respond = async (status: 'accepted' | 'rejected') => {
    if (!friendship) return
    setActioning(true)
    await supabase.from('friendships').update({ status }).eq('id', friendship.id)
    setFriendship(prev => prev ? { ...prev, status } : null)
    setActioning(false)
  }

  const removeFriend = async () => {
    if (!friendship) return
    setActioning(true)
    await supabase.from('friendships').delete().eq('id', friendship.id)
    setFriendship(null)
    setActioning(false)
  }

  const isFriend = friendship?.status === 'accepted'
  const isPending = friendship?.status === 'pending'
  const isIncoming = isPending && friendship?.addressee_id === me?.id

  if (loading) return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar />
      <div style={{ marginLeft:64, flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--color-muted)' }}>Loading...</div>
    </div>
  )
  if (!profile) return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar />
      <div style={{ marginLeft:64, flex:1, padding:40 }}>User not found.</div>
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar />
      <main style={{ marginLeft:64, flex:1, background:'var(--color-bg)', padding:'32px 24px 60px' }}>
        <div style={{ maxWidth:680, margin:'0 auto' }}>
          <Link href="/friends" style={{ color:'var(--color-muted)', textDecoration:'none', fontSize:'0.85rem' }}>← Back to Friends</Link>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:20, margin:'24px 0 28px' }}>
            <Avatar src={profile.avatar_url} name={profile.full_name || profile.email} size={64} />
            <div style={{ flex:1 }}>
              <h1 style={{ fontWeight:700, fontSize:'1.6rem', margin:'0 0 4px' }}>{profile.full_name || 'Unknown'}</h1>
              <div style={{ color:'var(--color-muted)', fontSize:'0.9rem' }}>{profile.university}{profile.degree ? ` · ${profile.degree}` : ''}</div>
            </div>
            <div>
              {!friendship && (
                <button onClick={sendRequest} disabled={actioning}
                  style={{ padding:'10px 24px', background:'var(--color-accent-blue)', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:'0.875rem', cursor:'pointer', fontFamily:'var(--font-haas)' }}>
                  {actioning ? '...' : 'Add Friend'}
                </button>
              )}
              {isPending && isIncoming && (
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => respond('accepted')} disabled={actioning}
                    style={{ padding:'10px 20px', background:'var(--color-accent-blue)', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:'0.875rem', cursor:'pointer', fontFamily:'var(--font-haas)' }}>
                    Accept
                  </button>
                  <button onClick={() => respond('rejected')} disabled={actioning}
                    style={{ padding:'10px 20px', background:'none', border:'1.5px solid #ddd', borderRadius:8, fontWeight:600, fontSize:'0.875rem', cursor:'pointer', fontFamily:'var(--font-haas)', color:'var(--color-muted)' }}>
                    Decline
                  </button>
                </div>
              )}
              {isPending && !isIncoming && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:'var(--color-muted)', fontSize:'0.875rem' }}>Request sent</span>
                  <button onClick={removeFriend} style={{ padding:'6px 12px', background:'none', border:'1px solid #ddd', borderRadius:6, fontSize:'0.8rem', cursor:'pointer', color:'#999', fontFamily:'var(--font-haas)' }}>Cancel</button>
                </div>
              )}
              {isFriend && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:'#22C55E', fontWeight:600, fontSize:'0.875rem' }}>✓ Friends</span>
                  <button onClick={removeFriend} style={{ padding:'6px 12px', background:'none', border:'1px solid #ddd', borderRadius:6, fontSize:'0.8rem', cursor:'pointer', color:'#999', fontFamily:'var(--font-haas)' }}>Remove</button>
                </div>
              )}
            </div>
          </div>

          {/* Info card */}
          <div style={{ background:'white', borderRadius:12, padding:'24px 28px', boxShadow:'var(--shadow-card)', marginBottom:24 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px 32px' }}>
              <InfoRow label="University" value={profile.university} />
              <InfoRow label="Stage" value={profile.stage} />
              <InfoRow label="Degree" value={profile.degree} />
              <InfoRow label="Member since" value={profile.created_at ? new Date(profile.created_at).getFullYear().toString() : undefined} />
            </div>
          </div>

          {/* Shared events */}
          {isFriend && profile.show_events_to_friends && sharedEvents.length > 0 && (
            <section>
              <h2 className="section-title" style={{ marginBottom:20 }}>Events {profile.full_name?.split(' ')[0]} is going to</h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginTop:20 }}>
                {sharedEvents.map(ev => (
                  <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration:'none', color:'inherit' }}>
                    <div className="event-card">
                      <CoverImage src={ev.cover_url} height={80} fallback="event" />
                      <div style={{ padding:'8px 10px' }}>
                        <div style={{ fontWeight:600, fontSize:'0.8rem', lineHeight:1.3 }}>{ev.title.length > 28 ? ev.title.slice(0,28)+'…' : ev.title}</div>
                        <div style={{ fontSize:'0.7rem', color:'var(--color-muted)' }}>{ev.date}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {isFriend && !profile.show_events_to_friends && (
            <div style={{ background:'white', borderRadius:12, padding:'24px', textAlign:'center', color:'var(--color-muted)', boxShadow:'var(--shadow-card)' }}>
              {profile.full_name?.split(' ')[0]} keeps their events private.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div style={{ fontSize:'0.78rem', color:'var(--color-muted)', marginBottom:3 }}>{label}</div>
      <div style={{ fontWeight:700, fontSize:'0.9rem' }}>{value || '—'}</div>
    </div>
  )
}
