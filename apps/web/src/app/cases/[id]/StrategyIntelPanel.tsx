'use client';
import { useState, useEffect } from 'react';
import {
  Shield, TrendingUp, AlertTriangle, CheckCircle2, ChevronDown,
  ChevronUp, Loader2, Play, Sparkles, Target, BookOpen,
} from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface StrategyOutput {
  sentiment: {
    score: number; label: string; reasoning: string;
    evidence_strength: string; precedent_strength: string;
    timeline_consistency: string; witness_credibility: string;
  };
  strengths: string[];
  vulnerabilities: { issue: string; mitigation: string }[];
  closing_skeleton?: string;
  opening_statement?: string;
}

interface ResearchOutput {
  favorable_precedents: { citation: string; court: string; year: number; held: string; relevance?: string }[];
  adverse_precedents: { citation: string; court: string; year: number; held: string; how_to_distinguish: string }[];
  applicable_statutes: { act: string; section: string; description: string }[];
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 65 ? '#15803d' : score >= 45 ? '#b45309' : '#ba1a1a';
  const bgColor = score >= 65 ? '#dcfce7' : score >= 45 ? '#fef9c3' : '#ffdad6';
  return (
    <div style={{ position: 'relative', width: '92px', height: '92px', flexShrink: 0 }}>
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r={r} fill={bgColor} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
        <circle cx="46" cy="46" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="8" />
        <circle cx="46" cy="46" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 46 46)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'Newsreader, serif', fontSize: '22px', fontWeight: 800, color, lineHeight: 1 }}>{score}%</span>
        <span style={{ fontSize: '9px', fontWeight: 700, color, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '2px' }}>{label}</span>
      </div>
    </div>
  );
}

function SubScore({ label, value }: { label: string; value: string }) {
  const color = value === 'Strong' || value === 'Consistent' || value === 'High' ? '#15803d'
    : value === 'Moderate' || value === 'Minor Gaps' || value === 'Medium' ? '#b45309' : '#ba1a1a';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(196,198,207,0.08)' }}>
      <span style={{ fontSize: '11px', color: '#74777f' }}>{label}</span>
      <span style={{ fontSize: '11px', fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

export default function StrategyIntelPanel({ caseId, token, onRunAgent }: {
  caseId: string; token: string; onRunAgent: (type: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<StrategyOutput | null>(null);
  const [research, setResearch] = useState<ResearchOutput | null>(null);
  const [strategyDate, setStrategyDate] = useState<string | null>(null);
  const [expandedVuln, setExpandedVuln] = useState<number | null>(null);
  const [showOpening, setShowOpening] = useState(false);

  useEffect(() => {
    if (!caseId || !token) return;
    fetch(`${BASE}/v1/agents/cases/${caseId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const latest = d.data?.latest || {};
        if (latest.strategy?.status === 'completed' && latest.strategy?.output) {
          setStrategy(latest.strategy.output as StrategyOutput);
          setStrategyDate(latest.strategy.completed_at || latest.strategy.created_at);
        }
        if (latest.research?.status === 'completed' && latest.research?.output) {
          setResearch(latest.research.output as ResearchOutput);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [caseId, token]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '24px', background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)' }}>
      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} color="#74777f" />
      <span style={{ fontSize: '13px', color: '#74777f' }}>Loading strategy intelligence...</span>
    </div>
  );

  if (!strategy) return (
    <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', padding: '28px', textAlign: 'center' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#d5e3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <Sparkles size={22} color="#022448" />
      </div>
      <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.1rem', color: '#022448', margin: '0 0 6px' }}>No strategy analysis yet</p>
      <p style={{ fontSize: '13px', color: '#74777f', margin: '0 0 16px', lineHeight: 1.6 }}>Run the Evidence, Research, and Strategy agents to unlock win probability, risk flags, and tactical recommendations.</p>
      <button onClick={() => onRunAgent('strategy')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#022448', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
        <Play size={13} /> Run Strategy Agent
      </button>
    </div>
  );

  const { sentiment, strengths, vulnerabilities } = strategy;
  const favCount = research?.favorable_precedents?.length || 0;
  const advCount = research?.adverse_precedents?.length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ── Win Probability Card ── */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', padding: '20px', boxShadow: '0 2px 8px rgba(2,36,72,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          <ScoreRing score={sentiment.score} label={sentiment.label} />
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <TrendingUp size={14} color="#022448" />
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Win Probability</span>
              {strategyDate && <span style={{ fontSize: '10px', color: '#c4c6cf', marginLeft: 'auto' }}>{new Date(strategyDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
            </div>
            <p style={{ fontSize: '12px', color: '#43474e', margin: '0 0 12px', lineHeight: 1.6 }}>{sentiment.reasoning}</p>
            <div style={{ borderTop: '1px solid rgba(196,198,207,0.15)', paddingTop: '10px' }}>
              <SubScore label="Evidence strength" value={sentiment.evidence_strength} />
              <SubScore label="Precedent strength" value={sentiment.precedent_strength} />
              <SubScore label="Timeline consistency" value={sentiment.timeline_consistency} />
              <SubScore label="Witness credibility" value={sentiment.witness_credibility} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-col: Strengths + Vulnerabilities ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

        {/* Strengths */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <CheckCircle2 size={14} color="#15803d" />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803d', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Strong Pointers</span>
            <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '1px 7px', borderRadius: '99px' }}>{strengths?.length || 0}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(strengths || []).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                  <span style={{ fontSize: '10px', color: '#15803d' }}>✓</span>
                </div>
                <span style={{ fontSize: '12px', color: '#191c1e', lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vulnerabilities */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <AlertTriangle size={14} color="#b45309" />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Key Risks</span>
            <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, background: '#fef9c3', color: '#b45309', padding: '1px 7px', borderRadius: '99px' }}>{vulnerabilities?.length || 0} flagged</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(vulnerabilities || []).map((v, i) => (
              <div key={i} style={{ borderRadius: '8px', background: '#fafafa', border: '1px solid rgba(196,198,207,0.15)', overflow: 'hidden' }}>
                <button onClick={() => setExpandedVuln(expandedVuln === i ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '9px 10px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f97316', flexShrink: 0, marginTop: '5px' }} />
                  <span style={{ fontSize: '12px', color: '#191c1e', flex: 1, lineHeight: 1.4 }}>{v.issue}</span>
                  {expandedVuln === i ? <ChevronUp size={12} color="#74777f" style={{ flexShrink: 0 }} /> : <ChevronDown size={12} color="#74777f" style={{ flexShrink: 0 }} />}
                </button>
                {expandedVuln === i && (
                  <div style={{ padding: '0 10px 10px 24px', fontSize: '11px', color: '#43474e', lineHeight: 1.6, borderTop: '1px solid rgba(196,198,207,0.1)' }}>
                    <span style={{ fontWeight: 700, color: '#15803d' }}>Mitigation: </span>{v.mitigation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Strategy Recommendation ── */}
      <div style={{ background: '#022448', borderRadius: '14px', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Target size={14} color="#ffe088" />
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#ffe08890', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Recommended Strategy</span>
        </div>
        {strategy.closing_skeleton && (
          <p style={{ fontSize: '13px', color: '#e0e8f4', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
            {strategy.closing_skeleton.split('\n').slice(0, 4).join('\n')}
          </p>
        )}
        {strategy.opening_statement && (
          <button onClick={() => setShowOpening(!showOpening)} style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '7px', color: '#e0e8f4', fontSize: '12px', fontWeight: 600, padding: '6px 12px', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            <BookOpen size={12} /> {showOpening ? 'Hide' : 'View'} Opening Statement
          </button>
        )}
        {showOpening && strategy.opening_statement && (
          <div style={{ marginTop: '12px', padding: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', fontSize: '12px', color: '#c8d8ee', lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>
            {strategy.opening_statement}
          </div>
        )}
      </div>

      {/* ── Research summary chips ── */}
      {research && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ background: '#f0f4ff', borderRadius: '10px', padding: '12px 16px', flex: '1', minWidth: '140px', border: '1px solid rgba(2,36,72,0.08)' }}>
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#022448', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Favourable Precedents</p>
            <p style={{ fontFamily: 'Newsreader, serif', fontSize: '1.6rem', fontWeight: 800, color: '#022448', margin: 0 }}>{favCount}</p>
          </div>
          <div style={{ background: '#ffdad630', borderRadius: '10px', padding: '12px 16px', flex: '1', minWidth: '140px', border: '1px solid rgba(186,26,26,0.1)' }}>
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#93000a', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Adverse Precedents</p>
            <p style={{ fontFamily: 'Newsreader, serif', fontSize: '1.6rem', fontWeight: 800, color: '#93000a', margin: 0 }}>{advCount}</p>
          </div>
          {(research.applicable_statutes || []).length > 0 && (
            <div style={{ background: '#f8f0ff', borderRadius: '10px', padding: '12px 16px', flex: '1', minWidth: '140px', border: '1px solid rgba(91,33,182,0.1)' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#5b21b6', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Applicable Statutes</p>
              <p style={{ fontFamily: 'Newsreader, serif', fontSize: '1.6rem', fontWeight: 800, color: '#5b21b6', margin: 0 }}>{research.applicable_statutes.length}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
