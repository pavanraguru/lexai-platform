'use client';
// ============================================================
// LexAI India — Case Detail Page
// PRD v1.1 CM-02 — Case Dashboard (per-case view)
// Tabs: Overview | Documents | Hearings | Agents | Drafts
// ============================================================

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import { casesApi, agentsApi, uploadDocument } from '@/lib/api';
import { CASE_STATUS_LABELS } from '@lexai/core';
import {
  FolderOpen, Upload, Bot, FileText, Calendar, Clock,
  ChevronRight, Play, CheckCircle2, AlertCircle, Loader2,
  Eye, Download, ArrowRight
} from 'lucide-react';

const TABS = ['overview', 'documents', 'hearings', 'agents', 'drafts'] as const;
type Tab = typeof TABS[number];

const AGENT_INFO: Record<string, { label: string; desc: string; color: string; icon: string }> = {
  evidence:   { label: 'Evidence',   desc: 'Extracts exhibits, facts, contradictions', color: '#3B82F6', icon: '🔍' },
  timeline:   { label: 'Timeline',   desc: 'Reconstructs chronological events',         color: '#8B5CF6', icon: '📅' },
  deposition: { label: 'Deposition', desc: 'Analyses witness inconsistencies',          color: '#F59E0B', icon: '🎤' },
  research:   { label: 'Research',   desc: 'Finds applicable statutes & precedents',    color: '#10B981', icon: '📚' },
  strategy:   { label: 'Strategy',   desc: 'Opening statement, bench Q&A, sentiment',  color: '#EF4444', icon: '⚖️' },
};

const DOC_CATEGORY_LABELS: Record<string, string> = {
  fir: 'FIR', chargesheet: 'Chargesheet', bail_order: 'Bail Order',
  witness_statement: 'Witness Statement', forensic_report: 'Forensic Report',
  affidavit: 'Affidavit', plaint: 'Plaint', written_statement: 'Written Statement',
  vakalatnama: 'Vakalatnama', order: 'Court Order', judgment: 'Judgment',
  deposition: 'Deposition', evidence_exhibit: 'Evidence Exhibit', other: 'Other',
};

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, canRunAgents, canManageCases } = useAuthStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [uploadDragging, setUploadDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => casesApi.get(token!, id!),
    enabled: !!token && !!id,
  });

  const { data: agentData } = useQuery({
    queryKey: ['agents', id],
    queryFn: () => agentsApi.getForCase(token!, id!),
    enabled: !!token && !!id,
    refetchInterval: 5000, // poll every 5s while agents run
  });

  const runAgent = useMutation({
    mutationFn: (agentType: string) => agentsApi.run(token!, id!, agentType as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', id] }),
  });

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !token) return;
    setUploadProgress(`Uploading ${files.length} file(s)...`);
    try {
      for (const file of Array.from(files)) {
        setUploadProgress(`Uploading ${file.name}...`);
        await uploadDocument(token, file, id!);
      }
      setUploadProgress(null);
      qc.invalidateQueries({ queryKey: ['case', id] });
    } catch (err: any) {
      setUploadProgress(`Upload failed: ${err.message}`);
      setTimeout(() => setUploadProgress(null), 3000);
    }
  };

  const c = data?.data as any;
  const agents = agentData?.data?.latest || {};
  const allAgentJobs = agentData?.data?.all || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!c) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Case not found.</p>
        <button onClick={() => router.push('/cases')} className="mt-4 text-blue-600 text-sm hover:underline">
          ← Back to cases
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <button onClick={() => router.push('/cases')} className="hover:text-gray-600">Cases</button>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium truncate max-w-xs">{c.title}</span>
      </nav>

      {/* Case header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{c.title}</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                ${c.status === 'decided' ? 'bg-green-100 text-green-700' :
                  c.status === 'pending_hearing' ? 'bg-yellow-100 text-yellow-700' :
                  c.status === 'arguments' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'}`}>
                {CASE_STATUS_LABELS[c.status as keyof typeof CASE_STATUS_LABELS] || c.status}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium
                ${c.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                  c.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                  'bg-gray-100 text-gray-500'}`}>
                {c.priority}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-gray-500">
              <span>{c.court}</span>
              {c.cnr_number && <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{c.cnr_number}</span>}
              <span className="capitalize">{c.perspective}</span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('documents'); fileRef.current?.click(); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <Upload size={14} />
              Upload
            </button>
            {canRunAgents() && (
              <button
                onClick={() => { setActiveTab('agents'); }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1E3A5F' }}>
                <Bot size={14} />
                Run Agent
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
          {[
            { label: 'Documents', value: c.documents?.length || 0, icon: FolderOpen },
            { label: 'Hearings', value: c.hearings?.length || 0, icon: Calendar },
            { label: 'Open Tasks', value: c.tasks?.filter((t: any) => t.status !== 'done').length || 0, icon: Clock },
            { label: 'Agent Runs', value: c.agent_jobs?.length || 0, icon: Bot },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <Icon size={16} className="mx-auto text-gray-400 mb-1" />
              <p className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all whitespace-nowrap
              ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Case details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Case Details</h3>
            <dl className="space-y-3">
              {[
                { label: 'Case Type', value: c.case_type?.replace(/_/g, ' ') },
                { label: 'Court Level', value: c.court_level?.replace(/_/g, ' ') },
                { label: 'Judge', value: c.judge_name || '—' },
                { label: 'Filed Date', value: c.filed_date ? new Date(c.filed_date).toLocaleDateString('en-IN') : '—' },
                { label: 'Next Hearing', value: c.next_hearing_date ? new Date(c.next_hearing_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                { label: 'Sections Charged', value: (c.metadata?.sections_charged || []).join(', ') || '—' },
                { label: 'FIR Number', value: c.metadata?.fir_number || '—' },
                { label: 'Police Station', value: c.metadata?.police_station || '—' },
                { label: 'Opposing Counsel', value: c.metadata?.opposing_counsel || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <dt className="text-gray-500 w-36 flex-shrink-0">{label}</dt>
                  <dd className="text-gray-900 font-medium text-right capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Upcoming hearings */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Hearings</h3>
              <button onClick={() => setActiveTab('hearings')}
                className="text-xs text-blue-600 hover:underline">View all</button>
            </div>
            {c.hearings?.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No hearings scheduled yet</p>
            ) : (
              <div className="space-y-3">
                {c.hearings?.slice(0, 4).map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {h.time && <span className="text-gray-400 ml-1">{h.time}</span>}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{h.purpose?.replace(/_/g, ' ')}</p>
                    </div>
                    {h.outcome
                      ? <CheckCircle2 size={16} className="text-green-500" />
                      : <Calendar size={16} className="text-gray-300" />
                    }
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agent sentiment (if strategy has run) */}
          {agents.strategy?.status === 'completed' && agents.strategy.output && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-4">AI Case Assessment</h3>
              {(() => {
                const sentiment = (agents.strategy.output as any)?.sentiment;
                if (!sentiment) return null;
                const color = sentiment.label === 'Favorable' ? '#10B981' : sentiment.label === 'Unfavorable' ? '#EF4444' : '#F59E0B';
                return (
                  <div className="flex items-start gap-6 flex-wrap">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full border-4 flex items-center justify-center text-2xl font-bold mx-auto mb-2"
                        style={{ borderColor: color, color }}>
                        {sentiment.score}
                      </div>
                      <span className="text-sm font-bold" style={{ color }}>{sentiment.label}</span>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      {[
                        { label: 'Evidence', value: sentiment.evidence_strength },
                        { label: 'Precedents', value: sentiment.precedent_strength },
                        { label: 'Timeline', value: sentiment.timeline_consistency },
                        { label: 'Witnesses', value: sentiment.witness_credibility },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-xs text-gray-500 mb-1">{label}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            value === 'Strong' || value === 'Consistent' || value === 'High' ? 'bg-green-100 text-green-700' :
                            value === 'Weak' || value === 'Major Gaps' || value === 'Low' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-2">Reasoning</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{sentiment.reasoning}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Tab: Documents */}
      {activeTab === 'documents' && (
        <div>
          <input ref={fileRef} type="file" multiple className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt,.mp3,.mp4"
            onChange={e => handleFileUpload(e.target.files)} />

          {/* Upload zone */}
          <div
            onDragOver={e => { e.preventDefault(); setUploadDragging(true); }}
            onDragLeave={() => setUploadDragging(false)}
            onDrop={e => { e.preventDefault(); setUploadDragging(false); handleFileUpload(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-6
              ${uploadDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'}`}>
            {uploadProgress ? (
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm font-medium">{uploadProgress}</span>
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-600">Drop files here or click to upload</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, Word, Audio — max 50MB per file</p>
              </>
            )}
          </div>

          {/* Document list */}
          {c.documents?.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FolderOpen size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Document</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Category</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Shared</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {c.documents.map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <FileText size={14} style={{ color: '#1E3A5F' }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{doc.filename}</p>
                            {doc.page_count && (
                              <p className="text-xs text-gray-400">{doc.page_count} pages</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {DOC_CATEGORY_LABELS[doc.doc_category] || doc.doc_category || 'Uncategorised'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          doc.processing_status === 'ready' ? 'bg-green-100 text-green-700' :
                          doc.processing_status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                          doc.processing_status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {doc.processing_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {doc.shared_with_client
                          ? <span className="text-xs text-green-600 font-medium">Shared</span>
                          : <span className="text-xs text-gray-300">Private</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="View">
                            <Eye size={14} className="text-gray-400" />
                          </button>
                          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Download">
                            <Download size={14} className="text-gray-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Agents */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.entries(AGENT_INFO).map(([type, info]) => {
            const job = agents[type];
            const isRunning = job?.status === 'running' || job?.status === 'queued';
            const isDone = job?.status === 'completed';
            const isFailed = job?.status === 'failed';

            return (
              <div key={type}
                className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{info.label} Agent</p>
                      <p className="text-xs text-gray-400 mt-0.5">{info.desc}</p>
                    </div>
                  </div>
                  {isDone && <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />}
                  {isRunning && <Loader2 size={18} className="animate-spin flex-shrink-0" style={{ color: info.color }} />}
                  {isFailed && <AlertCircle size={18} className="text-red-400 flex-shrink-0" />}
                </div>

                {/* Output summary */}
                {isDone && job?.output && (
                  <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
                    {type === 'evidence' && (
                      <>
                        <p>📋 {(job.output as any).exhibits?.length || 0} exhibits</p>
                        <p>⚠️ {(job.output as any).contradictions?.length || 0} contradictions</p>
                        <p>👥 {(job.output as any).witnesses?.length || 0} witnesses</p>
                      </>
                    )}
                    {type === 'timeline' && (
                      <>
                        <p>📅 {(job.output as any).events?.length || 0} events</p>
                        <p>🚨 {(job.output as any).prosecution_gaps?.length || 0} prosecution gaps</p>
                      </>
                    )}
                    {type === 'research' && (
                      <>
                        <p>⚖️ {(job.output as any).applicable_statutes?.length || 0} statutes</p>
                        <p>✅ {(job.output as any).favorable_precedents?.length || 0} favourable precedents</p>
                      </>
                    )}
                    {type === 'strategy' && (job.output as any).sentiment && (
                      <>
                        <p>📊 Sentiment: <strong style={{ color: (job.output as any).sentiment.label === 'Favorable' ? '#10B981' : (job.output as any).sentiment.label === 'Unfavorable' ? '#EF4444' : '#F59E0B' }}>
                          {(job.output as any).sentiment.label} ({(job.output as any).sentiment.score}/100)
                        </strong></p>
                        <p>💬 {(job.output as any).bench_questions?.length || 0} bench questions</p>
                      </>
                    )}
                    {job.cost_inr && <p className="text-gray-400">Cost: ₹{Number(job.cost_inr).toFixed(2)}</p>}
                  </div>
                )}

                {isFailed && (
                  <div className="text-xs text-red-600 bg-red-50 rounded-lg p-3">
                    {job.error_message || 'Agent failed. Please retry.'}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  {canRunAgents() && (
                    <button
                      onClick={() => runAgent.mutate(type)}
                      disabled={isRunning}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
                      style={{ backgroundColor: info.color }}>
                      {isRunning
                        ? <><Loader2 size={14} className="animate-spin" /> Running...</>
                        : isDone
                          ? <><Play size={14} /> Re-run</>
                          : <><Play size={14} /> Run</>
                      }
                    </button>
                  )}
                  {isDone && (
                    <button
                      onClick={() => agentsApi.promote(token!, job.id)}
                      className="flex items-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">
                      <ArrowRight size={14} />
                      To Draft
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Hearings placeholder */}
      {activeTab === 'hearings' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Hearings tab — Phase 1b</p>
          <p className="text-gray-400 text-sm mt-1">Add/edit hearings and record outcomes here</p>
        </div>
      )}

      {/* Tab: Drafts placeholder */}
      {activeTab === 'drafts' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Drafting Workspace — Phase 2b</p>
          <p className="text-gray-400 text-sm mt-1">TipTap editor, AI writing assist, version history</p>
        </div>
      )}
    </div>
  );
}
