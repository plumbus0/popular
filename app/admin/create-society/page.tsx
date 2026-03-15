'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SOCIETY_TYPES = ['Academic', 'Cultural', 'Hobbies', 'Sports', 'Professional']

export default function CreateSocietyPage() {
  const supabase = createClient()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    short_name: '',
    description: '',
    type: 'Academic',
    university: 'UNSW',
    founded_year: '',
    size: '',
    logo_url: '',
    cover_url: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    youtube: '',
  })

  useEffect(() => {
    const stored = localStorage.getItem('popular_admin_mode')
    if (stored !== 'true') router.push('/profile')
    else setIsAdmin(true)
  }, [])

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    if (!form.name || !form.short_name) { setError('Name and short name are required.'); return }
    setSubmitting(true)
    setError(null)
    const { error: err } = await supabase.from('societies').insert({
      name: form.name,
      short_name: form.short_name,
      description: form.description || null,
      type: form.type,
      university: form.university,
      founded_year: form.founded_year ? parseInt(form.founded_year) : null,
      size: form.size ? parseInt(form.size) : 0,
      logo_url: form.logo_url || null,
      cover_url: form.cover_url || null,
      instagram: form.instagram || null,
      facebook: form.facebook || null,
      linkedin: form.linkedin || null,
      youtube: form.youtube || null,
    })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    setSuccess(true)
    setTimeout(() => router.push('/societies'), 1500)
  }

  if (!isAdmin) return null

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
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
        <h1 style={{ fontWeight: 700, fontSize: '1.8rem', margin: 0 }}>Create Society</h1>
      </div>

      {success && (
        <div style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontWeight: 600 }}>
          ✓ Society created! Redirecting...
        </div>
      )}
      {error && (
        <div style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
          {error}
        </div>
      )}

      <div style={{ background: 'white', borderRadius: 12, padding: '28px 32px', boxShadow: 'var(--shadow-card)', marginBottom: 24 }}>
        <SectionLabel>Basic Info</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <Field label="Society Name *" value={form.name} onChange={v => set('name', v)} placeholder="e.g. UNSW Business Society" />
          <Field label="Short Name *" value={form.short_name} onChange={v => set('short_name', v)} placeholder="e.g. UNSW BSoc" />
          <div>
            <label style={labelStyle}>Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle as React.CSSProperties}>
              {SOCIETY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <Field label="University" value={form.university} onChange={v => set('university', v)} placeholder="UNSW" />
          <Field label="Founded Year" value={form.founded_year} onChange={v => set('founded_year', v)} placeholder="e.g. 1988" type="number" />
          <Field label="Approx. Size" value={form.size} onChange={v => set('size', v)} placeholder="e.g. 15000" type="number" />
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe what your society is about..."
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', width: '100%', boxSizing: 'border-box' } as React.CSSProperties}
          />
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: '28px 32px', boxShadow: 'var(--shadow-card)', marginBottom: 24 }}>
        <SectionLabel>Media</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Logo URL" value={form.logo_url} onChange={v => set('logo_url', v)} placeholder="https://..." />
          <Field label="Cover Photo URL" value={form.cover_url} onChange={v => set('cover_url', v)} placeholder="https://..." />
        </div>
        {form.cover_url && (
          <div style={{ marginTop: 16, borderRadius: 8, overflow: 'hidden', height: 140 }}>
            <img src={form.cover_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
          </div>
        )}
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: '28px 32px', boxShadow: 'var(--shadow-card)', marginBottom: 32 }}>
        <SectionLabel>Social Links (optional)</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Instagram URL" value={form.instagram} onChange={v => set('instagram', v)} placeholder="https://instagram.com/..." />
          <Field label="Facebook URL" value={form.facebook} onChange={v => set('facebook', v)} placeholder="https://facebook.com/..." />
          <Field label="LinkedIn URL" value={form.linkedin} onChange={v => set('linkedin', v)} placeholder="https://linkedin.com/..." />
          <Field label="YouTube URL" value={form.youtube} onChange={v => set('youtube', v)} placeholder="https://youtube.com/..." />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <button onClick={handleSubmit} disabled={submitting || success} className="btn-primary" style={{ opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Creating...' : 'Create Society'}
        </button>
        <Link href="/societies" style={{
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
