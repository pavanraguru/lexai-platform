'use client';

import { useState, useMemo } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import {
  Search, ChevronRight, ChevronDown, BookOpen, FileText,
  Scale, Sparkles, Download, X, ExternalLink, AlertCircle,
  Loader2, Copy, CheckCircle2,
} from 'lucide-react';
import {
  JURISDICTIONS, FILINGS, CASE_CATEGORIES, FILING_STAGES,
  searchFilings, type Filing, type CaseCategory, type FilingStage,
} from '@/lib/filingRepository';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ── AI Draft Modal ────────────────────────────────────────────
function AIDraftModal({ filing, caseContext, onClose }: {
  filing: Filing;
  caseContext?: any;
  onClose: () => void;
}) {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const generateDraft = async () => {
    setLoading(true);
    setError('');
    try {
      const caseInfo = caseContext ? `
Case Title: ${caseContext.title}
Court: ${caseContext.court}
Case Type: ${caseContext.case_type}
Perspective: ${caseContext.perspective}
Sections Charged: ${(caseContext.metadata?.sections_charged || []).join(', ') || 'Not specified'}
CNR Number: ${caseContext.cnr_number || 'Not assigned'}
Client: ${caseContext.metadata?.client_name || 'Not specified'}
Accused/Respondent: ${caseContext.metadata?.accused_names?.join(', ') || 'Not specified'}
Filed Date: ${caseContext.filed_date ? new Date(caseContext.filed_date).toLocaleDateString('en-IN') : 'Not specified'}
` : 'No specific case selected — generate a template with placeholders.';

      const prompt = `You are a senior Indian advocate. Draft the following legal document for an Indian court.

DOCUMENT TYPE: ${filing.name}
${filing.ai_prompt_hint}

CASE INFORMATION:
${caseInfo}

RELEVANT LAW: ${filing.relevant_sections?.join(', ') || 'As applicable'}

INSTRUCTIONS:
1. Use formal Indian court language and proper legal terminology
2. Use BNS/BNSS/BSA sections for post-July 2024 matters, IPC/CrPC for older matters
3. Include all required legal components for this document type
4. Use [PLACEHOLDER] for any information not provided
5. Structure the document properly with headings
6. End with proper prayer clause
7. Do NOT include markdown formatting — use plain text suitable for a legal document

Draft the complete ${filing.name} now:`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      setDraft(text);
    } catch (err: any) {
      setError('Failed to generate draft. Please try again.');
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(196,198,207,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: '0 0 2px' }}>
              AI Draft — {filing.name}
            </h2>
            <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>
              {caseContext ? `For: ${caseContext.title}` : 'Generic template with placeholders'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#74777f', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {!draft && !loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Sparkles size={28} color="#5b21b6" />
              </div>
              <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.1rem', color: '#022448', margin: '0 0 8px' }}>
                Generate AI Draft
              </h3>
              <p style={{ fontSize: '13px', color: '#74777f', margin: '0 0 24px', lineHeight: 1.6, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                Claude will draft a complete {filing.name} using Indian legal style.
                {caseContext ? ' Pre-filled with your case details.' : ' With placeholders for case-specific details.'}
              </p>
              <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', border: '1px solid rgba(202,138,4,0.2)', textAlign: 'left' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', margin: '0 0 4px', letterSpacing: '0.06em' }}>DISCLAIMER</p>
                <p style={{ fontSize: '12px', color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                  AI drafts are starting points only. Always review, verify citations, and customise before filing. This does not constitute legal advice.
                </p>
              </div>
              <button onClick={generateDraft} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#5b21b6', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                <Sparkles size={16} /> Generate Draft
              </button>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Loader2 size={32} color="#5b21b6" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
              <p style={{ fontSize: '14px', color: '#74777f', fontWeight: 600 }}>Claude is drafting your {filing.name}...</p>
              <p style={{ fontSize: '12px', color: '#74777f', marginTop: '4px' }}>This takes 15–30 seconds</p>
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#ffdad6', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
              <AlertCircle size={16} color="#93000a" />
              <span style={{ fontSize: '13px', color: '#93000a' }}>{error}</span>
            </div>
          )}

          {draft && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#15803d" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>Draft generated</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={generateDraft} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'transparent', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#43474e' }}>
                    <Sparkles size={12} /> Regenerate
                  </button>
                  <button onClick={copyToClipboard} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: copied ? '#dcfce7' : '#022448', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: copied ? '#15803d' : '#fff' }}>
                    <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '20px', border: '1px solid rgba(196,198,207,0.2)', fontSize: '13px', color: '#191c1e', lineHeight: 1.9, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', maxHeight: '400px', overflow: 'auto' }}>
                {draft}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Filing Detail Panel ───────────────────────────────────────
function FilingDetailPanel({ filing, onClose, onAIDraft }: {
  filing: Filing;
  onClose: () => void;
  onAIDraft: () => void;
}) {
  const [activeSection, setActiveSection] = useState<'guide' | 'docs' | 'law'>('guide');

  const catConfig = CASE_CATEGORIES.find(c => filing.category.includes(c.id));

  return (
    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(196,198,207,0.2)', boxShadow: '0 8px 32px rgba(2,36,72,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>

      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(196,198,207,0.1)', background: 'linear-gradient(135deg, #022448 0%, #1e3a5f 100%)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)', color: '#ffe088', letterSpacing: '0.06em' }}>
                {FILING_STAGES.find(s => s.id === filing.stage)?.label?.toUpperCase()}
              </span>
              <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em' }}>
                {filing.format.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.3rem', color: '#fff', margin: '0 0 6px', lineHeight: 1.2 }}>
              {filing.name}
            </h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>{filing.description}</p>
            {filing.court_fee && (
              <p style={{ fontSize: '11px', color: '#ffe088', margin: '8px 0 0', fontWeight: 700 }}>
                Court Fee: {filing.court_fee}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={onAIDraft} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 16px', background: '#5b21b6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            <Sparkles size={13} /> AI Draft
          </button>
          <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 16px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            <Download size={13} /> Template
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(196,198,207,0.1)', flexShrink: 0 }}>
        {[{ id: 'guide', label: 'Filing Guide' }, { id: 'docs', label: 'Documents' }, { id: 'law', label: 'Law & Sections' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveSection(tab.id as any)} style={{
            flex: 1, padding: '10px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: '12px', fontWeight: activeSection === tab.id ? 700 : 500,
            color: activeSection === tab.id ? '#022448' : '#74777f',
            borderBottom: activeSection === tab.id ? '2px solid #022448' : '2px solid transparent',
            fontFamily: 'Manrope, sans-serif',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>

        {activeSection === 'guide' && (
          <div>
            {[
              { label: '👤 Who Files', value: filing.filing_guide.who_files },
              { label: '📅 When to File', value: filing.filing_guide.when_to_file },
              ...(filing.filing_guide.time_limit ? [{ label: '⏱ Time Limit', value: filing.filing_guide.time_limit }] : []),
            ].map(item => (
              <div key={item.label} style={{ marginBottom: '14px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid rgba(196,198,207,0.15)' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.06em', margin: '0 0 4px' }}>{item.label}</p>
                <p style={{ fontSize: '13px', color: '#191c1e', margin: 0, lineHeight: 1.6 }}>{item.value}</p>
              </div>
            ))}

            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.06em', margin: '0 0 10px' }}>📝 KEY CONTENTS</p>
              {filing.filing_guide.key_contents.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#d5e3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '10px', fontWeight: 800, color: '#022448' }}>{i + 1}</div>
                  <p style={{ fontSize: '13px', color: '#43474e', margin: '2px 0 0', lineHeight: 1.5 }}>{item}</p>
                </div>
              ))}
            </div>

            <div>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.06em', margin: '0 0 10px' }}>💡 ADVOCATE TIPS</p>
              {filing.filing_guide.tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', background: '#fffbeb', borderRadius: '6px', padding: '8px 10px', border: '1px solid rgba(202,138,4,0.15)' }}>
                  <span style={{ fontSize: '13px', flexShrink: 0 }}>💡</span>
                  <p style={{ fontSize: '12px', color: '#92400e', margin: 0, lineHeight: 1.5 }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'docs' && (
          <div>
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.06em', margin: '0 0 12px' }}>REQUIRED SUPPORTING DOCUMENTS</p>
            {filing.filing_guide.supporting_docs.map((doc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px', border: '1px solid rgba(196,198,207,0.15)' }}>
                <FileText size={14} color="#022448" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: '#43474e', margin: 0 }}>{doc}</p>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'law' && (
          <div>
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.06em', margin: '0 0 12px' }}>APPLICABLE LEGAL PROVISIONS</p>
            {(filing.relevant_sections || []).map((section, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#d5e3ff30', borderRadius: '8px', marginBottom: '8px', border: '1px solid rgba(2,36,72,0.1)' }}>
                <Scale size={14} color="#022448" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: '#022448', margin: 0, fontWeight: 600, fontFamily: 'Manrope, sans-serif' }}>{section}</p>
              </div>
            ))}
            {(!filing.relevant_sections || filing.relevant_sections.length === 0) && (
              <p style={{ fontSize: '13px', color: '#74777f' }}>Refer to applicable statutes for this filing type.</p>
            )}

            <div style={{ marginTop: '20px', padding: '14px', background: '#fff7ed', borderRadius: '8px', border: '1px solid rgba(202,138,4,0.2)' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#b45309', letterSpacing: '0.06em', margin: '0 0 6px' }}>NOTE ON NEW LAWS</p>
              <p style={{ fontSize: '12px', color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                For matters post-July 2024: use BNS (replaces IPC), BNSS (replaces CrPC), BSA (replaces Evidence Act). For matters before July 2024: use IPC, CrPC, Indian Evidence Act.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function FileForPage() {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CaseCategory | null>(null);
  const [selectedStage, setSelectedStage] = useState<FilingStage | null>(null);
  const [selectedFiling, setSelectedFiling] = useState<Filing | null>(null);
  const [showAIDraft, setShowAIDraft] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedJurisdiction, setExpandedJurisdiction] = useState<string | null>('sc');

  const filteredFilings = useMemo(() => {
    if (searchQuery.trim().length > 1) return searchFilings(searchQuery);
    return FILINGS.filter(f => {
      if (selectedCategory && !f.category.includes(selectedCategory)) return false;
      if (selectedStage && f.stage !== selectedStage) return false;
      return true;
    });
  }, [searchQuery, selectedCategory, selectedStage]);

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: '12px',
    border: '1px solid rgba(196,198,207,0.15)',
    boxShadow: '0px 1px 4px rgba(2,36,72,0.04)',
  };

  return (
    <div style={{ padding: '32px 28px', fontFamily: 'Manrope, sans-serif', maxWidth: '1200px' }}>

      {/* Hero */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#022448', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scale size={20} color="#ffe088" />
          </div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '2rem', color: '#022448', margin: 0 }}>
            File For
          </h1>
        </div>
        <p style={{ fontSize: '14px', color: '#74777f', margin: 0, maxWidth: '600px', lineHeight: 1.6 }}>
          Complete repository of Indian court filings — Supreme Court + all 25 High Courts. Select jurisdiction and case type, then get filing guides, templates, and AI-drafted documents.
        </p>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '500px' }}>
        <Search size={16} color="#74777f" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search filings — bail, vakalatnama, writ, caveat..."
          style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '10px', fontSize: '13px', fontFamily: 'Manrope, sans-serif', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#74777f', padding: '2px' }}>
            <X size={14} />
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr)', gap: '20px', alignItems: 'start' }}>

        {/* ── Left: Filters ──────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Case Category */}
          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(196,198,207,0.1)' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em', margin: 0 }}>CASE TYPE</p>
            </div>
            {CASE_CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)} style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px',
                border: 'none', borderBottom: '1px solid rgba(196,198,207,0.06)',
                background: selectedCategory === cat.id ? cat.bg : 'transparent',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'Manrope, sans-serif',
              }}>
                <span style={{ fontSize: '16px' }}>{cat.emoji}</span>
                <span style={{ fontSize: '13px', fontWeight: selectedCategory === cat.id ? 700 : 500, color: selectedCategory === cat.id ? cat.color : '#43474e' }}>
                  {cat.label}
                </span>
                {selectedCategory === cat.id && <ChevronRight size={14} color={cat.color} style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
          </div>

          {/* Filing Stage */}
          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(196,198,207,0.1)' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em', margin: 0 }}>STAGE</p>
            </div>
            {FILING_STAGES.map(stage => (
              <button key={stage.id} onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 16px',
                border: 'none', borderBottom: '1px solid rgba(196,198,207,0.06)',
                background: selectedStage === stage.id ? '#d5e3ff' : 'transparent',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'Manrope, sans-serif',
              }}>
                <span style={{ fontSize: '12px', fontWeight: selectedStage === stage.id ? 700 : 500, color: selectedStage === stage.id ? '#022448' : '#43474e' }}>
                  {stage.label}
                </span>
                {selectedStage === stage.id && <ChevronRight size={13} color="#022448" />}
              </button>
            ))}
          </div>

          {/* Jurisdiction */}
          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(196,198,207,0.1)' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em', margin: 0 }}>JURISDICTION</p>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {/* Supreme Court */}
              {JURISDICTIONS.filter(j => j.type === 'supreme_court').map(j => (
                <button key={j.id} onClick={() => setSelectedJurisdiction(selectedJurisdiction === j.id ? null : j.id)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 16px',
                  border: 'none', borderBottom: '1px solid rgba(196,198,207,0.1)',
                  background: selectedJurisdiction === j.id ? '#022448' : '#f0f4f8',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'Manrope, sans-serif',
                }}>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 800, color: selectedJurisdiction === j.id ? '#ffe088' : '#022448', margin: 0 }}>{j.short}</p>
                    <p style={{ fontSize: '10px', color: selectedJurisdiction === j.id ? 'rgba(255,255,255,0.7)' : '#74777f', margin: 0 }}>{j.city}</p>
                  </div>
                  {selectedJurisdiction === j.id && <ChevronRight size={13} color="#ffe088" />}
                </button>
              ))}
              {/* High Courts */}
              {JURISDICTIONS.filter(j => j.type === 'high_court').map(j => (
                <button key={j.id} onClick={() => setSelectedJurisdiction(selectedJurisdiction === j.id ? null : j.id)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 16px',
                  border: 'none', borderBottom: '1px solid rgba(196,198,207,0.06)',
                  background: selectedJurisdiction === j.id ? '#d5e3ff' : 'transparent',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'Manrope, sans-serif',
                }}>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: selectedJurisdiction === j.id ? 700 : 500, color: selectedJurisdiction === j.id ? '#022448' : '#43474e', margin: 0 }}>{j.short}</p>
                    <p style={{ fontSize: '10px', color: '#74777f', margin: 0 }}>{j.state}</p>
                  </div>
                  {selectedJurisdiction === j.id && <ChevronRight size={13} color="#022448" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Filings + Detail ─────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedFiling ? '1fr 380px' : '1fr', gap: '16px', alignItems: 'start' }}>

          {/* Filing list */}
          <div>
            {/* Results count */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', color: '#74777f', margin: 0 }}>
                {searchQuery ? `${filteredFilings.length} results for "${searchQuery}"` : `${filteredFilings.length} filing${filteredFilings.length !== 1 ? 's' : ''}`}
                {selectedCategory && ` · ${CASE_CATEGORIES.find(c => c.id === selectedCategory)?.label}`}
                {selectedStage && ` · ${FILING_STAGES.find(s => s.id === selectedStage)?.label}`}
              </p>
              {(selectedCategory || selectedStage || selectedJurisdiction) && (
                <button onClick={() => { setSelectedCategory(null); setSelectedStage(null); setSelectedJurisdiction(null); }} style={{ fontSize: '11px', fontWeight: 700, color: '#ba1a1a', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  Clear filters
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredFilings.map(filing => {
                const isSelected = selectedFiling?.id === filing.id;
                const catConfig = CASE_CATEGORIES.find(c => filing.category.includes(c.id));
                const stageConfig = FILING_STAGES.find(s => s.id === filing.stage);

                return (
                  <div
                    key={filing.id}
                    onClick={() => setSelectedFiling(isSelected ? null : filing)}
                    style={{
                      ...cardStyle, padding: '16px', cursor: 'pointer',
                      border: isSelected ? '1.5px solid #022448' : '1px solid rgba(196,198,207,0.15)',
                      background: isSelected ? '#f0f4ff' : '#fff',
                      transition: 'all 0.12s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: catConfig?.bg || '#edeef0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                        {catConfig?.emoji || '📋'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                          <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1rem', color: '#022448', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {filing.name}
                          </h3>
                          <ChevronRight size={15} color={isSelected ? '#022448' : '#c4c6cf'} style={{ flexShrink: 0, transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                        </div>
                        <p style={{ fontSize: '12px', color: '#74777f', margin: '0 0 8px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {filing.description}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '2px', background: catConfig?.bg, color: catConfig?.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {catConfig?.label}
                          </span>
                          <span style={{ fontSize: '9px', fontWeight: 700, color: '#74777f', padding: '2px 7px', borderRadius: '2px', background: '#edeef0' }}>
                            {stageConfig?.label}
                          </span>
                          {filing.court_fee && (
                            <span style={{ fontSize: '10px', color: '#735c00', fontWeight: 600 }}>{filing.court_fee}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick actions */}
                    {isSelected && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(196,198,207,0.15)' }}
                        onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setSelectedFiling(filing); setShowAIDraft(true); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', background: '#5b21b6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                          <Sparkles size={12} /> AI Draft
                        </button>
                        <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', background: '#edeef0', color: '#43474e', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                          <Download size={12} /> Template
                        </button>
                        <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', background: '#d5e3ff', color: '#022448', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                          <BookOpen size={12} /> Guide
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredFilings.length === 0 && (
                <div style={{ ...cardStyle, padding: '48px', textAlign: 'center' }}>
                  <Search size={32} color="#c4c6cf" style={{ marginBottom: '12px' }} />
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#74777f', margin: '0 0 4px' }}>No filings found</p>
                  <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>Try different search terms or clear filters</p>
                </div>
              )}
            </div>
          </div>

          {/* Filing detail panel */}
          {selectedFiling && (
            <div style={{ position: 'sticky', top: '20px' }}>
              <FilingDetailPanel
                filing={selectedFiling}
                onClose={() => setSelectedFiling(null)}
                onAIDraft={() => setShowAIDraft(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* AI Draft Modal */}
      {showAIDraft && selectedFiling && (
        <AIDraftModal
          filing={selectedFiling}
          caseContext={undefined}
          onClose={() => setShowAIDraft(false)}
        />
      )}
    </div>
  );
}
