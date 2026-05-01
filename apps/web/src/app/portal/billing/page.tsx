'use client';
// apps/web/src/app/portal/billing/page.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  draft:   { bg: '#f1f5f9', color: '#64748b', label: 'Draft' },
  issued:  { bg: '#d5e3ff', color: '#001c3b', label: 'Issued' },
  paid:    { bg: '#dcfce7', color: '#15803d', label: 'Paid' },
  overdue: { bg: '#ffdad6', color: '#93000a', label: 'Overdue' },
};

export default function PortalBillingPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    if (!token) { router.push('/portal/login'); return; }
    fetch(`${BASE}/v1/portal/invoices`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setInvoices(d.invoices || []))
      .catch(() => router.push('/portal/login'))
      .finally(() => setLoading(false));
  }, []);

  const totalOutstanding = invoices
    .filter(i => i.status !== 'paid')
    .reduce((s, i) => s + (Number(i.total_amount) - Number(i.paid_amount || 0)), 0);

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + Number(i.total_amount), 0);

  const s: Record<string, React.CSSProperties> = {
    page: { padding: 'clamp(20px,4vw,40px)', fontFamily: 'Manrope, sans-serif', maxWidth: '800px' },
    heading: { fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', marginBottom: '24px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' },
    statCard: { background: '#fff', borderRadius: '14px', padding: '18px 20px', border: '1px solid rgba(196,198,207,0.2)' },
    statLabel: { fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' },
    statValue: { fontFamily: 'Newsreader, serif', fontSize: '24px', fontWeight: 700, color: '#022448' },
    card: { background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden' },
    row: { display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderBottom: '1px solid #f8fafc' },
    invoiceNum: { fontSize: '14px', fontWeight: 700, color: '#022448' },
    invoiceSub: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
    amount: { fontFamily: 'Newsreader, serif', fontSize: '18px', fontWeight: 700, color: '#022448', textAlign: 'right' as const },
    statusPill: (s: string): React.CSSProperties => ({
      ...(STATUS_STYLE[s] || STATUS_STYLE.issued),
      fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', flexShrink: 0,
    }),
    payBtn: { background: '#022448', color: '#ffe088', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', marginTop: '4px', display: 'block' },
    empty: { padding: '48px', textAlign: 'center' as const, color: '#94a3b8', fontSize: '14px' },
  };

  if (loading) return (
    <div style={s.page}><div style={s.heading}>Billing</div><div style={{ color: '#64748b' }}>Loading...</div></div>
  );

  return (
    <div style={s.page}>
      <div style={s.heading}>Billing</div>

      <div style={s.grid}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Outstanding</div>
          <div style={{ ...s.statValue, color: totalOutstanding > 0 ? '#ba1a1a' : '#15803d', fontSize: '20px' }}>
            {totalOutstanding > 0 ? fmtINR(totalOutstanding) : 'Nil'}
          </div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total Paid</div>
          <div style={{ ...s.statValue, fontSize: '20px' }}>{fmtINR(totalPaid)}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total Invoices</div>
          <div style={s.statValue}>{invoices.length}</div>
        </div>
      </div>

      <div style={s.card}>
        {invoices.length === 0 ? (
          <div style={s.empty}>
            <Receipt size={36} color="#d1d5db" style={{ marginBottom: '12px' }} />
            <div>No invoices yet.</div>
          </div>
        ) : invoices.map((inv: any, i: number) => {
          const outstanding = Number(inv.total_amount) - Number(inv.paid_amount || 0);
          return (
            <div key={inv.id} style={{ ...s.row, borderBottom: i < invoices.length - 1 ? '1px solid #f8fafc' : 'none' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Receipt size={18} color="#022448" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.invoiceNum}>{inv.invoice_number}</div>
                <div style={s.invoiceSub}>
                  {inv.case?.title || 'General'} · Due {fmtDate(inv.due_date)}
                </div>
              </div>
              <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                <div style={s.amount}>{fmtINR(inv.total_amount)}</div>
                <span style={s.statusPill(inv.status)}>{STATUS_STYLE[inv.status]?.label || inv.status}</span>
                {inv.status !== 'paid' && inv.client_view_token && (
                  <button style={s.payBtn} onClick={() => window.open(`/pay/${inv.client_view_token}`, '_blank')}>
                    Pay {fmtINR(outstanding)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
