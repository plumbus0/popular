'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CoverImage } from '@/components/ui/Image'
import type { Event, Profile } from '@/types'

type Step = 'details' | 'payment' | 'success'

function CheckoutInner() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const ticketType = (searchParams.get('ticket') ?? 'non_arc') as 'arc' | 'non_arc'
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [step, setStep] = useState<Step>('details')
  const [processing, setProcessing] = useState(false)
  const [loading, setLoading] = useState(true)

  const [details, setDetails] = useState({
    full_name: '', student_id: '', email: '', phone: '', dietary: '',
  })
  const [payment, setPayment] = useState({
    card_number: '', card_name: '', expiry: '', cvv: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }

        const [{ data: ev }, { data: p }] = await Promise.all([
          supabase.from('events').select('*, society:societies(*)').eq('id', id as string).single(),
          supabase.from('profiles').select('*').eq('id', user.id).single(),
        ])
        if (ev) setEvent(ev as Event)
        if (p) {
          const prof = p as Profile
          setDetails(prev => ({
            ...prev,
            full_name: prof.full_name ?? '',
            email: prof.email ?? '',
          }))
        }

        const { data: reg } = await supabase.from('event_registrations')
          .select('id').eq('user_id', user.id).eq('event_id', id as string).maybeSingle()
        if (reg) { router.push(`/events/${id}`); return }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id])

  const price = ticketType === 'arc'
    ? Number(event?.arc_member_price ?? 0)
    : Number(event?.non_arc_member_price ?? 0)
  const isFree = price === 0

  const validateDetails = () => {
    const e: Record<string, string> = {}
    if (!details.full_name.trim()) e.full_name = 'Required'
    if (!details.student_id.trim()) e.student_id = 'Required'
    if (!details.email.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) e.email = 'Invalid email'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validatePayment = () => {
    const e: Record<string, string> = {}
    if (payment.card_number.replace(/\s/g, '').length < 13) e.card_number = 'Invalid card number'
    if (!payment.card_name.trim()) e.card_name = 'Required'
    if (!/^\d{2}\/\d{2}$/.test(payment.expiry)) e.expiry = 'Use MM/YY'
    if (payment.cvv.length < 3) e.cvv = 'Invalid CVV'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleDetailsNext = () => {
    if (!validateDetails()) return
    if (isFree) handleConfirm()
    else setStep('payment')
  }

  const handleConfirm = async () => {
    setProcessing(true)
    if (!isFree) await new Promise(r => setTimeout(r, 1800)) // simulate payment
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setProcessing(false); return }
    await supabase.from('event_registrations').insert({
      user_id: user.id,
      event_id: id as string,
      ticket_type: ticketType,
      attendee_name: details.full_name,
      student_id: details.student_id,
      attendee_email: details.email,
      phone: details.phone || null,
      dietary: details.dietary || null,
    })
    setProcessing(false)
    setStep('success')
  }

  const handlePay = () => {
    if (!validatePayment()) return
    handleConfirm()
  }

  const formatCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4)
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-muted)' }}>Loading...</div>
  )
  if (!event) return <div style={{ padding: 40 }}>Event not found.</div>

  // ── SUCCESS ───────────────────────────────────────────────────────────────────
  if (step === 'success') return (
    <div style={{ maxWidth: 520, margin: '80px auto', padding: '0 24px', textAlign: 'center', fontFamily: 'var(--font-haas)' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: 20 }}>🎉</div>
      <h1 style={{ fontWeight: 800, fontSize: '1.8rem', margin: '0 0 12px' }}>You&apos;re in!</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: '1rem', marginBottom: 8 }}>
        {isFree ? 'Registration confirmed!' : `Payment of $${price.toFixed(2)} was successful.`}
      </p>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: 32 }}>
        Your ticket for <strong>{event.title}</strong> is confirmed. A confirmation was sent to <strong>{details.email}</strong>.
      </p>
      <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 12, padding: '20px 24px', marginBottom: 32, textAlign: 'left' }}>
        <div style={{ fontWeight: 700, marginBottom: 12, color: '#166534', fontSize: '0.9rem' }}>Booking Summary</div>
        {([
          ['Event', event.title],
          ['Date', event.date],
          ['Location', event.location || 'TBA'],
          ['Ticket', ticketType === 'arc' ? 'Arc Member' : 'Non-Arc Member'],
          ['Name', details.full_name],
          ['Student ID', details.student_id],
          ...(details.dietary ? [['Dietary', details.dietary]] : []),
          ['Amount', isFree ? 'FREE' : `$${price.toFixed(2)} AUD`],
        ] as [string, string][]).map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
            <span style={{ color: '#4B5563' }}>{label}</span>
            <span style={{ fontWeight: 600, maxWidth: '60%', textAlign: 'right' }}>{val}</span>
          </div>
        ))}
      </div>
      <Link href={`/events/${id}`} style={{ display: 'inline-block', padding: '12px 32px', background: 'var(--color-accent-blue)', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        View Event
      </Link>
    </div>
  )

  const totalSteps = isFree ? 1 : 2

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 60px', fontFamily: 'var(--font-haas)' }}>
      <Link href={`/events/${id}`} style={{ color: 'var(--color-muted)', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        ← Back to event
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32 }}>
        {/* LEFT */}
        <div>
          {/* Progress bar */}
          {!isFree && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
              {(['details', 'payment'] as Step[]).map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i === 0 ? 1 : 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
                    background: step === s ? 'var(--color-accent-blue)' : (step === 'payment' && s === 'details') ? '#22C55E' : '#E5E5E5',
                    color: step === s || (step === 'payment' && s === 'details') ? 'white' : '#999',
                  }}>
                    {step === 'payment' && s === 'details' ? '✓' : i + 1}
                  </div>
                  <span style={{ marginLeft: 8, fontSize: '0.85rem', fontWeight: step === s ? 700 : 400, color: step === s ? 'var(--color-navy)' : 'var(--color-muted)' }}>
                    {s === 'details' ? 'Your Details' : 'Payment'}
                  </span>
                  {i === 0 && <div style={{ flex: 1, height: 2, background: step === 'payment' ? '#22C55E' : '#E5E5E5', margin: '0 16px' }} />}
                </div>
              ))}
            </div>
          )}

          {/* ── DETAILS STEP ── */}
          {step === 'details' && (
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '1.4rem', margin: '0 0 6px' }}>Your Details</h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: '0 0 24px' }}>
                {isFree ? 'Complete your registration for this free event.' : 'Tell us about yourself before payment.'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <Field label="Full Name *" value={details.full_name} onChange={v => setDetails(p => ({ ...p, full_name: v }))} error={errors.full_name} placeholder="As per student card" />
                <Field label="Student ID *" value={details.student_id} onChange={v => setDetails(p => ({ ...p, student_id: v }))} error={errors.student_id} placeholder="e.g. z5123456" />
                <Field label="Email *" value={details.email} onChange={v => setDetails(p => ({ ...p, email: v }))} error={errors.email} placeholder="your@email.com" type="email" />
                <Field label="Phone" value={details.phone} onChange={v => setDetails(p => ({ ...p, phone: v }))} placeholder="+61 4XX XXX XXX" type="tel" />
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="Dietary / Accessibility Requirements" value={details.dietary} onChange={v => setDetails(p => ({ ...p, dietary: v }))} placeholder="e.g. vegetarian, halal, wheelchair access…" />
                </div>
              </div>
              <button onClick={handleDetailsNext} disabled={processing} style={{
                marginTop: 28, padding: '13px 36px', background: 'var(--color-accent-blue)', color: 'white',
                border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem',
                cursor: processing ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-haas)',
                display: 'flex', alignItems: 'center', gap: 10, opacity: processing ? 0.7 : 1
              }}>
                {processing ? <><Spinner /> Confirming...</> : isFree ? 'Confirm Registration' : 'Continue to Payment →'}
              </button>
            </div>
          )}

          {/* ── PAYMENT STEP ── */}
          {step === 'payment' && (
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '1.4rem', margin: '0 0 6px' }}>Payment</h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: '0 0 20px' }}>
                Your card will be charged <strong>${price.toFixed(2)} AUD</strong>
              </p>
              {/* Card visual */}
              <div style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #4A3FA0 100%)',
                borderRadius: 16, padding: '22px 26px', marginBottom: 24, color: 'white',
                boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
              }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.65, marginBottom: 20, letterSpacing: '0.12em' }}>CREDIT / DEBIT CARD</div>
                <div style={{ fontSize: '1.35rem', letterSpacing: '0.15em', fontWeight: 600, marginBottom: 20, fontFamily: 'monospace' }}>
                  {payment.card_number || '•••• •••• •••• ••••'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <div>
                    <div style={{ opacity: 0.55, fontSize: '0.68rem', marginBottom: 2, letterSpacing: '0.08em' }}>CARD HOLDER</div>
                    <div style={{ fontWeight: 600 }}>{payment.card_name || 'YOUR NAME'}</div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.55, fontSize: '0.68rem', marginBottom: 2, letterSpacing: '0.08em' }}>EXPIRES</div>
                    <div style={{ fontWeight: 600 }}>{payment.expiry || 'MM/YY'}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="Card Number *" value={payment.card_number} onChange={v => setPayment(p => ({ ...p, card_number: formatCard(v) }))} error={errors.card_number} placeholder="1234 5678 9012 3456" maxLength={19} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="Name on Card *" value={payment.card_name} onChange={v => setPayment(p => ({ ...p, card_name: v }))} error={errors.card_name} placeholder="As it appears on the card" />
                </div>
                <Field label="Expiry *" value={payment.expiry} onChange={v => setPayment(p => ({ ...p, expiry: formatExpiry(v) }))} error={errors.expiry} placeholder="MM/YY" maxLength={5} />
                <Field label="CVV *" value={payment.cvv} onChange={v => setPayment(p => ({ ...p, cvv: v.replace(/\D/g, '').slice(0, 4) }))} error={errors.cvv} placeholder="•••" maxLength={4} type="password" />
              </div>
              <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '10px 14px', marginTop: 16, fontSize: '0.78rem', color: '#0369A1' }}>
                🔒 Your payment is encrypted. We never store your full card number.
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button onClick={() => { setStep('details'); setErrors({}) }} style={{ padding: '12px 22px', background: 'none', border: '1.5px solid #ddd', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-haas)', color: 'var(--color-muted)', fontSize: '0.875rem' }}>← Back</button>
                <button onClick={handlePay} disabled={processing} style={{
                  flex: 1, padding: 13, background: processing ? '#888' : 'var(--color-accent-blue)',
                  color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem',
                  cursor: processing ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-haas)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                }}>
                  {processing ? <><Spinner /> Processing...</> : `Pay $${price.toFixed(2)} AUD`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Summary */}
        <div>
          <div style={{ background: 'white', borderRadius: 12, padding: 18, boxShadow: 'var(--shadow-card)', position: 'sticky', top: 24 }}>
            <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
              <CoverImage src={event.cover_url} height={130} fallback="event" />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 4px', lineHeight: 1.3 }}>{event.title}</h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: 14 }}>
              {event.date}{event.start_time ? ` · ${event.start_time}` : ''}
              {event.location && <><br />{event.location}</>}
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
              {[
                ['Ticket', ticketType === 'arc' ? 'Arc Member' : 'Non-Arc Member'],
                ['Qty', '1'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                  <span style={{ color: 'var(--color-muted)' }}>{l}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={{ fontWeight: 800 }}>{isFree ? 'FREE' : `$${price.toFixed(2)} AUD`}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>}>
      <CheckoutInner />
    </Suspense>
  )
}

function Spinner() {
  return <span style={{ display: 'inline-block', width: 15, height: 15, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
}

function Field({ label, value, onChange, placeholder, error, type = 'text', maxLength }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; error?: string; type?: string; maxLength?: number
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: 5, fontWeight: 500 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength}
        style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${error ? '#EF4444' : '#E5E5E5'}`, borderRadius: 8, fontSize: '0.9rem', fontFamily: 'var(--font-haas)', outline: 'none', boxSizing: 'border-box', background: 'white' }}
        onFocus={e => { if (!error) e.target.style.borderColor = 'var(--color-accent-blue)' }}
        onBlur={e => { if (!error) e.target.style.borderColor = '#E5E5E5' }}
      />
      {error && <div style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: 3 }}>{error}</div>}
    </div>
  )
}
