'use client'
// apps/web/src/app/portal/dashboard/page.tsx

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PortalCase {
  id: string
  title: string
  case_number: string
  status: string
  court_name: string
  case_type: string
  next_hearing_date: string | null
  hearings: Array<{
    id: string
    date: string
    purpose: string
    outcome: string | null
    next_hearing_date: string | null
  }>
}

interface PortalInvoice {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  paid_amount: number
  due_date: string | null
  client_view_token: string | null
  case: { title: string; case_number: string } | null
}

function fmtDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n)
}

function statusColors(status: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    active:   { bg: '#dcfce7', color: '#15803d' },
    open:     { bg: '#dcfce7', color: '#15803d' },
    closed:   { bg: '#f1f5f9', color: '#64748b' },
    pending:  { bg: '#ffe088', color: '#735c00' },
    archived: { bg: '#f1f5f9', color: '#64748b' },
    paid:     { bg: '#dcfce7', color: '#15803d' },
    unpaid:   { bg: '#ffdad6', color: '#ba1a1a' },
    draft:    { bg: '#f1f5f9', color: '#64748b' },
  }
  return map[status?.toLowerCase()] || { bg: '#f1f5f9', color: '#374151' }
}

export default function PortalDashboard() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [cases, setCases] = useState<PortalCase[]>([])
  const [invoices, setInvoices] = useState<PortalInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'cases' | 'invoices'>('cases')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('portal_token')
    const n = localStorage.getItem('portal_name')
    if (!token) { router.push('/portal/login'); return }
    setName(n || 'Client')

    const h = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/portal/cases`, { headers: h }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/portal/invoices`, { headers: h }).then(r => r.json()),
    ])
      .then(([cd, id]) => {
        setCases(cd.cases || [])
        setInvoices(id.invoices || [])
      })
      .catch(() => router.push('/portal/login'))
      .finally(() => setLoading(false))
  }, [])

  function handleLogout() {
    localStorage.removeItem('portal_token')
    localStorage.removeItem('portal_name')
    router.push('/portal/login')
  }

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: '#f4f5f7', fontFamily: 'Manrope, sans-serif' },
    header: {
      background: '#022448',
      padding: '0 32px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoBox: {
      width: '34px', height: '34px', background: '#ffe088', borderRadius: '8px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#022448', fontFamily: 'Newsreader, serif', fontWeight: '700', fontSize: '17px',
    },
    logoText: { color: '#fff', fontFamily: 'Newsreader, serif', fontSize: '16px', fontWeight: '700' },
    portalBadge: {
      background: 'rgba(255,224,136,0.15)', color: '#ffe088',
      fontSize: '11px', fontWeight: '600', padding: '3px 10px',
      borderRadius: '20px', letterSpacing: '0.05em', textTransform: 'uppercase' as const,
    },
    headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
    userName: { color: '#93c5fd', fontSize: '13px' },
    logoutBtn: {
      background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
      padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
      cursor: 'pointer', fontFamily: 'Manrope, sans-serif',
    },
    content: { maxWidth: '900px', margin: '0 auto', padding: 'clamp(20px,4vw,40px)' },
    welcome: {
      color: '#022448', fontFamily: 'Newsreader, serif',
      fontSize: '24px', fontWeight: '700', marginBottom: '4px',
    },
    sub: { color: '#64748b', fontSize: '14px', marginBottom: '28px' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '20px' },
    tab: (active: boolean): React.CSSProperties => ({
      padding: '9px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
      cursor: 'pointer', border: 'none', fontFamily: 'Manrope, sans-serif',
      background: active ? '#022448' : '#fff',
      color: active ? '#ffe088' : '#374151',
      boxShadow: active ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
    }),
    card: {
      background: '#fff', borderRadius: '16px', marginBottom: '12px',
      border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden',
    },
    cardHeader: {
      padding: '18px 22px', display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', cursor: 'pointer',
    },
    caseTitle: {
      color: '#022448', fontWeight: '700', fontSize: '15px',
      fontFamily: 'Newsreader, serif', marginBottom: '3px',
    },
    caseMeta: { color: '#64748b', fontSize: '13px' },
    statusPill: (status: string): React.CSSProperties => ({
      ...statusColors(status),
      fontSize: '11px', fontWeight: '600', padding: '3px 10px',
      borderRadius: '20px', flexShrink: 0,
    }),
    chevron: (open: boolean): React.CSSProperties => ({
      fontSize: '12px', color: '#94a3b8', marginTop: '2px',
      transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
    }),
    cardBody: { padding: '0 22px 18px', borderTop: '1px solid #f1f5f9' },
    sectionLabel: {
      fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.08em',
      textTransform: 'uppercase' as const, margin: '14px 0 8px',
    },
    nextBox: {
      background: '#f0f4ff', borderRadius: '10px', padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px',
    },
    hearingRow: {
      display: 'flex', gap: '12px', padding: '8px 0',
      borderBottom: '1px solid #f8fafc', alignItems: 'flex-start',
    },
    dot: {
      width: '7px', height: '7px', borderRadius: '50%',
      background: '#022448', marginTop: '5px', flexShrink: 0,
    },
    hearingDate: { fontSize: '13px', fontWeight: '600', color: '#022448' },
    hearingPurpose: { fontSize: '13px', color: '#64748b' },
    outcomePill: {
      display: 'inline-block', background: '#dcfce7', color: '#15803d',
      fontSize: '11px', padding: '2px 8px', borderRadius: '6px', marginTop: '3px',
    },
    // Invoice
    invoiceRow: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 22px', borderBottom: '1px solid #f8fafc',
    },
    invNum: { color: '#022448', fontWeight: '600', fontSize: '14px' },
    invMeta: { color: '#64748b', fontSize: '12px', marginTop: '2px' },
    invAmt: { fontFamily: 'Newsreader, serif', fontWeight: '700', fontSize: '20px', color: '#022448' },
    payBtn: {
      display: 'block', background: '#022448', color: '#ffe088', border: 'none',
      padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
      cursor: 'pointer', fontFamily: 'Manrope, sans-serif', marginTop: '6px',
    },
    paidTag: {
      display: 'inline-block', background: '#dcfce7', color: '#15803d',
      padding: '5px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
    },
    empty: { textAlign: 'center' as const, padding: '48px', color: '#94a3b8', fontSize: '14px' },
  }

  if (loading) {
    return (
      <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#64748b' }}>Loading your portal...</div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logoBox}>S</div>
          <div style={s.logoText}>Sovereign Counsel</div>
          <div style={s.portalBadge}>Client Portal</div>
        </div>
        <div style={s.headerRight}>
          <span style={s.userName}>Hello, {name}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </div>

      <div style={s.content}>
        <div style={s.welcome}>Your Case Dashboard</div>
        <div style={s.sub}>Track your cases, hearings, and outstanding invoices.</div>

        <div style={s.tabs}>
          <button style={s.tab(tab === 'cases')} onClick={() => setTab('cases')}>
            Cases ({cases.length})
          </button>
          <button style={s.tab(tab === 'invoices')} onClick={() => setTab('invoices')}>
            Invoices ({invoices.length})
          </button>
        </div>

        {tab === 'cases' && (
          <>
            {cases.length === 0 && <div style={s.empty}>No cases linked to your account yet.</div>}
            {cases.map(c => (
              <div key={c.id} style={s.card}>
                <div style={s.cardHeader} onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  <div style={{ flex: 1 }}>
                    <div style={s.caseTitle}>{c.title}</div>
                    <div style={s.caseMeta}>
                      {c.case_number && <span>{c.case_number} &middot; </span>}
                      {c.court_name} &middot; {c.case_type}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: '6px', marginLeft: '12px' }}>
                    <span style={s.statusPill(c.status)}>{c.status}</span>
                    <span style={s.chevron(expanded === c.id)}>▼</span>
                  </div>
                </div>

                {expanded === c.id && (
                  <div style={s.cardBody}>
                    {c.next_hearing_date && (
                      <div style={s.nextBox}>
                        <span style={{ fontSize: '20px' }}>📅</span>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                            Next Hearing
                          </div>
                          <div style={{ color: '#022448', fontWeight: '700', fontSize: '14px' }}>
                            {fmtDate(c.next_hearing_date)}
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={s.sectionLabel}>Hearing History</div>
                    {c.hearings.length === 0 && (
                      <div style={{ color: '#94a3b8', fontSize: '13px' }}>No hearings recorded yet.</div>
                    )}
                    {c.hearings.map(h => (
                      <div key={h.id} style={s.hearingRow}>
                        <div style={s.dot} />
                        <div>
                          <div style={s.hearingDate}>{fmtDate(h.date)}</div>
                          <div style={s.hearingPurpose}>{h.purpose || 'Hearing'}</div>
                          {h.outcome && <div style={s.outcomePill}>{h.outcome}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {tab === 'invoices' && (
          <div style={s.card}>
            {invoices.length === 0 && <div style={s.empty}>No invoices yet.</div>}
            {invoices.map((inv, i) => (
              <div
                key={inv.id}
                style={{
                  ...s.invoiceRow,
                  borderBottom: i === invoices.length - 1 ? 'none' : undefined,
                }}
              >
                <div>
                  <div style={s.invNum}>{inv.invoice_number}</div>
                  <div style={s.invMeta}>
                    {inv.case?.title || 'General'} &middot; Due {fmtDate(inv.due_date)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <div style={s.invAmt}>{fmtINR(inv.total_amount)}</div>
                  {inv.status === 'paid' ? (
                    <div style={s.paidTag}>Paid</div>
                  ) : inv.client_view_token ? (
                    <button
                      style={s.payBtn}
                      onClick={() => window.open(`/pay/${inv.client_view_token}`, '_blank')}
                    >
                      Pay Now
                    </button>
                  ) : (
                    <div style={{ ...s.invMeta, marginTop: '6px' }}>Payment link pending</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
