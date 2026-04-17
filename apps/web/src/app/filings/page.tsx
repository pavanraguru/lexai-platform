'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import {
  Search, ChevronRight, ChevronDown, BookOpen, FileText,
  Scale, Sparkles, Download, X, AlertCircle,
  Loader2, Copy, CheckCircle2, Save, BookMarked,
} from 'lucide-react';
import {
  JURISDICTIONS, FILINGS, CASE_CATEGORIES, FILING_STAGES,
  searchFilings, type Filing, type CaseCategory, type FilingStage,
} from '@/lib/filingRepository';
import { matchCourtKey } from '@/lib/courtHolidays';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CASE_TYPE_TO_CATEGORY: Record<string, CaseCategory> = {
  criminal_sessions: 'criminal',
  criminal_magistrate: 'criminal',
  writ_hc: 'constitutional',
  civil_district: 'civil',
  corporate_nclt: 'commercial',
  family: 'family',
  labour: 'labour',
  ip: 'commercial',
  tax: 'revenue',
  arbitration: 'commercial',
  consumer: 'civil',
};

// ── AI Draft Modal ─────────────────────────────────────────────
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
  const [saving, setSaving] = useState(false);
  const [savedToDrafts, setSavedToDrafts] = useState(false);

  const generateDraft = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(BASE + '/v1/filings/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          filing_name: filing.name,
          ai_prompt_hint: filing.ai_prompt_hint,
          relevant_sections: filing.relevant_sections,
          case_context: caseContext,
          existing_content: draft || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to generate draft');
      setDraft(data.data?.draft || '');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveToDrafts = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const body: any = {
        title: (caseContext?.title ? caseContext.title + ' — ' : '') + filing.name,
        doc_type: 'other',
        content: { text: draft },
        word_count: draft.split(/\s+/).filter(Boolean).length,
      };
      if (caseContext?.id) body.case_id = caseContext.id;

      const res = await fetch(BASE + '/v1/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSavedToDrafts(true);
        setTimeout(() => setSavedToDrafts(false), 3000);
      } else {
        const d = await res.json().catch(() => ({}));
        setError('Save failed: ' + (d.error?.message || res.status));
      }
    } catch (e: any) {
      setError('Save failed: ' + e.message);
    }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(196,198,207,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: '0 0 2px' }}>
              AI Draft — {filing.name}
            </h2>
            <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>
              {caseContext?.title ? 'Pre-filled with: ' + caseContext.title : 'Generic template with placeholders'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#74777f' }}>
            <X size={20} />
          </button>
        </div>

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
                Claude will draft a complete {filing.name} in Indian court style.
                {caseContext?.title ? ' Pre-filled with your case details.' : ' With placeholders for case-specific details.'}
              </p>
              <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', border: '1px solid rgba(202,138,4,0.2)', textAlign: 'left', maxWidth: '400px', margin: '0 auto 24px' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', margin: '0 0 4px', letterSpacing: '0.06em' }}>DISCLAIMER</p>
                <p style={{ fontSize: '12px', color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                  AI drafts are starting points only. Always review and verify before filing.
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
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#15803d' }}>
                  <CheckCircle2 size={15} color="#15803d" /> Draft ready
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={generateDraft} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'transparent', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#43474e', fontFamily: 'Manrope, sans-serif' }}>
                    <Sparkles size={12} /> Regenerate
                  </button>
                  <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: copied ? '#dcfce7' : 'transparent', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: copied ? '#15803d' : '#43474e', fontFamily: 'Manrope, sans-serif' }}>
                    <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={saveToDrafts} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: savedToDrafts ? '#dcfce7' : '#022448', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', color: savedToDrafts ? '#15803d' : '#fff', fontFamily: 'Manrope, sans-serif', opacity: saving ? 0.7 : 1 }}>
                    {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />}
                    {savedToDrafts ? 'Saved to Drafts!' : saving ? 'Saving...' : 'Save to Drafts'}
                  </button>
                </div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '20px', border: '1px solid rgba(196,198,207,0.2)', fontSize: '13px', color: '#191c1e', lineHeight: 1.9, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', maxHeight: '400px', overflow: 'auto' }}>
                {draft}
              </div>
              {savedToDrafts && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', padding: '8px 12px', background: '#dcfce7', borderRadius: '8px', fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                  <CheckCircle2 size={14} /> Saved to Drafts — find it in the Drafts section{caseContext?.title ? ' under ' + caseContext.title : ''}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Filing Detail Panel ────────────────────────────────────────
function FilingDetailPanel({ filing, onClose, onAIDraft }: {
  filing: Filing;
  onClose: () => void;
  onAIDraft: () => void;
}) {
  const [activeSection, setActiveSection] = useState<'guide' | 'docs' | 'law'>('guide');
  const [expandedLaw, setExpandedLaw] = useState<string | null>(null);

  const LAW_DESCRIPTIONS: Record<string, string> = {
    'Section 480 BNSS (Bail)': 'Grants court power to release accused on bail. Sets conditions and procedure.',
    'Section 482 BNSS (Anticipatory Bail)': 'Pre-arrest bail when arrest is apprehended. Court may impose conditions.',
    'Section 479 BNSS (Default Bail)': 'Statutory right to bail if chargesheet not filed within 60/90 days of arrest.',
    'Section 528 BNSS': 'Inherent powers of High Court to quash FIR/proceedings to prevent abuse of process.',
    'Section 250 BNSS': 'Accused may apply for discharge before framing of charges if no prima facie case exists.',
    'Article 136 Constitution of India': "Supreme Court's discretionary power to grant special leave to appeal from any court in India.",
    'Article 226 Constitution of India': "High Court's power to issue all writs — Habeas Corpus, Mandamus, Certiorari, Prohibition, Quo Warranto.",
    'Article 32 Constitution of India': 'Right to approach Supreme Court directly for enforcement of fundamental rights.',
    'Section 148A CPC': 'Caveat — person may lodge caveat so no ex-parte order is passed. Valid for 90 days.',
    'Order VII CPC': 'Mandatory contents of a plaint — parties, cause of action, relief, verification.',
    'Order VIII CPC': 'Written statement by defendant — must be filed within 30 days. Non-traversal = deemed admission.',
    'Order XXXIX Rules 1-2 CPC': 'Temporary injunction — court may restrain party from causing irreparable injury during suit.',
    'Order XXI CPC': 'Execution of decrees — attachment and sale of property, arrest of judgment debtor.',
    'Section 13 Hindu Marriage Act 1955': 'Grounds for divorce — cruelty, desertion, conversion, unsoundness of mind.',
    'Section 125 BNSS': 'Magistrate may order maintenance for wife, children or parents. Applies to all religions.',
    'Section 138 Negotiable Instruments Act': 'Criminal liability for dishonour of cheque — up to 2 years imprisonment or double the amount as fine.',
    'Section 7 IBC (Financial Creditor)': 'Financial creditor may initiate insolvency process before NCLT on default.',
    'Section 166 Motor Vehicles Act 1988': 'Right to claim compensation for death or bodily injury from motor vehicle accident before MACT.',
    'Section 5 Limitation Act 1963': 'Court may condone delay in filing if sufficient cause is shown.',
    'Order III Rule 4 CPC': 'Advocate must file Vakalatnama before appearing in court.',
    'Contempt of Courts Act 1971': 'Defines civil and criminal contempt. Punishable with up to 6 months imprisonment.',
  };

  const stageLabel = FILING_STAGES.find(s => s.id === filing.stage)?.label || filing.stage;

  const handleDownload = () => {
    const lines = [
      filing.name, '='.repeat(50), '',
      'IN THE [COURT NAME]', '',
      '[PETITIONER NAME]     ...Petitioner',
      'Versus',
      '[RESPONDENT NAME]     ...Respondent', '',
      'PETITION FOR ' + filing.name.toUpperCase(), '',
      'MOST RESPECTFULLY SHOWETH:', '',
      '1. [State the first fact]',
      '2. [State the second fact]', '',
      'GROUNDS', '', 'A. [First ground]', 'B. [Second ground]', '',
      "PRAYER", '',
      "It is therefore most respectfully prayed that this Hon'ble Court may be pleased to:",
      '', '(i) [First relief];', '(ii) [Second relief];',
      '(iii) Pass such other order as the Court deems fit.', '',
      'Filed by: Advocate for Petitioner',
      'Date: ' + new Date().toLocaleDateString('en-IN'),
      'Applicable Law: ' + (filing.relevant_sections || []).join(', '),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filing.name.replace(/[^a-zA-Z0-9]/g, '_') + '_Template.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(196,198,207,0.2)', boxShadow: '0 8px 32px rgba(2,36,72,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      <div style={{ padding: '20px 20px 16px', background: 'linear-gradient(135deg, #022448 0%, #1e3a5f 100%)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)', color: '#ffe088', letterSpacing: '0.06em' }}>
                {stageLabel.toUpperCase()}
              </span>
            </div>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#fff', margin: '0 0 6px', lineHeight: 1.2 }}>
              {filing.name}
            </h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>{filing.description}</p>
            {filing.court_fee && (
              <p style={{ fontSize: '11px', color: '#ffe088', margin: '6px 0 0', fontWeight: 700 }}>Court Fee: {filing.court_fee}</p>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={onAIDraft} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 16px', background: '#5b21b6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            <Sparkles size={13} /> AI Draft
          </button>
          <button onClick={handleDownload} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 16px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            <Download size={13} /> Template
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(196,198,207,0.15)', flexShrink: 0, background: '#fff' }}>
        {(['guide', 'docs', 'law'] as const).map(tab => (
          <button key={tab} type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setActiveSection(tab); }} style={{
            flex: 1, padding: '11px 6px', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: activeSection === tab ? 700 : 500,
            color: activeSection === tab ? '#022448' : '#74777f',
            background: activeSection === tab ? '#fff' : 'transparent',
            borderBottom: activeSection === tab ? '2px solid #022448' : '2px solid transparent',
            fontFamily: 'Manrope, sans-serif',
          }}>
            {tab === 'guide' ? 'Filing Guide' : tab === 'docs' ? 'Documents' : 'Law & Sections'}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 20px' }}>
        {activeSection === 'guide' && (
          <div>
            {[
              { label: 'WHO FILES', value: filing.filing_guide.who_files },
              { label: 'WHEN TO FILE', value: filing.filing_guide.when_to_file },
              ...(filing.filing_guide.time_limit ? [{ label: 'TIME LIMIT', value: filing.filing_guide.time_limit }] : []),
            ].map(item => (
              <div key={item.label} style={{ marginBottom: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid rgba(196,198,207,0.15)' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.06em', margin: '0 0 4px' }}>{item.label}</p>
                <p style={{ fontSize: '13px', color: '#191c1e', margin: 0, lineHeight: 1.6 }}>{item.value}</p>
              </div>
            ))}
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.06em', margin: '0 0 10px' }}>KEY CONTENTS</p>
            {filing.filing_guide.key_contents.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#d5e3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '10px', fontWeight: 800, color: '#022448' }}>{i + 1}</div>
                <p style={{ fontSize: '13px', color: '#43474e', margin: '2px 0 0', lineHeight: 1.5 }}>{item}</p>
              </div>
            ))}
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.06em', margin: '16px 0 10px' }}>TIPS</p>
            {filing.filing_guide.tips.map((tip, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', background: '#fffbeb', borderRadius: '6px', padding: '8px 10px', border: '1px solid rgba(202,138,4,0.15)' }}>
                <span style={{ fontSize: '13px', flexShrink: 0 }}>💡</span>
                <p style={{ fontSize: '12px', color: '#92400e', margin: 0, lineHeight: 1.5 }}>{tip}</p>
              </div>
            ))}
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
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.06em', margin: '0 0 12px' }}>APPLICABLE PROVISIONS — click to expand</p>
            {(filing.relevant_sections || []).map((section, i) => {
              const isExpanded = expandedLaw === section;
              const description = LAW_DESCRIPTIONS[section];
              return (
                <div key={i} style={{ marginBottom: '8px', borderRadius: '8px', border: isExpanded ? '1px solid rgba(2,36,72,0.25)' : '1px solid rgba(2,36,72,0.1)', overflow: 'hidden' }}>
                  <button type="button" onClick={() => setExpandedLaw(isExpanded ? null : section)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', padding: '11px 14px', background: isExpanded ? '#d5e3ff' : '#d5e3ff30', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <Scale size={14} color="#022448" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: '#022448', fontWeight: 600, fontFamily: 'Manrope, sans-serif' }}>{section}</span>
                    </div>
                    {description && <span style={{ color: '#022448', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>}
                  </button>
                  {isExpanded && (
                    <div style={{ padding: '12px 14px 12px 38px', background: '#f8fafc', borderTop: '1px solid rgba(2,36,72,0.08)' }}>
                      <p style={{ fontSize: '12px', color: '#43474e', margin: 0, lineHeight: 1.7 }}>{description || 'Refer to the relevant statute for detailed provisions.'}</p>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ marginTop: '16px', padding: '12px 14px', background: '#fff7ed', borderRadius: '8px', border: '1px solid rgba(202,138,4,0.2)' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#b45309', letterSpacing: '0.06em', margin: '0 0 4px' }}>NOTE ON NEW LAWS</p>
              <p style={{ fontSize: '12px', color: '#92400e', margin: 0, lineHeight: 1.6 }}>Post-July 2024: BNS, BNSS, BSA. Before July 2024: IPC, CrPC, Indian Evidence Act.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
function FileForPageInner() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CaseCategory | null>(null);
  const [selectedStage, setSelectedStage] = useState<FilingStage | null>(null);
  const [selectedFiling, setSelectedFiling] = useState<Filing | null>(null);
  const [showAIDraft, setShowAIDraft] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [caseContext, setCaseContext] = useState<any>(null);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showJurDropdown, setShowJurDropdown] = useState(false);

  useEffect(() => {
    const filingName  = searchParams.get('filing');
    const caseType    = searchParams.get('case_type');
    const court       = searchParams.get('court');
    const cnr         = searchParams.get('cnr');
    const caseTitle   = searchParams.get('case_title');
    const perspective = searchParams.get('perspective');

    if (caseType && CASE_TYPE_TO_CATEGORY[caseType]) {
      setSelectedCategory(CASE_TYPE_TO_CATEGORY[caseType]);
    }
    if (court) {
      const courtKey = matchCourtKey(court);
      if (courtKey) setSelectedJurisdiction(courtKey);
    }
    if (caseTitle || court) {
      setCaseContext({ title: caseTitle, court, cnr_number: cnr, case_type: caseType, perspective });
    }
    if (filingName) {
      const found = FILINGS.find(f => f.name === filingName);
      if (found) setSelectedFiling(found);
    }
  }, []);

  const filteredFilings = useMemo(() => {
    if (searchQuery.trim().length > 1) return searchFilings(searchQuery);
    return FILINGS.filter(f => {
      if (selectedCategory && !f.category.includes(selectedCategory)) return false;
      if (selectedStage && f.stage !== selectedStage) return false;
      return true;
    });
  }, [searchQuery, selectedCategory, selectedStage]);

  const selectedCat = CASE_CATEGORIES.find(c => c.id === selectedCategory);
  const selectedJur = JURISDICTIONS.find(j => j.id === selectedJurisdiction);

  return (
    <div style={{ padding: '32px 28px', fontFamily: 'Manrope, sans-serif', maxWidth: '1200px' }}>

      {/* Hero */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#022448', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scale size={20} color="#ffe088" />
          </div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '2rem', color: '#022448', margin: 0 }}>Filings</h1>
        </div>
        <p style={{ fontSize: '14px', color: '#74777f', margin: 0, maxWidth: '600px', lineHeight: 1.6 }}>
          Complete repository of Indian court filings — Supreme Court + all 25 High Courts.
        </p>
      </div>

      {/* Case context banner */}
      {caseContext?.title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#d5e3ff', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(2,36,72,0.15)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#022448', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '12px', fontWeight: 800, color: '#022448', margin: '0 0 2px' }}>
              Auto-filtered for: {caseContext.title}
            </p>
            <p style={{ fontSize: '11px', color: '#43474e', margin: 0 }}>
              {caseContext.court}{caseContext.cnr_number ? ' · ' + caseContext.cnr_number : ''} · Category and jurisdiction pre-selected
            </p>
          </div>
          <button type="button" onClick={() => { setCaseContext(null); setSelectedCategory(null); setSelectedJurisdiction(null); setSelectedFiling(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#022448', fontSize: '18px', fontWeight: 700 }}>
            ✕
          </button>
        </div>
      )}

      {/* Top filter bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>

        {/* Search */}
        <div style={{ position: 'relative', width: '280px', flexShrink: 0 }}>
          <Search size={15} color="#74777f" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search — bail, vakalatnama, writ..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '9px', fontSize: '13px', fontFamily: 'Manrope, sans-serif', outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#74777f' }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Case Type dropdown */}
        <div style={{ position: 'relative' }}>
          <button type="button" onClick={() => { setShowCatDropdown(v => !v); setShowJurDropdown(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '9px', background: selectedCat ? selectedCat.bg : '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: selectedCat ? 700 : 500, color: selectedCat ? selectedCat.color : '#43474e', fontFamily: 'Manrope, sans-serif', whiteSpace: 'nowrap', minWidth: '180px', justifyContent: 'space-between' }}>
            {selectedCat ? selectedCat.emoji + ' ' + selectedCat.label : 'Case Type'}
            <ChevronDown size={14} />
          </button>
          {showCatDropdown && (
            <div style={{ position: 'absolute', top: '44px', left: 0, background: '#fff', border: '1px solid rgba(196,198,207,0.3)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '200px', overflow: 'hidden' }}>
              <button type="button" onClick={() => { setSelectedCategory(null); setShowCatDropdown(false); }}
                style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '10px 14px', border: 'none', background: !selectedCategory ? '#f0f4ff' : 'transparent', cursor: 'pointer', fontSize: '13px', color: '#74777f', fontFamily: 'Manrope, sans-serif', borderBottom: '1px solid rgba(196,198,207,0.1)' }}>
                All Case Types
              </button>
              {CASE_CATEGORIES.map(cat => (
                <button key={cat.id} type="button" onClick={() => { setSelectedCategory(cat.id); setShowCatDropdown(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', border: 'none', borderBottom: '1px solid rgba(196,198,207,0.06)', background: selectedCategory === cat.id ? cat.bg : 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: selectedCategory === cat.id ? 700 : 400, color: selectedCategory === cat.id ? cat.color : '#43474e', fontFamily: 'Manrope, sans-serif' }}>
                  <span>{cat.emoji}</span> {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Jurisdiction dropdown */}
        <div style={{ position: 'relative' }}>
          <button type="button" onClick={() => { setShowJurDropdown(v => !v); setShowCatDropdown(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '9px', background: selectedJur ? '#022448' : '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: selectedJur ? 700 : 500, color: selectedJur ? '#ffe088' : '#43474e', fontFamily: 'Manrope, sans-serif', whiteSpace: 'nowrap', minWidth: '180px', justifyContent: 'space-between' }}>
            {selectedJur ? selectedJur.short : 'Jurisdiction'}
            <ChevronDown size={14} />
          </button>
          {showJurDropdown && (
            <div style={{ position: 'absolute', top: '44px', left: 0, background: '#fff', border: '1px solid rgba(196,198,207,0.3)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, width: '260px', maxHeight: '400px', overflowY: 'auto' }}>
              <button type="button" onClick={() => { setSelectedJurisdiction(null); setShowJurDropdown(false); }}
                style={{ display: 'flex', width: '100%', padding: '10px 14px', border: 'none', background: !selectedJurisdiction ? '#f0f4ff' : 'transparent', cursor: 'pointer', fontSize: '13px', color: '#74777f', fontFamily: 'Manrope, sans-serif', borderBottom: '1px solid rgba(196,198,207,0.1)' }}>
                All Jurisdictions
              </button>
              <div style={{ padding: '6px 14px 4px', fontSize: '9px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em' }}>SUPREME COURT</div>
              {JURISDICTIONS.filter(j => j.type === 'supreme_court').map(j => (
                <button key={j.id} type="button" onClick={() => { setSelectedJurisdiction(j.id); setShowJurDropdown(false); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 14px', border: 'none', borderBottom: '1px solid rgba(196,198,207,0.06)', background: selectedJurisdiction === j.id ? '#022448' : 'transparent', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: selectedJurisdiction === j.id ? '#ffe088' : '#022448' }}>{j.name}</span>
                  {selectedJurisdiction === j.id && <span style={{ color: '#ffe088' }}>✓</span>}
                </button>
              ))}
              <div style={{ padding: '8px 14px 4px', fontSize: '9px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em', borderTop: '1px solid rgba(196,198,207,0.08)', marginTop: '4px' }}>HIGH COURTS</div>
              {JURISDICTIONS.filter(j => j.type === 'high_court').map(j => (
                <button key={j.id} type="button" onClick={() => { setSelectedJurisdiction(j.id); setShowJurDropdown(false); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 14px', border: 'none', borderBottom: '1px solid rgba(196,198,207,0.06)', background: selectedJurisdiction === j.id ? '#d5e3ff' : 'transparent', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: selectedJurisdiction === j.id ? 700 : 500, color: selectedJurisdiction === j.id ? '#022448' : '#43474e', display: 'block' }}>{j.name}</span>
                    <span style={{ fontSize: '10px', color: '#74777f' }}>{j.state}</span>
                  </div>
                  {selectedJurisdiction === j.id && <span style={{ fontSize: '12px', color: '#022448' }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stage */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '0 14px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '9px', background: '#fff', height: '41px' }}>
          <select value={selectedStage || ''} onChange={e => setSelectedStage((e.target.value as FilingStage) || null)}
            style={{ border: 'none', outline: 'none', fontSize: '13px', fontFamily: 'Manrope, sans-serif', color: selectedStage ? '#022448' : '#43474e', fontWeight: selectedStage ? 700 : 500, background: 'transparent', cursor: 'pointer', appearance: 'none', paddingRight: '24px', height: '100%' }}>
            <option value="">All Stages</option>
            {FILING_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <ChevronDown size={14} color="#74777f" style={{ position: 'absolute', right: '10px', pointerEvents: 'none' }} />
        </div>

        {/* Clear */}
        {(selectedCategory || selectedJurisdiction || selectedStage || searchQuery) && (
          <button type="button" onClick={() => { setSelectedCategory(null); setSelectedJurisdiction(null); setSelectedStage(null); setSearchQuery(''); }}
            style={{ padding: '10px 14px', border: '1px solid rgba(186,26,26,0.2)', borderRadius: '9px', background: '#fff7f7', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#ba1a1a', fontFamily: 'Manrope, sans-serif', whiteSpace: 'nowrap' }}>
            Clear all
          </button>
        )}
      </div>

      {/* Click outside to close dropdowns */}
      {(showCatDropdown || showJurDropdown) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => { setShowCatDropdown(false); setShowJurDropdown(false); }} />
      )}

      {/* Results count */}
      <p style={{ fontSize: '13px', color: '#74777f', margin: '0 0 14px' }}>
        {searchQuery ? filteredFilings.length + ' results for "' + searchQuery + '"' : filteredFilings.length + ' filing' + (filteredFilings.length !== 1 ? 's' : '')}
        {selectedCat ? ' · ' + selectedCat.label : ''}
        {selectedJur ? ' · ' + selectedJur.short : ''}
        {selectedStage ? ' · ' + FILING_STAGES.find(s => s.id === selectedStage)?.label : ''}
      </p>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedFiling ? '1fr 400px' : '1fr', gap: '16px', alignItems: 'start' }}>

        {/* Filing list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredFilings.map(filing => {
            const isSel = selectedFiling?.id === filing.id;
            const cc = CASE_CATEGORIES.find(cat => filing.category.includes(cat.id));
            const sc = FILING_STAGES.find(s => s.id === filing.stage);
            return (
              <div key={filing.id} onClick={() => setSelectedFiling(isSel ? null : filing)} style={{
                background: isSel ? '#f0f4ff' : '#fff', borderRadius: '12px', padding: '16px', cursor: 'pointer',
                border: isSel ? '1.5px solid #022448' : '1px solid rgba(196,198,207,0.2)',
                boxShadow: isSel ? '0 4px 16px rgba(2,36,72,0.08)' : '0 1px 4px rgba(2,36,72,0.04)',
                transition: 'all 0.12s',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: cc?.bg || '#edeef0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    {cc?.emoji || '📋'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1rem', color: '#022448', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {filing.name}
                      </h3>
                      <ChevronRight size={15} color={isSel ? '#022448' : '#c4c6cf'} style={{ flexShrink: 0, transform: isSel ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                    </div>
                    <p style={{ fontSize: '12px', color: '#74777f', margin: '0 0 8px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {filing.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {cc && <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '2px', background: cc.bg, color: cc.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cc.label}</span>}
                      {sc && <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '2px', background: '#edeef0', color: '#43474e' }}>{sc.label}</span>}
                      {filing.court_fee && <span style={{ fontSize: '10px', color: '#735c00', fontWeight: 600 }}>{filing.court_fee}</span>}
                    </div>
                  </div>
                </div>
                {isSel && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(196,198,207,0.15)' }}
                    onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => setShowAIDraft(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', background: '#5b21b6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                      <Sparkles size={12} /> AI Draft
                    </button>
                    <button type="button" onClick={() => setShowAIDraft(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#edeef0', color: '#43474e', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                      <BookOpen size={12} /> Guide
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {filteredFilings.length === 0 && (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid rgba(196,198,207,0.2)', padding: '48px', textAlign: 'center' }}>
              <Search size={32} color="#c4c6cf" style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#74777f', margin: '0 0 4px' }}>No filings found</p>
              <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>Try different search terms or clear filters</p>
            </div>
          )}
        </div>

        {/* Detail panel */}
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

      {/* AI Draft Modal */}
      {showAIDraft && selectedFiling && (
        <AIDraftModal
          filing={selectedFiling}
          caseContext={caseContext}
          onClose={() => setShowAIDraft(false)}
        />
      )}
    </div>
  );
}

export default function FileForPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', fontFamily: 'Manrope, sans-serif', color: '#74777f' }}>Loading...</div>}>
      <FileForPageInner />
    </Suspense>
  );
}
