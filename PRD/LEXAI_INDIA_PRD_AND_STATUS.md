# LexAI India — Master PRD & Status Document
**Last updated:** April 16, 2026  
**Version:** 2.4  
**Document purpose:** Single source of truth. Reading this document alone gives complete understanding of the product, architecture, current build state, and what remains.

---

## 1. Product Overview

**LexAI India** is an AI-native legal SaaS platform built specifically for Indian advocates. It combines case management, AI-powered legal research and document drafting, court calendar management, client billing, and a filing repository — all in one place.

**Brand name:** Sovereign Counsel  
**Target users:** Indian advocates — managing partners, senior associates, junior associates, clerks  
**Business model:** B2B SaaS, multi-tenant, per-seat pricing via Razorpay subscriptions  
**Jurisdiction coverage:** Supreme Court of India + all 25 High Courts + District Courts  

---

## 2. Tech Stack

### Infrastructure
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14.2.0 (App Router), React, TypeScript |
| Backend | Fastify (Node.js), TypeScript |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| AI | Anthropic Claude claude-sonnet-4-6 |
| Document OCR | LlamaParse (PDFs), Claude Vision (images) |
| Auth | JWT (access + refresh tokens) |
| File Storage | Supabase Storage |
| Deployment | Vercel (web) + Railway (API) |
| Monorepo | npm workspaces + Turborepo |

### Repo Structure
```
/Users/LegalCraft/Desktop/lexai-platform/
├── apps/
│   ├── web/                          # Next.js frontend (Vercel)
│   │   └── src/app/
│   │       ├── layout.tsx            # Root layout with AppShell
│   │       ├── dashboard/page.tsx    # Dashboard
│   │       ├── cases/
│   │       │   ├── page.tsx          # Cases list
│   │       │   ├── new/page.tsx      # New case form
│   │       │   └── [id]/page.tsx     # Case detail (9 tabs) ← MAIN FILE
│   │       ├── calendar/page.tsx     # Court schedule calendar
│   │       ├── filings/page.tsx      # Filings library
│   │       ├── drafts/page.tsx       # Global drafts list
│   │       ├── agents/page.tsx       # AI agents page
│   │       ├── clients/page.tsx      # Client management
│   │       ├── invoices/page.tsx     # Billing / invoices
│   │       ├── presentations/[id]/   # Slide builder
│   │       ├── settings/page.tsx     # Settings
│   │       └── admin/page.tsx        # Admin panel (placeholder)
│   │   └── src/components/layout/
│   │       └── AppShell.tsx          # Sidebar + topbar + notification drawer
│   │   └── src/lib/
│   │       ├── filingRepository.ts   # 26 standard Indian court filings data
│   │       └── courtHolidays.ts      # National holidays + 25 HC vacation windows
│   └── api/                          # Fastify backend (Railway)
│       └── src/
│           ├── server.ts             # Route registrations
│           ├── routes/               # All API routes
│           └── jobs/
│               ├── agent.worker.ts   # AI agent job processor
│               ├── ocr.worker.ts     # Document OCR processor
│               └── scheduler.ts      # node-cron scheduler
└── packages/
    └── db/prisma/schema.prisma       # Full DB schema
```

### Environment Variables (Railway)
```
DATABASE_URL          # Supabase PostgreSQL connection string
ANTHROPIC_API_KEY     # Claude API key
LLAMAPARSE_API_KEY    # LlamaParse for PDF OCR
SUPABASE_URL          # Supabase project URL
SUPABASE_SERVICE_KEY  # Supabase service role key
JWT_SECRET            # JWT signing secret
REDIS_URL             # Redis (optional - workers run in low-Redis mode if absent)
```

### Environment Variables (Vercel)
```
NEXT_PUBLIC_API_URL   # Railway API base URL (https://lexai-platform-production.up.railway.app)
```

---

## 3. Database Schema (Key Models)

### Core Models
| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `Tenant` | Law firm / organisation | plan, subscription_status |
| `User` | Advocate / staff | role, tenant_id, full_name, email |
| `Case` | Legal case | title, court, cnr_number, case_type, court_level, status, perspective, assigned_advocates[] |
| `Document` | Case documents | filename, extracted_text (JSON), processing_status, category, previous_version_id |
| `Hearing` | Court hearing dates | date, time, purpose, court_room, case_id |
| `Task` | Tasks per case | title, status, priority, due_date, type |
| `AgentJob` | AI agent runs | type, status, input, output, case_id |
| `Draft` | Legal document drafts | title, doc_type, content (JSON), word_count, version |
| `DraftVersion` | Draft version history | content_snapshot, word_count, version_number |
| `Notification` | User notifications | type, title, message, read, action_url |
| `Presentation` | Slide decks | title, slides (JSON), share_token |
| `Client` | Client/party records | name, id_proof_type, contact_details |
| `Invoice` | Billing invoices | amount, status, payment_mode |
| `TimelineEvent` | Case timeline | event_type, date, description, is_ai_generated |
| `EvidenceItem` | Evidence per case | title, type, strength, description |
| `LegalCitation` | Legal citations | case_name, citation, court, year, relevance |

### Key Enums
```
CaseType: criminal_sessions | criminal_magistrate | writ_hc | civil_district |
          corporate_nclt | family | labour | ip | tax | arbitration | consumer

CourtLevel: supreme_court | high_court | district_court | tribunal | magistrate

DraftDocType: bail_application | plaint | written_statement | writ_petition |
              affidavit | vakalatnama | opening_statement | closing_statement |
              rejoinder | memo_of_appeal | other

NotificationType: agent_completed | agent_failed | hearing_reminder | 
                  invoice_due | document_processed | task_due

AgentType: evidence | timeline | research | strategy | deposition

HearingPurpose: bail | arguments | judgment | framing_of_charges | evidence |
                cross_examination | interim_order | examination | misc
```

---

## 4. API Routes (All Registered)

**Base URL:** `https://lexai-platform-production.up.railway.app/v1`

| Route | Methods | Purpose |
|-------|---------|---------|
| `/auth/login` | POST | JWT login |
| `/auth/refresh` | POST | Token refresh |
| `/cases` | GET, POST | Case list + create |
| `/cases/:id` | GET, PATCH, DELETE | Case detail |
| `/documents` | GET, POST | Document upload/list |
| `/documents/:id/translate` | POST | AI translation (22 Indian languages) |
| `/hearings` | GET, POST, PATCH, DELETE | Hearing management |
| `/tasks` | GET, POST, PATCH, DELETE | Task management |
| `/agents` | GET, POST | AI agent jobs |
| `/agents/:id` | GET | Job status + output |
| `/drafts/case/:case_id` | GET | Drafts per case |
| `/drafts/:id` | GET, PATCH, DELETE | Draft CRUD |
| `/drafts` | POST | Create draft |
| `/filings/ai-draft` | POST | AI draft generation (server-side proxy) |
| `/calendar` | GET | Hearings + tasks in date range |
| `/calendar/today-briefing` | GET | Today's hearings |
| `/notifications` | GET | User notifications (last 30) |
| `/notifications/:id/read` | PATCH | Mark notification read |
| `/notifications/read-all` | PATCH | Mark all read |
| `/presentations` | GET, POST | Presentation CRUD |
| `/presentations/:id` | GET, PATCH, DELETE | Presentation detail |
| `/presentations/:id/share` | POST | Generate share token |
| `/clients` | GET, POST, PATCH, DELETE | Client management |
| `/invoices` | GET, POST, PATCH | Invoice management |
| `/dashboard` | GET | Dashboard stats |
| `/users` | GET, PATCH | User profile |
| `/tenants` | GET, PATCH | Tenant settings |

---

## 5. AI Agent System

### How It Works
1. User selects an agent type and runs it on a case
2. Frontend POSTs to `/v1/agents` → creates AgentJob with status `queued`
3. `agent.worker.ts` picks up the job (polling loop, no Redis needed)
4. Worker fetches all case documents, truncates to token limits, sends to Claude
5. Claude responds with structured analysis
6. Worker saves results to DB (evidence items, timeline events, legal citations)
7. Notification is created with type `agent_completed` or `agent_failed`
8. Frontend polls job status and displays results

### Agent Types
| Type | Output | DB Tables Written |
|------|--------|------------------|
| `evidence` | Evidence strength analysis per document | `EvidenceItem` |
| `timeline` | Chronological event reconstruction | `TimelineEvent` |
| `research` | Legal citations and precedents | `LegalCitation` |
| `strategy` | Court strategy recommendations | `AgentJob.output` |
| `deposition` | Witness preparation questions | `AgentJob.output` |

### Worker Config
- Max chars per doc: 4,000
- Max total chars across all docs: 12,000
- Max tokens for strategy/research: 4,000; others: 2,000
- 429 retry: flat 65-second wait
- Evidence/timeline DB saves are non-fatal (wrapped in own try/catch)
- Outer catch sanitises error messages (raw JSON never saved as error)

---

## 6. Frontend — Page by Page

### AppShell (`/components/layout/AppShell.tsx`)
- Fixed left sidebar (240px) with logo, user chip, nav items, sign out
- Top bar: Back button, breadcrumbs, + New Case, Bell notification icon
- **Notification drawer:** Opens on bell click, shows 30 most recent notifications, type-specific icons, relative timestamps, mark read on click, Mark All Read button, polling every 60 seconds, outside-click to close
- Mobile: hamburger + bottom tab bar
- Unread badge: red dot on bell when unread count > 0

### Dashboard (`/dashboard`)
- Today's hearings, pending tasks, recent cases
- Today briefing card

### Cases List (`/cases`)
- Filterable by status, court level, case type
- Search by title or CNR
- New Case button

### Case Detail (`/cases/[id]`) — 9 Tabs
This is the core of the application.

| Tab | Key | Status | Features |
|-----|-----|--------|---------|
| Overview | `overview` | ✅ Complete | Case metadata, assigned advocates, next hearing |
| Documents | `documents` | ✅ Complete | Upload, OCR status, translation button (purple), translation modal |
| Hearings | `hearings` | ✅ Complete | Add/edit hearings, hearing history |
| Tasks | `tasks` | ✅ Complete | Task list, create/complete/delete tasks |
| Agents | `agents` | ✅ Complete | 5 agent types, run status, output display |
| Drafts | `drafts` | ✅ Complete | Create drafts, editor with AI Generate, Save, Download, Delete |
| Presentations | `presentations` | ✅ Complete | Create deck, AI generate, full-screen present mode |
| Case Timeline | `timeline` | ✅ Complete | Chronological events with TODAY divider |
| Filings | `filings` | ✅ Complete | Relevant filings for case type, links to library with pre-selection |

### Calendar (`/calendar`)
- Monthly grid view
- Hearing pills with colour-coded purpose badges
- Task pills
- Sidebar: monthly summary, upcoming hearings
- Agenda section for selected date
- Court Holiday Calendar integrated (all national + 25 HC vacation windows)
- Toggle to show/hide holidays

### Filings Library (`/filings`)
- **Top filter bar:** Search (280px) + Case Type dropdown + Jurisdiction dropdown + Stage select + Clear all
- 26 standard Indian court filings across all case categories
- Jurisdictions: Supreme Court + all 25 High Courts
- Detail panel (sticky): 3 tabs — Filing Guide, Documents, Law & Sections
- Law & Sections: expandable cards with plain-English descriptions
- AI Draft: calls `/v1/filings/ai-draft` (server-side proxy to avoid CORS)
- Template download: generates `.txt` file
- **Auto-selection from case:** When navigating from a case's Filings tab, URL params auto-select the category, jurisdiction, and open the specific filing panel
- Case context banner shown when auto-selected

### Presentations (`/presentations/[id]`)
- Slide builder with AI generation
- Perspective selector (prosecution/defence/neutral)
- Full-screen present mode with keyboard navigation
- Progress bar, slide strip

### Drafts Global (`/drafts`)
- Lists all drafts across all cases
- Links back to case

### Admin (`/admin`)
- Currently "Coming Soon" placeholder

---

## 7. Document Translation System

- Supported: 22 Indian scheduled languages → English
- For text documents: extracts text, sends to Claude for translation
- For image documents: uses Claude Vision OCR (not LlamaParse)
- Creates a sibling Document record with filename `[original] — English Translation.txt`
- Stores translation as JSON in `extracted_text` field
- Links sibling via `previous_version_id` field
- Translation modal shows: detected language, confidence score, legal terms highlighted, full translation, copy button

---

## 8. Filing Repository Data

**File:** `/apps/web/src/lib/filingRepository.ts`

Contains 26 standard Indian court filings:
- Vakalatnama, Caveat Petition
- Bail Application, Anticipatory Bail, Default Bail
- Application for Discharge, Quashing Petition (S.528 BNSS)
- Criminal Revision, Criminal Appeal, SLP (Criminal & Civil)
- Civil Suit Plaint, Written Statement, Interim Injunction
- Execution Petition, Civil SLP
- Writ Petition (HC), Writ Petition (SC), PIL
- Divorce Petition, Maintenance Application, Child Custody Petition
- Cheque Dishonour (S.138 NI Act), Insolvency Application (IBC)
- MACT Claim, Writ — Service Matters
- Contempt Petition, Stay Application, Condonation of Delay, Amendment Application

Each filing has: description, category, stage, format, court_fee, filing_guide (who files, when, key contents, supporting docs, time limit, tips), ai_prompt_hint, relevant_sections.

**Court Holiday Library:** `/apps/web/src/lib/courtHolidays.ts`
- All national holidays 2025-2026
- Supreme Court + all 25 HC vacation windows

---

## 9. Current Build Status

### ✅ COMPLETE — Production Ready

| Feature | PRD Ref | Notes |
|---------|---------|-------|
| Authentication (login/logout/refresh) | AUTH-01–04 | JWT, role-based |
| Case Management (CRUD) | CASE-01–08 | All case types, full metadata |
| Document Upload + OCR | DOC-01–06 | LlamaParse + Claude Vision |
| Document Translation | DOC-07 | 22 Indian languages |
| Hearing Management | HEAR-01–05 | Full CRUD |
| Task Management | TASK-01–04 | Full CRUD with priorities |
| AI Agents (5 types) | AGENT-01–05 | Evidence, Timeline, Research, Strategy, Deposition |
| Court Calendar | CAL-01–08 | Monthly grid + agenda + court holidays |
| Case Timeline | CASE-09 | AI reconstructed + manual events |
| Drafting Workspace | DW-01–05 | Editor, AI generate, save, download, versioning |
| Presentation Module | PRES-01–05 | Slide builder, AI generate, present mode |
| Filing Repository | — | 26 filings, all 26 jurisdictions, AI draft, template |
| Notification Centre | NOTIF-01–04 | Bell + drawer, polling, mark read |
| Client Management | CLIENT-01–04 | Basic CRUD |
| Billing / Invoices | BILL-01–05 | Invoice CRUD |
| Dashboard | DASH-01–03 | Today's summary |

### 🔄 IN PROGRESS

| Feature | Status | Notes |
|---------|--------|-------|
| Drafts — `petition` doc type bug | Fixed (deploying) | `petition` not in DB enum, replaced with `plaint`/`writ_petition` |

### ❌ NOT STARTED — P1

| Feature | PRD Ref | Notes |
|---------|---------|-------|
| Export PDF/PPTX | PRES-06 | PDF via Puppeteer (server-side), PPTX via pptxgenjs |

### ❌ NOT STARTED — P2

| Feature | PRD Ref | Notes |
|---------|---------|-------|
| eCourts Sync | SYNC-01 | Auto-pull hearing dates from eCourts portal, external dependency |
| Admin Panel | ADMIN-01 | Tenant management, usage stats, user management |
| WhatsApp Integration | WA-01 | All code built, parked — needs Meta business approval + Indian virtual number |
| Client Portal | CLIENT-05 | Separate `/client` login for clients, read-only view |
| Razorpay Subscriptions | BILL-06 | Subscription billing, plan enforcement |

---

## 10. Known Bugs & Issues

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| 1 | Draft creation fails for `petition` doc type — not in DraftDocType enum | High | Fixed (deploying) |
| 2 | Filings tab in case detail had multiple crash iterations due to complex component | Fixed | Resolved by simplifying to card grid linking to global filings page |
| 3 | Global filings page had multiple build failures due to unclosed JSX divs from iterative edits | Fixed | Resolved by full clean rewrite |
| 4 | AI draft in filings called Anthropic directly from browser → CORS block | Fixed | Now routes through `/v1/filings/ai-draft` server-side proxy |
| 5 | `useState` called inside conditional (`if (editingDraft)`) in DraftingWorkspace | Fixed | Hoisted to component top, synced via `useEffect` |
| 6 | `useSearchParams` in filings page required `Suspense` wrapper for Next.js 14 | Fixed | Wrapped in `Suspense` |
| 7 | AppShell webhooks import caused Railway crash (`./routes/webhooks.js` not found) | Fixed | Import removed, WhatsApp parked |
| 8 | Agent worker: jobs stuck in `running` state | Mitigation | DB command: `UPDATE agent_jobs SET status='failed' WHERE status IN ('running','queued')` |
| 9 | Translation sibling docs — Document model has no `metadata` JSONB field | Fixed | Uses `extracted_text` JSON + `previous_version_id` for sibling linking |

---

## 11. Deployment

### Vercel (Frontend)
- Branch: `main` auto-deploys
- URL: `https://lexai-platform-web.vercel.app`
- Framework: Next.js detected automatically

### Railway (API)
- Branch: `main` auto-deploys
- URL: `https://lexai-platform-production.up.railway.app`
- Starts 4 processes: server, agent worker, OCR worker, scheduler
- Runs in low-Redis mode (no Redis dependency required)

### Deploy Command (from monorepo root)
```bash
git add -A
git commit -m "feat/fix: description"
git push origin main
```

### Common Railway Fixes
```bash
# If deployment fails with MODULE_NOT_FOUND:
# Check server.ts for any imports of non-existent files

# If agent jobs are stuck:
# Run in Supabase SQL editor:
UPDATE agent_jobs SET status='failed' WHERE status IN ('running','queued');
```

---

## 12. Working Files in Container

These files are maintained in the Claude container and are the source of truth for files not yet fully deployed:

| File | Purpose |
|------|---------|
| `/home/claude/case-detail-CLEAN.tsx` | Latest case detail page (9 tabs) |
| `/home/claude/AppShell-new.tsx` | Latest AppShell with notification drawer |
| `/home/claude/filings-page-CLEAN.tsx` | Latest filings page |
| `/home/claude/lexai/lexai-platform/` | Full repo clone |

---

## 13. Product Roadmap

### Phase 5 (Next Up)
1. **Export PDF/PPTX** — Presentations export via Puppeteer + pptxgenjs
2. **Admin Panel** — Tenant management, usage analytics, user management
3. **eCourts Sync** — Auto-pull hearing dates

### Phase 6 (Future)
4. **Client Portal** — Separate login for clients, read-only case status view
5. **Razorpay Subscriptions** — Plan enforcement and billing
6. **WhatsApp Integration** — Resume after Meta business approval
7. **iOS/Android App** — React Native wrapper
8. **Pen Test + Security Audit** — Pre-launch

---

## 14. Design System

| Token | Value |
|-------|-------|
| Primary Navy | `#022448` |
| Gold Accent | `#735c00` / `#ffe088` |
| Background | `#f4f5f7` |
| Font — Headings | Newsreader (serif) |
| Font — Body | Manrope (sans-serif) |
| Font — Legal Docs | Georgia (serif) |
| Border Radius — Cards | 12–16px |
| Border Radius — Inputs | 8–10px |
| Shadow — Cards | `0 1px 4px rgba(2,36,72,0.04)` |
| Shadow — Modals | `0 8px 32px rgba(2,36,72,0.1)` |

---

*This document is maintained by Claude and updated at the end of each development session.*
