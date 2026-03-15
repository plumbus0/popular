import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Popular – Find your people',
  description: 'Discover university societies and events across Australia',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
