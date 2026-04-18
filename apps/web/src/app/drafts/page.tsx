'use client';
import { useLang } from '@/hooks/useLanguage';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import Link from 'next/link';
import { FileText, Clock, ExternalLink } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const DOC_TYPE_LABELS: Record<string, string> = {
  petition: 'Petition', written_statement: 'Written Statement',
  affidavit: 'Affidavit', vakalatnama: 'Vakalatnama',
  bail_application: 'Bail Application', opening_statement: 'Opening Statement',
  memo_of_appeal: 'Memo of Appeal', legal_notice: 'Legal Notice',
  reply_notice: 'Reply Notice', other: 'Document',
};

const s = { padding: '32px 28px', fontFamily: 'Manrope, sans-serif' };

export default function DraftsPage() {
  const { token } = useAuthStore();
  const { tr } = useLang();

  const { data: casesData } = useQuery({
    queryKey: ['cases-for-drafts'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/cases?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: draftsData, isLoading } = useQuery({
    queryKey: ['all-drafts', casesData?.length],
    queryFn: async () => {
      const cases = casesData || [];
      const results = await Promise.all(
        cases.slice(0, 15).map(async (c: any) => {
          const r = await fetch(`${BASE}/v1/drafts/case/${c.id}`, { headers: { Authorization: `Bearer ${token}` } });
          const j = await r.json();
          return (j.data || []).map((d: any) => ({ ...d, case_title: c.title, case_id: c.id }));
        })
      );
      return results.flat().sort((a: any, b: any) =>
        new Date(b.last_modified_at || b.created_at).getTime() - new Date(a.last_modified_at || a.created_at).getTime()
      );
    },
    enabled: !!token && !!casesData?.length,
  });

  const drafts: any[] = draftsData || [];

  return (
    <div style={s}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '2rem', fontWeight: 700, color: '#022448', margin: '0 0 4px' }}>
          Drafting Workspace
        </h1>
        <p style={{ fontSize: '14px', color: '#74777f', margin: 0 }}>
          {isLoading ? 'Loading...' : `${drafts.length} draft${drafts.length !== 1 ? 's' : ''} across all cases`}
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: '72px', borderRadius: '14px', background: '#edeef0' }} />)}
        </div>
      ) : drafts.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '40px 32px', textAlign: 'center', border: '1px solid rgba(196,198,207,0.2)', display: 'inline-block' }}>
          <FileText size={40} color="#c4c6cf" style={{ marginBottom: '16px' }} />
          <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: '0 0 8px' }}>tr('no_drafts_yet')</p>
          <p style={{ fontSize: '14px', color: '#74777f', margin: '0 0 24px' }}>
            Run an AI agent on a case, then click "To Draft" to create your first document
          </p>
          <Link href="/cases" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#022448', color: '#fff', fontWeight: 700, fontSize: '13px', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none' }}>
            Go to Cases →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {drafts.map((draft: any) => (
            <Link key={draft.id} href={`/cases/${draft.case_id}?tab=drafts&draft=${draft.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', borderRadius: '10px', padding: '20px', border: '1px solid rgba(196,198,207,0.2)', boxShadow: '0 1px 3px rgba(2,36,72,0.04)', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', maxWidth: '720px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#d5e3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} color="#022448" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#022448', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {draft.title}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#74777f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{draft.case_title}</span>
                    <span style={{ color: '#c4c6cf', fontSize: '10px' }}>·</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#735c00', textTransform: 'uppercase' }}>{DOC_TYPE_LABELS[draft.doc_type] || 'Document'}</span>
                    <span style={{ color: '#c4c6cf', fontSize: '10px' }}>·</span>
                    <span style={{ fontSize: '10px', color: '#74777f' }}>v{draft.version}</span>
                    {draft.word_count > 0 && <><span style={{ color: '#c4c6cf', fontSize: '10px' }}>·</span><span style={{ fontSize: '10px', color: '#74777f' }}>{draft.word_count} words</span></>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#74777f' }}>
                    <Clock size={12} />
                    <span style={{ fontSize: '11px' }}>
                      {new Date(draft.last_modified_at || draft.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <ExternalLink size={14} color="#c4c6cf" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
