# Sovereign Counsel (LexAI India) — V1 Knowledge Document
**Version:** 1.0  
**Date:** April 2026  
**Purpose:** Complete technical and product knowledge base. Share this file at the start of any new Claude session to resume development without re-explaining anything.

---

## 1. PRODUCT OVERVIEW

**Product name:** Sovereign Counsel (brand) / LexAI India (internal)  
**What it is:** AI-powered practice management platform for Indian advocates  
**Tagline:** AI-Powered Legal Practice Management for Indian Advocates

**Core value props:**
- India-first AI — knows BNS/BNSS/BSA 2023 (new criminal codes replacing IPC/CrPC/IEA from July 2024)
- Correct court salutations per level ("My Lord" HC/SC, "Your Honour" district)
- SCC citation format, FIR delay significance, Indian witness conventions
- 5 AI agents: Evidence, Timeline, Research, Deposition, Strategy
- Full practice management: cases, hearings, tasks, drafts, invoices, calendar
- Document OCR + translation (17 Indian languages)
- 58 standard Indian court filings with AI drafting
- In-document fuzzy + phonetic search across all case documents

---

## 2. REPOSITORY

**GitHub:** `github.com/pavanraguru/lexai-platform`  
**Branch:** `main`  
**Monorepo structure:**
```
lexai-platform/
├── apps/
│   ├── web/          → Next.js 14.2 frontend (Vercel)
│   └── api/          → Fastify backend (Railway)
├── packages/
│   ├── core/         → Shared types, constants, plan limits
│   └── db/           → Prisma schema + migrations
```

---

## 3. TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14.2 (App Router), React, TypeScript |
| Backend API | Fastify (Node.js), TypeScript |
| Database | PostgreSQL via Supabase (Prisma ORM) |
| Auth | Supabase Auth (JWT tokens) |
| File storage | AWS S3 — ap-south-1 (Mumbai region) |
| AI model | Claude Sonnet via Anthropic API |
| OCR | LlamaParse (LlamaIndex) |
| Frontend deploy | Vercel |
| Backend deploy | Railway |
| Payments | Razorpay |
| State management | Zustand (auth), React Query (server state) |
| Styling | Inline React.CSSProperties — NO Tailwind, NO CSS modules |

---

## 4. DEPLOYMENT URLS

- **Frontend (Vercel):** `https://lexai-platform-web.vercel.app`
- **Backend (Railway):** `https://lexai-platform-production.up.railway.app`
- **Supabase project:** `pdywongerxatbhbkdpvx.supabase.co`

---

## 5. ENVIRONMENT VARIABLES

### Railway (API)
```
DATABASE_URL=postgresql://postgres:Cheppanu@56@db.pdywongerxatbhbkdpvx.supabase.co:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=20
DIRECT_URL=postgresql://postgres:Cheppanu@56@db.pdywongerxatbhbkdpvx.supabase.co:5432/postgres
SUPABASE_URL=https://pdywongerxatbhbkdpvx.supabase.co
SUPABASE_SERVICE_KEY=<supabase service key>
JWT_SECRET=<jwt secret>
ANTHROPIC_API_KEY=<anthropic api key>
AWS_ACCESS_KEY_ID=<aws key>
AWS_SECRET_ACCESS_KEY=<aws secret>
AWS_REGION=ap-south-1
AWS_S3_BUCKET=lexai-documents
LLAMAPARSE_API_KEY=<llamaparse key>
RAZORPAY_KEY_ID=<razorpay key>
RAZORPAY_KEY_SECRET=<razorpay secret>
RAZORPAY_WEBHOOK_SECRET=<razorpay webhook secret>
ADMIN_EMAIL=pavan@legalcraft.in
```

### Vercel (Web)
```
NEXT_PUBLIC_API_URL=https://lexai-platform-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://pdywongerxatbhbkdpvx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase anon key>
```

---

## 6. DATABASE SCHEMA (25 models)

```
Tenant, User, Case, Document, Hearing, Task, AgentJob,
TimelineEvent, EvidenceItem, LegalCitation, Draft, DraftVersion,
Annotation, Presentation, Notification, AuditLog, Subscription,
Client, CaseClient, CourtSyncJob, WhatsAppMessage,
ClientNotification, Invoice, InvoicePayment, DocumentTag
```

**Key fields:**
- `Document.extracted_text` — OCR text, split by `--- Page Break ---`
- `Document.processing_status` — enum: `pending | processing | ready | failed` (NOT "completed")
- `AgentJob.output` — JSON with agent results
- `Case.metadata` — JSON (stores folders, doc_folders, custom data)
- `Subscription.agent_runs_this_period` — counter reset on admin login

---

## 7. API ROUTES

All routes prefixed `/v1/`:

```
/auth          → login, signup, logout, refresh
/cases         → CRUD, status transitions, PATCH merges metadata
/documents     → upload, presign, OCR, translate, search
/hearings      → CRUD, outcome recording
/tasks         → CRUD, status toggle
/agents        → run agents, poll jobs, DELETE /jobs/:id
/search        → POST /cases/:id — content/metadata/fuzzy/nearness search
/drafts        → CRUD, word count auto-calculated from content.text
/presentations → CRUD, AI generation
/filings       → AI draft generation
/invoices      → CRUD, PATCH line items, revoke payment
/billing       → Razorpay order, verify, webhook
/dashboard     → stats with 30s cache
/calendar      → court holidays + hearings
/ecourts       → CNR sync
/clients       → client management
/notifications → bell notifications
/tenants       → tenant management
/users         → user management
```

---

## 8. FRONTEND PAGES

```
/                    → redirect to /dashboard
/login               → sign in page
/signup              → new account + trial
/dashboard           → stats, upcoming hearings, recent cases
/cases               → case list
/cases/[id]          → case detail (see Section 9)
/cases/new           → create case
/calendar            → monthly view + agenda
/invoices            → invoice management
/presentations/[id]  → presentation viewer
/filings             → AI filing library
/auth/callback       → Google OAuth callback
```

---

## 9. CASE DETAIL PAGE TABS

File: `apps/web/src/app/cases/[id]/page.tsx` (~2150 lines)

**Tab keys:** `overview | documents | hearings | tasks | agents | drafts | presentations | timeline | strategy | precedents | filings | search`

**Tab components:**
- `Overview` — case info, limitation calculator, stats
- `Documents` → `DocumentsTab.tsx` — folder manager, OCR, translate, preview with metadata pane
- `Hearings` — upcoming + past hearings, record/edit outcome inline
- `Tasks` — task list with priority, due date, toggle done
- `Agents` — 5 AI agents with run history, expandable output, delete, hide failed
- `Drafts` → `DraftingSidebar.tsx` — rich text editor, AI writing assist, word count
- `Presentations` — AI presentation generator
- `Case Timeline` → `StrategyIntelPanel.tsx`
- `Strategy Intel` → `StrategyIntelPanel.tsx`
- `Precedents` → `PrecedentPanel.tsx`
- `Filings` → links to /filings with case context
- `Search` → `SearchPanel.tsx` — document full-text + fuzzy + phonetic search

---

## 10. THE 5 AI AGENTS

All run inline (no Redis/BullMQ needed). `max_tokens: 6000` for all agents.

| Agent | What it extracts |
|-------|-----------------|
| Evidence | Exhibits (E-1, MO-1), key facts with importance, contradictions, missing evidence |
| Timeline | Chronological events with date/time/type, prosecution gaps, defence opportunities |
| Research | Applicable statutes (BNS/BNSS/BSA), favourable + adverse precedents with distinguish notes |
| Deposition | Inconsistencies, contradictions, cross-exam questions, credibility score |
| Strategy | Opening statement, bench questions + answers, strengths, vulnerabilities + mitigation, sentiment score |

**Agent output display:** Click any COMPLETED row in Run History to expand. Shows all sections with per-section Copy buttons + "Copy All Data" button (copies raw JSON).

**Run limit:** `super_admin` bypasses all limits. Starter plan: 999 runs/month. Counter resets to 0 on admin login.

**JSON parser:** Strips markdown fences, extracts first `{...}` block by brace depth, try/catch with user-friendly error.

---

## 11. DOCUMENT SEARCH (SearchPanel.tsx)

**Endpoint:** `POST /v1/search/cases/:case_id`

**Search modes:**
- Content — full text search in `extracted_text`
- Metadata — filename, category, MIME type, processing status, upload date
- Both — combined

**Fuzzy matching:** Adaptive Levenshtein + Soundex phonetic
- 1-3 char terms: exact only
- 4-6 chars: max 1 edit
- 7+ chars: max 2 edits
- Corrections slider multiplies: Low(0.5×), Medium(1×), High(1.5×), Max(2×)
- Soundex groups phonetically similar words regardless of spelling

**Nearness:** All terms must appear within N words of each other on the same page

**Highlight color:** `#bbf7d0` pastel green, `#14532d` text, `fontWeight: 600`

**Page splitting:** `extracted_text` split on `--- Page Break ---` regex

---

## 12. TRANSLATION FEATURE

**Flow:**
1. Right-click document → Translate
2. Polls `GET /v1/documents/:id/translation` every 3s
3. On completion: auto-saves `filename — Translated.txt` to case documents silently
4. Shows modal with: detected language, summary, key legal terms, full translation
5. Modal actions: Copy Translation | Save as PDF (print dialog) | Save to Case (manual re-save)

**File naming:** `{basename} — Translated.txt` (e.g. `hindi — Translated.txt`)

---

## 13. DOCUMENT PREVIEW — METADATA PANE

When previewing any document, the modal is split:
- Left (~80%): document viewer (PDF iframe / image / text)
- Right (260px): metadata pane showing filename, category badge, file size, MIME type, page count, upload date+time IST, OCR status badge, document UUID

---

## 14. PLAN LIMITS

```typescript
starter:      { users: 2, cases: 10, agent_runs: 999, storage: 5GB, invoices: 10/mo }
professional: { users: 10, cases: unlimited, agent_runs: 500, storage: 50GB }
enterprise:   { users: unlimited, cases: unlimited, agent_runs: unlimited, storage: 500GB }
```

**Billing:** Razorpay integration. Trial → paid upgrade via in-app modal.

---

## 15. SUPER ADMIN

Set `ADMIN_EMAIL` env var on Railway. On login, that user gets:
- `role: super_admin`
- `plan: professional`  
- `subscription status: active` until 2099
- `agent_runs_this_period: 0` (reset)
- Bypasses all plan limits on agents

---

## 16. CRITICAL RULES — SWC COMPILER (VERCEL)

These patterns **crash Vercel builds**. Always check before pushing:

1. **Unicode box-drawing chars in JSX comments** — `{/* ── Section ─── */}` → replace `─` with `-`
2. **Template literals with backticks inside** — `` `prompt with ```json``` fences` `` → use `~~~` or plain text
3. **TypeScript type annotations inside JSX expressions** — no `const X = ({a}: {a: string}) =>` inside `{...}` in JSX
4. **IIFE patterns inside JSX** — no `{(() => { ... })()}` inside JSX
5. **`stop_sequences` with newline strings** — `'\n\nNote:'` inside array in template literal crashes compiled JS

**Verification command (run before every push):**
```bash
cd /tmp && node -e "
const swc = require('./node_modules/@swc/core');
const fs = require('fs');
const code = fs.readFileSync('/path/to/file.tsx', 'utf8');
swc.transform(code, {jsc:{parser:{syntax:'typescript',tsx:true},target:'es2017'},filename:'f.tsx'})
  .then(()=>console.log('CLEAN'))
  .catch(e=>console.error('FAIL:', e.message.substring(0,300)));
"
```

Install SWC once: `cd /tmp && npm install @swc/core @swc/cli`

---

## 17. CRITICAL RULES — API

1. **Document processing status enum:** `pending | processing | ready | failed` — NOT `completed`
2. **Empty JSON body:** `Content-Type: application/json` with empty body → Fastify throws `FST_ERR_CTP_EMPTY_JSON_BODY`. Fixed in `server.ts` with custom body parser + frontend `apiCall` only sets Content-Type when body exists
3. **Case metadata PATCH:** Always merges (spread existing + new) — never replaces entirely
4. **agent.worker.ts:** No backticks inside template literals. No `stop_sequences` with newline chars
5. **Draft word count:** Extract from `body.content.text` not `JSON.stringify(body.content)`

---

## 18. FOLDER PERSISTENCE

Document folders stored in `case.metadata.folders` (PostgreSQL JSON) — NOT localStorage.  
Doc-to-folder assignments stored in `case.metadata.doc_folders`.  
Survives sign-out. Saved via debounced PATCH to `/v1/cases/:id` (1.5s debounce).

---

## 19. FILING LIBRARY

File: `apps/web/src/lib/filingRepository.ts` (706 lines, 58 filings)

Covers: SC + all 25 High Courts. Each filing has: name, category, courts, jurisdiction, time_limit, court_fees, key_sections, supporting_docs, ai_prompt_hint.

AI draft generation: `POST /v1/filings/ai-draft` — uses case context from URL params (`?filing=&case_id=&case_type=&court=&cnr=&case_title=&perspective=`).

**Important:** `case_id` must be in the URL for "Save to Drafts" to associate the draft with the correct case.

---

## 20. COURT DATA

**Court holidays:** Pre-loaded 2025+2026, SC + all 25 HCs. Used in calendar.  
**Limitation calculator:** Art.113 LA (civil/writ, 3yr), S.468 BNSS (criminal, 1-3yr), CP Act S.69 (consumer, 2yr), IBC, ID Act etc. Condonation alert if expired.  
**eCourts CNR sync:** Starter: 10/mo, Pro/Enterprise: unlimited.

---

## 21. INDIAN LEGAL CONTEXT (injected into every agent)

Every agent prompt includes:
- BNS 2023 / BNSS 2023 / BSA 2023 for post-July 2024 cases
- IPC / CrPC / IEA for pre-July 2024 cases
- Court hierarchy + correct judicial address forms
- Witness numbering: PW (prosecution), DW (defence), CW (court)
- Exhibit marking: E- (exhibits), MO- (material objects), X- (cross)
- FIR delay > 12 hours = flagged as high importance
- SCC citation format: `(2024) 4 SCC 123` or `2024 SCC OnLine Del 456`

---

## 22. BRANDING RULES

- **Do NOT mention:** Claude, Anthropic, GPT, OpenAI, or any AI vendor name in UI
- Use: "Our AI agents", "Our AI", "AI-powered"
- Backend code can reference Anthropic (API keys, imports) — never shown to users
- Product name in UI: "Sovereign Counsel" or "LexAI India"

---

## 23. DESIGN TOKENS

```
Primary Navy:    #022448
Gold:            #ffe088 / #735c00
Background:      #f4f5f7
Card:            #fff, border: 1px solid rgba(196,198,207,0.2), radius: 16px
Danger:          #ba1a1a / #ffdad6
Success:         #15803d / #dcfce7
Warning:         #735c00 / #ffe088
Fonts:           Newsreader (headings, serif), Manrope (body, sans)
Styling:         Inline React.CSSProperties only — NO Tailwind, NO CSS modules
```

---

## 24. KEY KNOWN BUGS FIXED IN V1

| Bug | Fix |
|-----|-----|
| Unicode `─` in JSX comments crashes SWC | Strip to `-` in all .tsx files |
| Backtick `` ` `` inside template literal in API prompts crashes compiled JS | Replace with `~~~` or plain text |
| `copyText(x).catch(()=>{})` regex mangled JSX onClick handlers | Rewrote as `try { navigator.clipboard.writeText(x) } catch(e) {}` |
| `FST_ERR_CTP_EMPTY_JSON_BODY` on DELETE + agent run | Custom body parser in server.ts + frontend no Content-Type on bodyless requests |
| Agent JSON output truncated (timeline/research) | `max_tokens: 6000` for all agents |
| Folders lost on sign-out | Moved from localStorage to case.metadata in DB |
| Filing "Save to Drafts" didn't associate with case | Added `case_id` to filings URL params |
| Draft word count always 0 | Extract from `content.text` not `JSON.stringify(content)` |
| Fuzzy search matched everything | Replaced with adaptive Levenshtein (word-length-based) + Soundex phonetic |
| Translation file saved with wrong name + as .txt | Now saves as `{basename} — Translated.txt` |

---

## 25. V1 FEATURE CHECKLIST

### Core Platform
- [x] Multi-tenant SaaS (firm = tenant, full data isolation)
- [x] JWT auth with Supabase
- [x] Role system: user, admin, super_admin
- [x] Razorpay billing + trial flow
- [x] Audit logging on all case actions
- [x] Dashboard with live stats + hearing links

### Case Management
- [x] 11 case types (criminal, civil, writ, NCLT, family, labour, IP, tax, arbitration, consumer)
- [x] 5 court levels (SC, HC, District, Tribunal, Magistrate)
- [x] 6 perspectives (defence, prosecution, petitioner, respondent, appellant, claimant)
- [x] Case status state machine (intake → filed → pending → arguments → reserved → decided → appeal → closed)
- [x] Inline case editing (title, CNR, sections charged, FIR details)
- [x] eCourts CNR sync

### Documents
- [x] S3 upload (presigned URLs)
- [x] LlamaParse OCR (async, polling)
- [x] Folder manager with DB persistence
- [x] Grid + list view
- [x] Preview modal with metadata pane (right panel)
- [x] Rename, delete, copy name
- [x] Multi-language translation → saves as `filename — Translated.txt` next to original
- [x] Full-text + fuzzy (adaptive Levenshtein + Soundex) + nearness + boolean search

### Hearings
- [x] Schedule upcoming hearings
- [x] Record outcome inline (What happened, order summary, next hearing date)
- [x] Edit past hearing outcomes
- [x] Limitation period calculator per case type

### AI Agents (5)
- [x] Evidence Analysis
- [x] Timeline Reconstruction  
- [x] Legal Research
- [x] Deposition Analysis
- [x] Strategy Intelligence
- [x] Full output display with copy buttons
- [x] Delete individual runs
- [x] Hide failed runs by default
- [x] Cost (₹) + token count per run
- [x] super_admin bypasses run limits

### Drafts
- [x] Rich text editor
- [x] AI writing assist (improve, formalize, simplify, expand, counterargs)
- [x] Cases For/Against AI sidebar
- [x] Arguments Q&A
- [x] Version history
- [x] Auto-save to localStorage
- [x] Save as PDF (print dialog)
- [x] Word count (fixed — reads from content.text)

### Filing Library
- [x] 58 standard Indian court filings
- [x] SC + all 25 High Courts
- [x] AI draft generation per filing type
- [x] Save AI draft directly to case Drafts tab
- [x] Limitation period reference per filing

### Calendar
- [x] Monthly view + agenda
- [x] Court holiday overlay (2025+2026)
- [x] Hearing cards clickable → case hearings tab
- [x] Task cards clickable → case tasks tab

### Invoices
- [x] Create, edit (line items + discount %), download PDF
- [x] Mark paid / revoke payment
- [x] GST invoice format

### Presentations
- [x] AI generation from case + strategy agent output
- [x] PDF export

### Search
- [x] Case document search tab
- [x] Content / Metadata / Both modes
- [x] Boolean operators (AND, OR, AND NOT, NEAR, BEFORE chips)
- [x] Adaptive fuzzy (Low/Medium/High/Max dropdown)
- [x] Nearness within N words
- [x] Pastel green highlighting of matched terms
- [x] Page-level snippets with page numbers
- [x] Metadata results show category, type, pages, date

---

## 26. V1.1+ IDEAS (NOT YET BUILT)

These were mentioned or implied but not built in V1:

- [ ] Client portal (separate login for clients to view case progress)
- [ ] WhatsApp messaging integration
- [ ] Live SCC Online / Manupatra API integration for verified citations
- [ ] Collaborative real-time editing on drafts
- [ ] Mobile app (iOS/Android)
- [ ] eCourts automatic status sync (currently manual CNR lookup)
- [ ] Bulk document upload with auto-categorisation
- [ ] Hearing reminder notifications (WhatsApp/email)
- [ ] Time tracking per case
- [ ] Expense tracking per case
- [ ] Client billing portal (client pays invoices online)
- [ ] API access for enterprise integrations
- [ ] Conflict of interest checker across cases
- [ ] Template library for standard clauses
- [ ] Signature/execution workflow (e-sign)
- [ ] Court form auto-fill from case data

---

## 27. HOW TO RESUME DEVELOPMENT

1. Share this file at the start of the session
2. Specify what you want to build (new feature, bug fix, UI change)
3. State: "Freeze the build and only change X" if you don't want other things touched
4. All file changes are delivered as downloadable files — copy to the right path and push

**Standard push workflow:**
```bash
cd ~/Desktop/lexai-platform
cp ~/Downloads/filename.tsx "apps/web/src/app/..."
git add <files>
git commit -m "feat/fix: description"
git push origin main
```

**If Vercel build fails:** Check for unicode `─` in JSX comments. Run the SWC verification command from Section 16.

**If Railway crashes:** Check for backticks inside template literals in API files. Check `processing_status` enum values.
