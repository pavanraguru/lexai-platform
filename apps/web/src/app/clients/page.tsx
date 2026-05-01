'use client';
import { useLang } from '@/hooks/useLanguage';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import { Users, Plus, Phone, Mail, X, Search, ExternalLink } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const pg: React.CSSProperties = { padding: '32px 28px', fontFamily: 'Manrope, sans-serif' };

const inp: React.CSSProperties = {
  padding: '10px 13px', border: '1px solid rgba(196,198,207,0.5)',
  borderRadius: '9px', fontSize: '14px', color: '#191c1e',
  background: '#fff', outline: 'none', fontFamily: 'Manrope, sans-serif',
  width: '100%', boxSizing: 'border-box',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  color: '#43474e', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px',
};

// ── Invite to Portal Modal ────────────────────────────────────
function InvitePortalModal({ client, token, onClose }: { client: any; token: string; onClose: () => void }) {
  const [email, setEmail] = useState(client.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleInvite() {
    if (!email) return setError('Email is required');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/v1/portal/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ client_id: client.id, email, name: client.full_name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invite');
      setInviteUrl(data.invite_url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    try { navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch(e) {}
  }

  const s: Record<string, React.CSSProperties> = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
    modal: { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '440px', boxShadow: '0 24px 64px rgba(2,36,72,0.2)' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(196,198,207,0.15)' },
    title: { fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: 0 },
    body: { padding: '20px 24px' },
    clientRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px', marginBottom: '16px' },
    avatar: { width: '38px', height: '38px', borderRadius: '50%', background: '#ffe088', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 800, color: '#022448', flexShrink: 0 },
    clientName: { fontSize: '14px', fontWeight: 700, color: '#022448' },
    clientSub: { fontSize: '12px', color: '#74777f', marginTop: '2px' },
    successBox: { background: '#dcfce7', borderRadius: '12px', padding: '16px', textAlign: 'center' as const, marginBottom: '14px' },
    successTitle: { color: '#15803d', fontWeight: 700, fontSize: '15px', marginBottom: '4px' },
    urlBox: { background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#475569', wordBreak: 'break-all' as const, marginBottom: '10px', fontFamily: 'monospace' },
    copyBtn: { width: '100%', padding: '10px', background: copied ? '#dcfce7' : '#f1f5f9', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: copied ? '#15803d' : '#022448', fontFamily: 'Manrope, sans-serif' },
    primaryBtn: { width: '100%', padding: '12px', background: '#022448', color: '#ffe088', border: 'none', borderRadius: '9px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' },
    errorBox: { padding: '10px 13px', background: '#ffdad6', borderRadius: '8px', fontSize: '13px', color: '#93000a', marginBottom: '12px' },
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <h2 style={s.title}>Invite to Client Portal</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#74777f' }}><X size={18} /></button>
        </div>
        <div style={s.body}>
          <div style={s.clientRow}>
            <div style={s.avatar}>{client.full_name?.charAt(0)}</div>
            <div>
              <div style={s.clientName}>{client.full_name}</div>
              <div style={s.clientSub}>{client.phone}</div>
            </div>
          </div>

          {inviteUrl ? (
            <>
              <div style={s.successBox}>
                <div style={{ fontSize: '28px', marginBottom: '6px' }}>📨</div>
                <div style={s.successTitle}>Invite ready!</div>
                <div style={{ fontSize: '12px', color: '#16a34a' }}>Share this link with {client.full_name}</div>
              </div>
              <div style={s.urlBox}>{inviteUrl}</div>
              <button style={s.copyBtn} onClick={copyLink}>
                {copied ? '✓ Copied!' : 'Copy invite link'}
              </button>
              <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' as const, marginTop: '8px' }}>
                Link expires in 48 hours. Client sets their own password.
              </div>
            </>
          ) : (
            <>
              <label style={lbl}>Client email</label>
              <input
                style={{ ...inp, marginBottom: '14px' }}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="client@example.com"
              />
              {error && <div style={s.errorBox}>{error}</div>}
              <button
                style={{ ...s.primaryBtn, opacity: loading ? 0.7 : 1 }}
                disabled={loading}
                onClick={handleInvite}
              >
                {loading ? 'Sending...' : 'Send portal invite'}
              </button>
              <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' as const, marginTop: '8px' }}>
                Client will receive a secure link to set up their portal access.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ClientsPage() {
  const { token } = useAuthStore();
  const { tr } = useLang();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [inviteClient, setInviteClient] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: async () => {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`${BASE}/v1/clients${q}`, { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const clients: any[] = data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await fetch(`${BASE}/v1/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to add client');
      setShowAdd(false);
      setForm({ full_name: '', phone: '', email: '', address: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['clients'] });
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  };

  return (
    <div style={pg}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '2rem', fontWeight: 700, color: '#022448', margin: '0 0 4px' }}>{tr('clients')}</h1>
          <p style={{ fontSize: '14px', color: '#74777f', margin: 0 }}>{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#022448', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', flexShrink: 0 }}>
          <Plus size={15} /> Add Client
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={15} color="#74777f" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone or email..."
          style={{ ...inp, paddingLeft: '38px' }} />
      </div>

      {/* Add Client Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '460px', boxShadow: '0 24px 64px rgba(2,36,72,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(196,198,207,0.15)' }}>
              <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.3rem', color: '#022448', margin: 0 }}>{tr('new_client')}</h2>
              <button onClick={() => { setShowAdd(false); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#74777f', padding: '4px' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={lbl}>Full Name *</label><input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Ramesh Kumar" style={inp} /></div>
              <div><label style={lbl}>Phone *</label><input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" style={inp} /></div>
              <div><label style={lbl}>{tr('email')}</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ramesh@example.com" style={inp} /></div>
              <div><label style={lbl}>{tr('address')}</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123, MG Road, Delhi" style={inp} /></div>
              <div><label style={lbl}>{tr('notes')}</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any notes about this client..." style={{ ...inp, resize: 'none' }} /></div>
              {error && <div style={{ padding: '10px 13px', background: '#ffdad6', borderRadius: '8px', fontSize: '13px', color: '#93000a', fontWeight: 500 }}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', background: '#022448', color: '#fff', border: 'none', borderRadius: '9px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Manrope, sans-serif', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Adding...' : 'Add Client'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} style={{ padding: '12px 20px', background: 'transparent', color: '#74777f', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '9px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Portal Modal */}
      {inviteClient && (
        <InvitePortalModal
          client={inviteClient}
          token={token || ''}
          onClose={() => setInviteClient(null)}
        />
      )}

      {/* Client List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: '70px', borderRadius: '14px', background: '#edeef0' }} />)}
        </div>
      ) : clients.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '40px 24px', textAlign: 'center', border: '1px solid rgba(196,198,207,0.2)', display: 'inline-block', minWidth: '320px' }}>
          <Users size={40} color="#c4c6cf" style={{ marginBottom: '16px' }} />
          <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: '0 0 8px' }}>
            {search ? 'No clients found' : 'No clients yet'}
          </p>
          <p style={{ fontSize: '14px', color: '#74777f', margin: '0 0 24px' }}>
            {search ? 'Try a different search term' : 'Add your first client to start managing their cases'}
          </p>
          {!search && (
            <button onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#022448', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
              <Plus size={14} /> Add First Client
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden', display: 'inline-block', width: '100%', maxWidth: '720px' }}>
          {clients.map((client: any, i: number) => (
            <div key={client.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderBottom: i < clients.length - 1 ? '1px solid rgba(196,198,207,0.1)' : 'none' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#ffe088', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#022448', flexShrink: 0 }}>
                {client.full_name?.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#022448', margin: '0 0 3px' }}>{client.full_name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {client.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#74777f' }}><Phone size={11} />{client.phone}</span>}
                  {client.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#74777f' }}><Mail size={11} />{client.email}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                {Number(client.outstanding_balance_paise) > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '10px', color: '#74777f', margin: '0 0 2px', fontWeight: 600 }}>OUTSTANDING</p>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#ba1a1a', margin: 0 }}>
                      ₹{(Number(client.outstanding_balance_paise) / 100).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '10px', color: '#74777f', margin: '0 0 2px', fontWeight: 600 }}>INVOICES</p>
                  <p style={{ fontSize: '14px', fontWeight: 800, color: '#022448', margin: 0 }}>{client._count?.invoices || 0}</p>
                </div>
                {/* Invite to Portal button */}
                <button
                  onClick={() => setInviteClient(client)}
                  title="Invite to Client Portal"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '6px 12px', background: '#f0f4ff',
                    border: '1px solid rgba(2,36,72,0.15)', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                    color: '#022448', fontFamily: 'Manrope, sans-serif', whiteSpace: 'nowrap',
                  }}
                >
                  <ExternalLink size={12} /> Portal
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
