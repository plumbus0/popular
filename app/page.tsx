import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'var(--font-haas)', minHeight: '100vh', background: '#fff' }}>
      {/* ── NAV ── */}
      <nav style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--color-yellow)',
        padding: '0 40px', height: '64px',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem'
          }}><img src="/logo-placeholder.svg" alt="Popular" style={{ width:22, height:22, objectFit:"contain" }} /></div>
          <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>Popular</span>
        </div>
        <Link href="/auth/login" style={{
          background: 'var(--color-accent-blue)', color: 'white',
          padding: '10px 28px', borderRadius: 8,
          textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem',
          letterSpacing: '0.05em', textTransform: 'uppercase'
        }}>LOG IN</Link>
      </nav>

      {/* ── HERO ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 'calc(100vh - 64px - 300px)' }}>
        {/* Left: image */}
        <div style={{
          background: 'url(https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800) center/cover',
          minHeight: 500
        }} />
        {/* Right: CTA */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '60px 80px 60px 60px', gap: 20
        }}>
          <div style={{ width: 48, height: 5, background: 'var(--color-yellow)', borderRadius: 3, marginBottom: 8 }} />
          <h1 style={{ fontSize: 'clamp(2rem, 3vw, 2.8rem)', fontWeight: 700, lineHeight: 1.1, margin: 0 }}>
            Find your people and never miss a moment again.
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
            Sign up now to join in on all the fun with societies and events,
            affiliated with all universities in Australia
          </p>
          <Link href="/auth/login" className="btn-primary" style={{
            width: 'fit-content', marginTop: 12,
            background: 'var(--color-accent-blue)', color: 'white',
            padding: '14px 40px', borderRadius: 8,
            textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem',
            letterSpacing: '0.05em', textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>SIGN UP</Link>
        </div>
      </section>

      {/* ── SPONSORS ── */}
      <section style={{
        padding: '60px 40px', background: '#FAFAFA',
        textAlign: 'center'
      }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 48 }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.8rem', margin: 0 }}>Our Sponsors</h2>
          <div style={{
            position: 'absolute', bottom: -6, left: '20%', right: '20%',
            height: 4, background: 'var(--color-yellow)', borderRadius: 2
          }} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: '80px', flexWrap: 'wrap'
        }}>
          {[
            { name: 'UNSW Sydney', logo: '🎓', text: 'UNSW\nSYDNEY' },
            { name: 'University of Sydney', logo: '🦁', text: 'THE UNIVERSITY\nOF SYDNEY' },
            { name: 'UTS', logo: '⚙️', text: '❖ UTS' },
          ].map((s) => (
            <div key={s.name} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              color: '#111', fontWeight: 700
            }}>
              <span style={{ fontSize: '2.5rem' }}>{s.logo}</span>
              <span style={{ fontSize: '0.85rem', whiteSpace: 'pre-line', letterSpacing: '0.05em' }}>{s.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: '24px 40px', borderTop: '1px solid var(--color-border)',
        color: 'var(--color-muted)', fontSize: '0.85rem'
      }}>
        © 2026 All Rights Reserved, Popular Inc.
      </footer>
    </div>
  )
}
