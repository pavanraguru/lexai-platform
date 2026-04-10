'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import { Users, Plus, Phone, Mail, X, Search } from 'lucide-react';

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

export default function ClientsPage() {
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '2rem', fontWeight: 700, color: '#022448', margin: '0 0 4px' }}>Clients</h1>
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
              <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.3rem', color: '#022448', margin: 0 }}>New Client</h2>
              <button onClick={() => { setShowAdd(false); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#74777f', padding: '4px' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={lbl}>Full Name *</label><input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Ramesh Kumar" style={inp} /></div>
              <div><label style={lbl}>Phone *</label><input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" style={inp} /></div>
              <div><label style={lbl}>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ramesh@example.com" style={inp} /></div>
              <div><label style={lbl}>Address</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123, MG Road, Delhi" style={inp} /></div>
              <div><label style={lbl}>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any notes about this client..." style={{ ...inp, resize: 'none' }} /></div>
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
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden', display: 'inline-block', width: '100%', maxWidth: '640px' }}>
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
              <div style={{ display: 'flex', gap: '20px', flexShrink: 0, textAlign: 'right' }}>
                {Number(client.outstanding_balance_paise) > 0 && (
                  <div>
                    <p style={{ fontSize: '10px', color: '#74777f', margin: '0 0 2px', fontWeight: 600 }}>OUTSTANDING</p>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#ba1a1a', margin: 0 }}>
                      ₹{(Number(client.outstanding_balance_paise) / 100).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: '10px', color: '#74777f', margin: '0 0 2px', fontWeight: 600 }}>INVOICES</p>
                  <p style={{ fontSize: '14px', fontWeight: 800, color: '#022448', margin: 0 }}>{client._count?.invoices || 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
