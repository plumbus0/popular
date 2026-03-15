'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CoverImage, Avatar } from '@/components/ui/Image'
import type { Event, Profile } from '@/types'

export default function EventDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [event, setEvent] = useState<Event | null>(null)
  const [similarEvents, setSimilarEvents] = useState<Event[]>([])
  const [isRegistered, setIsRegistered] = useState(false)
  const [friendsGoing, setFriendsGoing] = useState<Profile[]>([])
  const [totalGoing, setTotalGoing] = useState(0)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    async function fetchEvent() {
      try {
        const { data: ev } = await supabase
          .from('events').select('*, society:societies(*)')
          .eq('id', id).single()
        if (ev) {
          setEvent(ev)

          const { data: similar } = await supabase
            .from('events').select('*, society:societies(*)')
            .eq('society_id', ev.society_id).neq('id', id).limit(4)
          if (similar) setSimilarEvents(similar)
        }

        // Live count of registrations — accurate, not stale registered_count column
        const { count } = await supabase
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', id as string)
        setTotalGoing(count ?? 0)

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Check if current user is registered
          const { data: reg } = await supabase
            .from('event_registrations').select('id')
            .eq('user_id', user.id).eq('event_id', id as string).maybeSingle()
          if (reg) setIsRegistered(true)

          // Friends going — two-step (no FK hints)
          const { data: fs } = await supabase
            .from('friendships').select('requester_id, addressee_id')
            .eq('status', 'accepted')
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          const friendIds = (fs ?? []).map(f =>
            f.requester_id === user.id ? f.addressee_id : f.requester_id
          )
          if (friendIds.length > 0) {
            const { data: goingRegs } = await supabase
              .from('event_registrations').select('user_id')
              .eq('event_id', id as string).in('user_id', friendIds)
            const goingIds = (goingRegs ?? []).map(r => r.user_id)
            if (goingIds.length > 0) {
              const { data: friendProfiles } = await supabase
                .from('profiles').select('*')
                .in('id', goingIds)
                .eq('show_events_to_friends', true)
              setFriendsGoing((friendProfiles ?? []) as Profile[])
            }
          }
        }
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [id])

  const handleJoin = async (ticketType: 'arc' | 'non_arc' = 'non_arc') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    if (isRegistered) {
      // Leave event — no checkout needed
      setJoining(true)
      await supabase.from('event_registrations').delete()
        .eq('user_id', user.id).eq('event_id', id as string)
      setIsRegistered(false)
      setTotalGoing(n => Math.max(0, n - 1))
      setJoining(false)
      return
    }

    // Always go through checkout — free events collect details, paid collect payment too
    router.push(`/events/${id}/checkout?ticket=${ticketType}`)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-muted)' }}>
      Loading...
    </div>
  )
  if (!event) return <div style={{ padding: 40 }}>Event not found.</div>

  const isFree = Number(event.arc_member_price) === 0 && Number(event.non_arc_member_price) === 0

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 60px' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: 8 }}>Event</div>
      <h1 style={{ fontWeight: 700, fontSize: '2rem', margin: '0 0 24px' }}>{event.title}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32 }}>
        {/* LEFT */}
        <div>
          <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            <CoverImage src={event.cover_url} height={340} fallback="event" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <Avatar src={event.society?.logo_url} name={event.society?.short_name} size={36} color="#4A3FA0" />
            <Link href={`/societies/${event.society_id}`} style={{ fontWeight: 600, textDecoration: 'none', color: 'inherit' }}>
              {event.society?.name}
            </Link>
            {event.category && (
              <span style={{
                marginLeft: 'auto', background: 'var(--color-yellow)', color: 'var(--color-navy)',
                padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700
              }}>
                {event.category}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
            <div>
              <SectionLabel>About</SectionLabel>
              <p style={{ fontSize: '0.875rem', color: '#333', lineHeight: 1.6, margin: 0 }}>
                {event.description || 'No description provided.'}
              </p>
              {event.created_at && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: 8 }}>
                  Posted {new Date(event.created_at).toLocaleDateString('en-AU')}
                </p>
              )}
            </div>
            <div>
              <SectionLabel icon={<ClockIcon />}>Date and Time</SectionLabel>
              <div style={{ fontSize: '0.875rem', color: '#333', lineHeight: 2.2 }}>
                <div>{event.date}</div>
                {event.start_time && <div>Starts at {event.start_time}</div>}
                {event.end_time && <div>Ends at {event.end_time}</div>}
              </div>
            </div>
            <div>
              <SectionLabel icon={<PinIcon />}>Location</SectionLabel>
              <p style={{ fontSize: '0.875rem', color: '#333', lineHeight: 1.6, margin: 0 }}>
                {event.location || 'TBA'}
              </p>
            </div>
          </div>

          {/* Similar */}
          <div>
            <h2 className="section-title" style={{ marginBottom: 20 }}>
              <span style={{ color: 'var(--color-yellow)' }}>Similar Events</span> ({similarEvents.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 24 }}>
              {similarEvents.map(ev => (
                <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="event-card">
                    <CoverImage src={ev.cover_url} height={90} fallback="event" />
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{ev.title.length > 22 ? ev.title.slice(0, 22) + '…' : ev.title}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>{ev.date}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ textAlign: 'right', marginTop: 12 }}>
              <Link href="/events" style={{ fontSize: '0.85rem', color: 'var(--color-muted)', textDecoration: 'none' }}>Explore More &gt;</Link>
            </div>
          </div>
        </div>

        {/* RIGHT — Join Panel */}
        <div>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: 'var(--shadow-card)', position: 'sticky', top: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1.2rem', margin: '0 0 16px' }}>Join Event</h3>

            {/* Ticket pricing */}
            <div style={{ background: '#F5F5F5', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: 6 }}>
                <span>Arc Member Ticket</span>
                <span style={{ fontWeight: 700 }}>
                  {Number(event.arc_member_price) === 0 ? 'FREE' : `$${Number(event.arc_member_price).toFixed(2)}`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Non-Arc Member Ticket</span>
                <span style={{ fontWeight: 700 }}>
                  {Number(event.non_arc_member_price) === 0 ? 'FREE' : `$${Number(event.non_arc_member_price).toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Live count */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5F5F5', borderRadius: 8, padding: '12px 16px', marginBottom: 10 }}>
              <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>People Going</span>
              <span style={{ fontWeight: 700, fontSize: '1.4rem' }}>{totalGoing}</span>
            </div>

            {/* Friends going */}
            <div style={{ background: '#F5F5F5', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: friendsGoing.length > 0 ? 10 : 0 }}>
                <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Friends Going</span>
                <span style={{ fontWeight: 700, fontSize: '1.4rem' }}>{friendsGoing.length}</span>
              </div>
              {friendsGoing.length > 0 && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {friendsGoing.slice(0, 6).map(f => (
                    <Link key={f.id} href={`/users/${f.id}`} title={f.full_name || ''}>
                      <Avatar src={f.avatar_url} name={f.full_name || f.email} size={26} />
                    </Link>
                  ))}
                  {friendsGoing.length > 6 && (
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>
                      +{friendsGoing.length - 6}
                    </div>
                  )}
                </div>
              )}
            </div>

            {event.ticket_sale_ends && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textAlign: 'center', margin: '0 0 14px' }}>
                Ticket sale ends {new Date(event.ticket_sale_ends).toLocaleDateString('en-AU')}
              </p>
            )}

            {isRegistered ? (
              <button onClick={() => handleJoin()} disabled={joining} style={{
                width: '100%', padding: 13, background: '#888', color: 'white',
                border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem',
                cursor: 'pointer', fontFamily: 'var(--font-haas)', letterSpacing: '0.04em'
              }}>
                {joining ? 'Loading...' : 'Leave Event'}
              </button>
            ) : isFree ? (
              <button onClick={() => handleJoin('non_arc')} disabled={joining} style={{
                width: '100%', padding: 13, background: 'var(--color-accent-blue)', color: 'white',
                border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem',
                cursor: 'pointer', fontFamily: 'var(--font-haas)', letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                {joining ? 'Loading...' : 'Join — Free'}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => handleJoin('arc')} style={{
                  width: '100%', padding: 12, background: 'var(--color-accent-blue)', color: 'white',
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem',
                  cursor: 'pointer', fontFamily: 'var(--font-haas)'
                }}>
                  Arc Member — ${Number(event.arc_member_price).toFixed(2)}
                </button>
                <button onClick={() => handleJoin('non_arc')} style={{
                  width: '100%', padding: 12, background: 'white', color: 'var(--color-navy)',
                  border: '2px solid var(--color-accent-blue)', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem',
                  cursor: 'pointer', fontFamily: 'var(--font-haas)'
                }}>
                  Non-Arc — ${Number(event.non_arc_member_price).toFixed(2)}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      {icon && <span style={{ color: 'var(--color-muted)' }}>{icon}</span>}
      <div style={{ width: 36, height: 4, background: 'var(--color-yellow)', borderRadius: 2 }} />
      <span style={{ fontWeight: 700 }}>{children}</span>
    </div>
  )
}
const ClockIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
const PinIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
