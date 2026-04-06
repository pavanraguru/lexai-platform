// ============================================================
// LexAI India — Agent Routes
// PRD v1.1 Section 7.2 — AI Agent Suite
// All 5 agents: evidence, timeline, deposition, research, strategy
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { Queue } from 'bullmq';
import { z } from 'zod';
import { PLAN_LIMITS } from '@lexai/core';

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

export const agentRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /v1/agents/cases/:case_id/run/:agent_type
  // Enqueue an agent job — async, result via Supabase Realtime
  fastify.post('/cases/:case_id/run/:agent_type', {
    preHandler: [fastify.authenticate],
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

    // Check plan limits
    const subscription = await fastify.prisma.subscription.findFirst({ where: { tenant_id } });
    if (subscription) {
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

    const body = RunAgentSchema.parse(request.body || {});

    // Get ready documents for this case
    const documents = await fastify.prisma.document.findMany({
      where: {
        case_id,
        tenant_id,
        processing_status: 'ready',
        ...(body.doc_ids ? { id: { in: body.doc_ids } } : {}),
      },
      select: { id: true, doc_category: true, filename: true, s3_key: true },
    });

    if (documents.length < 1) {
      return reply.status(400).send({
        error: {
          code: 'ERR_DOCUMENT_NOT_READY',
          message: 'No processed documents found. Upload and wait for OCR to complete first.'
        }
      });
    }

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

    // Enqueue BullMQ job
    const agentQueue = new Queue('agent-jobs', { connection: fastify.redis });
    await agentQueue.add(`run-${agent_type}`, {
      job_id: agentJob.id,
      agent_type,
      case_id,
      tenant_id,
    }, {
      jobId: agentJob.id,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    // Increment usage counter
    if (subscription) {
      await fastify.prisma.subscription.update({
        where: { tenant_id },
        data: { agent_runs_this_period: { increment: 1 } },
      });
    }

    return reply.status(202).send({
      data: {
        job_id: agentJob.id,
        status: 'queued',
        agent_type,
        message: 'Agent job queued. Connect to Supabase Realtime on agent_jobs table to receive updates.',
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
    let docType: string = 'other';
    let draftContent: any = {};
    let wordCount = 0;

    // Build draft content based on agent type — PRD DW-03
    switch (job.agent_type) {
      case 'evidence': {
        title = 'Evidence Analysis Report';
        const exhibits = (output.exhibits || []).map((e: any) =>
          `Exhibit ${e.number}: ${e.description} (${e.category || 'general'})`).join('
');
        const contradictions = (output.contradictions || []).map((c: any) =>
          `• ${c.description}`).join('
');
        const witnesses = (output.witnesses || []).map((w: any) =>
          `${w.name} (${w.type}): ${w.significance}`).join('
');
        const text = [
          '# Evidence Analysis
',
          exhibits ? `## Exhibits
${exhibits}
` : '',
          contradictions ? `## Contradictions
${contradictions}
` : '',
          witnesses ? `## Witnesses
${witnesses}
` : '',
          output.key_facts ? `## Key Facts
${(output.key_facts || []).join('
')}
` : '',
        ].filter(Boolean).join('
');
        draftContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
        wordCount = text.split(' ').length;
        break;
      }
      case 'timeline': {
        title = 'Case Timeline';
        const events = (output.events || []).map((e: any) =>
          `${e.date} ${e.time || ''}: ${e.description}`).join('
');
        const text = ['# Case Timeline
', events || 'No events found'].join('
');
        draftContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
        wordCount = text.split(' ').length;
        break;
      }
      case 'deposition': {
        title = 'Deposition Analysis';
        const text = output.analysis || output.summary || 'Deposition analysis completed.';
        draftContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
        wordCount = text.split(' ').length;
        break;
      }
      case 'research': {
        title = 'Legal Research Memo';
        const statutes = (output.applicable_statutes || []).join(', ');
        const precedents = (output.favorable_precedents || []).map((p: any) =>
          `• ${p.citation}: ${p.relevance}`).join('
');
        const text = [
          '# Legal Research
',
          statutes ? `## Applicable Statutes
${statutes}
` : '',
          precedents ? `## Favourable Precedents
${precedents}
` : '',
        ].filter(Boolean).join('
');
        draftContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
        wordCount = text.split(' ').length;
        break;
      }
      case 'strategy': {
        title = output.opening_statement ? 'Opening Statement' : 'Case Strategy';
        docType = output.opening_statement ? 'opening_statement' : 'other';
        const text = output.opening_statement || output.strategy_summary || 'Strategy analysis completed.';
        draftContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
        wordCount = text.split(' ').length;
        break;
      }
      default: {
        title = `${job.agent_type} Analysis`;
        draftContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: JSON.stringify(output, null, 2) }] }] };
      }
    }

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
