// ============================================================
// LexAI India — Agent Routes  (Phase 2 update)
// PRD v1.1 Section 7.2 — AI Agent Suite
// Agents: evidence, timeline, deposition, research, strategy,
//         drafter, reviewer, summarizer
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { Queue } from 'bullmq';
import { z } from 'zod';
import { PLAN_LIMITS } from '@lexai/core';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RunAgentSchema = z.object({
  research_focus: z.string().optional(),
  perspective: z.enum(['defence','prosecution','petitioner','respondent','appellant','claimant']).optional(),
  doc_ids: z.array(z.string().uuid()).optional(),
  chain: z.boolean().default(false),
  // drafter-specific
  doc_type: z.string().optional(),         // which document to draft
  draft_instructions: z.string().optional(), // extra advocate instructions
  // reviewer-specific
  review_doc_id: z.string().uuid().optional(), // single doc to review
  // summarizer-specific
  summarize_doc_id: z.string().uuid().optional(), // single doc to summarize
});

const AGENT_VERSIONS: Record<string, string> = {
  evidence:   'AGENT_EVIDENCE_V1',
  timeline:   'AGENT_TIMELINE_V1',
  deposition: 'AGENT_DEPOSITION_V1',
  research:   'AGENT_RESEARCH_V1',
  strategy:   'AGENT_STRATEGY_V1',
  drafter:    'AGENT_DRAFTER_V1',
  reviewer:   'AGENT_REVIEWER_V1',
  summarizer: 'AGENT_SUMMARIZER_V1',
};

const AGENT_DEPENDENCIES: Record<string, string[]> = {
  evidence:   [],
  timeline:   ['evidence'],
  deposition: [],
  research:   [],
  strategy:   ['evidence', 'timeline', 'deposition', 'research'],
  drafter:    [],  // runs best after strategy, but not required
  reviewer:   [],  // standalone per-document
  summarizer: [],  // standalone per-document
};

// ── Helper: build court address from court level ─────────────
function courtAddress(court_level: string): string {
  if (court_level === 'supreme_court' || court_level === 'high_court') return 'My Lord';
  if (court_level === 'tribunal') return 'Learned Tribunal';
  return 'Your Honour';
}

// ── Helper: Indian doc type label ────────────────────────────
const DOC_TYPE_LABELS: Record<string, string> = {
  bail_application: 'Bail Application',
  plaint: 'Plaint',
  written_statement: 'Written Statement',
  writ_petition: 'Writ Petition',
  affidavit: 'Affidavit',
  vakalatnama: 'Vakalatnama',
  opening_statement: 'Opening Statement',
  closing_statement: 'Closing Statement',
  rejoinder: 'Rejoinder',
  memo_of_appeal: 'Memo of Appeal',
  legal_notice: 'Legal Notice',
  reply_notice: 'Reply to Legal Notice',
  objection: 'Objection Petition',
  revision_petition: 'Revision Petition',
  other: 'Legal Document',
};

// Reverse map: "Bail Application" → "bail_application"
const DOC_TYPE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(DOC_TYPE_LABELS).map(([k, v]) => [v.toLowerCase(), k])
);

function docTypeLabel(doc_type: string): string {
  return DOC_TYPE_LABELS[doc_type] || doc_type;
}

// Normalise whatever Claude returns → valid Prisma DraftDocType enum value
function normaliseDraftDocType(raw: string | undefined): string {
  if (!raw) return 'other';
  if (DOC_TYPE_LABELS[raw]) return raw;
  const reversed = DOC_TYPE_REVERSE[raw.toLowerCase().trim()];
  if (reversed) return reversed;
  const slugged = raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (DOC_TYPE_LABELS[slugged]) return slugged;
  return 'other';
}

// ── Inline agent runner ───────────────────────────────────────
async function runAgentInline(
  fastify: any,
  job_id: string,
  agent_type: string,
  case_id: string,
  tenant_id: string,
) {
  console.log(`[Agents Inline] Starting ${agent_type} for case ${case_id}`);

  await fastify.prisma.agentJob.update({
    where: { id: job_id },
    data: { status: 'running', started_at: new Date() },
  });

  try {
    const agentJob = await fastify.prisma.agentJob.findUnique({ where: { id: job_id } });
    if (!agentJob) throw new Error('Job not found');

    const cfg = agentJob.input_config as any;
    // Safe fallback: some older jobs stored fields at root level instead of under case_metadata
    const caseData = cfg.case_metadata || cfg || {};
    if (!cfg.case_metadata) {
      console.warn(`[Agents Inline] job ${job_id} has no case_metadata in input_config — falling back to root cfg`);
    }
    const addr = courtAddress(caseData.court_level || '');
    const baseContext = `Case: ${caseData.title || 'Unknown'}\nCourt: ${caseData.court || 'Unknown'}\nCase type: ${caseData.case_type || 'Unknown'}\nPerspective: ${caseData.perspective || 'defence'}\nAddress court as: ${addr}`;

    // ── Phase 1 agents: evidence, timeline, research, deposition, strategy ──
    const isPhase1 = ['evidence','timeline','research','deposition','strategy'].includes(agent_type);

    // For reviewer & summarizer — single doc mode
    const isSingleDoc = ['reviewer','summarizer'].includes(agent_type);

    let documents: any[] = [];

    if (isPhase1 || agent_type === 'drafter') {
      const docIdsToUse = cfg.doc_ids || cfg.agent_settings?.doc_ids || [];
      documents = await fastify.prisma.document.findMany({
        where: { id: { in: docIdsToUse } },
        select: { id: true, filename: true, doc_category: true, extracted_text: true, processing_status: true },
      });
      if (!documents.length) throw new Error('No documents found for this case.');
    } else if (isSingleDoc) {
      // reviewer / summarizer operate on a single doc
      const docId = cfg.review_doc_id || cfg.summarize_doc_id;
      if (!docId) throw new Error('No document ID provided for this agent.');
      const doc = await fastify.prisma.document.findUnique({
        where: { id: docId },
        select: { id: true, filename: true, doc_category: true, extracted_text: true, processing_status: true },
      });
      if (!doc) throw new Error('Document not found.');
      if (!doc.extracted_text) throw new Error('Document has not been OCR-processed yet. Please wait for text extraction to complete.');
      documents = [doc];
    }

    // Build doc context string (shared by phase-1 agents)
    const MAX_PER_DOC = 4000;
    let total = 0;
    const docContext = documents.map((d: any) => {
      if (d.extracted_text) {
        const t = d.extracted_text.substring(0, MAX_PER_DOC);
        total += t.length;
        return `--- ${d.filename} (${d.doc_category || 'doc'}) ---\n${t}`;
      }
      return `--- ${d.filename} (${d.doc_category || 'doc'}) [no OCR text yet] ---`;
    }).filter((_: any, i: number) => { if (total >= 20000 && i > 0) return false; return true; }).join('\n\n');

    // Build prior outputs (for strategy agent)
    const priorOutputs: Record<string, any> = {};
    const priorOutputsConfig = cfg.prior_agent_outputs || cfg.agent_settings?.prior_agent_outputs || {};
    if (Object.keys(priorOutputsConfig).length > 0) {
      for (const [t, jid] of Object.entries(priorOutputsConfig as Record<string, string>)) {
        const pj = await fastify.prisma.agentJob.findUnique({ where: { id: jid }, select: { output: true } });
        if (pj?.output) priorOutputs[t] = pj.output;
      }
    }

    // ── Prompts ──────────────────────────────────────────────
    const prompts: Record<string, { system: string; user: string }> = {

      // ── Existing agents (unchanged) ─────────────────────────
      evidence: {
        system: `You are a senior Indian advocate's AI assistant. Analyse evidence from the provided documents.\n${baseContext}\nCRITICAL: Return ONLY a raw JSON object. No markdown fences, no code blocks, no explanation text. Your response must start with { and end with }. Example format:\n{"exhibits":[{"number":"E-A","description":"...","doc_id":"...","relevance":"...","strength":"Strong|Moderate|Weak"}],"key_facts":["..."],"contradictions":["..."],"missing_evidence":["..."]}`,
        user: `Analyse evidence:\n\n${docContext}`,
      },
      timeline: {
        system: `You are a senior Indian advocate's AI assistant. Reconstruct the case timeline.\n${baseContext}\nIMPORTANT: You MUST complete the entire JSON object. Do not stop mid-array.\nCRITICAL: Return ONLY a raw JSON object. No markdown fences. Your response must start with { and end with }. Example format:\n{"events":[{"date":"YYYY-MM-DD","time":"HH:MM","description":"...","event_type":"offence|arrest|fir_registration|court_date|other","importance_score":8}],"prosecution_gaps":["..."],"defence_opportunities":["..."]}`,
        user: `Reconstruct timeline:\n\n${docContext}`,
      },
      research: {
        system: `You are a senior Indian advocate's AI assistant specialising in Indian legal research.
${baseContext}

For each precedent you cite, you must assess whether it is reliably indexed on Indian Kanoon (indiankanoon.org).
Indian Kanoon has good coverage of: Supreme Court judgments post-1950, most High Court judgments post-1990, major tribunal orders.
Indian Kanoon typically does NOT have: very old cases pre-1950, unreported judgments, district court orders, foreign cases, AIR citations before 1960 (often missing), NCLAT/NCLT orders pre-2018.

For each precedent set ik_available to true only if you are confident it exists on Indian Kanoon. When true, also set indiankanoon_query to a 3-5 word search phrase. When false, leave indiankanoon_query null.

CRITICAL: Return ONLY a raw JSON object. No markdown fences. Start with { end with }.
Format:
{"applicable_statutes":[{"act":"...","section":"...","description":"...","relevance":"..."}],"favorable_precedents":[{"citation":"...","court":"SC|HC","year":2023,"held":"...","relevance":"...","ik_available":true,"indiankanoon_query":"short search phrase or null"}],"adverse_precedents":[{"citation":"...","court":"SC|HC","year":2023,"held":"...","how_to_distinguish":"...","ik_available":false,"indiankanoon_query":null}],"disclaimer":"AI research — verify on SCC Online / Manupatra before relying in court"}`,
        user: `Research Indian law and cite relevant statutes and precedents:\n\n${docContext.substring(0, 6000)}`,
      },
      deposition: {
        system: `You are a senior Indian advocate's AI assistant specialising in deposition analysis.\n${baseContext}\nCRITICAL: Return ONLY a raw JSON object. No markdown fences. Start with { end with }.\nFormat:\n{"witness_name":"...","inconsistencies":[{"statement":"...","contradiction":"...","page":"...","exploit_tip":"How to use in cross-examination"}],"witness_scripts":[{"sequence_number":1,"question":"Exact question to ask in court","expected_answer":"What witness will likely say","follow_up_if_lie":"Follow-up if they deny","objective":"What this establishes for your case"}],"cross_examination_questions":["..."],"witness_prep_notes":"Overall cross-examination strategy for this witness","key_admissions":["Statements witness already made that help your case"],"credibility_assessment":"High|Medium|Low","credibility_reasoning":"..."}`,
        user: `Analyse this deposition and generate a detailed witness cross-examination script:\n\n${docContext}`,
      },
      strategy: {
        system: `You are a senior Indian advocate's AI assistant. Develop court strategy for the case below.
${baseContext}
Address the court as: ${addr}

Return a single raw JSON object. No markdown, no code fences, no explanation. Start with { and end with }.

Use exactly this structure:
{
  "perspective": "defence or prosecution or petitioner or respondent",
  "opening_statement": "Full opening statement text addressed to the court",
  "main_argument": "The single most powerful overarching argument in one sentence",
  "sub_arguments": [
    {
      "argument": "Sub-argument label",
      "supporting_facts": ["fact 1 from case documents", "fact 2"],
      "statutes": ["IPC Section 302", "CrPC Section 437"],
      "precedents": ["Case name, year"]
    }
  ],
  "closing_points": [
    {"point": 1, "heading": "Point heading", "detail": "One sentence detail"}
  ],
  "bench_questions": [
    {"question": "Question judge will ask", "answer": "Suggested answer", "why": "Why bench raises this"}
  ],
  "sentiment": {
    "label": "Favorable",
    "score": 65,
    "reasoning": "Brief reasoning",
    "evidence_strength": "Strong",
    "precedent_strength": "Moderate",
    "timeline_consistency": "Consistent",
    "witness_credibility": "High"
  },
  "strengths": ["strength 1", "strength 2"],
  "vulnerabilities": [{"issue": "issue description", "mitigation": "how to handle it"}]
}`,
        user: `CASE DOCUMENTS:\n${docContext.substring(0, 3000)}\n\nEVIDENCE FINDINGS: ${JSON.stringify(priorOutputs.evidence || {}).substring(0, 1200)}\n\nLEGAL RESEARCH: ${JSON.stringify(priorOutputs.research || {}).substring(0, 1200)}\n\nDevelop the full court strategy now.`,
      },

      // ── Phase 2: Document Drafter ──────────────────────────
      drafter: {
        system: `You are a senior Indian advocate with 20+ years of experience drafting legal documents.
${baseContext}

You are drafting a ${docTypeLabel(cfg.doc_type || 'other')} for this case.
${cfg.draft_instructions ? `Additional instructions from advocate: ${cfg.draft_instructions}` : ''}

CRITICAL INDIAN LEGAL DRAFTING RULES:
- Always use "It is most respectfully submitted that..."
- Address court as "${addr}"
- Reference statutes with full citation: "Section 302 of the Indian Penal Code, 1860"
- Use "the Hon'ble Court", "the Learned Trial Court", "the Respondent", "the Petitioner" etc.
- Include formal prayer/relief section at the end
- For bail applications: cite Section 437/439 CrPC, grounds for bail, surety details
- For writs: specify Article 226/227, fundamental rights violated
- For plaints: include cause of action, jurisdiction, valuation, prayer
- For written statements: include preliminary objections, para-wise reply, counterclaim if any
- Number all paragraphs
- Date and place at the bottom

CRITICAL: Return ONLY a raw JSON object. No markdown fences. Your response must start with { and end with }.
Format:
{"doc_type":"...","title":"...","content":"<full drafted document as plain text with \\n for line breaks>","prayer":"<the specific relief sought>","word_count":<number>,"key_sections":["..."],"warnings":["any procedural warnings the advocate should check"],"disclaimer":"AI-generated draft — review thoroughly before filing"}`,
        user: `Draft a ${docTypeLabel(cfg.doc_type || 'other')} based on the following case documents:\n\n${docContext.substring(0, 8000)}\n\n${cfg.draft_instructions ? `Advocate's specific instructions: ${cfg.draft_instructions}` : ''}`,
      },

      // ── Phase 2: Document Reviewer ─────────────────────────
      reviewer: {
        system: `You are a senior Indian advocate reviewing a legal document for risks, gaps, and issues.
${baseContext}

You are reviewing: ${documents[0]?.filename || 'unknown document'} (Category: ${documents[0]?.doc_category || 'unknown'})

REVIEW FRAMEWORK FOR INDIAN LAW:
- Procedural compliance (CPC, CrPC, Evidence Act as applicable)
- Limitation periods (Limitation Act 1963)
- Jurisdiction and territorial issues
- Missing verifications, affidavits, or attestations
- Inconsistencies or contradictions in the document
- Missing material facts or evidence references
- Weak or missing prayers/reliefs
- Stamp duty and court fee compliance flags
- Formatting and certification requirements

CRITICAL: Return ONLY a raw JSON object. No markdown fences. Your response must start with { and end with }.
Format:
{
  "document_name": "...",
  "document_type": "...",
  "overall_assessment": "Strong|Adequate|Needs Revision|Defective",
  "risk_score": <0-100, higher = more risk>,
  "summary": "2-3 sentence overview of the document",
  "critical_issues": [{"issue":"...","explanation":"...","recommendation":"...","severity":"Critical|High|Medium"}],
  "missing_elements": ["..."],
  "procedural_flags": ["..."],
  "strengths": ["..."],
  "suggested_additions": ["..."],
  "disclaimer": "AI review — consult a senior advocate before acting on this review"
}`,
        user: `Review this document:\n\n${documents[0]?.extracted_text?.substring(0, 12000) || '[No text extracted yet]'}`,
      },

      // ── Phase 2: Legal Summarizer ──────────────────────────
      summarizer: {
        system: `You are a senior Indian advocate. Provide a concise, accurate summary of the provided legal document.
${baseContext}

Document: ${documents[0]?.filename || 'unknown'} (Category: ${documents[0]?.doc_category || 'unknown'})

SUMMARY REQUIREMENTS:
- What type of document is this?
- Who are the parties?
- What is the date/period?
- What are the key facts?
- What orders/reliefs/findings does it contain?
- What are the implications for this case?
- Any deadlines, compliance requirements, or action items?

Keep it concise (max 300 words). Write for an Indian advocate who needs to quickly understand the document.

CRITICAL: Return ONLY a raw JSON object. No markdown fences. Your response must start with { and end with }.
Format:
{
  "document_name": "...",
  "document_type": "...",
  "parties": {"primary":"...","opposing":"...","others":["..."]},
  "date_of_document": "...",
  "summary": "2-4 sentence plain English summary",
  "key_facts": ["..."],
  "orders_or_findings": ["..."],
  "implications_for_case": "...",
  "action_items": ["..."],
  "key_dates": [{"date":"...","significance":"..."}],
  "word_count_original": <estimated word count of original>
}`,
        user: `Summarise this document:\n\n${documents[0]?.extracted_text?.substring(0, 12000) || '[No text extracted yet]'}`,
      },
    };

    const p = prompts[agent_type];
    if (!p) throw new Error(`Unknown agent type: ${agent_type}`);

    // Call Claude
    console.log(`[Agents Inline] Calling Claude for ${agent_type}, system prompt length: ${p.system.length}, user prompt length: ${p.user.length}`);
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: agent_type === 'drafter' ? 8000 : agent_type === 'strategy' ? 6000 : agent_type === 'research' ? 5000 : 4000,
      system: p.system,
      messages: [{ role: 'user', content: p.user }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log(`[Agents Inline] Got response for ${agent_type}, length: ${raw.length}, first 200 chars: ${raw.substring(0, 200)}`);

    // Robust JSON parse — handle all Claude output formats + truncation recovery
    let parsed: any;
    try {
      let jsonStr = raw.trim();
      // Strip markdown fences
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const fenceMatch = jsonStr.match(/```(?:json)?[\s\n]*([\s\S]+?)[\s\n]*```/);
      if (fenceMatch) jsonStr = fenceMatch[1].trim();
      // Find the start of the JSON object
      if (!jsonStr.startsWith('{')) {
        const start = jsonStr.indexOf('{');
        if (start !== -1) jsonStr = jsonStr.slice(start);
      }
      // Try direct parse first
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        // Claude truncated mid-JSON — try to recover by closing open structures
        let recovered = jsonStr;
        // Count unclosed brackets and braces
        let braceDepth = 0, bracketDepth = 0, inString = false, escape = false;
        for (let ci = 0; ci < recovered.length; ci++) {
          const ch = recovered[ci];
          if (escape) { escape = false; continue; }
          if (ch === '\\' && inString) { escape = true; continue; }
          if (ch === '"' && !escape) { inString = !inString; continue; }
          if (inString) continue;
          if (ch === '{') braceDepth++;
          else if (ch === '}') braceDepth--;
          else if (ch === '[') bracketDepth++;
          else if (ch === ']') bracketDepth--;
        }
        // Trim trailing comma if any
        recovered = recovered.replace(/,\s*$/, '');
        // Close any open strings, arrays, objects
        if (inString) recovered += '"';
        recovered += ']'.repeat(Math.max(0, bracketDepth));
        recovered += '}'.repeat(Math.max(0, braceDepth));
        try {
          parsed = JSON.parse(recovered);
          console.warn('[Agents Inline] Recovered truncated JSON for', agent_type);
        } catch (recoveryErr: any) {
          console.error('[Agents Inline] JSON parse failed. Raw start:', raw.substring(0, 400));
          throw new Error('AI returned an invalid response format. Please retry the agent.');
        }
      }
    } catch (parseErr: any) {
      if (parseErr.message.includes('invalid response format')) throw parseErr;
      console.error('[Agents Inline] JSON parse failed. Raw:', raw.substring(0, 300));
      throw new Error('AI returned an invalid response format. Please retry the agent.');
    }

    parsed.agent_type = agent_type;
    parsed.case_id = case_id;

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const costINR = Math.round(((inputTokens / 1e6) * 3 + (outputTokens / 1e6) * 15) * 83.5 * 100) / 100;

    await fastify.prisma.agentJob.update({
      where: { id: job_id },
      data: {
        status: 'completed',
        output: parsed,
        tokens_input: inputTokens,
        tokens_output: outputTokens,
        cost_inr: costINR,
        completed_at: new Date(),
      },
    });

    // For summarizer: also persist summary on the document record
    if (agent_type === 'summarizer' && cfg.summarize_doc_id) {
      await fastify.prisma.document.update({
        where: { id: cfg.summarize_doc_id },
        data: {
          ai_summary: parsed.summary || '',
          ai_summary_generated_at: new Date(),
        } as any,
      }).catch((e: any) => console.warn('[Summarizer] Could not persist summary to document:', e.message));
    }

    // For reviewer: also persist risk score on the document record
    if (agent_type === 'reviewer' && cfg.review_doc_id) {
      await fastify.prisma.document.update({
        where: { id: cfg.review_doc_id },
        data: {
          review_risk_score: parsed.risk_score || null,
          review_flags: parsed.critical_issues || null,
        } as any,
      }).catch((e: any) => console.warn('[Reviewer] Could not persist flags to document:', e.message));
    }

    console.log(`[Agents Inline] ✅ ${agent_type} done. Tokens: ${inputTokens}+${outputTokens}. Cost: ₹${costINR}`);
  } catch (err: any) {
    const errMsg = String(err.message || err).substring(0, 500);
    console.error(`[Agents Inline] ❌ ${agent_type} failed:`, errMsg);
    console.error(`[Agents Inline] Stack:`, String(err.stack || '').substring(0, 600));
    await fastify.prisma.agentJob.update({
      where: { id: job_id },
      data: {
        status: 'failed',
        error_message: errMsg,
        completed_at: new Date(),
      },
    }).catch(() => {});
  }
}

export const agentRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /v1/agents/cases/:case_id/run/:agent_type
  fastify.post('/cases/:case_id/run/:agent_type', {
    preHandler: [fastify.authenticate],
    config: { allowEmptyBody: true },
  }, async (request, reply) => {
    const { tenant_id, id: user_id, role } = request.user;
    const { case_id, agent_type } = request.params as { case_id: string; agent_type: string };

    if (['clerk', 'client'].includes(role)) {
      return reply.status(403).send({ error: { code: 'ERR_INSUFFICIENT_ROLE', message: 'Advocates only can run AI agents' } });
    }

    if (!Object.keys(AGENT_VERSIONS).includes(agent_type)) {
      return reply.status(400).send({
        error: { code: 'INVALID_AGENT', message: `Unknown agent: ${agent_type}. Valid: ${Object.keys(AGENT_VERSIONS).join(', ')}` }
      });
    }

    const caseRecord = await fastify.prisma.case.findFirst({ where: { id: case_id, tenant_id } });
    if (!caseRecord) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Case not found' } });

    // Plan limits
    const subscription = await fastify.prisma.subscription.findFirst({ where: { tenant_id } });
    if (subscription && role !== 'super_admin') {
      const plan = subscription.plan as keyof typeof PLAN_LIMITS;
      const limit = PLAN_LIMITS[plan].agent_runs_per_month;
      if (limit !== null && subscription.agent_runs_this_period >= limit) {
        return reply.status(403).send({
          error: { code: 'ERR_TOKEN_LIMIT', message: `Monthly agent run limit (${limit}) reached for ${plan} plan.` }
        });
      }
    }

    // Prevent duplicate running jobs
    const runningJob = await fastify.prisma.agentJob.findFirst({
      where: { case_id, agent_type: agent_type as any, status: { in: ['queued', 'running'] } },
    });
    if (runningJob) {
      return reply.status(409).send({
        error: { code: 'ERR_AGENT_RUNNING', message: `${agent_type} agent is already running. Job ID: ${runningJob.id}` }
      });
    }

    // Strategy dependency check
    if (agent_type === 'strategy') {
      const evidenceJob = await fastify.prisma.agentJob.findFirst({
        where: { case_id, agent_type: 'evidence', status: 'completed' },
      });
      if (!evidenceJob) {
        return reply.status(400).send({ error: { code: 'DEPENDENCY_NOT_MET', message: 'Run the Evidence agent first before Strategy.' } });
      }
    }

    const body = RunAgentSchema.parse(
      (request.body && Object.keys(request.body as any).length ? request.body : {}) as any
    );

    // ── Document resolution per agent type ────────────────────
    let docIds: string[] = [];
    let inputConfig: any = {
      case_metadata: {
        title: caseRecord.title,
        case_type: caseRecord.case_type,
        court: caseRecord.court,
        court_level: caseRecord.court_level,
        perspective: body.perspective || caseRecord.perspective,
        metadata: caseRecord.metadata,
      },
      agent_settings: {
        research_focus: body.research_focus,
        chain: body.chain,
        doc_type: body.doc_type,
        draft_instructions: body.draft_instructions,
      },
    };

    if (agent_type === 'reviewer') {
      // Single doc review
      if (!body.review_doc_id) {
        return reply.status(400).send({ error: { code: 'MISSING_DOC', message: 'Provide review_doc_id in request body.' } });
      }
      const doc = await fastify.prisma.document.findFirst({
        where: { id: body.review_doc_id, case_id, tenant_id },
        select: { id: true, processing_status: true },
      });
      if (!doc) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Document not found.' } });
      if (doc.processing_status !== 'ready') {
        return reply.status(400).send({ error: { code: 'DOC_NOT_READY', message: 'Document OCR is not complete yet.' } });
      }
      inputConfig.review_doc_id = body.review_doc_id;
      docIds = [body.review_doc_id];

    } else if (agent_type === 'summarizer') {
      // Single doc summary
      if (!body.summarize_doc_id) {
        return reply.status(400).send({ error: { code: 'MISSING_DOC', message: 'Provide summarize_doc_id in request body.' } });
      }
      const doc = await fastify.prisma.document.findFirst({
        where: { id: body.summarize_doc_id, case_id, tenant_id },
        select: { id: true, processing_status: true },
      });
      if (!doc) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Document not found.' } });
      if (doc.processing_status !== 'ready') {
        return reply.status(400).send({ error: { code: 'DOC_NOT_READY', message: 'Document OCR is not complete yet.' } });
      }
      inputConfig.summarize_doc_id = body.summarize_doc_id;
      docIds = [body.summarize_doc_id];

    } else {
      // Multi-doc agents (evidence, timeline, research, deposition, strategy, drafter)
      const allDocs = await fastify.prisma.document.findMany({
        where: { case_id, tenant_id, ...(body.doc_ids ? { id: { in: body.doc_ids } } : {}) },
        select: { id: true, doc_category: true, filename: true, processing_status: true },
      });
      if (allDocs.length < 1) {
        return reply.status(400).send({ error: { code: 'ERR_NO_DOCUMENTS', message: 'No documents found. Upload at least one.' } });
      }
      docIds = allDocs.map(d => d.id);
      inputConfig.doc_ids = docIds;
      inputConfig.doc_type = body.doc_type;
      inputConfig.draft_instructions = body.draft_instructions;

      // Add prior outputs for strategy
      const priorOutputs: Record<string, string> = {};
      for (const dep of AGENT_DEPENDENCIES[agent_type]) {
        const depJob = await fastify.prisma.agentJob.findFirst({
          where: { case_id, agent_type: dep as any, status: 'completed' },
          orderBy: { completed_at: 'desc' },
          select: { id: true },
        });
        if (depJob) priorOutputs[dep] = depJob.id;
      }
      inputConfig.prior_agent_outputs = priorOutputs;
    }

    // Create job record
    const agentJob = await fastify.prisma.agentJob.create({
      data: {
        tenant_id,
        case_id,
        agent_type: agent_type as any,
        agent_version: AGENT_VERSIONS[agent_type],
        status: 'queued',
        triggered_by: user_id,
        model_used: 'claude-sonnet-4-6',
        input_config: inputConfig,
      },
    });

    // Increment usage
    if (subscription) {
      await fastify.prisma.subscription.update({
        where: { tenant_id },
        data: { agent_runs_this_period: { increment: 1 } },
      });
    }

    // Run inline (no Redis needed)
    void (async () => {
      try {
        await runAgentInline(fastify, agentJob.id, agent_type, case_id, tenant_id);
      } catch (err: any) {
        fastify.log.error('[Agents] Inline agent failed: ' + err.message);
      }
    })();

    return reply.status(202).send({
      data: {
        job_id: agentJob.id,
        status: 'running',
        agent_type,
        message: `Agent running. Poll /v1/agents/jobs/${agentJob.id} for updates.`,
      }
    });
  });

  // GET /v1/agents/cases/:case_id — get all agent jobs for a case
  fastify.get('/cases/:case_id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { case_id } = request.params as { case_id: string };

    const jobs = await fastify.prisma.agentJob.findMany({
      where: { case_id, tenant_id },
      orderBy: { created_at: 'desc' },
    });

    const grouped: Record<string, any> = {};
    for (const job of jobs) {
      if (!grouped[job.agent_type] || job.created_at > grouped[job.agent_type].created_at) {
        grouped[job.agent_type] = job;
      }
    }

    return reply.send({ data: { latest: grouped, all: jobs } });
  });

  // POST /v1/agents/cases/:case_id/cancel-queued
  fastify.post('/cases/:case_id/cancel-queued', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { case_id } = request.params as { case_id: string };
    const result = await fastify.prisma.agentJob.updateMany({
      where: { case_id, tenant_id, status: { in: ['queued', 'running'] } },
      data: { status: 'failed', error_message: 'Cancelled by user', completed_at: new Date() },
    });
    return reply.send({ data: { cancelled: result.count } });
  });

  // GET /v1/agents/jobs/:id/output
  fastify.get('/jobs/:id/output', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };
    const job = await fastify.prisma.agentJob.findFirst({
      where: { id, tenant_id },
      select: { id: true, output: true, status: true },
    });
    if (!job) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
    reply.header('Cache-Control', 'private, max-age=300');
    return reply.send({ data: job });
  });

  // GET /v1/agents/jobs/:id
  fastify.get('/jobs/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };
    const job = await fastify.prisma.agentJob.findFirst({ where: { id, tenant_id } });
    if (!job) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Agent job not found' } });
    return reply.send({ data: job });
  });

  // DELETE /v1/agents/jobs/:id
  fastify.delete('/jobs/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };
    const job = await fastify.prisma.agentJob.findFirst({ where: { id, tenant_id } });
    if (!job) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
    await fastify.prisma.agentJob.delete({ where: { id } });
    return reply.send({ data: { deleted: true } });
  });

  // POST /v1/agents/jobs/:id/promote — promote agent output to Draft
  fastify.post('/jobs/:id/promote', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id } = request.user;
    const { id } = request.params as { id: string };

    const job = await fastify.prisma.agentJob.findFirst({
      where: { id, tenant_id, status: 'completed' },
    });
    if (!job) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Completed agent job not found' } });

    const output = job.output as any;
    let title = '';
    let docType = 'other';
    let text = '';

    if (job.agent_type === 'drafter') {
      // Drafter output promotes directly as a proper draft
      // normaliseDraftDocType handles Claude returning labels like "Bail Application" instead of "bail_application"
      docType = normaliseDraftDocType(output.doc_type);
      title = output.title || docTypeLabel(docType);
      text = output.content || '';
    } else if (job.agent_type === 'reviewer') {
      title = `Document Review: ${output.document_name || 'Review Report'}`;
      const issueLines = (output.critical_issues || []).map((i: any) =>
        `[${i.severity || 'Issue'}] ${i.issue}: ${i.explanation || ''}`
      ).join('\n');
      const missingLines = (output.missing_elements || []).join('\n- ');
      text = `Document Review Report\n\nOverall Assessment: ${output.overall_assessment || '—'}\nRisk Score: ${output.risk_score || 0}/100\n\nSummary:\n${output.summary || ''}\n\nCritical Issues:\n${issueLines}\n\nMissing Elements:\n- ${missingLines}\n\nStrengths:\n- ${(output.strengths || []).join('\n- ')}`;
    } else if (job.agent_type === 'summarizer') {
      title = `Document Summary: ${output.document_name || 'Summary'}`;
      const keyFacts = (output.key_facts || []).join('\n- ');
      const actions = (output.action_items || []).join('\n- ');
      text = `Document Summary\n\nType: ${output.document_type || '—'}\nParties: ${output.parties?.primary || ''} vs ${output.parties?.opposing || ''}\nDate: ${output.date_of_document || '—'}\n\nSummary:\n${output.summary || ''}\n\nKey Facts:\n- ${keyFacts}\n\nOrders/Findings:\n- ${(output.orders_or_findings || []).join('\n- ')}\n\nImplications for Case:\n${output.implications_for_case || ''}\n\nAction Items:\n- ${actions}`;
    } else if (job.agent_type === 'evidence') {
      title = 'Evidence Analysis Report';
      const exhibits = (output.exhibits || []).map((e: any) => `Exhibit ${e.number}: ${e.description} (${e.strength})`).join('\n');
      text = `Evidence Analysis\n\nExhibits:\n${exhibits}\n\nKey Facts:\n- ${(output.key_facts || []).join('\n- ')}\n\nContradictions:\n- ${(output.contradictions || []).join('\n- ')}\n\nMissing Evidence:\n- ${(output.missing_evidence || []).join('\n- ')}`;
    } else if (job.agent_type === 'timeline') {
      title = 'Case Timeline';
      const events = (output.events || []).map((e: any) => `${e.date}${e.time ? ' ' + e.time : ''}: ${e.description}`).join('\n');
      text = `Case Timeline\n\n${events}\n\nDefence Opportunities:\n- ${(output.defence_opportunities || []).join('\n- ')}`;
    } else if (job.agent_type === 'research') {
      title = 'Legal Research Memo';
      const statutes = (output.applicable_statutes || []).map((s: any) => `${s.act} §${s.section}: ${s.description}`).join('\n');
      const precedents = (output.favorable_precedents || []).map((p: any) => `${p.citation} (${p.court}, ${p.year}): ${p.held}`).join('\n');
      text = `Legal Research Memo\n\nApplicable Statutes:\n${statutes}\n\nFavourable Precedents:\n${precedents}`;
    } else if (job.agent_type === 'deposition') {
      title = 'Deposition Analysis';
      const qs = (output.cross_examination_questions || []).join('\n- ');
      text = `Deposition Analysis\n\nWitness: ${output.witness_name || '—'}\nCredibility: ${output.credibility_assessment || '—'}\n${output.credibility_reasoning || ''}\n\nCross-Examination Questions:\n- ${qs}`;
    } else if (job.agent_type === 'strategy') {
      title = output.opening_statement ? 'Opening Statement' : 'Case Strategy';
      docType = output.opening_statement ? 'opening_statement' : 'other';
      text = output.opening_statement || output.closing_skeleton || JSON.stringify(output, null, 2);
    } else {
      title = job.agent_type + ' Analysis';
      text = JSON.stringify(output, null, 2);
    }

    const draftContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
    const wordCount = text.split(/\s+/).length;

    const draft = await fastify.prisma.draft.create({
      data: {
        tenant_id,
        case_id: job.case_id,
        title,
        doc_type: docType as any,
        content: draftContent,
        version: 1,
        word_count: wordCount,
        promoted_from_job: id,
        created_by: user_id,
        last_modified_by: user_id,
      },
    });

    return reply.status(201).send({ data: draft });
  });
};
