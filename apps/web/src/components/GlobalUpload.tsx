'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, FolderOpen, Check, AlertCircle, Image, FileText, File, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuth';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FileItem { file: File; id: string; progress: number; status: 'pending'|'uploading'|'done'|'error'; error?: string; }

function uid() { return Math.random().toString(36).slice(2,10); }
function fmtBytes(b: number) { return b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB'; }
function FileIcon({ mime }: { mime: string }) {
  if (mime?.startsWith('image/')) return <Image size={16} color="#5b21b6" />;
  if (mime === 'application/pdf') return <FileText size={16} color="#ba1a1a" />;
  return <File size={16} color="#74777f" />;
}

export default function GlobalUpload() {
  const { token } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [caseId, setCaseId] = useState('');
  const [caseSearch, setCaseSearch] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load cases when modal opens
  useEffect(() => {
    if (!open || !token) return;
    fetch(`${BASE}/v1/cases`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d.data) ? d.data
          : Array.isArray(d.data?.cases) ? d.data.cases
          : Array.isArray(d.cases) ? d.cases : [];
        setCases(list);
      })
      .catch(console.error);
  }, [open, token]);

  const addFiles = useCallback((incoming: File[]) => {
    const valid = incoming.filter(f => f.size <= 50 * 1024 * 1024);
    setFiles(prev => [...prev, ...valid.map(f => ({ file: f, id: uid(), progress: 0, status: 'pending' as const }))]);
  }, []);

  const uploadAll = useCallback(async () => {
    if (!caseId || !token) return;
    const pending = files.filter(f => f.status !== 'done');
    if (!pending.length) return;
    setUploading(true);

    for (const item of pending) {
      setFiles(p => p.map(f => f.id === item.id ? { ...f, status: 'uploading', progress: 10 } : f));
      try {
        // Step 1: Get presigned URL
        const r1 = await fetch(`${BASE}/v1/documents/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            filename: item.file.name,
            mime_type: item.file.type || 'application/octet-stream',
            case_id: caseId,
            file_size_bytes: item.file.size,
          }),
        });
        if (!r1.ok) {
          const e = await r1.json().catch(() => ({}));
          throw new Error(e.error?.message || e.message || `Presign failed: ${r1.status}`);
        }
        const { data: presign } = await r1.json();
        setFiles(p => p.map(f => f.id === item.id ? { ...f, progress: 40 } : f));

        // Step 2: PUT directly to S3
        const r2 = await fetch(presign.presigned_url, {
          method: 'PUT',
          body: item.file,
          headers: { 'Content-Type': item.file.type || 'application/octet-stream' },
        });
        if (!r2.ok) throw new Error(`S3 upload failed: ${r2.status}`);
        setFiles(p => p.map(f => f.id === item.id ? { ...f, progress: 80 } : f));

        // Step 3: Register document in DB
        const r3 = await fetch(`${BASE}/v1/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            case_id: caseId,
            filename: item.file.name,
            s3_key: presign.s3_key,
            mime_type: item.file.type || 'application/octet-stream',
            file_size_bytes: item.file.size,
          }),
        });
        if (!r3.ok) {
          const e = await r3.json().catch(() => ({}));
          throw new Error(e.error?.message || e.message || `Register failed: ${r3.status}`);
        }
        setFiles(p => p.map(f => f.id === item.id ? { ...f, status: 'done', progress: 100 } : f));
      } catch (err: any) {
        setFiles(p => p.map(f => f.id === item.id ? { ...f, status: 'error', error: err.message } : f));
      }
    }
    setUploading(false);
  }, [caseId, files, token]);

  function reset() {
    setFiles([]); setCaseId(''); setCaseSearch('');
    setShowDrop(false); setOpen(false);
  }

  const filtered = cases.filter(c =>
    !caseSearch ||
    (c.title || '').toLowerCase().includes(caseSearch.toLowerCase()) ||
    (c.cnr_number || '').toLowerCase().includes(caseSearch.toLowerCase())
  );
  const selectedCase = cases.find(c => c.id === caseId);
  const allDone = files.length > 0 && files.every(f => f.status === 'done');
  const pendingCount = files.filter(f => f.status !== 'done').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 11px',
        borderRadius: '8px', background: '#022448', color: '#fff', border: 'none',
        cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'Manrope, sans-serif',
      }}>
        <Upload size={13} /> Import
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }} onClick={e => { if (e.target === e.currentTarget) reset(); }}>
          <div style={{
            background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '540px',
            maxHeight: '88vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:'1px solid rgba(196,198,207,0.2)', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#022448', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Upload size={16} color="#fff" />
                </div>
                <div>
                  <h2 style={{ fontFamily:'Newsreader, serif', fontWeight:700, fontSize:'1.15rem', color:'#022448', margin:0 }}>Import Documents</h2>
                  <p style={{ fontSize:'12px', color:'#74777f', margin:0 }}>Upload files to a case from any source</p>
                </div>
              </div>
              <button onClick={reset} style={{ background:'none', border:'none', cursor:'pointer', padding:'6px', borderRadius:'8px' }}>
                <X size={18} color="#74777f" />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

              {/* Step 1: Case selector */}
              <div style={{ marginBottom:'18px' }}>
                <p style={{ fontSize:'11px', fontWeight:800, color:'#74777f', letterSpacing:'0.08em', textTransform:'uppercase', margin:'0 0 8px' }}>1. Select Case *</p>
                <div style={{ position:'relative' }}>
                  <button onClick={() => setShowDrop(s => !s)} style={{
                    width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'11px 14px', border:`1.5px solid ${caseId ? '#022448' : 'rgba(196,198,207,0.4)'}`,
                    borderRadius:'10px', background:'#fff', cursor:'pointer', fontSize:'13px',
                    fontFamily:'Manrope, sans-serif', color: caseId ? '#022448' : '#74777f', textAlign:'left',
                  }}>
                    <span style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <FolderOpen size={14} color={caseId ? '#022448' : '#74777f'} />
                      {selectedCase ? selectedCase.title : 'Choose a case...'}
                    </span>
                    <ChevronDown size={14} color="#74777f" style={{ transform: showDrop ? 'rotate(180deg)' : 'none', transition:'0.15s', flexShrink:0 }} />
                  </button>
                  {showDrop && (
                    <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#fff', border:'1px solid rgba(196,198,207,0.3)', borderRadius:'10px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:10, maxHeight:'200px', display:'flex', flexDirection:'column', overflow:'hidden' }}>
                      <div style={{ padding:'8px' }}>
                        <input autoFocus value={caseSearch} onChange={e => setCaseSearch(e.target.value)}
                          placeholder="Search by name or CNR..."
                          style={{ width:'100%', padding:'7px 10px', border:'1px solid rgba(196,198,207,0.3)', borderRadius:'7px', fontSize:'12px', outline:'none', boxSizing:'border-box', fontFamily:'Manrope, sans-serif' }} />
                      </div>
                      <div style={{ overflowY:'auto', flex:1 }}>
                        {filtered.length === 0
                          ? <p style={{ padding:'14px', textAlign:'center', color:'#74777f', fontSize:'13px' }}>No cases found</p>
                          : filtered.map(c => (
                            <button key={c.id} onClick={() => { setCaseId(c.id); setShowDrop(false); setCaseSearch(''); }}
                              style={{ width:'100%', padding:'10px 14px', border:'none', background: caseId===c.id ? '#f0f4ff' : 'transparent', cursor:'pointer', textAlign:'left', fontFamily:'Manrope, sans-serif' }}>
                              <p style={{ fontSize:'13px', fontWeight:600, color:'#022448', margin:'0 0 2px' }}>{c.title}</p>
                              {c.cnr_number && <p style={{ fontSize:'11px', color:'#74777f', margin:0, fontFamily:'monospace' }}>{c.cnr_number}</p>}
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Drop zone */}
              <div style={{ marginBottom:'16px' }}>
                <p style={{ fontSize:'11px', fontWeight:800, color:'#74777f', letterSpacing:'0.08em', textTransform:'uppercase', margin:'0 0 8px' }}>2. Choose Files</p>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)); }}
                  onClick={() => inputRef.current?.click()}
                  style={{ border:'2px dashed rgba(196,198,207,0.5)', borderRadius:'14px', padding:'28px 20px', textAlign:'center', cursor:'pointer', background:'#fafafa' }}>
                  <Upload size={28} color="#c4c6cf" style={{ marginBottom:'10px' }} />
                  <p style={{ fontWeight:700, fontSize:'14px', color:'#022448', margin:'0 0 4px' }}>Drop files here or click to browse</p>
                  <p style={{ fontSize:'12px', color:'#74777f', margin:'0 0 6px' }}>Desktop · Downloads · Photos · Google Drive · iCloud</p>
                  <p style={{ fontSize:'11px', color:'#c4c6cf', margin:0 }}>PDF · DOCX · JPG · PNG · XLSX · MP4 — max 50MB each</p>
                </div>
                <input ref={inputRef} type="file" multiple style={{ display:'none' }}
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp,.xlsx,.xls,.pptx,.ppt,.txt,.csv,.mp4,.mp3"
                  onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div style={{ background:'#f4f5f7', borderRadius:'12px', overflow:'hidden' }}>
                  {files.map((item, i) => (
                    <div key={item.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', borderBottom: i<files.length-1 ? '1px solid rgba(196,198,207,0.15)' : 'none' }}>
                      <FileIcon mime={item.file.type} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:'12px', fontWeight:600, color:'#191c1e', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.file.name}</p>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ fontSize:'11px', color:'#74777f' }}>{fmtBytes(item.file.size)}</span>
                          {item.status === 'uploading' && (
                            <div style={{ flex:1, background:'#dce4ff', borderRadius:'3px', height:'3px', overflow:'hidden' }}>
                              <div style={{ width:`${item.progress}%`, background:'#022448', height:'100%', transition:'width 0.3s' }} />
                            </div>
                          )}
                          {item.status === 'error' && <span style={{ fontSize:'10px', color:'#ba1a1a' }}>{item.error}</span>}
                        </div>
                      </div>
                      <div style={{ flexShrink:0, display:'flex', alignItems:'center' }}>
                        {item.status === 'done' && <Check size={16} color="#15803d" />}
                        {item.status === 'error' && <AlertCircle size={16} color="#ba1a1a" />}
                        {item.status === 'uploading' && <div style={{ width:'14px', height:'14px', border:'2px solid #022448', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />}
                        {item.status === 'pending' && (
                          <button onClick={() => setFiles(p => p.filter(f => f.id !== item.id))}
                            style={{ background:'none', border:'none', cursor:'pointer', color:'#74777f', padding:'2px' }}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Result banners */}
              {allDone && (
                <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'#dcfce7', border:'1px solid #86efac', borderRadius:'10px', padding:'12px 16px', marginTop:'14px' }}>
                  <Check size={16} color="#15803d" />
                  <p style={{ fontSize:'13px', fontWeight:600, color:'15803d', margin:0 }}>
                    {files.filter(f=>f.status==='done').length} file(s) uploaded to <strong>{selectedCase?.title}</strong> successfully!
                  </p>
                </div>
              )}
              {errorCount > 0 && !uploading && (
                <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'#ffdad6', border:'1px solid #ffb4ab', borderRadius:'10px', padding:'12px 16px', marginTop:'14px' }}>
                  <AlertCircle size={16} color="#ba1a1a" />
                  <p style={{ fontSize:'13px', fontWeight:600, color:'#ba1a1a', margin:0 }}>
                    {errorCount} file(s) failed — click Upload again to retry
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display:'flex', gap:'10px', padding:'16px 24px', borderTop:'1px solid rgba(196,198,207,0.2)', flexShrink:0 }}>
              <button onClick={reset} style={{ padding:'10px 18px', background:'#edeef0', color:'#43474e', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'Manrope, sans-serif' }}>
                {allDone ? 'Close' : 'Cancel'}
              </button>
              {!allDone && (
                <button onClick={uploadAll} disabled={uploading || !caseId || pendingCount === 0}
                  style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'7px',
                    padding:'10px 18px', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:700,
                    fontFamily:'Manrope, sans-serif', cursor: (!caseId || pendingCount===0 || uploading) ? 'not-allowed' : 'pointer',
                    background: (!caseId || pendingCount===0) ? '#c4c6cf' : '#022448', color:'#fff',
                  }}>
                  <Upload size={14} />
                  {uploading
                    ? `Uploading ${files.filter(f=>f.status==='uploading').length} / ${files.length}...`
                    : `Upload ${pendingCount} file${pendingCount!==1?'s':''} to case`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
