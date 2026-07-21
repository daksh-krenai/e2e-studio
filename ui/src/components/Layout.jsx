import { Link, useLocation } from 'react-router-dom'
import { Folder, Activity, Settings } from 'lucide-react'

export default function Layout({ children }) {
  const loc = useLocation()

  const nav = [
    { to: '/', icon: <Folder size={16} />, label: 'Projects' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, background: 'var(--surface)',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        padding: '0'
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16
            }}>⚡</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>E2E Studio</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.05em' }}>POWERED BY CLAUDE</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px' }}>
          {nav.map(({ to, icon, label }) => {
            const active = loc.pathname === to
            return (
              <Link key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                color: active ? 'var(--accent)' : 'var(--text2)',
                background: active ? 'var(--accent-glow)' : 'transparent',
                fontSize: 13, fontWeight: active ? 600 : 400,
                transition: 'all 0.12s'
              }}>{icon}{label}</Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            <div style={{ marginBottom: 2 }}>Claude Code CLI required</div>
            <div>Run <code style={{ color: 'var(--accent)', background: 'var(--bg)', padding: '0 4px', borderRadius: 3 }}>claude --version</code> to verify</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        {children}
      </main>
    </div>
  )
}
