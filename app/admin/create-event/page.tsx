'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Society } from '@/types'

import { EVENT_CATEGORIES } from '@/lib/constants'
const CATEGORIES = EVENT_CATEGORIES

export default function CreateEventPage() {
  const supabase = createClient()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [societies, setSocieties] = useState<Society[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    society_id: '',
    title: '',
    description: '',
    cover_url: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    arc_member_price: '0',
    non_arc_member_price: '0',
    capacity: '',
    ticket_sale_ends: '',
    category: 'Social',
    is_featured: false,
  })

  useEffect(() => {
    const stored = localStorage.getItem('popular_admin_mode')
    if (stored !== 'true') { router.push('/profile'); return }
    setIsAdmin(true)

    supabase.from('societies').select('id, name, short_name').order('name').then(({ data }) => {
      if (data) {
        setSocieties(data as Society[])
        if (data.length > 0) setForm(prev => ({ ...prev, society_id: data[0].id }))
      }
    })
  }, [])

  const set = (key: string, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    if (!form.title || !form.society_id || !form.date) {
      setError('Title, society and date are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    const { error: err } = await supabase.from('events').insert({
      society_id: form.society_id,
      title: form.title,
      description: form.description || null,
      cover_url: form.cover_url || null,
      date: form.date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location || null,
      arc_member_price: parseFloat(form.arc_member_price) || 0,
      non_arc_member_price: parseFloat(form.non_arc_member_price) || 0,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      ticket_sale_ends: form.ticket_sale_ends || null,
      category: form.category,
      is_featured: form.is_featured,
      registered_count: 0,
    })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    setSuccess(true)
    setTimeout(() => router.push('/events'), 1500)
  }

  if (!isAdmin) return null

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 60px' }}>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <Link href="/profile" style={{ color: 'var(--color-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>
          ← Back to Profile
        </Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <div style={{
          background: 'var(--color-yellow)', borderRadius: 8,
          padding: '6px 10px', fontSize: '0.7rem', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase'
        }}>Admin</div>
        <h1 style={{ fontWeight: 700, fontSize: '1.8rem', margin: 0 }}>Create Event</h1>
      </div>

      {success && (
        <div style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontWeight: 600 }}>
          ✓ Event created! Redirecting...
        </div>
      )}
      {error && (
        <div style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div style={{ background: 'white', borderRadius: 12, padding: '28px 32px', boxShadow: 'var(--shadow-card)', marginBottom: 24 }}>
        <SectionLabel>Basic Info</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Event Title *" value={form.title} onChange={v => set('title', v)} placeholder="e.g. Annual Cruise Night" />
          </div>

          <div>
            <label style={labelStyle}>Society *</label>
            <select value={form.society_id} onChange={e => set('society_id', e.target.value)} style={inputStyle as React.CSSProperties}>
              {societies.map(s => (
                <option key={s.id} value={s.id}>{s.short_name} — {s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={inputStyle as React.CSSProperties}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe the event..."
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', width: '100%', boxSizing: 'border-box' } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Date, Time & Location */}
      <div style={{ background: 'white', borderRadius: 12, padding: '28px 32px', boxShadow: 'var(--shadow-card)', marginBottom: 24 }}>
        <SectionLabel>Date, Time & Location</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Date *" value={form.date} onChange={v => set('date', v)} type="date" />
          <Field label="Start Time" value={form.start_time} onChange={v => set('start_time', v)} type="time" />
          <Field label="End Time" value={form.end_time} onChange={v => set('end_time', v)} type="time" />
          <Field label="Ticket Sale Ends" value={form.ticket_sale_ends} onChange={v => set('ticket_sale_ends', v)} type="datetime-local" />
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Location" value={form.location} onChange={v => set('location', v)} placeholder="e.g. King Wharf C, Sydney NSW 2000" />
          </div>
        </div>
      </div>

      {/* Pricing & Capacity */}
      <div style={{ background: 'white', borderRadius: 12, padding: '28px 32px', boxShadow: 'var(--shadow-card)', marginBottom: 24 }}>
        <SectionLabel>Pricing & Capacity</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          <Field label="Arc Member Price ($)" value={form.arc_member_price} onChange={v => set('arc_member_price', v)} type="number" placeholder="0.00" />
          <Field label="Non-Arc Member Price ($)" value={form.non_arc_member_price} onChange={v => set('non_arc_member_price', v)} type="number" placeholder="0.00" />
          <Field label="Capacity (leave blank = unlimited)" value={form.capacity} onChange={v => set('capacity', v)} type="number" placeholder="e.g. 500" />
        </div>
      </div>

      {/* Media & Flags */}
      <div style={{ background: 'white', borderRadius: 12, padding: '28px 32px', boxShadow: 'var(--shadow-card)', marginBottom: 32 }}>
        <SectionLabel>Media & Settings</SectionLabel>
        <div style={{ marginBottom: 20 }}>
          <Field label="Cover Photo URL" value={form.cover_url} onChange={v => set('cover_url', v)} placeholder="https://..." />
        </div>
        {form.cover_url && (
          <div style={{ borderRadius: 8, overflow: 'hidden', height: 140, marginBottom: 20 }}>
            <img src={form.cover_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
          </div>
        )}
        {/* Featured toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => set('is_featured', !form.is_featured)}
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: form.is_featured ? 'var(--color-yellow)' : '#ccc',
              border: 'none', cursor: 'pointer', position: 'relative',
              transition: 'background 0.2s', flexShrink: 0
            }}
          >
            <div style={{
              position: 'absolute', top: 2,
              left: form.is_featured ? 22 : 2,
              width: 20, height: 20, borderRadius: '50%', background: 'white',
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </button>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Feature this event</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Pinned as the hero on the dashboard</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <button onClick={handleSubmit} disabled={submitting || success} className="btn-primary" style={{ opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Creating...' : 'Create Event'}
        </button>
        <Link href="/events" style={{
          padding: '10px 24px', background: 'none',
          border: '1.5px solid var(--color-border)', borderRadius: 8,
          fontWeight: 600, textDecoration: 'none', color: 'var(--color-muted)',
          display: 'inline-flex', alignItems: 'center'
        }}>Cancel</Link>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8rem',
  color: 'var(--color-muted)', marginBottom: 6, fontWeight: 500
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '1px solid var(--color-border)', borderRadius: 8,
  fontSize: '0.9rem', fontFamily: 'var(--font-haas)',
  outline: 'none', boxSizing: 'border-box', background: 'white'
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <div style={{ width: 36, height: 4, background: 'var(--color-yellow)', borderRadius: 2 }} />
      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{children}</span>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  )
}
