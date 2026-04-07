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

export type UserRole = 'super_admin' | 'managing_partner' | 'senior_advocate' | 'junior_associate' | 'clerk' | 'client';
export type CaseType = 'criminal_sessions' | 'criminal_magistrate' | 'civil_district' | 'writ_hc' | 'corporate_nclt' | 'family' | 'labour' | 'ip' | 'tax' | 'arbitration' | 'consumer';
export type CourtLevel = 'supreme_court' | 'high_court' | 'district_court' | 'tribunal' | 'magistrate';
export type CasePerspective = 'defence' | 'prosecution' | 'petitioner' | 'respondent' | 'appellant' | 'claimant';
export type CasePriority = 'low' | 'normal' | 'high' | 'urgent';
export type HearingPurpose = 'framing_of_charges' | 'bail' | 'arguments' | 'judgment' | 'evidence' | 'examination' | 'cross_examination' | 'interim_order' | 'return_of_summons' | 'misc';
export type AgentType = 'evidence' | 'timeline' | 'deposition' | 'research' | 'strategy';

export const INDIAN_COURTS = {
  'Supreme Court of India': { level: 'supreme_court' as const, address_as: 'My Lord', state: null },
  'Delhi High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Delhi' },
  'Bombay High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Maharashtra' },
  'Madras High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Tamil Nadu' },
  'Calcutta High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'West Bengal' },
  'Allahabad High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Uttar Pradesh' },
  'Karnataka High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Karnataka' },
  'Kerala High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Kerala' },
  'Gujarat High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Gujarat' },
  'Rajasthan High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Rajasthan' },
  'Madhya Pradesh High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Madhya Pradesh' },
  'Patna High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Bihar' },
  'Orissa High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Odisha' },
  'Punjab & Haryana High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Punjab/Haryana' },
  'Telangana High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Telangana' },
  'Andhra Pradesh High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Andhra Pradesh' },
  'Gauhati High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Assam' },
  'Jharkhand High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Jharkhand' },
  'Uttarakhand High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Uttarakhand' },
  'Chhattisgarh High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Chhattisgarh' },
  'Himachal Pradesh High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Himachal Pradesh' },
  'Jammu & Kashmir High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'J&K' },
  'Manipur High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Manipur' },
  'Meghalaya High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Meghalaya' },
  'Sikkim High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Sikkim' },
  'Tripura High Court': { level: 'high_court' as const, address_as: 'My Lord', state: 'Tripura' },
  'NCLT Mumbai Bench': { level: 'tribunal' as const, address_as: 'Honourable Member', state: 'Maharashtra' },
  'NCLT Delhi Bench': { level: 'tribunal' as const, address_as: 'Honourable Member', state: 'Delhi' },
  'NCLAT': { level: 'tribunal' as const, address_as: 'Honourable Member', state: null },
  'DRT Mumbai': { level: 'tribunal' as const, address_as: 'Honourable Presiding Officer', state: 'Maharashtra' },
  'DRT Delhi': { level: 'tribunal' as const, address_as: 'Honourable Presiding Officer', state: 'Delhi' },
  'ITAT Delhi Bench': { level: 'tribunal' as const, address_as: 'Honourable Member', state: 'Delhi' },
  'Delhi Sessions Court': { level: 'district_court' as const, address_as: 'Your Honour', state: 'Delhi' },
  'Delhi District Court': { level: 'district_court' as const, address_as: 'Your Honour', state: 'Delhi' },
  'Delhi Family Court': { level: 'district_court' as const, address_as: 'Your Honour', state: 'Delhi' },
  'Mumbai Sessions Court': { level: 'district_court' as const, address_as: 'Your Honour', state: 'Maharashtra' },
  'Hyderabad Sessions Court': { level: 'district_court' as const, address_as: 'Your Honour', state: 'Telangana' },
  'Chennai Sessions Court': { level: 'district_court' as const, address_as: 'Your Honour', state: 'Tamil Nadu' },
} as const;

// ── Entity types (simplified for web app) ──────────────────
export interface ApiResponse<T> { data: T; meta?: any; error?: any; }
export interface Case { id: string; tenant_id: string; title: string; case_type: string; court: string; court_level: string; status: string; priority: string; perspective: string; cnr_number?: string; judge_name?: string; next_hearing_date?: string; filed_date?: string; metadata?: any; assigned_advocates: string[]; created_at: string; updated_at: string; }
export interface Document { id: string; case_id: string; filename: string; doc_category?: string; processing_status: string; page_count?: number; file_size_bytes: number; shared_with_client: boolean; created_at: string; }
export interface Hearing { id: string; case_id: string; date: string; time?: string; purpose: string; court_room?: string; judge_name?: string; client_instruction?: string; outcome?: string; order_summary?: string; created_at: string; }
export interface Task { id: string; case_id: string; title: string; description?: string; status: string; priority: string; assigned_to: string[]; due_date?: string; completed_at?: string; created_at: string; }
export interface AgentJob { id: string; case_id: string; agent_type: string; status: string; output?: any; cost_inr?: number; error_message?: string; created_at: string; completed_at?: string; }
export interface Draft { id: string; case_id: string; title: string; doc_type: string; content: any; version: number; word_count: number; created_at: string; }
export interface Client { id: string; full_name: string; email?: string; phone?: string; }
export interface Invoice { id: string; client_id: string; invoice_number: string; status: string; total_paise: number; created_at: string; }
export interface Notification { id: string; user_id: string; type: string; title: string; message: string; read: boolean; created_at: string; }
export interface User { id: string; tenant_id: string; full_name: string; email: string; role: UserRole; }
export interface Tenant { id: string; name: string; slug: string; plan: string; }
