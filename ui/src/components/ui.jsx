import { useState } from 'react'
import { X } from 'lucide-react'

// ── Button ─────────────────────────────────────────────
export function Btn({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'button', style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    borderRadius: 'var(--radius-sm)', fontWeight: 500, transition: 'all 0.15s',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    border: '1px solid transparent', whiteSpace: 'nowrap'
  }
  const sizes = {
    sm: { padding: '5px 10px', fontSize: '12px' },
    md: { padding: '8px 16px', fontSize: '13px' },
    lg: { padding: '10px 20px', fontSize: '14px' }
  }
  const variants = {
    primary: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' },
    ghost: { background: 'transparent', color: 'var(--text2)', borderColor: 'var(--border2)' },
    danger: { background: 'rgba(239,68,68,0.1)', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' },
    success: { background: 'rgba(34,197,94,0.1)', color: 'var(--green)', borderColor: 'rgba(34,197,94,0.3)' },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  )
}

// ── Badge ──────────────────────────────────────────────
export function Badge({ status }) {
  const map = {
    passed: { color: 'var(--green)', bg: 'rgba(34,197,94,0.1)', label: '✓ Passed' },
    failed: { color: 'var(--red)', bg: 'rgba(239,68,68,0.1)', label: '✗ Failed' },
    running: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', label: '◉ Running' },
    error: { color: 'var(--yellow)', bg: 'rgba(245,158,11,0.1)', label: '⚠ Error' },
    never: { color: 'var(--text3)', bg: 'transparent', label: '— Never run' },
  }
  const s = map[status] || map.never
  return (
    <span style={{
      fontSize: '11px', fontWeight: 600, padding: '2px 8px',
      borderRadius: '999px', background: s.bg, color: s.color,
      border: `1px solid ${s.color}30`
    }}>{s.label}</span>
  )
}

// ── Card ───────────────────────────────────────────────
export function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '20px',
      cursor: onClick ? 'pointer' : 'default',
      transition: onClick ? 'border-color 0.15s' : undefined,
      ...style
    }}>{children}</div>
  )
}

// ── Modal ──────────────────────────────────────────────
export function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '20px'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: '12px', width: '100%', maxWidth: width,
        maxHeight: '90vh', overflow: 'auto'
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid var(--border)'
        }}>
          <span style={{ fontWeight: 600, fontSize: '15px' }}>{title}</span>
          <button onClick={onClose} style={{ color: 'var(--text2)', cursor: 'pointer', background: 'none', border: 'none' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

// ── Field ──────────────────────────────────────────────
export function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>}
      {children}
      {hint && <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>{hint}</p>}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────
export function Empty({ icon, title, subtitle, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '6px' }}>{title}</div>
      <div style={{ color: 'var(--text2)', fontSize: '13px', marginBottom: '20px' }}>{subtitle}</div>
      {action}
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────
export function Spinner({ size = 16 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid var(--border2)`, borderTopColor: 'var(--accent)',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite'
    }} />
  )
}

// Inject keyframes once
if (!document.getElementById('e2e-spin')) {
  const s = document.createElement('style')
  s.id = 'e2e-spin'
  s.textContent = '@keyframes spin { to { transform: rotate(360deg) } } @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }'
  document.head.appendChild(s)
}
