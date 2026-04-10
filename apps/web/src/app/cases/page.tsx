'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import Link from 'next/link';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  intake:          { bg: 'var(--surface-container)',      color: 'var(--on-surface-variant)' },
  filed:           { bg: 'var(--primary-fixed)',          color: 'var(--on-primary-fixed)' },
  pending_hearing: { bg: 'var(--secondary-fixed)',        color: 'var(--on-secondary-container)' },
  arguments:       { bg: '#ede9fe',                       color: '#5b21b6' },
  reserved:        { bg: '#fff7ed',                       color: '#c2410c' },
  decided:         { bg: '#dcfce7',                       color: '#15803d' },
  appeal:          { bg: 'var(--error-container)',        color: 'var(--on-error-container)' },
  closed:          { bg: 'var(--surface-container-high)', color: 'var(--outline)' },
};

const STATUS_LABELS: Record<string, string> = {
  intake: 'Intake', filed: 'Filed', pending_hearing: 'Pending Hearing',
  arguments: 'Arguments', reserved: 'Reserved', decided: 'Decided',
  appeal: 'Appeal', closed: 'Closed',
};

const CASE_TYPE_LABELS: Record<string, string> = {
  criminal_sessions: 'Criminal', criminal_magistrate: 'Criminal (Mag)',
  civil_district: 'Civil', writ_hc: 'Writ (HC)', corporate_nclt: 'Corporate (NCLT)',
  family: 'Family', labour: 'Labour', ip: 'IP', tax: 'Tax',
  arbitration: 'Arbitration', consumer: 'Consumer',
};

export default function CasesPage() {
  const { token } = useAuthStore();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['cases', status],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (status) params.set('status', status);
      const res = await fetch(`${BASE}/v1/cases?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const cases: any[] = (data || []).filter((c: any) =>
    !search || c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.cnr_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8 fade-up">
        <div>
          <h1 className="font-serif font-bold mb-1" style={{ fontSize: '2rem', color: 'var(--primary)' }}>
            My Cases
          </h1>
          <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            {cases.length} matter{cases.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/cases/new"
          className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 transition-all hover:opacity-80"
          style={{ background: 'var(--primary)', color: '#fff', borderRadius: '6px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
          New Case
        </Link>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="flex gap-3 mb-6 flex-wrap fade-up fade-up-1">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2"
            style={{ fontSize: '18px', color: 'var(--outline)' }}>search</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search cases or CNR..."
            className="w-full pl-10 pr-4 py-2.5 text-sm transition-colors"
            style={{
              background: 'var(--surface-container-lowest)',
              border: '1px solid rgba(196,198,207,0.3)',
              borderRadius: '6px',
              color: 'var(--on-surface)',
              outline: 'none',
            }} />
        </div>

        {/* Status filter */}
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="text-sm font-medium py-2.5 px-3 transition-colors"
          style={{
            background: 'var(--surface-container-lowest)',
            border: '1px solid rgba(196,198,207,0.3)',
            borderRadius: '6px',
            color: status ? 'var(--primary)' : 'var(--on-surface-variant)',
            outline: 'none',
          }}>
          <option value="">All Status</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* ── Cases List ─────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--surface-container-low)' }} />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}>
          <span className="material-symbols-outlined mb-4 block" style={{ fontSize: '40px', color: 'var(--outline-variant)' }}>folder_shared</span>
          <p className="font-serif font-bold text-lg mb-1" style={{ color: 'var(--primary)' }}>
            {search ? 'No matching cases' : 'No cases yet'}
          </p>
          <p className="text-sm mb-5" style={{ color: 'var(--on-surface-variant)' }}>
            {search ? 'Try a different search term' : 'Create your first matter to get started'}
          </p>
          {!search && (
            <Link href="/cases/new"
              className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5"
              style={{ background: 'var(--primary)', color: '#fff', borderRadius: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              Create Case
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c: any, i: number) => {
            const statusStyle = STATUS_STYLES[c.status] || STATUS_STYLES.intake;
            return (
              <Link key={c.id} href={`/cases/${c.id}`}
                className={`block rounded-2xl p-5 transition-all hover:shadow-lg group fade-up fade-up-${Math.min(i + 1, 5)}`}
                style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)', boxShadow: 'var(--shadow-tonal)' }}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Type + Status row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.08em', color: 'var(--secondary)', textTransform: 'uppercase' }}>
                        {CASE_TYPE_LABELS[c.case_type] || c.case_type?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: statusStyle.bg, color: statusStyle.color, fontSize: '10px' }}>
                        {STATUS_LABELS[c.status] || c.status}
                      </span>
                    </div>
                    {/* Title */}
                    <h3 className="font-serif font-bold group-hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--primary)', fontSize: '17px', lineHeight: '1.3' }}>
                      {c.title}
                    </h3>
                    {/* Metadata */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {c.cnr_number && (
                        <span className="font-mono" style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                          CNR: {c.cnr_number}
                        </span>
                      )}
                      <span style={{ fontSize: '11px', color: 'var(--outline)' }}>·</span>
                      <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{c.court}</span>
                    </div>
                  </div>
                  {/* Right: next hearing + doc count */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    {c.next_hearing_date && (
                      <div className="text-right">
                        <p style={{ fontSize: '9px', fontWeight: '700', color: 'var(--on-surface-variant)', letterSpacing: '0.06em' }}>NEXT HEARING</p>
                        <p className="font-bold" style={{ color: 'var(--primary)', fontSize: '13px' }}>
                          {new Date(c.next_hearing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    )}
                    {c._count && (
                      <div className="flex items-center gap-3">
                        {c._count.documents > 0 && (
                          <div className="flex items-center gap-1" style={{ color: 'var(--outline)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>description</span>
                            <span style={{ fontSize: '11px' }}>{c._count.documents}</span>
                          </div>
                        )}
                        {c._count.tasks > 0 && (
                          <div className="flex items-center gap-1" style={{ color: 'var(--outline)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>task_alt</span>
                            <span style={{ fontSize: '11px' }}>{c._count.tasks}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
