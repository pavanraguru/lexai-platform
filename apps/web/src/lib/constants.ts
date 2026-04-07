// ============================================================
// LexAI India — Shared Constants (web app local copy)
// Mirrors @lexai/core constants to avoid monorepo import issues
// ============================================================

export const CASE_STATUS_LABELS: Record<string, string> = {
  intake: 'Intake',
  filed: 'Filed',
  pending_hearing: 'Pending Hearing',
  arguments: 'Arguments',
  reserved: 'Reserved',
  decided: 'Decided',
  appeal: 'Appeal',
  closed: 'Closed',
};

export const CASE_TYPE_LABELS: Record<string, string> = {
  criminal_sessions: 'Criminal (Sessions)',
  criminal_magistrate: 'Criminal (Magistrate)',
  civil_district: 'Civil (District)',
  writ_hc: 'Writ (High Court)',
  corporate_nclt: 'Corporate (NCLT)',
  family: 'Family',
  labour: 'Labour',
  ip: 'IP',
  tax: 'Tax',
  arbitration: 'Arbitration',
  consumer: 'Consumer',
};

export const PLAN_LIMITS = {
  starter:      { cases: 10,   storage_gb: 5,   agent_runs_per_month: 50  },
  professional: { cases: 100,  storage_gb: 50,  agent_runs_per_month: 500 },
  enterprise:   { cases: null, storage_gb: 500, agent_runs_per_month: null },
};
