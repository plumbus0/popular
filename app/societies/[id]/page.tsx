'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CoverImage, Avatar, LogoImage } from '@/components/ui/Image'
import type { Society, Event, TeamMember, Profile } from '@/types'

export default function SocietyDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [society, setSociety] = useState<Society | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [regularMembers, setRegularMembers] = useState<Profile[]>([])
  const [isMember, setIsMember] = useState(false)
  const [isManager, setIsManager] = useState(false)
  const [joining, setJoining] = useState(false)
  const [showPast, setShowPast] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [attendees, setAttendees] = useState<Profile[]>([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAllMembers, setShowAllMembers] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)

  useEffect(() => {
    setIsAdmin(localStorage.getItem('popular_admin_mode') === 'true')
    async function fetchData() {
      const { data: soc } = await supabase.from('societies').select('*').eq('id', id).single()
      if (soc) setSociety(soc as Society)

      const { data: evData } = await supabase.from('events').select('*').eq('society_id', id).order('date')
      if (evData) setEvents(evData as Event[])

      const { data: teamData } = await supabase
        .from('team_members').select('*, profile:profiles(*)')
        .eq('society_id', id).order('created_at')
      if (teamData) setTeam(teamData as TeamMember[])

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: mem } = await supabase.from('society_memberships').select('id')
          .eq('user_id', user.id).eq('society_id', id as string).maybeSingle()
        if (mem) setIsMember(true)
        const { data: mgr } = await supabase.from('team_members').select('id')
          .eq('society_id', id as string).eq('user_id', user.id).maybeSingle()
        if (mgr) setIsManager(true)
      }
      setLoading(false)
    }
    fetchData()
  }, [id])

  const loadRegularMembers = async () => {
    if (showAllMembers) { setShowAllMembers(false); return }
    if (regularMembers.length > 0) { setShowAllMembers(true); return }
    setLoadingMembers(true)
    const { data } = await supabase
      .from('society_memberships')
      .select('profile:profiles(*)')
      .eq('society_id', id as string)
      // @ts-ignore
    const profiles = (data ?? []).map((r: { profile: Profile }) => r.profile).filter(Boolean) as Profile[]
    const teamUserIds = new Set(team.map(t => t.user_id).filter(Boolean))
    setRegularMembers(profiles.filter(p => !teamUserIds.has(p.id)))
    setShowAllMembers(true)
    setLoadingMembers(false)
  }

  const handleJoin = async () => {
    setJoining(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    if (isMember) {
      await supabase.from('society_memberships').delete().eq('user_id', user.id).eq('society_id', id as string)
      setIsMember(false)
    } else {
      await supabase.from('society_memberships').insert({ user_id: user.id, society_id: id as string })
      setIsMember(true)
    }
    setJoining(false)
  }

  const loadAttendees = async (eventId: string) => {
    if (selectedEventId === eventId) { setSelectedEventId(null); setAttendees([]); return }
    setSelectedEventId(eventId)
    setLoadingAttendees(true)
    const { data } = await supabase
      .from('event_registrations')
      .select('profile:profiles(*)')
      .eq('event_id', eventId)
      // @ts-ignore
    setAttendees((data ?? []).map((r: { profile: Profile }) => r.profile).filter(Boolean) as Profile[])
    setLoadingAttendees(false)
  }

  const today = new Date().toISOString().split('T')[0]
  const displayEvents = events.filter(e => showPast ? e.date < today : e.date >= today)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-muted)' }}>Loading...</div>
  )
  if (!society) return <div style={{ padding: 40 }}>Society not found.</div>

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 60px' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: 8 }}>Society</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <h1 style={{ fontWeight: 700, fontSize: '1.8rem', margin: 0 }}>{society.name}</h1>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{society.short_name}</span>
        <div style={{ marginLeft: 'auto' }}>
          <LogoImage src={society.logo_url} alt={society.name} height={40} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32 }}>
        {/* LEFT */}
        <div>
          <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 28 }}>
            <CoverImage src={society.cover_url} height={340} fallback="society" />
          </div>

          {/* About */}
          <section style={{ marginBottom: 32 }}>
            <SectionLabel>About</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16 }}>
              <div style={{ fontSize: '0.85rem', lineHeight: 2.2, color: '#555' }}>
                {society.type && <div>📋 {society.type}</div>}
                {society.founded_year && <div>🕐 Founded {society.founded_year}</div>}
                {society.size > 0 && <div>👥 {society.size >= 10000 ? '10000+' : society.size.toLocaleString()} members</div>}
              </div>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', margin: 0 }}>
                {society.description || 'No description available.'}
              </p>
            </div>
          </section>

          {/* Events */}
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <SectionLabel>Events ({events.length})</SectionLabel>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: '0.875rem' }}>
                <button onClick={() => setShowPast(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: !showPast ? 700 : 400, fontFamily: 'var(--font-haas)', color: !showPast ? 'var(--color-navy)' : 'var(--color-muted)' }}>Upcoming</button>
                <span style={{ color: 'var(--color-muted)' }}>|</span>
                <button onClick={() => setShowPast(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: showPast ? 700 : 400, fontFamily: 'var(--font-haas)', color: showPast ? 'var(--color-navy)' : 'var(--color-muted)' }}>Past</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayEvents.slice(0, 6).map(ev => (
                <div key={ev.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 10, padding: '12px 16px', boxShadow: 'var(--shadow-card)' }}>
                    <CoverImage src={ev.cover_url} height={60} fallback="event" style={{ width: 80, borderRadius: 8, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <Link href={`/events/${ev.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ev.title}</div>
                      </Link>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{ev.date}{ev.location ? ` · ${ev.location}` : ''}</div>
                    </div>
                    {(isManager || isAdmin) && (
                      <button onClick={() => loadAttendees(ev.id)}
                        style={{ padding: '6px 14px', background: selectedEventId === ev.id ? 'var(--color-navy)' : 'var(--color-yellow)', color: selectedEventId === ev.id ? 'white' : 'var(--color-navy)', border: 'none', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-haas)', whiteSpace: 'nowrap' }}>
                        {selectedEventId === ev.id ? 'Hide' : 'Attendees'}
                      </button>
                    )}
                  </div>
                  {selectedEventId === ev.id && (
                    <div style={{ background: '#F9F9F9', borderRadius: 10, padding: '16px 20px', marginTop: 4 }}>
                      {loadingAttendees ? (
                        <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Loading...</div>
                      ) : attendees.length === 0 ? (
                        <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>No registrations yet.</div>
                      ) : (
                        <>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 10 }}>
                            {attendees.length} Attendee{attendees.length !== 1 ? 's' : ''}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {attendees.map(att => (
                              <Link key={att.id} href={`/users/${att.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Avatar src={att.avatar_url} name={att.full_name || att.email} size={32} />
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{att.full_name || 'Unknown'}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{att.degree || att.university}</div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Team */}
          {team.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <SectionLabel>Team ({team.length})</SectionLabel>
                {(isAdmin || isManager) && (
                  <button onClick={loadRegularMembers} disabled={loadingMembers}
                    style={{ marginLeft: 'auto', padding: '5px 14px', background: showAllMembers ? 'var(--color-navy)' : 'white', color: showAllMembers ? 'white' : 'var(--color-navy)', border: '1.5px solid var(--color-navy)', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-haas)' }}>
                    {loadingMembers ? '...' : showAllMembers ? 'Hide Members' : 'View All Members'}
                  </button>
                )}
              </div>

              {/* Team grid */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {team.map(member => (
                  <Link key={member.id} href={member.user_id ? `/users/${member.user_id}` : '#'}
                    style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center', minWidth: 72 }}>
                    <Avatar
                      src={member.profile?.avatar_url}
                      name={member.name}
                      size={56}
                      color={member.avatar_color || '#888'}
                      style={{ margin: '0 auto 8px', cursor: member.user_id ? 'pointer' : 'default', transition: 'transform 0.15s', display: 'block' }}
                    />
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.3 }}>{member.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: 2 }}>{member.role}</div>
                  </Link>
                ))}
              </div>

              {/* Regular members panel */}
              {showAllMembers && (
                <div style={{ marginTop: 24, background: '#F9F9F9', borderRadius: 10, padding: '16px 20px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 14 }}>
                    Regular Members ({regularMembers.length})
                  </div>
                  {regularMembers.length === 0 ? (
                    <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>No regular members yet.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                      {regularMembers.map(p => (
                        <Link key={p.id} href={`/users/${p.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar src={p.avatar_url} name={p.full_name || p.email} size={36} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.full_name || 'Unknown'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{p.university}{p.degree ? ` · ${p.degree}` : ''}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Socials */}
          {(society.instagram || society.facebook || society.linkedin || society.youtube) && (
            <section>
              <SectionLabel>Socials</SectionLabel>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                {society.instagram && <SocialLink href={society.instagram}><IgIcon /></SocialLink>}
                {society.facebook && <SocialLink href={society.facebook}><FbIcon /></SocialLink>}
                {society.linkedin && <SocialLink href={society.linkedin}><LiIcon /></SocialLink>}
                {society.youtube && <SocialLink href={society.youtube}><YtIcon /></SocialLink>}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT */}
        <div>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: 'var(--shadow-card)', position: 'sticky', top: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1.2rem', margin: '0 0 4px' }}>Join Society</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: 20 }}>
              <span>Annual - 2026</span>
              <span style={{ fontWeight: 700, color: 'var(--color-navy)' }}>FREE</span>
            </div>
            <button onClick={handleJoin} disabled={joining}
              style={{ width: '100%', padding: 14, background: isMember ? '#888' : 'var(--color-accent-blue)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-haas)', opacity: joining ? 0.7 : 1 }}>
              {joining ? 'Loading...' : isMember ? 'Leave Society' : 'Join'}
            </button>
            {isAdmin && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 10 }}>Admin</div>
                <Link href={`/admin/manage-society/${id}`}
                  style={{ display: 'block', width: '100%', padding: '10px 0', background: 'var(--color-yellow)', color: 'var(--color-navy)', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
                  Manage Society
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 36, height: 4, background: 'var(--color-yellow)', borderRadius: 2 }} />
      <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{children}</span>
    </div>
  )
}
const SocialLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--color-navy)' }}>{children}</a>
)
const IgIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
const FbIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
const LiIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
const YtIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
