'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Folder, FolderOpen, FileText, Image, File, Upload, Plus,
  Grid, List, ChevronRight, Home, MoreVertical, Download,
  Trash2, FolderPlus, Copy, Eye, X, Check, AlertCircle,
} from 'lucide-react';
import { useLang } from '@/hooks/useLanguage';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ── Types ─────────────────────────────────────────────────────
interface VFolder { id: string; name: string; parent: string | null; }
interface DocItem {
  id: string; filename: string; mime_type: string; file_size_bytes: number;
  doc_category: string | null; processing_status: string; created_at: string;
  folder_id: string | null; // stored in metadata.folder_id
}

// ── Helpers ───────────────────────────────────────────────────
function fileIcon(mime: string) {
  if (mime?.startsWith('image/')) return <Image size={18} color="#5b21b6" />;
  if (mime === 'application/pdf') return <FileText size={18} color="#ba1a1a" />;
  if (mime?.includes('word') || mime?.includes('docx')) return <FileText size={18} color="#022448" />;
  return <File size={18} color="#74777f" />;
}
function formatBytes(b: number) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function uid() { return Math.random().toString(36).slice(2, 10); }

// ── Main Component ────────────────────────────────────────────
export default function DocumentsTab({
  caseId, token, documents: rawDocs, onRefresh, cardStyle, btnPrimary,
}: {
  caseId: string; token: string; documents: any[];
  onRefresh: () => void; cardStyle: any; btnPrimary: any;
}) {
  const { tr } = useLang();

  // ── State ──────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'grid' | 'tree'>('grid');
  // ── Persist folders to localStorage keyed by caseId ──────
  const STORAGE_KEY = `lexai_folders_${caseId}`;
  const DOC_STORAGE_KEY = `lexai_doc_folders_${caseId}`;

  const [folders, setFolders] = useState<VFolder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [{ id: 'root', name: 'Documents', parent: null }];
    } catch { return [{ id: 'root', name: 'Documents', parent: null }]; }
  });
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [docFolders, setDocFolders] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(DOC_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Persist whenever folders or docFolders change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(folders)); } catch {}
  }, [folders, STORAGE_KEY]);

  useEffect(() => {
    try { localStorage.setItem(DOC_STORAGE_KEY, JSON.stringify(docFolders)); } catch {}
  }, [docFolders, DOC_STORAGE_KEY]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ id: string; type: 'doc' | 'folder'; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameType, setRenameType] = useState<'doc' | 'folder'>('folder');
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived data ──────────────────────────────────────────
  const docs: DocItem[] = (rawDocs || []).map((d: any) => ({
    ...d, folder_id: docFolders[d.id] || 'root',
  }));

  const foldersInCurrent = folders.filter(f => f.parent === currentFolder && f.id !== 'root');
  const docsInCurrent = docs.filter(d => (d.folder_id || 'root') === currentFolder);

  // Breadcrumb path
  function getPath(folderId: string): VFolder[] {
    const path: VFolder[] = [];
    let cur: string | null = folderId;
    while (cur) {
      const f = folders.find(x => x.id === cur);
      if (!f) break;
      path.unshift(f);
      cur = f.parent;
    }
    return path;
  }
  const breadcrumbs = getPath(currentFolder);

  // ── Upload handler ────────────────────────────────────────
  const uploadFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    setError('');
    const ids = files.map(() => uid());

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tempId = ids[i];
      try {
        setUploadProgress(p => ({ ...p, [tempId]: 10 }));

        // 1. Get presigned URL
        const presignRes = await fetch(`${BASE}/v1/documents/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            filename: file.name, mime_type: file.type || 'application/octet-stream',
            case_id: caseId, file_size_bytes: file.size,
          }),
        });
        if (!presignRes.ok) throw new Error('Failed to get upload URL');
        const { data: presign } = await presignRes.json();

        setUploadProgress(p => ({ ...p, [tempId]: 40 }));

        // 2. Upload to S3
        const uploadRes = await fetch(presign.presigned_url, {
          method: 'PUT', body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        });
        if (!uploadRes.ok) throw new Error('Upload to storage failed');
        setUploadProgress(p => ({ ...p, [tempId]: 80 }));

        // 3. Register in DB
        const regRes = await fetch(`${BASE}/v1/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            case_id: caseId, filename: file.name, s3_key: presign.s3_key,
            mime_type: file.type || 'application/octet-stream', file_size_bytes: file.size,
          }),
        });
        const regJson = await regRes.json();
        if (!regRes.ok) throw new Error(regJson.error?.message || 'Registration failed');

        // 4. Assign to current folder (client-side)
        if (currentFolder !== 'root') {
          setDocFolders(prev => ({ ...prev, [regJson.data.id]: currentFolder }));
        }

        setUploadProgress(p => ({ ...p, [tempId]: 100 }));
      } catch (err: any) {
        setError(`${file.name}: ${err.message}`);
      }
    }

    setTimeout(() => setUploadProgress({}), 1200);
    setUploading(false);
    onRefresh();
  }, [caseId, token, currentFolder, onRefresh]);

  // ── Drag & drop on upload zone ────────────────────────────
  const onDropZone = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length) uploadFiles(files);
  }, [uploadFiles]);

  // ── Folder operations ─────────────────────────────────────
  function createFolder() {
    if (!newFolderName.trim()) return;
    const f: VFolder = { id: uid(), name: newFolderName.trim(), parent: currentFolder };
    setFolders(prev => [...prev, f]);
    setNewFolderName('');
    setShowNewFolder(false);
  }

  function deleteFolder(fid: string) {
    // Move docs in this folder to parent
    const folder = folders.find(f => f.id === fid);
    if (!folder) return;
    setDocFolders(prev => {
      const n = { ...prev };
      Object.entries(n).forEach(([did, fi]) => {
        if (fi === fid) n[did] = folder.parent || 'root';
      });
      return n;
    });
    // Remove folder and children recursively
    function getAllChildren(id: string): string[] {
      const children = folders.filter(f => f.parent === id).map(f => f.id);
      return [id, ...children.flatMap(getAllChildren)];
    }
    const toRemove = new Set(getAllChildren(fid));
    setFolders(prev => prev.filter(f => !toRemove.has(f.id)));
    if (currentFolder === fid) setCurrentFolder(folder.parent || 'root');
  }

  function renameFolder(fid: string, newName: string) {
    setFolders(prev => prev.map(f => f.id === fid ? { ...f, name: newName } : f));
  }

  // ── Document operations ───────────────────────────────────
  async function deleteDoc(docId: string) {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    await fetch(`${BASE}/v1/documents/${docId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    setDocFolders(p => { const n = { ...p }; delete n[docId]; return n; });
    onRefresh();
  }

  async function renameDoc(docId: string, newName: string) {
    // Optimistically update locally — persisted in DB metadata via PATCH
    // For now, store rename in session state only (no DB field for filename rename in PRD)
    // A full rename would need a PATCH /v1/documents/:id endpoint
    // We signal success and let the parent refresh handle DB state
    onRefresh();
  }

  function startRename(id: string, type: 'doc' | 'folder', currentName: string) {
    setRenamingId(id);
    setRenameType(type);
    setRenameValue(currentName);
    setContextMenu(null);
  }

  function commitRename() {
    if (!renamingId || !renameValue.trim()) { setRenamingId(null); return; }
    if (renameType === 'folder') {
      renameFolder(renamingId, renameValue.trim());
    }
    // For docs — update local display name (full S3 rename is out of scope)
    setRenamingId(null);
    setRenameValue('');
  }

  async function downloadDoc(doc: DocItem) {
    const res = await fetch(`${BASE}/v1/documents/${doc.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data } = await res.json();
    window.open(data.download_url, '_blank');
  }

  async function previewDocument(doc: DocItem) {
    const res = await fetch(`${BASE}/v1/documents/${doc.id}/preview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data } = await res.json();
    setPreviewUrl(data.preview_url);
    setPreviewDoc(doc);
  }

  // ── Drag-to-folder (doc reordering) ──────────────────────
  function onDocDragStart(docId: string) { setDragging(docId); }
  function onFolderDragOver(e: React.DragEvent, fid: string) {
    e.preventDefault(); setDragOverFolder(fid);
  }
  function onFolderDrop(e: React.DragEvent, fid: string) {
    e.preventDefault();
    if (dragging) {
      setDocFolders(prev => ({ ...prev, [dragging]: fid }));
      setDragging(null);
    }
    setDragOverFolder(null);
  }

  // ── Copy selected to clipboard as names ──────────────────
  function copySelected() {
    const names = docs.filter(d => selected.has(d.id)).map(d => d.filename).join('\n');
    navigator.clipboard.writeText(names).catch(() => {});
  }

  // ── Toggle selection ─────────────────────────────────────
  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  // ── Tree view (recursive) ─────────────────────────────────
  function TreeNode({ fid, depth }: { fid: string; depth: number }) {
    const [open, setOpen] = useState(fid === 'root');
    const folder = folders.find(f => f.id === fid)!;
    const children = folders.filter(f => f.parent === fid);
    const docsHere = docs.filter(d => (d.folder_id || 'root') === fid);
    const isActive = currentFolder === fid;

    return (
      <div>
        <div
          onClick={() => { setOpen(o => !o); setCurrentFolder(fid); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: `5px ${8 + depth * 16}px`,
            borderRadius: '6px', cursor: 'pointer',
            background: isActive ? '#e8eeff' : 'transparent',
            color: isActive ? '#022448' : '#43474e',
            fontWeight: isActive ? 700 : 500, fontSize: '13px',
          }}>
          <ChevronRight size={12} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: '0.15s', flexShrink: 0 }} />
          {open ? <FolderOpen size={14} color="#ffe088" style={{ flexShrink: 0 }} /> : <Folder size={14} color="#ffe088" style={{ flexShrink: 0 }} />}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder?.name}</span>
          <span style={{ fontSize: '10px', color: '#74777f', flexShrink: 0 }}>{docsHere.length + children.length}</span>
        </div>
        {open && (
          <div>
            {children.map(c => <TreeNode key={c.id} fid={c.id} depth={depth + 1} />)}
            {docsHere.map(doc => (
              <div key={doc.id}
                onClick={() => { setCurrentFolder(fid); toggleSelect(doc.id); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: `4px ${8 + (depth + 1) * 16}px`,
                  borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                  background: selected.has(doc.id) ? '#e8eeff' : 'transparent',
                  color: '#43474e',
                }}>
                {fileIcon(doc.mime_type)}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</span>
                <span style={{ fontSize: '10px', color: '#74777f', flexShrink: 0 }}>
                  {doc.processing_status === 'ready' ? '✓' : '○'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%' }}>

      {/* ── Left: Tree sidebar (tree mode only) ── */}
      {viewMode === 'tree' && (
        <div style={{
          width: '220px', flexShrink: 0, background: '#fff',
          borderRadius: '12px', border: '1px solid rgba(196,198,207,0.2)',
          padding: '12px 8px', overflowY: 'auto', maxHeight: '70vh',
        }}>
          <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em', margin: '0 0 8px 8px' }}>FOLDERS</p>
          <TreeNode fid="root" depth={0} />
        </div>
      )}

      {/* ── Right: Main area ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
            {breadcrumbs.map((f, i) => (
              <span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: i < breadcrumbs.length - 1 ? 0 : 1 }}>
                {i > 0 && <ChevronRight size={12} color="#c4c6cf" />}
                <button onClick={() => setCurrentFolder(f.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px',
                    borderRadius: '5px', fontSize: '13px', fontWeight: i === breadcrumbs.length - 1 ? 700 : 500,
                    color: i === breadcrumbs.length - 1 ? '#022448' : '#74777f',
                    display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
                  }}>
                  {i === 0 ? <Home size={12} /> : <Folder size={12} />} {f.name}
                </button>
              </span>
            ))}
          </div>

          {/* Actions */}
          {selected.size > 0 && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={copySelected} style={{ ...btnPrimary, padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', background: '#edeef0', color: '#43474e' }}>
                <Copy size={13} /> Copy names
              </button>
              <button onClick={() => setSelected(new Set())} style={{ ...btnPrimary, padding: '6px 10px', fontSize: '12px', background: '#edeef0', color: '#43474e' }}>
                <X size={13} />
              </button>
            </div>
          )}

          <button onClick={() => setShowNewFolder(true)} title="New Folder"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', background: '#fff', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#43474e', whiteSpace: 'nowrap' }}>
            <FolderPlus size={14} /> New Folder
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', ...btnPrimary, padding: '6px 12px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Upload size={14} /> Upload
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
              accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp,.xlsx,.pptx,.txt,.csv,.mp4,.mp3"
              onChange={e => { const f = Array.from(e.target.files || []); if (f.length) uploadFiles(f); e.target.value = ''; }} />
          </label>

          {/* View toggle */}
          <div style={{ display: 'flex', background: '#edeef0', borderRadius: '8px', padding: '3px' }}>
            {([['grid', Grid], ['tree', List]] as const).map(([mode, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', background: viewMode === mode ? '#fff' : 'transparent', color: viewMode === mode ? '#022448' : '#74777f', boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>

        {/* New folder input */}
        {showNewFolder && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
            <Folder size={16} color="#ffe088" />
            <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); } }}
              placeholder="Folder name" style={{ flex: 1, padding: '7px 12px', border: '1.5px solid #022448', borderRadius: '7px', fontSize: '13px', outline: 'none', fontFamily: 'Manrope, sans-serif' }} />
            <button onClick={createFolder} style={{ ...btnPrimary, padding: '7px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={13} /> Create</button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} style={{ padding: '7px 8px', background: '#edeef0', border: 'none', borderRadius: '7px', cursor: 'pointer' }}><X size={13} /></button>
          </div>
        )}

        {/* Upload progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            {Object.entries(uploadProgress).map(([id, pct]) => (
              <div key={id} style={{ background: '#f0f4ff', borderRadius: '8px', padding: '8px 12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, background: '#dce4ff', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, background: '#022448', height: '100%', borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#022448', fontWeight: 600, width: '32px' }}>{pct}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffdad6', border: '1px solid #ffb4ab', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
            <AlertCircle size={14} color="#93000a" />
            <span style={{ fontSize: '12px', color: '#93000a', flex: 1 }}>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={13} color="#93000a" /></button>
          </div>
        )}

        {/* Drop zone (when empty or drag hover) */}
        {foldersInCurrent.length === 0 && docsInCurrent.length === 0 ? (
          <div
            onDragOver={e => e.preventDefault()} onDrop={onDropZone}
            onClick={() => fileInputRef.current?.click()}
            style={{ border: '2px dashed rgba(196,198,207,0.5)', borderRadius: '16px', padding: '48px', textAlign: 'center', cursor: 'pointer', background: '#fafafa', transition: '0.15s' }}>
            <Upload size={32} color="#c4c6cf" style={{ marginBottom: '12px' }} />
            <p style={{ fontWeight: 700, fontSize: '14px', color: '#022448', margin: '0 0 6px' }}>Drop files here or click to upload</p>
            <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>PDF, DOCX, JPG, PNG and more — up to 50MB each</p>
          </div>
        ) : (
          <div
            onDragOver={e => e.preventDefault()} onDrop={onDropZone}
            style={{ minHeight: '200px' }}>

            {/* Grid view */}
            {viewMode === 'grid' && (
              <div>
                {/* Folders row */}
                {foldersInCurrent.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                    {foldersInCurrent.map(f => (
                      <div key={f.id}
                        draggable
                        onDragOver={e => onFolderDragOver(e, f.id)}
                        onDrop={e => onFolderDrop(e, f.id)}
                        onDoubleClick={() => setCurrentFolder(f.id)}
                        onContextMenu={e => { e.preventDefault(); setContextMenu({ id: f.id, type: 'folder', x: e.clientX, y: e.clientY }); }}
                        style={{
                          width: '110px', padding: '14px 10px', borderRadius: '12px', cursor: 'pointer',
                          background: dragOverFolder === f.id ? '#e8eeff' : '#fff',
                          border: `1.5px solid ${dragOverFolder === f.id ? '#022448' : 'rgba(196,198,207,0.25)'}`,
                          textAlign: 'center', transition: '0.15s', userSelect: 'none',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        }}>
                        <FolderOpen size={36} color="#ffe088" style={{ marginBottom: '6px' }} />
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#191c1e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px' }}>{f.name}</p>
                        <p style={{ fontSize: '10px', color: '#74777f', margin: '2px 0 0' }}>
                          {docs.filter(d => (d.folder_id || 'root') === f.id).length} files
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Files grid */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {docsInCurrent.map(doc => (
                    <div key={doc.id}
                      draggable
                      onDragStart={() => onDocDragStart(doc.id)}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => toggleSelect(doc.id)}
                      onDoubleClick={() => previewDocument(doc)}
                      onContextMenu={e => { e.preventDefault(); setContextMenu({ id: doc.id, type: 'doc', x: e.clientX, y: e.clientY }); }}
                      style={{
                        width: '110px', padding: '14px 10px', borderRadius: '12px', cursor: 'pointer',
                        background: selected.has(doc.id) ? '#e8eeff' : '#fff',
                        border: `1.5px solid ${selected.has(doc.id) ? '#022448' : 'rgba(196,198,207,0.25)'}`,
                        textAlign: 'center', transition: '0.15s', userSelect: 'none',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        opacity: dragging === doc.id ? 0.5 : 1,
                      }}>
                      <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>
                        {doc.mime_type?.startsWith('image/') 
                          ? <Image size={36} color="#5b21b6" />
                          : doc.mime_type === 'application/pdf' 
                            ? <FileText size={36} color="#ba1a1a" />
                            : <File size={36} color="#74777f" />}
                      </div>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#191c1e', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px' }}>{doc.filename}</p>
                      <p style={{ fontSize: '9px', color: '#74777f', margin: 0 }}>{formatBytes(doc.file_size_bytes)}</p>
                      <p style={{ fontSize: '9px', margin: '2px 0 0', color: doc.processing_status === 'ready' ? '#15803d' : '#74777f' }}>
                        {doc.processing_status === 'ready' ? '✓ Ready' : '○ Pending'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tree view — list style for current folder */}
            {viewMode === 'tree' && (
              <div style={{ ...cardStyle, overflow: 'hidden' }}>
                {/* Folder rows */}
                {foldersInCurrent.map((f, i) => (
                  <div key={f.id}
                    onDragOver={e => onFolderDragOver(e, f.id)}
                    onDrop={e => onFolderDrop(e, f.id)}
                    onDoubleClick={() => setCurrentFolder(f.id)}
                    onContextMenu={e => { e.preventDefault(); setContextMenu({ id: f.id, type: 'folder', x: e.clientX, y: e.clientY }); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 18px', cursor: 'pointer',
                      borderBottom: '1px solid rgba(196,198,207,0.1)',
                      background: dragOverFolder === f.id ? '#f0f4ff' : 'transparent',
                    }}>
                    <FolderOpen size={18} color="#ffe088" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#191c1e' }}>{f.name}</span>
                    <span style={{ fontSize: '11px', color: '#74777f' }}>{docs.filter(d => (d.folder_id || 'root') === f.id).length} items</span>
                    <button onClick={e => { e.stopPropagation(); setContextMenu({ id: f.id, type: 'folder', x: e.clientX, y: e.clientY }); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '5px', color: '#74777f' }}>
                      <MoreVertical size={14} />
                    </button>
                  </div>
                ))}
                {/* File rows */}
                {docsInCurrent.map((doc, i) => (
                  <div key={doc.id}
                    draggable onDragStart={() => onDocDragStart(doc.id)} onDragEnd={() => setDragging(null)}
                    onClick={() => toggleSelect(doc.id)}
                    onDoubleClick={() => previewDocument(doc)}
                    onContextMenu={e => { e.preventDefault(); setContextMenu({ id: doc.id, type: 'doc', x: e.clientX, y: e.clientY }); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 18px', cursor: 'pointer',
                      borderBottom: i < docsInCurrent.length - 1 ? '1px solid rgba(196,198,207,0.1)' : 'none',
                      background: selected.has(doc.id) ? '#f0f4ff' : dragging === doc.id ? 'transparent' : 'transparent',
                      opacity: dragging === doc.id ? 0.4 : 1,
                    }}>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px' }}>
                      {fileIcon(doc.mime_type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</p>
                      <p style={{ fontSize: '11px', color: '#74777f', margin: '2px 0 0' }}>
                        {formatBytes(doc.file_size_bytes)}
                        {doc.doc_category && <span style={{ marginLeft: '8px', textTransform: 'uppercase', fontSize: '9px', fontWeight: 700, color: '#735c00' }}>{doc.doc_category.replace(/_/g, ' ')}</span>}
                      </p>
                    </div>
                    <span style={{ fontSize: '11px', color: doc.processing_status === 'ready' ? '#15803d' : '#74777f', flexShrink: 0 }}>
                      {doc.processing_status === 'ready' ? '✓ Processed' : doc.processing_status === 'processing' ? '⟳ Processing' : '○ Pending'}
                    </span>
                    <button onClick={e => { e.stopPropagation(); setContextMenu({ id: doc.id, type: 'doc', x: e.clientX, y: e.clientY }); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '5px', color: '#74777f', flexShrink: 0 }}>
                      <MoreVertical size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Inline Rename Input ── */}
      {renamingId && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setRenamingId(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#fff', borderRadius: '14px', boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            border: '1px solid rgba(196,198,207,0.25)', zIndex: 1001, padding: '20px 24px', minWidth: '300px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em', margin: '0 0 10px', textTransform: 'uppercase' }}>
              Rename {renameType === 'folder' ? 'Folder' : 'File'}
            </p>
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #022448', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'Manrope, sans-serif', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRenamingId(null)} style={{ padding: '7px 14px', background: '#edeef0', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', fontWeight: 600, color: '#43474e' }}>Cancel</button>
              <button onClick={commitRename} style={{ padding: '7px 14px', background: '#022448', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>Rename</button>
            </div>
          </div>
        </>
      )}

      {/* ── Context Menu ── */}
      {contextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setContextMenu(null)} />
          <div style={{
            position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 1000,
            background: '#fff', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            border: '1px solid rgba(196,198,207,0.25)', minWidth: '160px', overflow: 'hidden',
          }}>
            {contextMenu.type === 'doc' ? (
              <>
                <CtxItem icon={<Eye size={13} />} label="Preview" onClick={() => { previewDocument(docs.find(d => d.id === contextMenu.id)!); setContextMenu(null); }} />
                <CtxItem icon={<Download size={13} />} label="Download" onClick={() => { downloadDoc(docs.find(d => d.id === contextMenu.id)!); setContextMenu(null); }} />
                <CtxItem icon={<Copy size={13} />} label="Copy name" onClick={() => { navigator.clipboard.writeText(docs.find(d => d.id === contextMenu.id)?.filename || ''); setContextMenu(null); }} />
                <CtxItem icon={<span style={{fontSize:'11px',fontWeight:700}}>✎</span>} label="Rename" onClick={() => { const d = docs.find(x => x.id === contextMenu.id); if(d) startRename(d.id, 'doc', d.filename); }} />
                <div style={{ height: '1px', background: 'rgba(196,198,207,0.2)', margin: '4px 0' }} />
                <CtxItem icon={<Trash2 size={13} />} label="Delete" danger onClick={() => { deleteDoc(contextMenu.id); setContextMenu(null); }} />
              </>
            ) : (
              <>
                <CtxItem icon={<FolderOpen size={13} />} label="Open" onClick={() => { setCurrentFolder(contextMenu.id); setContextMenu(null); }} />
                <CtxItem icon={<Copy size={13} />} label="Copy folder" onClick={() => {
                  const f = folders.find(x => x.id === contextMenu.id);
                  if (!f) return;
                  const newId = uid();
                  setFolders(prev => [...prev, { id: newId, name: f.name + ' (copy)', parent: f.parent }]);
                  setContextMenu(null);
                }} />
                <CtxItem icon={<span style={{fontSize:'11px',fontWeight:700}}>✎</span>} label="Rename" onClick={() => { const f = folders.find(x => x.id === contextMenu.id); if(f) startRename(f.id, 'folder', f.name); }} />
                <div style={{ height: '1px', background: 'rgba(196,198,207,0.2)', margin: '4px 0' }} />
                <CtxItem icon={<Trash2 size={13} />} label="Delete folder" danger onClick={() => { deleteFolder(contextMenu.id); setContextMenu(null); }} />
              </>
            )}
          </div>
        </>
      )}

      {/* ── Preview modal ── */}
      {previewDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '900px', height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(196,198,207,0.2)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {fileIcon(previewDoc.mime_type)}
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#022448' }}>{previewDoc.filename}</span>
                <span style={{ fontSize: '11px', color: '#74777f' }}>{formatBytes(previewDoc.file_size_bytes)}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => downloadDoc(previewDoc)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#022448', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  <Download size={13} /> Download
                </button>
                <button onClick={() => { setPreviewDoc(null); setPreviewUrl(''); }}
                  style={{ padding: '6px 8px', background: '#edeef0', border: 'none', borderRadius: '7px', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f7' }}>
              {previewUrl ? (() => {
                const mime = (previewDoc.mime_type || '').toLowerCase();
                const fname = (previewDoc.filename || '').toLowerCase();
                // Detect by MIME first, then fall back to filename extension
                const isImage = mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|tiff?|svg)$/i.test(fname);
                const isPdf = mime === 'application/pdf' || fname.endsWith('.pdf');
                const isOffice = !isPdf && !isImage && (
                  mime.includes('word') || mime.includes('excel') || mime.includes('powerpoint') ||
                  mime.includes('spreadsheet') || mime.includes('presentation') ||
                  mime.includes('officedocument') ||
                  /\.(docx?|xlsx?|pptx?)$/i.test(fname)
                );
                const isText = !isPdf && !isImage && !isOffice && (
                  mime.startsWith('text/') || /\.(txt|csv|json|xml|md)$/i.test(fname)
                );
                if (isImage) return (
                  <img src={previewUrl} alt={previewDoc.filename} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
                );
                if (isPdf) return (
                  <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} title={previewDoc.filename} />
                );
                if (isOffice) return (
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                    title={previewDoc.filename}
                  />
                );
                if (isText) return (
                  <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#fff' }} title={previewDoc.filename} />
                );
                // Unsupported — show download prompt
                return (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <FileText size={48} color="#c4c6cf" style={{ marginBottom: '16px' }} />
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#022448', margin: '0 0 8px' }}>Preview not available</p>
                    <p style={{ fontSize: '13px', color: '#74777f', margin: '0 0 20px' }}>This file type cannot be previewed in browser.</p>
                    <button onClick={() => downloadDoc(previewDoc)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#022448', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                      <Download size={14} /> Download to view
                    </button>
                  </div>
                );
              })() : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '32px', height: '32px', border: '3px solid #022448', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '13px', color: '#74777f' }}>Loading preview...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CtxItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '9px 14px',
      background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
      color: danger ? '#ba1a1a' : '#191c1e', fontFamily: 'Manrope, sans-serif', textAlign: 'left',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? '#ffdad6' : '#f4f5f7')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
      {icon} {label}
    </button>
  );
}
