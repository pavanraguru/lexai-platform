'use client';
// apps/web/src/app/settings/roles/page.tsx

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { Plus, Trash2, Edit2, Shield, ChevronDown } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const FEATURES = [
  { key: 'cases',     label: 'Cases',     desc: 'View and manage cases' },
  { key: 'documents', label: 'Documents', desc: 'Upload and manage documents' },
  { key: 'hearings',  label: 'Hearings',  desc: 'Schedule and manage hearings' },
  { key: 'tasks',     label: 'Tasks',     desc: 'Create and manage tasks' },
  { key: 'clients',   label: 'Clients',   desc: 'View and manage clients' },
  { key: 'invoices',  label: 'Billing',   desc: 'View and manage invoices' },
  { key: 'drafts',    label: 'Drafts',    desc: 'Create and edit drafts' },
  { key: 'agents',    label: 'AI Agents', desc: 'Run AI analysis agents' },
  { key: 'calendar',  label: 'Calendar',  desc: 'View hearing calendar' },
  { key: 'filings',   label: 'Filings',   desc: 'Access court filings' },
  { key: 'analytics', label: 'Insights',  desc: 'View analytics and reports' },
];

type AL = 'none' | 'view' | 'edit';
interface Perm { feature: string; access_level: AL; }
interface Role { id: string; name: string; description: string; is_default: boolean; permissions: Perm[]; }

const LS: Record<AL, { bg: string; color: string; label: string }> = {
  none: { bg: '#f1f5f9', color: '#94a3b8', label: 'No Access' },
  view: { bg: '#dbeafe', color: '#1d4ed8', label: 'View Only' },
  edit: { bg: '#dcfce7', color: '#15803d', label: 'Edit' },
};

function Matrix({ perms, onChange, readonly }: { perms: Perm[]; onChange?: (p: Perm[]) => void; readonly?: boolean }) {
  function get(f: string): AL { return (perms.find(p => p.feature === f)?.access_level as AL) || 'none'; }
  function cycle(f: string) {
    if (readonly) return;
    const cur = get(f);
    const nxt: AL = cur === 'none' ? 'view' : cur === 'view' ? 'edit' : 'none';
    const upd = perms.filter(p => p.feature !== f);
    if (nxt !== 'none') upd.push({ feature: f, access_level: nxt });
    onChange?.(upd);
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px' }}>
      <div style={{ padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
        <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em' }}>FEATURE</span>
      </div>
      <div style={{ padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', textAlign: 'center' as const }}>
        <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em' }}>ACCESS</span>
      </div>
      {FEATURES.map(f => {
        const lv = get(f.key);
        return [
          <div key={f.key+'L'} style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#022448' }}>{f.label}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{f.desc}</div>
          </div>,
          <div key={f.key+'R'} style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => cycle(f.key)} style={{ ...LS[lv], fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: readonly ? 'default' : 'pointer', fontFamily: 'Manrope, sans-serif', whiteSpace: 'nowrap' as const }}>
              {LS[lv].label}
            </button>
          </div>
        ];
      })}
    </div>
  );
}

export default function RolesPage() {
  const { token, user } = useAuthStore();
  const isAdmin = ['managing_partner', 'super_admin'].includes(user?.role || '');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as Perm[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  function toggle(id: string) { setCollapsed(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  function load() {
    fetch(`${BASE}/v1/team/roles`, { headers: h }).then(r => r.json()).then(d => {
      const data = d.data || [];
      setRoles(data);
      setCollapsed(new Set(data.map((r: Role) => r.id))); // all collapsed by default
    }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newRole.name.trim()) return setError('Role name required');
    setSaving(true); setError('');
    try {
      const res = await fetch(`${BASE}/v1/team/roles`, { method: 'POST', headers: h, body: JSON.stringify(newRole) });
      if (!res.ok) throw new Error((await res.json()).error);
      setCreating(false); setNewRole({ name: '', description: '', permissions: [] }); load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function handleUpdate() {
    if (!editing) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`${BASE}/v1/team/roles/${editing.id}`, { method: 'PATCH', headers: h, body: JSON.stringify(editing) });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditing(null); load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this role?')) return;
    await fetch(`${BASE}/v1/team/roles/${id}`, { method: 'DELETE', headers: h });
    load();
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontFamily: 'Manrope, sans-serif', boxSizing: 'border-box' as const, outline: 'none', marginBottom: '12px' };

  if (loading) return <div style={{ padding: '40px', fontFamily: 'Manrope, sans-serif', color: '#64748b' }}>Loading roles...</div>;

  return (
    <div style={{ padding: 'clamp(20px,4vw,40px)', fontFamily: 'Manrope, sans-serif', maxWidth: '860px' }}>
      <div style={{ fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', marginBottom: '4px' }}>Permission Roles</div>
      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '28px' }}>Define custom permission sets. Click the chevron to expand. Click an access level to cycle: No Access → View Only → Edit.</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ fontFamily: 'Newsreader, serif', fontSize: '16px', fontWeight: 700, color: '#022448' }}>{roles.length} role{roles.length !== 1 ? 's' : ''}</div>
        {isAdmin && (
          <button onClick={() => { setCreating(true); setError(''); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#022448', color: '#ffe088', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            <Plus size={14} /> Create Role
          </button>
        )}
      </div>

      {creating && (
        <div style={{ background: '#fff', borderRadius: '14px', border: '2px solid #022448', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '20px' }}>
            <div style={{ fontFamily: 'Newsreader, serif', fontSize: '16px', fontWeight: 700, color: '#022448', marginBottom: '14px' }}>New Role</div>
            {error && <div style={{ background: '#ffdad6', color: '#ba1a1a', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
            <input style={inp} placeholder="Role name" value={newRole.name} onChange={e => setNewRole(p => ({ ...p, name: e.target.value }))} />
            <input style={inp} placeholder="Description (optional)" value={newRole.description} onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))} />
            <Matrix perms={newRole.permissions} onChange={p => setNewRole(prev => ({ ...prev, permissions: p }))} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button style={{ padding: '10px 18px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }} onClick={() => setCreating(false)}>Cancel</button>
              <button style={{ padding: '10px 22px', background: '#022448', color: '#ffe088', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', opacity: saving ? 0.7 : 1 }} disabled={saving} onClick={handleCreate}>
                {saving ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {roles.map(role => {
        const isCollapsed = collapsed.has(role.id);
        return (
          <div key={role.id} style={{ background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden', marginBottom: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, cursor: 'pointer' }} onClick={() => toggle(role.id)}>
                <Shield size={16} color="#022448" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'Newsreader, serif', fontSize: '16px', fontWeight: 700, color: '#022448' }}>{role.name}</span>
                    {role.is_default && <span style={{ fontSize: '10px', fontWeight: 700, background: '#d5e3ff', color: '#001c3b', padding: '2px 8px', borderRadius: '20px' }}>Default</span>}
                  </div>
                  {role.description && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{role.description}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isAdmin && !role.is_default && (
                  <>
                    <button style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#022448', fontFamily: 'Manrope, sans-serif' }}
                      onClick={() => setEditing(editing?.id === role.id ? null : { ...role })}>
                      <Edit2 size={12} /> {editing?.id === role.id ? 'Cancel' : 'Edit'}
                    </button>
                    <button style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#ba1a1a', fontFamily: 'Manrope, sans-serif' }}
                      onClick={() => handleDelete(role.id)}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </>
                )}
                <button style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#022448' }}
                  onClick={() => toggle(role.id)}>
                  <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                </button>
              </div>
            </div>

            {/* Collapsible body */}
            {!isCollapsed && (
              editing?.id === role.id ? (
                <div style={{ padding: '0 20px 20px' }}>
                  {error && <div style={{ background: '#ffdad6', color: '#ba1a1a', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
                  <input style={inp} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : p)} placeholder="Role name" />
                  <input style={inp} value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : p)} placeholder="Description" />
                  <Matrix perms={editing.permissions} onChange={p => setEditing(prev => prev ? { ...prev, permissions: p } : prev)} />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button style={{ padding: '10px 18px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }} onClick={() => setEditing(null)}>Cancel</button>
                    <button style={{ padding: '10px 22px', background: '#022448', color: '#ffe088', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', opacity: saving ? 0.7 : 1 }} disabled={saving} onClick={handleUpdate}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <Matrix perms={role.permissions} readonly />
              )
            )}
          </div>
        );
      })}

      {roles.length === 0 && !creating && (
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', padding: '40px', textAlign: 'center' as const }}>
          <Shield size={36} color="#d1d5db" style={{ marginBottom: '12px' }} />
          <div style={{ color: '#64748b', fontSize: '14px' }}>No custom roles yet. Create one to define granular permissions.</div>
        </div>
      )}
    </div>
  );
}
