'use client';
// apps/web/src/app/portal/cases/page.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderOpen, ChevronRight, Gavel } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

export default function PortalCasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    if (!token) { router.push('/portal/login'); return; }
    fetch(`${BASE}/v1/portal/cases`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setCases(d.cases || []))
      .catch(() => router.push('/portal/login'))
      .finally(() => setLoading(false));
  }, []);

  const s: Record<string, React.CSSProperties> = {
    page: { padding: 'clamp(20px,4vw,40px)', fontFamily: 'Manrope, sans-serif', maxWidth: '800px' },
    heading: { fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', marginBottom: '4px' },
    sub: { fontSize: '14px', color: '#64748b', marginBottom: '24px' },
    card: { background: '#fff', borderRadius: '16px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(2,36,72,0.04)' },
    caseRow: { display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px', borderBottom: '1px solid #f8fafc', textDecoration: 'none', cursor: 'pointer' },
    iconBox: { width: '42px', height: '42px', borderRadius: '10px', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    caseTitle: { fontSize: '14px', fontWeight: 700, color: '#022448', marginBottom: '3px' },
    caseMeta: { fontSize: '12px', color: '#64748b' },
    statusPill: (s: string): React.CSSProperties => ({
      ...(STATUS_COLORS[s?.toLowerCase()] || STATUS_COLORS.default),
      fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', flexShrink: 0,
    }),
    nextHearing: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#022448', background: '#f0f4ff', padding: '3px 10px', borderRadius: '20px', flexShrink: 0 },
    empty: { padding: '60px', textAlign: 'center' as const, color: '#94a3b8' },
    skeleton: { height: '80px', borderRadius: '16px', background: '#f1f5f9', marginBottom: '8px' },
  };

  if (loading) return (
    <div style={s.page}>
      <div style={s.heading}>My Cases</div>
      {[1,2,3].map(i => <div key={i} style={s.skeleton} />)}
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.heading}>My Cases</div>
      <div style={s.sub}>{cases.length} case{cases.length !== 1 ? 's' : ''} linked to your account</div>

      {cases.length === 0 ? (
        <div style={s.card}><div style={s.empty}>No cases linked to your account yet.<br />Please contact your advocate.</div></div>
      ) : (
        <div style={s.card}>
          {cases.map((c: any, i: number) => (
            <Link
              key={c.id}
              href={`/portal/cases/${c.id}`}
              style={{ ...s.caseRow, borderBottom: i < cases.length - 1 ? '1px solid #f8fafc' : 'none' }}
            >
              <div style={s.iconBox}><FolderOpen size={20} color="#022448" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.caseTitle}>{c.title}</div>
                <div style={s.caseMeta}>
                  {c.case_number && <span>{c.case_number} · </span>}
                  {c.court_name}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {c.next_hearing_date && (
                  <div style={s.nextHearing}>
                    <Gavel size={11} /> {fmtDate(c.next_hearing_date)}
                  </div>
                )}
                <span style={s.statusPill(c.status)}>{c.status}</span>
                <ChevronRight size={16} color="#94a3b8" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
