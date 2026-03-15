'use client'

import { createClient } from '@/lib/supabase'
import { useState } from 'react'

export default function LoginPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signInWithGoogle = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      minHeight: '100vh', fontFamily: 'var(--font-haas)'
    }}>
      {/* ── LEFT PANEL ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 80px', background: '#F5F5F5'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 52 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: '#1a1a2e',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <img src="/logo-placeholder.svg" alt="Popular" style={{ width: 26, height: 26, objectFit: 'contain' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.3rem' }}>Popular</span>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ width: 48, height: 4, background: 'var(--color-yellow)', borderRadius: 2, marginBottom: 14 }} />
          <h1 style={{ fontWeight: 700, fontSize: '2rem', margin: 0, lineHeight: 1.2 }}>
            Let the fun begin!
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', margin: '10px 0 0', lineHeight: 1.6 }}>
            Sign in to discover societies and events at your university.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: 20, padding: '12px 16px',
            background: '#FEE2E2', color: '#DC2626',
            borderRadius: 8, fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {/* Google button — the only sign-in option */}
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            width: '100%', padding: '15px 24px',
            background: 'white', border: '1.5px solid #ddd',
            borderRadius: 8, fontWeight: 600, fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-haas)',
            opacity: loading ? 0.7 : 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            transition: 'box-shadow 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}
        >
          <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <p style={{ marginTop: 28, fontSize: '0.8rem', color: 'var(--color-muted)', lineHeight: 1.6, textAlign: 'center' }}>
          By signing in you agree to our terms of service and privacy policy.
        </p>
      </div>

      {/* ── RIGHT: Photo ── */}
      <div style={{
        background: 'url(https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900) center/cover no-repeat',
      }} />
    </div>
  )
}
