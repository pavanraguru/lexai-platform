// LexAI India — Inlined constants (replaces @lexai/core imports)

export const CASE_STATUS_LABELS: Record<string, string> = {
  intake: 'Case Intake',
  filed: 'Case Filed',
  pending_hearing: 'Hearing Scheduled',
  arguments: 'Arguments in Progress',
  reserved: 'Judgment Awaited',
  decided: 'Decided',
  appeal: 'Appeal Filed',
  closed: 'Closed',
};

export const INDIAN_COURTS: Record<string, { level: string; address_as: string; state: string | null }> = {
  'Supreme Court of India': { level: 'supreme_court', address_as: 'My Lord', state: null },
  'Delhi High Court': { level: 'high_court', address_as: 'My Lord', state: 'Delhi' },
  'Bombay High Court': { level: 'high_court', address_as: 'My Lord', state: 'Maharashtra' },
  'Madras High Court': { level: 'high_court', address_as: 'My Lord', state: 'Tamil Nadu' },
  'Calcutta High Court': { level: 'high_court', address_as: 'My Lord', state: 'West Bengal' },
  'Allahabad High Court': { level: 'high_court', address_as: 'My Lord', state: 'Uttar Pradesh' },
  'Karnataka High Court': { level: 'high_court', address_as: 'My Lord', state: 'Karnataka' },
  'Kerala High Court': { level: 'high_court', address_as: 'My Lord', state: 'Kerala' },
  'Gujarat High Court': { level: 'high_court', address_as: 'My Lord', state: 'Gujarat' },
  'Rajasthan High Court': { level: 'high_court', address_as: 'My Lord', state: 'Rajasthan' },
  'Madhya Pradesh High Court': { level: 'high_court', address_as: 'My Lord', state: 'Madhya Pradesh' },
  'Patna High Court': { level: 'high_court', address_as: 'My Lord', state: 'Bihar' },
  'Punjab & Haryana High Court': { level: 'high_court', address_as: 'My Lord', state: 'Punjab/Haryana' },
  'Telangana High Court': { level: 'high_court', address_as: 'My Lord', state: 'Telangana' },
  'Andhra Pradesh High Court': { level: 'high_court', address_as: 'My Lord', state: 'Andhra Pradesh' },
  'NCLT Mumbai Bench': { level: 'tribunal', address_as: 'Honourable Member', state: 'Maharashtra' },
  'NCLT Delhi Bench': { level: 'tribunal', address_as: 'Honourable Member', state: 'Delhi' },
  'NCLAT': { level: 'tribunal', address_as: 'Honourable Member', state: null },
  'DRT Mumbai': { level: 'tribunal', address_as: 'Honourable Presiding Officer', state: 'Maharashtra' },
  'DRT Delhi': { level: 'tribunal', address_as: 'Honourable Presiding Officer', state: 'Delhi' },
  'ITAT Delhi Bench': { level: 'tribunal', address_as: 'Honourable Member', state: 'Delhi' },
  'Delhi Sessions Court': { level: 'district_court', address_as: 'Your Honour', state: 'Delhi' },
  'Delhi District Court': { level: 'district_court', address_as: 'Your Honour', state: 'Delhi' },
};

export const PLAN_LIMITS = {
  starter: { max_users: 2, max_active_cases: 10, agent_runs_per_month: 50, storage_gb: 5 },
  professional: { max_users: 10, max_active_cases: null, agent_runs_per_month: 500, storage_gb: 50 },
  enterprise: { max_users: null, max_active_cases: null, agent_runs_per_month: null, storage_gb: 500 },
};
