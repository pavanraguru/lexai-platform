# ⚖ LexAI India — AI-Powered Legal Platform

**PRD v1.1 | Phase 0 Foundation**

An AI-native SaaS platform for Indian advocates. Powered by Claude claude-sonnet-4-6.

---

## 📁 Repository Structure

```
lexai-platform/
├── apps/
│   ├── api/          ← Fastify REST API (Node.js + Prisma)
│   ├── web/          ← Next.js 14 web application
│   └── cli/          ← CLI engine (Week 1 testing tool)
├── packages/
│   ├── core/         ← Shared TypeScript types + Indian legal constants
│   ├── agents/       ← Claude agent prompt definitions
│   ├── db/           ← Prisma schema (all 22 tables)
│   └── ui/           ← Shared design tokens
└── docs/
```

---

## 🚀 Quick Start — CLI (Week 1, no infrastructure needed)

### 1. Prerequisites
- Node.js 20+ (you have this)
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

### 2. Setup
```bash
# Clone / navigate to the project
cd apps/cli

# Install dependencies
npm install

# Set up environment
cp ../../.env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Run your first agent
```bash
# Test with the included sample case (State vs Ramesh Kumar)
node src/index.ts run-agent --case cases/case_001.json --agent evidence

# Run the full 5-agent chain
node src/index.ts chain --case cases/case_001.json

# List all your cases
node src/index.ts list-cases

# See all available commands
node src/index.ts help
```

### 4. Add your own case
Edit `apps/cli/cases/case_001.json` with your case details.
Add document text files to `apps/cli/docs/`.
Run the agents.

---

## 🏗 Full Stack Setup (Phase 1 onwards)

### Prerequisites
- Node.js 20+
- PostgreSQL (via [Supabase](https://supabase.com) — free tier)
- Redis (via [Upstash](https://upstash.com) — free tier)
- AWS S3 bucket in ap-south-1

### Environment Setup
```bash
cp .env.example .env.local
# Fill in all values — see .env.example for descriptions
```

### Install all dependencies
```bash
npm install
```

### Database setup
```bash
# Generate Prisma client
npm run db:generate

# Run migrations (creates all 22 tables)
npm run db:migrate

# Optional: open Prisma Studio to inspect data
npm run db:studio
```

### Run all services
```bash
# Run everything in parallel (API + Web)
npm run dev

# Or individually:
npm run dev:api     # Fastify API on :3001
npm run dev:web     # Next.js on :3000
npm run dev:cli     # CLI interactive mode
```

---

## 🤖 AI Agents

All agents use `claude-sonnet-4-6` and are PRD-specified:

| Agent | Feature ID | What It Does |
|-------|-----------|--------------|
| `evidence` | AGENT_EVIDENCE_V1 | Extracts exhibits, key facts, witnesses, contradictions |
| `timeline` | AGENT_TIMELINE_V1 | Reconstructs chronological events, finds prosecution gaps |
| `deposition` | AGENT_DEPOSITION_V1 | Analyses witness depositions, suggests cross-examination |
| `research` | AGENT_RESEARCH_V1 | Finds applicable BNS/IPC sections, SC/HC precedents |
| `strategy` | AGENT_STRATEGY_V1 | Generates opening statement, bench Q&A, sentiment analysis |

**Agent Chain:**
```
Evidence → Timeline → Research → Deposition → Strategy
```

---

## 📊 API Endpoints

All endpoints prefixed `/v1/`. Full spec in PRD v1.1 Section 10.

```
POST /v1/auth/token
GET  /v1/cases
POST /v1/cases
GET  /v1/cases/:id
POST /v1/agents/cases/:id/run/:agent_type
GET  /v1/agents/cases/:id
POST /v1/documents/presign
POST /v1/documents
GET  /v1/calendar
GET  /v1/calendar/today-briefing
POST /v1/clients
GET  /v1/invoices
POST /v1/invoices
```

Health check: `GET /health`

---

## 🏛 Indian Legal Context

The platform is pre-loaded with:
- All 25 High Courts + Supreme Court + major tribunals (NCLT, DRT, ITAT, CCI)
- BNS 2023, BNSS 2023, BSA 2023 (new criminal laws)
- IPC, CrPC, IEA (for legacy cases)
- CPC, Companies Act, IBC, NDPS, NI Act, HMA, Limitation Act
- Indian evidence marking conventions (E-, MO-, X-)
- IST timezone handling + FIR delay significance rules

---

## 🔒 Security

- Row-Level Security (RLS) on all database tables
- JWT authentication with 1-hour expiry
- S3 presigned URLs (15-minute expiry)
- Append-only audit logs (no DELETE ever)
- All data stored in AWS ap-south-1 (Mumbai)

---

## 📋 Reference Documents

All product decisions are documented:

1. **PRD v1.1** — `LexAI_India_PRD_v1.1.docx` — Single source of truth
2. **Master Schema v1.0** — `LexAI_Master_Schema.docx` — All 15 core schemas
3. **Schema Addendum v1.1** — `LexAI_Schema_Addendum_v1.1.docx` — 7 new schemas
4. **Architecture Blueprint** — `LexAI_India_Architecture_Blueprint.docx`

**When asking Claude for help:** Start with:
> "Refer to LexAI India PRD v1.1. Build [feature] according to Section [X]."

---

## 🗺 Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0 | ✅ Complete | Foundation — monorepo, DB schema, API scaffold, CLI |
| Phase 1a | 🔜 Next | Core case management (web) |
| Phase 1b | 🔜 Next | Mobile app (React Native + Expo) |
| Phase 2a | ⏳ Planned | All 5 AI agents |
| Phase 2b | ⏳ Planned | Workflow + Drafting workspace |
| Phase 2c | ⏳ Planned | eCourts sync, WhatsApp, Client portal |
| Phase 3a | ⏳ Planned | Invoice generation, Document management |

---

*LexAI India — PRD v1.1 | All code follows schema specifications exactly*
