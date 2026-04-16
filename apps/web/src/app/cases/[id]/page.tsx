// @ts-nocheck
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import Link from 'next/link';
import {
  MapPin, FileText, Gavel, CheckSquare, Square, Bot, BookOpen,
  Plus, ChevronRight, CheckCircle2, AlertCircle, Loader2,
  Trash2, Play, RotateCcw, Info, Upload,
  Eye, Download, Monitor, Languages, Sparkles, Clock,
  BookMarked, Save,
} from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const TABS = [
  { key: 'overview',      Icon: Info,        label: 'Overview' },
  { key: 'documents',     Icon: FileText,    label: 'Documents' },
  { key: 'hearings',      Icon: Gavel,       label: 'Hearings' },
  { key: 'tasks',         Icon: CheckSquare, label: 'Tasks' },
  { key: 'agents',        Icon: Bot,         label: 'Agents' },
  { key: 'drafts',        Icon: BookOpen,    label: 'Drafts' },
  { key: 'presentations', Icon: Monitor,     label: 'Presentations' },
  { key: 'timeline',      Icon: Clock,       label: 'Case Timeline' },
  { key: 'filings',      Icon: BookMarked,  label: 'Filings' },
] as const;

const HEARING_PURPOSES = [
  { value: 'framing_of_charges', label: 'Framing of Charges' },
  { value: 'bail', label: 'Bail' },
  { value: 'arguments', label: 'Arguments' },
  { value: 'judgment', label: 'Judgment' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'examination', label: 'Examination' },
  { value: 'cross_examination', label: 'Cross Examination' },
  { value: 'interim_order', label: 'Interim Order' },
  { value: 'misc', label: 'Misc' },
];

const AGENTS = [
  { type: 'evidence',   Icon: FileText,   label: 'Evidence',   desc: 'Extract and analyse all evidence from documents' },
  { type: 'timeline',   Icon: RotateCcw,  label: 'Timeline',   desc: 'Reconstruct chronological order of events' },
  { type: 'research',   Icon: BookOpen,   label: 'Research',   desc: 'Find relevant Indian case law and statutes' },
  { type: 'deposition', Icon: FileText,   label: 'Deposition', desc: 'Analyse transcripts, find inconsistencies' },
  { type: 'strategy',   Icon: Bot,        label: 'Strategy',   desc: 'Develop court strategy from all prior analysis' },
];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  intake: { bg: '#edeef0', color: '#43474e' }, filed: { bg: '#d5e3ff', color: '#001c3b' },
  pending_hearing: { bg: '#ffe088', color: '#745c00' }, arguments: { bg: '#ede9fe', color: '#5b21b6' },
  decided: { bg: '#dcfce7', color: '#15803d' }, appeal: { bg: '#ffdad6', color: '#93000a' },
  closed: { bg: '#e7e8ea', color: '#74777f' },
};

type TabKey = typeof TABS[number]['key'];

const inp = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: '100%', padding: '9px 12px', border: '1px solid rgba(196,198,207,0.4)',
  borderRadius: '6px', fontSize: '13px', color: '#191c1e', background: '#fff',
  outline: 'none', fontFamily: 'Manrope, sans-serif', boxSizing: 'border-box', ...extra,
});

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  background: '#022448', color: '#fff', border: 'none', borderRadius: '6px',
  padding: '9px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
  fontFamily: 'Manrope, sans-serif',
};

const btnGhost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  background: 'transparent', color: '#74777f',
  border: '1px solid rgba(196,198,207,0.4)', borderRadius: '6px',
  padding: '9px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
  fontFamily: 'Manrope, sans-serif',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: 700,
  color: '#43474e', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px',
};




// ── Drafting Workspace Component ─────────────────────────────
function DraftingWorkspace({ caseId, token, caseData }: { caseId: string; token: string; caseData: any }) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingDraft, setEditingDraft] = useState<any>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('bail_application');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [editorText, setEditorText] = useState('');

  const DOC_TYPES = [
    { value: 'bail_application',   label: 'Bail Application' },
    { value: 'plaint',             label: 'Plaint / Petition' },
    { value: 'written_statement',  label: 'Written Statement' },
    { value: 'writ_petition',      label: 'Writ Petition' },
    { value: 'affidavit',          label: 'Affidavit' },
    { value: 'vakalatnama',        label: 'Vakalatnama' },
    { value: 'opening_statement',  label: 'Opening Statement' },
    { value: 'closing_statement',  label: 'Closing Statement' },
    { value: 'rejoinder',          label: 'Rejoinder' },
    { value: 'memo_of_appeal',     label: 'Memo of Appeal' },
    { value: 'other',              label: 'Other Document' },
  ];

  const fetchDrafts = async () => {
    try {
      const res = await fetch(BASE + '/v1/drafts/case/' + caseId, {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();
      setDrafts(data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchDrafts(); }, [caseId]);

  // Sync editor text when draft changes — handle all content formats
  useEffect(() => {
    if (editingDraft) {
      const c = editingDraft.content;
      let text = '';
      if (typeof c === 'string') {
        text = c;
      } else if (c?.text && typeof c.text === 'string') {
        text = c.text;
      } else if (c?.content && typeof c.content === 'string') {
        text = c.content;
      } else if (Array.isArray(c?.content)) {
        text = '';
      }
      // Restore from localStorage if we have a newer unsaved version
      const lsKey = 'draft_autosave_' + editingDraft.id;
      const saved = localStorage.getItem(lsKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.text && parsed.text.length > text.length) {
            text = parsed.text;
          }
          localStorage.removeItem(lsKey);
        } catch {}
      }
      setEditorText(text);
    }
  }, [editingDraft?.id]);

  // Auto-save to localStorage every 10 seconds while editing
  useEffect(() => {
    if (!editingDraft?.id) return;
    const interval = setInterval(() => {
      const ta = document.getElementById('draft-editor') as HTMLTextAreaElement;
      const text = ta ? ta.value : editorText;
      if (text && text.trim().length > 0) {
        localStorage.setItem('draft_autosave_' + editingDraft.id, JSON.stringify({ text, savedAt: new Date().toISOString() }));
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [editingDraft?.id, editorText]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    if (!editingDraft) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes in your draft. Are you sure you want to leave?';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [editingDraft]);

  const createDraft = async () => {
    if (!formTitle.trim()) return;
    setCreating(true); setError('');
    try {
      const res = await fetch(BASE + '/v1/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ case_id: caseId, title: formTitle, doc_type: formType, content: { type: 'doc', content: [] } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create draft');
      setShowForm(false); setFormTitle(''); setFormType('bail_application');
      setEditingDraft(data.data);
      fetchDrafts();
    } catch (err: any) { setError(err.message); }
    setCreating(false);
  };

  const saveDraft = async (draft: any, contentText: string) => {
    if (!draft?.id) { console.error('No draft id'); return; }
    setSaving(true);
    try {
      // Use the textarea value directly as final source of truth
      const textareaEl = document.getElementById('draft-editor') as HTMLTextAreaElement;
      const finalText = textareaEl ? textareaEl.value : contentText;

      const payload = {
        content: { type: 'doc', text: finalText },
        title: draft.title || 'Untitled Draft',
      };

      const res = await fetch(BASE + '/v1/drafts/' + draft.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.error?.message || errBody?.message || 'Save failed with status ' + res.status;
        alert('Save failed: ' + msg);
        setSaving(false);
        return;
      }

      const updated = await res.json();
      setEditorText(finalText);
      setEditingDraft((prev: any) => ({
        ...prev,
        content: { type: 'doc', text: finalText },
        version: updated.data?.version ?? prev.version,
        last_modified_at: updated.data?.last_modified_at ?? new Date().toISOString(),
        word_count: updated.data?.word_count ?? finalText.trim().split(/\s+/).filter(Boolean).length,
      }));
      fetchDrafts();
    } catch (err: any) {
      alert('Save error: ' + err.message);
    }
    setSaving(false);
  };

  const deleteDraft = async (draftId: string) => {
    if (!confirm('Delete this draft? This cannot be undone.')) return;
    await fetch(BASE + '/v1/drafts/' + draftId, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    });
    if (editingDraft?.id === draftId) setEditingDraft(null);
    fetchDrafts();
  };

  const generateWithAI = async (draft: any) => {
    setAiGenerating(true);
    try {
      // Get current editor text to improve if it already has content
      const existingText = editorText?.trim() || '';
      const res = await fetch(BASE + '/v1/filings/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          filing_name: draft.title,
          doc_type: draft.doc_type,
          ai_prompt_hint: 'Draft a complete ' + (draft.doc_type || 'legal document').replace(/_/g, ' ') + ' for this case in formal Indian court style.',
          existing_content: existingText || null,
          case_context: {
            title: caseData.title,
            court: caseData.court,
            cnr_number: caseData.cnr_number,
            case_type: caseData.case_type,
            court_level: caseData.court_level,
            perspective: caseData.perspective,
            filed_date: caseData.filed_date,
            status: caseData.status,
            metadata: caseData.metadata,
          },
        }),
      });
      const data = await res.json();
      if (data.data?.draft) {
        const generatedText = data.data.draft;
        setEditorText(generatedText);
        setEditingDraft((prev: any) => ({ ...prev, content: { type: 'doc', text: generatedText } }));
        // Also update textarea DOM directly so Save reads the latest value immediately
        const ta = document.getElementById('draft-editor') as HTMLTextAreaElement;
        if (ta) ta.value = generatedText;
      } else if (data.error) {
        alert('AI Generate failed: ' + (data.error.message || 'Unknown error'));
      }
    } catch (err: any) {
      alert('AI Generate failed: ' + err.message);
    }
    setAiGenerating(false);
  };

  const openDraft = async (draft: any) => {
    const res = await fetch(BASE + '/v1/drafts/' + draft.id, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const data = await res.json();
    setEditingDraft(data.data);
  };

  const downloadDraft = (draft: any) => {
    const text = draft.content?.text || draft.content?.content || '';
    const blob = new Blob([String(text)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (draft.title || 'draft').replace(/[^a-zA-Z0-9]/g, '_') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeLabel = (type: string) => DOC_TYPES.find(d => d.value === type)?.label || type;

  const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
    plaint: { bg: '#d5e3ff', color: '#022448' },
    writ_petition: { bg: '#ede9fe', color: '#5b21b6' },
    bail_application: { bg: '#ffdad6', color: '#93000a' },
    affidavit: { bg: '#dcfce7', color: '#15803d' },
    written_statement: { bg: '#ede9fe', color: '#5b21b6' },
    opening_statement: { bg: '#d5e3ff', color: '#022448' },
    default: { bg: '#edeef0', color: '#43474e' },
  };

  // Editor view
  if (editingDraft) {

    return (
      <div style={{ maxWidth: '860px' }}>
        {/* Editor toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button onClick={() => setEditingDraft(null)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: '#edeef0', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#43474e', fontFamily: 'Manrope, sans-serif' }}>
            ← Back to Drafts
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.1rem', color: '#022448', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editingDraft.title}</p>
            <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '2px', background: (TYPE_COLORS[editingDraft.doc_type] || TYPE_COLORS.default).bg, color: (TYPE_COLORS[editingDraft.doc_type] || TYPE_COLORS.default).color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {typeLabel(editingDraft.doc_type)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => generateWithAI(editingDraft)} disabled={aiGenerating} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', background: '#5b21b6', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: aiGenerating ? 'not-allowed' : 'pointer', opacity: aiGenerating ? 0.7 : 1, fontFamily: 'Manrope, sans-serif' }}>
              <Sparkles size={13} /> {aiGenerating ? 'Generating...' : 'AI Generate'}
            </button>
            <button onClick={() => saveDraft(editingDraft, editorText)} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', background: saving ? '#dcfce7' : '#022448', color: saving ? '#15803d' : '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Manrope, sans-serif' }}>
              <Save size={13} /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => downloadDraft({ ...editingDraft, content: { text: editorText } })} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: '#edeef0', color: '#43474e', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
              <Download size={13} /> Download
            </button>
          </div>
        </div>

        {/* Word count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: '#74777f' }}>
            {editorText.trim().split(/\s+/).filter(Boolean).length} words · v{editingDraft.version}
            <span style={{ marginLeft: '8px', fontSize: '10px', color: '#15803d' }}>· auto-saved locally</span>
          </span>
          <span style={{ fontSize: '11px', color: '#74777f' }}>
            Last saved: {new Date(editingDraft.last_modified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Text editor */}
        <textarea
          id="draft-editor"
          value={editorText}
          onChange={e => setEditorText(e.target.value)}
          placeholder="Start typing your legal document here...

Use AI Generate above to get a complete draft pre-filled with your case details, then edit as needed."
          style={{
            width: '100%', minHeight: '520px', padding: '24px', border: '1px solid rgba(196,198,207,0.3)',
            borderRadius: '12px', fontSize: '14px', fontFamily: 'Georgia, serif', lineHeight: 2,
            color: '#191c1e', resize: 'vertical', outline: 'none', background: '#fff',
            boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(2,36,72,0.05)',
          }}
        />
      </div>
    );
  }

  // Drafts list view
  return (
    <div style={{ maxWidth: '860px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.4rem', color: '#022448', margin: '0 0 4px' }}>Drafting Workspace</h2>
          <p style={{ fontSize: '13px', color: '#74777f', margin: 0 }}>{drafts.length} draft{drafts.length !== 1 ? 's' : ''} for this case</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#022448', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
          <Plus size={14} /> New Draft
        </button>
      </div>

      {/* New draft form */}
      {showForm && (
        <div style={{ background: '#d5e3ff20', border: '1px solid rgba(2,36,72,0.1)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#022448', margin: '0 0 14px' }}>New Draft</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#43474e', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px' }}>Title *</label>
              <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Bail Application for Accused" style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '6px', fontSize: '13px', fontFamily: 'Manrope, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#43474e', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px' }}>Document Type</label>
              <select value={formType} onChange={e => setFormType(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '6px', fontSize: '13px', fontFamily: 'Manrope, sans-serif', outline: 'none', appearance: 'none' as any }}>
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>
          {error && <p style={{ fontSize: '12px', color: '#93000a', margin: '0 0 10px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={createDraft} disabled={creating || !formTitle.trim()} style={{ padding: '8px 16px', background: '#022448', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: creating || !formTitle.trim() ? 0.6 : 1, fontFamily: 'Manrope, sans-serif' }}>
              {creating ? 'Creating...' : 'Create & Open'}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }} style={{ padding: '8px 16px', background: 'transparent', color: '#74777f', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Draft list */}
      {loading ? (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid rgba(196,198,207,0.15)', padding: '32px', textAlign: 'center', color: '#74777f' }}>Loading drafts...</div>
      ) : drafts.length === 0 && !showForm ? (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(196,198,207,0.15)', padding: '56px', textAlign: 'center', boxShadow: '0 2px 12px rgba(2,36,72,0.05)' }}>
          <BookOpen size={40} color="#c4c6cf" style={{ marginBottom: '16px' }} />
          <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: '0 0 8px' }}>No Drafts Yet</p>
          <p style={{ fontSize: '13px', color: '#74777f', margin: '0 0 20px', maxWidth: '360px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Create a draft and use AI Generate to auto-draft legal documents from your case details. Run the Strategy agent first for the best results.
          </p>
          <button onClick={() => setShowForm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#022448', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            <Plus size={14} /> Create First Draft
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {drafts.map(draft => {
            const tc = TYPE_COLORS[draft.doc_type] || TYPE_COLORS.default;
            return (
              <div key={draft.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid rgba(196,198,207,0.15)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 4px rgba(2,36,72,0.04)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} color={tc.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1rem', color: '#022448', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{draft.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '2px', background: tc.bg, color: tc.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{typeLabel(draft.doc_type)}</span>
                    <span style={{ fontSize: '11px', color: '#74777f' }}>{draft.word_count || 0} words</span>
                    <span style={{ fontSize: '11px', color: '#74777f' }}>v{draft.version}</span>
                    <span style={{ fontSize: '11px', color: '#74777f' }}>
                      {new Date(draft.last_modified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => openDraft(draft)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 12px', background: '#022448', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                    <Eye size={13} /> Open
                  </button>
                  <button onClick={() => downloadDraft(draft)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 10px', background: '#edeef0', color: '#43474e', border: 'none', borderRadius: '7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                    <Download size={13} />
                  </button>
                  <button onClick={() => deleteDraft(draft.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 10px', background: '#ffdad6', color: '#93000a', border: 'none', borderRadius: '7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Case Timeline Component ───────────────────────────────────
function CaseTimeline({ c, cardStyle, btnPrimary, btnGhost, setActiveTab }: {
  c: any; cardStyle: any; btnPrimary: any; btnGhost: any; setActiveTab: (t: any) => void;
}) {
  const now = new Date();

  type TEntry = {
    id: string; date: Date; category: string;
    title: string; description?: string; meta?: string;
    outcome?: string; icon: string; color: string; bg: string; future?: boolean;
  };

  const entries: TEntry[] = [];

  if (c.filed_date) entries.push({ id: 'filed', date: new Date(c.filed_date), category: 'filing', title: 'Case Filed', description: `${(c.case_type || '').replace(/_/g, ' ')} filed at ${c.court}`, meta: c.cnr_number ? `CNR: ${c.cnr_number}` : undefined, icon: '⚖️', color: '#022448', bg: '#d5e3ff' });
  entries.push({ id: 'created', date: new Date(c.created_at), category: 'status', title: 'Case Added to LexAI', description: `Registered by ${c.perspective || ''} team`, icon: '📋', color: '#43474e', bg: '#edeef0' });

  const catLabels: Record<string, string> = { fir: 'FIR Filed', chargesheet: 'Chargesheet Uploaded', bail_order: 'Bail Order', judgment: 'Judgment', affidavit: 'Affidavit Filed', plaint: 'Plaint Filed', written_statement: 'Written Statement', order: 'Court Order', deposition: 'Deposition Transcript', evidence_exhibit: 'Evidence Exhibit' };
  (c.documents || []).filter((d: any) => !d.filename?.includes('English Translation')).forEach((doc: any) => {
    entries.push({ id: `doc-${doc.id}`, date: new Date(doc.created_at), category: 'document', title: catLabels[doc.doc_category] || 'Document Uploaded', description: doc.filename, meta: doc.page_count ? `${doc.page_count}pp` : undefined, icon: '📄', color: '#735c00', bg: '#ffe08840' });
  });

  const purposeLabels: Record<string, string> = { bail: 'Bail Application', arguments: 'Arguments Heard', judgment: 'Judgment Pronounced', framing_of_charges: 'Charges Framed', evidence: 'Evidence Recorded', examination: 'Witness Examination', cross_examination: 'Cross Examination', interim_order: 'Interim Order', return_of_summons: 'Return of Summons', misc: 'Miscellaneous Hearing' };
  (c.hearings || []).forEach((h: any) => {
    const isFuture = new Date(h.date) > now;
    entries.push({ id: `h-${h.id}`, date: new Date(h.date), category: 'hearing', title: purposeLabels[h.purpose] || 'Hearing', description: [h.court_room && `Room: ${h.court_room}`, h.judge_name && `Before: ${h.judge_name}`].filter(Boolean).join(' · ') || undefined, outcome: h.outcome, meta: h.time ? `${h.time} IST` : undefined, icon: isFuture ? '📅' : h.outcome ? '✅' : '🏛', color: isFuture ? '#5b21b6' : h.outcome ? '#15803d' : '#022448', bg: isFuture ? '#ede9fe' : h.outcome ? '#dcfce7' : '#d5e3ff', future: isFuture });
  });

  (c.agent_jobs || []).filter((j: any) => j.status === 'completed').forEach((j: any) => {
    const al: Record<string, string> = { evidence: 'Evidence Analysis Complete', timeline: 'AI Timeline Reconstructed', research: 'Legal Research Complete', strategy: 'Court Strategy Generated', deposition: 'Deposition Analysis Complete' };
    entries.push({ id: `ag-${j.id}`, date: new Date(j.completed_at || j.created_at), category: 'agent', title: al[j.agent_type] || 'AI Analysis Complete', description: j.cost_inr ? `Cost: ₹${Number(j.cost_inr).toFixed(2)}` : undefined, icon: '🤖', color: '#5b21b6', bg: '#ede9fe' });
  });

  if (c.status === 'decided' || c.status === 'closed') entries.push({ id: 'closed', date: new Date(c.updated_at), category: 'status', title: c.status === 'decided' ? 'Case Decided' : 'Case Closed', description: 'Final status recorded', icon: '🔒', color: '#15803d', bg: '#dcfce7' });

  entries.sort((a, b) => a.date.getTime() - b.date.getTime());
  const past = entries.filter(e => !e.future);
  const future = entries.filter(e => e.future);

  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const rel = (d: Date) => { const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000); if (diff === 0) return 'Today'; if (diff === 1) return 'Tomorrow'; if (diff === -1) return 'Yesterday'; if (diff > 0) return `In ${diff} days`; return `${Math.abs(diff)} days ago`; };

  const catLabel = (cat: string) => ({ hearing: 'HEARING', document: 'DOCUMENT', agent: 'AI', task: 'TASK', filing: 'FILING', status: 'STATUS' }[cat] || 'EVENT');

  const EventCard = ({ entry, upcoming = false }: { entry: TEntry; upcoming?: boolean }) => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0, paddingTop: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: entry.bg, border: `2px ${upcoming ? 'dashed' : 'solid'} ${entry.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', position: 'relative', zIndex: 1, opacity: upcoming ? 0.85 : 1 }}>
          {entry.icon}
        </div>
      </div>
      <div style={{ flex: 1, background: upcoming ? '#fafbff' : '#fff', borderRadius: '12px', border: upcoming ? `1px dashed rgba(91,33,182,0.2)` : '1px solid rgba(196,198,207,0.15)', padding: '14px 16px', marginBottom: '12px', boxShadow: upcoming ? 'none' : '0 1px 4px rgba(2,36,72,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '2px', background: upcoming ? '#ede9fe' : entry.bg, color: upcoming ? '#5b21b6' : entry.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{upcoming ? 'UPCOMING' : catLabel(entry.category)}</span>
              {entry.meta && <span style={{ fontSize: '11px', color: '#74777f', fontWeight: 600 }}>{entry.meta}</span>}
            </div>
            <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1rem', color: upcoming ? '#5b21b6' : '#022448', margin: '0 0 2px' }}>{entry.title}</p>
            {entry.description && <p style={{ fontSize: '12px', color: '#74777f', margin: '0', lineHeight: 1.5 }}>{entry.description}</p>}
            {entry.outcome && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', background: '#f0fdf4', borderRadius: '6px', padding: '6px 10px', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803d', flexShrink: 0 }}>OUTCOME</span>
                <span style={{ fontSize: '12px', color: '#166534', lineHeight: 1.5 }}>{entry.outcome}</span>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: upcoming ? '#5b21b6' : '#43474e', margin: 0 }}>{fmt(entry.date)}</p>
            <p style={{ fontSize: '10px', color: '#74777f', margin: '2px 0 0' }}>{rel(entry.date)}</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (entries.length === 0) return (
    <div style={{ ...cardStyle, padding: '48px', textAlign: 'center', maxWidth: '720px' }}>
      <Clock size={36} color="#c4c6cf" style={{ marginBottom: '14px' }} />
      <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.1rem', color: '#022448', margin: '0 0 8px' }}>No Timeline Events Yet</p>
      <p style={{ fontSize: '13px', color: '#74777f', margin: '0 0 16px' }}>Add a filing date, schedule hearings, or upload documents to build the timeline.</p>
      <button onClick={() => setActiveTab('hearings')} style={btnPrimary}>+ Schedule First Hearing</button>
    </div>
  );

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.4rem', color: '#022448', margin: '0 0 4px' }}>Case Timeline</h2>
          <p style={{ fontSize: '13px', color: '#74777f', margin: 0 }}>{past.length} recorded events · {future.length} upcoming</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[{ color: '#022448', label: 'Filing' }, { color: '#15803d', label: 'Hearing' }, { color: '#735c00', label: 'Document' }, { color: '#5b21b6', label: 'Upcoming' }].map(item => (
            <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: item.color }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />{item.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: '19px', top: '8px', bottom: '8px', width: '2px', background: 'rgba(196,198,207,0.25)', borderRadius: '1px' }} />
        {past.map(e => <EventCard key={e.id} entry={e} />)}
        {future.length > 0 && (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffe088', border: '3px solid #735c00', zIndex: 1, position: 'relative' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, height: '1px', background: '#ffe088' }} />
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#735c00', background: '#ffe08830', padding: '3px 10px', borderRadius: '99px', whiteSpace: 'nowrap' }}>TODAY · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <div style={{ flex: 1, height: '1px', background: '#ffe088' }} />
            </div>
          </div>
        )}
        {future.map(e => <EventCard key={e.id} entry={e} upcoming />)}
      </div>

      <div style={{ marginTop: '8px', padding: '16px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed rgba(196,198,207,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <p style={{ fontSize: '13px', color: '#74777f', margin: 0 }}>Add more events by scheduling hearings or uploading documents</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setActiveTab('hearings')} style={{ ...btnGhost, fontSize: '12px', padding: '6px 12px' }}>+ Hearing</button>
          <button onClick={() => setActiveTab('documents')} style={{ ...btnGhost, fontSize: '12px', padding: '6px 12px' }}>+ Document</button>
        </div>
      </div>
    </div>
  );
}


// ── Case Filing Repository Component ─────────────────────────
// Maps DB case_type to filing categories
const CASE_TYPE_TO_CATEGORIES: Record<string, CaseCategory[]> = {
  criminal_sessions:   ['criminal'],
  criminal_magistrate: ['criminal'],
  writ_hc:             ['constitutional', 'civil', 'labour', 'revenue'],
  civil_district:      ['civil', 'family', 'motor_accident'],
  corporate_nclt:      ['commercial'],
  family:              ['family'],
  labour:              ['labour', 'constitutional'],
  ip:                  ['commercial', 'civil'],
  tax:                 ['revenue', 'constitutional'],
  arbitration:         ['commercial', 'civil'],
  consumer:            ['civil', 'commercial'],
};

// Maps court_level to jurisdiction prefix for display
const COURT_LEVEL_LABEL: Record<string, string> = {
  supreme_court: 'Supreme Court of India',
  high_court:    'High Court',
  district_court:'District Court',
  tribunal:      'Tribunal',
  magistrate:    'Magistrate Court',
};

// ── Case Filings Tab ─────────────────────────────────────────
const CASE_TYPE_LABELS: Record<string, string> = {
  criminal_sessions: 'Criminal (Sessions)',
  criminal_magistrate: 'Criminal (Magistrate)',
  writ_hc: 'Writ / Constitutional',
  civil_district: 'Civil',
  corporate_nclt: 'Commercial / NCLT',
  family: 'Family',
  labour: 'Labour',
  ip: 'Intellectual Property',
  tax: 'Revenue / Tax',
  arbitration: 'Arbitration',
  consumer: 'Consumer',
};

const QUICK_FILINGS: Record<string, { name: string; stage: string }[]> = {
  criminal_sessions: [
    { name: 'Vakalatnama', stage: 'Initiation' },
    { name: 'Bail Application', stage: 'Interim' },
    { name: 'Anticipatory Bail Application', stage: 'Initiation' },
    { name: 'Default Bail Application', stage: 'Interim' },
    { name: 'Application for Discharge', stage: 'Initiation' },
    { name: 'Petition to Quash FIR (Section 528 BNSS)', stage: 'Initiation' },
    { name: 'Criminal Appeal', stage: 'Appeal' },
    { name: 'Criminal Revision Petition', stage: 'Appeal' },
    { name: 'Special Leave Petition (Criminal)', stage: 'Appeal' },
    { name: 'Condonation of Delay Application', stage: 'Misc' },
    { name: 'Stay / Suspension Application', stage: 'Interim' },
  ],
  criminal_magistrate: [
    { name: 'Vakalatnama', stage: 'Initiation' },
    { name: 'Bail Application', stage: 'Interim' },
    { name: 'Default Bail Application', stage: 'Interim' },
    { name: 'Application for Discharge', stage: 'Initiation' },
    { name: 'Cheque Dishonour Complaint (Section 138 NI Act)', stage: 'Initiation' },
  ],
  writ_hc: [
    { name: 'Vakalatnama', stage: 'Initiation' },
    { name: 'Writ Petition (High Court)', stage: 'Initiation' },
    { name: 'Caveat Petition', stage: 'Initiation' },
    { name: 'Stay / Suspension Application', stage: 'Interim' },
    { name: 'Application for Interim Injunction', stage: 'Interim' },
    { name: 'Contempt Petition', stage: 'Misc' },
  ],
  civil_district: [
    { name: 'Vakalatnama', stage: 'Initiation' },
    { name: 'Civil Suit — Plaint', stage: 'Initiation' },
    { name: 'Written Statement', stage: 'Initiation' },
    { name: 'Application for Interim Injunction', stage: 'Interim' },
    { name: 'Caveat Petition', stage: 'Initiation' },
    { name: 'Execution Petition / Decree Execution', stage: 'Execution' },
    { name: 'Amendment Application', stage: 'Misc' },
    { name: 'Condonation of Delay Application', stage: 'Misc' },
  ],
  family: [
    { name: 'Vakalatnama', stage: 'Initiation' },
    { name: 'Divorce Petition', stage: 'Initiation' },
    { name: 'Maintenance Application', stage: 'Interim' },
    { name: 'Child Custody Petition', stage: 'Initiation' },
    { name: 'Stay / Suspension Application', stage: 'Interim' },
  ],
  corporate_nclt: [
    { name: 'Vakalatnama', stage: 'Initiation' },
    { name: 'Insolvency Application (IBC)', stage: 'Initiation' },
    { name: 'Caveat Petition', stage: 'Initiation' },
  ],
  labour: [
    { name: 'Vakalatnama', stage: 'Initiation' },
    { name: 'Writ Petition (High Court)', stage: 'Initiation' },
    { name: 'Writ Petition — Service Matters', stage: 'Initiation' },
    { name: 'Stay / Suspension Application', stage: 'Interim' },
  ],
};

const STAGE_COLORS: Record<string, { bg: string; color: string }> = {
  'Initiation': { bg: '#d5e3ff', color: '#022448' },
  'Interim':    { bg: '#ffe088', color: '#745c00' },
  'Appeal':     { bg: '#ede9fe', color: '#5b21b6' },
  'Execution':  { bg: '#dcfce7', color: '#15803d' },
  'Misc':       { bg: '#edeef0', color: '#43474e' },
};

function CaseFilingsTab({ c }: { c: any }) {
  const caseType = c.case_type || 'civil_district';
  const filings = QUICK_FILINGS[caseType] || QUICK_FILINGS['civil_district'];
  const caseLabel = CASE_TYPE_LABELS[caseType] || 'General';

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.4rem', color: '#022448', margin: '0 0 6px' }}>
            Relevant Filings
          </h2>
          <p style={{ fontSize: '13px', color: '#74777f', margin: 0 }}>
            Suggested filings for <strong>{caseLabel}</strong> matters · <strong>{c.court}</strong>
          </p>
        </div>
        <Link href="/filings" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#022448', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>
          <BookMarked size={14} /> Full Filings Library →
        </Link>
      </div>

      {/* Case context */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { label: c.perspective?.replace(/_/g, ' '), bg: '#d5e3ff', color: '#022448' },
          { label: c.status?.replace(/_/g, ' '), bg: '#ffe088', color: '#745c00' },
          { label: c.cnr_number, bg: '#edeef0', color: '#43474e' },
        ].filter(item => item.label).map((item, i) => (
          <span key={i} style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '99px', background: item.bg, color: item.color, textTransform: 'capitalize' }}>
            {item.label}
          </span>
        ))}
      </div>

      {/* Filing cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
        {filings.map((filing, i) => {
          const stageStyle = STAGE_COLORS[filing.stage] || STAGE_COLORS['Misc'];
          const encodedCase = encodeURIComponent(JSON.stringify({
            title: c.title,
            court: c.court,
            case_type: c.case_type,
            perspective: c.perspective,
            cnr_number: c.cnr_number,
          }));
          return (
            <Link
              key={i}
              href={
                "/filings?filing=" + encodeURIComponent(filing.name) +
                "&case_type=" + encodeURIComponent(c.case_type || '') +
                "&court=" + encodeURIComponent(c.court || '') +
                "&cnr=" + encodeURIComponent(c.cnr_number || '') +
                "&case_title=" + encodeURIComponent(c.title || '') +
                "&perspective=" + encodeURIComponent(c.perspective || '')
              }
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: '#fff', borderRadius: '12px', padding: '16px',
                border: '1px solid rgba(196,198,207,0.2)',
                boxShadow: '0 1px 4px rgba(2,36,72,0.04)',
                cursor: 'pointer', height: '100%', boxSizing: 'border-box',
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '3px', background: stageStyle.bg, color: stageStyle.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {filing.stage}
                  </span>
                  <ChevronRight size={14} color="#c4c6cf" />
                </div>
                <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '0.95rem', color: '#022448', margin: '0 0 4px', lineHeight: 1.3 }}>
                  {filing.name}
                </p>
                <p style={{ fontSize: '11px', color: '#74777f', margin: 0 }}>
                  View guide · AI Draft · Template
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer note */}
      <div style={{ marginTop: '20px', padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid rgba(196,198,207,0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <BookMarked size={16} color="#74777f" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: '13px', color: '#74777f', margin: 0 }}>
          Click any filing to open the full guide, download a template, or generate an AI-drafted document in the Filings library.
          The library will have all your case details pre-filled.
        </p>
      </div>
    </div>
  );
}


function TranslateButton({ doc, token }: { doc: any; token: string }) {
  const [status, setStatus] = useState<'idle'|'loading'|'done'|'error'|'english'>('idle');
  const [result, setResult] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetch(`${BASE_URL}/v1/documents/${doc.id}/translation`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(j => {
        if (j.data?.status === 'done') { setResult(j.data); setStatus(j.data.is_already_english ? 'english' : 'done'); }
      }).catch(() => {});
  }, [doc.id, token]);

  const trigger = async (force = false) => {
    setStatus('loading'); setResult(null);
    await fetch(`${BASE_URL}/v1/documents/${doc.id}/translate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ force }),
    });
    const poll = setInterval(async () => {
      const r = await fetch(`${BASE_URL}/v1/documents/${doc.id}/translation`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      if (j.data?.status === 'done') { clearInterval(poll); setResult(j.data); setStatus(j.data.is_already_english ? 'english' : 'done'); }
      else if (j.data?.status === 'failed') { clearInterval(poll); setStatus('error'); }
    }, 3000);
    setTimeout(() => clearInterval(poll), 180000);
  };

  if (status === 'english') return <span style={{ fontSize: '10px', fontWeight: 700, color: '#15803d', padding: '3px 8px', background: '#dcfce7', borderRadius: '4px' }}>✓ English</span>;
  if (status === 'loading') return <span style={{ fontSize: '11px', color: '#735c00', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Translating...</span>;
  if (status === 'error') return <button onClick={() => trigger()} style={{ fontSize: '11px', fontWeight: 700, color: '#93000a', background: 'transparent', border: '1px solid rgba(186,26,26,0.3)', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer' }}>↺ Retry</button>;

  if (status === 'done' && result) return (
    <>
      <span style={{ fontSize: '10px', fontWeight: 700, color: '#022448', padding: '3px 8px', background: '#d5e3ff', borderRadius: '4px' }}>{result.detected_language} → EN</span>
      <button onClick={() => setShowModal(true)} style={{ fontSize: '11px', fontWeight: 700, color: '#5b21b6', background: '#ede9fe', border: 'none', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer' }}>📄 View</button>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '680px', width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: '0 0 4px' }}>English Translation</h3>
                <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>Detected: {result.detected_language} · Confidence: {result.translation_confidence}</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#74777f' }}>✕</button>
            </div>
            {result.detected_language?.toLowerCase().includes('unknown') ? (
              <div style={{ background: '#fff7ed', borderRadius: '8px', padding: '14px', marginBottom: '16px', border: '1px solid #fdba74' }}>
                <p style={{ fontSize: '13px', color: '#c2410c', fontWeight: 600, margin: '0 0 6px' }}>⚠ Document could not be read clearly</p>
                <p style={{ fontSize: '12px', color: '#74777f', margin: '0 0 10px', lineHeight: 1.6 }}>The OCR extracted garbled text. Try uploading a clearer scan or a digital version.</p>
                <button onClick={() => { setShowModal(false); trigger(true); }} style={{ fontSize: '12px', fontWeight: 700, color: '#022448', background: '#d5e3ff', border: 'none', borderRadius: '6px', padding: '7px 14px', cursor: 'pointer' }}>↺ Retry with Vision OCR</button>
              </div>
            ) : (
              <>
                {result.summary && (
                  <div style={{ background: '#d5e3ff30', borderRadius: '8px', padding: '12px', marginBottom: '16px', border: '1px solid rgba(2,36,72,0.1)' }}>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: '#022448', letterSpacing: '0.06em', margin: '0 0 4px' }}>SUMMARY</p>
                    <p style={{ fontSize: '13px', color: '#191c1e', margin: 0, lineHeight: 1.6 }}>{result.summary}</p>
                  </div>
                )}
                {result.legal_terms?.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.06em', margin: '0 0 8px' }}>KEY LEGAL TERMS</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {result.legal_terms.map((t: string, i: number) => <span key={i} style={{ fontSize: '11px', fontWeight: 600, color: '#735c00', background: '#ffe08850', padding: '2px 8px', borderRadius: '4px' }}>{t}</span>)}
                    </div>
                  </div>
                )}
                {result.translation && (
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.06em', margin: '0 0 8px' }}>FULL TRANSLATION</p>
                    <div style={{ fontSize: '13px', color: '#191c1e', lineHeight: 1.8, whiteSpace: 'pre-wrap', background: '#f8fafc', borderRadius: '8px', padding: '16px' }}>{result.translation}</div>
                    <button onClick={() => navigator.clipboard.writeText(result.translation)} style={{ marginTop: '12px', padding: '8px 16px', background: 'transparent', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#43474e' }}>Copy Translation</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <button onClick={() => trigger()} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: '#ede9fe', border: 'none', borderRadius: '5px', fontSize: '11px', fontWeight: 700, color: '#5b21b6', cursor: 'pointer' }}>
      <Languages size={12} /> Translate
    </button>
  );
}

export default function CaseDetailPage() {
  const params = useParams(); const id = params.id as string;
  const { token } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [lastSync, setLastSync] = useState<any>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Hearing state
  const [showHearingForm, setShowHearingForm] = useState(false);
  const [showOutcome, setShowOutcome] = useState<string | null>(null);
  const [hf, setHf] = useState({ date: '', time: '', purpose: 'misc', court_room: '', judge_name: '', client_instruction: '' });
  const [of_, setOf_] = useState({ outcome: '', order_summary: '', next_hearing_date: '' });

  // Task state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [tf, setTf] = useState({ title: '', priority: 'normal', due_date: '' });

  // Agent state
  const [runningAgent, setRunningAgent] = useState<string | null>(null);

  // Presentation state
  const [creatingPresentation, setCreatingPresentation] = useState(false);
  const [newPresTitle, setNewPresTitle] = useState('');
  const [showNewPresForm, setShowNewPresForm] = useState(false);

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/cases/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Case not found');
      return (await res.json()).data;
    },
    enabled: !!token && !!id,
  });

  const { data: presData } = useQuery({
    queryKey: ['presentations', id],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/presentations?case_id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return (await res.json()).data;
    },
    enabled: !!token && !!id && activeTab === 'presentations',
  });

  const c = caseData as any;
  const presentations: any[] = presData || [];
  const refresh = () => qc.invalidateQueries({ queryKey: ['case', id] });

  // Fetch last eCourts sync status on mount
  useEffect(() => {
    if (!token || !id) return;
    fetch(`${BASE}/v1/ecourts/status/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.data?.last_sync) setLastSync(d.data.last_sync); })
      .catch(() => {});
  }, [id, token]);

  const syncFromECourts = async () => {
    if (!c?.cnr_number) {
      alert('This case has no CNR number. Please add a CNR number in the case details before syncing.');
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${BASE}/v1/ecourts/sync/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.status === 429) {
        setSyncResult({ status: 'rate_limited', message: data.error?.message || 'Synced recently, please wait.' });
      } else if (res.status === 503) {
        setSyncResult({ status: 'portal_unavailable', message: 'eCourts portal is currently unavailable. Try again later.' });
      } else if (res.status === 404 && data.error?.code === 'CNR_NOT_FOUND') {
        setSyncResult({ status: 'cnr_not_found', message: data.error.message });
      } else if (!res.ok) {
        setSyncResult({ status: 'failed', message: data.error?.message || 'Sync failed. Please try again.' });
      } else {
        setSyncResult({ status: 'success', message: data.data?.message, data: data.data });
        setLastSync({ synced_at: new Date().toISOString(), status: 'success', fetched_date: data.data?.next_hearing_date });
        refresh();
      }
    } catch (err: any) {
      setSyncResult({ status: 'failed', message: 'Network error: ' + err.message });
    }
    setSyncing(false);
  };

  const apiCall = async (url: string, method: string, body?: any) => {
    const res = await fetch(`${BASE}${url}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Request failed');
    return res.json();
  };

  const handleAddHearing = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await apiCall('/v1/hearings', 'POST', { case_id: id, ...hf });
      setShowHearingForm(false);
      setHf({ date: '', time: '', purpose: 'misc', court_room: '', judge_name: '', client_instruction: '' });
      refresh();
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  };

  const handleOutcome = async (e: React.FormEvent) => {
    e.preventDefault(); if (!showOutcome) return;
    setSaving(true); setError('');
    try {
      await apiCall(`/v1/hearings/${showOutcome}/outcome`, 'PATCH', of_);
      setShowOutcome(null); setOf_({ outcome: '', order_summary: '', next_hearing_date: '' }); refresh();
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await apiCall('/v1/tasks', 'POST', { case_id: id, ...tf });
      setShowTaskForm(false); setTf({ title: '', priority: 'normal', due_date: '' }); refresh();
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  };

  const handleToggleTask = async (task: any) => {
    try {
      await apiCall(`/v1/tasks/${task.id}`, 'PATCH', { status: task.status === 'done' ? 'todo' : 'done' });
      refresh();
    } catch (err: any) { setError(err.message); }
  };

  const handleRunAgent = async (agentType: string) => {
    if (!c) return;
    const readyDocs = (c.documents || []).filter((d: any) => d.processing_status === 'ready');
    if (readyDocs.length === 0) {
      setError('No processed documents found. Upload a document and wait for OCR to complete first.');
      return;
    }
    setRunningAgent(agentType); setError('');
    try {
      const res = await fetch(`${BASE}/v1/agents/cases/${id}/run/${agentType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Agent failed to start');
      refresh();
    } catch (err: any) { setError(err.message); }
    setRunningAgent(null);
  };

  const handleCreatePresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPresentation(true);
    try {
      const res = await fetch(`${BASE}/v1/presentations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ case_id: id, title: newPresTitle || c?.title }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error('Failed to create presentation');
      setShowNewPresForm(false);
      setNewPresTitle('');
      router.push(`/presentations/${json.data.id}`);
    } catch (err: any) { setError(err.message); }
    setCreatingPresentation(false);
  };

  if (isLoading) return (
    <div style={{ padding: '32px 28px', fontFamily: 'Manrope, sans-serif', maxWidth: '960px' }}>
      <div style={{ height: '120px', borderRadius: '20px', background: '#edeef0', marginBottom: '16px' }} />
      <div style={{ height: '48px', borderRadius: '12px', background: '#edeef0', marginBottom: '16px' }} />
      <div style={{ height: '300px', borderRadius: '20px', background: '#edeef0' }} />
    </div>
  );

  if (!c) return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
      <p style={{ fontFamily: 'Newsreader, serif', fontSize: '1.4rem', color: '#022448' }}>Case not found</p>
      <Link href="/cases" style={{ color: '#735c00', fontWeight: 700, fontSize: '14px' }}>← Back to Cases</Link>
    </div>
  );

  const hearings = c.hearings || [];
  const tasks = (c.tasks || []).filter((t: any) => t.status !== 'cancelled');
  const now2 = new Date();
  const upcomingHearings = hearings.filter((h: any) => !h.outcome && new Date(h.date) >= now2);
  const pastHearings = hearings.filter((h: any) => h.outcome || new Date(h.date) < now2);
  const activeTasks = tasks.filter((t: any) => t.status !== 'done');
  const doneTasks = tasks.filter((t: any) => t.status === 'done');
  const agents = c.agent_jobs || [];
  const ss = STATUS_STYLES[c.status] || STATUS_STYLES.intake;

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: '16px', border: '1px solid rgba(196,198,207,0.15)',
    boxShadow: '0px 2px 12px rgba(2,36,72,0.05)',
  };

  const sectionHeader: React.CSSProperties = {
    padding: '12px 20px', borderBottom: '1px solid rgba(196,198,207,0.1)',
    fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em', color: '#74777f', textTransform: 'uppercase',
  };

  return (
    <div style={{ padding: '32px 28px', fontFamily: 'Manrope, sans-serif', maxWidth: '960px' }}>

      {/* ── Case Header ─────────────────────────────────── */}
      <div style={{ ...cardStyle, padding: '20px', marginBottom: '16px', maxWidth: '860px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#735c00', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {c.case_type?.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 10px', borderRadius: '99px', background: ss.bg, color: ss.color }}>
                {c.status?.replace(/_/g, ' ')}
              </span>
              {c.priority !== 'normal' && (
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 10px', borderRadius: '99px',
                  background: c.priority === 'urgent' ? '#ffdad6' : '#fdddb9',
                  color: c.priority === 'urgent' ? '#93000a' : '#322109' }}>
                  {c.priority?.toUpperCase()}
                </span>
              )}
            </div>
            <h1 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.5rem', color: '#022448', margin: '0 0 8px', lineHeight: 1.25 }}>
              {c.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#43474e', fontSize: '13px', flexWrap: 'wrap' }}>
              <MapPin size={13} />
              <span>{c.court}</span>
              {c.cnr_number && (
                <><span style={{ color: '#c4c6cf' }}>·</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{c.cnr_number}</span></>
              )}
            </div>
          </div>
          {c.next_hearing_date && (
            <div style={{ background: '#022448', borderRadius: '12px', padding: '14px 18px', textAlign: 'center', flexShrink: 0 }}>
              <p style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em', margin: '0 0 2px' }}>NEXT HEARING</p>
              <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.8rem', color: '#ffe088', lineHeight: 1, margin: 0 }}>
                {new Date(c.next_hearing_date).getDate()}
              </p>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                {new Date(c.next_hearing_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '2px', flexWrap: 'wrap' }}>
        {TABS.map(({ key, Icon, label }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 14px', border: 'none', borderRadius: '8px',
            background: activeTab === key ? '#022448' : '#fff',
            color: activeTab === key ? '#fff' : '#74777f',
            fontWeight: activeTab === key ? 700 : 500, fontSize: '13px',
            cursor: 'pointer', whiteSpace: 'nowrap',
            border: activeTab === key ? 'none' : '1px solid rgba(196,198,207,0.25)',
            fontFamily: 'Manrope, sans-serif',
          } as any}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px', background: '#ffdad6', borderRadius: '10px', marginBottom: '16px', color: '#93000a' }}>
          <AlertCircle size={16} />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#93000a' }}>✕</button>
        </div>
      )}

      {/* ─── OVERVIEW ───────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <div style={{ ...cardStyle, padding: '20px', gridColumn: 'span 2' }}>
            <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1rem', color: '#022448', margin: '0 0 16px' }}>Case Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
              {[
                ['Court Level', c.court_level?.replace(/_/g, ' ')],
                ['Perspective', c.perspective],
                ['Judge', c.judge_name],
                ['Priority', c.priority],
                ['Filed Date', c.filed_date ? new Date(c.filed_date).toLocaleDateString('en-IN') : null],
                ['Status', c.status?.replace(/_/g, ' ')],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 3px' }}>{label as string}</p>
                  <p style={{ fontSize: '14px', color: '#191c1e', margin: 0, fontWeight: 500, textTransform: 'capitalize' }}>{value as string}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignSelf: 'flex-start' }}>
            {[
              { label: 'Documents',   value: c._count?.documents || 0, bg: '#d5e3ff', color: '#001c3b' },
              { label: 'Hearings',    value: hearings.length,          bg: '#ffe088', color: '#745c00' },
              { label: 'Active Tasks', value: activeTasks.length,      bg: '#fdddb9', color: '#322109' },
              { label: 'Agent Runs',  value: agents.length,            bg: '#edeef0', color: '#43474e' },
            ].map(item => (
              <div key={item.label} style={{ background: item.bg, borderRadius: '10px', padding: '16px 20px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '2rem', color: item.color, margin: '0 0 4px', lineHeight: 1 }}>{item.value}</p>
                <p style={{ fontSize: '11px', fontWeight: 800, color: item.color, opacity: 0.8, margin: 0, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{item.label.toUpperCase()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── eCourts Sync Panel ─────────────────────────── */}
        <div style={{ ...cardStyle, padding: '20px', marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1rem', color: '#022448', margin: '0 0 4px' }}>
                eCourts Sync
              </h3>
              <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>
                {!c.cnr_number
                  ? 'Add a CNR number to this case to enable eCourts sync.'
                  : lastSync
                    ? `Last synced ${new Date(lastSync.synced_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · Status: ${lastSync.status}`
                    : `CNR: ${c.cnr_number} · Never synced`
                }
              </p>
            </div>
            <button
              onClick={syncFromECourts}
              disabled={syncing || !c.cnr_number}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: syncing || !c.cnr_number ? '#edeef0' : '#022448',
                color: syncing || !c.cnr_number ? '#74777f' : '#fff',
                fontSize: '12px', fontWeight: 700, cursor: syncing || !c.cnr_number ? 'not-allowed' : 'pointer',
                fontFamily: 'Manrope, sans-serif',
              }}
            >
              {syncing ? '⏳ Syncing...' : '🔄 Sync from eCourts'}
            </button>
          </div>

          {/* Sync result banner */}
          {syncResult && (
            <div style={{
              marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
              background: syncResult.status === 'success' ? '#dcfce7' : syncResult.status === 'rate_limited' ? '#fef9c3' : '#fde8e8',
              border: `1px solid ${syncResult.status === 'success' ? '#86efac' : syncResult.status === 'rate_limited' ? '#fde047' : '#fca5a5'}`,
            }}>
              <p style={{
                margin: 0, fontSize: '12px', fontWeight: 600,
                color: syncResult.status === 'success' ? '#15803d' : syncResult.status === 'rate_limited' ? '#854d0e' : '#b91c1c',
              }}>
                {syncResult.status === 'success' ? '✅' : syncResult.status === 'rate_limited' ? '⏳' : '❌'} {syncResult.message}
              </p>
              {syncResult.data?.conflict_detected && (
                <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#b45309' }}>
                  ⚠️ A hearing already existed on this date — updated with eCourts data.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── DOCUMENTS ──────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div>
          {/* Upload zone */}
          <div style={{ border: '2px dashed rgba(196,198,207,0.5)', borderRadius: '16px', padding: '40px', textAlign: 'center', marginBottom: '16px', background: '#fff' }}>
            <Upload size={32} color="#c4c6cf" style={{ marginBottom: '12px' }} />
            <p style={{ fontWeight: 700, fontSize: '14px', color: '#022448', margin: '0 0 6px' }}>Upload Documents</p>
            <p style={{ fontSize: '12px', color: '#74777f', margin: '0 0 16px' }}>FIR, Charge Sheet, Evidence, Deposition — PDF or Image up to 50MB</p>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...btnPrimary }}>
              <Upload size={14} /> Choose File
              <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !c) return;
                setError('');
                try {
                  // Get presigned URL
                  const presignRes = await fetch(`${BASE}/v1/documents/presign`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ filename: file.name, mime_type: file.type, case_id: id, file_size_bytes: file.size }),
                  });
                  if (!presignRes.ok) throw new Error('Failed to get upload URL');
                  const presignJson = await presignRes.json();
                  const { presigned_url, s3_key } = presignJson.data;
                  if (!presigned_url) throw new Error('No upload URL returned from server');
                  // Upload directly to S3
                  const uploadRes = await fetch(presigned_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
                  if (!uploadRes.ok) throw new Error('Failed to upload file to S3');
                  // Register document
                  await apiCall('/v1/documents', 'POST', {
                    case_id: id, filename: file.name, s3_key,
                    mime_type: file.type, file_size_bytes: file.size,
                  });
                  refresh();
                } catch (err: any) { setError(err.message); }
              }} />
            </label>
          </div>
          {/* Document list */}
          {(c.documents || []).length === 0 ? (
            <div style={{ ...cardStyle, padding: '32px', textAlign: 'center' }}>
              <p style={{ color: '#74777f', fontSize: '14px' }}>No documents uploaded yet</p>
            </div>
          ) : (
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              {(c.documents || []).filter((doc: any) => !doc.filename?.includes('English Translation')).map((doc: any, i: number) => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: i < c.documents.length - 1 ? '1px solid rgba(196,198,207,0.1)' : 'none' }}>
                  <FileText size={20} color="#022448" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#191c1e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                      {doc.doc_category && <span style={{ fontSize: '9px', fontWeight: 800, color: '#735c00', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{doc.doc_category.replace(/_/g, ' ')}</span>}
                      <span style={{ fontSize: '11px', color: doc.processing_status === 'ready' ? '#15803d' : doc.processing_status === 'processing' ? '#735c00' : '#74777f' }}>
                        {doc.processing_status === 'ready' ? '✓ Processed' : doc.processing_status === 'processing' ? '⟳ Processing...' : doc.processing_status === 'pending' ? '○ Pending OCR' : '⚠ ' + doc.processing_status}
                      </span>
                      {(doc.processing_status === 'pending' || doc.processing_status === 'failed') && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`${BASE}/v1/documents/${doc.id}/retry-ocr`, {
                                method: 'POST', headers: { Authorization: `Bearer ${token}` },
                              });
                              const json = await res.json();
                              if (!res.ok) { setError(json.error?.message || 'Retry failed'); return; }
                              refresh();
                            } catch { setError('Retry failed'); }
                          }}
                          style={{ fontSize: '10px', fontWeight: 700, color: '#022448', background: 'transparent', border: '1px solid rgba(2,36,72,0.2)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                          ↺ Retry OCR
                        </button>
                      )}
                      {doc.page_count && <span style={{ fontSize: '11px', color: '#74777f' }}>{doc.page_count}pp</span>}
                    </div>
                  </div>
                  {/* Translate + Preview + Download */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                    {doc.processing_status === 'ready' && !doc.filename?.includes('English Translation') && (
                      <TranslateButton doc={doc} token={token!} />
                    )}
                    <button
                      title="Preview in browser"
                      onClick={async () => {
                        try {
                          const res = await fetch(`${BASE}/v1/documents/${doc.id}/preview`, {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          const json = await res.json();
                          if (json.data?.preview_url) window.open(json.data.preview_url, '_blank');
                        } catch { alert('Preview failed'); }
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: '#d5e3ff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#022448', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                      <Eye size={13} /> Preview
                    </button>
                    <button
                      title="Download file"
                      onClick={async () => {
                        try {
                          const res = await fetch(`${BASE}/v1/documents/${doc.id}/download`, {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          const json = await res.json();
                          if (json.data?.download_url) {
                            const a = document.createElement('a');
                            a.href = json.data.download_url;
                            a.download = doc.filename;
                            a.click();
                          }
                        } catch { alert('Download failed'); }
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: '#edeef0', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#43474e', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                      <Download size={13} /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── HEARINGS ───────────────────────────────────── */}
      {activeTab === 'hearings' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ color: '#74777f', fontSize: '13px', margin: 0 }}>{upcomingHearings.length} upcoming · {pastHearings.length} past</p>
            <button onClick={() => setShowHearingForm(!showHearingForm)} style={btnPrimary}>
              <Plus size={14} /> Schedule Hearing
            </button>
          </div>

          {showHearingForm && (
            <form onSubmit={handleAddHearing} style={{ background: '#d5e3ff20', border: '1px solid rgba(2,36,72,0.1)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#022448', margin: '0 0 16px' }}>New Hearing</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={lbl}>Date *</label><input type="date" required value={hf.date} onChange={e => setHf({ ...hf, date: e.target.value })} style={inp()} /></div>
                <div><label style={lbl}>Time (IST)</label><input type="time" value={hf.time} onChange={e => setHf({ ...hf, time: e.target.value })} style={inp()} /></div>
                <div>
                  <label style={lbl}>Purpose *</label>
                  <select value={hf.purpose} onChange={e => setHf({ ...hf, purpose: e.target.value })} style={inp({ appearance: 'none' } as any)}>
                    {HEARING_PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Court Room</label><input type="text" value={hf.court_room} onChange={e => setHf({ ...hf, court_room: e.target.value })} placeholder="e.g. Court No. 5" style={inp()} /></div>
                <div><label style={lbl}>Judge Name</label><input type="text" value={hf.judge_name} onChange={e => setHf({ ...hf, judge_name: e.target.value })} placeholder="Hon. Justice..." style={inp()} /></div>
                <div><label style={lbl}>Client Instruction</label><input type="text" value={hf.client_instruction} onChange={e => setHf({ ...hf, client_instruction: e.target.value })} placeholder="e.g. Bring originals" style={inp()} /></div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
                  {saving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : 'Schedule Hearing'}
                </button>
                <button type="button" onClick={() => setShowHearingForm(false)} style={btnGhost}>Cancel</button>
              </div>
            </form>
          )}

          {/* Upcoming */}
          {upcomingHearings.length > 0 && (
            <div style={{ ...cardStyle, overflow: 'hidden', marginBottom: '12px' }}>
              <p style={sectionHeader}>UPCOMING</p>
              {upcomingHearings.map((h: any) => {
                const daysUntil = Math.ceil((new Date(h.date).getTime() - Date.now()) / 86400000);
                const isUrgent = daysUntil <= 1;
                return (
                  <div key={h.id} style={{ padding: '20px', borderBottom: '1px solid rgba(196,198,207,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: isUrgent ? '#ba1a1a' : '#191c1e' }}>
                            {new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          {h.time && <span style={{ fontSize: '12px', color: '#74777f' }}>{h.time} IST</span>}
                          <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', background: isUrgent ? '#ba1a1a' : '#022448', color: '#fff', borderRadius: '2px', letterSpacing: '0.04em' }}>
                            {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `in ${daysUntil}d`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#74777f', flexWrap: 'wrap' }}>
                          <span style={{ textTransform: 'capitalize' }}>{h.purpose?.replace(/_/g, ' ')}</span>
                          {h.court_room && <span>Room: {h.court_room}</span>}
                          {h.judge_name && <span>{h.judge_name}</span>}
                        </div>
                        {h.client_instruction && <p style={{ fontSize: '12px', color: '#735c00', margin: '4px 0 0' }}>📋 {h.client_instruction}</p>}
                      </div>
                      {showOutcome !== h.id && (
                        <button onClick={() => { setShowOutcome(h.id); setOf_({ outcome: '', order_summary: '', next_hearing_date: '' }); }}
                          style={{ ...btnPrimary, flexShrink: 0 }}>
                          Record Outcome
                        </button>
                      )}
                    </div>
                    {showOutcome === h.id && (
                      <form onSubmit={handleOutcome} style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(196,198,207,0.15)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                          <div><label style={lbl}>What happened? *</label><input type="text" required value={of_.outcome} onChange={e => setOf_({ ...of_, outcome: e.target.value })} placeholder="e.g. Arguments heard, next date given" style={inp()} /></div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div><label style={lbl}>Order Summary</label><input type="text" value={of_.order_summary} onChange={e => setOf_({ ...of_, order_summary: e.target.value })} placeholder="Brief summary" style={inp()} /></div>
                            <div><label style={lbl}>Next Hearing Date</label><input type="date" value={of_.next_hearing_date} onChange={e => setOf_({ ...of_, next_hearing_date: e.target.value })} style={inp()} /></div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
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

          {/* Past */}
          {pastHearings.length > 0 && (
            <div style={{ ...cardStyle, overflow: 'hidden', opacity: 0.75 }}>
              <p style={sectionHeader}>PAST</p>
              {[...pastHearings].reverse().map((h: any) => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 20px', borderBottom: '1px solid rgba(196,198,207,0.06)' }}>
                  <CheckCircle2 size={16} color="#15803d" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#43474e', margin: 0 }}>
                      {new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: '#74777f', fontWeight: 400, textTransform: 'capitalize' }}>{h.purpose?.replace(/_/g, ' ')}</span>
                    </p>
                    {h.outcome && <p style={{ fontSize: '12px', color: '#74777f', margin: '2px 0 0' }}>{h.outcome}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {hearings.length === 0 && !showHearingForm && (
            <div style={{ ...cardStyle, padding: '40px', textAlign: 'center' }}>
              <Gavel size={32} color="#c4c6cf" style={{ marginBottom: '12px' }} />
              <p style={{ color: '#74777f', fontSize: '14px', margin: 0 }}>No hearings scheduled yet</p>
            </div>
          )}
        </div>
      )}

      {/* ─── TASKS ──────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ color: '#74777f', fontSize: '13px', margin: 0 }}>{activeTasks.length} active · {doneTasks.length} done</p>
            <button onClick={() => setShowTaskForm(!showTaskForm)} style={btnPrimary}>
              <Plus size={14} /> Add Task
            </button>
          </div>

          {showTaskForm && (
            <form onSubmit={handleAddTask} style={{ background: '#d5e3ff20', border: '1px solid rgba(2,36,72,0.1)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#022448', margin: '0 0 16px' }}>New Task</h3>
              <div style={{ marginBottom: '12px' }}><label style={lbl}>Title *</label><input type="text" required value={tf.title} onChange={e => setTf({ ...tf, title: e.target.value })} placeholder="e.g. File written arguments" style={inp()} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={lbl}>Priority</label>
                  <select value={tf.priority} onChange={e => setTf({ ...tf, priority: e.target.value })} style={inp({ appearance: 'none' } as any)}>
                    {['low', 'normal', 'high', 'urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Due Date</label><input type="date" value={tf.due_date} onChange={e => setTf({ ...tf, due_date: e.target.value })} style={inp()} /></div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Adding...' : 'Add Task'}
                </button>
                <button type="button" onClick={() => setShowTaskForm(false)} style={btnGhost}>Cancel</button>
              </div>
            </form>
          )}

          {activeTasks.length > 0 && (
            <div style={{ ...cardStyle, overflow: 'hidden', marginBottom: '12px' }}>
              {activeTasks.map((task: any) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                const prioColor = task.priority === 'urgent' ? '#ba1a1a' : task.priority === 'high' ? '#c2410c' : task.priority === 'low' ? '#15803d' : '#74777f';
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 20px', borderBottom: '1px solid rgba(196,198,207,0.08)' }}>
                    <button onClick={() => handleToggleTask(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }}>
                      <Square size={18} color="#c4c6cf" />
                    </button>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: isOverdue ? '#ba1a1a' : '#191c1e', margin: '0 0 4px' }}>{task.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: prioColor, textTransform: 'uppercase' }}>{task.priority}</span>
                        {task.due_date && (
                          <span style={{ fontSize: '11px', color: isOverdue ? '#ba1a1a' : '#74777f', fontWeight: isOverdue ? 700 : 400 }}>
                            {isOverdue ? '⚠ Overdue · ' : ''}Due {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
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
            <div style={{ ...cardStyle, overflow: 'hidden', opacity: 0.55 }}>
              <p style={sectionHeader}>COMPLETED ({doneTasks.length})</p>
              {doneTasks.slice(0, 5).map((task: any) => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: '1px solid rgba(196,198,207,0.06)' }}>
                  <button onClick={() => handleToggleTask(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                    <CheckCircle2 size={18} color="#15803d" />
                  </button>
                  <p style={{ fontSize: '13px', color: '#74777f', textDecoration: 'line-through', margin: 0 }}>{task.title}</p>
                </div>
              ))}
            </div>
          )}

          {tasks.length === 0 && !showTaskForm && (
            <div style={{ ...cardStyle, padding: '40px', textAlign: 'center' }}>
              <CheckSquare size={32} color="#c4c6cf" style={{ marginBottom: '12px' }} />
              <p style={{ color: '#74777f', fontSize: '14px', margin: 0 }}>No tasks yet</p>
            </div>
          )}
        </div>
      )}

      {/* ─── AGENTS ─────────────────────────────────────── */}
      {activeTab === 'agents' && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            {AGENTS.map(({ type, Icon, label, desc }) => {
              const isRunning = runningAgent === type;
              const lastRun = agents.find((j: any) => j.agent_type === type);
              return (
                <div key={type} style={{ ...cardStyle, padding: '20px', minWidth: '200px', maxWidth: '260px', flex: '1 1 200px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#d5e3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color="#022448" />
                    </div>
                    {lastRun?.status === 'completed' && (
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', background: '#dcfce7', color: '#15803d', borderRadius: '2px' }}>DONE</span>
                    )}
                  </div>
                  <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '15px', color: '#022448', margin: '0 0 4px' }}>{label}</h3>
                  <p style={{ fontSize: '12px', color: '#74777f', margin: '0 0 14px', lineHeight: 1.5 }}>{desc}</p>
                  <button onClick={() => handleRunAgent(type)} disabled={!!runningAgent} style={{
                    ...btnPrimary, width: '100%', justifyContent: 'center',
                    opacity: runningAgent && !isRunning ? 0.4 : 1,
                    background: isRunning ? '#edeef0' : '#022448',
                    color: isRunning ? '#43474e' : '#fff',
                  }}>
                    {isRunning ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Running...</> : <><Play size={13} /> Run Agent</>}
                  </button>
                </div>
              );
            })}
          </div>

          {agents.length > 0 && (
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <p style={sectionHeader}>RUN HISTORY</p>
              {agents.slice(0, 8).map((job: any) => (
                <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: '1px solid rgba(196,198,207,0.08)' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', margin: 0, textTransform: 'capitalize' }}>{job.agent_type} Analysis</p>
                    <p style={{ fontSize: '11px', color: '#74777f', margin: '2px 0 0' }}>
                      {new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {job.cost_inr ? ` · ₹${Number(job.cost_inr).toFixed(2)}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: 800, padding: '3px 8px', borderRadius: '2px',
                    background: job.status === 'completed' ? '#dcfce7' : job.status === 'failed' ? '#ffdad6' : '#ffe088',
                    color: job.status === 'completed' ? '#15803d' : job.status === 'failed' ? '#93000a' : '#745c00',
                  }}>
                    {job.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── DRAFTS ─────────────────────────────────────── */}
      {activeTab === 'drafts' && (
        <DraftingWorkspace caseId={id} token={token!} caseData={c} />
      )}

      {/* ─── FILINGS ────────────────────────────────────── */}
      {activeTab === 'filings' && (
        <CaseFilingsTab c={c} />
      )}

      {/* ─── PRESENTATIONS ──────────────────────────────── */}
      {activeTab === 'presentations' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ color: '#74777f', fontSize: '13px', margin: 0 }}>{presentations.length} presentation{presentations.length !== 1 ? 's' : ''} for this case</p>
            <button onClick={() => setShowNewPresForm(!showNewPresForm)} style={btnPrimary}><Plus size={14} /> New Presentation</button>
          </div>
          {showNewPresForm && (
            <form onSubmit={handleCreatePresentation} style={{ background: '#d5e3ff20', border: '1px solid rgba(2,36,72,0.1)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#022448', margin: '0 0 12px' }}>New Presentation</h3>
              <div style={{ marginBottom: '14px' }}>
                <label style={lbl}>Title</label>
                <input type="text" value={newPresTitle} onChange={e => setNewPresTitle(e.target.value)} placeholder={c?.title + ' — Presentation'} style={inp()} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" disabled={creatingPresentation} style={{ ...btnPrimary, opacity: creatingPresentation ? 0.6 : 1 }}>
                  {creatingPresentation ? <><Loader2 size={13} /> Creating...</> : 'Create & Open Builder'}
                </button>
                <button type="button" onClick={() => setShowNewPresForm(false)} style={btnGhost}>Cancel</button>
              </div>
            </form>
          )}
          {presentations.length === 0 && !showNewPresForm ? (
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(196,198,207,0.15)', boxShadow: '0px 2px 12px rgba(2,36,72,0.05)', padding: '56px', textAlign: 'center' }}>
              <Monitor size={40} color="#c4c6cf" style={{ marginBottom: '16px' }} />
              <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: '0 0 8px' }}>No Presentations Yet</p>
              <p style={{ fontSize: '13px', color: '#74777f', margin: '0 0 20px', lineHeight: 1.6 }}>Create a presentation deck for this case. AI can generate a full deck from your Strategy agent output.</p>
              <button onClick={() => setShowNewPresForm(true)} style={btnPrimary}><Sparkles size={14} /> Create First Presentation</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {presentations.map((pres: any) => (
                <div key={pres.id} style={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(196,198,207,0.15)', boxShadow: '0px 2px 12px rgba(2,36,72,0.05)', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#022448', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Monitor size={22} color="#ffe088" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1rem', color: '#022448', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pres.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: '#74777f' }}>{Array.isArray(pres.slides) ? pres.slides.length : 0} slides</span>
                      <span style={{ fontSize: '11px', color: '#74777f' }}>{new Date(pres.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <Link href={'/presentations/' + pres.id} style={{ ...btnPrimary, textDecoration: 'none', fontSize: '12px' }}><FileText size={13} /> Edit</Link>
                    <Link href={'/presentations/' + pres.id + '/present'} style={{ ...btnGhost, textDecoration: 'none', fontSize: '12px' }}><Play size={13} /> Present</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── CASE TIMELINE ──────────────────────────────── */}
      {activeTab === 'timeline' && (
        <CaseTimeline c={c} cardStyle={cardStyle} btnPrimary={btnPrimary} btnGhost={btnGhost} setActiveTab={setActiveTab} />
      )}

    </div>
  );
}
      )}

      {activeTab === 'overview' && (

