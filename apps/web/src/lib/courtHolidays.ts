// ============================================================
// LexAI India — Court Holiday Calendar Data
// PRD v1.1 CAL-04 — Pre-loaded holidays for all courts
// Covers: National holidays + Supreme Court + all 25 High Courts
// Years: 2025 & 2026
// ============================================================

export type HolidayType = 'national' | 'court_vacation' | 'gazetted' | 'restricted';

export interface CourtHoliday {
  date: string;          // YYYY-MM-DD
  name: string;
  type: HolidayType;
  courts: string[];      // 'all' | specific court keys
  description?: string;
}

// Court keys match the `court` field values in the DB
export const COURT_KEYS = {
  supreme_court: 'Supreme Court of India',
  delhi_hc: 'Delhi High Court',
  bombay_hc: 'Bombay High Court',
  madras_hc: 'Madras High Court',
  calcutta_hc: 'Calcutta High Court',
  allahabad_hc: 'Allahabad High Court',
  karnataka_hc: 'Karnataka High Court',
  kerala_hc: 'Kerala High Court',
  gujarat_hc: 'Gujarat High Court',
  rajasthan_hc: 'Rajasthan High Court',
  mp_hc: 'Madhya Pradesh High Court',
  patna_hc: 'Patna High Court',
  orissa_hc: 'Orissa High Court',
  punjab_haryana_hc: 'Punjab and Haryana High Court',
  jharkhand_hc: 'Jharkhand High Court',
  chhattisgarh_hc: 'Chhattisgarh High Court',
  uttarakhand_hc: 'Uttarakhand High Court',
  himachal_hc: 'Himachal Pradesh High Court',
  jk_hc: 'Jammu and Kashmir High Court',
  manipur_hc: 'Manipur High Court',
  meghalaya_hc: 'Meghalaya High Court',
  sikkim_hc: 'Sikkim High Court',
  tripura_hc: 'Tripura High Court',
  telangana_hc: 'Telangana High Court',
  ap_hc: 'Andhra Pradesh High Court',
  gauhati_hc: 'Gauhati High Court',
} as const;

export type CourtKey = keyof typeof COURT_KEYS;

// All court keys for convenience
const ALL_COURTS = Object.keys(COURT_KEYS) as CourtKey[];

// ── 2025 Holidays ─────────────────────────────────────────────

const HOLIDAYS_2025: CourtHoliday[] = [
  // ── National / Gazetted Holidays (all courts closed) ──
  { date: '2025-01-01', name: 'New Year\'s Day', type: 'gazetted', courts: ALL_COURTS },
  { date: '2025-01-14', name: 'Makar Sankranti / Pongal', type: 'gazetted', courts: ALL_COURTS },
  { date: '2025-01-26', name: 'Republic Day', type: 'national', courts: ALL_COURTS, description: 'National holiday — courts closed across India' },
  { date: '2025-02-26', name: 'Maha Shivaratri', type: 'gazetted', courts: ALL_COURTS },
  { date: '2025-03-14', name: 'Holi', type: 'national', courts: ALL_COURTS },
  { date: '2025-03-31', name: 'Id-ul-Fitr (Eid)', type: 'national', courts: ALL_COURTS },
  { date: '2025-04-10', name: 'Ram Navami', type: 'gazetted', courts: ALL_COURTS },
  { date: '2025-04-14', name: 'Dr. Ambedkar Jayanti', type: 'national', courts: ALL_COURTS },
  { date: '2025-04-18', name: 'Good Friday', type: 'national', courts: ALL_COURTS },
  { date: '2025-05-12', name: 'Buddha Purnima', type: 'national', courts: ALL_COURTS },
  { date: '2025-06-07', name: 'Id-ul-Zuha (Eid-ul-Adha)', type: 'national', courts: ALL_COURTS },
  { date: '2025-06-27', name: 'Muharram', type: 'national', courts: ALL_COURTS },
  { date: '2025-08-15', name: 'Independence Day', type: 'national', courts: ALL_COURTS, description: 'National holiday — courts closed across India' },
  { date: '2025-08-16', name: 'Janmashtami', type: 'national', courts: ALL_COURTS },
  { date: '2025-09-05', name: 'Eid-e-Milad (Milad-un-Nabi)', type: 'national', courts: ALL_COURTS },
  { date: '2025-10-02', name: 'Gandhi Jayanti / Dussehra', type: 'national', courts: ALL_COURTS, description: 'Gandhi Jayanti — national holiday' },
  { date: '2025-10-20', name: 'Diwali (Deepavali)', type: 'national', courts: ALL_COURTS },
  { date: '2025-10-21', name: 'Diwali Holiday', type: 'national', courts: ALL_COURTS },
  { date: '2025-11-05', name: 'Guru Nanak Jayanti', type: 'national', courts: ALL_COURTS },
  { date: '2025-12-25', name: 'Christmas Day', type: 'national', courts: ALL_COURTS },

  // ── Supreme Court Vacations ──
  { date: '2025-05-19', name: 'SC Summer Vacation begins', type: 'court_vacation', courts: ['supreme_court'], description: 'Supreme Court summer vacation' },
  { date: '2025-05-20', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-05-21', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-05-22', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-05-23', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-05-26', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-05-27', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-05-28', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-05-29', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-05-30', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-06-02', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-06-03', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-06-04', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-06-05', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-06-06', name: 'SC Summer Vacation ends', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-10-13', name: 'SC Diwali Vacation begins', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-10-14', name: 'SC Diwali Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-10-15', name: 'SC Diwali Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-10-16', name: 'SC Diwali Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-10-17', name: 'SC Diwali Vacation ends', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-12-22', name: 'SC Winter Vacation begins', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-12-23', name: 'SC Winter Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-12-24', name: 'SC Winter Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-12-26', name: 'SC Winter Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-12-29', name: 'SC Winter Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-12-30', name: 'SC Winter Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2025-12-31', name: 'SC Winter Vacation ends', type: 'court_vacation', courts: ['supreme_court'] },

  // ── Delhi High Court specific ──
  { date: '2025-05-19', name: 'DHC Summer Vacation begins', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-05-20', name: 'DHC Summer Vacation', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-05-21', name: 'DHC Summer Vacation', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-05-22', name: 'DHC Summer Vacation', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-05-23', name: 'DHC Summer Vacation', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-05-26', name: 'DHC Summer Vacation', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-05-27', name: 'DHC Summer Vacation', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-05-28', name: 'DHC Summer Vacation', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-05-29', name: 'DHC Summer Vacation', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-05-30', name: 'DHC Summer Vacation ends', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-12-22', name: 'DHC Winter Vacation begins', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-12-23', name: 'DHC Winter Vacation', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-12-24', name: 'DHC Winter Vacation', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-12-26', name: 'DHC Winter Vacation', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-12-29', name: 'DHC Winter Vacation', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-12-30', name: 'DHC Winter Vacation', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2025-12-31', name: 'DHC Winter Vacation ends', type: 'court_vacation', courts: ['delhi_hc'] },

  // ── Bombay High Court ──
  { date: '2025-05-12', name: 'BHC Summer Vacation begins', type: 'court_vacation', courts: ['bombay_hc'] },
  { date: '2025-06-13', name: 'BHC Summer Vacation ends', type: 'court_vacation', courts: ['bombay_hc'] },
  { date: '2025-12-22', name: 'BHC Winter Vacation begins', type: 'court_vacation', courts: ['bombay_hc'] },
  { date: '2025-12-31', name: 'BHC Winter Vacation ends', type: 'court_vacation', courts: ['bombay_hc'] },
  { date: '2025-05-01', name: 'Maharashtra Day', type: 'gazetted', courts: ['bombay_hc'] },

  // ── Madras High Court ──
  { date: '2025-05-12', name: 'MHC Summer Vacation begins', type: 'court_vacation', courts: ['madras_hc'] },
  { date: '2025-06-16', name: 'MHC Summer Vacation ends', type: 'court_vacation', courts: ['madras_hc'] },
  { date: '2025-04-14', name: 'Tamil Nadu New Year (Puthandu)', type: 'gazetted', courts: ['madras_hc'] },
  { date: '2025-01-15', name: 'Pongal Holiday', type: 'gazetted', courts: ['madras_hc'] },

  // ── Calcutta High Court ──
  { date: '2025-05-12', name: 'CHC Summer Vacation begins', type: 'court_vacation', courts: ['calcutta_hc'] },
  { date: '2025-06-16', name: 'CHC Summer Vacation ends', type: 'court_vacation', courts: ['calcutta_hc'] },
  { date: '2025-10-01', name: 'Mahalaya', type: 'gazetted', courts: ['calcutta_hc'] },
  { date: '2025-10-02', name: 'Durga Puja', type: 'gazetted', courts: ['calcutta_hc'] },
  { date: '2025-10-03', name: 'Durga Puja (Maha Saptami)', type: 'gazetted', courts: ['calcutta_hc'] },
  { date: '2025-10-04', name: 'Durga Puja (Maha Ashtami)', type: 'gazetted', courts: ['calcutta_hc'] },
  { date: '2025-10-05', name: 'Durga Puja (Maha Navami)', type: 'gazetted', courts: ['calcutta_hc'] },
  { date: '2025-10-06', name: 'Vijaya Dashami (Dussehra)', type: 'gazetted', courts: ['calcutta_hc'] },

  // ── Allahabad High Court ──
  { date: '2025-05-19', name: 'AHC Summer Vacation begins', type: 'court_vacation', courts: ['allahabad_hc'] },
  { date: '2025-07-07', name: 'AHC Summer Vacation ends', type: 'court_vacation', courts: ['allahabad_hc'] },

  // ── Karnataka High Court ──
  { date: '2025-05-05', name: 'KHC Summer Vacation begins', type: 'court_vacation', courts: ['karnataka_hc'] },
  { date: '2025-05-31', name: 'KHC Summer Vacation ends', type: 'court_vacation', courts: ['karnataka_hc'] },
  { date: '2025-11-01', name: 'Kannada Rajyotsava', type: 'gazetted', courts: ['karnataka_hc'] },

  // ── Kerala High Court ──
  { date: '2025-05-05', name: 'KeHC Summer Vacation begins', type: 'court_vacation', courts: ['kerala_hc'] },
  { date: '2025-05-31', name: 'KeHC Summer Vacation ends', type: 'court_vacation', courts: ['kerala_hc'] },
  { date: '2025-08-30', name: 'Onam (Thiruvonam)', type: 'gazetted', courts: ['kerala_hc'] },
  { date: '2025-11-01', name: 'Kerala Piravi', type: 'gazetted', courts: ['kerala_hc'] },

  // ── Gujarat High Court ──
  { date: '2025-05-01', name: 'Gujarat Sthapna Divas', type: 'gazetted', courts: ['gujarat_hc'] },
  { date: '2025-05-12', name: 'GHC Summer Vacation begins', type: 'court_vacation', courts: ['gujarat_hc'] },
  { date: '2025-06-16', name: 'GHC Summer Vacation ends', type: 'court_vacation', courts: ['gujarat_hc'] },

  // ── Telangana High Court ──
  { date: '2025-06-02', name: 'Telangana Formation Day', type: 'gazetted', courts: ['telangana_hc'] },
  { date: '2025-05-12', name: 'THC Summer Vacation begins', type: 'court_vacation', courts: ['telangana_hc'] },
  { date: '2025-06-16', name: 'THC Summer Vacation ends', type: 'court_vacation', courts: ['telangana_hc'] },

  // ── Andhra Pradesh High Court ──
  { date: '2025-11-01', name: 'AP Formation Day', type: 'gazetted', courts: ['ap_hc'] },
  { date: '2025-05-12', name: 'APHC Summer Vacation begins', type: 'court_vacation', courts: ['ap_hc'] },
  { date: '2025-06-16', name: 'APHC Summer Vacation ends', type: 'court_vacation', courts: ['ap_hc'] },

  // ── Punjab & Haryana High Court ──
  { date: '2025-05-19', name: 'PHHC Summer Vacation begins', type: 'court_vacation', courts: ['punjab_haryana_hc'] },
  { date: '2025-07-07', name: 'PHHC Summer Vacation ends', type: 'court_vacation', courts: ['punjab_haryana_hc'] },
];

// ── 2026 Holidays ─────────────────────────────────────────────

const HOLIDAYS_2026: CourtHoliday[] = [
  { date: '2026-01-01', name: 'New Year\'s Day', type: 'gazetted', courts: ALL_COURTS },
  { date: '2026-01-14', name: 'Makar Sankranti / Pongal', type: 'gazetted', courts: ALL_COURTS },
  { date: '2026-01-26', name: 'Republic Day', type: 'national', courts: ALL_COURTS, description: 'National holiday — courts closed across India' },
  { date: '2026-02-15', name: 'Maha Shivaratri', type: 'gazetted', courts: ALL_COURTS },
  { date: '2026-03-03', name: 'Holi', type: 'national', courts: ALL_COURTS },
  { date: '2026-03-20', name: 'Id-ul-Fitr (Eid)', type: 'national', courts: ALL_COURTS },
  { date: '2026-03-30', name: 'Ram Navami', type: 'gazetted', courts: ALL_COURTS },
  { date: '2026-04-03', name: 'Good Friday', type: 'national', courts: ALL_COURTS },
  { date: '2026-04-14', name: 'Dr. Ambedkar Jayanti', type: 'national', courts: ALL_COURTS },
  { date: '2026-05-01', name: 'Buddha Purnima', type: 'national', courts: ALL_COURTS },
  { date: '2026-05-27', name: 'Id-ul-Zuha (Eid-ul-Adha)', type: 'national', courts: ALL_COURTS },
  { date: '2026-06-16', name: 'Muharram', type: 'national', courts: ALL_COURTS },
  { date: '2026-08-15', name: 'Independence Day', type: 'national', courts: ALL_COURTS },
  { date: '2026-08-25', name: 'Eid-e-Milad (Milad-un-Nabi)', type: 'national', courts: ALL_COURTS },
  { date: '2026-09-07', name: 'Janmashtami', type: 'national', courts: ALL_COURTS },
  { date: '2026-10-02', name: 'Gandhi Jayanti', type: 'national', courts: ALL_COURTS },
  { date: '2026-10-19', name: 'Dussehra', type: 'national', courts: ALL_COURTS },
  { date: '2026-11-07', name: 'Diwali (Deepavali)', type: 'national', courts: ALL_COURTS },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti', type: 'national', courts: ALL_COURTS },
  { date: '2026-12-25', name: 'Christmas Day', type: 'national', courts: ALL_COURTS },

  // Supreme Court vacations 2026
  { date: '2026-05-18', name: 'SC Summer Vacation begins', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-05-19', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-05-20', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-05-21', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-05-22', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-05-25', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-05-26', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-05-27', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-05-28', name: 'SC Summer Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-05-29', name: 'SC Summer Vacation ends', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-12-21', name: 'SC Winter Vacation begins', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-12-22', name: 'SC Winter Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-12-23', name: 'SC Winter Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-12-24', name: 'SC Winter Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-12-28', name: 'SC Winter Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-12-29', name: 'SC Winter Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-12-30', name: 'SC Winter Vacation', type: 'court_vacation', courts: ['supreme_court'] },
  { date: '2026-12-31', name: 'SC Winter Vacation ends', type: 'court_vacation', courts: ['supreme_court'] },

  // Delhi HC 2026
  { date: '2026-05-18', name: 'DHC Summer Vacation begins', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2026-05-29', name: 'DHC Summer Vacation ends', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2026-12-21', name: 'DHC Winter Vacation begins', type: 'court_vacation', courts: ['delhi_hc'] },
  { date: '2026-12-31', name: 'DHC Winter Vacation ends', type: 'court_vacation', courts: ['delhi_hc'] },

  // Karnataka HC 2026
  { date: '2026-11-01', name: 'Kannada Rajyotsava', type: 'gazetted', courts: ['karnataka_hc'] },

  // Kerala HC 2026
  { date: '2026-11-01', name: 'Kerala Piravi', type: 'gazetted', courts: ['kerala_hc'] },

  // Telangana HC 2026
  { date: '2026-06-02', name: 'Telangana Formation Day', type: 'gazetted', courts: ['telangana_hc'] },

  // AP HC 2026
  { date: '2026-11-01', name: 'AP Formation Day', type: 'gazetted', courts: ['ap_hc'] },
];

export const ALL_HOLIDAYS: CourtHoliday[] = [
  ...HOLIDAYS_2025,
  ...HOLIDAYS_2026,
];

// ── Lookup helpers ─────────────────────────────────────────────

// Match a court name string (from DB) to a court key
export function matchCourtKey(courtName: string): CourtKey | null {
  if (!courtName) return null;
  const lower = courtName.toLowerCase();

  if (lower.includes('supreme')) return 'supreme_court';
  if (lower.includes('delhi')) return 'delhi_hc';
  if (lower.includes('bombay') || lower.includes('mumbai')) return 'bombay_hc';
  if (lower.includes('madras') || lower.includes('chennai')) return 'madras_hc';
  if (lower.includes('calcutta') || lower.includes('kolkata')) return 'calcutta_hc';
  if (lower.includes('allahabad')) return 'allahabad_hc';
  if (lower.includes('karnataka') || lower.includes('bengaluru') || lower.includes('bangalore')) return 'karnataka_hc';
  if (lower.includes('kerala') || lower.includes('kochi') || lower.includes('ernakulam')) return 'kerala_hc';
  if (lower.includes('gujarat') || lower.includes('ahmedabad')) return 'gujarat_hc';
  if (lower.includes('rajasthan') || lower.includes('jodhpur') || lower.includes('jaipur')) return 'rajasthan_hc';
  if (lower.includes('madhya pradesh') || lower.includes('jabalpur')) return 'mp_hc';
  if (lower.includes('patna') || lower.includes('bihar')) return 'patna_hc';
  if (lower.includes('orissa') || lower.includes('odisha') || lower.includes('cuttack')) return 'orissa_hc';
  if (lower.includes('punjab') || lower.includes('haryana') || lower.includes('chandigarh')) return 'punjab_haryana_hc';
  if (lower.includes('jharkhand') || lower.includes('ranchi')) return 'jharkhand_hc';
  if (lower.includes('chhattisgarh') || lower.includes('bilaspur')) return 'chhattisgarh_hc';
  if (lower.includes('uttarakhand') || lower.includes('nainital')) return 'uttarakhand_hc';
  if (lower.includes('himachal') || lower.includes('shimla')) return 'himachal_hc';
  if (lower.includes('jammu') || lower.includes('kashmir') || lower.includes('srinagar')) return 'jk_hc';
  if (lower.includes('manipur') || lower.includes('imphal')) return 'manipur_hc';
  if (lower.includes('meghalaya') || lower.includes('shillong')) return 'meghalaya_hc';
  if (lower.includes('sikkim') || lower.includes('gangtok')) return 'sikkim_hc';
  if (lower.includes('tripura') || lower.includes('agartala')) return 'tripura_hc';
  if (lower.includes('telangana') || lower.includes('hyderabad')) return 'telangana_hc';
  if (lower.includes('andhra') || lower.includes('amaravati') || lower.includes('visakhapatnam')) return 'ap_hc';
  if (lower.includes('gauhati') || lower.includes('guwahati') || lower.includes('assam')) return 'gauhati_hc';

  return null;
}

// Get all holidays for a given court + date range
export function getHolidaysForCourt(
  courtKey: CourtKey | null,
  fromDate: string,
  toDate: string
): CourtHoliday[] {
  return ALL_HOLIDAYS.filter(h => {
    if (h.date < fromDate || h.date > toDate) return false;
    if (!courtKey) {
      // No specific court — show national/gazetted only
      return h.type === 'national' || h.type === 'gazetted';
    }
    return (h.courts as string[]).includes(courtKey) ||
           (h.courts as string[]).includes('all');
  });
}

// Get holidays for a specific date (for warning on hearing creation)
export function getHolidaysOnDate(date: string, courtKey: CourtKey | null): CourtHoliday[] {
  return getHolidaysForCourt(courtKey, date, date);
}

// Build a lookup map: date → holidays[]
export function buildHolidayMap(
  courtKey: CourtKey | null,
  fromDate: string,
  toDate: string
): Record<string, CourtHoliday[]> {
  const holidays = getHolidaysForCourt(courtKey, fromDate, toDate);
  const map: Record<string, CourtHoliday[]> = {};
  for (const h of holidays) {
    if (!map[h.date]) map[h.date] = [];
    map[h.date].push(h);
  }
  return map;
}

export const HOLIDAY_TYPE_CONFIG: Record<HolidayType, { color: string; bg: string; label: string }> = {
  national:      { color: '#b91c1c', bg: '#fee2e2', label: 'National Holiday' },
  court_vacation:{ color: '#1d4ed8', bg: '#dbeafe', label: 'Court Vacation' },
  gazetted:      { color: '#b45309', bg: '#fef3c7', label: 'Gazetted Holiday' },
  restricted:    { color: '#6b7280', bg: '#f3f4f6', label: 'Restricted Holiday' },
};
