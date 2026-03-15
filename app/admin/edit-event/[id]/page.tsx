'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CoverImage } from '@/components/ui/Image'
import { EVENT_CATEGORIES } from '@/lib/constants'
import type { Event, Society } from '@/types'

export default function EditEventPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteEvent, setShowDeleteEvent] = useState(false)
  const [societies, setSocieties] = useState<Society[]>([])
  const [form, setForm] = useState<Partial<Event>>({})

  useEffect(() => {
    if (localStorage.getItem('popular_admin_mode') !== 'true') { router.push('/profile'); return }
    async function init() {
      try {
        const { data: ev } = await supabase.from('events').select('*, society:societies(*)').eq('id', id as string).single()
        if (ev) setForm(ev as Event)
        const { data: socs } = await supabase.from('societies').select('id, name, short_name').order('name')
        if (socs) setSocieties(socs as Society[])
      } finally { setLoading(false) }
    }
    init()
  }, [id])

  const set = (key: string, value: string | boolean | number) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!form.title || !form.date) { alert('Title and date are required.'); return }
    setSaving(true)
    const { error } = await supabase.from('events').update({
      society_id: form.society_id,
      title: form.title,
      description: form.description,
      cover_url: form.cover_url || null,
      date: form.date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location || null,
      arc_member_price: Number(form.arc_member_price) || 0,
      non_arc_member_price: Number(form.non_arc_member_price) || 0,
      capacity: form.capacity ? Number(form.capacity) : null,
      ticket_sale_ends: form.ticket_sale_ends || null,
      category: form.category || null,
      is_featured: form.is_featured ?? false,
    }).eq('id', id as string)
    setSaving(false)
    if (error) { alert(`Save failed: ${error.message}`); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const deleteEvent = async () => {
    setDeleting(true)
    const { error } = await supabase.from('events').delete().eq('id', id as string)
    if (error) { alert(`Delete failed: ${error.message}`); setDeleting(false); return }
    // Redirect back to the managing society, or events list
    if (form.society_id) router.push(`/admin/manage-society/${form.society_id}`)
    else router.push('/events')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-muted)' }}>Loading...</div>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 60px', fontFamily: 'var(--font-haas)' }}>
      <Link href={form.society_id ? `/admin/manage-society/${form.society_id}` : '/events'} style={{ color: 'var(--color-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>
        ← Back to Manage Society
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 32px' }}>
        <span style={{ background: 'var(--color-yellow)', borderRadius: 6, padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin</span>
        <h1 style={{ fontWeight: 700, fontSize: '1.7rem', margin: 0 }}>Edit Event</h1>
      </div>

      {saved && (
        <div style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontWeight: 600, fontSize: '0.875rem' }}>
          ✓ Changes saved!
        </div>
      )}

      {/* Basic Info */}
      <div style={{ background: 'white', borderRadius: 12, padding: '22px 26px', boxShadow: 'var(--shadow-card)', marginBottom: 20 }}>
        <SectionLabel>Basic Info</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <Field label="Event Title *" value={form.title ?? ''} onChange={v => set('title', v)} placeholder="Annual Cruise Night" />
          </div>
          <div>
            <label style={labelStyle}>Society</label>
            <select value={form.society_id ?? ''} onChange={e => set('society_id', e.target.value)} style={inputStyle as React.CSSProperties}>
              {societies.map(s => <option key={s.id} value={s.id}>{s.short_name} — {s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={form.category ?? ''} onChange={e => set('category', e.target.value)} style={inputStyle as React.CSSProperties}>
              <option value="">None</option>
              {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)}
            rows={4} placeholder="Describe the event…"
            style={{ ...inputStyle, resize: 'vertical', width: '100%', boxSizing: 'border-box' } as React.CSSProperties} />
        </div>
      </div>

      {/* Date, Time, Location */}
      <div style={{ background: 'white', borderRadius: 12, padding: '22px 26px', boxShadow: 'var(--shadow-card)', marginBottom: 20 }}>
        <SectionLabel>Date, Time & Location</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <Field label="Date *" value={form.date ?? ''} onChange={v => set('date', v)} type="date" />
          <Field label="Start Time" value={form.start_time ?? ''} onChange={v => set('start_time', v)} type="time" />
          <Field label="End Time" value={form.end_time ?? ''} onChange={v => set('end_time', v)} type="time" />
          <Field label="Ticket Sale Ends" value={form.ticket_sale_ends?.slice(0, 16) ?? ''} onChange={v => set('ticket_sale_ends', v)} type="datetime-local" />
          <div style={{ gridColumn: '1/-1' }}>
            <Field label="Location" value={form.location ?? ''} onChange={v => set('location', v)} placeholder="King Wharf C, Sydney NSW 2000" />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ background: 'white', borderRadius: 12, padding: '22px 26px', boxShadow: 'var(--shadow-card)', marginBottom: 20 }}>
        <SectionLabel>Pricing & Capacity</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
          <Field label="Arc Member Price ($)" value={String(form.arc_member_price ?? '0')} onChange={v => set('arc_member_price', v)} type="number" placeholder="0.00" />
          <Field label="Non-Arc Member Price ($)" value={String(form.non_arc_member_price ?? '0')} onChange={v => set('non_arc_member_price', v)} type="number" placeholder="0.00" />
          <Field label="Capacity (blank = unlimited)" value={form.capacity ? String(form.capacity) : ''} onChange={v => set('capacity', v)} type="number" placeholder="500" />
        </div>
      </div>

      {/* Media */}
      <div style={{ background: 'white', borderRadius: 12, padding: '22px 26px', boxShadow: 'var(--shadow-card)', marginBottom: 28 }}>
        <SectionLabel>Media & Settings</SectionLabel>
        <div style={{ marginBottom: 16 }}>
          <Field label="Cover Photo URL" value={form.cover_url ?? ''} onChange={v => set('cover_url', v)} placeholder="https://…" />
        </div>
        {form.cover_url && (
          <div style={{ borderRadius: 8, overflow: 'hidden', height: 130, marginBottom: 16 }}>
            <CoverImage src={form.cover_url} height={130} fallback="event" />
          </div>
        )}
        {/* Featured toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => set('is_featured', !form.is_featured)} style={{
            width: 44, height: 24, borderRadius: 12, padding: 0,
            background: form.is_featured ? 'var(--color-yellow)' : '#ccc',
            border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0
          }}>
            <div style={{ position: 'absolute', top: 2, left: form.is_featured ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Feature this event</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Pinned as the hero on the dashboard</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <Link href={`/events/${id}`} style={{ padding: '10px 22px', background: 'none', border: '1.5px solid #ddd', borderRadius: 8, fontWeight: 600, textDecoration: 'none', color: 'var(--color-muted)', display: 'inline-flex', alignItems: 'center', fontSize: '0.875rem' }}>
          View Event
        </Link>
        <button onClick={() => setShowDeleteEvent(true)}
          style={{ marginLeft: 'auto', padding: '10px 22px', background: 'none', border: '1.5px solid #EF4444', borderRadius: 8, color: '#EF4444', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-haas)' }}>
          Delete Event
        </button>
      </div>

      {/* ── Delete Event Confirm Modal ── */}
      {showDeleteEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 32, maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', fontFamily: 'var(--font-haas)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12, textAlign: 'center' }}>⚠️</div>
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', margin: '0 0 10px', textAlign: 'center' }}>Delete this event?</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', textAlign: 'center', margin: '0 0 8px', lineHeight: 1.6 }}>
              <strong>{form.title}</strong> and all its registrations will be permanently deleted.
            </p>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.82rem', textAlign: 'center', margin: '0 0 24px' }}>
              Type <strong>DELETE</strong> to confirm.
            </p>
            <DeleteConfirmInput
              expected="DELETE"
              onConfirm={deleteEvent}
              onCancel={() => setShowDeleteEvent(false)}
              deleting={deleting}
              label="Delete Event"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 32, height: 4, background: 'var(--color-yellow)', borderRadius: 2 }} />
      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{children}</span>
    </div>
  )
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: 5, fontWeight: 500 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.9rem', fontFamily: 'var(--font-haas)', outline: 'none', boxSizing: 'border-box', background: 'white' }

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  )
}

function DeleteConfirmInput({ expected, onConfirm, onCancel, deleting, label }: {
  expected: string; onConfirm: () => void; onCancel: () => void; deleting: boolean; label: string
}) {
  const [typed, setTyped] = useState('')
  const matches = typed === expected
  return (
    <div>
      <input
        value={typed}
        onChange={e => setTyped(e.target.value)}
        placeholder={expected}
        style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${matches ? '#22C55E' : '#E5E5E5'}`, borderRadius: 8, fontSize: '0.9rem', fontFamily: 'var(--font-haas)', outline: 'none', boxSizing: 'border-box', marginBottom: 16, textAlign: 'center', fontWeight: 700 }}
      />
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '10px 0', background: 'none', border: '1.5px solid #ddd', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-haas)', color: 'var(--color-muted)', fontSize: '0.875rem' }}>
          Cancel
        </button>
        <button onClick={onConfirm} disabled={!matches || deleting}
          style={{ flex: 1, padding: '10px 0', background: matches ? '#EF4444' : '#ccc', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: matches && !deleting ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-haas)', fontSize: '0.875rem', opacity: deleting ? 0.7 : 1 }}>
          {deleting ? 'Deleting…' : label}
        </button>
      </div>
    </div>
  )
}
