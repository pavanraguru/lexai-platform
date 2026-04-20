'use client';
import { useLang } from '@/hooks/useLanguage';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import { Receipt, Plus, Clock, X, ChevronRight } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const pg: React.CSSProperties = { padding: '32px 28px', fontFamily: 'Manrope, sans-serif' };
const inp: React.CSSProperties = { padding: '10px 13px', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '9px', fontSize: '14px', color: '#191c1e', background: '#fff', outline: 'none', fontFamily: 'Manrope, sans-serif', width: '100%', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#43474e', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px' };

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  draft:   { bg: '#edeef0', color: '#43474e' },
  issued:  { bg: '#d5e3ff', color: '#001c3b' },
  paid:    { bg: '#dcfce7', color: '#15803d' },
  overdue: { bg: '#ffdad6', color: '#93000a' },
};

type Tab = 'invoices' | 'time';

export default function BillingPage() {
  const { token } = useAuthStore();
  const { tr } = useLang();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('invoices');
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [tf, setTf] = useState({ case_id: '', date: new Date().toISOString().split('T')[0], hours: '', description: '', hourly_rate_paise: '500000', billable: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/invoices`, { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: timeEntries = [], isLoading: timeLoading } = useQuery({
    queryKey: ['time-entries'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/invoices/time-entries`, { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token && tab === 'time',
  });

  const { data: cases = [] } = useQuery({
    queryKey: ['cases-billing'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/cases?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const outstanding = (invoices as any[]).filter(i => i.status === 'issued' || i.status === 'overdue').reduce((s, i) => s + Number(i.balance_paise || 0), 0);
  const unbilledEntries = (timeEntries as any[]).filter(e => !e.billed);
  const unbilledAmount = unbilledEntries.reduce((s, e) => s + Number(e.hours) * Number(e.hourly_rate_paise), 0);

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await fetch(`${BASE}/v1/invoices/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...tf, hours: parseFloat(tf.hours), hourly_rate_paise: parseInt(tf.hourly_rate_paise) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to log time');
      setShowTimeForm(false);
      setTf({ case_id: '', date: new Date().toISOString().split('T')[0], hours: '', description: '', hourly_rate_paise: '500000', billable: true });
      qc.invalidateQueries({ queryKey: ['time-entries'] });
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  };

  const handleIssue = async (id: string) => {
    await fetch(`${BASE}/v1/invoices/${id}/issue`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    qc.invalidateQueries({ queryKey: ['invoices'] });
  };

  return (
    <div style={pg}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '2rem', fontWeight: 700, color: '#022448', margin: '0 0 4px' }}>Billing</h1>
          {outstanding > 0 && (
            <p style={{ fontSize: '14px', color: '#ba1a1a', fontWeight: 700, margin: 0 }}>
              ₹{(outstanding / 100).toLocaleString('en-IN')} outstanding
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { setShowTimeForm(true); setTab('time'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#022448', border: '1px solid rgba(2,36,72,0.2)', borderRadius: '9px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            <Clock size={14} /> Log Time
          </button>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#022448', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            <Plus size={14} /> New Invoice
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {unbilledAmount > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: '#ffe088', borderRadius: '12px', padding: '14px 18px', minWidth: '160px', maxWidth: '220px' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, color: '#735c00', letterSpacing: '0.06em', margin: '0 0 6px' }}>UNBILLED HOURS</p>
            <p style={{ fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', margin: 0 }}>{unbilledEntries.reduce((s, e) => s + Number(e.hours), 0).toFixed(1)}h</p>
            <p style={{ fontSize: '12px', color: '#735c00', margin: '4px 0 0' }}>₹{(unbilledAmount / 100).toLocaleString('en-IN')} to bill</p>
          </div>
          <div style={{ background: outstanding > 0 ? '#ffdad6' : '#dcfce7', borderRadius: '12px', padding: '14px 18px', minWidth: '160px', maxWidth: '220px' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, color: outstanding > 0 ? '#93000a' : '#15803d', letterSpacing: '0.06em', margin: '0 0 6px' }}>OUTSTANDING</p>
            <p style={{ fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', margin: 0 }}>₹{(outstanding / 100).toLocaleString('en-IN')}</p>
            <p style={{ fontSize: '12px', color: outstanding > 0 ? '#93000a' : '#15803d', margin: '4px 0 0' }}>{(invoices as any[]).filter(i => i.status === 'issued').length} invoice{(invoices as any[]).filter(i => i.status === 'issued').length !== 1 ? 's' : ''} pending</p>
          </div>
        </div>
      )}

      {/* Log Time Form */}
      {showTimeForm && (
        <div style={{ background: '#f8f9fb', border: '1px solid rgba(2,36,72,0.1)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#022448', margin: 0 }}>{tr('log_time')}</h3>
            <button onClick={() => setShowTimeForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#74777f' }}><X size={16} /></button>
          </div>
          <form onSubmit={handleLogTime} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Case *</label>
              <select required value={tf.case_id} onChange={e => setTf({ ...tf, case_id: e.target.value })} style={{ ...inp, appearance: 'none' }}>
                <option value="">Select case...</option>
                {(cases as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Date *</label>
              <input type="date" required value={tf.date} onChange={e => setTf({ ...tf, date: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>Hours *</label>
              <input type="number" step="0.5" min="0.5" max="24" required value={tf.hours} onChange={e => setTf({ ...tf, hours: e.target.value })} placeholder="e.g. 2.5" style={inp} />
            </div>
            <div>
              <label style={lbl}>Rate (₹/hr)</label>
              <input type="number" value={Math.round(parseInt(tf.hourly_rate_paise) / 100)} onChange={e => setTf({ ...tf, hourly_rate_paise: String(parseInt(e.target.value || '0') * 100) })} placeholder="5000" style={inp} />
            </div>
            <div>
              <label style={lbl}>{tr('billable')}</label>
              <select value={tf.billable ? 'true' : 'false'} onChange={e => setTf({ ...tf, billable: e.target.value === 'true' })} style={{ ...inp, appearance: 'none' }}>
                <option value="true">Yes — Billable</option>
                <option value="false">No — Internal</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label style={lbl}>Description *</label>
              <input type="text" required value={tf.description} onChange={e => setTf({ ...tf, description: e.target.value })} placeholder="e.g. Drafted bail application, reviewed FIR" style={inp} />
            </div>
            {error && <div style={{ gridColumn: 'span 3', padding: '10px 13px', background: '#ffdad6', borderRadius: '8px', fontSize: '13px', color: '#93000a' }}>{error}</div>}
            <div style={{ gridColumn: 'span 3', display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#022448', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Log Time'}
              </button>
              <button type="button" onClick={() => setShowTimeForm(false)} style={{ padding: '10px 16px', background: 'transparent', color: '#74777f', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '9px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>{tr('cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {(['invoices', 'time'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 18px', background: tab === t ? '#022448' : '#fff', color: tab === t ? '#fff' : '#74777f', border: tab === t ? 'none' : '1px solid rgba(196,198,207,0.4)', borderRadius: '8px', fontSize: '13px', fontWeight: tab === t ? 700 : 500, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            {t === 'time' ? 'Time Entries' : 'Invoices'}
          </button>
        ))}
      </div>

      {/* Invoices Tab */}
      {tab === 'invoices' && (
        invLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1,2,3].map(i => <div key={i} style={{ height: '68px', borderRadius: '14px', background: '#edeef0' }} />)}
          </div>
        ) : (invoices as any[]).length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '36px 32px', textAlign: 'center', border: '1px solid rgba(196,198,207,0.2)', display: 'inline-block', minWidth: '300px' }}>
            <Receipt size={40} color="#c4c6cf" style={{ marginBottom: '16px' }} />
            <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: '0 0 8px' }}>{tr('no_invoices_yet')}</p>
            <p style={{ fontSize: '14px', color: '#74777f', margin: 0 }}>Log time entries then generate your first invoice</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden', maxWidth: '720px' }}>
            {(invoices as any[]).map((inv: any, i: number) => {
              const ss = STATUS_STYLE[inv.status] || STATUS_STYLE.draft;
              return (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px', borderBottom: i < (invoices as any[]).length - 1 ? '1px solid rgba(196,198,207,0.1)' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#022448' }}>{inv.invoice_number}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: ss.bg, color: ss.color, textTransform: 'capitalize' }}>{inv.status}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>
                      {inv.client?.full_name}
                      {inv.case?.title && ` · ${inv.case.title}`}
                      {` · ${new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '15px', fontWeight: 800, color: '#022448', margin: '0 0 2px' }}>₹{(Number(inv.total_paise) / 100).toLocaleString('en-IN')}</p>
                    {Number(inv.balance_paise) > 0 && Number(inv.balance_paise) < Number(inv.total_paise) && (
                      <p style={{ fontSize: '11px', color: '#c2410c', margin: 0 }}>₹{(Number(inv.balance_paise) / 100).toLocaleString('en-IN')} due</p>
                    )}
                  </div>
                  {inv.status === 'draft' && (
                    <button onClick={() => handleIssue(inv.id)} style={{ padding: '8px 14px', background: '#022448', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', flexShrink: 0 }}>
                      Issue
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Time Entries Tab */}
      {tab === 'time' && (
        timeLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1,2,3].map(i => <div key={i} style={{ height: '56px', borderRadius: '14px', background: '#edeef0' }} />)}
          </div>
        ) : (timeEntries as any[]).length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '36px 32px', textAlign: 'center', border: '1px solid rgba(196,198,207,0.2)', display: 'inline-block', minWidth: '300px' }}>
            <Clock size={40} color="#c4c6cf" style={{ marginBottom: '16px' }} />
            <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: '0 0 8px' }}>No time entries yet</p>
            <button onClick={() => setShowTimeForm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#022448', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
              <Clock size={14} /> Log First Entry
            </button>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden', maxWidth: '720px' }}>
            {/* Summary row */}
            <div style={{ padding: '12px 20px', background: '#f8f9fb', borderBottom: '1px solid rgba(196,198,207,0.1)', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#74777f' }}><strong style={{ color: '#022448' }}>{unbilledEntries.length}</strong> unbilled</span>
              <span style={{ fontSize: '13px', color: '#74777f' }}><strong style={{ color: '#022448' }}>{unbilledEntries.reduce((s, e) => s + Number(e.hours), 0).toFixed(1)}h</strong> to bill</span>
              <span style={{ fontSize: '13px', color: '#74777f' }}><strong style={{ color: '#022448' }}>₹{(unbilledAmount / 100).toLocaleString('en-IN')}</strong> value</span>
            </div>
            {(timeEntries as any[]).map((entry: any, i: number) => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 20px', borderBottom: i < (timeEntries as any[]).length - 1 ? '1px solid rgba(196,198,207,0.08)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.description}</p>
                  <p style={{ fontSize: '11px', color: '#74777f', margin: 0 }}>
                    {entry.case_title} · {new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ₹{(Number(entry.hourly_rate_paise) / 100).toLocaleString('en-IN')}/hr
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#022448', margin: '0 0 2px' }}>{Number(entry.hours).toFixed(1)}h</p>
                  <p style={{ fontSize: '11px', color: '#74777f', margin: 0 }}>₹{((Number(entry.hours) * Number(entry.hourly_rate_paise)) / 100).toLocaleString('en-IN')}</p>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '99px', background: entry.billed ? '#dcfce7' : entry.billable ? '#d5e3ff' : '#edeef0', color: entry.billed ? '#15803d' : entry.billable ? '#001c3b' : '#43474e', flexShrink: 0 }}>
                  {entry.billed ? 'Billed' : entry.billable ? 'Unbilled' : 'Internal'}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
