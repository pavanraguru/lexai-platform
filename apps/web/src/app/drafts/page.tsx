'use client';
// ============================================================
// LexAI India — Drafts Workspace Page
// PRD v1.1 DW-01 to DW-05
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import Link from 'next/link';
import { FileText, Plus, Clock, Trash2, ExternalLink } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const DOC_TYPE_LABELS: Record<string, string> = {
  petition: 'Petition', written_statement: 'Written Statement',
  affidavit: 'Affidavit', vakalatnama: 'Vakalatnama',
  bail_application: 'Bail Application', opening_statement: 'Opening Statement',
  memo_of_appeal: 'Memo of Appeal', legal_notice: 'Legal Notice',
  reply_notice: 'Reply Notice', other: 'Other',
};

export default function DraftsPage() {
  const { token } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['all-drafts'],
    queryFn: async () => {
      // Get recent drafts across all cases via cases list
      const res = await fetch(`${BASE}/v1/cases?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const cases = json.data || [];

      // Fetch drafts for each case in parallel (up to 10)
      const draftResults = await Promise.all(
        cases.slice(0, 10).map(async (c: any) => {
          const r = await fetch(`${BASE}/v1/drafts/case/${c.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const j = await r.json();
          return (j.data || []).map((d: any) => ({ ...d, case_title: c.title, case_id: c.id }));
        })
      );
      return draftResults.flat().sort((a: any, b: any) =>
        new Date(b.last_modified_at || b.created_at).getTime() - new Date(a.last_modified_at || a.created_at).getTime()
      );
    },
    enabled: !!token,
  });

  const drafts: any[] = data || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>Drafting Workspace</h1>
          <p className="text-sm text-gray-500 mt-0.5">{drafts.length} drafts across all cases</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No drafts yet</p>
          <p className="text-sm text-gray-400 mt-1">Run an AI agent on a case and click "To Draft" to create your first document</p>
          <Link href="/cases" className="mt-4 inline-block text-sm font-medium text-white px-4 py-2 rounded-lg"
            style={{ backgroundColor: '#1E3A5F' }}>
            Go to Cases
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {drafts.map((draft: any) => (
            <Link key={draft.id} href={`/cases/${draft.case_id}?tab=drafts&draft=${draft.id}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <FileText size={18} style={{ color: '#1E3A5F' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{draft.title}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  <span>{draft.case_title}</span>
                  <span>·</span>
                  <span>{DOC_TYPE_LABELS[draft.doc_type] || draft.doc_type}</span>
                  <span>·</span>
                  <span>v{draft.version}</span>
                  {draft.word_count > 0 && <><span>·</span><span>{draft.word_count} words</span></>}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} />
                  {new Date(draft.last_modified_at || draft.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </div>
                <ExternalLink size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
