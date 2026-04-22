'use client';
import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import { useLang } from '@/hooks/useLanguage';
import {
  Receipt, Plus, Clock, X, ChevronRight, Download, Send,
  Trash2, Edit2, Check, AlertCircle, FileText, IndianRupee,
  User, Calendar, Building2, Printer,
} from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const pg: React.CSSProperties = { padding: '32px 28px', fontFamily: 'Manrope, sans-serif', maxWidth: '900px' };
const inp: React.CSSProperties = { padding: '10px 13px', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '9px', fontSize: '14px', color: '#191c1e', background: '#fff', outline: 'none', fontFamily: 'Manrope, sans-serif', width: '100%', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#43474e', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px' };
const card: React.CSSProperties = { background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden' };

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  draft:   { bg: '#edeef0', color: '#43474e', label: 'Draft' },
  issued:  { bg: '#d5e3ff', color: '#001c3b', label: 'Issued' },
  paid:    { bg: '#dcfce7', color: '#15803d', label: 'Paid' },
  overdue: { bg: '#ffdad6', color: '#93000a', label: 'Overdue' },
};

type Tab = 'invoices' | 'time';

interface LineItem { id: string; description: string; quantity: number; rate: number; type: 'time'|'fixed'|'expense'; }

// ── Invoice PDF Generator ──────────────────────────────────────
function printInvoice(inv: any, firm: any) {
  const lines = (inv.line_items || []) as any[];
  const subtotal = lines.reduce((s: number, l: any) => s + (Number(l.amount_paise)||0), 0) / 100;
  const gst = subtotal * (Number(inv.gst_rate||18) / 100);
  const total = subtotal + gst;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>Invoice ${inv.invoice_number}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:12pt;color:#111;padding:40px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #022448}
    .firm-name{font-size:20pt;font-weight:800;color:#022448}
    .firm-sub{font-size:10pt;color:#666;margin-top:4px}
    .inv-title{text-align:right}
    .inv-title h1{font-size:24pt;font-weight:800;color:#022448;letter-spacing:-.5px}
    .inv-num{font-size:11pt;color:#666;margin-top:4px}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}
    .meta-box p{font-size:10pt;color:#666;margin-bottom:2px}
    .meta-box strong{font-size:11pt;color:#111;display:block;margin-bottom:6px}
    .meta-box .value{font-size:11pt;color:#111}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#022448;color:#fff;padding:10px 14px;font-size:10pt;text-align:left;font-weight:700}
    th:last-child,td:last-child{text-align:right}
    td{padding:10px 14px;font-size:10pt;border-bottom:1px solid #eee}
    tr:nth-child(even) td{background:#f8f9fb}
    .totals{display:flex;justify-content:flex-end;margin-bottom:28px}
    .totals-box{min-width:260px}
    .totals-row{display:flex;justify-content:space-between;padding:7px 0;font-size:11pt;border-bottom:1px solid #eee}
    .totals-row.total{font-size:13pt;font-weight:800;color:#022448;border-top:2px solid #022448;border-bottom:none;padding-top:10px}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:9pt;color:#888;display:flex;justify-content:space-between}
    .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:9pt;font-weight:700;background:#dcfce7;color:#15803d}
    .notes{background:#f8f9fb;border-left:3px solid #022448;padding:12px 16px;border-radius:4px;margin-bottom:20px;font-size:10pt;color:#444}
    @media print{body{padding:20px}.no-print{display:none}}
  </style>
  </head><body>
  <div class="header">
    <div>
      <div class="firm-name">${(firm?.name || 'Law Firm').replace(/</g,'&lt;')}</div>
      <div class="firm-sub">Advocates & Solicitors</div>
    </div>
    <div class="inv-title">
      <h1>INVOICE</h1>
      <div class="inv-num">${inv.invoice_number}</div>
      <div class="badge" style="margin-top:8px;background:${STATUS_STYLE[inv.status]?.bg};color:${STATUS_STYLE[inv.status]?.color}">${STATUS_STYLE[inv.status]?.label||inv.status}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-box">
      <strong>Bill To</strong>
      <div class="value">${(inv.client?.full_name || 'Client').replace(/</g,'&lt;')}</div>
      ${inv.client?.email ? `<div style="color:#666;font-size:10pt">${inv.client.email}</div>` : ''}
      ${inv.case?.title ? `<div style="color:#666;font-size:10pt;margin-top:4px">Re: ${inv.case.title.replace(/</g,'&lt;')}</div>` : ''}
    </div>
    <div class="meta-box" style="text-align:right">
      <div style="margin-bottom:8px"><p>Invoice Date</p><div class="value">${new Date(inv.invoice_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</div></div>
      ${inv.due_date ? `<div><p>Due Date</p><div class="value">${new Date(inv.due_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</div></div>` : ''}
    </div>
  </div>

  <table>
    <thead><tr><th style="width:50%">Description</th><th>Type</th><th>Qty</th><th>Rate (₹)</th><th>Amount (₹)</th></tr></thead>
    <tbody>
      ${lines.map((l:any) => `<tr>
        <td>${(l.description||'').replace(/</g,'&lt;')}</td>
        <td style="text-transform:capitalize">${l.type||'fixed'}</td>
        <td>${Number(l.quantity||1).toFixed(l.type==='time'?1:0)}</td>
        <td>${(Number(l.rate_paise||0)/100).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
        <td>${(Number(l.amount_paise||0)/100).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal</span><span>₹${subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
      <div class="totals-row"><span>GST (${inv.gst_rate||18}%)</span><span>₹${gst.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
      <div class="totals-row total"><span>Total</span><span>₹${total.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
    </div>
  </div>

  ${inv.notes ? `<div class="notes"><strong>Notes:</strong> ${inv.notes.replace(/</g,'&lt;')}</div>` : ''}

  <div class="footer">
    <span>Generated by LexAI India · Sovereign Counsel</span>
    <span>${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</span>
  </div>
  </body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:210mm;height:297mm;';
  document.body.appendChild(iframe);
  iframe.contentDocument!.open();
  iframe.contentDocument!.write(html);
  iframe.contentDocument!.close();
  setTimeout(() => {
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 500);
}

// ── New Invoice Form ───────────────────────────────────────────
function NewInvoiceForm({ cases, clients, timeEntries, token, onDone, onCancel }: {
  cases: any[]; clients: any[]; timeEntries: any[]; token: string;
  onDone: () => void; onCancel: () => void;
}) {
  const [clientId, setClientId] = useState('');
  const [caseId, setCaseId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [gst, setGst] = useState(18);
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, rate: 5000, type: 'fixed' },
  ]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<1|2|3>(1);

  const unbilledForCase = timeEntries.filter(e => !e.billed && (!caseId || e.case_id === caseId));

  function addItem() {
    setItems(prev => [...prev, { id: Date.now().toString(), description: '', quantity: 1, rate: 5000, type: 'fixed' }]);
  }
  function removeItem(id: string) { setItems(prev => prev.filter(i => i.id !== id)); }
  function updateItem(id: string, field: string, val: any) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));
  }
  function importTimeEntries() {
    const newItems: LineItem[] = Array.from(selectedEntries).map(eid => {
      const e = timeEntries.find(t => t.id === eid)!;
      return { id: eid, description: e.description || 'Legal services', quantity: Number(e.hours), rate: Number(e.hourly_rate_paise) / 100, type: 'time' as const };
    });
    setItems(prev => [...prev.filter(i => i.description !== ''), ...newItems]);
    setSelectedEntries(new Set());
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const gstAmount = subtotal * gst / 100;
  const total = subtotal + gstAmount;

  async function submit() {
    if (!clientId) { setError('Please select a client'); return; }
    if (items.every(i => !i.description.trim())) { setError('Add at least one line item'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        client_id: clientId,
        case_id: caseId || undefined,
        time_entry_ids: Array.from(selectedEntries),
        line_items: items.filter(i => i.description.trim()).map(i => ({
          description: i.description, quantity: i.quantity,
          rate_paise: Math.round(i.rate * 100),
          amount_paise: Math.round(i.quantity * i.rate * 100),
          type: i.type,
        })),
        gst_rate: gst,
        due_date: dueDate || undefined,
        notes: notes || undefined,
      };
      const res = await fetch(`${BASE}/v1/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || 'Failed to create invoice');
      onDone();
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  }

  const stepStyle = (s: number) => ({
    width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: 800, flexShrink: 0,
    background: step >= s ? '#022448' : '#edeef0',
    color: step >= s ? '#fff' : '#74777f',
  });

  return (
    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden', marginBottom: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(196,198,207,0.15)', background: '#f8f9fb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={18} color="#022448" />
          <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.15rem', color: '#022448', margin: 0 }}>New Invoice</h2>
        </div>
        {/* Step indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={stepStyle(s) as any}>{step > s ? <Check size={13}/> : s}</div>
              {s < 3 && <div style={{ width: '28px', height: '2px', background: step > s ? '#022448' : '#edeef0' }} />}
            </div>
          ))}
          <button onClick={onCancel} style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#74777f' }}><X size={18}/></button>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* ── Step 1: Client & Case ── */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 18px' }}>Step 1 — Client & Case Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={lbl}>Client *</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} style={{ ...inp, appearance: 'none' }}>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name || c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Linked Case (optional)</label>
                <select value={caseId} onChange={e => setCaseId(e.target.value)} style={{ ...inp, appearance: 'none' }}>
                  <option value="">No case linked</option>
                  {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inp}
                  min={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label style={lbl}>GST Rate (%)</label>
                <select value={gst} onChange={e => setGst(Number(e.target.value))} style={{ ...inp, appearance: 'none' }}>
                  <option value={0}>0% — Exempt</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18% — Standard</option>
                  <option value={28}>28%</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>Notes / Payment Terms</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="e.g. Payment due within 30 days. Please transfer to A/c XXXX."
                  style={{ ...inp, resize: 'none' }} />
              </div>
            </div>
            {error && <p style={{ fontSize: '12px', color: '#ba1a1a', margin: '0 0 12px' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { if (!clientId) { setError('Please select a client'); return; } setError(''); setStep(2); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#022448', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                Next: Line Items <ChevronRight size={14}/>
              </button>
              <button onClick={onCancel} style={{ padding: '10px 16px', background: 'transparent', color: '#74777f', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '9px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Line Items ── */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 18px' }}>Step 2 — Line Items</p>

            {/* Import time entries */}
            {unbilledForCase.length > 0 && (
              <div style={{ background: '#f0f4ff', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', border: '1px solid rgba(2,36,72,0.1)' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#022448', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13}/> {unbilledForCase.length} unbilled time entries available
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                  {unbilledForCase.slice(0,5).map(e => (
                    <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '7px 10px', borderRadius: '7px', background: selectedEntries.has(e.id) ? '#d5e3ff' : '#fff', border: '1px solid rgba(196,198,207,0.3)' }}>
                      <input type="checkbox" checked={selectedEntries.has(e.id)} onChange={ev => {
                        const n = new Set(selectedEntries);
                        ev.target.checked ? n.add(e.id) : n.delete(e.id);
                        setSelectedEntries(n);
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description}</p>
                        <p style={{ fontSize: '11px', color: '#74777f', margin: 0 }}>{Number(e.hours).toFixed(1)}h · ₹{(Number(e.hourly_rate_paise)/100).toLocaleString('en-IN')}/hr · {new Date(e.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#022448', flexShrink: 0 }}>₹{((Number(e.hours)*Number(e.hourly_rate_paise))/100).toLocaleString('en-IN')}</span>
                    </label>
                  ))}
                </div>
                <button onClick={importTimeEntries} disabled={selectedEntries.size === 0}
                  style={{ padding: '7px 14px', background: selectedEntries.size ? '#022448' : '#edeef0', color: selectedEntries.size ? '#fff' : '#74777f', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: selectedEntries.size ? 'pointer' : 'not-allowed', fontFamily: 'Manrope, sans-serif' }}>
                  Import {selectedEntries.size > 0 ? selectedEntries.size : ''} Selected
                </button>
              </div>
            )}

            {/* Line items table */}
            <div style={{ background: '#f8f9fb', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 90px 120px 100px 36px', gap: '8px', padding: '10px 14px', background: '#022448' }}>
                {['Description', 'Qty', 'Rate (₹)', 'Amount', ''].map(h => (
                  <span key={h} style={{ fontSize: '10px', fontWeight: 800, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {items.map((item, idx) => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 90px 120px 100px 36px', gap: '8px', padding: '8px 14px', borderBottom: idx < items.length - 1 ? '1px solid rgba(196,198,207,0.15)' : 'none', alignItems: 'center' }}>
                  <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                    placeholder="e.g. Drafted bail application" style={{ ...inp, padding: '7px 10px', fontSize: '13px' }} />
                  <input type="number" value={item.quantity} min={0.5} step={item.type==='time'?0.5:1}
                    onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                    style={{ ...inp, padding: '7px 8px', fontSize: '13px', textAlign: 'right' }} />
                  <input type="number" value={item.rate} min={0}
                    onChange={e => updateItem(item.id, 'rate', Number(e.target.value))}
                    style={{ ...inp, padding: '7px 8px', fontSize: '13px', textAlign: 'right' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#022448', textAlign: 'right' }}>
                    ₹{(item.quantity * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </span>
                  <button onClick={() => items.length > 1 && removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: items.length > 1 ? 'pointer' : 'not-allowed', color: items.length > 1 ? '#74777f' : '#c4c6cf', padding: '4px', borderRadius: '5px' }}>
                    <Trash2 size={14}/>
                  </button>
                </div>
              ))}
            </div>

            <button onClick={addItem} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', background: '#fff', border: '1px dashed rgba(196,198,207,0.6)', borderRadius: '7px', fontSize: '12px', fontWeight: 600, color: '#74777f', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', marginBottom: '20px' }}>
              <Plus size={13}/> Add Line Item
            </button>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
              <div style={{ minWidth: '240px', background: '#f8f9fb', borderRadius: '10px', padding: '14px 18px' }}>
                {[
                  { label: 'Subtotal', val: `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                  { label: `GST (${gst}%)`, val: `₹${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#74777f', marginBottom: '6px' }}>
                    <span>{r.label}</span><span>{r.val}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800, color: '#022448', borderTop: '1px solid rgba(196,198,207,0.3)', paddingTop: '8px', marginTop: '4px' }}>
                  <span>Total</span>
                  <span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {error && <div style={{ padding: '10px 14px', background: '#ffdad6', borderRadius: '8px', fontSize: '12px', color: '#93000a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14}/>{error}</div>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setStep(1)} style={{ padding: '10px 16px', background: 'transparent', color: '#74777f', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '9px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>← Back</button>
              <button onClick={() => { if (items.every(i => !i.description.trim())) { setError('Add at least one line item with description'); return; } setError(''); setStep(3); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#022448', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                Next: Review <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review & Create ── */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 18px' }}>Step 3 — Review & Create</p>
            <div style={{ background: '#f8f9fb', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Client</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#022448', margin: 0 }}>{clients.find(c => c.id === clientId)?.full_name || '—'}</p>
                </div>
                {caseId && <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Case</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#022448', margin: 0 }}>{cases.find(c => c.id === caseId)?.title || '—'}</p>
                </div>}
                {dueDate && <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Due Date</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#022448', margin: 0 }}>{new Date(dueDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p>
                </div>}
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Total (incl. GST)</p>
                  <p style={{ fontSize: '18px', fontWeight: 800, color: '#022448', margin: 0 }}>₹{total.toLocaleString('en-IN',{minimumFractionDigits:2})}</p>
                </div>
              </div>
              <div style={{ borderTop: '1px solid rgba(196,198,207,0.2)', paddingTop: '14px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>{items.filter(i=>i.description).length} Line Items</p>
                {items.filter(i => i.description.trim()).map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#43474e', marginBottom: '4px' }}>
                    <span>{item.description} {item.quantity !== 1 ? `× ${item.quantity}` : ''}</span>
                    <span style={{ fontWeight: 600 }}>₹{(item.quantity * item.rate).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
            {error && <div style={{ padding: '10px 14px', background: '#ffdad6', borderRadius: '8px', fontSize: '12px', color: '#93000a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14}/>{error}</div>}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => setStep(2)} style={{ padding: '10px 16px', background: 'transparent', color: '#74777f', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '9px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>← Back</button>
              <button onClick={submit} disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#022448', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Manrope, sans-serif', opacity: saving ? 0.7 : 1 }}>
                <FileText size={14}/> {saving ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function BillingPage() {
  const { token, user } = useAuthStore();
  const { tr } = useLang();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('invoices');
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [tf, setTf] = useState({ case_id: '', date: new Date().toISOString().split('T')[0], hours: '', description: '', hourly_rate_paise: '500000', billable: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [editForm, setEditForm] = useState<{
    due_date: string; notes: string; gst_rate: number;
    discount_pct: number;
    line_items: Array<{ id: string; description: string; quantity: number; rate_paise: number; amount_paise: number; type: string }>;
  }>({ due_date: '', notes: '', gst_rate: 18, discount_pct: 0, line_items: [] });
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => (await fetch(`${BASE}/v1/invoices`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())).data || [],
    enabled: !!token,
  });
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries'],
    queryFn: async () => (await fetch(`${BASE}/v1/invoices/time-entries`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())).data || [],
    enabled: !!token,
  });
  const { data: cases = [] } = useQuery({
    queryKey: ['cases-billing'],
    queryFn: async () => (await fetch(`${BASE}/v1/cases?limit=100`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())).data || [],
    enabled: !!token,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-billing'],
    queryFn: async () => (await fetch(`${BASE}/v1/clients`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())).data || [],
    enabled: !!token,
  });
  const { data: tenantData } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => (await fetch(`${BASE}/v1/tenants/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())).data || null,
    enabled: !!token,
  });

  const outstanding = (invoices as any[]).filter(i => ['issued','overdue'].includes(i.status)).reduce((s:number,i:any) => s + Number(i.balance_paise||i.total_paise||0), 0);
  const unbilledEntries = (timeEntries as any[]).filter(e => !e.billed && e.billable);
  const unbilledAmount = unbilledEntries.reduce((s:number, e:any) => s + Number(e.hours) * Number(e.hourly_rate_paise), 0);

  const handleLogTime = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    try {
      const res = await fetch(`${BASE}/v1/invoices/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...tf, hours: parseFloat(tf.hours), hourly_rate_paise: parseInt(tf.hourly_rate_paise) }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error?.message || 'Failed'); }
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

  const handleMarkPaid = async (id: string) => {
    await fetch(`${BASE}/v1/invoices/${id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount_paise: (invoices as any[]).find(i => i.id === id)?.balance_paise }),
    });
    qc.invalidateQueries({ queryKey: ['invoices'] });
  };

  const openEdit = (inv: any) => {
    setEditingInvoice(inv);
    setEditError('');
    const discountPct = inv.bank_account_details?.discount_pct || 0;
    const items = (inv.line_items || []).map((item: any, idx: number) => ({
      id: item.id || String(idx),
      description: item.description || '',
      quantity: Number(item.quantity) || 1,
      rate_paise: Number(item.rate_paise) || 0,
      amount_paise: Number(item.amount_paise) || 0,
      type: item.type || 'fixed',
    }));
    setEditForm({
      due_date: inv.due_date ? inv.due_date.split('T')[0] : '',
      notes: inv.notes || '',
      gst_rate: inv.gst_rate || 18,
      discount_pct: discountPct,
      line_items: items.length > 0 ? items : [{ id: '1', description: '', quantity: 1, rate_paise: 0, amount_paise: 0, type: 'fixed' }],
    });
  };

  const handleSaveEdit = async () => {
    if (!editingInvoice) return;
    setEditSaving(true); setEditError('');
    try {
      const res = await fetch(`${BASE}/v1/invoices/${editingInvoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          due_date: editForm.due_date || null,
          notes: editForm.notes || null,
          gst_rate: editForm.gst_rate,
          discount_pct: editForm.discount_pct,
          line_items: editForm.line_items.filter(i => i.description.trim()).map(i => ({
            ...i,
            rate_paise: Math.round(i.rate_paise),
            amount_paise: Math.round(i.quantity * i.rate_paise),
          })),
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error?.message || 'Failed to update'); }
      setEditingInvoice(null);
      qc.invalidateQueries({ queryKey: ['invoices'] });
    } catch (err: any) { setEditError(err.message); }
    setEditSaving(false);
  };

  const handleRevokePayment = async (id: string) => {
    if (!confirm('Revoke payment and set invoice back to Issued? This cannot be undone.')) return;
    setRevoking(true);
    try {
      const res = await fetch(`${BASE}/v1/invoices/${id}/revoke-payment`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error?.message || 'Failed to revoke'); }
      qc.invalidateQueries({ queryKey: ['invoices'] });
    } catch (err: any) { alert(err.message); }
    setRevoking(false);
  };

  return (
    <div style={pg}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '2rem', fontWeight: 700, color: '#022448', margin: '0 0 4px' }}>Billing</h1>
          {outstanding > 0 && <p style={{ fontSize: '14px', color: '#ba1a1a', fontWeight: 700, margin: 0 }}>₹{(outstanding/100).toLocaleString('en-IN')} outstanding</p>}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => { setShowTimeForm(true); setShowNewInvoice(false); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#022448', border: '1px solid rgba(2,36,72,0.2)', borderRadius: '9px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            <Clock size={14}/> Log Time
          </button>
          <button onClick={() => { setShowNewInvoice(true); setShowTimeForm(false); setTab('invoices'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#022448', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            <Plus size={14}/> New Invoice
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {(unbilledAmount > 0 || outstanding > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          {unbilledAmount > 0 && (
            <div style={{ background: '#ffe088', borderRadius: '12px', padding: '14px 18px', minWidth: '160px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#735c00', letterSpacing: '0.06em', margin: '0 0 6px' }}>UNBILLED HOURS</p>
              <p style={{ fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', margin: 0 }}>{unbilledEntries.reduce((s:number,e:any) => s + Number(e.hours), 0).toFixed(1)}h</p>
              <p style={{ fontSize: '12px', color: '#735c00', margin: '4px 0 0' }}>₹{(unbilledAmount/100).toLocaleString('en-IN')} to bill</p>
            </div>
          )}
          {outstanding > 0 && (
            <div style={{ background: '#ffdad6', borderRadius: '12px', padding: '14px 18px', minWidth: '160px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#93000a', letterSpacing: '0.06em', margin: '0 0 6px' }}>OUTSTANDING</p>
              <p style={{ fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', margin: 0 }}>₹{(outstanding/100).toLocaleString('en-IN')}</p>
              <p style={{ fontSize: '12px', color: '#93000a', margin: '4px 0 0' }}>{(invoices as any[]).filter((i:any) => i.status === 'issued').length} invoice(s) pending</p>
            </div>
          )}
        </div>
      )}

      {/* New Invoice Form */}
      {showNewInvoice && (
        <NewInvoiceForm
          cases={cases as any[]} clients={clients as any[]} timeEntries={timeEntries as any[]}
          token={token || ''}
          onDone={() => { setShowNewInvoice(false); qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['time-entries'] }); }}
          onCancel={() => setShowNewInvoice(false)}
        />
      )}

      {/* Log Time Form */}
      {showTimeForm && (
        <div style={{ background: '#f8f9fb', border: '1px solid rgba(2,36,72,0.1)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#022448', margin: 0 }}>Log Time Entry</h3>
            <button onClick={() => setShowTimeForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#74777f' }}><X size={16}/></button>
          </div>
          <form onSubmit={handleLogTime} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Case *</label>
              <select required value={tf.case_id} onChange={e => setTf({ ...tf, case_id: e.target.value })} style={{ ...inp, appearance: 'none' }}>
                <option value="">Select case...</option>
                {(cases as any[]).map((c:any) => <option key={c.id} value={c.id}>{c.title}</option>)}
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
              <input type="number" value={Math.round(parseInt(tf.hourly_rate_paise||'500000')/100)} onChange={e => setTf({ ...tf, hourly_rate_paise: String(parseInt(e.target.value||'0')*100) })} placeholder="5000" style={inp} />
            </div>
            <div>
              <label style={lbl}>Billable?</label>
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
              <button type="button" onClick={() => setShowTimeForm(false)} style={{ padding: '10px 16px', background: 'transparent', color: '#74777f', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '9px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>Cancel</button>
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

      {/* Invoices tab */}
      {tab === 'invoices' && (
        (invoices as any[]).length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '48px 32px', textAlign: 'center', border: '1px solid rgba(196,198,207,0.2)', maxWidth: '400px' }}>
            <Receipt size={44} color="#c4c6cf" style={{ marginBottom: '16px' }} />
            <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: '0 0 8px' }}>No invoices yet</p>
            <p style={{ fontSize: '13px', color: '#74777f', margin: '0 0 20px' }}>Log time entries or click New Invoice to create your first invoice.</p>
            <button onClick={() => { setShowNewInvoice(true); setShowTimeForm(false); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#022448', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
              <Plus size={14}/> Create First Invoice
            </button>
          </div>
        ) : (
          <div style={card}>
            {(invoices as any[]).map((inv: any, i: number) => {
              const ss = STATUS_STYLE[inv.status] || STATUS_STYLE.draft;
              const total = Number(inv.total_paise || 0);
              const balance = Number(inv.balance_paise || total);
              return (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px', borderBottom: i < (invoices as any[]).length-1 ? '1px solid rgba(196,198,207,0.1)' : 'none', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#022448' }}>{inv.invoice_number}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: ss.bg, color: ss.color }}>{ss.label}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>
                      {inv.client?.full_name || '—'}
                      {inv.case?.title && ` · ${inv.case.title}`}
                      {` · ${new Date(inv.invoice_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`}
                      {inv.due_date && ` · Due ${new Date(inv.due_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}`}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '15px', fontWeight: 800, color: '#022448', margin: '0 0 2px' }}>₹{(total/100).toLocaleString('en-IN')}</p>
                    {balance > 0 && balance < total && <p style={{ fontSize: '11px', color: '#c2410c', margin: 0 }}>₹{(balance/100).toLocaleString('en-IN')} due</p>}
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => printInvoice(inv, tenantData)} title="Download PDF"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 11px', background: '#f0f4ff', color: '#022448', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                      <Printer size={13}/> PDF
                    </button>
                    {inv.status !== 'paid' && (
                      <button onClick={() => openEdit(inv)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 11px', background: '#f4f5f7', color: '#43474e', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                        <Edit2 size={13}/> Edit
                      </button>
                    )}
                    {inv.status === 'draft' && (
                      <button onClick={() => handleIssue(inv.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 11px', background: '#022448', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                        <Send size={13}/> Issue
                      </button>
                    )}
                    {inv.status === 'issued' && (
                      <button onClick={() => handleMarkPaid(inv.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 11px', background: '#dcfce7', color: '#15803d', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                        <Check size={13}/> Mark Paid
                      </button>
                    )}
                    {inv.status === 'paid' && (
                      <button onClick={() => handleRevokePayment(inv.id)} disabled={revoking}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 11px', background: '#ffdad6', color: '#93000a', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: revoking ? 'not-allowed' : 'pointer', fontFamily: 'Manrope, sans-serif', opacity: revoking ? 0.6 : 1 }}>
                        <X size={13}/> Revoke
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Time Entries tab */}
      {tab === 'time' && (
        (timeEntries as any[]).length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '48px 32px', textAlign: 'center', border: '1px solid rgba(196,198,207,0.2)', maxWidth: '400px' }}>
            <Clock size={44} color="#c4c6cf" style={{ marginBottom: '16px' }} />
            <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: '0 0 8px' }}>No time entries yet</p>
            <button onClick={() => setShowTimeForm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#022448', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
              <Clock size={14}/> Log First Entry
            </button>
          </div>
        ) : (
          <div style={card}>
            <div style={{ padding: '12px 20px', background: '#f8f9fb', borderBottom: '1px solid rgba(196,198,207,0.1)', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#74777f' }}><strong style={{ color: '#022448' }}>{unbilledEntries.length}</strong> unbilled</span>
              <span style={{ fontSize: '13px', color: '#74777f' }}><strong style={{ color: '#022448' }}>{unbilledEntries.reduce((s:number,e:any) => s+Number(e.hours),0).toFixed(1)}h</strong> to bill</span>
              <span style={{ fontSize: '13px', color: '#74777f' }}><strong style={{ color: '#022448' }}>₹{(unbilledAmount/100).toLocaleString('en-IN')}</strong> value</span>
            </div>
            {(timeEntries as any[]).map((entry: any, i: number) => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 20px', borderBottom: i < (timeEntries as any[]).length-1 ? '1px solid rgba(196,198,207,0.08)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.description}</p>
                  <p style={{ fontSize: '11px', color: '#74777f', margin: 0 }}>
                    {entry.case_title} · {new Date(entry.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} · ₹{(Number(entry.hourly_rate_paise)/100).toLocaleString('en-IN')}/hr
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#022448', margin: '0 0 2px' }}>{Number(entry.hours).toFixed(1)}h</p>
                  <p style={{ fontSize: '11px', color: '#74777f', margin: 0 }}>₹{((Number(entry.hours)*Number(entry.hourly_rate_paise))/100).toLocaleString('en-IN')}</p>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '99px', background: entry.billed ? '#dcfce7' : entry.billable ? '#d5e3ff' : '#edeef0', color: entry.billed ? '#15803d' : entry.billable ? '#001c3b' : '#43474e', flexShrink: 0 }}>
                  {entry.billed ? 'Billed' : entry.billable ? 'Unbilled' : 'Internal'}
                </span>
              </div>
            ))}
          </div>
        )
      )}
      {/* ── Edit Invoice Modal ── */}
      {editingInvoice && (() => {
        // Live totals computed from editForm
        const editSubtotal = editForm.line_items.reduce((s, i) => s + i.quantity * (i.rate_paise / 100), 0);
        const editDiscount = editSubtotal * editForm.discount_pct / 100;
        const editAfterDiscount = editSubtotal - editDiscount;
        const editGst = editAfterDiscount * editForm.gst_rate / 100;
        const editTotal = editAfterDiscount + editGst;

        const updateItem = (id: string, field: string, val: any) =>
          setEditForm(f => ({ ...f, line_items: f.line_items.map(i => i.id === id ? { ...i, [field]: val, amount_paise: field === 'quantity' || field === 'rate_paise' ? Math.round((field === 'quantity' ? val : i.quantity) * (field === 'rate_paise' ? val : i.rate_paise)) : i.amount_paise } : i) }));

        const addItem = () => setEditForm(f => ({ ...f, line_items: [...f.line_items, { id: Date.now().toString(), description: '', quantity: 1, rate_paise: 0, amount_paise: 0, type: 'fixed' }] }));
        const removeItem = (id: string) => setEditForm(f => ({ ...f, line_items: f.line_items.filter(i => i.id !== id) }));

        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,36,72,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditingInvoice(null); }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '680px', boxShadow: '0 8px 32px rgba(2,36,72,0.15)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(196,198,207,0.2)', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.3rem', color: '#022448', margin: '0 0 2px' }}>Edit Invoice</h2>
                <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>{editingInvoice.invoice_number} · {editingInvoice.client?.full_name}</p>
              </div>
              <button onClick={() => setEditingInvoice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#74777f', padding: '4px' }}>
                <X size={18}/>
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>

              {/* Details row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={lbl}>Due Date</label>
                  <input type="date" value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>GST Rate (%)</label>
                  <select value={editForm.gst_rate} onChange={e => setEditForm(f => ({ ...f, gst_rate: Number(e.target.value) }))} style={{ ...inp, appearance: 'none' }}>
                    <option value={0}>0% — Exempt</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18% — Standard</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Discount (%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="number" min={0} max={100} step={1} value={editForm.discount_pct}
                      onChange={e => setEditForm(f => ({ ...f, discount_pct: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                      style={{ ...inp, width: '80px', textAlign: 'right' }} />
                    <span style={{ fontSize: '12px', color: '#74777f' }}>
                      {editForm.discount_pct > 0 ? `−₹${editDiscount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : 'No discount'}
                    </span>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Notes / Payment Terms</label>
                  <input type="text" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="e.g. Pay to A/c XXXX" style={inp} />
                </div>
              </div>

              {/* Line items */}
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#43474e', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>Line Items</p>
              <div style={{ background: '#f8f9fb', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 110px 90px 28px', gap: '6px', padding: '8px 12px', background: '#022448' }}>
                  {['Description', 'Qty', 'Rate (₹)', 'Amount', ''].map(h => (
                    <span key={h} style={{ fontSize: '10px', fontWeight: 800, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>
                {editForm.line_items.map((item, idx) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 70px 110px 90px 28px', gap: '6px', padding: '7px 12px', borderBottom: idx < editForm.line_items.length - 1 ? '1px solid rgba(196,198,207,0.15)' : 'none', alignItems: 'center' }}>
                    <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Description" style={{ ...inp, padding: '6px 8px', fontSize: '12px' }} />
                    <input type="number" min={0.5} step={0.5} value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                      style={{ ...inp, padding: '6px 6px', fontSize: '12px', textAlign: 'right' }} />
                    <input type="number" min={0} value={item.rate_paise / 100} onChange={e => updateItem(item.id, 'rate_paise', Math.round(Number(e.target.value) * 100))}
                      style={{ ...inp, padding: '6px 6px', fontSize: '12px', textAlign: 'right' }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#022448', textAlign: 'right' }}>
                      ₹{(item.quantity * item.rate_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </span>
                    <button onClick={() => editForm.line_items.length > 1 && removeItem(item.id)}
                      style={{ background: 'none', border: 'none', cursor: editForm.line_items.length > 1 ? 'pointer' : 'not-allowed', color: editForm.line_items.length > 1 ? '#74777f' : '#c4c6cf', padding: '2px', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addItem} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#fff', border: '1px dashed rgba(196,198,207,0.6)', borderRadius: '7px', fontSize: '12px', fontWeight: 600, color: '#74777f', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', marginBottom: '16px' }}>
                <Plus size={12}/> Add Line
              </button>

              {/* Totals summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ minWidth: '220px', background: '#f8f9fb', borderRadius: '10px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#74777f', marginBottom: '5px' }}>
                    <span>Subtotal</span><span>₹{editSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {editForm.discount_pct > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#15803d', marginBottom: '5px' }}>
                      <span>Discount ({editForm.discount_pct}%)</span><span>−₹{editDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#74777f', marginBottom: '5px' }}>
                    <span>GST ({editForm.gst_rate}%)</span><span>₹{editGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, color: '#022448', borderTop: '1px solid rgba(196,198,207,0.3)', paddingTop: '8px', marginTop: '4px' }}>
                    <span>Total</span><span>₹{editTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {editError && <p style={{ fontSize: '12px', color: '#ba1a1a', margin: '12px 0 0' }}>{editError}</p>}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: '8px', padding: '16px 24px', borderTop: '1px solid rgba(196,198,207,0.2)', flexShrink: 0 }}>
              <button onClick={handleSaveEdit} disabled={editSaving}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#022448', color: '#fff', border: 'none', borderRadius: '9px', padding: '11px 20px', fontSize: '13px', fontWeight: 700, cursor: editSaving ? 'not-allowed' : 'pointer', fontFamily: 'Manrope, sans-serif', opacity: editSaving ? 0.7 : 1 }}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditingInvoice(null)}
                style={{ padding: '11px 18px', background: 'transparent', color: '#74777f', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '9px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
