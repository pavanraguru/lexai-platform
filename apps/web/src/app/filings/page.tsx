'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { matchCourtKey } from '@/lib/courtHolidays';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Maps DB case_type → filing category
const CASE_TYPE_TO_CATEGORY: Record<string, CaseCategory> = {
  criminal_sessions:   'criminal',
  criminal_magistrate: 'criminal',
  writ_hc:             'constitutional',
  civil_district:      'civil',
  corporate_nclt:      'commercial',
  family:              'family',
  labour:              'labour',
  ip:                  'commercial',
  tax:                 'revenue',
  arbitration:         'commercial',
  consumer:            'civil',
};



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
      const res = await fetch(`${BASE}/v1/filings/ai-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          filing_name: filing.name,
          ai_prompt_hint: filing.ai_prompt_hint,
          relevant_sections: filing.relevant_sections,
          case_context: caseContext,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to generate draft');
      const text = data.data?.draft || '';
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
                {caseContext?.title ? ' Pre-filled with: ' + caseContext.title + '.' : ' With placeholders for case-specific details.'}
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
// Law descriptions for expandable sections
const LAW_DESCRIPTIONS: Record<string, string> = {
  'Section 480 BNSS (Bail)': 'Grants magistrate power to release accused on bail for bailable and non-bailable offences. Sets out conditions and procedure for grant of bail.',
  'Section 482 BNSS (Anticipatory Bail)': 'Allows a person apprehending arrest to apply for pre-arrest bail from Sessions Court or High Court. Court may impose conditions including surrender of passport and no tampering with evidence.',
  'Section 479 BNSS (Default Bail)': 'Statutory right of accused to bail if police fail to file chargesheet within 60 days (offences up to 10 years) or 90 days (offences above 10 years). Right extinguishes once chargesheet is filed.',
  'Section 438 CrPC (old cases)': 'Pre-BNSS anticipatory bail provision. Applies to FIRs registered before July 1, 2024.',
  'Section 167(2) CrPC (old cases)': 'Old default bail provision. Applies to cases before July 1, 2024.',
  'Section 250 BNSS': 'Provides accused the right to apply for discharge before charges are framed, if the material placed does not disclose sufficient grounds.',
  'Section 227 CrPC (old cases)': 'Old discharge provision. Applies to sessions cases before July 1, 2024.',
  'Section 528 BNSS': 'Inherent powers of High Court to make any order necessary to prevent abuse of process of law or to secure ends of justice — including quashing of FIRs.',
  'Section 482 CrPC (old cases)': 'Old inherent powers provision for quashing. Applies to cases before July 1, 2024.',
  'State of Haryana v Bhajan Lal AIR 1992 SC 604': 'Landmark SC judgment listing 7 categories where High Court can exercise inherent powers to quash FIR — including cases where allegations do not constitute an offence, or where there is a legal bar to prosecution.',
  'Section 442 BNSS': 'Revisional jurisdiction of Sessions Court and High Court to examine the correctness, legality or propriety of any finding, sentence or order of a subordinate criminal court.',
  'Section 397 CrPC (old)': 'Old revision provision. Applies to orders passed before July 1, 2024.',
  'Section 415 BNSS': 'Right of appeal against conviction, acquittal or sentence. Specifies which court to approach based on the court that passed the original order.',
  'Section 374 CrPC (old)': 'Old criminal appeal provision.',
  'Article 136 Constitution of India': 'Discretionary power of Supreme Court to grant special leave to appeal from any judgment, decree, determination, sentence or order in any cause or matter by any court or tribunal in India.',
  'Supreme Court Rules 2013': 'Procedural rules governing filing format, limitation periods, and hearing procedures before the Supreme Court of India.',
  'Article 226 Constitution of India': 'Power of every High Court to issue writs including Habeas Corpus, Mandamus, Certiorari, Prohibition, and Quo Warranto for enforcement of fundamental rights and other legal rights.',
  'Article 32 Constitution of India': 'Right to constitutional remedies — empowers Supreme Court to issue writs for enforcement of fundamental rights. Dr. B.R. Ambedkar called it the "heart and soul" of the Constitution.',
  'Article 14, 19, 21': 'Core fundamental rights: Art 14 (equality before law), Art 19 (freedoms of speech, movement, profession), Art 21 (right to life and personal liberty).',
  'Order III Rule 4 CPC': 'Requires that a pleader appearing for a party must file a Vakalatnama — written authority signed by the party — before the court.',
  'Supreme Court Rules 2013 Form 28': 'Prescribed format for Vakalatnama in Supreme Court proceedings.',
  'Section 148A CPC': 'Caveat — any person claiming right to appear before the court may lodge a caveat so that no ex-parte order is passed. Valid for 90 days from date of filing.',
  'Order VII CPC': 'Specifies mandatory contents of a plaint including parties, facts, cause of action, relief, valuation, and verification.',
  'Limitation Act 1963': 'Prescribes time limits for filing suits, appeals and applications. Key periods: 3 years for money suits, 12 years for immovable property, 30 days for most criminal appeals.',
  'Order VIII CPC': 'Governs written statement by defendant — must be filed within 30 days (extendable to 90 days). Non-traversal of facts in plaint amounts to deemed admission.',
  'Order XXXIX Rules 1-2 CPC': 'Empowers courts to grant temporary injunctions — where property is at risk, or where an act may cause injury to plaintiff during pendency of suit.',
  'Section 94 CPC': 'Supplemental proceedings — courts may grant interlocutory injunctions, appoint receivers, or make other orders to secure ends of justice.',
  'Order XXI CPC': 'Execution of decrees — methods include attachment and sale of property, arrest and detention of judgment debtor, garnishee orders, and delivery of immovable property.',
  'Section 36 CPC': 'Execution provisions of CPC apply to orders of court in the same manner as they apply to decrees.',
  'Section 13 Hindu Marriage Act 1955': 'Grounds for divorce under Hindu law — cruelty, desertion for 2 years, conversion to another religion, unsoundness of mind, renunciation, and presumption of death.',
  'Section 27 Special Marriage Act 1954': 'Grounds for divorce for marriages registered under Special Marriage Act — applicable to inter-religious or civil marriages.',
  'Section 125 BNSS': 'Magistrate may order husband, parent or child to pay maintenance to wife, children or parents unable to maintain themselves. Applies to all religions.',
  'Section 24 Hindu Marriage Act': 'Provides for maintenance pendente lite (during pendency of proceedings) and expenses of proceedings from either spouse.',
  'Domestic Violence Act 2005': 'Protection of Women from Domestic Violence Act — provides civil remedies including protection orders, residence orders, and monetary relief.',
  'Guardians and Wards Act 1890': 'Governs appointment of guardians of minor children — court considers welfare of minor as paramount consideration.',
  'Section 26 Hindu Marriage Act': 'Court may make orders for custody, maintenance and education of minor children in any proceedings under the Act.',
  'Section 138 Negotiable Instruments Act': 'Creates criminal liability for dishonour of cheque issued for discharge of legally enforceable debt or liability. Attracts imprisonment up to 2 years or fine up to twice the cheque amount.',
  'Section 141 NI Act (company liability)': 'Where company commits offence under Section 138, every person in charge of and responsible for conduct of business at time of offence is also liable.',
  'Section 7 IBC (Financial Creditor)': 'Financial creditor may file application before NCLT to initiate Corporate Insolvency Resolution Process against a corporate debtor who has committed a default.',
  'Section 9 IBC (Operational Creditor)': 'Operational creditor may apply to NCLT for CIRP after issuing demand notice and 10-day waiting period, if default is not disputed.',
  'Section 10 IBC (Corporate Debtor)': 'Corporate debtor itself may file for voluntary CIRP before NCLT if it has committed a default.',
  'Contempt of Courts Act 1971': 'Defines civil contempt (wilful disobedience of court orders) and criminal contempt (scandalising the court). Punishable with up to 6 months imprisonment or ₹2,000 fine.',
  'Article 129 / 215 Constitution': 'Article 129 — Supreme Court is a court of record and has power to punish for contempt. Article 215 — every High Court is a court of record with contempt jurisdiction.',
  'Order XLI Rule 5 CPC (civil)': 'Appellate court may order stay of execution of decree or stay of proceedings during pendency of appeal, subject to conditions it deems fit.',
  'Section 389 BNSS (criminal sentence)': 'Appellate court may suspend execution of sentence or order release on bail pending disposal of appeal.',
  'Section 5 Limitation Act 1963': 'Court may condone delay in filing if applicant satisfies that there was sufficient cause for not filing within limitation period. Does not apply to suits.',
  'Order VI Rule 17 CPC': 'Allows amendment of pleadings at any stage of proceedings for determining real questions in controversy — court may refuse if amendment would cause injustice to other party.',
  'Section 166 Motor Vehicles Act 1988': 'Provides right to claim compensation for death or bodily injury arising from motor vehicle accident before Motor Accident Claims Tribunal.',
  'Section 140 MV Act (no-fault liability)': 'Prescribes no-fault liability — compensation payable to victim regardless of negligence. Fixed at ₹50,000 for permanent disablement and ₹25,000 for death.',
};

function FilingDetailPanel({ filing, onClose, onAIDraft }: {
  filing: Filing;
  onClose: () => void;
  onAIDraft: () => void;
}) {
  const [activeSection, setActiveSection] = useState<'guide' | 'docs' | 'law'>('guide');
  const [expandedLaw, setExpandedLaw] = useState<string | null>(null);

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
          <button
            onClick={() => {
              // Generate a plain text template and download it
              const templateContent = `${filing.name.toUpperCase()}\n${'='.repeat(filing.name.length)}\n\nIN THE [COURT NAME]\n[CITY/LOCATION]\n\nCase No.: [CASE NUMBER]\n\n[PETITIONER/PLAINTIFF NAME]                    ... Petitioner/Plaintiff\n\nVersus\n\n[RESPONDENT/DEFENDANT NAME]                    ... Respondent/Defendant\n\n\nPETITION/APPLICATION FOR ${filing.name.toUpperCase()}\n\nMOST RESPECTFULLY SHOWETH:\n\n1. [State the first fact of the case]\n\n2. [State the second fact]\n\n3. [Continue with relevant facts...]\n\nGROUNDS\n\nA. [First ground]\n\nB. [Second ground]\n\nC. [Continue with grounds...]\n\nPRAYER\n\nIt is therefore most respectfully prayed that this Hon'ble Court may be pleased to:\n\n(i) [State the first relief sought];\n\n(ii) [State the second relief sought];\n\n(iii) Pass such other and further order(s) as this Hon'ble Court may deem fit and proper in the facts and circumstances of the case.\n\nAnd for this act of kindness, the Petitioner/Plaintiff shall ever pray.\n\n\nFiled by:\nAdvocate for Petitioner/Plaintiff\n\nDate: ${new Date().toLocaleDateString('en-IN')}\nPlace: [CITY]\n\n---\nApplicable Law: ${(filing.relevant_sections || []).join(', ')}`;
              const blob = new Blob([templateContent], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${filing.name.replace(/[^a-zA-Z0-9]/g, '_')}_Template.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 16px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            <Download size={13} /> Template
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(196,198,207,0.15)', flexShrink: 0, background: '#fff' }}>
        {([{ id: 'guide', label: 'Filing Guide' }, { id: 'docs', label: 'Documents' }, { id: 'law', label: 'Law & Sections' }] as const).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveSection(tab.id); }}
            style={{
              flex: 1, padding: '11px 6px', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: activeSection === tab.id ? 700 : 500,
              color: activeSection === tab.id ? '#022448' : '#74777f',
              background: activeSection === tab.id ? '#fff' : 'transparent',
              borderBottom: activeSection === tab.id ? '2px solid #022448' : '2px solid transparent',
              fontFamily: 'Manrope, sans-serif', transition: 'all 0.12s',
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
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.06em', margin: '0 0 12px' }}>APPLICABLE LEGAL PROVISIONS — click to expand</p>
            {(filing.relevant_sections || []).map((section, i) => {
              const isExpanded = expandedLaw === section;
              const description = LAW_DESCRIPTIONS[section];
              return (
                <div key={i} style={{ marginBottom: '8px', borderRadius: '8px', border: `1px solid ${isExpanded ? 'rgba(2,36,72,0.25)' : 'rgba(2,36,72,0.1)'}`, overflow: 'hidden' }}>
                  <button
                    onClick={() => setExpandedLaw(isExpanded ? null : section)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', padding: '11px 14px', background: isExpanded ? '#d5e3ff' : '#d5e3ff30', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <Scale size={14} color="#022448" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: '#022448', fontWeight: 600, fontFamily: 'Manrope, sans-serif' }}>{section}</span>
                    </div>
                    <span style={{ fontSize: '16px', color: '#022448', fontWeight: 400, flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                      {description ? '▾' : ''}
                    </span>
                  </button>
                  {isExpanded && description && (
                    <div style={{ padding: '12px 14px 12px 38px', background: '#f8fafc', borderTop: '1px solid rgba(2,36,72,0.08)' }}>
                      <p style={{ fontSize: '12px', color: '#43474e', margin: 0, lineHeight: 1.7 }}>{description}</p>
                    </div>
                  )}
                  {isExpanded && !description && (
                    <div style={{ padding: '10px 14px 10px 38px', background: '#f8fafc', borderTop: '1px solid rgba(2,36,72,0.08)' }}>
                      <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>Refer to the relevant statute for detailed provisions.</p>
                    </div>
                  )}
                </div>
              );
            })}
            {(!filing.relevant_sections || filing.relevant_sections.length === 0) && (
              <p style={{ fontSize: '13px', color: '#74777f' }}>Refer to applicable statutes for this filing type.</p>
            )}
            <div style={{ marginTop: '16px', padding: '14px', background: '#fff7ed', borderRadius: '8px', border: '1px solid rgba(202,138,4,0.2)' }}>
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
function FileForPageInner() {
  const searchParams = useSearchParams();
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CaseCategory | null>(null);
  const [selectedStage, setSelectedStage] = useState<FilingStage | null>(null);
  const [selectedFiling, setSelectedFiling] = useState<Filing | null>(null);
  const [showAIDraft, setShowAIDraft] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedJurisdiction, setExpandedJurisdiction] = useState<string | null>('sc');
  const [caseContext, setCaseContext] = useState<any>(null);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showJurDropdown, setShowJurDropdown] = useState(false);

  // Read URL params passed from the case detail filings tab
  useEffect(() => {
    const filingName = searchParams.get('filing');
    const caseType   = searchParams.get('case_type');
    const court      = searchParams.get('court');
    const cnr        = searchParams.get('cnr');
    const caseTitle  = searchParams.get('case_title');
    const perspective = searchParams.get('perspective');

    // Auto-select category from case type
    if (caseType && CASE_TYPE_TO_CATEGORY[caseType]) {
      setSelectedCategory(CASE_TYPE_TO_CATEGORY[caseType]);
    }

    // Auto-select jurisdiction from court name
    if (court) {
      const courtKey = matchCourtKey(court);
      if (courtKey) setSelectedJurisdiction(courtKey);
    }

    // Store case context for AI draft pre-filling
    if (caseTitle || court) {
      setCaseContext({ title: caseTitle, court, cnr_number: cnr, case_type: caseType, perspective });
    }

    // Auto-open the specific filing if passed
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

      {/* Case context banner — shown when navigated from a case */}
      {caseContext?.title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#d5e3ff', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(2,36,72,0.15)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#022448', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '12px', fontWeight: 800, color: '#022448', margin: '0 0 2px' }}>
              Auto-filtered for: {caseContext.title}
            </p>
            <p style={{ fontSize: '11px', color: '#43474e', margin: 0 }}>
              {caseContext.court}{caseContext.cnr_number ? ' · ' + caseContext.cnr_number : ''} · Category and jurisdiction pre-selected · AI drafts will use your case details
            </p>
          </div>
          <button onClick={() => { setCaseContext(null); setSelectedCategory(null); setSelectedJurisdiction(null); setSelectedFiling(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#022448', fontSize: '16px', fontWeight: 700, padding: '0 4px' }}>
            ✕
          </button>
        </div>
      )}

      {/* ── Top filter bar ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
          <Search size={15} color="#74777f" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search filings — bail, vakalatnama, writ..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '9px', fontSize: '13px', fontFamily: 'Manrope, sans-serif', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#74777f' }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Case Type dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => { setShowCatDropdown(v => !v); setShowJurDropdown(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '9px', background: selectedCategory ? CASE_CATEGORIES.find(c => c.id === selectedCategory)?.bg || '#fff' : '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: selectedCategory ? 700 : 500, color: selectedCategory ? CASE_CATEGORIES.find(c => c.id === selectedCategory)?.color || '#43474e' : '#43474e', fontFamily: 'Manrope, sans-serif', whiteSpace: 'nowrap' }}>
            {selectedCategory ? (
              <>{CASE_CATEGORIES.find(c => c.id === selectedCategory)?.emoji} {CASE_CATEGORIES.find(c => c.id === selectedCategory)?.label}</>
            ) : 'Case Type'}
            <ChevronDown size={14} />
          </button>
          {showCatDropdown && (
            <div style={{ position: 'absolute', top: '44px', left: 0, background: '#fff', border: '1px solid rgba(196,198,207,0.3)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '200px', overflow: 'hidden' }}>
              <button type="button" onClick={() => { setSelectedCategory(null); setShowCatDropdown(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: !selectedCategory ? '#f0f4ff' : 'transparent', cursor: 'pointer', fontSize: '13px', color: '#74777f', fontFamily: 'Manrope, sans-serif', borderBottom: '1px solid rgba(196,198,207,0.1)' }}>
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
          <button
            type="button"
            onClick={() => { setShowJurDropdown(v => !v); setShowCatDropdown(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '9px', background: selectedJurisdiction ? '#022448' : '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: selectedJurisdiction ? 700 : 500, color: selectedJurisdiction ? '#ffe088' : '#43474e', fontFamily: 'Manrope, sans-serif', whiteSpace: 'nowrap' }}>
            {selectedJurisdiction ? JURISDICTIONS.find(j => j.id === selectedJurisdiction)?.short || 'Court' : 'Jurisdiction'}
            <ChevronDown size={14} />
          </button>
          {showJurDropdown && (
            <div style={{ position: 'absolute', top: '44px', left: 0, background: '#fff', border: '1px solid rgba(196,198,207,0.3)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, width: '260px', maxHeight: '400px', overflowY: 'auto' }}>
              <button type="button" onClick={() => { setSelectedJurisdiction(null); setShowJurDropdown(false); }}
                style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '10px 14px', border: 'none', background: !selectedJurisdiction ? '#f0f4ff' : 'transparent', cursor: 'pointer', fontSize: '13px', color: '#74777f', fontFamily: 'Manrope, sans-serif', borderBottom: '1px solid rgba(196,198,207,0.1)' }}>
                All Jurisdictions
              </button>
              <div style={{ padding: '6px 14px 4px', fontSize: '9px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em' }}>SUPREME COURT</div>
              {JURISDICTIONS.filter(j => j.type === 'supreme_court').map(j => (
                <button key={j.id} type="button" onClick={() => { setSelectedJurisdiction(j.id); setShowJurDropdown(false); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 14px', border: 'none', borderBottom: '1px solid rgba(196,198,207,0.06)', background: selectedJurisdiction === j.id ? '#022448' : 'transparent', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: selectedJurisdiction === j.id ? '#ffe088' : '#022448' }}>{j.name}</span>
                </button>
              ))}
              <div style={{ padding: '8px 14px 4px', fontSize: '9px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em', borderTop: '1px solid rgba(196,198,207,0.1)', marginTop: '4px' }}>HIGH COURTS</div>
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

        {/* Stage dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => { setShowCatDropdown(false); setShowJurDropdown(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '9px', background: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: 'Manrope, sans-serif', color: '#43474e' }}>
            <select
              value={selectedStage || ''}
              onChange={e => setSelectedStage(e.target.value as FilingStage || null)}
              style={{ border: 'none', outline: 'none', fontSize: '13px', fontFamily: 'Manrope, sans-serif', color: selectedStage ? '#022448' : '#43474e', fontWeight: selectedStage ? 700 : 500, background: 'transparent', cursor: 'pointer', appearance: 'none', paddingRight: '20px' }}>
              <option value="">All Stages</option>
              {FILING_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <ChevronDown size={14} style={{ pointerEvents: 'none', marginLeft: '-16px' }} />
          </button>
        </div>

        {/* Clear filters */}
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

      {/* ── Main area ──────────────────────────────────────── */}
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

      {/* AI Draft Modal */}
      {showAIDraft && selectedFiling && (
        <AIDraftModal
          filing={selectedFiling}
          caseContext={caseContext}
          onClose={() => setShowAIDraft(false)}
        />
      )}
    </div>
    </div>
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
