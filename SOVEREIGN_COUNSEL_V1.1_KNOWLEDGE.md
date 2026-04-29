# Sovereign Counsel (LexAI India) — Knowledge Document
**Version:** 1.1  
**Last updated:** April 2026  
**Purpose:** Share this file at the START of every new Claude session. Claude can rebuild the entire product from this document alone.

---

## HOW TO USE THIS DOCUMENT

1. Start a new Claude chat
2. Upload this file
3. Say what you want to build or fix
4. All fixes are delivered as downloadable files — copy to correct path and push

**Standard push workflow:**
```bash
cd ~/Desktop/lexai-platform
cp ~/Downloads/filename.tsx "apps/web/src/app/..."
git add <files>
git commit -m "feat/fix: description"
git push origin main
```

---

## 1. PRODUCT OVERVIEW

**Product name:** Sovereign Counsel (brand) / LexAI India (internal)  
**What it is:** AI-powered practice management platform for Indian advocates  
**Tagline:** AI-Powered Legal Practice Management for Indian Advocates

**Core value props:**
- India-first AI — BNS/BNSS/BSA 2023 (new codes replacing IPC/CrPC/IEA from July 2024)
- Correct court salutations ("My Lord" HC/SC, "Your Honour" district)
- SCC citation format, FIR delay significance, Indian witness conventions (PW/DW/CW)
- 5 AI agents: Evidence, Timeline, Research, Deposition, Strategy
- Full practice management: cases, hearings, tasks, drafts, invoices, calendar
- Document OCR + translation (17 Indian languages → saves as `filename — Translated.txt`)
- 58 standard Indian court filings with AI drafting
- In-document fuzzy + phonetic search

**BRANDING RULE:** Never show AI vendor names (Claude, Anthropic, GPT, OpenAI) in UI. Use "Our AI agents" or "Our AI".

---

## 2. REPOSITORY

**GitHub:** `github.com/pavanraguru/lexai-platform`  
**Branch:** `main`  
**Local path on dev Mac:** `~/Desktop/lexai-platform`

```
lexai-platform/
├── apps/
│   ├── web/          → Next.js 14.2 frontend → Vercel
│   └── api/          → Fastify backend → Railway
├── packages/
│   ├── core/         → Shared types, PLAN_LIMITS, enums
│   └── db/           → Prisma schema + migrations
└── SOVEREIGN_COUNSEL_V1.1_KNOWLEDGE.md  ← this file, committed to repo
```

---

## 3. TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14.2 (App Router), React, TypeScript |
| Backend | Fastify (Node.js), TypeScript |
| Database | PostgreSQL via Supabase (Prisma ORM) |
| Auth | Supabase Auth (JWT) |
| File storage | AWS S3 — ap-south-1 (Mumbai) |
| AI model | Claude Sonnet via Anthropic API |
| OCR | LlamaParse (LlamaIndex) |
| Frontend deploy | Vercel |
| Backend deploy | Railway |
| Payments | Razorpay |
| State | Zustand (auth), React Query (server state) |
| Styling | **Inline React.CSSProperties ONLY — NO Tailwind, NO CSS modules** |

---

## 4. DEPLOYMENT URLS

- **Frontend:** `https://lexai-platform-web.vercel.app`
- **Backend:** `https://lexai-platform-production.up.railway.app`
- **Supabase:** `pdywongerxatbhbkdpvx.supabase.co`

---

## 5. ENVIRONMENT VARIABLES

### Railway (API)
```
DATABASE_URL=postgresql://postgres:Cheppanu@56@db.pdywongerxatbhbkdpvx.supabase.co:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=20
DIRECT_URL=postgresql://postgres:Cheppanu@56@db.pdywongerxatbhbkdpvx.supabase.co:5432/postgres
SUPABASE_URL=https://pdywongerxatbhbkdpvx.supabase.co
SUPABASE_SERVICE_KEY=<key>
JWT_SECRET=<secret>
ANTHROPIC_API_KEY=<key>
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_REGION=ap-south-1
AWS_S3_BUCKET=lexai-documents
LLAMAPARSE_API_KEY=<key>
RAZORPAY_KEY_ID=<key>
RAZORPAY_KEY_SECRET=<secret>
RAZORPAY_WEBHOOK_SECRET=<secret>
ADMIN_EMAIL=pavan@legalcraft.in
```

### Vercel (Web)
```
NEXT_PUBLIC_API_URL=https://lexai-platform-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://pdywongerxatbhbkdpvx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
```

---

## 6. DATABASE — 25 MODELS

```
Tenant, User, Case, Document, Hearing, Task, AgentJob,
TimelineEvent, EvidenceItem, LegalCitation, Draft, DraftVersion,
Annotation, Presentation, Notification, AuditLog, Subscription,
Client, CaseClient, CourtSyncJob, WhatsAppMessage,
ClientNotification, Invoice, InvoicePayment, DocumentTag
```

**Critical field notes:**
- `Document.processing_status` enum: `pending | processing | ready | failed` — **NOT "completed"**
- `Document.extracted_text` — OCR text, pages split by `--- Page Break ---`
- `AgentJob.output` — NOT fetched in case load. Fetched on-demand via `GET /v1/agents/jobs/:id/output`
- `Case.metadata` — JSON field, stores folders + doc_folders. Always MERGE on PATCH, never replace
- `Subscription.agent_runs_this_period` — reset to 0 on admin login
- `Draft.content` — JSON `{ text: '...' }`. Word count extracted from `content.text`, NOT `JSON.stringify(content)`

---

## 7. API ROUTES (all prefixed `/v1/`)

```
/auth                          → login, signup, logout
/cases                         → CRUD; GET /:id returns case + docs + hearings + tasks + agent_jobs (no output)
/cases/:id (PATCH)             → metadata always merged (spread existing + new)
/documents                     → upload, presign, OCR status
/documents/:id/translation     → translation status polling
/hearings                      → CRUD + PATCH /:id/outcome
/tasks                         → CRUD + status toggle
/agents/cases/:id/run/:type    → run agent (POST, no body needed)
/agents/jobs/:id               → get job status
/agents/jobs/:id/output        → get output only (cached 5min, fetched on expand)
/agents/jobs/:id (DELETE)      → delete job from history
/search/cases/:id              → POST: content/metadata/fuzzy/nearness search
/drafts                        → CRUD; word_count auto-calc from content.text
/presentations                 → CRUD + AI generation
/filings/ai-draft              → POST: generate AI draft
/invoices                      → CRUD + PATCH (line items + discount) + revoke-payment
/billing                       → Razorpay order/verify/webhook
/dashboard/stats               → stats (30s server cache)
/calendar                      → court holidays + hearings
/ecourts                       → CNR sync
/clients, /notifications, /tenants, /users → standard CRUD
```

---

## 8. FRONTEND PAGES

```
/                → redirect to /dashboard
/login           → sign in
/signup          → new account + trial
/dashboard       → stats, hearings, recent cases (staleTime: 60s, refetch: 120s)
/cases           → case list (staleTime: 30s)
/cases/[id]      → case detail (staleTime: 30s) — see Section 9
/cases/new       → create case
/calendar        → monthly + agenda view
/invoices        → invoice management
/presentations/[id] → viewer
/filings         → AI filing library (URL params: ?filing=&case_id=&case_type=&court=&cnr=&case_title=&perspective=)
/auth/callback   → Google OAuth
```

---

## 9. CASE DETAIL PAGE

**File:** `apps/web/src/app/cases/[id]/page.tsx` (~2200 lines)

**Tab keys:** `overview | documents | hearings | tasks | agents | drafts | presentations | timeline | strategy | precedents | filings | search`

**Tab components:**
- `DocumentsTab.tsx` — folder manager, OCR, translate, preview with metadata pane
- `DraftingSidebar.tsx` — rich text editor, AI assist, word count
- `StrategyIntelPanel.tsx` — strategy + case timeline
- `PrecedentPanel.tsx` — legal precedents
- `SearchPanel.tsx` — document search

**Key states:**
```typescript
expandedJobId       // which agent run is expanded
jobOutputs          // Record<jobId, output> — lazy cache
loadingOutput       // jobId currently fetching output
showFailedJobs      // toggle failed runs visibility
deletingJobId       // job being deleted
```

**Agent output loading:** Clicking a COMPLETED run calls `toggleJobExpand()` which fetches `GET /v1/agents/jobs/:id/output` ONLY if not already in `jobOutputs` cache. Shows "Loading output..." spinner while fetching.

**Hearings — past:** Shows outcome in green card with OUTCOME label + order summary. Edit/+Record button inline. Form expands below the hearing row.

**Folders:** Saved to `case.metadata.folders` + `case.metadata.doc_folders` via PATCH `/v1/cases/:id` (1.5s debounce). NOT localStorage.

**Filing "Save to Drafts":** Requires `case_id` in URL params — without it draft has no case association and won't appear in the case's Drafts tab.

---

## 10. THE 5 AI AGENTS

`max_tokens: 6000` for all. Run inline (no Redis/BullMQ). `super_admin` bypasses all limits.

| Agent | Key output fields |
|-------|-----------------|
| Evidence | `exhibits[]`, `key_facts[]`, `contradictions[]`, `missing_evidence[]` |
| Timeline | `events[]`, `prosecution_gaps[]`, `defence_opportunities[]` |
| Research | `applicable_statutes[]`, `favorable_precedents[]`, `adverse_precedents[]` |
| Deposition | `inconsistencies[]`, `cross_examination_questions[]`, `credibility_assessment` |
| Strategy | `opening_statement`, `bench_questions[]`, `strengths[]`, `vulnerabilities[]`, `sentiment{label,score}` |

**JSON parser:** Strips markdown fences → extracts first `{...}` by brace depth → try/catch.

**Prompts:** Every agent injected with Indian legal context: BNS/BNSS/BSA 2023 (post-July 2024), IPC/CrPC/IEA (pre-July 2024), court salutations, SCC citation format, FIR delay significance, witness conventions (PW/DW/CW), exhibit marking (E-/MO-/X-).

**CRITICAL — API prompt strings:** NO backticks (`` ` ``) inside template literals. NO `stop_sequences` with newline chars. Use `~~~` instead of ` ``` `.

---

## 11. DOCUMENT SEARCH

**File:** `apps/web/src/app/cases/[id]/SearchPanel.tsx`  
**Endpoint:** `POST /v1/search/cases/:case_id`  
**Route file:** `apps/api/src/routes/search.ts`

**Modes:** Content | Metadata | Both

**Metadata searches:** filename, category (replace `_` with space), MIME type, processing_status, upload date (formatted string)

**Fuzzy algorithm:** Adaptive Levenshtein + Soundex phonetic
- 1-3 chars: exact only
- 4-6 chars: max 1 edit  
- 7+ chars: max 2 edits
- Corrections dropdown: Low(0.5×) | Medium(1×) | High(1.5×) | Max(2×)
- Soundex: groups phonetically similar words (insurance/innsurance/ensurance → same code)
- Returns **actual matched word** (not search term) for correct highlighting

**Nearness:** All terms within N words of each other on same page

**Highlight:** `#bbf7d0` pastel green bg, `#14532d` text, `fontWeight: 600`

**Page splitting:** `extracted_text.split(/--- Page Break ---/i)`

---

## 12. DOCUMENT PREVIEW — METADATA PANE

Preview modal: 1100px wide, split layout:
- **Left (~80%):** Document viewer (PDF iframe / image / text)
- **Right (260px):** Metadata panel — filename, category badge, file size, MIME type, page count, upload date+time IST, OCR status badge, document UUID

---

## 13. TRANSLATION FEATURE

1. Right-click → Translate → polls `GET /v1/documents/:id/translation` every 3s
2. On complete: **silently** saves `{basename} — Translated.txt` to case documents (same folder)
3. Shows modal: detected language, summary, full translation
4. Modal buttons: Copy Translation | Save as PDF (print dialog) | **Save to Case** (manual re-save, turns green on success)
5. Original file **untouched** — translated file appears next to it

---

## 14. MOBILE RESPONSIVENESS (added V1.1)

**AppShell (`apps/web/src/components/layout/AppShell.tsx`):**
- ≤768px: sidebar hidden, hamburger `☰` appears in topbar
- Hamburger opens full-screen drawer with all nav links
- **Bottom navigation bar** (fixed, 64px): Home | Cases | Calendar | Invoices | More(drawer)
- Desktop: sidebar unchanged, bottom nav hidden

**Case detail tabs:** Horizontal scroll on mobile (`overflowX: auto`, `flexShrink: 0` on each tab button, `scrollbarWidth: none`)

**Page padding:** All pages use `clamp(14px, 3vw, 32px)` — 14px on phone, 32px on desktop

**Grids:** `repeat(auto-fit, minmax(280px, 1fr))` — stack to 1 column on mobile

**Globals (`apps/web/src/app/globals.css`):** Added responsive utility classes:
- `.lex-hide-mobile` — hide on mobile
- `.lex-tabs` — scrollable tab row
- `.lex-stats-row` — horizontal scroll stats
- Touch targets min 36px

---

## 15. PERFORMANCE OPTIMISATIONS (added V1.1)

| Optimisation | Impact |
|-------------|--------|
| Agent output NOT loaded with case | Saved 500KB–2MB per case load |
| Lazy output fetch on expand (`GET /jobs/:id/output`) | Output only loads when user clicks |
| Output cached in `jobOutputs` state | Second expand is instant |
| `GET /cases/:id` → `Cache-Control: max-age=10` | DB not hit on every tab switch |
| `GET /jobs/:id/output` → `Cache-Control: max-age=300` | Browser caches completed output 5min |
| Case query `staleTime: 30s` | No re-fetch on tab switches |
| Dashboard query `staleTime: 60s`, refetch 120s | Dashboard doesn't poll aggressively |
| Cases list `staleTime: 30s` | List stays cached between navigations |
| `agent_jobs { take: 20 }` | Max 20 jobs loaded per case |

---

## 16. PLAN LIMITS

```typescript
starter:      { users: 2, cases: 10, agent_runs: 999, storage: 5GB }
professional: { users: 10, cases: unlimited, agent_runs: 500, storage: 50GB }
enterprise:   { users: unlimited, cases: unlimited, agent_runs: unlimited, storage: 500GB }
```

**Super admin:** Set `ADMIN_EMAIL` in Railway. On login → `role: super_admin`, `plan: professional`, expiry 2099, `agent_runs_this_period: 0`. Bypasses all limits.

---

## 17. DESIGN TOKENS

```
Primary Navy:  #022448      (P, btnPrimary background)
Gold:          #ffe088 / #735c00
Background:    #f4f5f7      (BG)
Card:          #fff, border: 1px solid rgba(196,198,207,0.2), radius: 16px
Success:       #15803d / #dcfce7
Danger:        #ba1a1a / #ffdad6
Warning:       #735c00 / #ffe088
Info:          #001c3b / #d5e3ff
Fonts:         Newsreader (headings), Manrope (body)
Styling:       Inline React.CSSProperties ONLY
```

---

## 18. CRITICAL RULES — SWC COMPILER (Vercel build failures)

**These patterns crash the build. Check before every push.**

| Pattern | Problem | Fix |
|---------|---------|-----|
| `{/* ── Section ─── */}` | Unicode `─` in JSX comment | Replace with `-` |
| Backtick inside template literal | `` `prompt with ```json` `` | Use `~~~` or plain text |
| TypeScript types in JSX `{}` | `const X = ({a}: {a: string}) =>` inside JSX | Move outside JSX |
| IIFE in JSX | `{(() => { return <div/> })()}` | Use conditional render |
| `stop_sequences` with `'\n\n...'` | Newline in array in template literal | Remove stop_sequences entirely |

**Verify before push:**
```bash
cd /tmp && npm install @swc/core   # once only
node -e "
const swc = require('./node_modules/@swc/core');
const fs = require('fs');
const code = fs.readFileSync('/path/to/file.tsx', 'utf8');
swc.transform(code, {jsc:{parser:{syntax:'typescript',tsx:true},target:'es2017'},filename:'f.tsx'})
  .then(()=>console.log('CLEAN'))
  .catch(e=>console.error('FAIL:', e.message.substring(0,300)));
"
```

---

## 19. CRITICAL RULES — API

| Rule | Detail |
|------|--------|
| `processing_status` enum | `pending \| processing \| ready \| failed` — NOT "completed" |
| Empty JSON body | Frontend `apiCall()` only sets `Content-Type: application/json` when body exists. `server.ts` has custom body parser for empty bodies |
| Case metadata PATCH | Always merge: `{ ...existingMeta, ...newMeta }` |
| Agent prompts | No backticks in template literals. No stop_sequences with newlines |
| Draft word count | Read from `body.content.text` NOT `JSON.stringify(body.content)` |
| Agent output | NOT included in `GET /v1/cases/:id`. Use `GET /v1/agents/jobs/:id/output` |

---

## 20. COURT + LEGAL DATA

**Court holidays:** Pre-loaded 2025+2026, SC + all 25 HCs  
**Limitation calculator (case Overview tab):**
- Civil/Writ: Art.113 LA — 3 years
- Criminal (Sessions): S.468 BNSS — 3 years
- Criminal (Magistrate): S.468 BNSS — 1 year
- Consumer: CP Act S.69 — 2 years
- Family: Art.54 LA — 1 year
- Arbitration: Art.137 — 3 years
- Tax: IT Act — 4 years
- Corporate/NCLT: 3 years
- Shows days remaining, progress bar, Condonation of Delay alert if expired

**Filing library:** `apps/web/src/lib/filingRepository.ts` (706 lines, 58 filings, SC + all 25 HCs)

---

## 21. ALL KNOWN BUGS FIXED

| Bug | Fix location | Fix |
|-----|-------------|-----|
| Unicode `─` in JSX → Vercel build crash | All .tsx files | Strip to `-` |
| Backtick in API template literal → Railway crash | agents.ts | Use plain text |
| `copyText(x).catch(()=>{})` mangled onClick | page.tsx | `try { navigator.clipboard.writeText(x) } catch(e) {}` |
| `FST_ERR_CTP_EMPTY_JSON_BODY` | server.ts + frontend apiCall | Custom body parser + no Content-Type on bodyless requests |
| Agent JSON truncated | agents.ts | `max_tokens: 6000` all agents |
| Folders lost on sign-out | DocumentsTab.tsx | Moved from localStorage → case.metadata DB |
| Filing "Save to Drafts" wrong case | filings/page.tsx + cases/[id]/page.tsx | Added `case_id` to URL params |
| Draft word count = 0 | drafts.ts API | Read `content.text` not `JSON.stringify(content)` |
| Fuzzy search matched everything | search.ts | Adaptive Levenshtein + Soundex, word-length-based threshold |
| Fuzzy highlight showed wrong word | search.ts | Return actual matched word, not search term |
| Translation file wrong name | DocumentsTab.tsx | `{basename} — Translated.txt` |
| Agent output loaded on every case load | cases.ts + page.tsx | Lazy fetch on expand only |
| `Search is not defined` runtime error | page.tsx | Added `Search` to lucide-react import |
| TABS array wrong property names | page.tsx | `Icon` not `icon`, `labelKey` not `label` |
| `processing_status: 'completed'` Prisma error | search.ts | Changed to `'ready'` |

---

## 22. FILE MAP — KEY FILES TO KNOW

```
apps/web/src/
├── app/
│   ├── globals.css                    ← responsive utilities added V1.1
│   ├── layout.tsx                     ← font loading (non-blocking)
│   ├── providers.tsx                  ← React Query config (staleTime 5min, gcTime 10min)
│   ├── dashboard/page.tsx             ← dashboard (staleTime 60s)
│   ├── cases/page.tsx                 ← case list (staleTime 30s)
│   ├── cases/[id]/
│   │   ├── page.tsx                   ← MAIN case page (~2200 lines)
│   │   ├── DocumentsTab.tsx           ← documents, folders, translate, preview+metadata
│   │   ├── DraftingSidebar.tsx        ← draft editor + AI assist
│   │   ├── SearchPanel.tsx            ← document search UI
│   │   ├── StrategyIntelPanel.tsx     ← strategy + timeline panels
│   │   └── PrecedentPanel.tsx         ← precedents panel
│   ├── calendar/page.tsx
│   ├── invoices/page.tsx
│   ├── filings/page.tsx               ← filing library + AI draft
│   └── cases/new/page.tsx
├── components/layout/
│   └── AppShell.tsx                   ← sidebar + mobile nav (drawer + bottom bar)
├── hooks/
│   ├── useAuth.ts                     ← Zustand auth store + isPro/isTrialing helpers
│   └── useLanguage.ts
└── lib/
    ├── filingRepository.ts            ← 58 filings, 706 lines
    └── courtHolidays.ts               ← 2025+2026 SC + 25 HCs

apps/api/src/
├── server.ts                          ← custom empty body parser, all route registrations
├── plugins/
│   └── prisma.ts                      ← connection_limit=5, pool_timeout=20, pgbouncer
├── routes/
│   ├── agents.ts                      ← 5 agents + DELETE job + GET job output (lazy)
│   ├── cases.ts                       ← GET /:id excludes agent output, merges metadata
│   ├── documents.ts                   ← upload, OCR, translation
│   ├── search.ts                      ← full-text + fuzzy (Levenshtein+Soundex) + nearness
│   ├── drafts.ts                      ← word count from content.text
│   ├── auth.ts                        ← super_admin auto-upgrade, reset agent counter
│   ├── billing.ts                     ← Razorpay integration
│   └── [others]
└── jobs/
    ├── agent.worker.ts                ← inline agent execution
    └── ocr.worker.ts                  ← LlamaParse polling

packages/
├── core/src/types/index.ts            ← PLAN_LIMITS, CaseType, CourtLevel, AgentType enums
└── db/prisma/schema.prisma            ← 25 models
```

---

## 23. V1.1 FEATURE ADDITIONS (since V1)

- [x] **Document search** — SearchPanel.tsx + search.ts route
  - Content / Metadata / Both modes
  - AND/OR/AND NOT/NEAR/BEFORE operator chips
  - Adaptive Levenshtein + Soundex fuzzy (Low/Medium/High/Max dropdown)
  - Nearness within N words
  - Pastel green `#bbf7d0` highlighting of actual matched word
  - Page-level snippets with page numbers
- [x] **Document preview metadata pane** — right panel in preview modal
  - Filename, category, file size, MIME, page count, upload date, OCR status, UUID
- [x] **Past hearings outcome display** — green card with OUTCOME label, order summary, Edit/+Record button
- [x] **Delete agent runs** — ✕ button per run, `DELETE /v1/agents/jobs/:id`
- [x] **Hide failed runs** — hidden by default, "Show N failed" toggle
- [x] **Translation saves to case** — auto-saves `filename — Translated.txt` silently + "Save to Case" button in modal
- [x] **Filing draft → case** — `case_id` in URL so Save to Drafts associates correctly
- [x] **Draft word count fixed** — reads from `content.text`
- [x] **Performance** — lazy agent output, staleTime on all queries, cache headers
- [x] **Mobile responsive** — bottom nav, drawer menu, scrollable tabs, responsive grids
- [x] **No AI brand names** — "Our AI agents" everywhere in UI

---

## 24. V1.2+ BACKLOG

- [ ] Client portal (separate client login)
- [ ] WhatsApp messaging integration
- [ ] Live SCC Online / Manupatra API for verified citations
- [ ] Real-time collaborative draft editing
- [ ] Mobile app (iOS/Android)
- [ ] eCourts automatic status sync
- [ ] Bulk document upload + auto-categorisation
- [ ] Hearing reminder notifications
- [ ] Time + expense tracking per case
- [ ] Client payment portal
- [ ] API access for enterprise
- [ ] Conflict of interest checker
- [ ] e-Sign / execution workflow
- [ ] Court form auto-fill from case data

---

## 25. SESSION WORKFLOW RULES

1. **"Freeze the build"** = only touch the specific thing asked, nothing else
2. **Always verify with SWC** before delivering any .tsx file
3. **Deliver as files** — never as inline terminal commands to paste
4. **Check for:**
   - Unicode `─` in JSX comments before delivering
   - Backticks inside template literals in API files
   - `processing_status: 'ready'` not `'completed'`
   - `Content-Type` only set when body exists
5. **Update this document** at the end of each session with new fixes/features
