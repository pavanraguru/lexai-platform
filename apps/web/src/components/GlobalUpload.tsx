'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, FolderOpen, Check, AlertCircle, Image, FileText, File, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuth';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FileWithProgress { file: File; id: string; progress: number; status: 'pending' | 'uploading' | 'done' | 'error'; error?: string; }
function uid() { return Math.random().toString(36).slice(2, 10); }
function formatBytes(b: number) {
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function fileIcon(mime: string) {
  if (mime?.startsWith('image/')) return <Image size={16} color="#5b21b6" />;
  if (mime === 'application/pdf') return <FileText size={16} color="#ba1a1a" />;
  return <File size={16} color="#74777f" />;
}

export default function GlobalUpload() {
  const { token } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState('');
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [caseSearch, setCaseSearch] = useState('');
  const [showCaseDrop, setShowCaseDrop] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Load cases when modal opens
  useEffect(() => {
    if (!open || !token) return;
    fetch(`${BASE}/v1/cases?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setCases(d.data || [])).catch(() => {});
  }, [open, token]);

  const filteredCases = cases.filter(c =>
    !caseSearch || c.title?.toLowerCase().includes(caseSearch.toLowerCase()) ||
    c.cnr_number?.toLowerCase().includes(caseSearch.toLowerCase())
  );

  const addFiles = useCallback((incoming: File[]) => {
    const valid = incoming.filter(f => f.size <= 50 * 1024 * 1024);
    setFiles(prev => [...prev, ...valid.map(f => ({ file: f, id: uid(), progress: 0, status: 'pending' as const }))]);
    setDone(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const uploadAll = useCallback(async () => {
    if (!selectedCase || !files.length) return;
    setUploading(true);
    setDone(false);

    for (const item of files) {
      if (item.status === 'done') continue;
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading', progress: 5 } : f));
      try {
        // 1. Presign
        const pr = await fetch(`${BASE}/v1/documents/presign`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ filename: item.file.name, mime_type: item.file.type || 'application/octet-stream', case_id: selectedCase, file_size_bytes: item.file.size }),
        });
        if (!pr.ok) throw new Error('Presign failed');
        const { data: presign } = await pr.json();
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 35 } : f));

        // 2. Upload to S3
        const up = await fetch(presign.presigned_url, {
          method: 'PUT', body: item.file, headers: { 'Content-Type': item.file.type || 'application/octet-stream' },
        });
        if (!up.ok) throw new Error('S3 upload failed');
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 80 } : f));

        // 3. Register
        const rg = await fetch(`${BASE}/v1/documents`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ case_id: selectedCase, filename: item.file.name, s3_key: presign.s3_key, mime_type: item.file.type || 'application/octet-stream', file_size_bytes: item.file.size }),
        });
        if (!rg.ok) throw new Error('Registration failed');
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done', progress: 100 } : f));
      } catch (err: any) {
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: err.message } : f));
      }
    }
    setUploading(false);
    setDone(true);
  }, [selectedCase, files, token]);

  function reset() { setFiles([]); setSelectedCase(''); setCaseSearch(''); setDone(false); setOpen(false); }

  const selectedCaseObj = cases.find(c => c.id === selectedCase);
  const allDone = files.length > 0 && files.every(f => f.status === 'done');
  const hasPending = files.some(f => f.status === 'pending' || f.status === 'error');

  return (
    <>
      {/* Trigger button — sits in topbar via AppShell */}
      <button
        onClick={() => setOpen(true)}
        title="Import Documents"
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '5px 11px', borderRadius: '8px',
          background: '#022448', color: '#fff', border: 'none',
          cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'Manrope, sans-serif',
        }}>
        <Upload size={13} /> Import
      </button>

      {/* Modal */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '560px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', margin: 'auto', position: 'relative' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(196,198,207,0.2)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#022448', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={16} color="#fff" />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: 0 }}>Import Documents</h2>
                  <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>Upload to a case from any device or drive</p>
                </div>
              </div>
              <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '6px' }}>
                <X size={18} color="#74777f" />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              
              {/* Step 1: Select Case */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  1. Select Case *
                </label>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowCaseDrop(s => !s)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '11px 14px', border: `1.5px solid ${selectedCase ? '#022448' : 'rgba(196,198,207,0.4)'}`,
                      borderRadius: '10px', background: '#fff', cursor: 'pointer', fontSize: '13px',
                      fontFamily: 'Manrope, sans-serif', color: selectedCase ? '#022448' : '#74777f',
                    }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FolderOpen size={14} color={selectedCase ? '#022448' : '#74777f'} />
                      {selectedCaseObj ? selectedCaseObj.title : 'Choose a case...'}
                    </span>
                    <ChevronDown size={14} color="#74777f" style={{ transform: showCaseDrop ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
                  </button>
                  {showCaseDrop && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid rgba(196,198,207,0.3)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: '220px', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginTop: '4px' }}>
                      <div style={{ padding: '10px', borderBottom: '1px solid rgba(196,198,207,0.15)' }}>
                        <input autoFocus value={caseSearch} onChange={e => setCaseSearch(e.target.value)}
                          placeholder="Search cases..."
                          style={{ width: '100%', padding: '7px 10px', border: '1px solid rgba(196,198,207,0.3)', borderRadius: '7px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', fontFamily: 'Manrope, sans-serif' }} />
                      </div>
                      <div style={{ overflowY: 'auto', flex: 1 }}>
                        {filteredCases.length === 0
                          ? <p style={{ padding: '16px', textAlign: 'center', color: '#74777f', fontSize: '13px' }}>No cases found</p>
                          : filteredCases.map(c => (
                            <button key={c.id}
                              onClick={() => { setSelectedCase(c.id); setShowCaseDrop(false); setCaseSearch(''); }}
                              style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '10px 14px', border: 'none', background: selectedCase === c.id ? '#f0f4ff' : 'transparent', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', textAlign: 'left' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#022448' }}>{c.title}</span>
                              {c.cnr_number && <span style={{ fontSize: '11px', color: '#74777f', fontFamily: 'monospace' }}>{c.cnr_number}</span>}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Drop zone */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  2. Choose Files
                </label>
                <div ref={dropRef}
                  onDragOver={e => e.preventDefault()} onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: '2px dashed rgba(196,198,207,0.5)', borderRadius: '14px', padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: '#fafafa', transition: '0.15s' }}>
                  <Upload size={28} color="#c4c6cf" style={{ marginBottom: '10px' }} />
                  <p style={{ fontWeight: 700, fontSize: '14px', color: '#022448', margin: '0 0 4px' }}>Drop files here or click to browse</p>
                  <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>From Desktop, Downloads, Photos, Google Drive, iCloud</p>
                  <p style={{ fontSize: '11px', color: '#c4c6cf', margin: '8px 0 0' }}>PDF • DOCX • JPG • PNG • GIF • TIFF • XLSX • MP4 — up to 50MB each</p>
                </div>
                <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp,.xlsx,.xls,.pptx,.ppt,.txt,.csv,.mp4,.mp3,.m4a,.wav"
                  onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div style={{ background: '#f4f5f7', borderRadius: '12px', overflow: 'hidden' }}>
                  {files.map((item, i) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: i < files.length - 1 ? '1px solid rgba(196,198,207,0.15)' : 'none' }}>
                      <div style={{ flexShrink: 0 }}>{fileIcon(item.file.type)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#191c1e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                          <span style={{ fontSize: '11px', color: '#74777f' }}>{formatBytes(item.file.size)}</span>
                          {item.status === 'uploading' && (
                            <div style={{ flex: 1, background: '#dce4ff', borderRadius: '3px', height: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${item.progress}%`, background: '#022448', height: '100%', transition: 'width 0.3s' }} />
                            </div>
                          )}
                          {item.status === 'error' && <span style={{ fontSize: '10px', color: '#ba1a1a' }}>{item.error}</span>}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {item.status === 'done' && <Check size={16} color="#15803d" />}
                        {item.status === 'error' && <AlertCircle size={16} color="#ba1a1a" />}
                        {item.status === 'pending' && (
                          <button onClick={() => setFiles(prev => prev.filter(f => f.id !== item.id))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#74777f', padding: '2px' }}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {allDone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '10px', padding: '12px 16px', marginTop: '14px' }}>
                  <Check size={16} color="#15803d" />
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#15803d', margin: 0 }}>All {files.length} file{files.length !== 1 ? 's' : ''} uploaded successfully!</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: '10px', padding: '16px 24px', borderTop: '1px solid rgba(196,198,207,0.2)', flexShrink: 0 }}>
              <button onClick={reset}
                style={{ padding: '10px 18px', background: '#edeef0', color: '#43474e', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                {allDone ? 'Close' : 'Cancel'}
              </button>
              {!allDone && (
                <button
                  onClick={uploadAll}
                  disabled={uploading || !selectedCase || !hasPending}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                    padding: '10px 18px', background: !selectedCase || !hasPending ? '#c4c6cf' : '#022448',
                    color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                    cursor: !selectedCase || !hasPending || uploading ? 'not-allowed' : 'pointer', fontFamily: 'Manrope, sans-serif',
                  }}>
                  <Upload size={14} />
                  {uploading ? `Uploading ${files.filter(f => f.status === 'uploading').length}/${files.length}...` 
                    : `Upload ${files.filter(f => f.status !== 'done').length} file${files.filter(f => f.status !== 'done').length !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
