import Sidebar from '@/components/layout/Sidebar'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        marginLeft: 64, flex: 1, minHeight: '100vh',
        background: 'var(--color-bg)', overflowX: 'hidden'
      }}>
        {children}
      </main>
    </div>
  )
}
