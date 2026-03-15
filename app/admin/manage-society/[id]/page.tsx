'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Avatar, CoverImage } from '@/components/ui/Image'
import { EVENT_CATEGORIES } from '@/lib/constants'
import type { Society, TeamMember, Profile, Event, EventRegistration } from '@/types'

const ROLE_PRESETS = [
  'President', 'Co-President', 'Vice-President', 'Secretary',
  'Treasurer', 'Marketing Director', 'Events Director',
  'Academic Director', 'IT Director', 'General Member',
]
const SOCIETY_TYPES = ['Academic', 'Cultural', 'Hobbies', 'Sports', 'Professional']
type Tab = 'details' | 'team' | 'events'

export default function ManageSocietyPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('details')
  const [society, setSociety] = useState<Society | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteSociety, setShowDeleteSociety] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Society edit form
  const [form, setForm] = useState<Partial<Society>>({})

  // Team management
  const [memberSearch, setMemberSearch] = useState('')
  const [memberResults, setMemberResults] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [newRole, setNewRole] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [searchingUser, setSearchingUser] = useState(false)
  const [memberSaving, setMemberSaving] = useState<string | null>(null)

  // Event attendees
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [attendees, setAttendees] = useState<EventRegistration[]>([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)

  const fetchTeam = useCallback(async () => {
    const { data } = await supabase
      .from('team_members').select('*, profile:profiles(*)')
      .eq('society_id', id as string).order('created_at')
    if (data) setTeam(data as TeamMember[])
  }, [id, supabase])

  useEffect(() => {
    if (localStorage.getItem('popular_admin_mode') !== 'true') { router.push('/profile'); return }
    async function init() {
      try {
        const { data: soc } = await supabase.from('societies').select('*').eq('id', id).single()
        if (soc) { setSociety(soc as Society); setForm(soc as Society) }
        const { data: evData } = await supabase.from('events').select('*').eq('society_id', id).order('date')
        if (evData) setEvents(evData as Event[])
        await fetchTeam()
      } finally { setLoading(false) }
    }
    init()
  }, [id, fetchTeam])

  // User search for team
  useEffect(() => {
    if (!memberSearch.trim()) { setMemberResults([]); return }
    const t = setTimeout(async () => {
      setSearchingUser(true)
      const { data } = await supabase.from('profiles').select('*')
        .or(`full_name.ilike.%${memberSearch}%,email.ilike.%${memberSearch}%,user_key.ilike.%${memberSearch}%`).limit(6)
      setMemberResults((data ?? []) as Profile[])
      setSearchingUser(false)
    }, 300)
    return () => clearTimeout(t)
  }, [memberSearch, supabase])

  // Save society details
  const saveSociety = async () => {
    setSaving(true)
    const { error } = await supabase.from('societies').update(form).eq('id', id as string)
    if (error) alert(`Save failed: ${error.message}`)
    else setSociety(prev => ({ ...prev, ...form } as Society))
    setSaving(false)
  }

  const deleteSociety = async () => {
    setDeleting(true)
    const { error } = await supabase.from('societies').delete().eq('id', id as string)
    if (error) { alert(`Delete failed: ${error.message}`); setDeleting(false); return }
    router.push('/societies')
  }

  // Team actions
  const addMember = async () => {
    if (!selectedUser) return
    const roleToUse = newRole === '__custom__' ? customRole : newRole
    if (!roleToUse.trim()) return
    setAddingMember(true)
    await supabase.from('team_members').insert({
      society_id: id as string, user_id: selectedUser.id,
      name: selectedUser.full_name || selectedUser.email,
      role: roleToUse, avatar_color: `hsl(${Math.floor(Math.random() * 360)}, 60%, 50%)`,
    })
    await fetchTeam()
    setSelectedUser(null); setMemberSearch(''); setNewRole(''); setCustomRole('')
    setAddingMember(false)
  }

  const removeMember = async (memberId: string) => {
    setMemberSaving(memberId)
    await supabase.from('team_members').delete().eq('id', memberId)
    await fetchTeam()
    setMemberSaving(null)
  }

  const updateRole = async (memberId: string, role: string) => {
    setMemberSaving(memberId)
    await supabase.from('team_members').update({ role }).eq('id', memberId)
    await fetchTeam()
    setMemberSaving(null)
  }

  // Event attendees
  const loadAttendees = async (eventId: string) => {
    if (selectedEventId === eventId) { setSelectedEventId(null); setAttendees([]); return }
    setSelectedEventId(eventId)
    setLoadingAttendees(true)
    const { data } = await supabase.from('event_registrations')
      .select('*, profile:profiles(*)')
      .eq('event_id', eventId)
      .order('created_at')
    setAttendees((data ?? []) as EventRegistration[])
    setLoadingAttendees(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-muted)' }}>Loading...</div>
  )

  const effectiveRole = newRole === '__custom__' ? customRole : newRole

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px 60px', fontFamily: 'var(--font-haas)' }}>
      <Link href={`/societies/${id}`} style={{ color: 'var(--color-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>
        ← Back to {society?.short_name}
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 24px' }}>
        <span style={{ background: 'var(--color-yellow)', borderRadius: 6, padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin</span>
        <h1 style={{ fontWeight: 700, fontSize: '1.7rem', margin: 0 }}>Manage Society</h1>
      </div>
      {society && <div style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: -16, marginBottom: 28 }}>{society.name}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: '#F0F0F0', borderRadius: 10, padding: 4 }}>
        {([['details', 'Society Details'], ['team', 'Team Members'], ['events', 'Events & Attendees']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-haas)', fontWeight: tab === t ? 700 : 500, fontSize: '0.875rem',
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? 'var(--color-navy)' : 'var(--color-muted)',
            boxShadow: tab === t ? 'var(--shadow-card)' : 'none',
            transition: 'all 0.15s'
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: SOCIETY DETAILS ── */}
      {tab === 'details' && (
        <div style={{ background: 'white', borderRadius: 12, padding: '24px 28px', boxShadow: 'var(--shadow-card)' }}>
          <SectionLabel>Basic Info</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
            <Field label="Society Name *" value={form.name ?? ''} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="UNSW Business Society" />
            <Field label="Short Name *" value={form.short_name ?? ''} onChange={v => setForm(p => ({ ...p, short_name: v }))} placeholder="UNSW BSoc" />
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.type ?? ''} onChange={e => setForm(p => ({ ...p, type: e.target.value as Society['type'] }))} style={inputStyle as React.CSSProperties}>
                <option value="">Select type…</option>
                {SOCIETY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Field label="University" value={form.university ?? ''} onChange={v => setForm(p => ({ ...p, university: v }))} placeholder="UNSW" />
            <Field label="Founded Year" value={form.founded_year?.toString() ?? ''} onChange={v => setForm(p => ({ ...p, founded_year: Number(v) || undefined }))} placeholder="1988" type="number" />
            <Field label="Approx. Size" value={form.size?.toString() ?? ''} onChange={v => setForm(p => ({ ...p, size: Number(v) || 0 }))} placeholder="15000" type="number" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description ?? ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={4} placeholder="What is your society about?"
              style={{ ...inputStyle, resize: 'vertical', width: '100%', boxSizing: 'border-box' } as React.CSSProperties} />
          </div>
          <SectionLabel>Media</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
            <Field label="Logo URL" value={form.logo_url ?? ''} onChange={v => setForm(p => ({ ...p, logo_url: v }))} placeholder="https://…" />
            <Field label="Cover Photo URL" value={form.cover_url ?? ''} onChange={v => setForm(p => ({ ...p, cover_url: v }))} placeholder="https://…" />
          </div>
          {form.cover_url && (
            <div style={{ borderRadius: 8, overflow: 'hidden', height: 130, marginBottom: 20 }}>
              <CoverImage src={form.cover_url} height={130} fallback="society" />
            </div>
          )}
          <SectionLabel>Social Links</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 28 }}>
            <Field label="Instagram" value={form.instagram ?? ''} onChange={v => setForm(p => ({ ...p, instagram: v }))} placeholder="https://instagram.com/…" />
            <Field label="Facebook" value={form.facebook ?? ''} onChange={v => setForm(p => ({ ...p, facebook: v }))} placeholder="https://facebook.com/…" />
            <Field label="LinkedIn" value={form.linkedin ?? ''} onChange={v => setForm(p => ({ ...p, linkedin: v }))} placeholder="https://linkedin.com/…" />
            <Field label="YouTube" value={form.youtube ?? ''} onChange={v => setForm(p => ({ ...p, youtube: v }))} placeholder="https://youtube.com/…" />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={saveSociety} disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button onClick={() => setShowDeleteSociety(true)}
              style={{ padding: '10px 22px', background: 'none', border: '1.5px solid #EF4444', borderRadius: 8, color: '#EF4444', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-haas)' }}>
              Delete Society
            </button>
          </div>

          {/* ── Delete Society Confirm Modal ── */}
          {showDeleteSociety && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
              <div style={{ background: 'white', borderRadius: 14, padding: 32, maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12, textAlign: 'center' }}>⚠️</div>
                <h3 style={{ fontWeight: 800, fontSize: '1.2rem', margin: '0 0 10px', textAlign: 'center' }}>Delete &ldquo;{society?.name}&rdquo;?</h3>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', textAlign: 'center', margin: '0 0 8px', lineHeight: 1.6 }}>
                  This will permanently delete the society and <strong>all its events, team members, and memberships</strong>. This cannot be undone.
                </p>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.82rem', textAlign: 'center', margin: '0 0 24px' }}>
                  Type <strong>{society?.short_name}</strong> to confirm.
                </p>
                <DeleteConfirmInput
                  expected={society?.short_name ?? ''}
                  onConfirm={deleteSociety}
                  onCancel={() => setShowDeleteSociety(false)}
                  deleting={deleting}
                  label="Delete Society"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: TEAM ── */}
      {tab === 'team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Add member */}
          <div style={{ background: 'white', borderRadius: 12, padding: '22px 26px', boxShadow: 'var(--shadow-card)' }}>
            <SectionLabel>Add Team Member</SectionLabel>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Search user</label>
              <div style={{ position: 'relative' }}>
                <input value={selectedUser ? (selectedUser.full_name || selectedUser.email) : memberSearch}
                  onChange={e => { setMemberSearch(e.target.value); setSelectedUser(null) }}
                  placeholder="Name, email or user key…" style={inputStyle} />
                {selectedUser && (
                  <button onClick={() => { setSelectedUser(null); setMemberSearch('') }}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '1.1rem' }}>×</button>
                )}
              </div>
              {memberSearch && !selectedUser && (
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, marginTop: 4, overflow: 'hidden', background: 'white', boxShadow: 'var(--shadow-elevated)' }}>
                  {searchingUser ? (
                    <div style={{ padding: '10px 14px', color: 'var(--color-muted)', fontSize: '0.875rem' }}>Searching…</div>
                  ) : memberResults.length === 0 ? (
                    <div style={{ padding: '10px 14px', color: 'var(--color-muted)', fontSize: '0.875rem' }}>No users found</div>
                  ) : memberResults.map(p => (
                    <div key={p.id} onClick={() => { setSelectedUser(p); setMemberSearch('') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F5')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <Avatar src={p.avatar_url} name={p.full_name || p.email} size={30} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.full_name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{p.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: '8px 12px', background: '#F0F9FF', borderRadius: 8, border: '1px solid #BAE6FD' }}>
                  <Avatar src={selectedUser.avatar_url} name={selectedUser.full_name || selectedUser.email} size={30} />
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedUser.full_name}</div>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Role</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: newRole === '__custom__' ? 10 : 0 }}>
                {ROLE_PRESETS.map(r => (
                  <button key={r} onClick={() => setNewRole(r)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, border: '1.5px solid', cursor: 'pointer', fontFamily: 'var(--font-haas)', background: newRole === r ? 'var(--color-navy)' : 'white', color: newRole === r ? 'white' : 'var(--color-navy)', borderColor: newRole === r ? 'var(--color-navy)' : '#ddd' }}>{r}</button>
                ))}
                <button onClick={() => setNewRole('__custom__')} style={{ padding: '5px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, border: '1.5px solid', cursor: 'pointer', fontFamily: 'var(--font-haas)', background: newRole === '__custom__' ? 'var(--color-yellow)' : 'white', color: 'var(--color-navy)', borderColor: newRole === '__custom__' ? 'var(--color-yellow)' : '#ddd' }}>+ Custom</button>
              </div>
              {newRole === '__custom__' && <input value={customRole} onChange={e => setCustomRole(e.target.value)} placeholder="Enter custom role…" style={{ ...inputStyle, marginTop: 8 }} />}
            </div>
            <button onClick={addMember} disabled={!selectedUser || !effectiveRole.trim() || addingMember}
              style={{ padding: '10px 26px', background: 'var(--color-accent-blue)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem', cursor: (!selectedUser || !effectiveRole.trim()) ? 'not-allowed' : 'pointer', opacity: (!selectedUser || !effectiveRole.trim()) ? 0.5 : 1, fontFamily: 'var(--font-haas)' }}>
              {addingMember ? 'Adding…' : 'Add to Team'}
            </button>
          </div>

          {/* Current team */}
          <div style={{ background: 'white', borderRadius: 12, padding: '22px 26px', boxShadow: 'var(--shadow-card)' }}>
            <SectionLabel>Current Team ({team.length})</SectionLabel>
            {team.length === 0 ? (
              <div style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '28px 0', fontSize: '0.9rem' }}>No team members yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {team.map(member => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F9F9F9', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                    <Avatar src={member.profile?.avatar_url} name={member.name} size={40} color={member.avatar_color || '#888'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{member.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{member.profile?.email}</div>
                    </div>
                    <select defaultValue={member.role} onChange={e => updateRole(member.id, e.target.value)} disabled={memberSaving === member.id}
                      style={{ padding: '5px 8px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.8rem', fontFamily: 'var(--font-haas)', outline: 'none', background: 'white' }}>
                      {ROLE_PRESETS.map(r => <option key={r} value={r}>{r}</option>)}
                      {!ROLE_PRESETS.includes(member.role) && <option value={member.role}>{member.role}</option>}
                    </select>
                    <button onClick={() => removeMember(member.id)} disabled={memberSaving === member.id}
                      style={{ padding: '5px 12px', background: 'none', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer', color: '#C0645A', fontWeight: 600, fontFamily: 'var(--font-haas)' }}>
                      {memberSaving === member.id ? '…' : 'Remove'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: EVENTS & ATTENDEES ── */}
      {tab === 'events' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: 0 }}>Click an event to manage details or view attendee registrations.</p>
            <Link href="/admin/create-event" style={{ padding: '8px 18px', background: 'var(--color-yellow)', color: 'var(--color-navy)', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: '0.82rem' }}>+ New Event</Link>
          </div>
          {events.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 12, padding: '36px 24px', textAlign: 'center', color: 'var(--color-muted)', boxShadow: 'var(--shadow-card)' }}>No events yet.</div>
          ) : events.map(ev => (
            <div key={ev.id}>
              <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ev.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: 2 }}>
                    {ev.date}{ev.location ? ` · ${ev.location}` : ''}{ev.category ? ` · ${ev.category}` : ''}
                  </div>
                </div>
                <Link href={`/admin/edit-event/${ev.id}`}
                  style={{ padding: '6px 14px', background: '#F5F5F5', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none', color: 'var(--color-navy)' }}>
                  Edit
                </Link>
                <button onClick={() => loadAttendees(ev.id)}
                  style={{ padding: '6px 14px', background: selectedEventId === ev.id ? 'var(--color-navy)' : 'var(--color-yellow)', color: selectedEventId === ev.id ? 'white' : 'var(--color-navy)', border: 'none', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-haas)' }}>
                  {selectedEventId === ev.id ? 'Hide' : 'Attendees'}
                </button>
              </div>

              {/* Attendee panel */}
              {selectedEventId === ev.id && (
                <div style={{ background: '#F9F9F9', borderRadius: '0 0 12px 12px', padding: '16px 20px', border: '1px solid var(--color-border)', borderTop: 'none' }}>
                  {loadingAttendees ? (
                    <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Loading…</div>
                  ) : attendees.length === 0 ? (
                    <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>No registrations yet.</div>
                  ) : (
                    <>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 12 }}>
                        {attendees.length} Registration{attendees.length !== 1 ? 's' : ''}
                      </div>
                      {/* Table header */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px 100px 140px', gap: 8, padding: '6px 10px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--color-border)', marginBottom: 6 }}>
                        <span>Attendee</span><span>Student ID</span><span>Email</span><span>Ticket</span><span>Dietary</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {attendees.map(reg => (
                          <div key={reg.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px 100px 140px', gap: 8, padding: '8px 10px', background: 'white', borderRadius: 8, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Avatar src={reg.profile?.avatar_url} name={reg.attendee_name || reg.profile?.full_name || ''} size={28} />
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{reg.attendee_name || reg.profile?.full_name || '—'}</div>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#333' }}>{reg.student_id || '—'}</div>
                            <div style={{ fontSize: '0.78rem', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reg.attendee_email || reg.profile?.email || '—'}</div>
                            <div style={{ fontSize: '0.78rem' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 10, background: reg.ticket_type === 'arc' ? '#DBEAFE' : '#F3F4F6', color: reg.ticket_type === 'arc' ? '#1E40AF' : '#374151', fontWeight: 600 }}>
                                {reg.ticket_type === 'arc' ? 'Arc' : 'Non-Arc'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: reg.dietary ? '#333' : 'var(--color-muted)' }}>{reg.dietary || 'None'}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
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

// ── Reusable typed-confirm delete widget ─────────────────────────────────────
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
