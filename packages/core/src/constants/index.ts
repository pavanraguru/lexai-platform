// ============================================================
// LexAI India — Indian Legal Context Constants
// PRD v1.1 Section 9 — Court Taxonomy, Statutes, Evidence
// ============================================================

export const INDIAN_COURTS = {
  'Supreme Court of India': {
    level: 'supreme_court' as const,
    address_as: 'My Lord',
    state: null,
    language: 'english_only' as const,
  },
  'Delhi High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Delhi', language: 'english_only' as const },
  'Bombay High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Maharashtra', language: 'english_only' as const },
  'Madras High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Tamil Nadu', language: 'english_only' as const },
  'Calcutta High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'West Bengal', language: 'english_only' as const },
  'Allahabad High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Uttar Pradesh', language: 'english_and_hindi' as const },
  'Karnataka High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Karnataka', language: 'english_only' as const },
  'Kerala High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Kerala', language: 'english_only' as const },
  'Gujarat High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Gujarat', language: 'english_only' as const },
  'Rajasthan High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Rajasthan', language: 'english_and_hindi' as const },
  'Madhya Pradesh High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Madhya Pradesh', language: 'english_and_hindi' as const },
  'Patna High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Bihar', language: 'english_only' as const },
  'Orissa High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Odisha', language: 'english_only' as const },
  'Punjab & Haryana High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Punjab/Haryana', language: 'english_only' as const },
  'Telangana High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Telangana', language: 'english_only' as const },
  'Andhra Pradesh High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Andhra Pradesh', language: 'english_only' as const },
  'Gauhati High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Assam', language: 'english_only' as const },
  'Jharkhand High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Jharkhand', language: 'english_only' as const },
  'Uttarakhand High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Uttarakhand', language: 'english_only' as const },
  'Chhattisgarh High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Chhattisgarh', language: 'english_only' as const },
  'Himachal Pradesh High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Himachal Pradesh', language: 'english_only' as const },
  'Jammu & Kashmir High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'J&K', language: 'english_only' as const },
  'Manipur High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Manipur', language: 'english_only' as const },
  'Meghalaya High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Meghalaya', language: 'english_only' as const },
  'Sikkim High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Sikkim', language: 'english_only' as const },
  'Tripura High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Tripura', language: 'english_only' as const },
  // Tribunals
  'NCLT Mumbai Bench': { level: 'tribunal' as const, address_as: 'Honourable Member', state: 'Maharashtra', language: 'english_only' as const },
  'NCLT Delhi Bench': { level: 'tribunal' as const, address_as: 'Honourable Member', state: 'Delhi', language: 'english_only' as const },
  'NCLAT': { level: 'tribunal' as const, address_as: 'Honourable Member', state: null, language: 'english_only' as const },
  'DRT Mumbai': { level: 'tribunal' as const, address_as: 'Honourable Presiding Officer', state: 'Maharashtra', language: 'english_only' as const },
  'DRT Delhi': { level: 'tribunal' as const, address_as: 'Honourable Presiding Officer', state: 'Delhi', language: 'english_only' as const },
  'ITAT Delhi Bench': { level: 'tribunal' as const, address_as: 'Honourable Member', state: 'Delhi', language: 'english_only' as const },
  // District Courts
  'Delhi Sessions Court': { level: 'district_court' as const, address_as: 'Your Honour', state: 'Delhi', language: 'english_and_hindi' as const },
  'Delhi District Court': { level: 'district_court' as const, address_as: 'Your Honour', state: 'Delhi', language: 'english_and_hindi' as const },
} as const;

export const INDIAN_STATUTES = [
  { act: 'Bharatiya Nyaya Sanhita, 2023', abbreviation: 'BNS', year: 2023, replaces: 'IPC 1860',
    key_sections: [
      { section: '103', title: 'Murder', notes: 'Equivalent to IPC 302. Punishment: death or life imprisonment.' },
      { section: '105', title: 'Culpable Homicide not amounting to Murder', notes: 'Equivalent to IPC 304.' },
      { section: '64', title: 'Rape', notes: 'Equivalent to IPC 376.' },
      { section: '316', title: 'Cheating', notes: 'Equivalent to IPC 420.' },
      { section: '351', title: 'Criminal Intimidation', notes: 'Equivalent to IPC 503.' },
      { section: '61', title: 'Criminal Conspiracy', notes: 'Equivalent to IPC 120B.' },
      { section: '111', title: 'Organised Crime', notes: 'New section — no IPC equivalent.' },
    ]
  },
  { act: 'Bharatiya Nagarik Suraksha Sanhita, 2023', abbreviation: 'BNSS', year: 2023, replaces: 'CrPC 1973',
    key_sections: [
      { section: '187', title: 'Remand', notes: 'Equivalent to CrPC 167.' },
      { section: '482', title: 'Bail in non-bailable offences', notes: 'Equivalent to CrPC 439.' },
      { section: '528', title: 'High Court inherent powers', notes: 'Equivalent to CrPC 482.' },
      { section: '436', title: 'Bail in bailable offences', notes: 'Equivalent to CrPC 436.' },
    ]
  },
  { act: 'Bharatiya Sakshya Adhiniyam, 2023', abbreviation: 'BSA', year: 2023, replaces: 'Indian Evidence Act 1872',
    key_sections: [
      { section: '57', title: 'Opinion of experts', notes: 'Equivalent to IEA 45.' },
      { section: '65B', title: 'Admissibility of electronic records', notes: 'Equivalent to IEA 65B. Critical for digital evidence.' },
    ]
  },
  { act: 'Indian Penal Code, 1860', abbreviation: 'IPC', year: 1860, replaces: null, notes: 'Use for cases filed before BNS came into force (01 July 2024).' },
  { act: 'Code of Criminal Procedure, 1973', abbreviation: 'CrPC', year: 1973, replaces: null, notes: 'Use for pending cases filed before BNSS.' },
  { act: 'Indian Evidence Act, 1872', abbreviation: 'IEA', year: 1872, replaces: null, notes: 'Use for pending cases.' },
  { act: 'Code of Civil Procedure, 1908', abbreviation: 'CPC', year: 1908, replaces: null,
    key_sections: [
      { section: 'Order 7', title: 'Plaint', notes: 'Essentials of a valid plaint.' },
      { section: 'Order 8', title: 'Written Statement', notes: 'Rules for written statement.' },
      { section: 'Order 39', title: 'Temporary Injunctions', notes: 'Balance of convenience test.' },
      { section: 'Section 9', title: 'Civil court jurisdiction', notes: 'Jurisdiction clause.' },
    ]
  },
  { act: 'Companies Act, 2013', abbreviation: 'CA', year: 2013, replaces: null },
  { act: 'Insolvency and Bankruptcy Code, 2016', abbreviation: 'IBC', year: 2016, replaces: null,
    key_sections: [
      { section: '7', title: 'Financial creditor application', notes: 'Application by financial creditor.' },
      { section: '9', title: 'Operational creditor application', notes: 'Application by operational creditor.' },
      { section: '14', title: 'Moratorium', notes: 'Stay on proceedings once CIRP commences.' },
    ]
  },
  { act: 'Narcotic Drugs and Psychotropic Substances Act, 1985', abbreviation: 'NDPS', year: 1985, replaces: null,
    key_sections: [
      { section: '21', title: 'Punishment for contraband drugs', notes: 'Quantity-based punishment.' },
      { section: '37', title: 'Bail restrictions', notes: 'Bail nearly impossible without court satisfaction.' },
      { section: '50', title: 'Search procedure', notes: 'Mandatory procedure — non-compliance = acquittal.' },
    ]
  },
  { act: 'Negotiable Instruments Act, 1881', abbreviation: 'NIA', year: 1881, replaces: null,
    key_sections: [
      { section: '138', title: 'Cheque dishonour', notes: 'Very high volume cases. Mandatory 30-day notice.' },
      { section: '141', title: 'Liability of company', notes: 'Director liability in company cheque cases.' },
    ]
  },
  { act: 'Hindu Marriage Act, 1955', abbreviation: 'HMA', year: 1955, replaces: null,
    key_sections: [
      { section: '13', title: 'Divorce', notes: 'Grounds for divorce.' },
      { section: '9', title: 'Restitution of Conjugal Rights', notes: 'RCR proceedings.' },
      { section: '24', title: 'Maintenance pendente lite', notes: 'Interim maintenance.' },
      { section: '25', title: 'Permanent alimony', notes: 'Post-divorce maintenance.' },
    ]
  },
  { act: 'Limitation Act, 1963', abbreviation: 'LA', year: 1963, replaces: null,
    key_articles: [
      { article: '65', description: 'Suit for possession of immovable property or hereditary right', period_years: 12 },
      { article: '113', description: 'Any suit for which no period of limitation is provided', period_years: 3 },
      { article: '137', description: 'Any application for which no period is provided', period_years: 3 },
      { article: '36', description: 'Appeal under CPC', period_years: 0, period_days: 90 },
    ]
  },
];

export const WITNESS_TYPES = {
  PW: 'Prosecution Witness',
  DW: 'Defence Witness',
  CW: 'Court Witness',
} as const;

export const EVIDENCE_PREFIXES = ['E-', 'MO-', 'X-', 'C-'] as const;
// E- = Exhibits, MO- = Material Objects, X- = X-rays/maps, C- = Charts

export const DEPOSITION_STAGES = [
  'Examination-in-Chief',
  'Cross-Examination',
  'Re-Examination',
] as const;

export const FIR_DELAY_FLAG_HOURS = 12; // Per Supreme Court precedents

export const CNR_NUMBER_PATTERN = /^[A-Z]{2}[A-Z0-9]{2}\d{2}-\d{6}-\d{4}$/;
// e.g. DLHC01-001234-2024

// Indian court holidays (national — states add their own)
export const NATIONAL_COURT_HOLIDAYS_2024 = [
  { date: '2024-01-26', name: 'Republic Day' },
  { date: '2024-03-25', name: 'Holi' },
  { date: '2024-04-14', name: 'Dr. Ambedkar Jayanti' },
  { date: '2024-04-17', name: 'Ram Navami' },
  { date: '2024-08-15', name: 'Independence Day' },
  { date: '2024-10-02', name: 'Gandhi Jayanti' },
  { date: '2024-10-13', name: 'Dussehra' },
  { date: '2024-11-01', name: 'Diwali' },
  { date: '2024-12-25', name: 'Christmas' },
];
