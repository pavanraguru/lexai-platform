'use client'
// apps/web/src/app/portal/accept-invite/page.tsx

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AcceptInvitePage() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const s: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100vh',
      background: '#f4f5f7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Manrope, sans-serif',
      padding: '24px',
    },
    card: {
      background: '#fff',
      borderRadius: '20px',
      padding: '48px 40px',
      width: '100%',
      maxWidth: '420px',
      boxShadow: '0 4px 32px rgba(2,36,72,0.10)',
      border: '1px solid rgba(196,198,207,0.2)',
    },
    logoRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '36px',
    },
    logoBox: {
      width: '40px',
      height: '40px',
      background: '#022448',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffe088',
      fontFamily: 'Newsreader, serif',
      fontWeight: '700',
      fontSize: '20px',
    },
    logoText: {
      color: '#022448',
      fontFamily: 'Newsreader, serif',
      fontSize: '17px',
      fontWeight: '700',
    },
    badge: {
      display: 'inline-block',
      background: '#f0f4f8',
      color: '#64748b',
      fontSize: '11px',
      fontWeight: '600',
      padding: '3px 10px',
      borderRadius: '20px',
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
      marginBottom: '10px',
    },
    heading: {
      color: '#022448',
      fontFamily: 'Newsreader, serif',
      fontSize: '26px',
      fontWeight: '700',
      margin: '0 0 6px',
    },
    sub: { color: '#64748b', fontSize: '14px', margin: '0 0 28px' },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '6px',
    },
    input: {
      width: '100%',
      padding: '11px 14px',
      border: '1.5px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '14px',
      color: '#111827',
      marginBottom: '16px',
      boxSizing: 'border-box' as const,
      fontFamily: 'Manrope, sans-serif',
    },
    error: {
      background: '#ffdad6',
      color: '#ba1a1a',
      padding: '10px 14px',
      borderRadius: '8px',
      fontSize: '13px',
      marginBottom: '16px',
    },
    btn: {
      width: '100%',
      padding: '13px',
      background: '#022448',
      color: '#ffe088',
      border: 'none',
      borderRadius: '10px',
      fontSize: '15px',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: 'Manrope, sans-serif',
    },
    success: {
      background: '#dcfce7',
      color: '#15803d',
      padding: '24px',
      borderRadius: '12px',
      textAlign: 'center' as const,
    },
  }

  if (!token) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.error}>Invalid invite link. Please check your email.</div>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) return setError('Passwords do not match')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/portal/accept-invite`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      localStorage.setItem('portal_token', data.token)
      localStorage.setItem('portal_name', data.name)
      setDone(true)
      setTimeout(() => router.push('/portal/dashboard'), 1600)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <div style={s.logoBox}>S</div>
          <div style={s.logoText}>Sovereign Counsel</div>
        </div>
        <div style={s.badge}>Client Portal</div>
        <h1 style={s.heading}>Set your password</h1>
        <p style={s.sub}>Create a password to access your case portal</p>

        {done ? (
          <div style={s.success}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>✓</div>
            <div style={{ fontWeight: '700', fontSize: '16px' }}>Account activated!</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Redirecting to your dashboard...</div>
          </div>
        ) : (
          <>
            {error && <div style={s.error}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <label style={s.label}>New password</label>
              <input
                style={s.input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
              />
              <label style={s.label}>Confirm password</label>
              <input
                style={s.input}
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                required
              />
              <button
                type="submit"
                style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
                disabled={loading}
              >
                {loading ? 'Activating...' : 'Activate account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
