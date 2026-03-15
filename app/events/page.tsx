'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { EVENT_CATEGORIES } from '@/lib/constants'
import Link from 'next/link'
import { CoverImage, Avatar } from '@/components/ui/Image'
import type { Event, EventRegistration } from '@/types'

const PAGE_SIZE = 12

export default function EventsPage() {
  const supabase = createClient()
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [registeredEvents, setRegisteredEvents] = useState<EventRegistration[]>([])
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(0)

  const fetchEvents = async (cat: string | null, pageNum: number, append = false) => {
    let query = supabase
      .from('events').select('*, society:societies(*)')
      .order('date', { ascending: true })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)
    if (cat) query = query.eq('category', cat)
    const { data } = await query
    if (data) {
      append ? setAllEvents(prev => [...prev, ...data]) : setAllEvents(data)
    }
  }

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: featured } = await supabase
        .from('events').select('*, society:societies(*)')
        .order('registered_count', { ascending: false }).limit(1).single()
      if (featured) setFeaturedEvent(featured)

      await fetchEvents(null, 0)

      if (user) {
        const { data: regData } = await supabase
          .from('event_registrations').select('*, event:events(*, society:societies(*))')
          .eq('user_id', user.id).limit(6)
        if (regData) setRegisteredEvents(regData)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleCategoryClick = async (cat: string) => {
    const next = activeCategory === cat ? null : cat
    setActiveCategory(next)
    setPage(0)
    await fetchEvents(next, 0)
  }

  const loadMore = async () => {
    setLoadingMore(true)
    const nextPage = page + 1
    await fetchEvents(activeCategory, nextPage, true)
    setPage(nextPage)
    setLoadingMore(false)
  }

  const formatDate = (d: string) => {
    const dt = new Date(d)
    return { day: dt.getDate(), month: dt.toLocaleString('default', { month: 'short' }) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-muted)' }}>
      Loading events...
    </div>
  )

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 60px' }}>
      <h1 style={{ fontWeight: 700, fontSize: '2rem', margin: '0 0 24px' }}>Events</h1>

      {/* Registered Events */}
      {registeredEvents.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <h2 className="section-title" style={{ marginBottom: 20 }}>
            Your Registered Events ({registeredEvents.length})
          </h2>
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
        </section>
      )}

      {/* Featured + Categories */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 32, marginBottom: 40 }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: 20 }}>
            <span style={{ color: 'var(--color-yellow)' }}>Featured</span> Event
          </h2>
          {featuredEvent && (
            <Link href={`/events/${featuredEvent.id}`} style={{ textDecoration: 'none', display: 'block', marginTop: 24 }}>
              <div style={{ borderRadius: 12, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.01)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-elevated)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}>
                <CoverImage src={featuredEvent.cover_url} height={260} fallback="event" />
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{featuredEvent.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: 2 }}>
                  {featuredEvent.date} · {featuredEvent.society?.short_name}
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Categories — all 8, clickable */}
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
                  outlineOffset: 2, cursor: 'pointer', position: 'relative',
                }}
              >
                {cat}
                {activeCategory === cat && (
                  <span style={{ position: 'absolute', top: 6, right: 8, fontSize: '0.75rem', opacity: 0.6 }}>✕</span>
                )}
              </div>
            ))}
          </div>
          {activeCategory && (
            <button onClick={() => handleCategoryClick(activeCategory)}
              style={{ marginTop: 10, padding: '5px 12px', background: 'none', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer', color: 'var(--color-muted)', fontFamily: 'var(--font-haas)' }}>
              Clear ×
            </button>
          )}
        </div>
      </div>

      {/* All Events Grid */}
      <section>
        <h2 className="section-title" style={{ marginBottom: 20 }}>
          <span style={{ color: 'var(--color-yellow)' }}>
            {activeCategory ?? 'Upcoming'}
          </span>{' '}Events ({allEvents.length})
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 24 }}>
          {allEvents.length === 0 ? (
            <div style={{ gridColumn: '1/-1', color: 'var(--color-muted)', padding: '32px 0', textAlign: 'center' }}>
              No events found{activeCategory ? ` in "${activeCategory}"` : ''}.
            </div>
          ) : (
            allEvents.map((ev, i) => (
              <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className={`event-card animate-fadeInUp animate-delay-${(i % 4) + 1}`}>
                  <CoverImage src={ev.cover_url} height={110} fallback="event" />
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, lineHeight: 1.3 }}>
                      {ev.title.length > 24 ? ev.title.slice(0, 24) + '…' : ev.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Avatar src={ev.society?.logo_url} name={ev.society?.short_name} size={14} color="#ccc" />
                      {ev.date}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button onClick={loadMore} disabled={loadingMore}
            style={{ padding: '10px 32px', background: 'none', border: 'none', color: 'var(--color-muted)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-haas)' }}>
            {loadingMore ? 'Loading...' : 'Load More...'}
          </button>
        </div>
      </section>
    </div>
  )
}
