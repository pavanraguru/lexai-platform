'use client';
// ============================================================
// LexAI India — Invoices & Time Tracking Page
// PRD v1.1 Phase 2c — Billing
// ============================================================

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import { Receipt, Plus, Clock, CheckCircle2, AlertCircle, FileText, X, Loader2 } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  issued: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-400',
};

type Tab = 'invoices' | 'time';

export default function InvoicesPage() {
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('invoices');
  const [showTimeEntry, setShowTimeEntry] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [timeForm, setTimeForm] = useState({ case_id: '', date: new Date().toISOString().split('T')[0], hours: '', description: '', hourly_rate_paise: '500000', billable: true });
  const [saving, setSaving] = useState(false);

  const { data: invoicesData, isLoading: invLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/invoices`, { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: timeData, isLoading: timeLoading } = useQuery({
    queryKey: ['time-entries'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/invoices/time-entries`, { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token && tab === 'time',
  });

  const { data: casesData } = useQuery({
    queryKey: ['cases-list'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/cases?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const invoices: any[] = invoicesData || [];
  const timeEntries: any[] = timeData || [];
  const cases: any[] = casesData || [];

  const totalOutstanding = invoices
    .filter(i => i.status === 'issued' || i.status === 'overdue')
    .reduce((sum, i) => sum + Number(i.balance_paise), 0);

  const handleAddTime = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`${BASE}/v1/invoices/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...timeForm, hours: parseFloat(timeForm.hours), hourly_rate_paise: parseInt(timeForm.hourly_rate_paise) }),
      });
      setShowTimeEntry(false);
      setTimeForm({ case_id: '', date: new Date().toISOString().split('T')[0], hours: '', description: '', hourly_rate_paise: '500000', billable: true });
      qc.invalidateQueries({ queryKey: ['time-entries'] });
    } catch {}
    setSaving(false);
  };

  const handleIssue = async (invoiceId: string) => {
    await fetch(`${BASE}/v1/invoices/${invoiceId}/issue`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
    });
    qc.invalidateQueries({ queryKey: ['invoices'] });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>Billing</h1>
          {totalOutstanding > 0 && (
            <p className="text-sm text-red-600 font-medium mt-0.5">
              ₹{(totalOutstanding / 100).toLocaleString('en-IN')} outstanding
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowTimeEntry(true); setTab('time'); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50">
            <Clock size={14} /> Log Time
          </button>
          <button onClick={() => setShowNewInvoice(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-white"
            style={{ backgroundColor: '#1E3A5F' }}>
            <Plus size={14} /> New Invoice
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {(['invoices', 'time'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-1.5 px-4 rounded-lg text-sm font-medium capitalize transition-all
              ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'time' ? 'Time Entries' : 'Invoices'}
          </button>
        ))}
      </div>

      {/* Time Entry Form */}
      {showTimeEntry && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Log Time</h3>
            <button onClick={() => setShowTimeEntry(false)}><X size={16} className="text-gray-400" /></button>
          </div>
          <form onSubmit={handleAddTime} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Case *</label>
              <select required value={timeForm.case_id} onChange={e => setTimeForm({ ...timeForm, case_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">Select case...</option>
                {cases.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input type="date" required value={timeForm.date} onChange={e => setTimeForm({ ...timeForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hours *</label>
              <input type="number" step="0.5" min="0.1" max="24" required value={timeForm.hours}
                onChange={e => setTimeForm({ ...timeForm, hours: e.target.value })}
                placeholder="e.g. 2.5" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
              <input type="text" required value={timeForm.description} onChange={e => setTimeForm({ ...timeForm, description: e.target.value })}
                placeholder="e.g. Drafted bail application, reviewed FIR" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rate (₹/hr)</label>
              <input type="number" value={parseInt(timeForm.hourly_rate_paise) / 100}
                onChange={e => setTimeForm({ ...timeForm, hourly_rate_paise: String(parseInt(e.target.value || '0') * 100) })}
                placeholder="5000" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="sm:col-span-3 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={timeForm.billable} onChange={e => setTimeForm({ ...timeForm, billable: e.target.checked })}
                  className="rounded" />
                Billable
              </label>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60"
                style={{ backgroundColor: '#1E3A5F' }}>
                {saving ? 'Saving...' : 'Log Time'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invoices Tab */}
      {tab === 'invoices' && (
        invLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : invoices.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Receipt size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No invoices yet</p>
            <p className="text-sm text-gray-400 mt-1">Log time entries and generate your first invoice</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 text-sm">{inv.invoice_number}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[inv.status]}`}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>{inv.client?.full_name}</span>
                    {inv.case && <><span>·</span><span className="truncate max-w-xs">{inv.case?.title}</span></>}
                    <span>·</span>
                    <span>{new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-gray-900">₹{(Number(inv.total_paise) / 100).toLocaleString('en-IN')}</p>
                  {Number(inv.balance_paise) > 0 && Number(inv.balance_paise) < Number(inv.total_paise) && (
                    <p className="text-xs text-orange-600">₹{(Number(inv.balance_paise) / 100).toLocaleString('en-IN')} due</p>
                  )}
                </div>
                {inv.status === 'draft' && (
                  <button onClick={() => handleIssue(inv.id)}
                    className="px-3 py-1.5 text-xs font-medium text-white rounded-lg flex-shrink-0"
                    style={{ backgroundColor: '#1E3A5F' }}>
                    Issue
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Time Entries Tab */}
      {tab === 'time' && (
        timeLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : timeEntries.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Clock size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No time entries yet</p>
            <button onClick={() => setShowTimeEntry(true)} className="mt-3 text-sm text-blue-600 hover:underline">
              Log your first time entry
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {/* Summary row */}
            <div className="px-5 py-3 bg-gray-50 flex items-center gap-6 text-sm">
              <span className="text-gray-500">
                <strong className="text-gray-900">{timeEntries.filter((e: any) => !e.billed).length}</strong> unbilled entries
              </span>
              <span className="text-gray-500">
                <strong className="text-gray-900">
                  {timeEntries.filter((e: any) => !e.billed).reduce((s: number, e: any) => s + Number(e.hours), 0).toFixed(1)}h
                </strong> unbilled
              </span>
              <span className="text-gray-500">
                <strong className="text-gray-900">
                  ₹{(timeEntries.filter((e: any) => !e.billed).reduce((s: number, e: any) => s + Number(e.hours) * Number(e.hourly_rate_paise), 0) / 100).toLocaleString('en-IN')}
                </strong> to bill
              </span>
            </div>
            {timeEntries.map((entry: any) => (
              <div key={entry.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{entry.description}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>{entry.case_title}</span>
                    <span>·</span>
                    <span>{new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <span>·</span>
                    <span>₹{(Number(entry.hourly_rate_paise) / 100).toLocaleString('en-IN')}/hr</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{Number(entry.hours).toFixed(1)}h</p>
                  <p className="text-xs text-gray-500">₹{((Number(entry.hours) * Number(entry.hourly_rate_paise)) / 100).toLocaleString('en-IN')}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${entry.billed ? 'bg-green-100 text-green-700' : entry.billable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {entry.billed ? 'Billed' : entry.billable ? 'Unbilled' : 'Non-billable'}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
