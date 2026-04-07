'use client';
// ============================================================
// LexAI India — Clients Page
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import { Users, Plus, Phone, Mail, X, Loader2, Search } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
      const res = await fetch(`${BASE}/v1/clients${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const clients: any[] = data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await fetch(`${BASE}/v1/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      setShowAdd(false);
      setForm({ full_name: '', phone: '', email: '', address: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['clients'] });
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white"
          style={{ backgroundColor: '#1E3A5F' }}>
          <Plus size={15} /> Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone or email..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
      </div>

      {/* Add client modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">New Client</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                <input type="text" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Ramesh Kumar" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
                <input type="tel" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="9876543210" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="ramesh@example.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="123, MG Road, Delhi" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} placeholder="Any notes about this client..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              </div>
              {error && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-60"
                  style={{ backgroundColor: '#1E3A5F' }}>
                  {saving ? 'Saving...' : 'Add Client'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)}
                  className="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">{search ? 'No clients found' : 'No clients yet'}</p>
          {!search && <p className="text-sm text-gray-400 mt-1">Add your first client to start managing their cases</p>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {clients.map((client: any) => (
            <div key={client.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: '#D4AF37', color: '#1E3A5F' }}>
                {client.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{client.full_name}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  {client.phone && <span className="flex items-center gap-1"><Phone size={10} />{client.phone}</span>}
                  {client.email && <span className="flex items-center gap-1"><Mail size={10} />{client.email}</span>}
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 text-right">
                {client.outstanding_balance_paise > 0 && (
                  <div>
                    <p className="text-xs text-gray-400">Outstanding</p>
                    <p className="text-sm font-semibold text-red-600">
                      ₹{(Number(client.outstanding_balance_paise) / 100).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400">Invoices</p>
                  <p className="text-sm font-semibold text-gray-700">{client._count?.invoices || 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
