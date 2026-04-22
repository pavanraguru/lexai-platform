// ============================================================
// LexAI India — Core TypeScript Types
// Derived from: PRD v1.1 + Master Schema v1.0 + Addendum v1.1
// Every type here maps 1:1 to a database table or agent output
// ============================================================

// ── Shared Primitives ────────────────────────────────────────
export type UUID = string;
export type ISOTimestamp = string; // e.g. "2024-01-15T09:30:00+05:30"
export type ISODate = string;      // e.g. "2024-01-15"
export type ISTTime = string;      // e.g. "10:30"
export type Paise = number;        // ₹1 = 100 paise. Always integer.

// ── Enums — Schema Section 1–22 ──────────────────────────────

export type TenantPlan = 'starter' | 'professional' | 'enterprise';

export type UserRole =
  | 'super_admin'
  | 'managing_partner'
  | 'senior_advocate'
  | 'junior_associate'
  | 'clerk'
  | 'client';

export type CaseType =
  | 'criminal_sessions'
  | 'criminal_magistrate'
  | 'civil_district'
  | 'writ_hc'
  | 'corporate_nclt'
  | 'family'
  | 'labour'
  | 'ip'
  | 'tax'
  | 'arbitration'
  | 'consumer';

export type CourtLevel =
  | 'supreme_court'
  | 'high_court'
  | 'district_court'
  | 'tribunal'
  | 'magistrate';

export type CaseStatus =
  | 'intake'
  | 'filed'
  | 'pending_hearing'
  | 'arguments'
  | 'reserved'
  | 'decided'
  | 'appeal'
  | 'closed';

export type CasePriority = 'low' | 'normal' | 'high' | 'urgent';

export type CasePerspective =
  | 'defence'
  | 'prosecution'
  | 'petitioner'
  | 'respondent'
  | 'appellant'
  | 'claimant';

export type DocCategory =
  | 'fir'
  | 'chargesheet'
  | 'bail_order'
  | 'witness_statement'
  | 'forensic_report'
  | 'affidavit'
  | 'plaint'
  | 'written_statement'
  | 'vakalatnama'
  | 'order'
  | 'judgment'
  | 'deposition'
  | 'evidence_exhibit'
  | 'consultation_recording'
  | 'other';

export type DocumentProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed';

export type HearingPurpose =
  | 'framing_of_charges'
  | 'bail'
  | 'arguments'
  | 'judgment'
  | 'evidence'
  | 'examination'
  | 'cross_examination'
  | 'interim_order'
  | 'return_of_summons'
  | 'misc';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskType = 'drafting' | 'filing' | 'hearing_prep' | 'research' | 'correspondence' | 'admin' | 'other';

export type AgentType = 'evidence' | 'timeline' | 'deposition' | 'research' | 'strategy';
export type AgentStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type DraftDocType =
  | 'bail_application'
  | 'plaint'
  | 'written_statement'
  | 'writ_petition'
  | 'affidavit'
  | 'vakalatnama'
  | 'opening_statement'
  | 'closing_statement'
  | 'rejoinder'
  | 'memo_of_appeal'
  | 'other';

export type AnnotationColor = 'yellow' | 'red' | 'green' | 'blue' | 'purple';
export type SlideType = 'title' | 'text' | 'evidence_exhibit' | 'timeline' | 'key_arguments' | 'qa' | 'blank';

export type NotificationType =
  | 'hearing_reminder_30d'
  | 'hearing_reminder_7d'
  | 'hearing_reminder_1d'
  | 'hearing_day_briefing'
  | 'task_due_tomorrow'
  | 'task_overdue'
  | 'agent_completed'
  | 'agent_failed'
  | 'case_status_changed'
  | 'draft_locked'
  | 'mention'
  | 'ecourts_sync_conflict'
  | 'system';

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing' | 'suspended';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
export type PaymentMode = 'upi' | 'neft' | 'rtgs' | 'cheque' | 'cash' | 'razorpay' | 'other';
export type IdProofType = 'aadhaar' | 'pan' | 'passport' | 'driving_licence' | 'voter_id' | 'other';
export type ClientRole = 'accused' | 'complainant' | 'petitioner' | 'respondent' | 'appellant' | 'witness' | 'other';
export type CourtPortal = 'ecourts' | 'nclt' | 'drt' | 'supreme_court' | 'high_court_delhi' | 'high_court_bombay' | 'high_court_madras' | 'high_court_calcutta' | 'other';
export type CourtSyncStatus = 'running' | 'success' | 'failed' | 'portal_unavailable' | 'cnr_not_found';
export type WhatsAppMessageType = 'cause_list_summary' | 'hearing_reminder_7d' | 'hearing_reminder_2d' | 'outcome_update' | 'invoice_reminder' | 'payment_confirmation';
export type WaDeliveryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
export type ClientNotificationType = 'hearing_reminder_7d' | 'hearing_reminder_2d' | 'outcome_update' | 'document_shared' | 'invoice_issued' | 'invoice_overdue' | 'custom';
export type PreferredLanguage = 'english' | 'hindi';

// ── Entity Types ─────────────────────────────────────────────

export interface Tenant {
  id: UUID;
  name: string;
  slug: string;
  plan: TenantPlan;
  settings: TenantSettings;
  active: boolean;
  razorpay_customer_id: string | null;
  created_at: ISOTimestamp;
}

export interface TenantSettings {
  default_court?: string;
  default_case_type?: CaseType;
  reminder_days?: number[];
  invoice_number_format?: string;
  invoice_next_sequence?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_account_name?: string;
  upi_id?: string;
  gstin?: string;
  whatsapp_number?: string;
  portal_branding?: {
    logo_s3_key?: string;
    primary_color?: string;
    firm_display_name?: string;
  };
  cause_list_time?: string;
  ecourts_sync_enabled?: boolean;
  max_agent_runs_per_month?: number;
}

export interface User {
  id: UUID;
  tenant_id: UUID;
  email: string;
  phone: string | null;
  full_name: string;
  role: UserRole;
  bar_enrollment_no: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_seen_at: ISOTimestamp | null;
  created_at: ISOTimestamp;
}

export interface Case {
  id: UUID;
  tenant_id: UUID;
  cnr_number: string | null;
  title: string;
  case_type: CaseType;
  court: string;
  court_level: CourtLevel;
  judge_name: string | null;
  status: CaseStatus;
  priority: CasePriority;
  perspective: CasePerspective;
  filed_date: ISODate | null;
  next_hearing_date: ISODate | null;
  assigned_advocates: UUID[];
  client_id: UUID | null;
  parent_case_id: UUID | null;
  metadata: CaseMetadata;
  client_instruction_default: string | null;
  ecourts_sync_enabled: boolean;
  last_synced_at: ISOTimestamp | null;
  created_by: UUID;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface CaseMetadata {
  fir_number?: string;
  police_station?: string;
  complainant_name?: string;
  accused_names?: string[];
  sections_charged?: string[];
  opposing_counsel?: string;
  case_value_inr?: number;
  property_address?: string;
  company_cin?: string;
  arbitration_seat?: string;
  tribunal_case_no?: string;
  tags?: string[];
}

export interface Document {
  id: UUID;
  tenant_id: UUID;
  case_id: UUID;
  filename: string;
  s3_key: string;
  mime_type: string;
  file_size_bytes: number;
  doc_category: DocCategory | null;
  processing_status: DocumentProcessingStatus;
  extracted_text: string | null;
  page_count: number | null;
  shared_with_client: boolean;
  version_number: number;
  previous_version_id: UUID | null;
  uploaded_by: UUID;
  created_at: ISOTimestamp;
}

export interface Hearing {
  id: UUID;
  tenant_id: UUID;
  case_id: UUID;
  date: ISODate;
  time: ISTTime | null;
  court_room: string | null;
  judge_name: string | null;
  purpose: HearingPurpose;
  outcome: string | null;
  order_summary: string | null;
  client_instruction: string | null;
  reminder_30d_sent: boolean;
  reminder_7d_sent: boolean;
  reminder_1d_sent: boolean;
  created_by: UUID;
  created_at: ISOTimestamp;
}

export interface Task {
  id: UUID;
  tenant_id: UUID;
  case_id: UUID;
  title: string;
  description: string | null;
  task_type: TaskType | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: UUID[];
  due_date: ISODate | null;
  linked_hearing_id: UUID | null;
  from_template: boolean;
  comments: TaskComment[];
  created_by: UUID;
  created_at: ISOTimestamp;
  completed_at: ISOTimestamp | null;
}

export interface TaskComment {
  id: UUID;
  author_id: UUID;
  text: string;
  created_at: ISOTimestamp;
}

export interface AgentJob {
  id: UUID;
  tenant_id: UUID;
  case_id: UUID;
  agent_type: AgentType;
  agent_version: string;
  status: AgentStatus;
  triggered_by: UUID | 'auto';
  input_config: AgentInputConfig;
  output: AgentOutput | null;
  tokens_input: number | null;
  tokens_output: number | null;
  model_used: string;
  cost_inr: number | null;
  error_message: string | null;
  started_at: ISOTimestamp | null;
  completed_at: ISOTimestamp | null;
  created_at: ISOTimestamp;
}

export interface AgentInputConfig {
  doc_ids: UUID[];
  case_metadata: Partial<Case>;
  agent_settings: Record<string, unknown>;
  prior_agent_outputs?: Record<AgentType, UUID>; // job IDs of prior agents
}

// ── Agent Output Types (Schema 8 in Master Schema) ───────────

export type AgentOutput =
  | EvidenceAgentOutput
  | TimelineAgentOutput
  | DepositionAgentOutput
  | ResearchAgentOutput
  | StrategyAgentOutput;

export interface EvidenceAgentOutput {
  agent_type: 'evidence';
  case_id: UUID;
  exhibits: EvidenceExhibit[];
  key_facts: KeyFact[];
  witnesses: Witness[];
  contradictions: Contradiction[];
  missing_docs: string[];
}

export interface EvidenceExhibit {
  number: string;       // e.g. "E-1", "MO-3"
  description: string;
  doc_id: UUID;
  page: number;
}

export interface KeyFact {
  fact: string;
  doc_id: UUID;
  page: number;
  importance: 'high' | 'medium' | 'low';
}

export interface Witness {
  name: string;
  type: 'PW' | 'DW' | 'CW';
  number: string;       // e.g. "PW-1"
  doc_id: UUID;
}

export interface Contradiction {
  description: string;
  doc1_id: UUID;
  doc2_id: UUID;
  significance: 'high' | 'medium' | 'low';
}

export interface TimelineAgentOutput {
  agent_type: 'timeline';
  events: TimelineEvent[];
  prosecution_gaps: ProsecutionGap[];
  alibi_windows: AlibiWindow[];
}

export interface TimelineEvent {
  date: ISODate;
  time: ISTTime | null;
  description: string;
  source_doc_id: UUID;
  source_page: number;
  event_type: 'offence' | 'arrest' | 'fir_registration' | 'remand' | 'bail' | 'court_date' | 'medical' | 'witness_statement' | 'other';
  importance_score: number;   // 0.0 – 1.0
  gap_after_minutes: number | null;
}

export interface ProsecutionGap {
  description: string;
  start_date: ISODate;
  end_date: ISODate;
  significance: 'high' | 'medium' | 'low';
}

export interface AlibiWindow {
  start: ISOTimestamp;
  end: ISOTimestamp;
  description: string;
}

export interface DepositionAgentOutput {
  agent_type: 'deposition';
  witness_name: string;
  witness_type: 'PW' | 'DW' | 'CW';
  witness_number: string;
  credibility_score: number;  // 0 – 10
  credibility_reasoning: string;
  inconsistencies: DepositionInconsistency[];
  suggested_cross_questions: CrossQuestion[];
  objectionable_questions: ObjectionableQuestion[];
}

export interface DepositionInconsistency {
  description: string;
  stmt1_location: string;
  stmt2_location: string;
  significance: 'high' | 'medium' | 'low';
}

export interface CrossQuestion {
  question: string;
  based_on: string;
}

export interface ObjectionableQuestion {
  quote: string;
  reason: string;
}

export interface ResearchAgentOutput {
  agent_type: 'research';
  applicable_statutes: ApplicableStatute[];
  favorable_precedents: LegalPrecedent[];
  adverse_precedents: AdversePrecedent[];
  disclaimer: string;
}

export interface ApplicableStatute {
  act: string;
  section: string;
  description: string;
  relevance: string;
}

export interface LegalPrecedent {
  citation: string;
  court: string;
  year: number;
  held: string;
  relevance_score: number;
  distinguishing_factors: string;
}

export interface AdversePrecedent {
  citation: string;
  court: string;
  year: number;
  held: string;
  how_to_distinguish: string;
}

export interface StrategyAgentOutput {
  agent_type: 'strategy';
  perspective: CasePerspective;
  opening_statement: string;
  closing_skeleton: string;
  bench_questions: BenchQuestion[];
  sentiment: CaseSentiment;
  strengths: string[];
  vulnerabilities: Vulnerability[];
}

export interface BenchQuestion {
  question: string;
  suggested_answer: string;
}

export interface CaseSentiment {
  label: 'Favorable' | 'Neutral' | 'Unfavorable';
  score: number;  // 0 – 100
  reasoning: string;
  evidence_strength: 'Strong' | 'Moderate' | 'Weak';
  precedent_strength: 'Strong' | 'Moderate' | 'Weak';
  timeline_consistency: 'Consistent' | 'Minor Gaps' | 'Major Gaps';
  witness_credibility: 'High' | 'Medium' | 'Low';
}

export interface Vulnerability {
  issue: string;
  mitigation: string;
}

// ── Remaining Entity Types ────────────────────────────────────

export interface Draft {
  id: UUID;
  tenant_id: UUID;
  case_id: UUID;
  title: string;
  doc_type: DraftDocType | null;
  content: Record<string, unknown>; // TipTap ProseMirror JSON
  version: number;
  word_count: number;
  is_locked: boolean;
  locked_by: UUID | null;
  locked_at: ISOTimestamp | null;
  promoted_from_job: UUID | null;
  created_by: UUID;
  last_modified_by: UUID;
  last_modified_at: ISOTimestamp;
  created_at: ISOTimestamp;
}

export interface Annotation {
  id: UUID;
  tenant_id: UUID;
  document_id: UUID | null;
  draft_id: UUID | null;
  user_id: UUID;
  text: string;
  highlight_from: number;
  highlight_to: number;
  page_number: number | null;
  color: AnnotationColor;
  resolved: boolean;
  created_at: ISOTimestamp;
}

export interface Presentation {
  id: UUID;
  tenant_id: UUID;
  case_id: UUID;
  title: string;
  slides: Slide[];
  is_shared: boolean;
  share_token: UUID | null;
  share_expires_at: ISOTimestamp | null;
  created_by: UUID;
  created_at: ISOTimestamp;
}

export interface Slide {
  id: string;
  slide_type: SlideType;
  order: number;
  title: string | null;
  body: string | null;
  notes: string | null;
  doc_id: UUID | null;
  doc_page: number | null;
  annotations: SlideAnnotation[] | null;
  exhibit_number: string | null;
}

export interface SlideAnnotation {
  type: 'arrow' | 'circle' | 'rectangle' | 'text';
  x: number;
  y: number;
  label?: string;
}

export interface Notification {
  id: UUID;
  tenant_id: UUID;
  user_id: UUID;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  related_case_id: UUID | null;
  related_hearing_id: UUID | null;
  created_at: ISOTimestamp;
}

export interface Subscription {
  id: UUID;
  tenant_id: UUID;
  razorpay_subscription_id: string | null;
  plan: TenantPlan;
  status: SubscriptionStatus;
  trial_ends_at: ISOTimestamp | null;
  current_period_start: ISOTimestamp;
  current_period_end: ISOTimestamp;
  cancel_at_period_end: boolean;
  agent_runs_this_period: number;
  storage_bytes_used: number;
  whatsapp_messages_this_period: number;
  invoices_this_period: number;
  created_at: ISOTimestamp;
}

// ── v1.1 New Entity Types ─────────────────────────────────────

export interface Client {
  id: UUID;
  tenant_id: UUID;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  id_proof_type: IdProofType | null;
  id_proof_number: string | null;
  id_proof_s3_key: string | null;
  portal_user_id: UUID | null;
  preferred_language: PreferredLanguage;
  whatsapp_opted_in: boolean;
  whatsapp_opted_out_at: ISOTimestamp | null;
  sms_opted_in: boolean;
  email_opted_in: boolean;
  notification_prefs: ClientNotificationPrefs;
  notes: string | null;
  engaged_since: ISODate | null;
  outstanding_balance_paise: Paise;
  created_by: UUID;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface ClientNotificationPrefs {
  hearing_reminder?: boolean;
  outcome_update?: boolean;
  invoice?: boolean;
  documents_shared?: boolean;
}

export interface CaseClient {
  case_id: UUID;
  client_id: UUID;
  role: ClientRole;
  added_by: UUID;
  added_at: ISOTimestamp;
}

export interface CourtSyncJob {
  id: UUID;
  tenant_id: UUID;
  case_id: UUID;
  cnr_number: string;
  court_portal: CourtPortal;
  trigger: 'scheduled' | 'manual';
  status: CourtSyncStatus;
  fetched_date: ISODate | null;
  fetched_time: ISTTime | null;
  fetched_court_room: string | null;
  fetched_status: string | null;
  fetched_order_date: ISODate | null;
  conflict_detected: boolean;
  auto_updated: boolean;
  error_message: string | null;
  response_time_ms: number | null;
  synced_at: ISOTimestamp;
}

export interface WhatsAppMessage {
  id: UUID;
  tenant_id: UUID;
  recipient_phone: string;
  recipient_type: 'advocate' | 'client';
  recipient_id: UUID;
  message_type: WhatsAppMessageType;
  template_name: string;
  template_variables: Record<string, string>;
  wa_message_id: string | null;
  delivery_status: WaDeliveryStatus;
  delivered_at: ISOTimestamp | null;
  read_at: ISOTimestamp | null;
  failure_reason: string | null;
  related_case_id: UUID | null;
  related_hearing_id: UUID | null;
  attachment_s3_key: string | null;
  sent_at: ISOTimestamp;
}

export interface ClientNotification {
  id: UUID;
  tenant_id: UUID;
  client_id: UUID;
  case_id: UUID | null;
  hearing_id: UUID | null;
  notification_type: ClientNotificationType;
  channels_attempted: Array<'whatsapp' | 'sms' | 'email'>;
  whatsapp_message_id: UUID | null;
  sms_status: 'not_sent' | 'sent' | 'delivered' | 'failed';
  sms_provider_id: string | null;
  email_status: 'not_sent' | 'sent' | 'delivered' | 'bounced';
  email_message_id: string | null;
  content_snapshot: Record<string, unknown>;
  client_instruction: string | null;
  scheduled_for: ISOTimestamp;
  sent_at: ISOTimestamp | null;
  created_at: ISOTimestamp;
}

export interface Invoice {
  id: UUID;
  tenant_id: UUID;
  client_id: UUID;
  case_id: UUID | null;
  invoice_number: string;
  invoice_date: ISODate;
  due_date: ISODate | null;
  status: InvoiceStatus;
  line_items: InvoiceLineItem[];
  subtotal_paise: Paise;
  gst_rate: 0 | 5 | 18;
  gst_amount_paise: Paise;
  total_paise: Paise;
  amount_paid_paise: Paise;
  balance_paise: Paise;
  firm_gstin: string | null;
  bank_account_details: BankDetails | null;
  upi_qr_s3_key: string | null;
  pdf_s3_key: string | null;
  notes: string | null;
  razorpay_payment_link: string | null;
  reminder_sent_dates: ISODate[];
  cancelled_at: ISOTimestamp | null;
  cancelled_by: UUID | null;
  created_by: UUID;
  created_at: ISOTimestamp;
  issued_at: ISOTimestamp | null;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_paise: Paise;
  amount_paise: Paise;
}

export interface BankDetails {
  bank_name: string;
  account_number: string;
  ifsc: string;
  account_name: string;
  upi_id?: string;
}

export interface InvoicePayment {
  id: UUID;
  tenant_id: UUID;
  invoice_id: UUID;
  client_id: UUID;
  amount_paise: Paise;
  payment_date: ISODate;
  payment_mode: PaymentMode;
  reference_number: string | null;
  notes: string | null;
  recorded_by: UUID;
  razorpay_payment_id: string | null;
  created_at: ISOTimestamp;
}

export interface DocumentTag {
  id: UUID;
  tenant_id: UUID;
  document_id: UUID;
  tag: string;  // lowercase, max 50 chars
  created_by: UUID;
  created_at: ISOTimestamp;
}

// ── API Response Wrappers ─────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    cursor?: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    field?: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ── Plan Limits ───────────────────────────────────────────────

export const PLAN_LIMITS: Record<TenantPlan, {
  max_users: number | null;
  max_active_cases: number | null;
  agent_runs_per_month: number | null;
  storage_gb: number;
  ecourts_cnrs: number | null;
  whatsapp_messages_per_month: number;
  invoices_per_month: number | null;
  client_portal: boolean;
  presentations: boolean;
  collaborative_editing: boolean;
  api_access: boolean;
}> = {
  starter: {
    max_users: 2,
    max_active_cases: 10,
    agent_runs_per_month: 999,
    storage_gb: 5,
    ecourts_cnrs: 10,
    whatsapp_messages_per_month: 0,
    invoices_per_month: 10,
    client_portal: false,
    presentations: false,
    collaborative_editing: false,
    api_access: false,
  },
  professional: {
    max_users: 10,
    max_active_cases: null,
    agent_runs_per_month: 500,
    storage_gb: 50,
    ecourts_cnrs: null,
    whatsapp_messages_per_month: 100,
    invoices_per_month: null,
    client_portal: true,
    presentations: true,
    collaborative_editing: true,
    api_access: false,
  },
  enterprise: {
    max_users: null,
    max_active_cases: null,
    agent_runs_per_month: null,
    storage_gb: 500,
    ecourts_cnrs: null,
    whatsapp_messages_per_month: Infinity,
    invoices_per_month: null,
    client_portal: true,
    presentations: true,
    collaborative_editing: true,
    api_access: true,
  },
};

// ── Court Status Display Labels ───────────────────────────────
// Maps internal ENUM → client-facing plain English (PRD CP-02)

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  intake: 'Case Intake',
  filed: 'Case Filed',
  pending_hearing: 'Hearing Scheduled',
  arguments: 'Arguments in Progress',
  reserved: 'Judgment Awaited',
  decided: 'Decided',
  appeal: 'Appeal Filed',
  closed: 'Closed',
};
