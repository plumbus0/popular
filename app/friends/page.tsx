'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Image'
import type { Profile, Friendship } from '@/types'

type FriendEntry = {
  friendship: Friendship
  other: Profile
}

export default function FriendsPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Profile | null>(null)
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [incoming, setIncoming] = useState<FriendEntry[]>([])
  const [outgoing, setOutgoing] = useState<FriendEntry[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch friendships using two separate profile queries instead of FK hints
  const fetchFriendships = useCallback(async (userId: string) => {
    const { data: rows, error: fsError } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

    if (fsError) {
      // friendships table might not exist yet
      console.error('friendships fetch error:', fsError.message)
      return
    }
    if (!rows || rows.length === 0) return

    // Collect all other-user IDs
    const otherIds = rows.map((f: Friendship) =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    )

    // Batch fetch the profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', otherIds)

    const profileMap: Record<string, Profile> = {}
    for (const p of (profiles ?? [])) profileMap[p.id] = p as Profile

    const acc: FriendEntry[] = []
    const inc: FriendEntry[] = []
    const out: FriendEntry[] = []

    for (const f of rows as Friendship[]) {
      const otherId = f.requester_id === userId ? f.addressee_id : f.requester_id
      const other = profileMap[otherId]
      if (!other) continue
      const entry: FriendEntry = { friendship: f, other }
      if (f.status === 'accepted') acc.push(entry)
      else if (f.status === 'pending') {
        if (f.addressee_id === userId) inc.push(entry)
        else out.push(entry)
      }
    }

    setFriends(acc)
    setIncoming(inc)
    setOutgoing(out)
  }, [supabase])

  useEffect(() => {
    async function init() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { setLoading(false); return }

        const { data: p, error: profileError } = await supabase
          .from('profiles').select('*').eq('id', user.id).single()

        if (profileError) {
          setError(`Profile error: ${profileError.message}`)
          setLoading(false)
          return
        }
        if (p) setMe(p as Profile)

        await fetchFriendships(user.id)
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [fetchFriendships])

  // Debounced user search
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      if (!me) return
      setSearching(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, university, degree, avatar_url, user_key')
        .or(`full_name.ilike.%${searchQ}%,email.ilike.%${searchQ}%,user_key.ilike.%${searchQ}%`)
        .neq('id', me.id)
        .limit(8)
      setSearchResults((data ?? []) as Profile[])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ, me, supabase])

  const sendRequest = async (toId: string) => {
    if (!me) return
    setActioning(toId)
    const { error: insertError } = await supabase.from('friendships').insert({
      requester_id: me.id,
      addressee_id: toId,
      status: 'pending',
    })
    if (insertError) { alert(insertError.message); setActioning(null); return }
    await fetchFriendships(me.id)
    setSearchResults(prev => prev.filter(p => p.id !== toId))
    setActioning(null)
  }

  const respond = async (friendshipId: string, status: 'accepted' | 'rejected') => {
    if (!me) return
    setActioning(friendshipId)
    await supabase.from('friendships').update({ status }).eq('id', friendshipId)
    await fetchFriendships(me.id)
    setActioning(null)
  }

  const removeFriend = async (friendshipId: string) => {
    if (!me) return
    setActioning(friendshipId)
    await supabase.from('friendships').delete().eq('id', friendshipId)
    await fetchFriendships(me.id)
    setActioning(null)
  }

  const getExistingRelation = (profileId: string): FriendEntry | undefined => {
    return [...friends, ...incoming, ...outgoing].find(
      e => e.other.id === profileId
    )
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-muted)', fontFamily: 'var(--font-haas)' }}>
      Loading...
    </div>
  )

  if (error) return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 24px', fontFamily: 'var(--font-haas)' }}>
      <div style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: 10, padding: '16px 20px' }}>
        <strong>Error loading friends:</strong> {error}
        <br /><br />
        <span style={{ fontSize: '0.875rem' }}>
          Make sure you have run <code>supabase-column-patch.sql</code> in your Supabase SQL Editor to create the friendships table.
        </span>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 60px', fontFamily: 'var(--font-haas)' }}>
      <h1 style={{ fontWeight: 700, fontSize: '2rem', margin: '0 0 28px' }}>Friends</h1>

      {/* ── SEARCH ── */}
      <div style={{ background: 'white', borderRadius: 12, padding: '18px 20px', boxShadow: 'var(--shadow-card)', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Search by name, email or user key..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.95rem', fontFamily: 'var(--font-haas)', background: 'transparent' }}
          />
          {searchQ && (
            <button onClick={() => setSearchQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '1.1rem', padding: 0 }}>×</button>
          )}
        </div>

        {searchQ && (
          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 12, paddingTop: 12 }}>
            {searching ? (
              <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Searching...</div>
            ) : searchResults.length === 0 ? (
              <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>No users found</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searchResults.map(p => {
                  const existing = getExistingRelation(p.id)
                  const isFriend = existing?.friendship.status === 'accepted'
                  const isPending = existing?.friendship.status === 'pending'
                  const isSentByMe = isPending && existing?.friendship.requester_id === me?.id
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Link href={`/users/${p.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <Avatar src={p.avatar_url} name={p.full_name || p.email} size={40} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-navy)' }}>{p.full_name || p.email}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{p.university}{p.degree ? ` · ${p.degree}` : ''}</div>
                        </div>
                      </Link>
                      {isFriend ? (
                        <span style={{ fontSize: '0.8rem', color: '#22C55E', fontWeight: 600 }}>✓ Friends</span>
                      ) : isPending ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 500 }}>
                          {isSentByMe ? 'Requested' : 'Incoming'}
                        </span>
                      ) : (
                        <button onClick={() => sendRequest(p.id)} disabled={actioning === p.id}
                          style={{ padding: '6px 16px', background: 'var(--color-accent-blue)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-haas)' }}>
                          {actioning === p.id ? '...' : '+ Add'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── INCOMING REQUESTS ── */}
      {incoming.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 className="section-title" style={{ marginBottom: 20 }}>Friend Requests ({incoming.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            {incoming.map(({ friendship: f, other }) => (
              <div key={f.id} style={{ background: 'white', borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Link href={`/users/${other.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, textDecoration: 'none', color: 'inherit' }}>
                  <Avatar src={other.avatar_url} name={other.full_name || other.email} size={44} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{other.full_name || other.email}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{other.university}{other.degree ? ` · ${other.degree}` : ''}</div>
                  </div>
                </Link>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => respond(f.id, 'accepted')} disabled={actioning === f.id}
                    style={{ padding: '8px 18px', background: 'var(--color-accent-blue)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-haas)' }}>
                    Accept
                  </button>
                  <button onClick={() => respond(f.id, 'rejected')} disabled={actioning === f.id}
                    style={{ padding: '8px 16px', background: 'none', border: '1.5px solid #ddd', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-haas)', color: 'var(--color-muted)' }}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── OUTGOING REQUESTS ── */}
      {outgoing.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-muted)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sent Requests</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {outgoing.map(({ friendship: f, other }) => (
              <div key={f.id} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Link href={`/users/${other.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, textDecoration: 'none', color: 'inherit' }}>
                  <Avatar src={other.avatar_url} name={other.full_name || other.email} size={38} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{other.full_name || other.email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Request pending</div>
                  </div>
                </Link>
                <button onClick={() => removeFriend(f.id)} disabled={actioning === f.id}
                  style={{ padding: '5px 12px', background: 'none', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer', color: '#999', fontFamily: 'var(--font-haas)' }}>
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── FRIENDS LIST ── */}
      <section>
        <h2 className="section-title" style={{ marginBottom: 20 }}>Your Friends ({friends.length})</h2>
        {friends.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: '40px 24px', textAlign: 'center', color: 'var(--color-muted)', boxShadow: 'var(--shadow-card)', marginTop: 20 }}>
            No friends yet — search above to find people!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 20 }}>
            {friends.map(({ friendship: f, other }) => (
              <div key={f.id} style={{ background: 'white', borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Link href={`/users/${other.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, textDecoration: 'none', color: 'inherit' }}>
                  <Avatar src={other.avatar_url} name={other.full_name || other.email} size={44} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{other.full_name || other.email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{other.university}</div>
                  </div>
                </Link>
                <button onClick={() => removeFriend(f.id)} disabled={actioning === f.id}
                  style={{ padding: '5px 12px', background: 'none', border: '1px solid #eee', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer', color: '#aaa', fontFamily: 'var(--font-haas)' }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
