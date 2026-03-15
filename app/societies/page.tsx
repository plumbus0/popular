'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Image'
import type { Society, SocietyMembership } from '@/types'

const TYPES = ['Academic', 'Cultural', 'Hobbies', 'Sports', 'Professional']
const SIZE_RANGES = [
  { label: '0–100',       min: 0,     max: 100 },
  { label: '100–1000',    min: 100,   max: 1000 },
  { label: '1000–5000',   min: 1000,  max: 5000 },
  { label: '5000–10000',  min: 5000,  max: 10000 },
  { label: '10000+',      min: 10000, max: Infinity },
]

export default function SocietiesPage() {
  const supabase = createClient()
  const [allSocieties, setAllSocieties] = useState<Society[]>([])
  const [yourSocieties, setYourSocieties] = useState<SocietyMembership[]>([])
  const [suggested, setSuggested] = useState<Society[]>([])
  const [search, setSearch] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: all } = await supabase.from('societies').select('*').order('name')
      if (all) { setAllSocieties(all); setSuggested(all.slice(0, 4)) }
      if (user) {
        const { data: mem } = await supabase
          .from('society_memberships').select('*, society:societies(*)')
          .eq('user_id', user.id)
        if (mem) setYourSocieties(mem)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const toggleType = (t: string) =>
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const toggleSize = (label: string) =>
    setSelectedSizes(prev => prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label])

  const filtered = allSocieties.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.short_name.toLowerCase().includes(q)
    const matchType = selectedTypes.length === 0 || selectedTypes.includes(s.type)
    const matchSize = selectedSizes.length === 0 || selectedSizes.some(label => {
      const range = SIZE_RANGES.find(r => r.label === label)
      return range ? (s.size >= range.min && s.size < range.max) : true
    })
    return matchSearch && matchType && matchSize
  })

  const ActiveChip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'var(--color-navy)', color:'white', fontSize:'0.75rem', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>
      {label}
      <button onClick={onRemove} style={{ background:'none', border:'none', color:'white', cursor:'pointer', padding:0, lineHeight:1, fontSize:'1rem' }}>×</button>
    </span>
  )

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--color-muted)' }}>Loading...</div>
  )

  return (
    <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px 60px' }}>
      <h1 style={{ fontWeight:700, fontSize:'2rem', margin:'0 0 28px' }}>Societies</h1>

      {/* Suggested */}
      <section style={{ marginBottom:36 }}>
        <h2 className="section-title" style={{ marginBottom:20 }}>Suggested Societies</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginTop:24 }}>
          {suggested.map(s => (
            <Link key={s.id} href={`/societies/${s.id}`} style={{ textDecoration:'none' }}>
              <div className="society-card">
                <Avatar src={s.logo_url} name={s.short_name} size={36} color="#D9D9D9" />
                <span style={{ fontWeight:500, fontSize:'0.875rem', color:'var(--color-navy)' }}>{s.short_name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Your Societies */}
      {yourSocieties.length > 0 && (
        <section style={{ marginBottom:36 }}>
          <h2 className="section-title" style={{ marginBottom:20 }}>Your Societies ({yourSocieties.length})</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginTop:24 }}>
            {yourSocieties.map(mem => (
              <Link key={mem.id} href={`/societies/${mem.society_id}`} style={{ textDecoration:'none' }}>
                <div className="society-card">
                  <Avatar src={mem.society?.logo_url} name={mem.society?.short_name} size={36} color="#D9D9D9" />
                  <span style={{ fontWeight:500, fontSize:'0.875rem', color:'var(--color-navy)' }}>{mem.society?.short_name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All Societies */}
      <section>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          <h2 className="section-title">All Societies ({filtered.length})</h2>
          {[...selectedTypes, ...selectedSizes].map(label => (
            <ActiveChip key={label} label={label}
              onRemove={() => { toggleType(label); toggleSize(label) }} />
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:24, marginTop:24 }}>
          {/* Filter */}
          <div style={{ background:'white', borderRadius:12, padding:'20px 16px', alignSelf:'start', boxShadow:'var(--shadow-card)' }}>
            <div style={{ fontWeight:700, marginBottom:12 }}>Filter</div>
            <input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--color-border)', borderRadius:6, fontSize:'0.85rem', fontFamily:'var(--font-haas)', outline:'none', boxSizing:'border-box', marginBottom:16 }}
            />
            <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--color-muted)', marginBottom:8 }}>TYPES</div>
            {TYPES.map(t => (
              <div key={t} onClick={() => toggleType(t)} style={{
                fontSize:'0.875rem', cursor:'pointer', padding:'4px 0',
                fontWeight: selectedTypes.includes(t) ? 700 : 400,
                color: selectedTypes.includes(t) ? 'var(--color-navy)' : '#444',
                display:'flex', alignItems:'center', gap:8
              }}>
                <span style={{
                  width:14, height:14, borderRadius:3, border:'1.5px solid',
                  borderColor: selectedTypes.includes(t) ? 'var(--color-navy)' : '#ccc',
                  background: selectedTypes.includes(t) ? 'var(--color-navy)' : 'transparent',
                  display:'inline-block', flexShrink:0
                }} />
                {t}
              </div>
            ))}
            <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--color-muted)', margin:'16px 0 8px' }}>SIZE</div>
            {SIZE_RANGES.map(r => (
              <div key={r.label} onClick={() => toggleSize(r.label)} style={{
                fontSize:'0.875rem', cursor:'pointer', padding:'4px 0',
                fontWeight: selectedSizes.includes(r.label) ? 700 : 400,
                color: selectedSizes.includes(r.label) ? 'var(--color-navy)' : '#444',
                display:'flex', alignItems:'center', gap:8
              }}>
                <span style={{
                  width:14, height:14, borderRadius:3, border:'1.5px solid',
                  borderColor: selectedSizes.includes(r.label) ? 'var(--color-navy)' : '#ccc',
                  background: selectedSizes.includes(r.label) ? 'var(--color-navy)' : 'transparent',
                  display:'inline-block', flexShrink:0
                }} />
                {r.label}
              </div>
            ))}
            {(selectedTypes.length > 0 || selectedSizes.length > 0) && (
              <button onClick={() => { setSelectedTypes([]); setSelectedSizes([]) }}
                style={{ marginTop:16, width:'100%', padding:'6px', background:'none', border:'1px solid #ddd', borderRadius:6, fontSize:'0.8rem', cursor:'pointer', color:'var(--color-muted)', fontFamily:'var(--font-haas)' }}>
                Clear all
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, alignContent:'start' }}>
            {filtered.map(s => (
              <Link key={s.id} href={`/societies/${s.id}`} style={{ textDecoration:'none' }}>
                <div className="society-card">
                  <Avatar src={s.logo_url} name={s.short_name} size={36} color="#D9D9D9" />
                  <div>
                    <div style={{ fontWeight:500, fontSize:'0.875rem', color:'var(--color-navy)' }}>{s.short_name}</div>
                    <div style={{ fontSize:'0.72rem', color:'var(--color-muted)' }}>{s.size ? s.size.toLocaleString() + ' members' : ''}</div>
                  </div>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn:'1/-1', color:'var(--color-muted)', padding:'40px 0', textAlign:'center' }}>No societies found.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
