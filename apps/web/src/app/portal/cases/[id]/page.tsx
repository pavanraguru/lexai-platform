'use client';
// apps/web/src/app/portal/cases/[id]/page.tsx
// View-only case detail for clients. No agents, no edit, no delete.

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Info, FileText, Gavel, CheckSquare, BookOpen, Search, Upload, ChevronLeft, Download } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const PORTAL_TABS = [
  { key: 'overview',   Icon: Info,        label: 'Overview' },
  { key: 'documents',  Icon: FileText,    label: 'Documents' },
  { key: 'hearings',   Icon: Gavel,       label: 'Hearings' },
  { key: 'tasks',      Icon: CheckSquare, label: 'Tasks' },
  { key: 'drafts',     Icon: BookOpen,    label: 'Drafts' },
  { key: 'search',     Icon: Search,      label: 'Search' },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active:   { bg: '#dcfce7', color: '#15803d' },
  open:     { bg: '#dcfce7', color: '#15803d' },
  closed:   { bg: '#f1f5f9', color: '#64748b' },
  pending:  { bg: '#ffe088', color: '#735c00' },
  decided:  { bg: '#dcfce7', color: '#15803d' },
  filed:    { bg: '#d5e3ff', color: '#001c3b' },
  default:  { bg: '#f1f5f9', color: '#374151' },
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtBytes(b: number) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function fileEmoji(mime: string) {
  if (mime?.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📄';
  if (mime?.includes('word')) return '📝';
  return '📁';
}

// ── Overview Tab ─────────────────────────────────────────────
function OverviewTab({ caseData }: { caseData: any }) {
  const s: Record<string, React.CSSProperties> = {
    card: { background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', padding: '20px 24px', marginBottom: '16px' },
    label: { fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '4px' },
    value: { fontSize: '14px', color: '#111827', fontWeight: 500 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' },
  };
  const fields = [
    { label: 'Case Number', value: caseData.case_number || '—' },
    { label: 'Case Type', value: caseData.case_type || '—' },
    { label: 'Court', value: caseData.court_name || '—' },
    { label: 'Status', value: caseData.status },
    { label: 'Next Hearing', value: fmtDate(caseData.next_hearing_date) },
    { label: 'Filed On', value: fmtDate(caseData.created_at) },
  ];
  return (
    <>
      {caseData.description && (
        <div style={s.card}>
          <div style={s.label}>Case Description</div>
          <div style={{ ...s.value, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{caseData.description}</div>
        </div>
      )}
      <div style={{ ...s.card, padding: '24px' }}>
        <div style={s.grid}>
          {fields.map(f => (
            <div key={f.label}>
              <div style={s.label}>{f.label}</div>
              {f.label === 'Status' ? (
                <span style={{ ...(STATUS_COLORS[f.value?.toLowerCase()] || STATUS_COLORS.default), fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px' }}>
                  {f.value}
                </span>
              ) : (
                <div style={s.value}>{f.value}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Documents Tab ─────────────────────────────────────────────
function DocumentsTab({ caseId, token }: { caseId: string; token: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function fetchDocs() {
    fetch(`${BASE}/v1/documents?case_id=${caseId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setDocs(d.data || [])).finally(() => setLoading(false));
  }
  useEffect(() => { fetchDocs(); }, [caseId]);

  async function handleUpload(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    setUploadProgress(10);
    for (const file of files) {
      try {
        const pr = await fetch(`${BASE}/v1/documents/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ filename: file.name, mime_type: file.type || 'application/octet-stream', case_id: caseId, file_size_bytes: file.size }),
        });
        const { data: presign } = await pr.json();
        setUploadProgress(40);
        await fetch(presign.presigned_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        setUploadProgress(80);
        await fetch(`${BASE}/v1/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ case_id: caseId, filename: file.name, s3_key: presign.s3_key, mime_type: file.type, file_size_bytes: file.size }),
        });
        setUploadProgress(100);
      } catch (e) { console.error(e); }
    }
    setTimeout(() => { setUploading(false); setUploadProgress(0); fetchDocs(); }, 800);
  }

  async function handleDownload(doc: any) {
    const res = await fetch(`${BASE}/v1/documents/${doc.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
    const { data } = await res.json();
    window.open(data.download_url, '_blank');
  }

  const s: Record<string, React.CSSProperties> = {
    uploadZone: { border: '2px dashed rgba(196,198,207,0.5)', borderRadius: '14px', padding: '32px', textAlign: 'center' as const, cursor: 'pointer', background: '#fafafa', marginBottom: '16px' },
    docRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #f8fafc' },
    docIcon: { fontSize: '24px', flexShrink: 0 },
    docName: { fontSize: '13px', fontWeight: 600, color: '#022448', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
    docMeta: { fontSize: '11px', color: '#94a3b8' },
    dlBtn: { background: '#f0f4ff', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#022448', flexShrink: 0 },
    progressTrack: { height: '4px', background: '#f1f5f9', borderRadius: '2px', marginBottom: '12px', overflow: 'hidden' },
  };

  return (
    <>
      <div
        style={s.uploadZone}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleUpload(Array.from(e.dataTransfer.files)); }}
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={28} color="#94a3b8" style={{ marginBottom: '8px' }} />
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#022448' }}>Upload documents</div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Drop files here or click to browse</div>
        <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => e.target.files && handleUpload(Array.from(e.target.files))} />
      </div>

      {uploading && (
        <div style={s.progressTrack}>
          <div style={{ height: '4px', background: '#022448', borderRadius: '2px', width: `${uploadProgress}%`, transition: 'width 0.3s' }} />
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading documents...</div>
        ) : docs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No documents yet. Upload files above.</div>
        ) : docs.map((doc: any, i: number) => (
          <div key={doc.id} style={{ ...s.docRow, borderBottom: i < docs.length - 1 ? '1px solid #f8fafc' : 'none' }}>
            <div style={s.docIcon}>{fileEmoji(doc.mime_type)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.docName}>{doc.filename}</div>
              <div style={s.docMeta}>{fmtBytes(doc.file_size_bytes)} · {fmtDate(doc.created_at)}</div>
            </div>
            <button style={s.dlBtn} onClick={() => handleDownload(doc)}>
              <Download size={12} /> Download
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Hearings Tab ──────────────────────────────────────────────
function HearingsTab({ hearings }: { hearings: any[] }) {
  const s: Record<string, React.CSSProperties> = {
    card: { background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden' },
    row: { display: 'flex', gap: '16px', padding: '16px 20px', borderBottom: '1px solid #f8fafc' },
    dateBox: { width: '56px', height: '56px', borderRadius: '12px', background: '#f0f4ff', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    dateDay: { fontSize: '20px', fontWeight: 800, color: '#022448', lineHeight: 1 },
    dateMon: { fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const },
    purpose: { fontSize: '14px', fontWeight: 600, color: '#022448', marginBottom: '4px' },
    outcome: { fontSize: '13px', color: '#64748b' },
    outcomePill: { display: 'inline-block', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', marginTop: '4px' },
    empty: { padding: '40px', textAlign: 'center' as const, color: '#94a3b8', fontSize: '14px' },
  };

  const sorted = [...hearings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div style={s.card}>
      {sorted.length === 0 ? (
        <div style={s.empty}>No hearings recorded yet.</div>
      ) : sorted.map((h: any, i: number) => {
        const d = new Date(h.date);
        return (
          <div key={h.id} style={{ ...s.row, borderBottom: i < sorted.length - 1 ? '1px solid #f8fafc' : 'none' }}>
            <div style={s.dateBox}>
              <div style={s.dateDay}>{d.getDate()}</div>
              <div style={s.dateMon}>{d.toLocaleString('en-IN', { month: 'short' })}</div>
            </div>
            <div>
              <div style={s.purpose}>{h.purpose || 'Hearing'}</div>
              {h.outcome && <div style={s.outcomePill}>{h.outcome}</div>}
              {h.order_summary && <div style={{ ...s.outcome, marginTop: '6px' }}>{h.order_summary}</div>}
              {h.next_hearing_date && (
                <div style={{ fontSize: '12px', color: '#022448', marginTop: '6px', fontWeight: 600 }}>
                  Next: {fmtDate(h.next_hearing_date)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tasks Tab ─────────────────────────────────────────────────
function TasksTab({ tasks }: { tasks: any[] }) {
  const PRIORITY = { high: { bg: '#ffdad6', color: '#ba1a1a' }, medium: { bg: '#ffe088', color: '#735c00' }, low: { bg: '#f1f5f9', color: '#64748b' } };
  const STATUS = { pending: '○', in_progress: '◐', done: '●' };

  const s: Record<string, React.CSSProperties> = {
    card: { background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden' },
    row: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: '1px solid #f8fafc' },
    title: { fontSize: '14px', fontWeight: 600, color: '#022448', flex: 1 },
    due: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
    empty: { padding: '40px', textAlign: 'center' as const, color: '#94a3b8', fontSize: '14px' },
  };

  return (
    <div style={s.card}>
      {tasks.length === 0 ? (
        <div style={s.empty}>No tasks for this case.</div>
      ) : tasks.map((t: any, i: number) => (
        <div key={t.id} style={{ ...s.row, borderBottom: i < tasks.length - 1 ? '1px solid #f8fafc' : 'none' }}>
          <span style={{ fontSize: '16px', color: t.status === 'done' ? '#15803d' : '#022448' }}>
            {STATUS[t.status as keyof typeof STATUS] || '○'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ ...s.title, textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? '#94a3b8' : '#022448' }}>
              {t.title}
            </div>
            {t.due_date && <div style={s.due}>Due: {fmtDate(t.due_date)}</div>}
          </div>
          {t.priority && (
            <span style={{ ...(PRIORITY[t.priority as keyof typeof PRIORITY] || PRIORITY.low), fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '20px', flexShrink: 0 }}>
              {t.priority}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Drafts Tab ────────────────────────────────────────────────
function DraftsTab({ caseId, token }: { caseId: string; token: string }) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetch(`${BASE}/v1/drafts/case/${caseId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setDrafts(d.data || [])).finally(() => setLoading(false));
  }, [caseId]);

  const s: Record<string, React.CSSProperties> = {
    card: { background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden' },
    row: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: '1px solid #f8fafc', cursor: 'pointer' },
    title: { fontSize: '14px', fontWeight: 600, color: '#022448', flex: 1 },
    type: { fontSize: '11px', color: '#64748b', marginTop: '2px' },
    empty: { padding: '40px', textAlign: 'center' as const, color: '#94a3b8', fontSize: '14px' },
    viewer: { background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', padding: '24px', whiteSpace: 'pre-wrap' as const, fontSize: '13px', lineHeight: 1.8, color: '#374151' },
  };

  if (selected) return (
    <div>
      <button onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#022448', marginBottom: '16px', fontFamily: 'Manrope, sans-serif' }}>
        <ChevronLeft size={14} /> Back to drafts
      </button>
      <div style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', fontWeight: 700, color: '#022448', marginBottom: '4px' }}>{selected.title}</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>{selected.doc_type?.replace(/_/g, ' ')} · {fmtDate(selected.updated_at)}</div>
      <div style={s.viewer}>
        {typeof selected.content === 'string' ? selected.content : selected.content?.text || JSON.stringify(selected.content, null, 2)}
      </div>
    </div>
  );

  return (
    <div style={s.card}>
      {loading ? <div style={s.empty}>Loading...</div> :
       drafts.length === 0 ? <div style={s.empty}>No drafts for this case.</div> :
       drafts.map((d: any, i: number) => (
        <div key={d.id} style={{ ...s.row, borderBottom: i < drafts.length - 1 ? '1px solid #f8fafc' : 'none' }} onClick={() => setSelected(d)}>
          <BookOpen size={16} color="#022448" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={s.title}>{d.title}</div>
            <div style={s.type}>{d.doc_type?.replace(/_/g, ' ')} · {fmtDate(d.updated_at)}</div>
          </div>
          <ChevronLeft size={14} color="#94a3b8" style={{ transform: 'rotate(180deg)' }} />
        </div>
       ))
      }
    </div>
  );
}

// ── Search Tab ────────────────────────────────────────────────
function SearchTab({ caseId, token }: { caseId: string; token: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/v1/search?q=${encodeURIComponent(query)}&case_id=${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResults(data.data || data);
    } catch { setResults(null); }
    setLoading(false);
  }

  const s: Record<string, React.CSSProperties> = {
    searchBox: { display: 'flex', gap: '8px', marginBottom: '16px' },
    input: { flex: 1, padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontFamily: 'Manrope, sans-serif', color: '#111827', outline: 'none' },
    btn: { padding: '11px 20px', background: '#022448', color: '#ffe088', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' },
    resultCard: { background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', padding: '16px 20px', marginBottom: '10px' },
    resultTitle: { fontSize: '14px', fontWeight: 600, color: '#022448', marginBottom: '6px' },
    snippet: { fontSize: '13px', color: '#374151', lineHeight: 1.6 },
  };

  return (
    <div>
      <div style={s.searchBox}>
        <input
          style={s.input}
          placeholder="Search documents, hearings, drafts..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button style={s.btn} onClick={handleSearch} disabled={loading}>
          {loading ? '...' : 'Search'}
        </button>
      </div>
      {results?.documents?.map((r: any) => (
        <div key={r.id} style={s.resultCard}>
          <div style={s.resultTitle}>📄 {r.filename}</div>
          {r.snippet && <div style={s.snippet}>{r.snippet}</div>}
        </div>
      ))}
      {results && !results.documents?.length && (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '32px', fontSize: '14px' }}>No results found.</div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PortalCaseDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [token, setToken] = useState('');
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [error, setError] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('portal_token');
    if (!t) { router.push('/portal/login'); return; }
    setToken(t);
    fetch(`${BASE}/v1/portal/cases/${id}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setCaseData(d.case);
      })
      .catch(() => setError('Failed to load case'))
      .finally(() => setLoading(false));
  }, [id]);

  const s: Record<string, React.CSSProperties> = {
    page: { padding: 'clamp(20px,4vw,40px)', fontFamily: 'Manrope, sans-serif' },
    back: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#022448', marginBottom: '20px', fontFamily: 'Manrope, sans-serif' },
    titleRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' as const },
    title: { fontFamily: 'Newsreader, serif', fontSize: '1.6rem', fontWeight: 700, color: '#022448', margin: 0 },
    caseNum: { fontSize: '13px', color: '#64748b', marginTop: '4px' },
    statusPill: (s: string): React.CSSProperties => ({
      ...(STATUS_COLORS[s?.toLowerCase()] || STATUS_COLORS.default),
      fontSize: '12px', fontWeight: 600, padding: '5px 14px', borderRadius: '20px', flexShrink: 0,
    }),
    tabs: { display: 'flex', gap: '4px', overflowX: 'auto' as const, marginBottom: '20px', paddingBottom: '2px' },
    tab: (active: boolean): React.CSSProperties => ({
      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px',
      border: 'none', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', whiteSpace: 'nowrap',
      fontSize: '13px', fontWeight: active ? 700 : 500,
      background: active ? '#022448' : '#fff',
      color: active ? '#ffe088' : '#374151',
      boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
    }),
  };

  if (loading) return (
    <div style={s.page}>
      <div style={{ color: '#64748b', fontSize: '14px' }}>Loading case...</div>
    </div>
  );

  if (error || !caseData) return (
    <div style={s.page}>
      <button style={s.back} onClick={() => router.push('/portal/cases')}><ChevronLeft size={14} /> Back to Cases</button>
      <div style={{ color: '#ba1a1a', fontSize: '14px' }}>{error || 'Case not found.'}</div>
    </div>
  );

  return (
    <div style={s.page}>
      <button style={s.back} onClick={() => router.push('/portal/cases')}><ChevronLeft size={14} /> Back to Cases</button>

      <div style={s.titleRow}>
        <div>
          <h1 style={s.title}>{caseData.title}</h1>
          {caseData.case_number && <div style={s.caseNum}>{caseData.case_number} · {caseData.court_name}</div>}
        </div>
        <span style={s.statusPill(caseData.status)}>{caseData.status}</span>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {PORTAL_TABS.map(({ key, Icon, label }) => (
          <button key={key} style={s.tab(tab === key)} onClick={() => setTab(key)}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview'  && <OverviewTab caseData={caseData} />}
      {tab === 'documents' && <DocumentsTab caseId={id} token={token} />}
      {tab === 'hearings'  && <HearingsTab hearings={caseData.hearings || []} />}
      {tab === 'tasks'     && <TasksTab tasks={caseData.tasks || []} />}
      {tab === 'drafts'    && <DraftsTab caseId={id} token={token} />}
      {tab === 'search'    && <SearchTab caseId={id} token={token} />}
    </div>
  );
}
