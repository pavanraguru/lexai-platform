'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import Link from 'next/link';
import { FolderOpen, Plus, Search, FileText, CheckSquare, ChevronRight } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  intake:          { bg: '#edeef0', color: '#43474e' },
  filed:           { bg: '#d5e3ff', color: '#001c3b' },
  pending_hearing: { bg: '#ffe088', color: '#745c00' },
  arguments:       { bg: '#ede9fe', color: '#5b21b6' },
  reserved:        { bg: '#fff7ed', color: '#c2410c' },
  decided:         { bg: '#dcfce7', color: '#15803d' },
  appeal:          { bg: '#ffdad6', color: '#93000a' },
  closed:          { bg: '#e7e8ea', color: '#74777f' },
};

const STATUS_LABELS: Record<string, string> = {
  intake: 'Intake', filed: 'Filed', pending_hearing: 'Pending Hearing',
  arguments: 'Arguments', reserved: 'Reserved', decided: 'Decided',
  appeal: 'Appeal', closed: 'Closed',
};

const CASE_TYPE_LABELS: Record<string, string> = {
  criminal_sessions: 'Criminal', criminal_magistrate: 'Criminal (Mag)',
  civil_district: 'Civil', writ_hc: 'Writ (HC)', corporate_nclt: 'Corporate',
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
      if (!res.ok) return [];
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const cases: any[] = (data || []).filter((c: any) =>
    !search ||
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.cnr_number?.toLowerCase().includes(search.toLowerCase())
  );

  const s: React.CSSProperties = {};

  return (
    <div style={{ padding: '32px 28px', fontFamily: 'Manrope, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '1.6rem', fontWeight: 700, color: '#022448', margin: 0 }}>
            My Cases
          </h1>
          <p style={{ color: '#74777f', fontSize: '14px', margin: '4px 0 0' }}>
            {isLoading ? '...' : `${cases.length} matter${cases.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link href="/cases/new" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: '#022448', color: '#fff', fontWeight: 700, fontSize: '13px',
          padding: '10px 18px', borderRadius: '6px', textDecoration: 'none',
        }}>
          <Plus size={15} />
          New Case
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', maxWidth: '780px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} color="#74777f" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cases or CNR..."
            style={{
              width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px',
              border: '1px solid rgba(196,198,207,0.4)', borderRadius: '8px',
              fontSize: '13px', color: '#191c1e', background: '#fff', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          style={{
            padding: '10px 12px', border: '1px solid rgba(196,198,207,0.4)',
            borderRadius: '8px', fontSize: '13px', color: status ? '#022448' : '#74777f',
            background: '#fff', outline: 'none', fontWeight: status ? 600 : 400,
            fontFamily: 'Manrope, sans-serif',
          }}
        >
          <option value="">All Status</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Cases list */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '780px' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: '84px', borderRadius: '16px', background: '#edeef0' }} />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '20px', padding: '60px 24px', textAlign: 'center', border: '1px solid rgba(196,198,207,0.2)' }}>
          <FolderOpen size={40} color="#c4c6cf" style={{ marginBottom: '16px' }} />
          <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: '0 0 8px' }}>
            {search ? 'No matching cases' : 'No cases yet'}
          </p>
          <p style={{ color: '#74777f', fontSize: '14px', margin: '0 0 24px' }}>
            {search ? 'Try a different search term' : 'Create your first matter to get started'}
          </p>
          {!search && (
            <Link href="/cases/new" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#022448', color: '#fff', fontWeight: 700,
              fontSize: '13px', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none',
            }}>
              <Plus size={15} /> Create Case
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '780px' }}>
          {cases.map((c: any) => {
            const ss = STATUS_STYLES[c.status] || STATUS_STYLES.intake;
            return (
              <Link key={c.id} href={`/cases/${c.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#fff', borderRadius: '10px', padding: '18px 16px',
                  border: '1px solid rgba(196,198,207,0.18)',
                  boxShadow: '0px 1px 4px rgba(2,36,72,0.05)',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  cursor: 'pointer',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Type + status row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#735c00', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {CASE_TYPE_LABELS[c.case_type] || c.case_type?.replace(/_/g, ' ')}
                      </span>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                        borderRadius: '99px', background: ss.bg, color: ss.color,
                      }}>
                        {STATUS_LABELS[c.status] || c.status}
                      </span>
                    </div>
                    {/* Title */}
                    <div style={{
                      fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '14px',
                      color: '#022448', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c.title}
                    </div>
                    {/* Court + CNR */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: '#74777f' }}>{c.court}</span>
                      {c.cnr_number && (
                        <>
                          <span style={{ color: '#c4c6cf', fontSize: '10px' }}>·</span>
                          <span style={{ fontSize: '11px', color: '#74777f', fontFamily: 'monospace' }}>{c.cnr_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Right side */}
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    {c.next_hearing_date && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '9px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', margin: 0 }}>NEXT</p>
                        <p style={{ fontWeight: 800, fontSize: '13px', color: '#022448', margin: 0 }}>
                          {new Date(c.next_hearing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {c._count?.documents > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#74777f' }}>
                          <FileText size={12} />
                          <span style={{ fontSize: '11px' }}>{c._count.documents}</span>
                        </div>
                      )}
                      {c._count?.tasks > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#74777f' }}>
                          <CheckSquare size={12} />
                          <span style={{ fontSize: '11px' }}>{c._count.tasks}</span>
                        </div>
                      )}
                      <ChevronRight size={16} color="#c4c6cf" />
                    </div>
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
