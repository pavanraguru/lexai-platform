'use client';
// apps/web/src/app/settings/team/page.tsx

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { Users, Plus, Mail, Trash2, ChevronDown, Shield, X, Check, Copy } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const BASE_ROLES = [
  { value: 'managing_partner', label: 'Managing Partner' },
  { value: 'senior_advocate', label: 'Senior Advocate' },
  { value: 'junior_associate', label: 'Junior Associate' },
  { value: 'clerk', label: 'Clerk' },
];

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  managing_partner: { bg: '#d5e3ff', color: '#001c3b' },
  senior_advocate:  { bg: '#ede9fe', color: '#5b21b6' },
  junior_associate: { bg: '#dcfce7', color: '#15803d' },
  clerk:            { bg: '#fef3c7', color: '#d97706' },
  super_admin:      { bg: '#ffdad6', color: '#ba1a1a' },
  client:           { bg: '#f1f5f9', color: '#475569' },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtLastSeen(d: string | null) {
  if (!d) return 'Never';
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return fmtDate(d);
}

export default function TeamPage() {
  const { token, user } = useAuthStore();
  const isAdmin = ['managing_partner', 'super_admin'].includes(user?.role || '');

  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', base_role: 'junior_associate', custom_role_id: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  function load() {
    Promise.all([
      fetch(`${BASE}/v1/team/members`, { headers: h }).then(r => r.json()),
      isAdmin ? fetch(`${BASE}/v1/team/invites`, { headers: h }).then(r => r.json()) : Promise.resolve({ data: [] }),
      fetch(`${BASE}/v1/team/roles`, { headers: h }).then(r => r.json()),
    ]).then(([md, id, rd]) => {
      setMembers(md.data || []);
      setInvites(id.data || []);
      setRoles(rd.data || []);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleInvite() {
    if (!inviteForm.email || !inviteForm.full_name) return setError('Email and name required');
    setInviting(true); setError('');
    try {
      const res = await fetch(`${BASE}/v1/team/invites`, {
        method: 'POST', headers: h,
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setInviteUrl(data.invite_url);
      load();
    } catch (e: any) { setError(e.message); }
    setInviting(false);
  }

  async function handleRoleChange(userId: string, newRole: string) {
    await fetch(`${BASE}/v1/team/members/${userId}`, {
      method: 'PATCH', headers: h, body: JSON.stringify({ role: newRole }),
    });
    load();
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remove this member? They will lose access immediately.')) return;
    await fetch(`${BASE}/v1/team/members/${userId}`, { method: 'DELETE', headers: h });
    load();
  }

  async function handleCancelInvite(id: string) {
    await fetch(`${BASE}/v1/team/invites/${id}`, { method: 'DELETE', headers: h });
    load();
  }

  function copyInvite() {
    try { navigator.clipboard.writeText(inviteUrl); } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const s: Record<string, React.CSSProperties> = {
    page: { padding: 'clamp(20px,4vw,40px)', fontFamily: 'Manrope, sans-serif', maxWidth: '860px' },
    heading: { fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', marginBottom: '4px' },
    sub: { fontSize: '14px', color: '#64748b', marginBottom: '28px' },
    headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
    sectionTitle: { fontFamily: 'Newsreader, serif', fontSize: '16px', fontWeight: 700, color: '#022448' },
    card: { background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden', marginBottom: '20px' },
    memberRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: '1px solid #f8fafc' },
    avatar: { width: '38px', height: '38px', borderRadius: '50%', background: '#ffe088', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#022448', flexShrink: 0 },
    memberName: { fontSize: '14px', fontWeight: 600, color: '#022448' },
    memberEmail: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
    rolePill: (role: string): React.CSSProperties => ({
      ...(ROLE_COLORS[role] || { bg: '#f1f5f9', color: '#374151' }),
      fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
    }),
    lastSeen: { fontSize: '11px', color: '#94a3b8' },
    inviteBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#022448', color: '#ffe088', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' },
    modal: { position: 'fixed' as const, inset: 0, background: 'rgba(2,36,72,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' },
    modalBox: { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '460px', boxShadow: '0 24px 64px rgba(2,36,72,0.2)' },
    modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' },
    modalTitle: { fontFamily: 'Newsreader, serif', fontSize: '18px', fontWeight: 700, color: '#022448' },
    modalBody: { padding: '20px 24px' },
    label: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#43474e', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' },
    input: { width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontFamily: 'Manrope, sans-serif', color: '#111827', boxSizing: 'border-box' as const, outline: 'none', marginBottom: '14px' },
    select: { width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontFamily: 'Manrope, sans-serif', color: '#111827', marginBottom: '14px' },
    primaryBtn: { width: '100%', padding: '12px', background: '#022448', color: '#ffe088', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' },
    errorBox: { background: '#ffdad6', color: '#ba1a1a', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' },
    successBox: { background: '#dcfce7', borderRadius: '12px', padding: '16px', marginBottom: '14px', textAlign: 'center' as const },
    urlBox: { background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#475569', wordBreak: 'break-all' as const, fontFamily: 'monospace', marginBottom: '10px' },
    copyBtn: { width: '100%', padding: '10px', background: copied ? '#dcfce7' : '#f1f5f9', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: copied ? '#15803d' : '#022448', fontFamily: 'Manrope, sans-serif' },
    removeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center' },
    inviteRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', borderBottom: '1px solid #f8fafc', background: '#fafffe' },
    pendingBadge: { fontSize: '10px', fontWeight: 700, background: '#fff7e6', color: '#d97706', padding: '2px 8px', borderRadius: '20px' },
  };

  if (loading) return <div style={s.page}><div style={{ color: '#64748b' }}>Loading team...</div></div>;

  return (
    <div style={s.page}>
      <div style={s.heading}>Team Management</div>
      <div style={s.sub}>Manage your firm's team members, roles, and access.</div>

      {/* Members */}
      <div style={s.headerRow}>
        <div style={s.sectionTitle}>Team Members ({members.length})</div>
        {isAdmin && (
          <button style={s.inviteBtn} onClick={() => { setShowInvite(true); setInviteUrl(''); setError(''); }}>
            <Plus size={14} /> Invite Member
          </button>
        )}
      </div>

      <div style={s.card}>
        {members.map((m, i) => (
          <div key={m.id} style={{ ...s.memberRow, borderBottom: i < members.length - 1 ? '1px solid #f8fafc' : 'none' }}>
            <div style={s.avatar}>{m.full_name?.charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.memberName}>{m.full_name} {m.id === user?.id && <span style={{ fontSize: '10px', color: '#94a3b8' }}>(you)</span>}</div>
              <div style={s.memberEmail}>{m.email}</div>
            </div>
            <div style={s.lastSeen}>Last seen: {fmtLastSeen(m.last_seen_at)}</div>
            {isAdmin && m.id !== user?.id ? (
              <select
                value={m.role}
                onChange={e => handleRoleChange(m.id, e.target.value)}
                style={{ fontSize: '12px', padding: '4px 8px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontFamily: 'Manrope, sans-serif', color: '#022448' }}
              >
                {BASE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            ) : (
              <span style={s.rolePill(m.role)}>{m.role?.replace(/_/g, ' ')}</span>
            )}
            {isAdmin && m.id !== user?.id && (
              <button style={s.removeBtn} onClick={() => handleRemove(m.id)} title="Remove member">
                <Trash2 size={14} color="#ba1a1a" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Pending Invites */}
      {isAdmin && invites.length > 0 && (
        <>
          <div style={{ ...s.sectionTitle, marginBottom: '12px' }}>Pending Invites ({invites.length})</div>
          <div style={s.card}>
            {invites.map((inv, i) => (
              <div key={inv.id} style={{ ...s.inviteRow, borderBottom: i < invites.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <Mail size={16} color="#d97706" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#022448' }}>{inv.full_name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{inv.email} · Expires {fmtDate(inv.expires_at)}</div>
                </div>
                <span style={s.pendingBadge}>Pending</span>
                <button style={s.removeBtn} onClick={() => handleCancelInvite(inv.id)}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowInvite(false)}>
          <div style={s.modalBox}>
            <div style={s.modalHeader}>
              <div style={s.modalTitle}>Invite Team Member</div>
              <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#74777f' }}><X size={18} /></button>
            </div>
            <div style={s.modalBody}>
              {inviteUrl ? (
                <>
                  <div style={s.successBox}>
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>🎉</div>
                    <div style={{ fontWeight: 700, color: '#15803d', fontSize: '15px' }}>Invite link created!</div>
                    <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>Share this link with {inviteForm.full_name}</div>
                  </div>
                  <div style={s.urlBox}>{inviteUrl}</div>
                  <button style={s.copyBtn} onClick={copyInvite}>
                    {copied ? '✓ Copied!' : 'Copy invite link'}
                  </button>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' as const, marginTop: '8px' }}>Link valid for 7 days.</div>
                </>
              ) : (
                <>
                  {error && <div style={s.errorBox}>{error}</div>}
                  <label style={s.label}>Full Name</label>
                  <input style={s.input} value={inviteForm.full_name} onChange={e => setInviteForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Advocate Ramesh Kumar" />
                  <label style={s.label}>Email Address</label>
                  <input style={s.input} type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="ramesh@firm.com" />
                  <label style={s.label}>Role</label>
                  <select style={s.select} value={inviteForm.base_role} onChange={e => setInviteForm(p => ({ ...p, base_role: e.target.value }))}>
                    {BASE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  {roles.length > 0 && (
                    <>
                      <label style={s.label}>Custom Permission Role (optional)</label>
                      <select style={s.select} value={inviteForm.custom_role_id} onChange={e => setInviteForm(p => ({ ...p, custom_role_id: e.target.value }))}>
                        <option value="">None</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </>
                  )}
                  <button style={{ ...s.primaryBtn, opacity: inviting ? 0.7 : 1 }} disabled={inviting} onClick={handleInvite}>
                    {inviting ? 'Sending invite...' : 'Create invite link'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
