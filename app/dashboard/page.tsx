'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { EVENT_CATEGORIES } from '@/lib/constants'
import Link from 'next/link'
import { CoverImage, Avatar } from '@/components/ui/Image'
import type { Event, Society, EventRegistration, SocietyMembership } from '@/types'

export default function DashboardPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [registeredEvents, setRegisteredEvents] = useState<EventRegistration[]>([])
  const [yourSocieties, setYourSocieties] = useState<SocietyMembership[]>([])
  const [suggestedSocieties, setSuggestedSocieties] = useState<Society[]>([])
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ events: Event[]; societies: Society[] } | null>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        const { data: featured } = await supabase
        .from('events').select('*, society:societies(*)')
        .order('registered_count', { ascending: false }).limit(1).single()
      if (featured) setFeaturedEvent(featured)

      const { data: eventsData } = await supabase
        .from('events').select('*, society:societies(*)')
        .order('date', { ascending: true }).limit(8)
      if (eventsData) { setEvents(eventsData); setFilteredEvents(eventsData) }

      if (user) {
        const { data: regData } = await supabase
          .from('event_registrations').select('*, event:events(*, society:societies(*))')
          .eq('user_id', user.id).limit(6)
        if (regData) setRegisteredEvents(regData)

        const { data: memData } = await supabase
          .from('society_memberships').select('*, society:societies(*)')
          .eq('user_id', user.id).limit(8)
        if (memData) setYourSocieties(memData)
      }

      const { data: sugData } = await supabase.from('societies').select('*').limit(6)
      if (sugData) setSuggestedSocieties(sugData)
      } catch (e) { console.error('Dashboard fetch error:', e) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  // Category filter — re-queries DB when a category is selected
  const handleCategoryClick = useCallback(async (cat: string) => {
    const next = activeCategory === cat ? null : cat
    setActiveCategory(next)
    if (!next) {
      setFilteredEvents(events)
      return
    }
    const { data } = await supabase
      .from('events').select('*, society:societies(*)')
      .eq('category', next)
      .order('date', { ascending: true })
      .limit(8)
    setFilteredEvents(data ?? [])
  }, [activeCategory, events, supabase])

  // Search
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults(null); return }
    setSearching(true)
    const [{ data: evs }, { data: socs }] = await Promise.all([
      supabase.from('events').select('*, society:societies(*)').ilike('title', `%${q}%`).limit(6),
      supabase.from('societies').select('*').or(`name.ilike.%${q}%,short_name.ilike.%${q}%`).limit(6),
    ])
    setSearchResults({ events: evs ?? [], societies: socs ?? [] })
    setSearching(false)
  }, [supabase])

  useEffect(() => {
    const t = setTimeout(() => runSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery, runSearch])

  const formatDate = (d: string) => {
    const dt = new Date(d)
    return { day: dt.getDate(), month: dt.toLocaleString('default', { month: 'short' }) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-muted)' }}>
      Loading...
    </div>
  )

  const showSearch = !!searchQuery

  return (
    <div style={{ paddingBottom: 60 }}>

      {/* ── HERO ── */}
      <Link href={featuredEvent ? `/events/${featuredEvent.id}` : '#'} style={{ textDecoration: 'none', display: 'block' }}>
        <CoverImage src={featuredEvent?.cover_url} fallback="hero" height={340}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)'
          }} />
          {featuredEvent && (
            <>
              <div style={{ position: 'absolute', bottom: 28, left: 32, color: 'white', maxWidth: 560 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                  On Right Now!
                </div>
                <h2 style={{ margin: '0 0 8px', lineHeight: 1.05, fontWeight: 800, fontSize: 'clamp(1.6rem,3vw,2.4rem)', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                  {featuredEvent.title}
                </h2>
                <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.75, lineHeight: 1.5 }}>
                  {(featuredEvent.description ?? '').slice(0, 72)}{(featuredEvent.description?.length ?? 0) > 72 ? '…' : ''}
                </p>
              </div>
              <div style={{ position: 'absolute', bottom: 28, right: 32, color: 'white', fontSize: '0.875rem', fontWeight: 600, opacity: 0.85, textAlign: 'right' }}>
                {featuredEvent.date}
                {featuredEvent.start_time && <><br />{featuredEvent.start_time}{featuredEvent.end_time ? ` – ${featuredEvent.end_time}` : ''}</>}
              </div>
            </>
          )}
        </CoverImage>
      </Link>

      {/* ── SEARCH BAR ── */}
      <div style={{ background: 'var(--color-yellow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 32px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Search events and societies..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '1rem', fontFamily: 'var(--font-haas)', outline: 'none', color: 'rgba(0,0,0,0.8)' }}
          />
          <div style={{ display: 'flex', gap: 16, fontSize: '0.875rem', fontWeight: 700, flexShrink: 0 }}>
            <Link href="/societies" style={{ color: 'rgba(0,0,0,0.75)', textDecoration: 'none' }}>Societies</Link>
            <span style={{ color: 'rgba(0,0,0,0.35)' }}>/</span>
            <Link href="/events" style={{ color: 'rgba(0,0,0,0.75)', textDecoration: 'none' }}>Events</Link>
            <span style={{ color: 'rgba(0,0,0,0.35)' }}>/</span>
            <Link href="/friends" style={{ color: 'rgba(0,0,0,0.75)', textDecoration: 'none' }}>People</Link>
          </div>
        </div>
      </div>

      {/* ── SEARCH RESULTS ── */}
      {showSearch && (
        <div style={{ padding: '16px 32px 0' }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-elevated)' }}>
            {searching ? (
              <div style={{ color: 'var(--color-muted)', padding: '8px 0' }}>Searching...</div>
            ) : !searchResults || (searchResults.events.length === 0 && searchResults.societies.length === 0) ? (
              <div style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '12px 0' }}>No results for &ldquo;{searchQuery}&rdquo;</div>
            ) : (
              <>
                {searchResults.events.length > 0 && (
                  <div style={{ marginBottom: searchResults.societies.length > 0 ? 20 : 0 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 10 }}>Events</div>
                    {searchResults.events.map(ev => (
                      <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => setSearchQuery('')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 8, marginBottom: 4 }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F5')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <CoverImage src={ev.cover_url} height={44} fallback="event" style={{ width: 60, borderRadius: 6, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ev.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{ev.date} · {ev.society?.short_name}</div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.societies.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 10 }}>Societies</div>
                    {searchResults.societies.map(s => (
                      <Link key={s.id} href={`/societies/${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => setSearchQuery('')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 8, marginBottom: 4 }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F5')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <Avatar src={s.logo_url} name={s.short_name} size={40} color="#D9D9D9" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{s.short_name} · {s.type}</div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: '28px 32px 0' }}>
        {!showSearch && (
          <>
            {/* ── EVENTS + CATEGORIES ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 32, marginBottom: 40 }}>
              <div>
                <h2 className="section-title" style={{ marginBottom: 20 }}>
                  {activeCategory ? activeCategory : 'Events'}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 24 }}>
                  {filteredEvents.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', color: 'var(--color-muted)', padding: '20px 0' }}>
                      No events in this category yet.
                    </div>
                  ) : (
                    filteredEvents.slice(0, 8).map(ev => (
                      <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="event-card">
                          <CoverImage src={ev.cover_url} height={90} fallback="event" />
                          <div style={{ padding: '8px 10px' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.3, marginBottom: 2 }}>
                              {ev.title.length > 28 ? ev.title.slice(0, 28) + '...' : ev.title}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                              {ev.date} by {ev.society?.short_name}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* Categories */}
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 16px' }}>Categories</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {EVENT_CATEGORIES.map(cat => (
                    <div
                      key={cat}
                      onClick={() => handleCategoryClick(cat)}
                      className="category-chip"
                      style={{
                        outline: activeCategory === cat ? '3px solid var(--color-navy)' : 'none',
                        outlineOffset: 2,
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                    >
                      {cat}
                      {activeCategory === cat && (
                        <span style={{ position: 'absolute', top: 6, right: 8, fontSize: '0.75rem', opacity: 0.7 }}>✕</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── REGISTERED EVENTS ── */}
            {registeredEvents.length > 0 && (
              <section style={{ marginBottom: 40 }}>
                <h2 className="section-title" style={{ marginBottom: 20 }}>Registered Events ({registeredEvents.length})</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 24 }}>
                  {registeredEvents.map(reg => {
                    if (!reg.event) return null
                    const { day, month } = formatDate(reg.event.date)
                    return (
                      <Link key={reg.id} href={`/events/${reg.event.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'white', borderRadius: 10, padding: '12px 16px' }}>
                          <div className="date-badge">{day}<span>{month}</span></div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{reg.event.title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{reg.event.society?.short_name}</div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
                <div style={{ textAlign: 'right', marginTop: 16 }}>
                  <Link href="/events" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'inherit', textDecoration: 'none' }}>Events ›</Link>
                </div>
              </section>
            )}

            {/* ── YOUR SOCIETIES ── */}
            <section style={{ marginBottom: 40 }}>
              <h2 className="section-title" style={{ marginBottom: 20 }}>Your Societies ({yourSocieties.length})</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 24 }}>
                {yourSocieties.map(mem => (
                  <Link key={mem.id} href={`/societies/${mem.society_id}`} style={{ textDecoration: 'none' }}>
                    <div className="society-card">
                      <Avatar src={mem.society?.logo_url} name={mem.society?.short_name} size={36} color="#D9D9D9" />
                      <span style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--color-navy)' }}>{mem.society?.short_name || 'Society'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* ── SUGGESTED SOCIETIES ── */}
            <section style={{ marginBottom: 40 }}>
              <h2 className="section-title" style={{ marginBottom: 20 }}>Suggested Societies ({suggestedSocieties.length})</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 24 }}>
                {suggestedSocieties.map(soc => (
                  <Link key={soc.id} href={`/societies/${soc.id}`} style={{ textDecoration: 'none' }}>
                    <div className="society-card">
                      <Avatar src={soc.logo_url} name={soc.short_name} size={36} color="#D9D9D9" />
                      <span style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--color-navy)' }}>{soc.short_name}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <div style={{ textAlign: 'right', marginTop: 16 }}>
                <Link href="/societies" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'inherit', textDecoration: 'none' }}>Societies ›</Link>
              </div>
            </section>
          </>
        )}

        <footer style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.8rem', paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
          © 2026 All Rights Reserved, Popular Inc.
        </footer>
      </div>
    </div>
  )
}
