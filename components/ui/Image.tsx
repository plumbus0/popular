'use client'

import React, { useState, useEffect } from 'react'

const FALLBACKS: Record<string, string> = {
  event:   'https://www.inside.unsw.edu.au/sites/default/files/article/communityday2023-vcwebpagebanner-1200px.png',
  society: 'https://www.unsw.edu.au/content/dam/images/unsw-wide/general/events/2023-02-06-o-week-general/2023-02-06-O-week-1219.cropimg.width=700.crop=square.jpg',
  hero:    'https://www.inside.unsw.edu.au/sites/default/files/inline-images/20230902_UNSW_OpenDay_Selects_SCREENRES-22.jpg',
}

/** Treat blank / whitespace-only strings as "no image" */
function clean(src?: string | null): string | null {
  const s = src?.trim()
  return s && s.length > 4 ? s : null   // min 5 chars rules out junk like "http"
}

// ─────────────────────────────────────────────────────────────────────────────
// CoverImage  — full-bleed rectangular image with fallback
// ─────────────────────────────────────────────────────────────────────────────
interface CoverImageProps {
  src?: string | null
  alt?: string
  height?: number | string
  fallback?: keyof typeof FALLBACKS
  style?: React.CSSProperties
  children?: React.ReactNode
}

export function CoverImage({
  src, alt, height = 200, fallback = 'event', style, children,
}: CoverImageProps) {
  const fb = FALLBACKS[fallback] ?? FALLBACKS.event
  const primary = clean(src)
  const [displaySrc, setDisplaySrc] = useState<string>(primary ?? fb)

  useEffect(() => {
    // When the URL prop changes, reset to the new URL (or fallback if empty)
    setDisplaySrc(primary ?? fb)
  }, [src])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'relative', height, overflow: 'hidden', flexShrink: 0, ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={displaySrc}           // forces remount when URL changes
        src={displaySrc}
        alt={alt ?? ''}
        onError={() => {
          // Only switch to fallback once — prevents infinite loops
          if (displaySrc !== fb) setDisplaySrc(fb)
        }}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center',
          display: 'block',
        }}
        // ⚠️  Do NOT add crossOrigin or referrerPolicy here.
        // crossOrigin="anonymous" sends an Origin header that Supabase Storage
        // and most image hosts don't answer with CORS headers, causing the
        // browser to treat the request as failed and fire onError.
      />
      {children && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar  — circular image with initial-letter fallback
// ─────────────────────────────────────────────────────────────────────────────
interface AvatarProps {
  src?: string | null
  name?: string
  size?: number
  color?: string
  style?: React.CSSProperties
  onClick?: () => void
}

export function Avatar({
  src, name, size = 36, color = '#4A3FA0', style, onClick,
}: AvatarProps) {
  const primary = clean(src)
  const [failed, setFailed] = useState(false)
  const initial = (name ?? '?').charAt(0).toUpperCase()

  // Reset error state whenever src changes
  useEffect(() => {
    setFailed(false)
  }, [src])

  const showImage = !!primary && !failed

  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: '50%',
        overflow: 'hidden', flexShrink: 0,
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={primary}
          src={primary!}
          alt={name ?? ''}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span style={{
          color: 'white', fontWeight: 700,
          fontSize: size * 0.38, lineHeight: 1, userSelect: 'none',
        }}>
          {initial}
        </span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LogoImage  — rectangular image with contain fit, renders nothing on error
// ─────────────────────────────────────────────────────────────────────────────
interface LogoImageProps {
  src?: string | null
  alt?: string
  height?: number
  style?: React.CSSProperties
}

export function LogoImage({ src, alt, height = 40, style }: LogoImageProps) {
  const primary = clean(src)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!primary || failed) return null

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={primary}
      src={primary}
      alt={alt ?? ''}
      onError={() => setFailed(true)}
      style={{ height, objectFit: 'contain', display: 'block', ...style }}
    />
  )
}
