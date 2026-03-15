'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Image'
import type { Profile } from '@/types'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Profile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('popular_admin_mode')
      if (stored === 'true') setIsAdmin(true)
    } catch (_) { /* localStorage not available */ }

    async function fetchProfile() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) { setDbError(`Auth error: ${authError.message}`); return }
        if (!user) { router.push('/auth/login'); return }

        setUserEmail(user.email ?? '')
        setUserId(user.id)

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (data) {
          setProfile(data as Profile)
          setForm(data as Profile)
        } else {
          // No profile row — create one from auth metadata
          const newProfile: Partial<Profile> = {
            id: user.id,
            email: user.email ?? '',
            full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '',
            avatar_url: user.user_metadata?.avatar_url ?? null,
            university: 'UNSW',
            degree: '',
            stage: '',
            gender: '',
            user_key: Math.random().toString(36).substring(2, 18).toUpperCase(),
            role: 'student',
            show_events_to_friends: true,
            created_at: new Date().toISOString(),
          }

          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert(newProfile)

          if (upsertError) {
            // Upsert failed — still show the page with auth data
            console.error('Profile upsert failed:', upsertError.message)
            setDbError(`Could not save profile: ${upsertError.message}. Check that supabase-column-patch.sql has been run.`)
          }

          setProfile(newProfile as Profile)
          setForm(newProfile as Profile)
        }
      } catch (e) {
        setDbError(String(e))
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const toggleAdmin = () => {
    const next = !isAdmin
    setIsAdmin(next)
    try { localStorage.setItem('popular_admin_mode', String(next)) } catch (_) {}
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update(form).eq('id', userId)
    if (!error) {
      setProfile(prev => ({ ...prev, ...form } as Profile))
      setEditing(false)
    } else {
      alert(`Save failed: ${error.message}`)
    }
    setSaving(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleDelete = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const toggleShowEvents = async () => {
    if (!userId || !profile) return
    const next = !profile.show_events_to_friends
    setProfile(prev => prev ? { ...prev, show_events_to_friends: next } : prev)
    await supabase.from('profiles').update({ show_events_to_friends: next }).eq('id', userId)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-muted)', fontFamily: 'var(--font-haas)' }}>
      Loading...
    </div>
  )

  const displayName = profile?.full_name || userEmail.split('@')[0] || 'Your Account'

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 60px', fontFamily: 'var(--font-haas)' }}>
      <h1 style={{ fontWeight: 700, fontSize: '2rem', margin: '0 0 28px' }}>Account</h1>

      {/* DB error banner */}
      {dbError && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.875rem' }}>
          ⚠️ {dbError}
        </div>
      )}

      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Avatar src={profile?.avatar_url} name={displayName} size={52} color="#4A3FA0" />
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{displayName}</div>
          {userEmail && <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{userEmail}</div>}
        </div>
      </div>

      {/* Info card */}
      <div style={{ background: 'white', borderRadius: 12, padding: '24px 28px', boxShadow: 'var(--shadow-card)', marginBottom: 20 }}>
        {editing ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {([
              { label: 'Full Name',  key: 'full_name',  type: 'text' },
              { label: 'University', key: 'university', type: 'text' },
              { label: 'Degree',     key: 'degree',     type: 'text' },
              { label: 'Birthday',   key: 'birthday',   type: 'date' },
              { label: 'Stage',      key: 'stage',      type: 'text' },
              { label: 'Gender',     key: 'gender',     type: 'text' },
            ] as { label: string; key: keyof Profile; type: string }[]).map(({ label, key, type }) => (
              <div key={key as string}>
                <label style={labelStyle}>{label}</label>
                <input
                  type={type}
                  value={(form[key] as string) ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 36px' }}>
            <InfoRow label="University" value={profile?.university} />
            <InfoRow label="Birthday"   value={profile?.birthday} />
            <InfoRow label="Degree"     value={profile?.degree} />
            <InfoRow label="Gender"     value={profile?.gender} />
            <InfoRow label="Stage"      value={profile?.stage} />
            <InfoRow label="User Key"   value={profile?.user_key} mono />
            <div />
            <InfoRow label="Role" value={
              profile?.role === 'student' ? 'Student, Non-Admin'
              : profile?.role === 'admin' ? 'Admin'
              : profile?.role ?? 'Student'
            } />
          </div>
        )}
      </div>

      {/* Privacy toggle */}
      <div style={{
        background: 'white', borderRadius: 12, padding: '16px 22px',
        boxShadow: 'var(--shadow-card)', marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: '1px solid var(--color-border)'
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 3 }}>Share events with friends</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
            {profile?.show_events_to_friends
              ? 'Friends can see your registered events.'
              : 'Your registered events are hidden from friends.'}
          </div>
        </div>
        <Toggle on={!!profile?.show_events_to_friends} onToggle={toggleShowEvents} color="var(--color-accent-blue)" />
      </div>

      {/* Admin mode card */}
      <div style={{
        background: isAdmin ? '#1a1a2e' : 'white',
        borderRadius: 12, padding: '18px 22px',
        boxShadow: 'var(--shadow-card)', marginBottom: 24,
        transition: 'background 0.25s',
        border: isAdmin ? 'none' : '1px solid var(--color-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: isAdmin ? 'var(--color-yellow)' : 'var(--color-navy)', marginBottom: 4 }}>
              Admin Mode
            </div>
            <div style={{ fontSize: '0.82rem', color: isAdmin ? 'rgba(255,255,255,0.55)' : 'var(--color-muted)' }}>
              {isAdmin ? 'Create and manage societies and events.' : 'Enable to create societies and events.'}
            </div>
          </div>
          <Toggle on={isAdmin} onToggle={toggleAdmin} color="var(--color-yellow)" />
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Link href="/admin/create-society" style={{ flex: 1, padding: '9px 0', background: 'var(--color-yellow)', color: '#111', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem', textAlign: 'center', display: 'block' }}>
              + Create Society
            </Link>
            <Link href="/admin/create-event" style={{ flex: 1, padding: '9px 0', background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem', textAlign: 'center', display: 'block', border: '1px solid rgba(255,255,255,0.2)' }}>
              + Create Event
            </Link>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {editing ? (
          <>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => { setEditing(false); if (profile) setForm(profile) }} style={secondaryBtn}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="btn-primary">Edit Profile</button>
            <button onClick={handleSignOut} style={{ ...secondaryBtn, background: 'var(--color-navy)', color: 'white', border: 'none', fontWeight: 700 }}>
              Sign Out
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger">Delete Profile</button>
          </>
        )}
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 32, maxWidth: 400, width: '90%', textAlign: 'center' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Delete Profile?</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: 24 }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={secondaryBtn}>Cancel</button>
              <button onClick={handleDelete} className="btn-danger">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Reusable toggle switch ─────────────────────────────────────────────────────
function Toggle({ on, onToggle, color = 'var(--color-yellow)' }: { on: boolean; onToggle: () => void; color?: string }) {
  return (
    <button onClick={onToggle} style={{
      width: 50, height: 26, borderRadius: 13,
      background: on ? color : '#ccc',
      border: 'none', cursor: 'pointer', position: 'relative',
      transition: 'background 0.2s', flexShrink: 0, padding: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 26 : 3,
        width: 20, height: 20, borderRadius: '50%', background: 'white',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
      }} />
    </button>
  )
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!label) return <div />
  return (
    <div>
      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: '0.92rem', fontFamily: mono ? 'monospace' : 'var(--font-haas)', wordBreak: 'break-all' }}>
        {value || '—'}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: 5, fontWeight: 500
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 11px',
  border: '1px solid #E5E5E5', borderRadius: 7,
  fontSize: '0.9rem', fontFamily: 'var(--font-haas)',
  outline: 'none', boxSizing: 'border-box'
}
const secondaryBtn: React.CSSProperties = {
  padding: '10px 22px', background: 'none',
  border: '1.5px solid #E5E5E5', borderRadius: 8,
  fontWeight: 600, cursor: 'pointer',
  fontFamily: 'var(--font-haas)', fontSize: '0.875rem'
}
