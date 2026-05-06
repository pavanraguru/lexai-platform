'use client';
// apps/web/src/app/settings/audit-log/page.tsx

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { Search, Filter, Download } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const EVENT_ICONS: Record<string, string> = {
  login:              '🔐',
  logout:             '🚪',
  doc_view:           '👁️',
  doc_download:       '⬇️',
  case_view:          '📁',
  edit:               '✏️',
  delete:             '🗑️',
  invite:             '📨',
  role_change:        '🛡️',
  screenshot_attempt: '📸',
  tab_hidden:         '🙈',
  default:            '📋',
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
    fetch(`${BASE}/v1/team/members`, { headers: h })
      .then(r => r.json()).then(d => setMembers(d.data || []));
    load();
  }, []);

  function handleFilter() { setPage(1); load(1); }

  function exportCSV() {
    const headers = ['Time', 'User', 'Email', 'Event', 'Resource', 'IP'];
    const rows = logs.map(l => [
      fmtTime(l.created_at),
      l.user?.full_name || 'System',
      l.user?.email || '',
      l.event_type || l.action,
      l.resource_name || '',
      l.ip_address || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const s: Record<string, React.CSSProperties> = {
    page: { padding: 'clamp(20px,4vw,40px)', fontFamily: 'Manrope, sans-serif', maxWidth: '960px' },
    heading: { fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', marginBottom: '4px' },
    sub: { fontSize: '14px', color: '#64748b', marginBottom: '24px' },
    filterBar: { display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' as const },
    select: { padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: '9px', fontSize: '13px', fontFamily: 'Manrope, sans-serif', color: '#111827', outline: 'none', background: '#fff' },
    dateInput: { padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: '9px', fontSize: '13px', fontFamily: 'Manrope, sans-serif', color: '#111827', outline: 'none' },
    filterBtn: { padding: '8px 16px', background: '#022448', color: '#ffe088', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', display: 'flex', alignItems: 'center', gap: '5px' },
    exportBtn: { padding: '8px 16px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', display: 'flex', alignItems: 'center', gap: '5px' },
    card: { background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden' },
    tableHeader: { display: 'grid', gridTemplateColumns: '180px 160px 120px 1fr 120px', gap: '0', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', padding: '10px 16px' },
    colHead: { fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
    logRow: { display: 'grid', gridTemplateColumns: '180px 160px 120px 1fr 120px', gap: '0', padding: '12px 16px', borderBottom: '1px solid #f8fafc', alignItems: 'center' },
    time: { fontSize: '12px', color: '#64748b' },
    userInfo: { display: 'flex', alignItems: 'center', gap: '6px' },
    userAvatar: { width: '24px', height: '24px', borderRadius: '50%', background: '#ffe088', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#022448', flexShrink: 0 },
    userName: { fontSize: '12px', fontWeight: 600, color: '#022448' },
    eventBadge: (type: string): React.CSSProperties => ({
      ...(EVENT_COLORS[type] || EVENT_COLORS.default),
      fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px',
    }),
    resource: { fontSize: '12px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
    ip: { fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' },
    pagination: { display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px', borderTop: '1px solid #f1f5f9', justifyContent: 'space-between' },
    pageBtn: (disabled: boolean): React.CSSProperties => ({
      padding: '6px 14px', background: disabled ? '#f1f5f9' : '#022448', color: disabled ? '#94a3b8' : '#ffe088',
      border: 'none', borderRadius: '8px', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Manrope, sans-serif',
    }),
    empty: { padding: '48px', textAlign: 'center' as const, color: '#94a3b8', fontSize: '14px' },
  };

  if (!isAdmin) return (
    <div style={s.page}>
      <div style={s.heading}>Audit Log</div>
      <div style={{ color: '#ba1a1a', fontSize: '14px' }}>Admin access required to view audit logs.</div>
    </div>
  );

  const totalPages = Math.ceil(total / 50);

  return (
    <div style={s.page}>
      <div style={s.heading}>Audit Log</div>
      <div style={s.sub}>Complete activity history — every login, document access, edit, and download.</div>

      {/* Filters */}
      <div style={s.filterBar}>
        <select style={s.select} value={filters.user_id} onChange={e => setFilters(p => ({ ...p, user_id: e.target.value }))}>
          <option value="">All members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
        <select style={s.select} value={filters.event_type} onChange={e => setFilters(p => ({ ...p, event_type: e.target.value }))}>
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
        <input style={s.dateInput} type="date" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} placeholder="From" />
        <input style={s.dateInput} type="date" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} placeholder="To" />
        <button style={s.filterBtn} onClick={handleFilter}><Filter size={13} /> Apply</button>
        <button style={s.exportBtn} onClick={exportCSV}><Download size={13} /> Export CSV</button>
      </div>

      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>{total.toLocaleString()} events</div>

      <div style={s.card}>
        <div style={s.tableHeader}>
          <div style={s.colHead}>Time</div>
          <div style={s.colHead}>Member</div>
          <div style={s.colHead}>Event</div>
          <div style={s.colHead}>Resource</div>
          <div style={s.colHead}>IP Address</div>
        </div>

        {loading ? (
          <div style={s.empty}>Loading audit log...</div>
        ) : logs.length === 0 ? (
          <div style={s.empty}>No events found for the selected filters.</div>
        ) : logs.map((log, i) => {
          const et = log.event_type || log.action || 'default';
          return (
            <div key={log.id} style={{ ...s.logRow, borderBottom: i < logs.length - 1 ? '1px solid #f8fafc' : 'none' }}>
              <div style={s.time}>{fmtTime(log.created_at)}</div>
              <div style={s.userInfo}>
                <div style={s.userAvatar}>{log.user?.full_name?.charAt(0) || '?'}</div>
                <div>
                  <div style={s.userName}>{log.user?.full_name || 'System'}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>{log.user?.email || ''}</div>
                </div>
              </div>
              <div>
                <span style={s.eventBadge(et)}>
                  {EVENT_ICONS[et] || EVENT_ICONS.default} {et.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={s.resource} title={log.resource_name || log.entity_type}>
                {log.resource_name || log.entity_type || '—'}
              </div>
              <div style={s.ip}>{log.ip_address || '—'}</div>
            </div>
          );
        })}

        {totalPages > 1 && (
          <div style={s.pagination}>
            <button style={s.pageBtn(page <= 1)} disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p); }}>← Previous</button>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Page {page} of {totalPages}</div>
            <button style={s.pageBtn(page >= totalPages)} disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); load(p); }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
