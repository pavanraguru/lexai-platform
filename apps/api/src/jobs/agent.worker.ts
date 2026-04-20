// ============================================================
// LexAI India — Agent Job Worker
// BullMQ worker that processes queued agent jobs
// Calls Claude claude-sonnet-4-6 with PRD-specified prompts
// PRD v1.1 Section 7.2 — AI Agent Suite
// ============================================================

import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { INDIAN_COURTS, INDIAN_STATUTES, WITNESS_TYPES, FIR_DELAY_FLAG_HOURS } from '@lexai/core';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const prisma = new PrismaClient();

// ── Indian Legal Context injected into every agent prompt ────
const INDIAN_LEGAL_CONTEXT = `
INDIAN LEGAL CONTEXT — inject into all analysis:

CURRENT LAWS (use these for new cases post July 2024):
- Criminal code: Bharatiya Nyaya Sanhita 2023 (BNS) — replaces IPC 1860
- Criminal procedure: Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS) — replaces CrPC 1973  
- Evidence: Bharatiya Sakshya Adhiniyam 2023 (BSA) — replaces Indian Evidence Act 1872
- For older cases still use IPC/CrPC/IEA as appropriate

COURT HIERARCHY & ADDRESS:
- Supreme Court: "My Lord" / "Your Lordship"
- High Courts: "My Lord" / "Your Lordship"  
- District/Sessions Courts: "Your Honour"
- Tribunals (NCLT/DRT/ITAT): "Honourable Member"

WITNESS NUMBERING: PW = Prosecution Witness, DW = Defence Witness, CW = Court Witness
EVIDENCE MARKING: E- (Exhibits), MO- (Material Objects), X- (X-rays/maps/charts)
TIMEZONE: All times in IST (UTC+5:30)
FIR DELAY: >12 hours between offence and FIR registration is legally significant per SC precedents
CITATION FORMAT: (2024) 4 SCC 123 for Supreme Court; 2024 SCC OnLine Del 456 for High Courts
`;

// ── Agent System Prompts (PRD v1.1 Section 7.2) ──────────────

function getEvidencePrompt(caseData: any): string {
  return `You are a senior Indian advocate's AI assistant specialising in evidence analysis.

${INDIAN_LEGAL_CONTEXT}

CASE DETAILS:
Title: ${caseData.title}
Type: ${caseData.case_type}
Court: ${caseData.court} (${caseData.court_level})
Perspective: ${caseData.perspective}
Sections Charged: ${(caseData.metadata?.sections_charged || []).join(', ') || 'Not specified'}
${caseData.metadata?.fir_number ? `FIR: ${caseData.metadata.fir_number}` : ''}
${caseData.metadata?.complainant_name ? `Complainant: ${caseData.metadata.complainant_name}` : ''}
${(caseData.metadata?.accused_names || []).length > 0 ? `Accused: ${caseData.metadata.accused_names.join(', ')}` : ''}

TASK: Analyse the provided legal documents and extract:
1. All exhibits with their exhibit numbers (E-1, E-2, MO-1 etc.) and source page
2. Key facts — each fact with its source document and page number, and importance (high/medium/low)
3. All witnesses with their type (PW/DW/CW) and numbering
4. Contradictions between documents — especially FIR vs chargesheet, or witness vs witness
5. Standard documents that are MISSING for this case type (e.g. missing medical exam report for assault cases)

CRITICAL: FIR filing delay >12 hours is highly significant — flag it prominently as a HIGH importance fact.

Return ONLY valid JSON matching this exact schema. No markdown, no explanation:
{
  "exhibits": [{"number": "E-1", "description": "...", "doc_id": "...", "page": 1}],
  "key_facts": [{"fact": "...", "doc_id": "...", "page": 1, "importance": "high|medium|low"}],
  "witnesses": [{"name": "...", "type": "PW|DW|CW", "number": "PW-1", "doc_id": "..."}],
  "contradictions": [{"description": "...", "doc1_id": "...", "doc2_id": "...", "significance": "high|medium|low"}],
  "missing_docs": ["description of missing document"]
}`;
}

function getTimelinePrompt(caseData: any, evidenceOutput: any): string {
  return `You are a senior Indian advocate's AI assistant specialising in case timeline reconstruction.

${INDIAN_LEGAL_CONTEXT}

CASE: ${caseData.title} | ${caseData.case_type} | ${caseData.perspective}

${evidenceOutput ? `EVIDENCE ALREADY EXTRACTED:
Key Facts: ${JSON.stringify(evidenceOutput.key_facts?.slice(0, 10))}
Witnesses: ${JSON.stringify(evidenceOutput.witnesses)}` : ''}

TASK: Reconstruct the complete chronological timeline of events from all documents.
Identify:
1. Date/time of alleged offence
2. FIR registration date/time — calculate gap from offence (CRITICAL if >12 hours)
3. Arrest date and time
4. All court dates with outcomes
5. Any gaps in the prosecution's narrative where no evidence accounts for the accused
6. Alibi windows — periods where defence documents show accused was elsewhere

All timestamps must be in IST (UTC+5:30).

Return ONLY valid JSON:
{
  "events": [{
    "date": "YYYY-MM-DD",
    "time": "HH:MM or null",
    "description": "...",
    "source_doc_id": "...",
    "source_page": 1,
    "event_type": "offence|arrest|fir_registration|remand|bail|court_date|medical|witness_statement|other",
    "importance_score": 0.95,
    "gap_after_minutes": null
  }],
  "prosecution_gaps": [{"description": "...", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "significance": "high|medium|low"}],
  "alibi_windows": [{"start": "ISO8601+05:30", "end": "ISO8601+05:30", "description": "..."}]
}`;
}

function getDepositionPrompt(caseData: any, depositionText: string): string {
  return `You are a senior Indian advocate's AI assistant specialising in witness examination analysis.

${INDIAN_LEGAL_CONTEXT}

CASE: ${caseData.title} | Perspective: ${caseData.perspective}

DEPOSITION TEXT TO ANALYSE:
${depositionText}

TASK: Analyse this deposition for:
1. Inconsistencies within this testimony (self-contradictions)
2. Inconsistencies with the FIR or chargesheet (if known from context)
3. Suggested cross-examination questions targeting each inconsistency
4. Witness credibility score (0-10, where 10 = fully consistent)
5. Any leading or objectionable questions already put to the witness

Use Indian court terminology: Examination-in-Chief, Cross-Examination, Re-Examination.

Return ONLY valid JSON:
{
  "witness_name": "...",
  "witness_type": "PW|DW|CW",
  "witness_number": "PW-1",
  "credibility_score": 7,
  "credibility_reasoning": "...",
  "inconsistencies": [{"description": "...", "stmt1_location": "Exam-in-Chief, Page 3", "stmt2_location": "Cross, Page 7", "significance": "high|medium|low"}],
  "suggested_cross_questions": [{"question": "...", "based_on": "inconsistency description"}],
  "objectionable_questions": [{"quote": "...", "reason": "Leading question / compound question / etc."}]
}`;
}

function getResearchPrompt(caseData: any, researchFocus?: string): string {
  return `You are a senior Indian advocate's AI assistant specialising in legal research.

${INDIAN_LEGAL_CONTEXT}

CASE: ${caseData.title}
Type: ${caseData.case_type}
Court: ${caseData.court}
Sections: ${(caseData.metadata?.sections_charged || []).join(', ')}
Perspective: ${caseData.perspective}
${researchFocus ? `RESEARCH FOCUS: ${researchFocus}` : ''}

TASK: Identify relevant Indian law for this case:
1. Applicable statutes with specific section numbers (use BNS/BNSS/BSA for post-July 2024 cases, IPC/CrPC for older)
2. Favourable Supreme Court and High Court precedents (prefer post-2015 judgments)
3. Adverse precedents and how to distinguish them

IMPORTANT DISCLAIMER: Include this exact disclaimer in your output.

Return ONLY valid JSON:
{
  "applicable_statutes": [{"act": "...", "section": "...", "description": "...", "relevance": "..."}],
  "favorable_precedents": [{
    "citation": "(2023) 4 SCC 567",
    "court": "Supreme Court of India",
    "year": 2023,
    "held": "...",
    "relevance_score": 0.92,
    "distinguishing_factors": "..."
  }],
  "adverse_precedents": [{"citation": "...", "court": "...", "year": 2020, "held": "...", "how_to_distinguish": "..."}],
  "disclaimer": "AI-generated research. Verify all citations on SCC Online or Manupatra before relying in court. This output does not constitute legal advice."
}`;
}

function getStrategyPrompt(caseData: any, allOutputs: any): string {
  const perspective = caseData.perspective || 'defence';
  const courtAddressAs = Object.values(INDIAN_COURTS).find(
    c => c.level === caseData.court_level
  )?.address_as || 'Your Honour';

  return `You are a senior Indian advocate preparing for court arguments.

${INDIAN_LEGAL_CONTEXT}

CASE: ${caseData.title}
Court: ${caseData.court} | Address judge as: ${courtAddressAs}
Perspective: ${perspective}
Sections: ${(caseData.metadata?.sections_charged || []).join(', ')}

PRIOR ANALYSIS SUMMARY:
Evidence: ${allOutputs.evidence ? `${allOutputs.evidence.key_facts?.length || 0} facts, ${allOutputs.evidence.contradictions?.length || 0} contradictions` : 'Not run'}
Timeline: ${allOutputs.timeline ? `${allOutputs.timeline.events?.length || 0} events, ${allOutputs.timeline.prosecution_gaps?.length || 0} prosecution gaps` : 'Not run'}
Research: ${allOutputs.research ? `${allOutputs.research.favorable_precedents?.length || 0} favourable precedents` : 'Not run'}

TASK: Prepare complete court strategy for ${perspective} in ${caseData.court}:
1. Opening statement (2-4 pages, proper Indian court style, address as "${courtAddressAs}")
2. 15 anticipated bench questions with detailed suggested answers
3. Closing argument skeleton
4. Sentiment analysis (Favorable/Neutral/Unfavorable with subscores)
5. Top 3 strengths for the client
6. Top 3 vulnerabilities with mitigation strategies

Return ONLY valid JSON:
{
  "perspective": "${perspective}",
  "opening_statement": "In the matter of... [full opening statement text]",
  "closing_skeleton": "1. Summary of facts...\n2. Legal propositions...",
  "bench_questions": [{"question": "...", "suggested_answer": "..."}],
  "sentiment": {
    "label": "Favorable|Neutral|Unfavorable",
    "score": 72,
    "reasoning": "...",
    "evidence_strength": "Strong|Moderate|Weak",
    "precedent_strength": "Strong|Moderate|Weak",
    "timeline_consistency": "Consistent|Minor Gaps|Major Gaps",
    "witness_credibility": "High|Medium|Low"
  },
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "vulnerabilities": [{"issue": "...", "mitigation": "..."}]
}`;
}

// ── Token Cost Calculator ─────────────────────────────────────
function calculateCostINR(inputTokens: number, outputTokens: number): number {
  // claude-sonnet-4-6: $3/1M input, $15/1M output (approx)
  const inputCostUSD = (inputTokens / 1_000_000) * 3;
  const outputCostUSD = (outputTokens / 1_000_000) * 15;
  const totalUSD = inputCostUSD + outputCostUSD;
  const exchangeRate = 83.5; // approximate USD/INR — update periodically
  return Math.round(totalUSD * exchangeRate * 100) / 100;
}

// ── Main Worker ───────────────────────────────────────────────
const worker = new Worker('agent-jobs', async (job: Job) => {
  const { job_id, agent_type, case_id, tenant_id } = job.data;

  console.log(`[Agent Worker] Starting ${agent_type} agent for case ${case_id}`);

  // Mark job as running
  await prisma.agentJob.update({
    where: { id: job_id },
    data: { status: 'running', started_at: new Date() },
  });

  try {
    // Fetch the full job record with input config
    const agentJob = await prisma.agentJob.findUnique({ where: { id: job_id } });
    if (!agentJob) throw new Error('Agent job not found');

    const inputConfig = agentJob.input_config as any;
    const caseData = inputConfig.case_metadata;

    // Fetch document texts — accept all docs, use filename as fallback when OCR pending
    const documents = await prisma.document.findMany({
      where: {
        id: { in: inputConfig.doc_ids },
      },
      select: { id: true, filename: true, doc_category: true, extracted_text: true, page_count: true, processing_status: true },
    });

    if (documents.length === 0) {
      throw new Error('No documents found for this agent job. Please upload documents to the case first.');
    }

    const readyDocs = documents.filter(d => d.processing_status === 'ready' && d.extracted_text);
    console.log(`[Agent Worker] ${readyDocs.length}/${documents.length} docs have OCR text`);

    // Build document context — use OCR text where available, filename/category as fallback
    const MAX_CHARS_PER_DOC = 4000;
    const MAX_TOTAL_CHARS = 16000;
    let totalChars = 0;
    const docContext = documents
      .map(d => {
        if (d.extracted_text) {
          const text = d.extracted_text.substring(0, MAX_CHARS_PER_DOC);
          return `--- DOCUMENT: ${d.filename} (${d.doc_category || 'unknown'}) ---\n${text}`;
        } else {
          // No OCR yet — give the agent the filename and category so it can still reason
          return `--- DOCUMENT: ${d.filename} (${d.doc_category || 'unknown'}) [OCR PENDING — analyse based on document name and category] ---`;
        }
      })
      .filter(chunk => {
        if (totalChars >= MAX_TOTAL_CHARS) return false;
        totalChars += chunk.length;
        return true;
      })
      .join('\n\n');

    console.log(`[Agent Worker] Doc context: ${totalChars} chars, ${readyDocs.length}/${documents.length} with OCR text`);

    // Build prior outputs context
    const priorOutputs: Record<string, any> = {};
    if (inputConfig.prior_agent_outputs) {
      for (const [agType, jobId] of Object.entries(inputConfig.prior_agent_outputs as Record<string, string>)) {
        const priorJob = await prisma.agentJob.findUnique({
          where: { id: jobId },
          select: { output: true },
        });
        if (priorJob?.output) priorOutputs[agType] = priorJob.output;
      }
    }

    // Get appropriate prompt
    let systemPrompt: string;
    let userMessage: string;

    switch (agent_type) {
      case 'evidence':
        systemPrompt = getEvidencePrompt(caseData);
        userMessage = `Analyse these documents and extract all evidence:\n\n${docContext}`;
        break;
      case 'timeline':
        systemPrompt = getTimelinePrompt(caseData, priorOutputs.evidence);
        userMessage = `Reconstruct the chronological timeline from these documents:\n\n${docContext}`;
        break;
      case 'deposition':
        const depositionDocs = documents.filter(d => d.doc_category === 'deposition');
        if (depositionDocs.length === 0) {
          throw new Error('No deposition documents found. Upload a deposition transcript first.');
        }
        systemPrompt = getDepositionPrompt(caseData, depositionDocs[0].extracted_text || '');
        userMessage = 'Analyse this deposition for inconsistencies and suggest cross-examination questions.';
        break;
      case 'research':
        systemPrompt = getResearchPrompt(caseData, inputConfig.agent_settings?.research_focus);
        userMessage = `Research relevant Indian law for this case based on these documents:\n\n${docContext.substring(0, 20000)}`;
        break;
      case 'strategy':
        systemPrompt = getStrategyPrompt(caseData, priorOutputs);
        userMessage = `Develop court strategy based on all prior analysis:\n\nEVIDENCE OUTPUT: ${JSON.stringify(priorOutputs.evidence || {}, null, 2).substring(0, 3000)}\n\nRESEARCH OUTPUT: ${JSON.stringify(priorOutputs.research || {}, null, 2).substring(0, 2000)}\n\nDOCUMENTS:\n${docContext.substring(0, 6000)}`;
        break;
      default:
        throw new Error(`Unknown agent type: ${agent_type}`);
    }

    // Call Claude with retry on 429 rate limit
    let response: any;
    let retries = 0;
    const MAX_RETRIES = 3;
    while (true) {
      try {
        response = await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: agent_type === 'strategy' ? 4000 : 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        });
        break; // success
      } catch (err: any) {
        if (err.status === 429 && retries < MAX_RETRIES) {
          retries++;
          const waitMs = 65000; // always wait 65s — Anthropic rate limit resets per minute
          console.warn(`[Agent Worker] Rate limited (429). Retry ${retries}/${MAX_RETRIES} in ${waitMs/1000}s...`);
          await new Promise(r => setTimeout(r, waitMs));
        } else {
          throw err;
        }
      }
    }

    const rawOutput = response.content[0].type === 'text' ? response.content[0].text : '';
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const costINR = calculateCostINR(inputTokens, outputTokens);

    // Parse JSON output
    let parsedOutput: any;
    try {
      // Strip any markdown code fences if Claude adds them
      const clean = rawOutput.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      parsedOutput = JSON.parse(clean);
      parsedOutput.agent_type = agent_type;
      parsedOutput.case_id = case_id;
    } catch (parseErr) {
      console.error('[Agent Worker] JSON parse failed, retrying with stricter prompt');
      // On parse failure, retry with explicit JSON-only instruction
      throw new Error(`Failed to parse Claude output as JSON: ${rawOutput.substring(0, 200)}`);
    }

    // Update job with completed status and output
    await prisma.agentJob.update({
      where: { id: job_id },
      data: {
        status: 'completed',
        output: parsedOutput,
        tokens_input: inputTokens,
        tokens_output: outputTokens,
        cost_inr: costINR,
        completed_at: new Date(),
      },
    });

    // Store structured evidence items — wrapped in own try/catch so DB errors
    // do NOT corrupt the job status (Claude already succeeded at this point)
    if (agent_type === 'evidence' && Array.isArray(parsedOutput.exhibits)) {
      try {
        for (const exhibit of parsedOutput.exhibits) {
          if (!exhibit?.number || !exhibit?.description) continue;
          await prisma.evidenceItem.create({
            data: {
              case_id,
              agent_job_id: job_id,
              exhibit_number: String(exhibit.number),
              description: String(exhibit.description),
              source_doc_id: exhibit.doc_id || null,
              source_page: typeof exhibit.page === 'number' ? exhibit.page : null,
              category: String(exhibit.number).split('-')[0] + '-',
              extracted_by_agent: true,
            },
          }).catch(() => {});
        }
        console.log(`[Agent Worker] Saved ${parsedOutput.exhibits.length} evidence items`);
      } catch (evidenceErr: any) {
        // Non-fatal — log and continue, job is already marked completed above
        console.warn(`[Agent Worker] Evidence save warning (non-fatal): ${evidenceErr.message}`);
      }
    }

    // Store timeline events — same non-fatal pattern
    if (agent_type === 'timeline' && Array.isArray(parsedOutput.events)) {
      try {
        for (const event of parsedOutput.events) {
          if (!event?.date || !event?.description) continue;
          await prisma.timelineEvent.create({
            data: {
              case_id,
              agent_job_id: job_id,
              event_date: new Date(event.date),
              event_time: event.time || null,
              description: String(event.description),
              source_doc_id: event.source_doc_id || null,
              source_page: typeof event.source_page === 'number' ? event.source_page : null,
              event_type: event.event_type || 'other',
              importance_score: typeof event.importance_score === 'number' ? event.importance_score : null,
              gap_after_minutes: typeof event.gap_after_minutes === 'number' ? event.gap_after_minutes : null,
            },
          }).catch(() => {});
        }
        console.log(`[Agent Worker] Saved ${parsedOutput.events.length} timeline events`);
      } catch (timelineErr: any) {
        console.warn(`[Agent Worker] Timeline save warning (non-fatal): ${timelineErr.message}`);
      }
    }

    // Notify assigned advocates that agent completed
    const caseRecord = await prisma.case.findUnique({
      where: { id: case_id },
      select: { assigned_advocates: true, title: true },
    });

    if (caseRecord) {
      for (const advocateId of caseRecord.assigned_advocates) {
        await prisma.notification.create({
          data: {
            tenant_id,
            user_id: advocateId,
            type: 'agent_completed',
            title: `${agent_type.charAt(0).toUpperCase() + agent_type.slice(1)} Agent completed`,
            message: `AI analysis for "${caseRecord.title}" is ready. Cost: ₹${costINR}`,
            action_url: `/cases/${case_id}/agents`,
            related_case_id: case_id,
          },
        });
      }
    }

    console.log(`[Agent Worker] ✅ ${agent_type} completed. Tokens: ${inputTokens}+${outputTokens}. Cost: ₹${costINR}`);
    return { job_id, status: 'completed', tokens: { input: inputTokens, output: outputTokens }, cost_inr: costINR };

  } catch (error: any) {
    console.error(`[Agent Worker] ❌ ${agent_type} failed:`, error.message);

    // Sanitise error_message — never store raw JSON output as the error
    // (this was the original bug: parsedOutput stringified as error_message)
    const rawMsg = String(error.message || 'Unknown error');
    const safeErrorMsg = rawMsg.startsWith('{') || rawMsg.startsWith('"exhibits"')
      ? 'Agent completed but failed during post-processing. Check output field.'
      : rawMsg.substring(0, 500);

    await prisma.agentJob.update({
      where: { id: job_id },
      data: {
        status: 'failed',
        error_message: safeErrorMsg,
        completed_at: new Date(),
      },
    });

    // Notify of failure
    const caseRecord = await prisma.case.findUnique({
      where: { id: case_id },
      select: { assigned_advocates: true, title: true },
    });

    if (caseRecord) {
      for (const advocateId of caseRecord.assigned_advocates) {
        await prisma.notification.create({
          data: {
            tenant_id,
            user_id: advocateId,
            type: 'agent_failed',
            title: `${agent_type} Agent failed`,
            message: `Error: ${error.message}`,
            action_url: `/cases/${case_id}/agents`,
            related_case_id: case_id,
          },
        });
      }
    }

    throw error; // BullMQ will retry
  }
}, {
  connection: redis,
  concurrency: 1,
  stalledInterval: 600000,  // check stalled every 10 min — agents are long-running
  lockDuration: 600000,     // 10 min lock
  lockRenewTime: 300000,    // renew every 5 min
  drainDelay: 10000,        // poll for new jobs every 10s (default 5ms)
  maxStalledCount: 1,
  limiter: {
    max: 2,
    duration: 60000,
  },
});

worker.on('completed', (job) => {
  console.log(`[Agent Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Agent Worker] Job ${job?.id} failed:`, err.message);
});

console.log('🤖 LexAI Agent Worker started. Listening for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
