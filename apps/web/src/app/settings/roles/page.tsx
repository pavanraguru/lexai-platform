'use client';
// apps/web/src/app/settings/roles/page.tsx

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { Plus, Trash2, Edit2, X, Check, Shield } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const FEATURES = [
  { key: 'cases',      label: 'Cases',      desc: 'View and manage cases' },
  { key: 'documents',  label: 'Documents',  desc: 'Upload and manage documents' },
  { key: 'hearings',   label: 'Hearings',   desc: 'Schedule and manage hearings' },
  { key: 'tasks',      label: 'Tasks',      desc: 'Create and manage tasks' },
  { key: 'clients',    label: 'Clients',    desc: 'View and manage clients' },
  { key: 'invoices',   label: 'Billing',    desc: 'View and manage invoices' },
  { key: 'drafts',     label: 'Drafts',     desc: 'Create and edit drafts' },
  { key: 'agents',     label: 'AI Agents',  desc: 'Run AI analysis agents' },
  { key: 'calendar',   label: 'Calendar',   desc: 'View hearing calendar' },
  { key: 'filings',    label: 'Filings',    desc: 'Access court filings' },
  { key: 'analytics',  label: 'Insights',   desc: 'View analytics and reports' },
];

type AccessLevel = 'none' | 'view' | 'edit';

interface Permission { feature: string; access_level: AccessLevel; }
interface Role { id: string; name: string; description: string; is_default: boolean; permissions: Permission[]; }

const LEVEL_STYLES: Record<AccessLevel, { bg: string; color: string; label: string }> = {
  none: { bg: '#f1f5f9', color: '#94a3b8', label: 'No Access' },
  view: { bg: '#dbeafe', color: '#1d4ed8', label: 'View Only' },
  edit: { bg: '#dcfce7', color: '#15803d', label: 'Edit' },
};

function PermissionMatrix({
  permissions, onChange, readonly,
}: { permissions: Permission[]; onChange?: (p: Permission[]) => void; readonly?: boolean }) {
  function getLevel(feature: string): AccessLevel {
    return (permissions.find(p => p.feature === feature)?.access_level as AccessLevel) || 'none';
  }

  function cycle(feature: string) {
    if (readonly) return;
    const current = getLevel(feature);
    const next: AccessLevel = current === 'none' ? 'view' : current === 'view' ? 'edit' : 'none';
    const updated = permissions.filter(p => p.feature !== feature);
    if (next !== 'none') updated.push({ feature, access_level: next });
    onChange?.(updated);
  }

  const s: Record<string, React.CSSProperties> = {
    grid: { display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0' },
    row: { display: 'contents' },
    featureCell: { padding: '10px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', flexDirection: 'column' as const, justifyContent: 'center' },
    featureLabel: { fontSize: '13px', fontWeight: 600, color: '#022448' },
    featureDesc: { fontSize: '11px', color: '#94a3b8', marginTop: '2px' },
    levelCell: { padding: '10px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    levelBtn: (level: AccessLevel): React.CSSProperties => ({
      ...LEVEL_STYLES[level],
      fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '20px',
      border: 'none', cursor: readonly ? 'default' : 'pointer',
      fontFamily: 'Manrope, sans-serif', whiteSpace: 'nowrap' as const,
    }),
  };

  return (
    <div style={s.grid}>
      <div style={{ ...s.featureCell, borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em' }}>FEATURE</div>
      </div>
      <div style={{ ...s.levelCell, borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em' }}>ACCESS</div>
      </div>
      {FEATURES.map(f => {
        const level = getLevel(f.key);
        return (
          <div key={f.key} style={s.row}>
            <div style={s.featureCell}>
              <div style={s.featureLabel}>{f.label}</div>
              <div style={s.featureDesc}>{f.desc}</div>
            </div>
            <div style={s.levelCell}>
              <button style={s.levelBtn(level)} onClick={() => cycle(f.key)}>
                {LEVEL_STYLES[level].label}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RolesPage() {
  const { token, user } = useAuthStore();
  const isAdmin = ['managing_partner', 'super_admin'].includes(user?.role || '');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as Permission[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  function load() {
    fetch(`${BASE}/v1/team/roles`, { headers: h })
      .then(r => r.json())
      .then(d => setRoles(d.data || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newRole.name.trim()) return setError('Role name required');
    setSaving(true); setError('');
    try {
      const res = await fetch(`${BASE}/v1/team/roles`, {
        method: 'POST', headers: h, body: JSON.stringify(newRole),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setCreating(false);
      setNewRole({ name: '', description: '', permissions: [] });
      load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function handleUpdate() {
    if (!editing) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`${BASE}/v1/team/roles/${editing.id}`, {
        method: 'PATCH', headers: h,
        body: JSON.stringify({ name: editing.name, description: editing.description, permissions: editing.permissions }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditing(null);
      load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this role?')) return;
    await fetch(`${BASE}/v1/team/roles/${id}`, { method: 'DELETE', headers: h });
    load();
  }

  const s: Record<string, React.CSSProperties> = {
    page: { padding: 'clamp(20px,4vw,40px)', fontFamily: 'Manrope, sans-serif', maxWidth: '860px' },
    heading: { fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', marginBottom: '4px' },
    sub: { fontSize: '14px', color: '#64748b', marginBottom: '28px' },
    headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
    sectionTitle: { fontFamily: 'Newsreader, serif', fontSize: '16px', fontWeight: 700, color: '#022448' },
    card: { background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden', marginBottom: '16px' },
    cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' },
    roleName: { fontFamily: 'Newsreader, serif', fontSize: '16px', fontWeight: 700, color: '#022448' },
    roleDesc: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
    defaultBadge: { fontSize: '10px', fontWeight: 700, background: '#d5e3ff', color: '#001c3b', padding: '2px 8px', borderRadius: '20px' },
    actionBtn: { background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#022448', fontFamily: 'Manrope, sans-serif' },
    addBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#022448', color: '#ffe088', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' },
    input: { width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontFamily: 'Manrope, sans-serif', boxSizing: 'border-box' as const, outline: 'none', marginBottom: '12px' },
    primaryBtn: { padding: '10px 22px', background: '#022448', color: '#ffe088', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' },
    cancelBtn: { padding: '10px 18px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' },
    errorBox: { background: '#ffdad6', color: '#ba1a1a', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' },
    hint: { fontSize: '12px', color: '#94a3b8', padding: '10px 16px', textAlign: 'center' as const },
  };

  if (loading) return <div style={s.page}><div style={{ color: '#64748b' }}>Loading roles...</div></div>;

  return (
    <div style={s.page}>
      <div style={s.heading}>Permission Roles</div>
      <div style={s.sub}>Define custom permission sets and assign them to team members. Click any access level to cycle through No Access → View → Edit.</div>

      <div style={s.headerRow}>
        <div style={s.sectionTitle}>{roles.length} role{roles.length !== 1 ? 's' : ''}</div>
        {isAdmin && (
          <button style={s.addBtn} onClick={() => { setCreating(true); setError(''); }}>
            <Plus size={14} /> Create Role
          </button>
        )}
      </div>

      {/* Create new role */}
      {creating && (
        <div style={{ ...s.card, border: '2px solid #022448' }}>
          <div style={{ padding: '20px' }}>
            <div style={{ fontFamily: 'Newsreader, serif', fontSize: '16px', fontWeight: 700, color: '#022448', marginBottom: '14px' }}>New Role</div>
            {error && <div style={s.errorBox}>{error}</div>}
            <input style={s.input} placeholder="Role name (e.g. Junior Associate)" value={newRole.name} onChange={e => setNewRole(p => ({ ...p, name: e.target.value }))} />
            <input style={s.input} placeholder="Description (optional)" value={newRole.description} onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))} />
            <div style={{ marginBottom: '16px' }}>
              <PermissionMatrix permissions={newRole.permissions} onChange={p => setNewRole(prev => ({ ...prev, permissions: p }))} />
            </div>
            <div style={s.hint}>Click any access level button to toggle: No Access → View Only → Edit → No Access</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button style={s.cancelBtn} onClick={() => setCreating(false)}>Cancel</button>
              <button style={{ ...s.primaryBtn, opacity: saving ? 0.7 : 1 }} disabled={saving} onClick={handleCreate}>
                {saving ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing roles */}
      {roles.map(role => (
        <div key={role.id} style={s.card}>
          <div style={s.cardHeader}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} color="#022448" />
                <div style={s.roleName}>{role.name}</div>
                {role.is_default && <span style={s.defaultBadge}>Default</span>}
              </div>
              {role.description && <div style={s.roleDesc}>{role.description}</div>}
            </div>
            {isAdmin && !role.is_default && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={s.actionBtn} onClick={() => setEditing(editing?.id === role.id ? null : { ...role })}>
                  <Edit2 size={12} /> {editing?.id === role.id ? 'Cancel' : 'Edit'}
                </button>
                <button style={{ ...s.actionBtn, color: '#ba1a1a' }} onClick={() => handleDelete(role.id)}>
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>

          {editing?.id === role.id ? (
            <div style={{ padding: '16px 20px' }}>
              {error && <div style={s.errorBox}>{error}</div>}
              <input style={s.input} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : p)} />
              <input style={s.input} value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : p)} placeholder="Description" />
              <PermissionMatrix
                permissions={editing.permissions}
                onChange={p => setEditing(prev => prev ? { ...prev, permissions: p } : prev)}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', padding: '0' }}>
                <button style={s.cancelBtn} onClick={() => setEditing(null)}>Cancel</button>
                <button style={{ ...s.primaryBtn, opacity: saving ? 0.7 : 1 }} disabled={saving} onClick={handleUpdate}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <PermissionMatrix permissions={role.permissions} readonly />
          )}
        </div>
      ))}

      {roles.length === 0 && !creating && (
        <div style={{ ...s.card, padding: '40px', textAlign: 'center' as const }}>
          <Shield size={36} color="#d1d5db" style={{ marginBottom: '12px' }} />
          <div style={{ color: '#64748b', fontSize: '14px' }}>No custom roles yet. Create one to define granular permissions for your team.</div>
        </div>
      )}
    </div>
  );
}
