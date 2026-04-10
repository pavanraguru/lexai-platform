'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import { casesApi, hearingsApi, tasksApi, agentsApi, uploadDocument } from '@/lib/api';
import Link from 'next/link';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  intake:          { bg: 'var(--surface-container)',  color: 'var(--on-surface-variant)' },
  filed:           { bg: 'var(--primary-fixed)',      color: 'var(--on-primary-fixed)' },
  pending_hearing: { bg: 'var(--secondary-fixed)',    color: 'var(--on-secondary-container)' },
  arguments:       { bg: '#ede9fe',                   color: '#5b21b6' },
  decided:         { bg: '#dcfce7',                   color: '#15803d' },
  appeal:          { bg: 'var(--error-container)',    color: 'var(--on-error-container)' },
  closed:          { bg: 'var(--surface-container-high)', color: 'var(--outline)' },
};

const TABS = [
  { key: 'overview',   icon: 'info',          label: 'Overview' },
  { key: 'documents',  icon: 'description',   label: 'Documents' },
  { key: 'hearings',   icon: 'gavel',         label: 'Hearings' },
  { key: 'tasks',      icon: 'task_alt',      label: 'Tasks' },
  { key: 'agents',     icon: 'smart_toy',     label: 'Agents' },
  { key: 'drafts',     icon: 'history_edu',   label: 'Drafts' },
] as const;

const HEARING_PURPOSES = [
  { value: 'framing_of_charges', label: 'Framing of Charges' },
  { value: 'bail',               label: 'Bail' },
  { value: 'arguments',          label: 'Arguments' },
  { value: 'judgment',           label: 'Judgment' },
  { value: 'evidence',           label: 'Evidence' },
  { value: 'examination',        label: 'Examination' },
  { value: 'cross_examination',  label: 'Cross Examination' },
  { value: 'interim_order',      label: 'Interim Order' },
  { value: 'misc',               label: 'Misc' },
];

const AGENTS = [
  { type: 'evidence',   icon: 'search',          label: 'Evidence',   desc: 'Extract and analyse all evidence from documents' },
  { type: 'timeline',   icon: 'timeline',        label: 'Timeline',   desc: 'Reconstruct chronological order of events' },
  { type: 'research',   icon: 'menu_book',       label: 'Research',   desc: 'Find relevant Indian case law and statutes' },
  { type: 'deposition', icon: 'record_voice_over',label: 'Deposition', desc: 'Analyse deposition transcripts, find inconsistencies' },
  { type: 'strategy',   icon: 'psychology',      label: 'Strategy',   desc: 'Develop court strategy from all prior analysis' },
];

type TabKey = typeof TABS[number]['key'];

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Hearing form state
  const [showHearingForm, setShowHearingForm] = useState(false);
  const [showOutcome, setShowOutcome] = useState<string | null>(null);
  const [hearingForm, setHearingForm] = useState({ date: '', time: '', purpose: 'misc', court_room: '', judge_name: '', client_instruction: '' });
  const [outcomeForm, setOutcomeForm] = useState({ outcome: '', order_summary: '', next_hearing_date: '' });

  // Task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', priority: 'normal', due_date: '', description: '' });

  // Agent state
  const [runningAgent, setRunningAgent] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => casesApi.get(token!, id!),
    enabled: !!token && !!id,
  });

  const c = (caseData as any)?.data;
  const refresh = () => qc.invalidateQueries({ queryKey: ['case', id] });
  const statusStyle = STATUS_STYLES[c?.status] || STATUS_STYLES.intake;

  const handleAddHearing = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await hearingsApi.create(token!, { case_id: id!, ...hearingForm, purpose: hearingForm.purpose as any });
      setShowHearingForm(false);
      setHearingForm({ date: '', time: '', purpose: 'misc', court_room: '', judge_name: '', client_instruction: '' });
      refresh();
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  };

  const handleOutcome = async (e: React.FormEvent) => {
    e.preventDefault(); if (!showOutcome) return;
    setSaving(true); setError('');
    try {
      await hearingsApi.recordOutcome(token!, showOutcome, outcomeForm);
      setShowOutcome(null); setOutcomeForm({ outcome: '', order_summary: '', next_hearing_date: '' }); refresh();
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await tasksApi.create(token!, { case_id: id!, ...taskForm });
      setShowTaskForm(false); setTaskForm({ title: '', priority: 'normal', due_date: '', description: '' }); refresh();
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  };

  const handleRunAgent = async (agentType: string) => {
    if (!c) return;
    setRunningAgent(agentType);
    try {
      const docIds = (c.documents || []).filter((d: any) => d.processing_status === 'ready').map((d: any) => d.id);
      if (docIds.length === 0) { setError('Upload and process documents first before running agents.'); setRunningAgent(null); return; }
      await agentsApi.run(token!, id!, agentType as any, {});
      refresh();
    } catch (err: any) { setError(err.message); }
    setRunningAgent(null);
  };

  const handleToggleTask = async (task: any) => {
    await tasksApi.update(token!, task.id, { status: task.status === 'done' ? 'todo' : 'done' });
    refresh();
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-5">
        <div className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--surface-container-low)' }} />
        <div className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--surface-container-low)' }} />
        <div className="h-64 rounded-2xl animate-pulse" style={{ background: 'var(--surface-container-low)' }} />
      </div>
    );
  }

  if (!c) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 text-center">
        <p className="font-serif text-xl font-bold" style={{ color: 'var(--primary)' }}>Case not found</p>
        <Link href="/cases" className="mt-4 inline-block text-sm font-bold" style={{ color: 'var(--secondary)' }}>← Back to Cases</Link>
      </div>
    );
  }

  const hearings = c.hearings || [];
  const tasks = (c.tasks || []).filter((t: any) => t.status !== 'cancelled');
  const agents = c.agent_jobs || [];
  const upcomingHearings = hearings.filter((h: any) => !h.outcome && new Date(h.date) >= new Date());
  const pastHearings = hearings.filter((h: any) => h.outcome || new Date(h.date) < new Date());
  const activeTasks = tasks.filter((t: any) => t.status !== 'done');
  const doneTasks = tasks.filter((t: any) => t.status === 'done');

  // ── Shared sub-components ─────────────────────────────────
  const inputStyle = {
    background: 'var(--surface-container-lowest)',
    border: '1px solid rgba(196,198,207,0.3)',
    borderRadius: '4px',
    color: 'var(--on-surface)',
    outline: 'none',
    fontSize: '13px',
    padding: '8px 12px',
    width: '100%',
    fontFamily: 'Manrope, sans-serif',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--on-surface-variant)',
    letterSpacing: '0.06em',
    marginBottom: '5px',
    textTransform: 'uppercase' as const,
  };

  const btnPrimary = {
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'Manrope, sans-serif',
  };

  const btnGhost = {
    background: 'transparent',
    color: 'var(--on-surface-variant)',
    border: '1px solid rgba(196,198,207,0.3)',
    borderRadius: '4px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Manrope, sans-serif',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">

      {/* ── Case Header ─────────────────────────────────────── */}
      <div className="rounded-2xl p-6 mb-6 fade-up"
        style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)', boxShadow: 'var(--shadow-tonal)' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {/* Type badge */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.1em', color: 'var(--secondary)', textTransform: 'uppercase' }}>
                {c.case_type?.replace(/_/g, ' ')}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: statusStyle.bg, color: statusStyle.color, fontSize: '10px' }}>
                {c.status?.replace(/_/g, ' ')}
              </span>
              {c.priority !== 'normal' && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: c.priority === 'urgent' ? 'var(--error-container)' : 'var(--tertiary-fixed)',
                    color: c.priority === 'urgent' ? 'var(--on-error-container)' : 'var(--tertiary)',
                    fontSize: '10px',
                  }}>
                  {c.priority?.toUpperCase()}
                </span>
              )}
            </div>
            {/* Title */}
            <h1 className="font-serif font-bold mb-2" style={{ fontSize: '1.6rem', color: 'var(--primary)', lineHeight: '1.25' }}>
              {c.title}
            </h1>
            {/* Court + CNR */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)', fontSize: '13px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>location_on</span>
                {c.court}
              </div>
              {c.cnr_number && (
                <>
                  <span style={{ color: 'var(--outline-variant)' }}>·</span>
                  <span className="font-mono" style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                    {c.cnr_number}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Next hearing spotlight */}
          {c.next_hearing_date && (
            <div className="flex-shrink-0 rounded-xl p-4 text-center"
              style={{ background: 'var(--primary)', minWidth: '100px' }}>
              <p style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em' }}>NEXT HEARING</p>
              <p className="font-serif font-bold text-2xl mt-1" style={{ color: 'var(--secondary-fixed)', lineHeight: 1 }}>
                {new Date(c.next_hearing_date).getDate()}
              </p>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>
                {new Date(c.next_hearing_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 fade-up fade-up-1">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap transition-all"
            style={{
              background: activeTab === tab.key ? 'var(--primary)' : 'var(--surface-container-lowest)',
              color: activeTab === tab.key ? '#fff' : 'var(--on-surface-variant)',
              fontWeight: activeTab === tab.key ? '700' : '500',
              borderRadius: '6px',
              border: activeTab === tab.key ? 'none' : '1px solid rgba(196,198,207,0.2)',
              fontSize: '13px',
            }}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl flex items-center gap-2 fade-up"
          style={{ background: 'var(--error-container)', color: 'var(--on-error-container)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError('')} className="ml-auto">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
          </button>
        </div>
      )}

      {/* ──────────── OVERVIEW TAB ────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 fade-up">
          {/* Case details */}
          <div className="rounded-2xl p-6"
            style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}>
            <h3 className="font-serif font-bold text-base mb-4" style={{ color: 'var(--primary)' }}>Case Details</h3>
            <div className="space-y-3">
              {[
                { label: 'Court Level', value: c.court_level?.replace(/_/g, ' ') },
                { label: 'Perspective', value: c.perspective },
                { label: 'Judge', value: c.judge_name },
                { label: 'Filed Date', value: c.filed_date ? new Date(c.filed_date).toLocaleDateString('en-IN') : null },
                { label: 'Priority', value: c.priority },
              ].filter(item => item.value).map(item => (
                <div key={item.label} className="flex justify-between items-start gap-4">
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {item.label}
                  </span>
                  <span className="text-sm font-medium text-right capitalize" style={{ color: 'var(--on-surface)' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="space-y-3">
            {[
              { icon: 'description', label: 'Documents',  value: c._count?.documents || 0, href: null, color: 'var(--primary-fixed)', iconColor: 'var(--primary)' },
              { icon: 'gavel',       label: 'Hearings',   value: hearings.length,           href: null, color: 'var(--secondary-fixed)', iconColor: 'var(--secondary)' },
              { icon: 'task_alt',    label: 'Active Tasks', value: activeTasks.length,      href: null, color: 'var(--tertiary-fixed)', iconColor: 'var(--tertiary)' },
              { icon: 'smart_toy',   label: 'Agent Runs', value: agents.length,             href: null, color: 'var(--surface-container)', iconColor: 'var(--on-surface-variant)' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-4 rounded-xl p-4"
                style={{ background: stat.color }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: stat.iconColor }}>{stat.icon}</span>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: stat.iconColor, letterSpacing: '0.06em' }}>{stat.label.toUpperCase()}</p>
                  <p className="font-serif font-bold text-xl" style={{ color: stat.iconColor }}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──────────── DOCUMENTS TAB ────────────────────────── */}
      {activeTab === 'documents' && (
        <div className="fade-up">
          {/* Upload zone */}
          <div className="rounded-2xl p-8 text-center mb-5"
            style={{ border: '1.5px dashed rgba(196,198,207,0.4)', background: 'var(--surface-container-lowest)' }}>
            <span className="material-symbols-outlined mb-3 block" style={{ fontSize: '36px', color: 'var(--outline-variant)' }}>upload_file</span>
            <p className="font-bold text-sm mb-1" style={{ color: 'var(--primary)' }}>Upload Documents</p>
            <p className="text-xs mb-4" style={{ color: 'var(--on-surface-variant)' }}>FIR, Charge Sheet, Evidence, Deposition — PDF or Image, up to 50MB</p>
            <label className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 cursor-pointer transition-all hover:opacity-80"
              style={{ background: 'var(--primary)', color: '#fff', borderRadius: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>attach_file</span>
              Choose File
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
            </label>
          </div>

          {/* Documents list */}
          {(c.documents || []).length === 0 ? (
            <div className="rounded-2xl p-8 text-center"
              style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(c.documents || []).map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-4 rounded-xl p-4"
                  style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}>
                  <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '22px', color: 'var(--primary)' }}>
                    {doc.mime_type?.includes('image') ? 'image' : 'description'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--on-surface)' }}>{doc.filename}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {doc.doc_category && (
                        <span className="text-xs" style={{ color: 'var(--secondary)', fontWeight: '700', fontSize: '10px' }}>
                          {doc.doc_category?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      )}
                      <span style={{ color: 'var(--outline-variant)', fontSize: '10px' }}>·</span>
                      <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                        {doc.processing_status === 'ready' ? '✓ Processed' :
                         doc.processing_status === 'processing' ? '⟳ Processing...' :
                         doc.processing_status === 'pending' ? '○ Pending OCR' : '⚠ Failed'}
                      </span>
                      {doc.page_count && <span style={{ fontSize: '11px', color: 'var(--outline)' }}>{doc.page_count}pp</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────────── HEARINGS TAB ─────────────────────────── */}
      {activeTab === 'hearings' && (
        <div className="space-y-4 fade-up">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              {upcomingHearings.length} upcoming · {pastHearings.length} past
            </p>
            <button onClick={() => setShowHearingForm(!showHearingForm)}
              className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 transition-all hover:opacity-80"
              style={{ background: 'var(--primary)', color: '#fff', borderRadius: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              Schedule Hearing
            </button>
          </div>

          {showHearingForm && (
            <form onSubmit={handleAddHearing} className="rounded-2xl p-6 space-y-4"
              style={{ background: 'var(--primary-fixed)', border: '1px solid rgba(2,36,72,0.1)' }}>
              <h3 className="font-serif font-bold" style={{ color: 'var(--primary)' }}>New Hearing</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label style={labelStyle}>Date *</label><input type="date" required value={hearingForm.date} onChange={e => setHearingForm({ ...hearingForm, date: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Time (IST)</label><input type="time" value={hearingForm.time} onChange={e => setHearingForm({ ...hearingForm, time: e.target.value })} style={inputStyle} /></div>
                <div>
                  <label style={labelStyle}>Purpose *</label>
                  <select value={hearingForm.purpose} onChange={e => setHearingForm({ ...hearingForm, purpose: e.target.value })} style={{ ...inputStyle, appearance: 'none' }}>
                    {HEARING_PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Court Room</label><input type="text" value={hearingForm.court_room} onChange={e => setHearingForm({ ...hearingForm, court_room: e.target.value })} placeholder="e.g. Court No. 5" style={inputStyle} /></div>
                <div><label style={labelStyle}>Judge Name</label><input type="text" value={hearingForm.judge_name} onChange={e => setHearingForm({ ...hearingForm, judge_name: e.target.value })} placeholder="Hon. Justice..." style={inputStyle} /></div>
                <div><label style={labelStyle}>Client Instruction</label><input type="text" value={hearingForm.client_instruction} onChange={e => setHearingForm({ ...hearingForm, client_instruction: e.target.value })} placeholder="e.g. Bring originals" style={inputStyle} /></div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Scheduling...' : 'Schedule Hearing'}
                </button>
                <button type="button" onClick={() => setShowHearingForm(false)} style={btnGhost}>Cancel</button>
              </div>
            </form>
          )}

          {/* Upcoming hearings */}
          {upcomingHearings.length > 0 && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}>
              <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(196,198,207,0.08)' }}>
                <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>UPCOMING</p>
              </div>
              {upcomingHearings.map((h: any) => {
                const daysUntil = Math.ceil((new Date(h.date).getTime() - Date.now()) / 86400000);
                const isUrgent = daysUntil <= 1;
                return (
                  <div key={h.id} className="px-5 py-4" style={{ borderBottom: '1px solid rgba(196,198,207,0.06)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-sm" style={{ color: isUrgent ? 'var(--error)' : 'var(--on-surface)' }}>
                            {new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            {h.time && <span className="font-normal ml-2 text-xs" style={{ color: 'var(--on-surface-variant)' }}>{h.time} IST</span>}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5"
                            style={{ background: isUrgent ? 'var(--error)' : 'var(--primary)', color: '#fff', borderRadius: '2px', fontSize: '9px' }}>
                            {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `in ${daysUntil}d`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                          <span className="capitalize">{h.purpose?.replace(/_/g, ' ')}</span>
                          {h.court_room && <><span>·</span><span>{h.court_room}</span></>}
                          {h.judge_name && <><span>·</span><span>{h.judge_name}</span></>}
                        </div>
                        {h.client_instruction && (
                          <p className="text-xs mt-1" style={{ color: 'var(--secondary)' }}>
                            📋 {h.client_instruction}
                          </p>
                        )}
                      </div>
                      {showOutcome !== h.id && (
                        <button onClick={() => { setShowOutcome(h.id); setOutcomeForm({ outcome: '', order_summary: '', next_hearing_date: '' }); }}
                          className="flex-shrink-0 text-xs font-bold px-3 py-1.5 transition-all hover:opacity-80"
                          style={{ background: 'var(--primary)', color: '#fff', borderRadius: '4px' }}>
                          Record Outcome
                        </button>
                      )}
                    </div>
                    {showOutcome === h.id && (
                      <form onSubmit={handleOutcome} className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid rgba(196,198,207,0.1)' }}>
                        <div><label style={labelStyle}>What happened? *</label><input type="text" required value={outcomeForm.outcome} onChange={e => setOutcomeForm({ ...outcomeForm, outcome: e.target.value })} placeholder="e.g. Arguments heard, next date given" style={inputStyle} /></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><label style={labelStyle}>Order Summary</label><input type="text" value={outcomeForm.order_summary} onChange={e => setOutcomeForm({ ...outcomeForm, order_summary: e.target.value })} placeholder="Brief summary" style={inputStyle} /></div>
                          <div><label style={labelStyle}>Next Hearing Date</label><input type="date" value={outcomeForm.next_hearing_date} onChange={e => setOutcomeForm({ ...outcomeForm, next_hearing_date: e.target.value })} style={inputStyle} /></div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
                            {saving ? 'Saving...' : 'Save Outcome'}
                          </button>
                          <button type="button" onClick={() => setShowOutcome(null)} style={btnGhost}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Past hearings */}
          {pastHearings.length > 0 && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)', opacity: 0.7 }}>
              <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(196,198,207,0.08)' }}>
                <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>PAST</p>
              </div>
              {[...pastHearings].reverse().map((h: any) => (
                <div key={h.id} className="flex items-start gap-3 px-5 py-3" style={{ borderBottom: '1px solid rgba(196,198,207,0.06)' }}>
                  <span className="material-symbols-outlined flex-shrink-0 mt-0.5" style={{ fontSize: '16px', color: '#16a34a' }}>check_circle</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                      {new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <span className="ml-2 capitalize text-xs" style={{ color: 'var(--outline)' }}>{h.purpose?.replace(/_/g, ' ')}</span>
                    </p>
                    {h.outcome && <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>{h.outcome}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {hearings.length === 0 && !showHearingForm && (
            <div className="rounded-2xl p-10 text-center"
              style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}>
              <span className="material-symbols-outlined mb-3 block" style={{ fontSize: '36px', color: 'var(--outline-variant)' }}>gavel</span>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>No hearings scheduled yet</p>
            </div>
          )}
        </div>
      )}

      {/* ──────────── TASKS TAB ─────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="space-y-4 fade-up">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              {activeTasks.length} active · {doneTasks.length} done
            </p>
            <button onClick={() => setShowTaskForm(!showTaskForm)}
              className="flex items-center gap-1.5 text-sm font-bold px-4 py-2"
              style={{ background: 'var(--primary)', color: '#fff', borderRadius: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              Add Task
            </button>
          </div>

          {showTaskForm && (
            <form onSubmit={handleAddTask} className="rounded-2xl p-6 space-y-4"
              style={{ background: 'var(--primary-fixed)', border: '1px solid rgba(2,36,72,0.1)' }}>
              <h3 className="font-serif font-bold" style={{ color: 'var(--primary)' }}>New Task</h3>
              <div><label style={labelStyle}>Title *</label><input type="text" required value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="e.g. File written arguments" style={inputStyle} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })} style={{ ...inputStyle, appearance: 'none' }}>
                    {['low','normal','high','urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Due Date</label><input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} style={inputStyle} /></div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Adding...' : 'Add Task'}
                </button>
                <button type="button" onClick={() => setShowTaskForm(false)} style={btnGhost}>Cancel</button>
              </div>
            </form>
          )}

          {activeTasks.length > 0 && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}>
              {activeTasks.map((task: any) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                const prioColor = task.priority === 'urgent' ? 'var(--error)' : task.priority === 'high' ? '#c2410c' : task.priority === 'low' ? '#16a34a' : 'var(--on-surface-variant)';
                return (
                  <div key={task.id} className="flex items-start gap-4 px-5 py-4" style={{ borderBottom: '1px solid rgba(196,198,207,0.06)' }}>
                    <button onClick={() => handleToggleTask(task)} className="mt-0.5 flex-shrink-0 transition-opacity hover:opacity-70">
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--outline-variant)' }}>check_box_outline_blank</span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: isOverdue ? 'var(--error)' : 'var(--on-surface)' }}>{task.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span style={{ fontSize: '10px', fontWeight: '700', color: prioColor, textTransform: 'uppercase' }}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span style={{ fontSize: '11px', color: isOverdue ? 'var(--error)' : 'var(--on-surface-variant)', fontWeight: '600' }}>
                            {isOverdue ? '⚠ ' : ''}Due {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {doneTasks.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)', opacity: 0.55 }}>
              <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(196,198,207,0.06)' }}>
                <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>COMPLETED ({doneTasks.length})</p>
              </div>
              {doneTasks.slice(0, 5).map((task: any) => (
                <div key={task.id} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: '1px solid rgba(196,198,207,0.04)' }}>
                  <button onClick={() => handleToggleTask(task)}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#16a34a' }}>check_box</span>
                  </button>
                  <p className="text-sm line-through" style={{ color: 'var(--outline)' }}>{task.title}</p>
                </div>
              ))}
            </div>
          )}

          {tasks.length === 0 && !showTaskForm && (
            <div className="rounded-2xl p-10 text-center"
              style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}>
              <span className="material-symbols-outlined mb-3 block" style={{ fontSize: '36px', color: 'var(--outline-variant)' }}>task_alt</span>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>No tasks yet</p>
            </div>
          )}
        </div>
      )}

      {/* ──────────── AGENTS TAB ─────────────────────────────── */}
      {activeTab === 'agents' && (
        <div className="fade-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {AGENTS.map(agent => {
              const isRunning = runningAgent === agent.type;
              const lastRun = agents.find((j: any) => j.agent_type === agent.type);
              return (
                <div key={agent.type} className="rounded-2xl p-5"
                  style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)', boxShadow: 'var(--shadow-tonal)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--primary-fixed)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--primary)' }}>{agent.icon}</span>
                    </div>
                    {lastRun?.status === 'completed' && (
                      <span className="text-xs font-bold px-2 py-0.5" style={{ background: '#dcfce7', color: '#15803d', borderRadius: '2px', fontSize: '9px' }}>DONE</span>
                    )}
                  </div>
                  <h3 className="font-serif font-bold text-base mb-1" style={{ color: 'var(--primary)' }}>{agent.label}</h3>
                  <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>{agent.desc}</p>
                  <button onClick={() => handleRunAgent(agent.type)} disabled={!!runningAgent}
                    className="w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-80"
                    style={{ background: isRunning ? 'var(--surface-container)' : 'var(--primary)', color: isRunning ? 'var(--on-surface-variant)' : '#fff', borderRadius: '6px', opacity: runningAgent && !isRunning ? 0.5 : 1 }}>
                    {isRunning ? (
                      <><span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>refresh</span> Running...</>
                    ) : (
                      <><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>play_arrow</span> Run Agent</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Agent history */}
          {agents.length > 0 && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}>
              <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(196,198,207,0.08)' }}>
                <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>RUN HISTORY</p>
              </div>
              {agents.slice(0, 10).map((job: any) => (
                <div key={job.id} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: '1px solid rgba(196,198,207,0.06)' }}>
                  <div className="flex-1">
                    <p className="text-sm font-bold capitalize" style={{ color: 'var(--on-surface)' }}>
                      {job.agent_type} Analysis
                    </p>
                    <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                      {new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {job.cost_inr && ` · ₹${Number(job.cost_inr).toFixed(2)}`}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5"
                    style={{
                      background: job.status === 'completed' ? '#dcfce7' : job.status === 'failed' ? 'var(--error-container)' : 'var(--secondary-fixed)',
                      color: job.status === 'completed' ? '#15803d' : job.status === 'failed' ? 'var(--on-error-container)' : 'var(--on-secondary-container)',
                      borderRadius: '2px', fontSize: '9px',
                    }}>
                    {job.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────────── DRAFTS TAB ─────────────────────────────── */}
      {activeTab === 'drafts' && (
        <div className="fade-up">
          <div className="rounded-2xl p-10 text-center"
            style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}>
            <span className="material-symbols-outlined mb-3 block" style={{ fontSize: '36px', color: 'var(--outline-variant)' }}>history_edu</span>
            <p className="font-serif font-bold text-lg mb-1" style={{ color: 'var(--primary)' }}>Drafting Workspace</p>
            <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              Run an AI agent and click "To Draft" to create an editable document with TipTap
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
