'use client'
// apps/web/src/app/cases/[id]/BulkUploadModal.tsx

import { useState, useRef, useCallback } from 'react'

// ── File type icon + colour ──────────────────────────────────
function fileIcon(mime: string, name: string): { emoji: string; bg: string; color: string } {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (mime === 'application/pdf' || ext === 'pdf')
    return { emoji: '📄', bg: '#fee2e2', color: '#b91c1c' }
  if (mime.startsWith('image/'))
    return { emoji: '🖼️', bg: '#fce7f3', color: '#be185d' }
  if (['doc', 'docx'].includes(ext) || mime.includes('word'))
    return { emoji: '📝', bg: '#dbeafe', color: '#1d4ed8' }
  if (['xls', 'xlsx'].includes(ext) || mime.includes('spreadsheet'))
    return { emoji: '📊', bg: '#dcfce7', color: '#15803d' }
  if (['ppt', 'pptx'].includes(ext) || mime.includes('presentation'))
    return { emoji: '📋', bg: '#fef3c7', color: '#d97706' }
  if (['mp4', 'mov', 'avi'].includes(ext) || mime.startsWith('video/'))
    return { emoji: '🎥', bg: '#f3e8ff', color: '#7c3aed' }
  if (['mp3', 'wav'].includes(ext) || mime.startsWith('audio/'))
    return { emoji: '🎵', bg: '#f0fdf4', color: '#16a34a' }
  if (['zip', 'rar', '7z'].includes(ext))
    return { emoji: '🗜️', bg: '#fef9c3', color: '#854d0e' }
  return { emoji: '📁', bg: '#f1f5f9', color: '#475569' }
}

const CATEGORIES = [
  'FIR', 'Chargesheet', 'Bail Application', 'Bail Order', 'Court Order',
  'Judgment', 'Petition', 'Written Statement', 'Affidavit', 'Vakalatnama',
  'Evidence', 'Witness Statement', 'Police Report', 'Medical Report',
  'Financial Document', 'Identity Document', 'Property Document',
  'Contract', 'Notice', 'Correspondence', 'Application', 'Other',
]

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

type Phase = 'select' | 'categorise' | 'uploading' | 'done'
type FileStatus = 'queued' | 'uploading' | 'done' | 'failed'
type ViewMode = 'list' | 'grid'

interface FileEntry {
  id: string
  file: File
  s3Key?: string
  uploadUrl?: string
  suggestedCategory?: string
  finalCategory: string
  status: FileStatus
  error?: string
}

interface Props {
  caseId: string
  token: string
  apiBase: string
  onClose: () => void
  onComplete: (count: number) => void
}

export default function BulkUploadModal({ caseId, token, apiBase, onClose, onComplete }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [phase, setPhase] = useState<Phase>('select')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [dragOver, setDragOver] = useState(false)
  const [presigning, setPresigning] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function addFiles(raw: File[]) {
    const valid = raw.filter(f => f.size <= 50 * 1024 * 1024)
    const entries: FileEntry[] = valid.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      finalCategory: 'Other',
      status: 'queued',
    }))
    setFiles(prev => [...prev, ...entries].slice(0, 50))
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  function setCategory(id: string, cat: string) {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, finalCategory: cat } : f))
  }

  async function handlePresign() {
    if (!files.length) return
    setPresigning(true)
    try {
      const res = await fetch(`${apiBase}/v1/bulk-upload/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          case_id: caseId,
          files: files.map(f => ({
            filename: f.file.name,
            mime_type: f.file.type || 'application/octet-stream',
            size_bytes: f.file.size,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      sessionStorage.setItem('bulk_job_id', data.job_id)
      setFiles(prev => prev.map((f, i) => ({
        ...f,
        s3Key: data.files[i].s3_key,
        uploadUrl: data.files[i].upload_url,
        suggestedCategory: data.files[i].suggested_category,
        finalCategory: data.files[i].suggested_category || 'Other',
      })))
      setPhase('categorise')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setPresigning(false)
    }
  }

  async function handleUpload() {
    setPhase('uploading')
    const jobId = sessionStorage.getItem('bulk_job_id')
    let done = 0

    const BATCH = 5
    for (let i = 0; i < files.length; i += BATCH) {
      const batch = files.slice(i, i + BATCH)
      await Promise.all(batch.map(async entry => {
        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'uploading' } : f))
        try {
          await fetch(entry.uploadUrl!, {
            method: 'PUT',
            body: entry.file,
            headers: { 'Content-Type': entry.file.type || 'application/octet-stream' },
          })
          setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'done' } : f))
          done++
          setUploadedCount(done)
        } catch (e: any) {
          setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'failed', error: e.message } : f))
        }
      }))
    }

    // Confirm with backend
    try {
      await fetch(`${apiBase}/v1/bulk-upload/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          job_id: jobId,
          files: files.map(f => ({
            filename: f.file.name,
            s3_key: f.s3Key!,
            mime_type: f.file.type || 'application/octet-stream',
            size_bytes: f.file.size,
            category: f.finalCategory,
          })),
        }),
      })
    } catch (e) {
      console.error('Confirm error:', e)
    }

    setPhase('done')
    onComplete(done)
  }

  const doneCount = files.filter(f => f.status === 'done').length
  const failCount = files.filter(f => f.status === 'failed').length
  const pct = files.length ? Math.round((uploadedCount / files.length) * 100) : 0

  const s: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed' as const, inset: 0, background: 'rgba(2,36,72,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px', fontFamily: 'Manrope, sans-serif',
    },
    modal: {
      background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '760px',
      maxHeight: '88vh', display: 'flex', flexDirection: 'column' as const,
      boxShadow: '0 24px 80px rgba(2,36,72,0.22)',
    },
    header: {
      padding: '22px 26px 18px', borderBottom: '1px solid #f1f5f9',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    title: { color: '#022448', fontFamily: 'Newsreader, serif', fontSize: '20px', fontWeight: '700' },
    titleSub: { color: '#64748b', fontSize: '13px', marginTop: '2px' },
    closeBtn: {
      background: '#f1f5f9', border: 'none', width: '32px', height: '32px',
      borderRadius: '8px', cursor: 'pointer', fontSize: '18px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    body: { flex: 1, overflowY: 'auto' as const, padding: '20px 26px' },
    dropzone: (over: boolean): React.CSSProperties => ({
      border: `2px dashed ${over ? '#022448' : '#d1d5db'}`,
      borderRadius: '14px', padding: '36px 24px',
      textAlign: 'center' as const, cursor: 'pointer',
      background: over ? '#f0f4ff' : '#fafafa',
      marginBottom: '16px', transition: 'all 0.15s',
    }),
    dropIcon: { fontSize: '40px', marginBottom: '10px' },
    dropTitle: { color: '#022448', fontWeight: '600', fontSize: '15px' },
    dropSub: { color: '#94a3b8', fontSize: '13px', marginTop: '4px' },
    toolbar: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: '12px',
    },
    count: {
      background: '#f0f4ff', color: '#022448', fontSize: '13px',
      fontWeight: '600', padding: '5px 12px', borderRadius: '8px',
    },
    viewToggle: { display: 'flex', gap: '4px' },
    viewBtn: (active: boolean): React.CSSProperties => ({
      padding: '5px 10px', border: 'none', borderRadius: '7px', cursor: 'pointer',
      background: active ? '#022448' : '#f1f5f9',
      color: active ? '#ffe088' : '#64748b', fontSize: '13px', fontWeight: '600',
      fontFamily: 'Manrope, sans-serif',
    }),
    // List view
    listRow: {
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '9px 12px', borderRadius: '10px', marginBottom: '5px',
      background: '#fafafa', border: '1px solid #f1f5f9',
    },
    iconBox: (mime: string, name: string): React.CSSProperties => ({
      width: '38px', height: '38px', borderRadius: '9px', flexShrink: 0,
      background: fileIcon(mime, name).bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: '18px',
    }),
    fileName: { flex: 1, fontSize: '13px', fontWeight: '500', color: '#111827', wordBreak: 'break-all' as const },
    fileSize: { fontSize: '12px', color: '#94a3b8', flexShrink: 0 },
    catSelect: {
      fontSize: '12px', padding: '4px 8px', border: '1.5px solid #e5e7eb',
      borderRadius: '8px', color: '#374151', background: '#fff',
      fontFamily: 'Manrope, sans-serif', maxWidth: '150px', cursor: 'pointer',
    },
    removeBtn: {
      background: 'none', border: 'none', color: '#94a3b8',
      cursor: 'pointer', fontSize: '16px', flexShrink: 0, padding: '0 4px',
    },
    aiTag: {
      fontSize: '10px', fontWeight: '600', background: '#ffe088', color: '#735c00',
      padding: '2px 7px', borderRadius: '20px', flexShrink: 0,
    },
    statusDot: (st: FileStatus): React.CSSProperties => ({
      width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
      background: st === 'done' ? '#15803d' : st === 'failed' ? '#ba1a1a' : st === 'uploading' ? '#022448' : '#d1d5db',
    }),
    // Grid view
    grid: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
      gap: '10px',
    },
    gridCard: {
      borderRadius: '12px', border: '1px solid #f1f5f9',
      background: '#fafafa', padding: '14px 10px', textAlign: 'center' as const,
      position: 'relative' as const,
    },
    gridIcon: { fontSize: '34px', marginBottom: '8px' },
    gridName: {
      fontSize: '11px', fontWeight: '500', color: '#111827',
      wordBreak: 'break-all' as const, marginBottom: '6px',
      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
    },
    gridSize: { fontSize: '11px', color: '#94a3b8', marginBottom: '6px' },
    gridRemove: {
      position: 'absolute' as const, top: '6px', right: '6px',
      background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%',
      width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b',
    },
    // Progress
    progressTrack: {
      height: '6px', background: '#f1f5f9', borderRadius: '3px',
      marginBottom: '14px', overflow: 'hidden',
    },
    progressBar: (p: number): React.CSSProperties => ({
      height: '6px', background: '#022448', borderRadius: '3px',
      width: `${p}%`, transition: 'width 0.3s',
    }),
    footer: {
      padding: '14px 26px', borderTop: '1px solid #f1f5f9',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
    },
    primaryBtn: (disabled = false): React.CSSProperties => ({
      background: disabled ? '#94a3b8' : '#022448', color: '#ffe088',
      border: 'none', padding: '11px 22px', borderRadius: '10px',
      fontSize: '14px', fontWeight: '700', cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'Manrope, sans-serif',
    }),
    secBtn: {
      background: '#f1f5f9', color: '#374151', border: 'none',
      padding: '11px 18px', borderRadius: '10px', fontSize: '14px',
      fontWeight: '600', cursor: 'pointer', fontFamily: 'Manrope, sans-serif',
    },
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.title}>Bulk Upload Documents</div>
            <div style={s.titleSub}>
              {phase === 'select' && 'Drag & drop or click to select. Up to 50 files, 50MB each.'}
              {phase === 'categorise' && 'Review AI-suggested categories before uploading.'}
              {phase === 'uploading' && `Uploading ${files.length} files...`}
              {phase === 'done' && `Done — ${doneCount} uploaded${failCount ? `, ${failCount} failed` : ''}.`}
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div style={s.body}>
          {/* SELECT phase */}
          {phase === 'select' && (
            <>
              <div
                style={s.dropzone(dragOver)}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)) }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={s.dropIcon}>📂</div>
                <div style={s.dropTitle}>Drop files here or click to browse</div>
                <div style={s.dropSub}>PDF, Word, Images, Video &middot; max 50MB each &middot; max 50 files</div>
              </div>
              <input
                ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
                onChange={e => e.target.files && addFiles(Array.from(e.target.files))}
              />

              {files.length > 0 && (
                <>
                  <div style={s.toolbar}>
                    <div style={s.count}>{files.length} file{files.length !== 1 ? 's' : ''} selected</div>
                    <div style={s.viewToggle}>
                      <button style={s.viewBtn(viewMode === 'list')} onClick={() => setViewMode('list')}>List</button>
                      <button style={s.viewBtn(viewMode === 'grid')} onClick={() => setViewMode('grid')}>Grid</button>
                    </div>
                  </div>

                  {viewMode === 'list' && files.map(f => {
                    const ic = fileIcon(f.file.type, f.file.name)
                    return (
                      <div key={f.id} style={s.listRow}>
                        <div style={s.iconBox(f.file.type, f.file.name)}>{ic.emoji}</div>
                        <div style={s.fileName}>{f.file.name}</div>
                        <div style={s.fileSize}>{fmtBytes(f.file.size)}</div>
                        <button style={s.removeBtn} onClick={() => removeFile(f.id)}>✕</button>
                      </div>
                    )
                  })}

                  {viewMode === 'grid' && (
                    <div style={s.grid}>
                      {files.map(f => {
                        const ic = fileIcon(f.file.type, f.file.name)
                        return (
                          <div key={f.id} style={s.gridCard}>
                            <button style={s.gridRemove} onClick={() => removeFile(f.id)}>✕</button>
                            <div style={s.gridIcon}>{ic.emoji}</div>
                            <div style={s.gridName}>{f.file.name}</div>
                            <div style={s.gridSize}>{fmtBytes(f.file.size)}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* CATEGORISE phase */}
          {phase === 'categorise' && (
            <>
              <div style={s.toolbar}>
                <div style={s.count}>{files.length} files — review categories</div>
                <div style={s.viewToggle}>
                  <button style={s.viewBtn(viewMode === 'list')} onClick={() => setViewMode('list')}>List</button>
                  <button style={s.viewBtn(viewMode === 'grid')} onClick={() => setViewMode('grid')}>Grid</button>
                </div>
              </div>

              {viewMode === 'list' && files.map(f => {
                const ic = fileIcon(f.file.type, f.file.name)
                return (
                  <div key={f.id} style={s.listRow}>
                    <div style={s.iconBox(f.file.type, f.file.name)}>{ic.emoji}</div>
                    <div style={{ ...s.fileName, minWidth: 0 }}>
                      <div>{f.file.name}</div>
                      <div style={s.fileSize}>{fmtBytes(f.file.size)}</div>
                    </div>
                    {f.suggestedCategory && <div style={s.aiTag}>AI</div>}
                    <select
                      style={s.catSelect}
                      value={f.finalCategory}
                      onChange={e => setCategory(f.id, e.target.value)}
                    >
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                )
              })}

              {viewMode === 'grid' && (
                <div style={s.grid}>
                  {files.map(f => {
                    const ic = fileIcon(f.file.type, f.file.name)
                    return (
                      <div key={f.id} style={s.gridCard}>
                        {f.suggestedCategory && (
                          <div style={{ ...s.aiTag, position: 'absolute' as const, top: '6px', left: '6px' }}>AI</div>
                        )}
                        <div style={s.gridIcon}>{ic.emoji}</div>
                        <div style={s.gridName}>{f.file.name}</div>
                        <select
                          style={{ ...s.catSelect, width: '100%', maxWidth: '100%', marginTop: '4px' }}
                          value={f.finalCategory}
                          onChange={e => setCategory(f.id, e.target.value)}
                        >
                          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* UPLOADING phase */}
          {phase === 'uploading' && (
            <>
              <div style={s.progressTrack}>
                <div style={s.progressBar(pct)} />
              </div>
              <div style={{ color: '#022448', fontWeight: '600', fontSize: '14px', marginBottom: '14px' }}>
                {pct}% &mdash; {uploadedCount} of {files.length} uploaded
              </div>
              {files.map(f => {
                const ic = fileIcon(f.file.type, f.file.name)
                return (
                  <div key={f.id} style={s.listRow}>
                    <div style={s.iconBox(f.file.type, f.file.name)}>{ic.emoji}</div>
                    <div style={s.fileName}>{f.file.name}</div>
                    <div style={s.statusDot(f.status)} />
                    <div style={{ fontSize: '12px', color: '#94a3b8', flexShrink: 0 }}>
                      {f.status === 'done' ? '✓' : f.status === 'failed' ? '✗' : f.status === 'uploading' ? '...' : '—'}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* DONE phase */}
          {phase === 'done' && (
            <div style={{ textAlign: 'center' as const, padding: '32px 0' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>{failCount > 0 ? '⚠️' : '✅'}</div>
              <div style={{ color: '#022448', fontFamily: 'Newsreader, serif', fontWeight: '700', fontSize: '22px', marginBottom: '8px' }}>
                {failCount > 0 ? `${doneCount} uploaded, ${failCount} failed` : 'All files uploaded!'}
              </div>
              <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                Refresh the Documents tab to see your new files.
              </div>
              <button style={s.primaryBtn(false)} onClick={onClose}>Close</button>
            </div>
          )}
        </div>

        {/* Footer */}
        {(phase === 'select' || phase === 'categorise') && (
          <div style={s.footer}>
            <div style={{ color: '#64748b', fontSize: '13px' }}>
              {files.length} / 50 files selected
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {phase === 'categorise' && (
                <button style={s.secBtn} onClick={() => setPhase('select')}>Back</button>
              )}
              <button
                style={s.primaryBtn(!files.length || presigning)}
                disabled={!files.length || presigning}
                onClick={phase === 'select' ? handlePresign : handleUpload}
              >
                {phase === 'select'
                  ? presigning ? 'Analysing...' : `Categorise ${files.length} file${files.length !== 1 ? 's' : ''}`
                  : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
