// ============================================================
// LexAI India — API Client
// Typed wrapper around all Fastify API endpoints
// PRD v1.1 Section 10 — API Design Conventions
// ============================================================

import type {
  Case, Document, Hearing, Task, AgentJob, Draft,
  Client, Invoice, Notification, User, Tenant,
  ApiResponse, CaseType, CourtLevel, CasePerspective,
  CasePriority, HearingPurpose, AgentType
} from '@lexai/core';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// Refresh the LexAI token using Supabase session
async function refreshToken(): Promise<string | null> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { session } } = await supabase.auth.refreshSession();
    if (!session) return null;

    const res = await fetch(`${BASE}/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_token: session.access_token }),
    });
    const json = await res.json();
    if (!json.data?.token) return null;

    // Update the auth store with the new token
    const { useAuthStore } = await import('../hooks/useAuth');
    const store = useAuthStore.getState();
    store.setUser(store.user!, json.data.token);
    return json.data.token;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
  isRetry = false
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${BASE}/v1${path}`, { ...options, headers });
  const json = await res.json();

  // Auto-refresh on 401 — token expired
  if (res.status === 401 && !isRetry) {
    const newToken = await refreshToken();
    if (newToken) {
      return request<T>(path, options, newToken, true);
    }
    // Refresh failed — redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  if (!res.ok) {
    throw new ApiError(
      json.error?.code || 'UNKNOWN',
      json.error?.message || 'Request failed',
      res.status
    );
  }

  return json;
}

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  getToken: (token: string) => request('/auth/token', { method: 'POST' }),
};

// ── Cases ─────────────────────────────────────────────────────
export const casesApi = {
  list: (token: string, params?: {
    status?: string; case_type?: string; search?: string; limit?: number; cursor?: string;
  }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<Case[]>(`/cases${q ? '?' + q : ''}`, {}, token);
  },

  get: (token: string, id: string) =>
    request<Case & { documents: Document[]; hearings: Hearing[]; tasks: Task[]; agent_jobs: AgentJob[] }>(
      `/cases/${id}`, {}, token
    ),

  create: (token: string, data: {
    title: string; case_type: CaseType; court: string; court_level: CourtLevel;
    perspective: CasePerspective; cnr_number?: string; priority?: CasePriority;
    assigned_advocates: string[]; metadata?: Record<string, unknown>;
  }) => request<Case>('/cases', { method: 'POST', body: JSON.stringify(data) }, token),

  update: (token: string, id: string, data: Partial<Case>) =>
    request<Case>(`/cases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),

  updateStatus: (token: string, id: string, status: Case['status']) =>
    request<Case>(`/cases/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
};

// ── Documents ─────────────────────────────────────────────────
export const documentsApi = {
  presign: (token: string, data: {
    filename: string; mime_type: string; file_size_bytes: number;
    case_id: string; doc_category?: string;
  }) => request<{ presigned_url: string; s3_key: string; doc_id: string }>(
    '/documents/presign', { method: 'POST', body: JSON.stringify(data) }, token
  ),

  register: (token: string, data: {
    s3_key: string; filename: string; mime_type: string;
    file_size_bytes: number; case_id: string; doc_category?: string;
  }) => request<Document>('/documents', { method: 'POST', body: JSON.stringify(data) }, token),

  getDownloadUrl: (token: string, id: string) =>
    request<{ download_url: string }>(`/documents/${id}/download`, {}, token),

  search: (token: string, q: string, opts?: { case_id?: string; mode?: 'keyword' | 'semantic' }) => {
    const params = new URLSearchParams({ q, ...opts } as any).toString();
    return request<any[]>(`/documents/search?${params}`, {}, token);
  },

  setShared: (token: string, id: string, shared: boolean) =>
    request<Document>(`/documents/${id}/share`, {
      method: 'PATCH', body: JSON.stringify({ shared_with_client: shared })
    }, token),

  delete: (token: string, id: string) =>
    fetch(`${BASE}/v1/documents/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    }),
};

// Helper: full upload flow (presign → S3 → register)
export async function uploadDocument(
  token: string,
  file: File,
  caseId: string,
  docCategory?: string
): Promise<Document> {
  // Step 1: Get presigned URL
  const presignRes = await documentsApi.presign(token, {
    filename: file.name, mime_type: file.type,
    file_size_bytes: file.size, case_id: caseId,
    doc_category: docCategory,
  });
  const { presigned_url, s3_key } = presignRes.data;

  // Step 2: Upload directly to S3
  const uploadRes = await fetch(presigned_url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!uploadRes.ok) throw new Error('S3 upload failed');

  // Step 3: Register in DB
  const docRes = await documentsApi.register(token, {
    s3_key, filename: file.name, mime_type: file.type,
    file_size_bytes: file.size, case_id: caseId, doc_category: docCategory,
  });
  return docRes.data;
}

// ── Hearings ──────────────────────────────────────────────────
export const hearingsApi = {
  listForCase: (token: string, caseId: string) =>
    request<Hearing[]>(`/hearings/case/${caseId}`, {}, token),

  create: (token: string, data: {
    case_id: string; date: string; time?: string; court_room?: string;
    judge_name?: string; purpose: HearingPurpose; client_instruction?: string;
  }) => request<Hearing>('/hearings', { method: 'POST', body: JSON.stringify(data) }, token),

  recordOutcome: (token: string, id: string, data: {
    outcome: string; order_summary?: string; next_hearing_date?: string;
  }) => request<Hearing>(`/hearings/${id}/outcome`, {
    method: 'PATCH', body: JSON.stringify(data)
  }, token),
};

// ── Tasks ─────────────────────────────────────────────────────
export const tasksApi = {
  list: (token: string, params?: { case_id?: string; status?: string }) => {
    const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<Task[]>(`/tasks${q}`, {}, token);
  },
  create: (token: string, data: {
    case_id: string; title: string; description?: string;
    priority?: string; assigned_to?: string[]; due_date?: string;
  }) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }, token),

  update: (token: string, id: string, data: {
    status?: string; title?: string; priority?: string;
    due_date?: string | null; assigned_to?: string[];
  }) => request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
};

// ── Agents ────────────────────────────────────────────────────
export const agentsApi = {
  run: (token: string, caseId: string, agentType: AgentType, opts?: {
    research_focus?: string; perspective?: string; chain?: boolean;
  }) => request<{ job_id: string; status: string }>(
    `/agents/cases/${caseId}/run/${agentType}`,
    { method: 'POST', body: JSON.stringify(opts || {}) }, token
  ),

  getForCase: (token: string, caseId: string) =>
    request<{ latest: Record<string, AgentJob>; all: AgentJob[] }>(
      `/agents/cases/${caseId}`, {}, token
    ),

  getJob: (token: string, jobId: string) =>
    request<AgentJob>(`/agents/jobs/${jobId}`, {}, token),

  promote: (token: string, jobId: string) =>
    request<Draft>(`/agents/jobs/${jobId}/promote`, { method: 'POST', body: '{}' }, token),
};

// ── Calendar ──────────────────────────────────────────────────
export const calendarApi = {
  get: (token: string, from?: string, to?: string, view?: string) => {
    const q = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}), ...(view ? { view } : {}) }).toString();
    return request<{ hearings: any[]; tasks: Task[] }>(`/calendar${q ? '?' + q : ''}`, {}, token);
  },
  todayBriefing: (token: string) =>
    request<{ hearings_today: number; hearings: any[] }>('/calendar/today-briefing', {}, token),
};

// ── Clients ───────────────────────────────────────────────────
export const clientsApi = {
  list: (token: string) => request<Client[]>('/clients', {}, token),
  get: (token: string, id: string) => request<Client>(`/clients/${id}`, {}, token),
  create: (token: string, data: Partial<Client>) =>
    request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }, token),
  update: (token: string, id: string, data: Partial<Client>) =>
    request<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
};

// ── Invoices ──────────────────────────────────────────────────
export const invoicesApi = {
  list: (token: string) => request<Invoice[]>('/invoices', {}, token),
  get: (token: string, id: string) => request<Invoice>(`/invoices/${id}`, {}, token),
  create: (token: string, data: Partial<Invoice>) =>
    request<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(data) }, token),
  markPaid: (token: string, id: string, payment: {
    amount_paise: number; payment_date: string;
    payment_mode: string; reference_number?: string;
  }) => request<Invoice>(`/invoices/${id}/payment`, {
    method: 'POST', body: JSON.stringify(payment)
  }, token),
};

// ── Notifications ─────────────────────────────────────────────
export const notificationsApi = {
  list: (token: string) => request<Notification[]>('/notifications', {}, token),
  markRead: (token: string, id: string) =>
    request<void>(`/notifications/${id}/read`, { method: 'PATCH' }, token),
  markAllRead: (token: string) =>
    request<void>('/notifications/read-all', { method: 'PATCH' }, token),
};

// ── Billing ───────────────────────────────────────────────────
export const billingApi = {
  getSubscription: (token: string) =>
    request<any>('/billing/subscription', {}, token),
};

export { ApiError };
