// ============================================================
// LexAI India — Legal Filing Repository
// All standard Indian court filings organised by:
// Jurisdiction → Case Type → Filing
// Covers: Supreme Court + all 25 High Courts
// ============================================================

export type CaseCategory =
  | 'criminal' | 'civil' | 'constitutional' | 'family'
  | 'commercial' | 'labour' | 'revenue' | 'motor_accident' | 'general';

export type FilingStage = 'initiation' | 'interim' | 'evidence' | 'arguments' | 'appeal' | 'execution' | 'miscellaneous';

export interface Filing {
  id: string;
  name: string;
  description: string;
  category: CaseCategory[];
  stage: FilingStage;
  format: 'petition' | 'application' | 'affidavit' | 'notice' | 'written_statement' | 'miscellaneous';
  court_fee?: string;
  filing_guide: {
    who_files: string;
    when_to_file: string;
    key_contents: string[];
    supporting_docs: string[];
    time_limit?: string;
    tips: string[];
  };
  ai_prompt_hint: string;  // hint sent to Claude for AI draft generation
  relevant_sections?: string[];  // BNS/IPC/CPC sections
}

export interface Jurisdiction {
  id: string;
  name: string;
  short: string;
  type: 'supreme_court' | 'high_court' | 'district_court';
  state?: string;
  city: string;
  filing_categories: CaseCategory[];
}

// ── Jurisdictions ─────────────────────────────────────────────

export const JURISDICTIONS: Jurisdiction[] = [
  { id: 'sc', name: 'Supreme Court of India', short: 'SC', type: 'supreme_court', city: 'New Delhi', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'commercial', 'labour', 'general'] },
  { id: 'delhi_hc', name: 'Delhi High Court', short: 'DHC', type: 'high_court', state: 'Delhi', city: 'New Delhi', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'commercial', 'labour', 'revenue', 'motor_accident', 'general'] },
  { id: 'bombay_hc', name: 'Bombay High Court', short: 'BHC', type: 'high_court', state: 'Maharashtra', city: 'Mumbai', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'commercial', 'labour', 'revenue', 'motor_accident', 'general'] },
  { id: 'madras_hc', name: 'Madras High Court', short: 'MHC', type: 'high_court', state: 'Tamil Nadu', city: 'Chennai', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'commercial', 'labour', 'revenue', 'motor_accident', 'general'] },
  { id: 'calcutta_hc', name: 'Calcutta High Court', short: 'CHC', type: 'high_court', state: 'West Bengal', city: 'Kolkata', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'commercial', 'labour', 'revenue', 'motor_accident', 'general'] },
  { id: 'allahabad_hc', name: 'Allahabad High Court', short: 'AHC', type: 'high_court', state: 'Uttar Pradesh', city: 'Allahabad', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'commercial', 'labour', 'revenue', 'motor_accident', 'general'] },
  { id: 'karnataka_hc', name: 'Karnataka High Court', short: 'KHC', type: 'high_court', state: 'Karnataka', city: 'Bengaluru', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'commercial', 'labour', 'revenue', 'motor_accident', 'general'] },
  { id: 'kerala_hc', name: 'Kerala High Court', short: 'KeHC', type: 'high_court', state: 'Kerala', city: 'Kochi', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'commercial', 'labour', 'revenue', 'motor_accident', 'general'] },
  { id: 'gujarat_hc', name: 'Gujarat High Court', short: 'GHC', type: 'high_court', state: 'Gujarat', city: 'Ahmedabad', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'commercial', 'labour', 'revenue', 'motor_accident', 'general'] },
  { id: 'rajasthan_hc', name: 'Rajasthan High Court', short: 'RHC', type: 'high_court', state: 'Rajasthan', city: 'Jodhpur', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'commercial', 'labour', 'revenue', 'motor_accident', 'general'] },
  { id: 'mp_hc', name: 'Madhya Pradesh High Court', short: 'MPHC', type: 'high_court', state: 'Madhya Pradesh', city: 'Jabalpur', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'commercial', 'labour', 'revenue', 'motor_accident', 'general'] },
  { id: 'patna_hc', name: 'Patna High Court', short: 'PHC', type: 'high_court', state: 'Bihar', city: 'Patna', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'labour', 'revenue', 'motor_accident', 'general'] },
  { id: 'orissa_hc', name: 'Orissa High Court', short: 'OHC', type: 'high_court', state: 'Odisha', city: 'Cuttack', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'labour', 'revenue', 'motor_accident', 'general'] },
  { id: 'punjab_haryana_hc', name: 'Punjab & Haryana High Court', short: 'PHHC', type: 'high_court', state: 'Punjab & Haryana', city: 'Chandigarh', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'commercial', 'labour', 'revenue', 'motor_accident', 'general'] },
  { id: 'telangana_hc', name: 'Telangana High Court', short: 'THC', type: 'high_court', state: 'Telangana', city: 'Hyderabad', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'commercial', 'labour', 'revenue', 'motor_accident', 'general'] },
  { id: 'ap_hc', name: 'Andhra Pradesh High Court', short: 'APHC', type: 'high_court', state: 'Andhra Pradesh', city: 'Amaravati', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'commercial', 'labour', 'revenue', 'motor_accident', 'general'] },
  { id: 'gauhati_hc', name: 'Gauhati High Court', short: 'GaHC', type: 'high_court', state: 'Assam', city: 'Guwahati', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'labour', 'revenue', 'general'] },
  { id: 'jharkhand_hc', name: 'Jharkhand High Court', short: 'JHC', type: 'high_court', state: 'Jharkhand', city: 'Ranchi', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'labour', 'revenue', 'general'] },
  { id: 'chhattisgarh_hc', name: 'Chhattisgarh High Court', short: 'CgHC', type: 'high_court', state: 'Chhattisgarh', city: 'Bilaspur', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'labour', 'revenue', 'general'] },
  { id: 'uttarakhand_hc', name: 'Uttarakhand High Court', short: 'UHC', type: 'high_court', state: 'Uttarakhand', city: 'Nainital', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'labour', 'revenue', 'general'] },
  { id: 'himachal_hc', name: 'Himachal Pradesh High Court', short: 'HPHC', type: 'high_court', state: 'Himachal Pradesh', city: 'Shimla', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'labour', 'revenue', 'general'] },
  { id: 'jk_hc', name: 'J&K High Court', short: 'JKHC', type: 'high_court', state: 'J&K', city: 'Srinagar', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'labour', 'revenue', 'general'] },
  { id: 'manipur_hc', name: 'Manipur High Court', short: 'ManHC', type: 'high_court', state: 'Manipur', city: 'Imphal', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'general'] },
  { id: 'meghalaya_hc', name: 'Meghalaya High Court', short: 'MegHC', type: 'high_court', state: 'Meghalaya', city: 'Shillong', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'general'] },
  { id: 'sikkim_hc', name: 'Sikkim High Court', short: 'SHC', type: 'high_court', state: 'Sikkim', city: 'Gangtok', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'general'] },
  { id: 'tripura_hc', name: 'Tripura High Court', short: 'TrHC', type: 'high_court', state: 'Tripura', city: 'Agartala', filing_categories: ['criminal', 'civil', 'constitutional', 'family', 'general'] },
];

// ── Filing Repository ──────────────────────────────────────────

export const FILINGS: Filing[] = [

  // ══ GENERAL / UNIVERSAL FILINGS ════════════════════════════

  {
    id: 'vakalatnama',
    name: 'Vakalatnama',
    description: 'Authority letter appointing an advocate to appear and act on behalf of a party in court.',
    category: ['criminal', 'civil', 'constitutional', 'family', 'commercial', 'labour', 'revenue', 'motor_accident', 'general'],
    stage: 'initiation',
    format: 'miscellaneous',
    filing_guide: {
      who_files: 'Advocate, on behalf of client (petitioner or respondent)',
      when_to_file: 'At the very beginning — before filing any petition or appearing in court',
      key_contents: ['Full name and address of client', 'Advocate\'s name, bar registration number, and address', 'Scope of authority (appear, plead, act)', 'Court name and case number (if known)', 'Client signature and date'],
      supporting_docs: ['Client\'s ID proof (optional but recommended)', 'Stamp paper (as required by court)'],
      time_limit: 'Before first appearance or filing',
      tips: ['Use ₹100 stamp paper in most High Courts', 'In SC, use Form No. 28 from Supreme Court Rules', 'Keep original with court, copy with client and advocate', 'Verify if client is a company — authorised signatory needed'],
    },
    ai_prompt_hint: 'Generate a vakalatnama appointing the advocate to appear for the client. Include proper court name, parties, and scope of authority.',
    relevant_sections: ['Order III Rule 4 CPC', 'Supreme Court Rules 2013 Form 28'],
  },

  {
    id: 'caveat',
    name: 'Caveat Petition',
    description: 'Precautionary filing to ensure the court does not pass any ex-parte order without hearing the caveator.',
    category: ['civil', 'constitutional', 'commercial', 'general'],
    stage: 'initiation',
    format: 'petition',
    court_fee: '₹50–₹500 depending on court',
    filing_guide: {
      who_files: 'Any person who apprehends that a petition/application may be filed against them',
      when_to_file: 'Before the opposing party files any petition — valid for 90 days from filing',
      key_contents: ['Caveator\'s name and address', 'Respondent/anticipated petitioner details', 'Nature of dispute and anticipated petition', 'Prayer that no ex-parte orders be passed', 'Caveator\'s contact details for notice'],
      supporting_docs: ['Vakalatnama', 'Brief statement of facts'],
      time_limit: 'Valid for 90 days (Section 148A CPC)',
      tips: ['File immediately when you sense the other party may approach court', 'Mention anticipated case type and parties clearly', 'Caveat must be served on the anticipated petitioner', 'After 90 days, fresh caveat must be filed'],
    },
    ai_prompt_hint: 'Draft a caveat petition under Section 148A CPC. Include caveator details, anticipated petitioner, nature of dispute, and prayer that court hear the caveator before passing any order.',
    relevant_sections: ['Section 148A CPC'],
  },

  // ══ CRIMINAL FILINGS ══════════════════════════════════════

  {
    id: 'bail_application',
    name: 'Bail Application',
    description: 'Application for grant of bail — regular bail under Section 480 BNSS (formerly 437/439 CrPC) or anticipatory bail under Section 482 BNSS (formerly 438 CrPC).',
    category: ['criminal'],
    stage: 'interim',
    format: 'application',
    court_fee: '₹50–₹200',
    filing_guide: {
      who_files: 'Accused person\'s advocate',
      when_to_file: 'After arrest (regular bail) or before anticipated arrest (anticipatory bail)',
      key_contents: ['Accused name, age, address, occupation', 'Details of FIR/Case number, offence, sections', 'Grounds for bail — health, family, first offence, cooperation', 'Criminal antecedents (or lack thereof)', 'Sureties offered', 'Conditions proposed to be accepted', 'Prayer for bail with conditions'],
      supporting_docs: ['Copy of FIR', 'Chargesheet (if filed)', 'Medical documents (if health ground)', 'Property documents for surety', 'Character certificates', 'Previous bail orders (if any)'],
      tips: ['For anticipatory bail, highlight apprehension of arrest and why it is sought', 'Mention roots in society — family, employment, property', 'For NDPS cases, default bail provisions under Section 479 BNSS apply', 'Attach prior clean record / no criminal antecedents affidavit', 'Mention willingness to comply with all conditions'],
    },
    ai_prompt_hint: 'Draft a bail application for the accused. Include FIR details, offence sections, personal background of accused, grounds for bail (cooperation, first offence, roots in society, family), and prayer for regular/anticipatory bail with proposed conditions.',
    relevant_sections: ['Section 480 BNSS (Bail)', 'Section 482 BNSS (Anticipatory Bail)', 'Section 479 BNSS (Default Bail)'],
  },

  {
    id: 'anticipatory_bail',
    name: 'Anticipatory Bail Application',
    description: 'Pre-arrest bail under Section 482 BNSS (formerly Section 438 CrPC) filed when there is reasonable apprehension of arrest.',
    category: ['criminal'],
    stage: 'initiation',
    format: 'application',
    filing_guide: {
      who_files: 'Accused / apprehending person\'s advocate',
      when_to_file: 'Before arrest — as soon as there is reasonable apprehension',
      key_contents: ['Applicant details and occupation', 'Apprehension of arrest — basis and circumstances', 'Nature of alleged offence and FIR (if registered)', 'Grounds: no flight risk, cooperating, false implication', 'Undertaking to cooperate with investigation', 'Prayer for anticipatory bail with directions to police'],
      supporting_docs: ['Copy of FIR (if lodged)', 'Complaint copy (if any)', 'Character certificates', 'Passport (to show non-flight risk)', 'Employment/business proof'],
      time_limit: 'Before arrest',
      tips: ['Clearly establish why arrest is imminent and apprehension is genuine', 'Distinguish from regular bail — no arrest has occurred yet', 'Offer to surrender passport if the court directs', 'Highlight false implication if applicable'],
    },
    ai_prompt_hint: 'Draft an anticipatory bail application under Section 482 BNSS. Establish apprehension of arrest, background of applicant, nature of alleged offence, grounds for bail, and prayer for protection from arrest.',
    relevant_sections: ['Section 482 BNSS', 'Section 438 CrPC (old cases)'],
  },

  {
    id: 'default_bail',
    name: 'Default Bail Application',
    description: 'Bail by default under Section 479 BNSS — accused entitled to bail if chargesheet not filed within 60/90 days of arrest.',
    category: ['criminal'],
    stage: 'interim',
    format: 'application',
    filing_guide: {
      who_files: 'Accused person\'s advocate',
      when_to_file: '60 days after arrest (offences with punishment up to 10 years) or 90 days (offences with punishment >10 years or death), if chargesheet not filed',
      key_contents: ['Date of arrest', 'Date by which chargesheet was due', 'Confirmation that chargesheet not filed', 'Prayer for default bail as statutory right'],
      supporting_docs: ['Remand orders showing date of arrest', 'Proof that chargesheet not filed'],
      time_limit: 'Must be filed before chargesheet is filed — once chargesheet filed, right extinguishes',
      tips: ['This is a statutory right — court cannot refuse if chargesheet not filed in time', 'Compute dates carefully from date of first remand', 'For NDPS offences, 60 days under Section 167(2) BNSS'],
    },
    ai_prompt_hint: 'Draft a default bail application under Section 479 BNSS. Calculate time elapsed from arrest date, confirm no chargesheet filed, and assert the accused\'s statutory right to bail.',
    relevant_sections: ['Section 479 BNSS', 'Section 167(2) CrPC (old cases)'],
  },

  {
    id: 'discharge_application',
    name: 'Application for Discharge',
    description: 'Application by accused to be discharged from the case before framing of charges, if no prima facie case exists.',
    category: ['criminal'],
    stage: 'initiation',
    format: 'application',
    filing_guide: {
      who_files: 'Accused person\'s advocate',
      when_to_file: 'After chargesheet is filed and before charges are framed by the court',
      key_contents: ['Details of chargesheet and offences alleged', 'Grounds — no prima facie case, lack of evidence, false implication', 'Reference to Supreme Court tests for discharge', 'Prayer for discharge'],
      supporting_docs: ['Copy of chargesheet', 'Documents relied upon in chargesheet'],
      tips: ['Supreme Court test: "double presumption" — not whether accused committed offence but whether prima facie case exists', 'Cite P. Vijayan v State of Kerala (2010) 2 SCC 398', 'Point out missing essential ingredients of the offence'],
    },
    ai_prompt_hint: 'Draft an application for discharge under Section 250 BNSS. Argue that no prima facie case is made out, the evidence is insufficient, and the accused should be discharged before charges are framed.',
    relevant_sections: ['Section 250 BNSS', 'Section 227 CrPC (old cases)'],
  },

  {
    id: 'quashing_petition',
    name: 'Petition to Quash FIR (Section 528 BNSS)',
    description: 'Petition under Section 528 BNSS (formerly Section 482 CrPC) to quash an FIR or criminal proceedings as abuse of process of law.',
    category: ['criminal', 'constitutional'],
    stage: 'initiation',
    format: 'petition',
    filing_guide: {
      who_files: 'Accused / aggrieved person\'s advocate — filed in High Court',
      when_to_file: 'After FIR is registered but before conviction',
      key_contents: ['FIR details — number, date, police station, sections', 'Facts and background of case', 'Grounds for quashing: no offence disclosed, civil dispute, settlement reached, false complaint, abuse of process', 'Prayer to quash FIR and all proceedings'],
      supporting_docs: ['Copy of FIR', 'Settlement deed (if compromise ground)', 'Documents showing civil nature of dispute'],
      tips: ['Cite State of Haryana v Bhajan Lal — 7 categories where HC can quash', 'For cheque dishonour — settlement between parties is strong ground', 'Avoid delay — file promptly after FIR', 'For family disputes — cite tendency of courts to quash when parties compromise'],
    },
    ai_prompt_hint: 'Draft a petition under Section 528 BNSS to quash the FIR. Establish the grounds for quashing — either that no offence is disclosed, the complaint is an abuse of process, or parties have reached a settlement. Cite Bhajan Lal categories.',
    relevant_sections: ['Section 528 BNSS', 'Section 482 CrPC (old cases)', 'State of Haryana v Bhajan Lal AIR 1992 SC 604'],
  },

  {
    id: 'revision_petition_criminal',
    name: 'Criminal Revision Petition',
    description: 'Petition to the Sessions Court or High Court to revise an order of a subordinate criminal court.',
    category: ['criminal'],
    stage: 'appeal',
    format: 'petition',
    filing_guide: {
      who_files: 'Aggrieved party\'s advocate',
      when_to_file: 'Within 90 days of the impugned order',
      key_contents: ['Details of impugned order (court, date, nature)', 'Grounds of revision — illegality, impropriety, incorrectness', 'Prayer to set aside or modify the order'],
      supporting_docs: ['Certified copy of impugned order', 'Certified copy of proceedings below'],
      time_limit: '90 days from order',
      tips: ['Revision lies against interlocutory orders — not appealable orders', 'High Court has wider revisional powers than Sessions Court'],
    },
    ai_prompt_hint: 'Draft a criminal revision petition challenging an order of the lower court. Identify the errors of law, illegality, or impropriety in the impugned order and pray for its revision or setting aside.',
    relevant_sections: ['Section 442 BNSS', 'Section 397 CrPC (old)'],
  },

  {
    id: 'criminal_appeal',
    name: 'Criminal Appeal',
    description: 'Appeal against conviction, acquittal, or sentence to Sessions Court, High Court, or Supreme Court.',
    category: ['criminal'],
    stage: 'appeal',
    format: 'petition',
    filing_guide: {
      who_files: 'Convicted accused (against conviction/sentence) or State (against acquittal)',
      when_to_file: 'Within 30 days from date of judgment (60 days for appeal against acquittal)',
      key_contents: ['Details of judgment appealed against', 'Grounds of appeal — errors of fact, law, or mixed', 'Prayer to acquit / reduce sentence / order retrial'],
      supporting_docs: ['Certified copy of judgment', 'Certified copy of evidence / proceedings'],
      time_limit: '30 days (conviction) / 60 days (acquittal)',
      tips: ['For delay in filing — file condonation of delay application with reasons'],
    },
    ai_prompt_hint: 'Draft a criminal appeal challenging the judgment of conviction/acquittal. Identify specific grounds — misappreciation of evidence, wrong application of law, procedural irregularity — and pray for acquittal or reduction of sentence.',
    relevant_sections: ['Section 415 BNSS', 'Section 374 CrPC (old)'],
  },

  {
    id: 'slp_criminal',
    name: 'Special Leave Petition (Criminal)',
    description: 'SLP to the Supreme Court of India under Article 136 of the Constitution challenging any criminal judgment/order.',
    category: ['criminal', 'constitutional'],
    stage: 'appeal',
    format: 'petition',
    court_fee: '₹200 + process fee',
    filing_guide: {
      who_files: 'Aggrieved party\'s advocate — filed in Supreme Court',
      when_to_file: 'Within 90 days of impugned High Court judgment',
      key_contents: ['Details of impugned judgment and court', 'Questions of law of general public importance', 'Grounds — substantial question of law, HC error, constitutional question', 'Prayer for grant of SLP and stay of sentence/order'],
      supporting_docs: ['Certified copy of HC judgment', 'Certified copies of all lower court orders', 'Vakalatnama before SC'],
      time_limit: '90 days from HC judgment',
      tips: ['SLP is discretionary — frame compelling questions of law', 'SC prefers questions of general importance, not purely factual disputes', 'File stay application along with SLP if accused is in custody'],
    },
    ai_prompt_hint: 'Draft a Special Leave Petition under Article 136 challenging a High Court judgment. Frame specific questions of law, identify the substantial legal error in the impugned judgment, and pray for grant of leave and stay of sentence.',
    relevant_sections: ['Article 136 Constitution of India', 'Supreme Court Rules 2013'],
  },

  // ══ CIVIL FILINGS ══════════════════════════════════════════

  {
    id: 'civil_suit_plaint',
    name: 'Civil Suit — Plaint',
    description: 'Plaint to initiate a civil suit for recovery of money, specific performance, injunction, declaration, or other civil relief.',
    category: ['civil', 'commercial'],
    stage: 'initiation',
    format: 'petition',
    court_fee: 'Ad valorem — based on relief claimed',
    filing_guide: {
      who_files: 'Plaintiff\'s advocate',
      when_to_file: 'Within limitation period — 3 years (money recovery), 12 years (immovable property)',
      key_contents: ['Plaintiff and defendant details', 'Cause of action and date it arose', 'Jurisdiction — territorial, pecuniary, subject matter', 'Facts pleaded in detail', 'Documents relied upon', 'Relief claimed — specific and in the alternative', 'Valuation for court fee'],
      supporting_docs: ['All documents supporting the claim', 'Agreement / contract', 'Notice / correspondence', 'Certificates / title deeds'],
      time_limit: '3 years (money/tort), 12 years (property)',
      tips: ['Verify pecuniary jurisdiction — do not over/under value', 'Plaint must show cause of action within jurisdiction of court', 'Attach verification affidavit as required by Order VI Rule 15A CPC'],
    },
    ai_prompt_hint: 'Draft a civil plaint for the plaintiff. Include parties, jurisdiction, detailed facts, cause of action, documents relied upon, and specific prayers for relief. Structure it per Order VII CPC.',
    relevant_sections: ['Order VII CPC', 'Limitation Act 1963'],
  },

  {
    id: 'written_statement',
    name: 'Written Statement',
    description: 'Defendant\'s reply to the plaint — admissions, denials, and additional defences.',
    category: ['civil', 'commercial', 'family'],
    stage: 'initiation',
    format: 'written_statement',
    filing_guide: {
      who_files: 'Defendant\'s advocate',
      when_to_file: 'Within 30 days of service of summons (extendable to 90 days by court)',
      key_contents: ['Preliminary objections — jurisdiction, limitation, maintainability', 'Admission and denial of each paragraph of plaint', 'Additional facts constituting defence', 'Set off or counter claim if any', 'Prayer to dismiss the suit'],
      supporting_docs: ['Documents supporting the defence', 'Receipts, agreements, correspondence'],
      time_limit: '30 days (extendable to 90 days max)',
      tips: ['Non-traversal of a fact in plaint = deemed admission', 'File within 30 days to avoid cost imposition', 'Include all defences — cannot introduce new defences later without amendment'],
    },
    ai_prompt_hint: 'Draft a written statement responding to the plaint. Raise preliminary objections, traverse each allegation with specific admissions or denials, state additional defences, and pray for dismissal of the suit.',
    relevant_sections: ['Order VIII CPC'],
  },

  {
    id: 'interim_injunction',
    name: 'Application for Interim Injunction',
    description: 'Application under Order XXXIX Rules 1 & 2 CPC for temporary injunction to maintain status quo or restrain the defendant during pendency of suit.',
    category: ['civil', 'commercial', 'family'],
    stage: 'interim',
    format: 'application',
    filing_guide: {
      who_files: 'Plaintiff\'s advocate',
      when_to_file: 'Along with or after filing the suit — urgently if immediate harm threatened',
      key_contents: ['Prima facie case — likelihood of success', 'Balance of convenience — more harm to plaintiff if refused', 'Irreparable injury — harm not compensable in money', 'Specific reliefs sought — what should be restrained', 'Undertaking as to damages'],
      supporting_docs: ['Documents establishing prima facie case', 'Affidavit verifying facts', 'Valuation of damages (if any)'],
      tips: ['Three-pronged test: prima facie case + balance of convenience + irreparable injury (American Cyanamid test as adopted in India)', 'Cite Gujarat Bottling v Coca-Cola (1995) 5 SCC 545', 'File urgently — delay weakens the application'],
    },
    ai_prompt_hint: 'Draft an application for interim injunction under Order XXXIX Rules 1 & 2 CPC. Establish the three tests: prima facie case, balance of convenience, and irreparable injury. Seek specific injunctive relief and offer undertaking as to damages.',
    relevant_sections: ['Order XXXIX Rules 1-2 CPC', 'Section 94 CPC'],
  },

  {
    id: 'execution_petition',
    name: 'Execution Petition / Decree Execution',
    description: 'Petition to execute a court decree — for payment of money, delivery of property, or specific acts.',
    category: ['civil', 'commercial'],
    stage: 'execution',
    format: 'petition',
    filing_guide: {
      who_files: 'Decree holder\'s advocate',
      when_to_file: 'Within 12 years from date of decree',
      key_contents: ['Details of decree — court, date, decree number', 'Amount or relief remaining unsatisfied', 'Mode of execution sought — attachment, arrest, sale of property', 'Judgment debtor\'s assets (if known)'],
      supporting_docs: ['Certified copy of decree', 'Certificate of non-satisfaction'],
      time_limit: '12 years from date of decree',
      tips: ['Identify judgment debtor\'s assets before filing', 'For money decrees — attach bank accounts or property', 'Judgment debtor can raise objections under Section 47 CPC'],
    },
    ai_prompt_hint: 'Draft an execution petition for a money/property decree. Identify the decree details, amount remaining unsatisfied, judgment debtor\'s known assets, and mode of execution sought.',
    relevant_sections: ['Order XXI CPC', 'Section 36 CPC'],
  },

  {
    id: 'slp_civil',
    name: 'Special Leave Petition (Civil)',
    description: 'SLP to the Supreme Court under Article 136 challenging any civil judgment or order.',
    category: ['civil', 'constitutional', 'commercial'],
    stage: 'appeal',
    format: 'petition',
    court_fee: '₹200',
    filing_guide: {
      who_files: 'Aggrieved party\'s advocate — filed in Supreme Court',
      when_to_file: 'Within 90 days of HC judgment (30 days for orders in interlocutory matters)',
      key_contents: ['Impugned judgment details', 'Questions of law', 'Grounds of challenge', 'Prayer for stay of operation of judgment'],
      supporting_docs: ['Certified copy of HC judgment', 'All lower court orders'],
      time_limit: '90 days from HC order',
      tips: ['Frame 2-3 sharp questions of law', 'File IA for stay simultaneously', 'Civil SLPs are subject to strict scrutiny on limitation'],
    },
    ai_prompt_hint: 'Draft a civil Special Leave Petition under Article 136. Frame the questions of law, identify the HC error, and pray for grant of leave and stay of the impugned judgment.',
    relevant_sections: ['Article 136 Constitution of India'],
  },

  // ══ CONSTITUTIONAL FILINGS ══════════════════════════════════

  {
    id: 'writ_hc',
    name: 'Writ Petition (High Court)',
    description: 'Petition under Article 226 of the Constitution for writs — Habeas Corpus, Mandamus, Certiorari, Prohibition, or Quo Warranto.',
    category: ['constitutional', 'criminal', 'civil', 'labour', 'revenue'],
    stage: 'initiation',
    format: 'petition',
    court_fee: '₹100–₹500 depending on writ type',
    filing_guide: {
      who_files: 'Aggrieved person\'s advocate — filed in High Court',
      when_to_file: 'As soon as the violation of fundamental right or legal right occurs — no fixed limitation but delay can be fatal',
      key_contents: ['Petitioner and respondent details (include State/Government authorities)', 'Nature of writ sought and basis', 'Facts establishing violation of fundamental right or legal right', 'Impugned order/action/inaction of respondent', 'Constitutional provisions violated', 'Prayer for specific writ and relief'],
      supporting_docs: ['Impugned order (if any)', 'Prior representations to authority (mandatory for Mandamus)', 'Supporting affidavit', 'Documents establishing standing'],
      tips: ['For Mandamus — mandatory to show prior demand and refusal', 'For Certiorari — challenge quasi-judicial orders', 'For Habeas Corpus — challenge illegal detention with body produced', 'File supporting affidavit verifying all facts', 'Laches (delay) can defeat the writ — file promptly'],
    },
    ai_prompt_hint: 'Draft a writ petition under Article 226 seeking the specified writ. Identify the constitutional/legal right violated, the respondent authority, the impugned action/inaction, and specific prayers for writs of Mandamus/Certiorari/Habeas Corpus etc.',
    relevant_sections: ['Article 226 Constitution of India'],
  },

  {
    id: 'writ_sc',
    name: 'Writ Petition (Supreme Court)',
    description: 'Petition under Article 32 of the Constitution — for enforcement of fundamental rights only.',
    category: ['constitutional'],
    stage: 'initiation',
    format: 'petition',
    court_fee: '₹200',
    filing_guide: {
      who_files: 'Aggrieved person\'s advocate — filed in Supreme Court',
      when_to_file: 'When fundamental rights are directly violated — no limitation period',
      key_contents: ['Fundamental rights violated (specify Articles — 14, 19, 21, etc.)', 'State action causing violation', 'Facts and circumstances', 'Prayer for enforcement of fundamental rights'],
      supporting_docs: ['All documents establishing violation', 'Prior HC proceedings (if any)'],
      tips: ['Article 32 only for fundamental rights — not for ordinary legal rights (use HC Article 226)', 'SC prefers HC to be approached first unless urgency', 'For custodial deaths, sexual assault in custody — direct SC filing justified'],
    },
    ai_prompt_hint: 'Draft a writ petition under Article 32 of the Constitution. Specify the fundamental rights violated, the state action causing violation, and pray for enforcement of rights and relief against the respondent.',
    relevant_sections: ['Article 32 Constitution of India', 'Article 14, 19, 21'],
  },

  {
    id: 'pil',
    name: 'Public Interest Litigation (PIL)',
    description: 'Petition in public interest by any person or organisation — for enforcement of rights of disadvantaged sections or matters of public importance.',
    category: ['constitutional'],
    stage: 'initiation',
    format: 'petition',
    filing_guide: {
      who_files: 'Any public-spirited person or organisation — need not be directly aggrieved',
      when_to_file: 'No fixed limitation — must be in public interest, not private interest',
      key_contents: ['Public interest issue being raised', 'Petitioner\'s locus standi as public-spirited citizen', 'Facts and data establishing the public issue', 'Respondent authorities and their inaction', 'Prayers for directions to authorities'],
      supporting_docs: ['News reports, government data, RTI responses', 'Expert reports or affidavits', 'Photographs / evidence of the issue'],
      tips: ['PIL is not for private grievances — court will reject misuse', 'Attach credible documentary evidence of the issue', 'Be prepared to conduct the case pro bono or at nominal fee', 'Court may appoint amicus curiae in complex PILs'],
    },
    ai_prompt_hint: 'Draft a Public Interest Litigation petition. Establish the public interest issue, petitioner\'s locus, factual basis for the petition, respondent authorities\' inaction, and prayers for specific directions.',
    relevant_sections: ['Article 32 / 226 Constitution of India'],
  },

  // ══ FAMILY LAW FILINGS ══════════════════════════════════════

  {
    id: 'divorce_petition',
    name: 'Divorce Petition',
    description: 'Petition for dissolution of marriage under applicable personal law or Special Marriage Act.',
    category: ['family'],
    stage: 'initiation',
    format: 'petition',
    filing_guide: {
      who_files: 'Either spouse\'s advocate',
      when_to_file: '1 year after marriage (for contested divorce under Hindu Marriage Act)',
      key_contents: ['Marriage details — date, place, registration', 'Grounds for divorce — cruelty, desertion, adultery, conversion, etc.', 'Children details (if any)', 'Matrimonial home details', 'Prayer for divorce and ancillary reliefs (maintenance, custody)'],
      supporting_docs: ['Marriage certificate', 'Identity proofs', 'Photographs of marriage', 'Evidence supporting grounds'],
      time_limit: 'Cannot file within 1 year of marriage (except for exceptional hardship)',
      tips: ['File in family court having jurisdiction — place of marriage or where parties last lived together', 'Separate maintenance application can be filed simultaneously', 'Mediation referral is mandatory in most courts before contested hearing'],
    },
    ai_prompt_hint: 'Draft a divorce petition under the applicable personal law. Include marriage details, grounds for divorce with supporting facts, details of children, and prayers for divorce with ancillary reliefs.',
    relevant_sections: ['Section 13 Hindu Marriage Act 1955', 'Section 27 Special Marriage Act 1954'],
  },

  {
    id: 'maintenance_application',
    name: 'Maintenance Application',
    description: 'Application for maintenance — under Section 125 BNSS (formerly 125 CrPC) or personal law — for wife, children, or parents.',
    category: ['family'],
    stage: 'interim',
    format: 'application',
    filing_guide: {
      who_files: 'Spouse / child / parent\'s advocate',
      when_to_file: 'Any time — no limitation',
      key_contents: ['Relationship with respondent', 'Respondent\'s income and means', 'Applicant\'s needs and expenses', 'Children\'s needs (if applicable)', 'Prayer for interim and permanent maintenance'],
      supporting_docs: ['Marriage certificate', 'Income proof of respondent (salary slips, IT returns)', 'Evidence of applicant\'s expenses', 'Children\'s school fee receipts'],
      tips: ['Under Section 125 BNSS — secular law, applies to all religions', 'For higher maintenance — file under personal law or DV Act', 'Courts consider standard of living during marriage', 'File interim maintenance application simultaneously'],
    },
    ai_prompt_hint: 'Draft a maintenance application under Section 125 BNSS. Establish the relationship, respondent\'s income and financial capacity, applicant\'s needs and inability to maintain themselves, and pray for interim and permanent maintenance.',
    relevant_sections: ['Section 125 BNSS', 'Section 24 Hindu Marriage Act', 'Domestic Violence Act 2005'],
  },

  {
    id: 'child_custody',
    name: 'Child Custody Petition',
    description: 'Petition for custody, guardianship, or visitation rights of minor children.',
    category: ['family'],
    stage: 'initiation',
    format: 'petition',
    filing_guide: {
      who_files: 'Parent or guardian\'s advocate',
      when_to_file: 'Any time — urgency application can seek immediate custody',
      key_contents: ['Child\'s details — name, age, education', 'Current custody arrangement', 'Grounds for custody — best interest of child', 'Petitioner\'s capacity to provide for child', 'Prayer for custody with specific visitation schedule'],
      supporting_docs: ['Child\'s birth certificate', 'School records', 'Medical records', 'Evidence of current living conditions'],
      tips: ['Paramount consideration is "best interest of the child"', 'Courts prefer not to disturb settled custody unless compelling reasons', 'Psychologist report may help establish child\'s preference', 'For children below 5 — courts generally favour mother'],
    },
    ai_prompt_hint: 'Draft a child custody petition. Establish the child\'s current situation, the petitioner\'s capacity and suitability as a parent, the best interest of the child, and specific prayers for custody with proposed visitation arrangement.',
    relevant_sections: ['Guardians and Wards Act 1890', 'Section 26 Hindu Marriage Act'],
  },

  // ══ COMMERCIAL / COMPANY FILINGS ════════════════════════════

  {
    id: 'cheque_dishonour',
    name: 'Cheque Dishonour Complaint (Section 138 NI Act)',
    description: 'Criminal complaint for dishonour of cheque under Section 138 of Negotiable Instruments Act.',
    category: ['commercial', 'criminal'],
    stage: 'initiation',
    format: 'petition',
    filing_guide: {
      who_files: 'Payee / complainant\'s advocate',
      when_to_file: 'Within 30 days of receiving bank\'s memo of return',
      key_contents: ['Cheque details — number, date, amount, bank', 'Legal demand notice details (sent within 30 days of dishonour)', 'Accused\'s failure to pay within 15 days of notice', 'Prayer for conviction and compensation'],
      supporting_docs: ['Original dishonoured cheque', 'Bank\'s return memo', 'Legal notice copy', 'Postal acknowledgment of notice', 'Account statement'],
      time_limit: '30 days from bank\'s memo of return; legal notice must be sent within 30 days of dishonour, complaint within 30 days of expiry of 15-day notice period',
      tips: ['Strict timeline — one day\'s delay is fatal', 'Send demand notice by registered post + courier', 'Accused must have "legally enforceable debt" — note by note analysis', 'For amendment in cheque — separate complaint for each cheque'],
    },
    ai_prompt_hint: 'Draft a complaint under Section 138 NI Act for dishonour of cheque. Include cheque details, bank return memo, legal notice facts, accused\'s failure to pay, and prayer for conviction with compensation under Section 357 BNSS.',
    relevant_sections: ['Section 138 Negotiable Instruments Act', 'Section 141 NI Act (company liability)'],
  },

  {
    id: 'insolvency_application',
    name: 'Insolvency Application (IBC)',
    description: 'Application before NCLT under Insolvency and Bankruptcy Code 2016 — by financial or operational creditor, or corporate debtor itself.',
    category: ['commercial'],
    stage: 'initiation',
    format: 'petition',
    court_fee: '₹25,000 (financial creditor) / ₹2,000 (operational creditor)',
    filing_guide: {
      who_files: 'Financial creditor, operational creditor, or corporate debtor\'s advocate',
      when_to_file: 'When default exceeds ₹1 crore (financial creditor) or ₹1 lakh (operational creditor)',
      key_contents: ['Default details — amount, date of default', 'Proof of debt and default', 'Record of default (CIBIL/credit information)', 'Proposed insolvency professional'],
      supporting_docs: ['Loan agreement / invoice', 'Bank statement showing default', 'Demand notice and acknowledgment', 'Financial statements of corporate debtor'],
      time_limit: 'Limitation under Article 137 — within 3 years of default',
      tips: ['Minimum default amount is ₹1 crore post-COVID amendment', 'NCLT must admit or reject within 14 days of filing', 'Attach record of default from IU (Information Utility) if available'],
    },
    ai_prompt_hint: 'Draft an application under Section 7 (financial creditor) or Section 9 (operational creditor) of IBC 2016. Establish the debt, default, and pray for initiation of Corporate Insolvency Resolution Process (CIRP).',
    relevant_sections: ['Section 7 IBC (Financial Creditor)', 'Section 9 IBC (Operational Creditor)', 'Section 10 IBC (Corporate Debtor)'],
  },

  // ══ LABOUR / EMPLOYMENT FILINGS ════════════════════════════

  {
    id: 'writ_service_matters',
    name: 'Writ Petition — Service Matters',
    description: 'Writ petition challenging illegal termination, denial of promotion, wrongful suspension, or other service matter disputes of government employees.',
    category: ['labour', 'constitutional'],
    stage: 'initiation',
    format: 'petition',
    filing_guide: {
      who_files: 'Government employee / ex-employee\'s advocate',
      when_to_file: 'Within reasonable time — delay can defeat the writ',
      key_contents: ['Employee\'s service details — designation, department, date of joining', 'Impugned action — termination order, suspension, denial of promotion', 'Violation of natural justice principles (audi alteram partem)', 'Prayer to quash impugned order and reinstate'],
      supporting_docs: ['Service records and appointment letter', 'Impugned order', 'Departmental inquiry report', 'Show cause notice and reply'],
      tips: ['CAT (Central Administrative Tribunal) has jurisdiction for Central Government employees — file there first', 'For State employees — file in HC directly', 'Raise violation of natural justice — not given opportunity to be heard'],
    },
    ai_prompt_hint: 'Draft a writ petition in a service matter challenging an illegal termination/suspension order. Establish service details, the impugned order, violation of natural justice, and pray to quash the order and reinstate the petitioner.',
    relevant_sections: ['Article 226 Constitution', 'Article 311 Constitution'],
  },

  // ══ MOTOR ACCIDENT / TORT ═══════════════════════════════════

  {
    id: 'mact_claim',
    name: 'Motor Accident Claim Petition (MACT)',
    description: 'Claim petition before Motor Accident Claims Tribunal for compensation for death or injury in motor vehicle accident.',
    category: ['motor_accident'],
    stage: 'initiation',
    format: 'petition',
    filing_guide: {
      who_files: 'Victim / legal heirs\' advocate',
      when_to_file: 'Within 6 months of accident (tribunal can condone delay for sufficient cause)',
      key_contents: ['Accident details — date, place, vehicles involved', 'Nature and extent of injuries / death', 'Loss of income and future earning capacity', 'Medical expenses incurred and future treatment', 'Respondents — driver, owner, insurance company'],
      supporting_docs: ['FIR / police report', 'Medical records and bills', 'Post-mortem report (death cases)', 'Salary/income proof of deceased/injured', 'Driving licence and RC of offending vehicle', 'Insurance policy of offending vehicle'],
      time_limit: '6 months (can be condoned)',
      tips: ['Structured formula method or conventional method for compensation calculation', 'Multiplier method for death cases — age-based multiplier from SC schedule', 'Add future medical expenses, pain and suffering, loss of consortium', 'Insurance company cannot escape liability if insurance valid'],
    },
    ai_prompt_hint: 'Draft a MACT claim petition for compensation. Include accident details, injuries/death sustained, loss of income using multiplier method, medical expenses, and pray for compensation against driver, owner and insurer with 9% interest.',
    relevant_sections: ['Section 166 Motor Vehicles Act 1988', 'Section 140 MV Act (no-fault liability)'],
  },

  // ══ MISCELLANEOUS / GENERAL ══════════════════════════════════

  {
    id: 'contempt_petition',
    name: 'Contempt Petition',
    description: 'Petition for civil or criminal contempt of court against a person who wilfully disobeys a court order.',
    category: ['civil', 'constitutional', 'general'],
    stage: 'miscellaneous',
    format: 'petition',
    filing_guide: {
      who_files: 'Aggrieved party\'s advocate — with prior consent of AG/Advocate General for criminal contempt',
      when_to_file: 'Within 1 year of contemptuous act',
      key_contents: ['Details of court order disobeyed', 'Nature of contempt — wilful disobedience', 'Evidence of non-compliance', 'Prayer for punishment and compliance'],
      supporting_docs: ['Certified copy of order', 'Evidence of non-compliance', 'Affidavit of complainant'],
      time_limit: '1 year from act of contempt',
      tips: ['Criminal contempt — AG consent required for filing by private party', 'Civil contempt — no AG consent needed', 'Cite Mohd. Aslam v Union of India on contempt power'],
    },
    ai_prompt_hint: 'Draft a contempt petition. Identify the specific court order disobeyed, establish wilful non-compliance by the respondent, and pray for initiation of contempt proceedings and compliance with the order.',
    relevant_sections: ['Contempt of Courts Act 1971', 'Article 129 / 215 Constitution'],
  },

  {
    id: 'stay_application',
    name: 'Stay / Suspension Application',
    description: 'Application to stay operation of a lower court order, decree, or executive action pending appeal or challenge.',
    category: ['civil', 'criminal', 'general'],
    stage: 'interim',
    format: 'application',
    filing_guide: {
      who_files: 'Appellant / petitioner\'s advocate',
      when_to_file: 'Simultaneously with the main petition/appeal',
      key_contents: ['Details of order sought to be stayed', 'Grounds for stay — prima facie case, balance of convenience, irreparable injury', 'Urgency (if any)', 'Undertaking not to alienate assets (if property dispute)'],
      supporting_docs: ['Copy of impugned order', 'Grounds of challenge'],
      tips: ['Always file stay along with main petition for maximum protection', 'Court may stay only operation, not the order itself', 'For criminal cases — stay of sentence requires strong grounds'],
    },
    ai_prompt_hint: 'Draft an application for stay of a lower court order/decree. Establish prima facie case in the main matter, balance of convenience favouring the applicant, and irreparable injury if stay not granted.',
    relevant_sections: ['Order XLI Rule 5 CPC (civil)', 'Section 389 BNSS (criminal sentence)'],
  },

  {
    id: 'condonation_of_delay',
    name: 'Condonation of Delay Application',
    description: 'Application under Section 5 of Limitation Act to condone delay in filing an appeal, revision, or any proceeding.',
    category: ['civil', 'criminal', 'general'],
    stage: 'miscellaneous',
    format: 'application',
    filing_guide: {
      who_files: 'Applicant\'s advocate — filed along with delayed petition/appeal',
      when_to_file: 'With the main petition when filed beyond limitation period',
      key_contents: ['Date of impugned order', 'Date of filing the petition (showing delay)', 'Day-by-day explanation of delay', 'Sufficient cause — illness, ignorance, wrong advice, etc.', 'Prayer to condone delay'],
      supporting_docs: ['Medical certificates (if illness ground)', 'Documents explaining delay', 'Affidavit of applicant'],
      tips: ['Court is liberal with government / public authorities — not so with private parties', 'Explain every single day of delay — gaps in explanation are fatal', 'Supreme Court: sufficient cause must be genuine, not negligence'],
    },
    ai_prompt_hint: 'Draft a condonation of delay application under Section 5 Limitation Act. Give a day-by-day explanation of the delay with genuine cause, and pray for condonation to allow the main petition to be heard.',
    relevant_sections: ['Section 5 Limitation Act 1963'],
  },

  {
    id: 'amendment_application',
    name: 'Amendment Application',
    description: 'Application to amend a plaint, written statement, or petition to correct or add facts.',
    category: ['civil', 'general'],
    stage: 'miscellaneous',
    format: 'application',
    filing_guide: {
      who_files: 'Either party\'s advocate',
      when_to_file: 'Any time before decree — the earlier the better',
      key_contents: ['Details of proposed amendment', 'Reason for amendment — new facts discovered, error, change of law', 'How amendment is necessary for just decision', 'That amendment does not change nature of suit'],
      supporting_docs: ['Draft amended plaint/written statement'],
      tips: ['Amendment to add new cause of action after limitation — courts are cautious', 'Amendment should not prejudice the other side unfairly', 'New evidence discovered can be ground for amendment'],
    },
    ai_prompt_hint: 'Draft an amendment application under Order VI Rule 17 CPC. Specify the proposed amendments, reasons they are necessary, and argue that the amendment will assist in effective adjudication without prejudicing the other party.',
    relevant_sections: ['Order VI Rule 17 CPC'],
  },

  {
    id: 'rtl_application',
    name: 'Application for Certified Copy',
    description: 'Application for certified copies of orders, judgments, or proceedings from court record.',
    category: ['general'],
    stage: 'miscellaneous',
    format: 'application',
    filing_guide: {
      who_files: 'Any party or their advocate',
      when_to_file: 'Any time after the order is pronounced',
      key_contents: ['Case number and title', 'Date of order/judgment required', 'Number of certified copies required', 'Purpose (appeal, execution, etc.)'],
      supporting_docs: ['Court fee for certified copy', 'Identity proof (in some courts)'],
      tips: ['Urgent certified copies are available at higher fee', 'Required for filing appeals — cannot file appeal without certified copy', 'Processing time: 1-7 days depending on court'],
    },
    ai_prompt_hint: 'Draft an application for certified copy of court order. Specify the case details, order date, purpose, and number of copies required.',
    relevant_sections: ['Order VII Rule 9 CPC', 'Supreme Court Rules 2013'],
  },
];

// ── Helper functions ───────────────────────────────────────────

export const CASE_CATEGORIES: { id: CaseCategory; label: string; emoji: string; color: string; bg: string }[] = [
  { id: 'criminal',       label: 'Criminal',        emoji: '⚖️', color: '#93000a', bg: '#ffdad6' },
  { id: 'civil',          label: 'Civil',           emoji: '📜', color: '#022448', bg: '#d5e3ff' },
  { id: 'constitutional', label: 'Constitutional',  emoji: '🏛', color: '#5b21b6', bg: '#ede9fe' },
  { id: 'family',         label: 'Family',          emoji: '👨‍👩‍👧', color: '#15803d', bg: '#dcfce7' },
  { id: 'commercial',     label: 'Commercial',      emoji: '💼', color: '#735c00', bg: '#ffe088' },
  { id: 'labour',         label: 'Labour',          emoji: '🔧', color: '#c2410c', bg: '#fff7ed' },
  { id: 'revenue',        label: 'Revenue / Tax',   emoji: '🏦', color: '#1d4ed8', bg: '#dbeafe' },
  { id: 'motor_accident', label: 'Motor Accident',  emoji: '🚗', color: '#b45309', bg: '#fef3c7' },
  { id: 'general',        label: 'General',         emoji: '📋', color: '#43474e', bg: '#edeef0' },
];

export const FILING_STAGES: { id: FilingStage; label: string }[] = [
  { id: 'initiation',   label: 'Initiation / Filing' },
  { id: 'interim',      label: 'Interim Relief' },
  { id: 'evidence',     label: 'Evidence Stage' },
  { id: 'arguments',    label: 'Arguments' },
  { id: 'appeal',       label: 'Appeal / Revision' },
  { id: 'execution',    label: 'Execution' },
  { id: 'miscellaneous',label: 'Miscellaneous' },
];

export function getFilingsForCategory(category: CaseCategory): Filing[] {
  return FILINGS.filter(f => f.category.includes(category));
}

export function getFilingsForJurisdiction(jurisdictionId: string, category?: CaseCategory): Filing[] {
  const jurisdiction = JURISDICTIONS.find(j => j.id === jurisdictionId);
  if (!jurisdiction) return [];
  return FILINGS.filter(f =>
    (!category || f.category.includes(category)) &&
    f.category.some(c => jurisdiction.filing_categories.includes(c))
  );
}

export function searchFilings(query: string): Filing[] {
  const q = query.toLowerCase();
  return FILINGS.filter(f =>
    f.name.toLowerCase().includes(q) ||
    f.description.toLowerCase().includes(q) ||
    f.relevant_sections?.some(s => s.toLowerCase().includes(q))
  );
}
