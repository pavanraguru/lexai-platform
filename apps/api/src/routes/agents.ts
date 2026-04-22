// ============================================================
// LexAI India — Agent Routes
// PRD v1.1 Section 7.2 — AI Agent Suite
// All 5 agents: evidence, timeline, deposition, research, strategy
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { Queue } from 'bullmq';
import { z } from 'zod';
import { PLAN_LIMITS } from '@lexai/core';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RunAgentSchema = z.object({
  research_focus: z.string().optional(), // for research agent
  perspective: z.enum(['defence','prosecution','petitioner','respondent','appellant','claimant']).optional(),
  doc_ids: z.array(z.string().uuid()).optional(), // override which docs to use
  chain: z.boolean().default(false), // run dependent agents in sequence
});

const AGENT_VERSIONS: Record<string, string> = {
  evidence:   'AGENT_EVIDENCE_V1',
  timeline:   'AGENT_TIMELINE_V1',
  deposition: 'AGENT_DEPOSITION_V1',
  research:   'AGENT_RESEARCH_V1',
  strategy:   'AGENT_STRATEGY_V1',
};

const AGENT_DEPENDENCIES: Record<string, string[]> = {
  evidence:   [],
  timeline:   ['evidence'],
  deposition: [],
  research:   [],
  strategy:   ['evidence', 'timeline', 'deposition', 'research'],
};

// ── Inline agent runner (fallback when Redis/BullMQ unavailable) ──────────────
async function runAgentInline(fastify: any, job_id: string, agent_type: string, case_id: string, tenant_id: string) {
  console.log(`[Agents Inline] Starting ${agent_type} for case ${case_id}`);

  await fastify.prisma.agentJob.update({
    where: { id: job_id },
    data: { status: 'running', started_at: new Date() },
  });

  try {
    const agentJob = await fastify.prisma.agentJob.findUnique({ where: { id: job_id } });
    if (!agentJob) throw new Error('Job not found');

    const cfg = agentJob.input_config as any;
    const caseData = cfg.case_metadata;

    // Fetch documents
    const documents = await fastify.prisma.document.findMany({
      where: { id: { in: cfg.doc_ids } },
      select: { id: true, filename: true, doc_category: true, extracted_text: true, processing_status: true },
    });

    if (!documents.length) throw new Error('No documents found for this case.');

    // Build doc context
    const MAX = 4000;
    let total = 0;
    const docContext = documents.map((d: any) => {
      if (d.extracted_text) {
        const t = d.extracted_text.substring(0, MAX);
        return `--- ${d.filename} (${d.doc_category || 'doc'}) ---\n${t}`;
      }
      return `--- ${d.filename} (${d.doc_category || 'doc'}) [no OCR text yet] ---`;
    }).filter((c: string) => { if (total >= 16000) return false; total += c.length; return true; }).join('\n\n');

    // Build prior outputs
    const priorOutputs: Record<string, any> = {};
    if (cfg.prior_agent_outputs) {
      for (const [t, jid] of Object.entries(cfg.prior_agent_outputs as Record<string, string>)) {
        const pj = await fastify.prisma.agentJob.findUnique({ where: { id: jid }, select: { output: true } });
        if (pj?.output) priorOutputs[t] = pj.output;
      }
    }

    // Prompts (condensed for inline use)
    const courtAddress = caseData.court_level === 'supreme_court' || caseData.court_level === 'high_court' ? 'My Lord' : 'Your Honour';
    const baseContext = `Case: ${caseData.title || 'Unknown'}\nCourt: ${caseData.court || 'Unknown'}\nType: ${caseData.case_type || 'Unknown'}\nPerspective: ${caseData.perspective || 'defence'}`;

    const prompts: Record<string, { system: string; user: string }> = {
      evidence: {
        system: `You are a senior Indian advocate's AI assistant. Analyse evidence from the provided documents.\n${baseContext}\nCRITICAL: Return ONLY a raw JSON object. No markdown fences, no code blocks, no explanation text. Your response must start with { and end with }. Example format:\n{"exhibits":[{"number":"E-A","description":"...","doc_id":"...","relevance":"...","strength":"Strong|Moderate|Weak"}],"key_facts":["..."],"contradictions":["..."],"missing_evidence":["..."]}`,
        user: `Analyse evidence:\n\n${docContext}`,
      },
      timeline: {
        system: `You are a senior Indian advocate's AI assistant. Reconstruct the case timeline.\n${baseContext}\nCRITICAL: Return ONLY a raw JSON object. No markdown fences, no code blocks, no explanation text. Your response must start with { and end with }. Example format:\n{"events":[{"date":"YYYY-MM-DD","time":"HH:MM","description":"...","event_type":"offence|arrest|fir_registration|court_date|other","importance_score":8}],"prosecution_gaps":["..."],"defence_opportunities":["..."]}`,
        user: `Reconstruct timeline:\n\n${docContext}`,
      },
      research: {
        system: `You are a senior Indian advocate's AI assistant specialising in legal research.\n${baseContext}\nCRITICAL: Return ONLY a raw JSON object. No markdown fences, no code blocks, no explanation text. Your response must start with { and end with }. Example format:\n{"applicable_statutes":[{"act":"...","section":"...","description":"...","relevance":"..."}],"favorable_precedents":[{"citation":"...","court":"SC|HC","year":2023,"held":"...","relevance":"..."}],"adverse_precedents":[{"citation":"...","court":"SC|HC","year":2023,"held":"...","how_to_distinguish":"..."}],"disclaimer":"AI research — verify on SCC Online before relying in court"}`,
        user: `Research Indian law for this case:\n\n${docContext.substring(0, 6000)}`,
      },
      deposition: {
        system: `You are a senior Indian advocate's AI assistant specialising in deposition analysis.\n${baseContext}\nCRITICAL: Return ONLY a raw JSON object. No markdown fences, no code blocks, no explanation text. Your response must start with { and end with }. Example format:\n{"witness_name":"...","inconsistencies":[{"statement":"...","contradiction":"...","page":"..."}],"cross_examination_questions":["..."],"credibility_assessment":"High|Medium|Low","credibility_reasoning":"..."}`,
        user: `Analyse this deposition:\n\n${docContext}`,
      },
      strategy: {
        system: `You are a senior Indian advocate's AI assistant. Develop court strategy.\n${baseContext}\nAddress court as ${courtAddress}.\nCRITICAL: Return ONLY a raw JSON object. No markdown fences, no code blocks, no explanation text. Your response must start with { and end with }. Example format:\n{"perspective":"defence","opening_statement":"In the matter of...","closing_skeleton":"1. Summary...","bench_questions":[{"question":"...","suggested_answer":"..."}],"sentiment":{"label":"Favorable|Neutral|Unfavorable","score":65,"reasoning":"...","evidence_strength":"Strong|Moderate|Weak","precedent_strength":"Strong|Moderate|Weak","timeline_consistency":"Consistent|Minor Gaps|Major Gaps","witness_credibility":"High|Medium|Low"},"strengths":["..."],"vulnerabilities":[{"issue":"...","mitigation":"..."}]}`,
        user: `Develop strategy.\n\nEVIDENCE: ${JSON.stringify(priorOutputs.evidence || {}).substring(0, 2000)}\nRESEARCH: ${JSON.stringify(priorOutputs.research || {}).substring(0, 2000)}\nDOCS:\n${docContext.substring(0, 4000)}`,
      },
    };

    const p = prompts[agent_type];
    if (!p) throw new Error(`Unknown agent type: ${agent_type}`);

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: agent_type === 'strategy' ? 4000
        : agent_type === 'research' ? 3500
        : agent_type === 'timeline' ? 3000
        : 2000,
      system: p.system,
      messages: [{ role: 'user', content: p.user }],
      stop_sequences: ['

Note:', '

Disclaimer:', '

Please note'],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON robustly — handle all Claude output formats
    let parsed: any;
    try {
      let jsonStr = raw.trim();
      // Remove code fences: ```json ... ``` or ``` ... ```
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      // If still has fences anywhere, extract the JSON block
      const fenceMatch = jsonStr.match(/```(?:json)?[\s\n]*([\s\S]+?)[\s\n]*```/);
      if (fenceMatch) jsonStr = fenceMatch[1].trim();
      // Extract first complete JSON object
      if (!jsonStr.startsWith('{')) {
        const start = jsonStr.indexOf('{');
        if (start !== -1) {
          let depth = 0, end = -1;
          for (let i = start; i < jsonStr.length; i++) {
            if (jsonStr[i] === '{') depth++;
            else if (jsonStr[i] === '}' && --depth === 0) { end = i; break; }
          }
          if (end !== -1) jsonStr = jsonStr.slice(start, end + 1);
        }
      }
      parsed = JSON.parse(jsonStr);
    } catch (parseErr: any) {
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
      data: { status: 'completed', output: parsed, tokens_input: inputTokens, tokens_output: outputTokens, cost_inr: costINR, completed_at: new Date() },
    });

    console.log(`[Agents Inline] ✅ ${agent_type} done. Tokens: ${inputTokens}+${outputTokens}. Cost: ₹${costINR}`);
  } catch (err: any) {
    console.error(`[Agents Inline] ❌ ${agent_type} failed:`, err.message);
    await fastify.prisma.agentJob.update({
      where: { id: job_id },
      data: { status: 'failed', error_message: String(err.message).substring(0, 500), completed_at: new Date() },
    }).catch(() => {});
  }
}

export const agentRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /v1/agents/cases/:case_id/run/:agent_type
  // Enqueue an agent job — async, result via Supabase Realtime
  fastify.post('/cases/:case_id/run/:agent_type', {
    preHandler: [fastify.authenticate],
    config: { allowEmptyBody: true },
  }, async (request, reply) => {
    const { tenant_id, id: user_id, role } = request.user;
    const { case_id, agent_type } = request.params as { case_id: string; agent_type: string };

    // Clerks and clients cannot run agents
    if (['clerk', 'client'].includes(role)) {
      return reply.status(403).send({
        error: { code: 'ERR_INSUFFICIENT_ROLE', message: 'Advocates only can run AI agents' }
      });
    }

    // Validate agent type
    if (!Object.keys(AGENT_VERSIONS).includes(agent_type)) {
      return reply.status(400).send({
        error: { code: 'INVALID_AGENT', message: `Unknown agent: ${agent_type}. Valid: ${Object.keys(AGENT_VERSIONS).join(', ')}` }
      });
    }

    // Verify case belongs to tenant
    const caseRecord = await fastify.prisma.case.findFirst({
      where: { id: case_id, tenant_id },
    });
    if (!caseRecord) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Case not found' } });
    }

    // Check plan limits — super_admin bypasses all limits
    const subscription = await fastify.prisma.subscription.findFirst({ where: { tenant_id } });
    if (subscription && role !== 'super_admin') {
      const plan = subscription.plan as keyof typeof PLAN_LIMITS;
      const limit = PLAN_LIMITS[plan].agent_runs_per_month;
      if (limit !== null && subscription.agent_runs_this_period >= limit) {
        return reply.status(403).send({
          error: {
            code: 'ERR_TOKEN_LIMIT',
            message: `Monthly agent run limit (${limit}) reached for ${plan} plan. Upgrade to run more agents.`
          }
        });
      }
    }

    // Check for already-running job of same type
    const runningJob = await fastify.prisma.agentJob.findFirst({
      where: { case_id, agent_type: agent_type as any, status: { in: ['queued', 'running'] } },
    });
    if (runningJob) {
      return reply.status(409).send({
        error: {
          code: 'ERR_AGENT_RUNNING',
          message: `${agent_type} agent is already running for this case. Job ID: ${runningJob.id}`
        }
      });
    }

    // For strategy agent: check evidence has been run
    if (agent_type === 'strategy') {
      const evidenceJob = await fastify.prisma.agentJob.findFirst({
        where: { case_id, agent_type: 'evidence', status: 'completed' },
      });
      if (!evidenceJob) {
        return reply.status(400).send({
          error: {
            code: 'DEPENDENCY_NOT_MET',
            message: 'Run the Evidence agent first before running Strategy agent'
          }
        });
      }
    }

    const body = RunAgentSchema.parse((request.body && Object.keys(request.body as any).length ? request.body : {}) as any);

    // Get all documents — prefer ready (OCR done) but fall back to any uploaded doc
    const allDocuments = await fastify.prisma.document.findMany({
      where: {
        case_id,
        tenant_id,
        ...(body.doc_ids ? { id: { in: body.doc_ids } } : {}),
      },
      select: { id: true, doc_category: true, filename: true, s3_key: true, processing_status: true },
    });

    const documents = allDocuments;

    if (documents.length < 1) {
      return reply.status(400).send({
        error: {
          code: 'ERR_NO_DOCUMENTS',
          message: 'No documents found for this case. Upload at least one document first.'
        }
      });
    }

    const readyCount = allDocuments.filter(d => d.processing_status === 'ready').length;
    fastify.log.info(`[Agents] Case ${case_id}: ${readyCount}/${documents.length} docs OCR-ready`);

    // Get prior agent outputs for context injection
    const priorOutputs: Record<string, string> = {};
    for (const dep of AGENT_DEPENDENCIES[agent_type]) {
      const depJob = await fastify.prisma.agentJob.findFirst({
        where: { case_id, agent_type: dep as any, status: 'completed' },
        orderBy: { completed_at: 'desc' },
        select: { id: true },
      });
      if (depJob) priorOutputs[dep] = depJob.id;
    }

    // Create the job record
    const agentJob = await fastify.prisma.agentJob.create({
      data: {
        tenant_id,
        case_id,
        agent_type: agent_type as any,
        agent_version: AGENT_VERSIONS[agent_type],
        status: 'queued',
        triggered_by: user_id,
        model_used: 'claude-sonnet-4-6',
        input_config: {
          doc_ids: documents.map(d => d.id),
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
          },
          prior_agent_outputs: priorOutputs,
        } as any,
      },
    });

    // Increment usage counter
    if (subscription) {
      await fastify.prisma.subscription.update({
        where: { tenant_id },
        data: { agent_runs_this_period: { increment: 1 } },
      });
    }

    // Run agent directly in-process — no Redis needed
    // void Promise: starts executing immediately, HTTP response returns without waiting
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
        message: 'Agent running. Poll /v1/agents/jobs/' + agentJob.id + ' for updates.',
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

    // Group by agent type — return latest of each
    const grouped: Record<string, any> = {};
    for (const job of jobs) {
      if (!grouped[job.agent_type] || job.created_at > grouped[job.agent_type].created_at) {
        grouped[job.agent_type] = job;
      }
    }

    return reply.send({ data: { latest: grouped, all: jobs } });
  });

  // POST /v1/agents/cases/:case_id/cancel-queued — cancel all stuck queued jobs
  fastify.post('/cases/:case_id/cancel-queued', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { case_id } = request.params as { case_id: string };

    const result = await fastify.prisma.agentJob.updateMany({
      where: { case_id, tenant_id, status: { in: ['queued', 'running'] } },
      data: { status: 'failed', error_message: 'Cancelled by user', completed_at: new Date() },
    });

    return reply.send({ data: { cancelled: result.count, message: `${result.count} stuck job(s) cancelled` } });
  });

  // GET /v1/agents/jobs/:id — get single agent job status + output
  fastify.get('/jobs/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };

    const job = await fastify.prisma.agentJob.findFirst({
      where: { id, tenant_id },
    });

    if (!job) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Agent job not found' } });
    }

    return reply.send({ data: job });
  });

  // POST /v1/agents/jobs/:id/promote — promote agent output to Draft
  // PRD DW-03 — Promote Agent Output
  // DELETE /v1/agents/jobs/:id — delete an agent job from history
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

  fastify.post('/jobs/:id/promote', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id } = request.user;
    const { id } = request.params as { id: string };

    const job = await fastify.prisma.agentJob.findFirst({
      where: { id, tenant_id, status: 'completed' },
    });

    if (!job) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Completed agent job not found' } });
    }


    const output = job.output as any;
    let title = '';
    let docType = 'other';
    let draftContent: any = {};
    let wordCount = 0;
    let text = '';

    // Build draft content based on agent type — PRD DW-03
    if (job.agent_type === 'evidence') {
      title = 'Evidence Analysis Report';
      const exhibitLines = (output.exhibits || []).map((e: any) =>
        'Exhibit ' + (e.number || '') + ': ' + (e.description || '') + ' (' + (e.category || 'general') + ')');
      const contradictionLines = (output.contradictions || []).map((c: any) => '- ' + (c.description || ''));
      const witnessLines = (output.witnesses || []).map((w: any) =>
        (w.name || '') + ' (' + (w.type || '') + '): ' + (w.significance || ''));
      const parts = ['Evidence Analysis'];
      if (exhibitLines.length) parts.push('Exhibits', exhibitLines.join(', '));
      if (contradictionLines.length) parts.push('Contradictions', contradictionLines.join(', '));
      if (witnessLines.length) parts.push('Witnesses', witnessLines.join(', '));
      if (output.key_facts?.length) parts.push('Key Facts', (output.key_facts || []).join(', '));
      text = parts.join(' | ');
    } else if (job.agent_type === 'timeline') {
      title = 'Case Timeline';
      const eventLines = (output.events || []).map((e: any) =>
        (e.date || '') + ' ' + (e.time || '') + ': ' + (e.description || ''));
      text = 'Case Timeline | ' + (eventLines.join(' | ') || 'No events found');
    } else if (job.agent_type === 'deposition') {
      title = 'Deposition Analysis';
      text = output.analysis || output.summary || 'Deposition analysis completed.';
    } else if (job.agent_type === 'research') {
      title = 'Legal Research Memo';
      const statutes = (output.applicable_statutes || []).join(', ');
      const precedentLines = (output.favorable_precedents || []).map((p: any) =>
        (p.citation || '') + ': ' + (p.relevance || ''));
      const parts = ['Legal Research'];
      if (statutes) parts.push('Applicable Statutes: ' + statutes);
      if (precedentLines.length) parts.push('Favourable Precedents: ' + precedentLines.join(' | '));
      text = parts.join(' | ');
    } else if (job.agent_type === 'strategy') {
      title = output.opening_statement ? 'Opening Statement' : 'Case Strategy';
      docType = output.opening_statement ? 'opening_statement' : 'other';
      text = output.opening_statement || output.strategy_summary || 'Strategy analysis completed.';
    } else {
      title = job.agent_type + ' Analysis';
      text = JSON.stringify(output, null, 2);
    }

    draftContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
    wordCount = text.split(' ').length;

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
