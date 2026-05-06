'use client';
// apps/web/src/app/settings/audit-log/page.tsx

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { Filter, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const EVENT_ICONS: Record<string, string> = {
  login: '🔐', logout: '🚪', doc_view: '👁️', doc_download: '⬇️',
  case_view: '📁', edit: '✏️', delete: '🗑️', invite: '📨',
  role_change: '🛡️', screenshot_attempt: '📸', tab_hidden: '🙈', default: '📋',
};

const EVENT_COLORS: Record<string, { bg: string; color: string }> = {
  login:              { bg: '#dcfce7', color: '#15803d' },
  logout:             { bg: '#f1f5f9', color: '#64748b' },
  doc_download:       { bg: '#dbeafe', color: '#1d4ed8' },
  delete:             { bg: '#ffdad6', color: '#ba1a1a' },
  role_change:        { bg: '#ede9fe', color: '#7c3aed' },
  screenshot_attempt: { bg: '#fef3c7', color: '#d97706' },
  default:            { bg: '#f1f5f9', color: '#374151' },
};

function fmtTime(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// Extract case info from audit log entry
function getCaseInfo(log: any): { id: string | null; title: string | null } {
  // Check metadata for case_id/case_title
  const meta = log.metadata || {};
  if (meta.case_id) return { id: meta.case_id, title: meta.case_title || meta.case_name || null };
  // If entity_type is case, entity_id is the case id
  if (log.entity_type === 'case' && log.entity_id) return { id: log.entity_id, title: log.resource_name || null };
  // Document events often have case_id in metadata
  if (log.entity_type === 'document' && meta.case_id) return { id: meta.case_id, title: meta.case_title || null };
  return { id: null, title: null };
}

export default function AuditLogPage() {
  const { token, user } = useAuthStore();
  const isAdmin = ['managing_partner', 'super_admin'].includes(user?.role || '');

  const [logs, setLogs] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ user_id: '', event_type: '', from: '', to: '' });

  const h = { Authorization: `Bearer ${token}` };

  function load(p = 1) {
    const params = new URLSearchParams({ page: String(p), limit: '50' });
    if (filters.user_id) params.set('user_id', filters.user_id);
    if (filters.event_type) params.set('event_type', filters.event_type);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    setLoading(true);
    fetch(`${BASE}/v1/team/audit-log?${params}`, { headers: h })
      .then(r => r.json())
      .then(d => { setLogs(d.data || []); setTotal(d.meta?.total || 0); })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetch(`${BASE}/v1/team/members`, { headers: h }).then(r => r.json()).then(d => setMembers(d.data || []));
    load();
  }, []);

  function exportCSV() {
    const headers = ['Time', 'User', 'Email', 'Event', 'Resource', 'Case', 'IP'];
    const rows = logs.map(l => {
      const c = getCaseInfo(l);
      return [fmtTime(l.created_at), l.user?.full_name || 'System', l.user?.email || '',
        l.event_type || l.action, l.resource_name || '', c.title || '', l.ip_address || ''];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const sel: React.CSSProperties = { padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: '9px', fontSize: '13px', fontFamily: 'Manrope, sans-serif', color: '#111827', outline: 'none', background: '#fff' };

  if (!isAdmin) return (
    <div style={{ padding: '40px', fontFamily: 'Manrope, sans-serif' }}>
      <div style={{ fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448' }}>Audit Log</div>
      <div style={{ color: '#ba1a1a', fontSize: '14px', marginTop: '12px' }}>Admin access required.</div>
    </div>
  );

  const totalPages = Math.ceil(total / 50);

  return (
    <div style={{ padding: 'clamp(20px,4vw,40px)', fontFamily: 'Manrope, sans-serif', maxWidth: '1000px' }}>
      <div style={{ fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', marginBottom: '4px' }}>Audit Log</div>
      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>Complete activity history — every login, document access, edit, and download.</div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' as const }}>
        <select style={sel} value={filters.user_id} onChange={e => setFilters(p => ({ ...p, user_id: e.target.value }))}>
          <option value="">All members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
        <select style={sel} value={filters.event_type} onChange={e => setFilters(p => ({ ...p, event_type: e.target.value }))}>
          <option value="">All events</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="doc_view">Document View</option>
          <option value="doc_download">Document Download</option>
          <option value="case_view">Case View</option>
          <option value="edit">Edit</option>
          <option value="delete">Delete</option>
          <option value="invite">Invite</option>
          <option value="role_change">Role Change</option>
          <option value="screenshot_attempt">Screenshot Attempt</option>
        </select>
        <input style={sel} type="date" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} />
        <input style={sel} type="date" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} />
        <button onClick={() => { setPage(1); load(1); }} style={{ padding: '8px 16px', background: '#022448', color: '#ffe088', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Filter size={13} /> Apply
        </button>
        <button onClick={exportCSV} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>{total.toLocaleString()} events</div>

      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '160px 150px 110px 1fr 160px 110px', gap: '0', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', padding: '10px 16px' }}>
          {['TIME', 'MEMBER', 'EVENT', 'RESOURCE', 'CASE', 'IP ADDRESS'].map(h => (
            <div key={h} style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' as const, color: '#94a3b8' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' as const, color: '#94a3b8' }}>No events found.</div>
        ) : logs.map((log, i) => {
          const et = log.event_type || log.action || 'default';
          const ec = EVENT_COLORS[et] || EVENT_COLORS.default;
          const caseInfo = getCaseInfo(log);
          return (
            <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '160px 150px 110px 1fr 160px 110px', gap: '0', padding: '12px 16px', borderBottom: i < logs.length - 1 ? '1px solid #f8fafc' : 'none', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{fmtTime(log.created_at)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#ffe088', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#022448', flexShrink: 0 }}>
                  {log.user?.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#022448' }}>{log.user?.full_name || 'System'}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>{log.user?.email || ''}</div>
                </div>
              </div>
              <div>
                <span style={{ ...ec, fontSize: '10px', fontWeight: 700, padding: '3px 7px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' as const }}>
                  {EVENT_ICONS[et] || EVENT_ICONS.default} {et.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={log.resource_name}>
                {log.resource_name || log.entity_type || '—'}
              </div>
              <div>
                {caseInfo.id ? (
                  <Link href={`/cases/${caseInfo.id}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#022448', textDecoration: 'none', background: '#f0f4ff', padding: '3px 8px', borderRadius: '6px' }}>
                    <ExternalLink size={10} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '120px' }}>
                      {caseInfo.title || 'View Case'}
                    </span>
                  </Link>
                ) : (
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{log.ip_address || '—'}</div>
            </div>
          );
        })}

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderTop: '1px solid #f1f5f9' }}>
            <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p); }}
              style={{ padding: '6px 14px', background: page <= 1 ? '#f1f5f9' : '#022448', color: page <= 1 ? '#94a3b8' : '#ffe088', border: 'none', borderRadius: '8px', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Manrope, sans-serif' }}>
              ← Previous
            </button>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Page {page} of {totalPages}</div>
            <button disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); load(p); }}
              style={{ padding: '6px 14px', background: page >= totalPages ? '#f1f5f9' : '#022448', color: page >= totalPages ? '#94a3b8' : '#ffe088', border: 'none', borderRadius: '8px', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Manrope, sans-serif' }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
