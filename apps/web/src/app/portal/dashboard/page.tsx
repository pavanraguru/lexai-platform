'use client';
// apps/web/src/app/portal/dashboard/page.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderOpen, Gavel, Receipt, ChevronRight } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active:   { bg: '#dcfce7', color: '#15803d' },
  open:     { bg: '#dcfce7', color: '#15803d' },
  closed:   { bg: '#f1f5f9', color: '#64748b' },
  pending:  { bg: '#ffe088', color: '#735c00' },
  decided:  { bg: '#dcfce7', color: '#15803d' },
  filed:    { bg: '#d5e3ff', color: '#001c3b' },
  default:  { bg: '#f1f5f9', color: '#374151' },
};

export default function PortalDashboard() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [cases, setCases] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    const n = localStorage.getItem('portal_name');
    if (!token) { router.push('/portal/login'); return; }
    setName(n || 'Client');

    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${BASE}/v1/portal/cases`, { headers: h }).then(r => r.json()),
      fetch(`${BASE}/v1/portal/invoices`, { headers: h }).then(r => r.json()),
    ]).then(([cd, id]) => {
      setCases(cd.cases || []);
      setInvoices(id.invoices || []);
    }).catch(() => router.push('/portal/login'))
      .finally(() => setLoading(false));
  }, []);

  const upcomingHearings = cases
    .flatMap((c: any) => (c.hearings || []).map((h: any) => ({ ...h, caseTitle: c.title, caseId: c.id })))
    .filter((h: any) => new Date(h.date) >= new Date())
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const pendingInvoices = invoices.filter((i: any) => i.status !== 'paid');
  const totalOutstanding = pendingInvoices.reduce((s: number, i: any) => s + (Number(i.total_amount) - Number(i.paid_amount || 0)), 0);

  const s: Record<string, React.CSSProperties> = {
    page: { padding: 'clamp(20px,4vw,40px)', fontFamily: 'Manrope, sans-serif', maxWidth: '900px' },
    greeting: { fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', marginBottom: '4px' },
    sub: { fontSize: '14px', color: '#64748b', marginBottom: '32px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' },
    statCard: { background: '#fff', borderRadius: '14px', padding: '20px', border: '1px solid rgba(196,198,207,0.2)', boxShadow: '0 1px 4px rgba(2,36,72,0.04)' },
    statIcon: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' },
    statLabel: { fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '4px' },
    statValue: { fontFamily: 'Newsreader, serif', fontSize: '28px', fontWeight: 700, color: '#022448' },
    section: { marginBottom: '28px' },
    sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
    sectionTitle: { fontFamily: 'Newsreader, serif', fontSize: '18px', fontWeight: 700, color: '#022448' },
    viewAll: { fontSize: '13px', fontWeight: 600, color: '#022448', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' },
    card: { background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden' },
    row: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: '1px solid #f8fafc' },
    dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#022448', flexShrink: 0 },
    rowTitle: { fontSize: '14px', fontWeight: 600, color: '#022448', flex: 1 },
    rowSub: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
    rowRight: { fontSize: '13px', fontWeight: 600, color: '#64748b', flexShrink: 0 },
    statusPill: (s: string): React.CSSProperties => ({
      ...(STATUS_COLORS[s?.toLowerCase()] || STATUS_COLORS.default),
      fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', flexShrink: 0,
    }),
    empty: { padding: '32px', textAlign: 'center' as const, color: '#94a3b8', fontSize: '14px' },
  };

  if (loading) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ color: '#64748b' }}>Loading your dashboard...</div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.greeting}>Good day, {name.split(' ')[0]} 👋</div>
      <div style={s.sub}>Here's a summary of your cases and upcoming hearings.</div>

      {/* Stat cards */}
      <div style={s.grid}>
        <div style={s.statCard}>
          <div style={{ ...s.statIcon, background: '#f0f4ff' }}><FolderOpen size={20} color="#022448" /></div>
          <div style={s.statLabel}>Active Cases</div>
          <div style={s.statValue}>{cases.length}</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statIcon, background: '#f0fdf4' }}><Gavel size={20} color="#15803d" /></div>
          <div style={s.statLabel}>Upcoming Hearings</div>
          <div style={s.statValue}>{upcomingHearings.length}</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statIcon, background: totalOutstanding > 0 ? '#ffdad6' : '#f0fdf4' }}><Receipt size={20} color={totalOutstanding > 0 ? '#ba1a1a' : '#15803d'} /></div>
          <div style={s.statLabel}>Outstanding</div>
          <div style={{ ...s.statValue, color: totalOutstanding > 0 ? '#ba1a1a' : '#15803d', fontSize: '22px' }}>
            {totalOutstanding > 0 ? fmtINR(totalOutstanding) : 'Nil'}
          </div>
        </div>
      </div>

      {/* Upcoming hearings */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.sectionTitle}>Upcoming Hearings</div>
          <Link href="/portal/calendar" style={s.viewAll}>View calendar <ChevronRight size={14} /></Link>
        </div>
        <div style={s.card}>
          {upcomingHearings.length === 0 ? (
            <div style={s.empty}>No upcoming hearings scheduled.</div>
          ) : upcomingHearings.map((h: any, i: number) => (
            <div key={h.id} style={{ ...s.row, borderBottom: i < upcomingHearings.length - 1 ? '1px solid #f8fafc' : 'none' }}>
              <div style={s.dot} />
              <div style={{ flex: 1 }}>
                <div style={s.rowTitle}>{h.caseTitle}</div>
                <div style={s.rowSub}>{h.purpose || 'Hearing'}</div>
              </div>
              <div style={s.rowRight}>{fmtDate(h.date)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* My cases */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.sectionTitle}>My Cases</div>
          <Link href="/portal/cases" style={s.viewAll}>View all <ChevronRight size={14} /></Link>
        </div>
        <div style={s.card}>
          {cases.length === 0 ? (
            <div style={s.empty}>No cases linked to your account.</div>
          ) : cases.slice(0, 5).map((c: any, i: number) => (
            <Link key={c.id} href={`/portal/cases/${c.id}`} style={{ ...s.row, textDecoration: 'none', borderBottom: i < Math.min(cases.length, 5) - 1 ? '1px solid #f8fafc' : 'none', cursor: 'pointer' }}>
              <FolderOpen size={16} color="#022448" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={s.rowTitle}>{c.title}</div>
                <div style={s.rowSub}>{c.court_name}</div>
              </div>
              <span style={s.statusPill(c.status)}>{c.status}</span>
              <ChevronRight size={14} color="#94a3b8" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
