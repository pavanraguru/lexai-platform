'use client';
import { useState, useEffect } from 'react';
import {
  BookOpen, ShieldAlert, MessageSquare, ChevronDown, ChevronUp,
  Copy, Loader2, CheckCircle2, X, Sparkles,
} from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type SidebarTool = 'cases_for' | 'cases_against' | 'arguments' | null;

interface Precedent {
  citation: string; court: string; year: number; held: string;
  relevance?: string; how_to_distinguish?: string;
}

function MiniPrecedentCard({ p, type }: { p: Precedent; type: 'fav' | 'adv' }) {
  const [open, setOpen] = useState(false);
  const isFav = type === 'fav';
  return (
    <div style={{ borderRadius: '8px', background: isFav ? '#f0fdf4' : '#fff8f8', border: `1px solid ${isFav ? 'rgba(21,128,61,0.15)' : 'rgba(186,26,26,0.12)'}`, marginBottom: '7px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '9px 11px', display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Manrope, sans-serif' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#022448', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.citation}</p>
          <p style={{ fontSize: '10px', color: '#74777f', margin: 0 }}>{p.court} · {p.year}</p>
        </div>
        {open ? <ChevronUp size={12} color="#74777f" style={{ flexShrink: 0, marginTop: '2px' }} /> : <ChevronDown size={12} color="#74777f" style={{ flexShrink: 0, marginTop: '2px' }} />}
      </button>
      {open && (
        <div style={{ padding: '0 11px 10px', borderTop: `1px solid ${isFav ? 'rgba(21,128,61,0.1)' : 'rgba(186,26,26,0.08)'}` }}>
          <p style={{ fontSize: '11px', color: '#191c1e', lineHeight: 1.6, margin: '8px 0 0' }}>{p.held}</p>
          {isFav && p.relevance && <p style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, margin: '6px 0 0', lineHeight: 1.5 }}>↗ {p.relevance}</p>}
          {!isFav && p.how_to_distinguish && <p style={{ fontSize: '11px', color: '#b45309', fontWeight: 600, margin: '6px 0 0', lineHeight: 1.5, background: '#fff7ed', padding: '6px 8px', borderRadius: '5px' }}>Distinguish: {p.how_to_distinguish}</p>}
        </div>
      )}
    </div>
  );
}

function ArgumentsQA({ caseId, token, caseData }: { caseId: string; token: string; caseData: any }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [copied, setCopied] = useState(false);
  const [strengths, setStrengths] = useState<string[]>([]);

  useEffect(() => {
    // Load strengths from strategy agent
    fetch(`${BASE}/v1/agents/cases/${caseId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const strat = d.data?.latest?.strategy;
        if (strat?.status === 'completed' && strat?.output?.strengths) {
          setStrengths(strat.output.strengths);
        }
      }).catch(() => {});
  }, [caseId, token]);

  const QUICK_PROMPTS = [
    'What are the strongest arguments in my favour?',
    'How should I open my oral arguments?',
    'What is the best way to attack the prosecution\'s evidence?',
    'Generate 3 arguments for bail on merits',
    'What precedents support my position?',
    'Anticipate the opposing counsel\'s main arguments',
  ];

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true); setAnswer(''); setCopied(false);
    try {
      const res = await fetch(`${BASE}/v1/drafts/ai-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'arguments',
          case_id: caseId,
          prompt: q,
          context: `Case: ${caseData?.title || ''}\nCourt: ${caseData?.court || ''}\nType: ${caseData?.case_type || ''}\n${caseData?.facts || ''}`,
        }),
      });
      const data = await res.json();
      setAnswer(data.data?.result || data.data?.text || 'No response generated.');
    } catch (err: any) {
      setAnswer('Failed to generate: ' + err.message);
    }
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Strengths from strategy */}
      {strengths.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <p style={{ fontSize: '10px', fontWeight: 800, color: '#15803d', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>Your strong pointers</p>
          {strengths.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', marginBottom: '6px' }}>
              <CheckCircle2 size={13} color="#15803d" style={{ flexShrink: 0, marginTop: '1px' }} />
              <button onClick={() => { setQuestion(s); ask(s); }} style={{ fontSize: '12px', color: '#191c1e', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', lineHeight: 1.5, padding: 0, fontFamily: 'Manrope, sans-serif' }}>{s}</button>
            </div>
          ))}
          <div style={{ height: '1px', background: 'rgba(196,198,207,0.2)', margin: '12px 0' }} />
        </div>
      )}

      {/* Quick prompt buttons */}
      <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>Quick prompts</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' }}>
        {QUICK_PROMPTS.map((p, i) => (
          <button key={i} onClick={() => { setQuestion(p); ask(p); }}
            style={{ padding: '7px 10px', borderRadius: '7px', background: '#f4f5f7', border: '1px solid rgba(196,198,207,0.2)', fontSize: '11px', color: '#43474e', cursor: 'pointer', textAlign: 'left', fontFamily: 'Manrope, sans-serif', lineHeight: 1.4 }}>
            {p}
          </button>
        ))}
      </div>

      {/* Custom Q input */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <input value={question} onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask(question)}
          placeholder="Ask anything about your case arguments..."
          style={{ flex: 1, padding: '8px 11px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '8px', fontSize: '12px', outline: 'none', fontFamily: 'Manrope, sans-serif' }} />
        <button onClick={() => ask(question)} disabled={!question.trim() || loading}
          style={{ padding: '8px 12px', background: loading ? '#edeef0' : '#5b21b6', color: loading ? '#74777f' : '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: loading || !question.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'Manrope, sans-serif', flexShrink: 0 }}>
          {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
        </button>
      </div>

      {/* Answer */}
      {(loading || answer) && (
        <div style={{ background: '#f0f4ff', border: '1px solid rgba(2,36,72,0.1)', borderRadius: '10px', padding: '13px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={13} color="#5b21b6" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '12px', color: '#5b21b6', fontWeight: 600 }}>Generating arguments...</span>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '12px', color: '#191c1e', lineHeight: 1.8, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{answer}</p>
              <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: copied ? '#dcfce7' : '#fff', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: copied ? '#15803d' : '#43474e', fontFamily: 'Manrope, sans-serif' }}>
                <Copy size={11} /> {copied ? 'Copied!' : 'Copy to clipboard'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function DraftingSidebar({ caseId, token, caseData }: {
  caseId: string; token: string; caseData: any;
}) {
  const [activeTool, setActiveTool] = useState<SidebarTool>(null);
  const [loading, setLoading] = useState(false);
  const [research, setResearch] = useState<{ favorable_precedents: Precedent[]; adverse_precedents: Precedent[] } | null>(null);

  useEffect(() => {
    if (!caseId || !token) return;
    fetch(`${BASE}/v1/agents/cases/${caseId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const res = d.data?.latest?.research;
        if (res?.status === 'completed' && res?.output) {
          setResearch(res.output);
        }
      }).catch(() => {});
  }, [caseId, token]);

  const tools = [
    {
      key: 'cases_for' as SidebarTool,
      icon: <BookOpen size={15} color="#15803d" />,
      label: 'Cases For You',
      desc: 'Favourable judgments',
      bg: '#f0fdf4',
      border: 'rgba(21,128,61,0.2)',
      color: '#15803d',
    },
    {
      key: 'cases_against' as SidebarTool,
      icon: <ShieldAlert size={15} color="#ba1a1a" />,
      label: 'Cases Against You',
      desc: 'Adverse cases + how to distinguish',
      bg: '#fff8f8',
      border: 'rgba(186,26,26,0.2)',
      color: '#ba1a1a',
    },
    {
      key: 'arguments' as SidebarTool,
      icon: <MessageSquare size={15} color="#5b21b6" />,
      label: 'Arguments In Your Favour',
      desc: 'AI-powered argument Q&A',
      bg: '#f4f0ff',
      border: 'rgba(91,33,182,0.2)',
      color: '#5b21b6',
    },
  ];

  return (
    <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>AI Tools</p>

      {tools.map(tool => {
        const isActive = activeTool === tool.key;
        return (
          <div key={tool.key} style={{ borderRadius: '10px', border: `1px solid ${isActive ? tool.border : 'rgba(196,198,207,0.2)'}`, background: isActive ? tool.bg : '#fff', overflow: 'hidden', transition: '0.15s' }}>
            {/* Tool header — always visible */}
            <button onClick={() => setActiveTool(isActive ? null : tool.key)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Manrope, sans-serif' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: isActive ? tool.bg : '#f4f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${isActive ? tool.border : 'transparent'}` }}>
                {tool.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#022448', margin: '0 0 1px', lineHeight: 1.3 }}>{tool.label}</p>
                <p style={{ fontSize: '10px', color: '#74777f', margin: 0 }}>{tool.desc}</p>
              </div>
              {isActive
                ? <ChevronUp size={13} color="#74777f" style={{ flexShrink: 0 }} />
                : <ChevronDown size={13} color="#74777f" style={{ flexShrink: 0 }} />}
            </button>

            {/* Expanded content */}
            {isActive && (
              <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(196,198,207,0.15)' }}>
                <div style={{ paddingTop: '12px' }}>

                  {tool.key === 'cases_for' && (
                    research?.favorable_precedents?.length
                      ? research.favorable_precedents.map((p, i) => <MiniPrecedentCard key={i} p={p} type="fav" />)
                      : <div style={{ padding: '12px', background: '#f8f9fb', borderRadius: '8px', textAlign: 'center' }}>
                          <p style={{ fontSize: '12px', color: '#74777f', margin: '0 0 8px' }}>No research data yet.</p>
                          <p style={{ fontSize: '11px', color: '#c4c6cf', margin: 0 }}>Run the Research agent from the Agents tab.</p>
                        </div>
                  )}

                  {tool.key === 'cases_against' && (
                    research?.adverse_precedents?.length
                      ? research.adverse_precedents.map((p, i) => <MiniPrecedentCard key={i} p={p} type="adv" />)
                      : <div style={{ padding: '12px', background: '#f8f9fb', borderRadius: '8px', textAlign: 'center' }}>
                          <p style={{ fontSize: '12px', color: '#74777f', margin: '0 0 8px' }}>No adverse cases found.</p>
                          <p style={{ fontSize: '11px', color: '#c4c6cf', margin: 0 }}>Run the Research agent from the Agents tab.</p>
                        </div>
                  )}

                  {tool.key === 'arguments' && (
                    <ArgumentsQA caseId={caseId} token={token} caseData={caseData} />
                  )}

                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
