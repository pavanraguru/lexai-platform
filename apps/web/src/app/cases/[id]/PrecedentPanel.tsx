'use client';
import { useState, useEffect } from 'react';
import { BookOpen, Scale, ChevronDown, ChevronUp, Loader2, Play, ShieldAlert, CheckCircle2 } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Precedent {
  citation: string; court: string; year: number; held: string;
  relevance?: string; how_to_distinguish?: string;
}
interface Statute {
  act: string; section: string; description: string; relevance?: string;
}

function PrecedentCard({ p, type }: { p: Precedent; type: 'fav' | 'adv' }) {
  const [open, setOpen] = useState(false);
  const isFav = type === 'fav';
  return (
    <div style={{ borderRadius: '10px', background: isFav ? '#f0fdf4' : '#fff8f8', border: `1px solid ${isFav ? 'rgba(21,128,61,0.15)' : 'rgba(186,26,26,0.12)'}`, overflow: 'hidden', marginBottom: '8px' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '13px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Manrope, sans-serif' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isFav ? '#dcfce7' : '#ffdad6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isFav ? <CheckCircle2 size={15} color="#15803d" /> : <ShieldAlert size={15} color="#ba1a1a" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#022448', margin: '0 0 2px', lineHeight: 1.3 }}>{p.citation}</p>
              <p style={{ fontSize: '11px', color: '#74777f', margin: 0 }}>{p.court} · {p.year}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: isFav ? '#dcfce7' : '#ffdad6', color: isFav ? '#15803d' : '#93000a' }}>
                {isFav ? 'In your favour' : 'Adverse'}
              </span>
              {open ? <ChevronUp size={13} color="#74777f" /> : <ChevronDown size={13} color="#74777f" />}
            </div>
          </div>
        </div>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${isFav ? 'rgba(21,128,61,0.1)' : 'rgba(186,26,26,0.08)'}` }}>
          <div style={{ paddingTop: '12px' }}>
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 5px' }}>Held</p>
            <p style={{ fontSize: '12px', color: '#191c1e', lineHeight: 1.7, margin: '0 0 10px' }}>{p.held}</p>
            {isFav && p.relevance && (
              <>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#15803d', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 5px' }}>Why it helps you</p>
                <p style={{ fontSize: '12px', color: '#191c1e', lineHeight: 1.7, margin: 0 }}>{p.relevance}</p>
              </>
            )}
            {!isFav && p.how_to_distinguish && (
              <>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#b45309', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 5px' }}>How to distinguish</p>
                <p style={{ fontSize: '12px', color: '#191c1e', lineHeight: 1.7, margin: 0, background: '#fff7ed', borderRadius: '6px', padding: '8px 10px', border: '1px solid rgba(180,83,9,0.15)' }}>{p.how_to_distinguish}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatuteChip({ s }: { s: Statute }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: '8px', background: '#f4f0ff', border: '1px solid rgba(91,33,182,0.12)', marginBottom: '6px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Manrope, sans-serif' }}>
        <span style={{ fontSize: '10px', fontWeight: 800, background: '#ede9fe', color: '#5b21b6', padding: '2px 7px', borderRadius: '4px', flexShrink: 0 }}>{s.section}</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#022448', flex: 1 }}>{s.act}</span>
        {open ? <ChevronUp size={12} color="#74777f" /> : <ChevronDown size={12} color="#74777f" />}
      </button>
      {open && (
        <div style={{ padding: '0 12px 10px 12px', fontSize: '12px', color: '#43474e', lineHeight: 1.6, borderTop: '1px solid rgba(91,33,182,0.08)' }}>
          <div style={{ paddingTop: '8px' }}>{s.description}</div>
          {s.relevance && <div style={{ marginTop: '6px', color: '#5b21b6', fontWeight: 600 }}>{s.relevance}</div>}
        </div>
      )}
    </div>
  );
}

export default function PrecedentPanel({ caseId, token, onRunAgent }: {
  caseId: string; token: string; onRunAgent: (type: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [research, setResearch] = useState<{ favorable_precedents: Precedent[]; adverse_precedents: Precedent[]; applicable_statutes: Statute[] } | null>(null);
  const [tab, setTab] = useState<'fav' | 'adv' | 'statutes'>('fav');
  const [researchDate, setResearchDate] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId || !token) return;
    fetch(`${BASE}/v1/agents/cases/${caseId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const latest = d.data?.latest || {};
        if (latest.research?.status === 'completed' && latest.research?.output) {
          setResearch(latest.research.output);
          setResearchDate(latest.research.completed_at || latest.research.created_at);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [caseId, token]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '24px', background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)' }}>
      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} color="#74777f" />
      <span style={{ fontSize: '13px', color: '#74777f' }}>Loading precedent research...</span>
    </div>
  );

  if (!research) return (
    <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', padding: '28px', textAlign: 'center' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <BookOpen size={22} color="#5b21b6" />
      </div>
      <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.1rem', color: '#022448', margin: '0 0 6px' }}>No precedent research yet</p>
      <p style={{ fontSize: '13px', color: '#74777f', margin: '0 0 16px', lineHeight: 1.6 }}>Run the Research agent to find relevant Supreme Court and High Court judgments, applicable statutes, and adverse cases with distinction strategies.</p>
      <button onClick={() => onRunAgent('research')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#5b21b6', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
        <Play size={13} /> Run Research Agent
      </button>
    </div>
  );

  const favs = research.favorable_precedents || [];
  const advs = research.adverse_precedents || [];
  const statutes = research.applicable_statutes || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Header summary */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {[
          { label: 'Judgments in your favour', count: favs.length, color: '#15803d', bg: '#dcfce7', tab: 'fav' as const },
          { label: 'Adverse judgments', count: advs.length, color: '#ba1a1a', bg: '#ffdad6', tab: 'adv' as const },
          { label: 'Applicable statutes', count: statutes.length, color: '#5b21b6', bg: '#ede9fe', tab: 'statutes' as const },
        ].map(item => (
          <button key={item.tab} onClick={() => setTab(item.tab)} style={{ flex: '1', minWidth: '120px', padding: '14px 16px', borderRadius: '12px', background: tab === item.tab ? item.bg : '#fff', border: `1.5px solid ${tab === item.tab ? item.color + '40' : 'rgba(196,198,207,0.2)'}`, cursor: 'pointer', textAlign: 'left', transition: '0.15s', fontFamily: 'Manrope, sans-serif' }}>
            <p style={{ fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 800, color: item.color, margin: '0 0 2px' }}>{item.count}</p>
            <p style={{ fontSize: '11px', color: item.color, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>{item.label}</p>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Scale size={14} color="#022448" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#022448' }}>
              {tab === 'fav' ? `${favs.length} Favourable Precedents` : tab === 'adv' ? `${advs.length} Adverse Precedents` : `${statutes.length} Applicable Statutes`}
            </span>
          </div>
          {researchDate && <span style={{ fontSize: '10px', color: '#c4c6cf' }}>Researched {new Date(researchDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
        </div>

        {tab === 'fav' && (
          favs.length === 0
            ? <p style={{ fontSize: '13px', color: '#74777f', textAlign: 'center', padding: '20px' }}>No favourable precedents found for this case.</p>
            : favs.map((p, i) => <PrecedentCard key={i} p={p} type="fav" />)
        )}
        {tab === 'adv' && (
          advs.length === 0
            ? <p style={{ fontSize: '13px', color: '#74777f', textAlign: 'center', padding: '20px' }}>No adverse precedents identified.</p>
            : advs.map((p, i) => <PrecedentCard key={i} p={p} type="adv" />)
        )}
        {tab === 'statutes' && (
          statutes.length === 0
            ? <p style={{ fontSize: '13px', color: '#74777f', textAlign: 'center', padding: '20px' }}>No applicable statutes identified.</p>
            : statutes.map((s, i) => <StatuteChip key={i} s={s} />)
        )}
      </div>
    </div>
  );
}
