// ============================================================
// LexAI India — Drafts Route
// PRD v1.1 DW-01 to DW-05 — Drafting Workspace
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const CreateDraftSchema = z.object({
  case_id: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  doc_type: z.enum([
    'bail_application', 'plaint', 'written_statement', 'writ_petition',
    'affidavit', 'vakalatnama', 'opening_statement', 'closing_statement',
    'rejoinder', 'memo_of_appeal', 'other',
  ]).default('other'),
  content: z.any().default({ type: 'doc', content: [] }),
});

const UpdateDraftSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.any().optional(),
  doc_type: z.string().optional(),
  word_count: z.number().optional(),
});

export const draftRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /v1/drafts/case/:case_id
  fastify.get('/case/:case_id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id } = req.user;
    const { case_id } = req.params as { case_id: string };

    const drafts = await fastify.prisma.draft.findMany({
      where: { tenant_id, case_id },
      orderBy: { last_modified_at: 'desc' },
      select: {
        id: true, title: true, doc_type: true, version: true,
        word_count: true, created_at: true, last_modified_at: true,
        promoted_from_job: true, created_by: true, last_modified_by: true,
      },
    });

    return reply.send({ data: drafts });
  });

  // GET /v1/drafts/:id
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id } = req.user;
    const { id } = req.params as { id: string };

    const draft = await fastify.prisma.draft.findFirst({
      where: { id, tenant_id },
    });

    if (!draft) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Draft not found' } });
    }

    return reply.send({ data: draft });
  });

  // POST /v1/drafts
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id, id: user_id } = req.user;
    const body = CreateDraftSchema.parse(req.body);

    // Validate case exists if case_id provided
    if (body.case_id) {
      const caseRecord = await fastify.prisma.case.findFirst({
        where: { id: body.case_id, tenant_id },
      });
      if (!caseRecord) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Case not found' } });
      }
    }

    // Use raw SQL to bypass Prisma's required relation enforcement on case_id
    // The DB column is nullable (or will be after migration), Prisma client is just strict
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await fastify.prisma.$executeRawUnsafe(
      `INSERT INTO drafts (id, tenant_id, case_id, title, doc_type, content, version, word_count, created_by, last_modified_by, last_modified_at, created_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::"DraftDocType", $6::jsonb, 1, 0, $7::uuid, $7::uuid, $8::timestamptz, $8::timestamptz)`,
      id, tenant_id, body.case_id ?? null,
      body.title, body.doc_type,
      JSON.stringify(body.content),
      user_id, now
    );

    const draft = await fastify.prisma.draft.findFirst({ where: { id } });
    return reply.status(201).send({ data: draft });
  });

  // PATCH /v1/drafts/:id
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id, id: user_id } = req.user;
    const { id } = req.params as { id: string };
    const body = UpdateDraftSchema.parse(req.body);

    const existing = await fastify.prisma.draft.findFirst({ where: { id, tenant_id } });
    if (!existing) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Draft not found' } });
    }

    // Calculate word count from content
    let wordCount = existing.word_count;
    if (body.content) {
      const text = JSON.stringify(body.content).replace(/<[^>]*>/g, ' ').replace(/[^a-zA-Z\s]/g, ' ');
      wordCount = text.split(/\s+/).filter(Boolean).length;
    }

    // Build update data — always save content if provided
    const updateData: any = {
      word_count: wordCount,
      version: { increment: 1 },
      last_modified_by: user_id,
      last_modified_at: new Date(),
    };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.doc_type !== undefined) updateData.doc_type = body.doc_type;

    const draft = await fastify.prisma.draft.update({
      where: { id },
      data: updateData,
    });

    return reply.send({ data: draft });
  });

  // DELETE /v1/drafts/:id
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id } = req.user;
    const { id } = req.params as { id: string };

    await fastify.prisma.draft.deleteMany({ where: { id, tenant_id } });
    return reply.status(204).send();
  });

  // POST /v1/drafts/:id/ai-assist — AI writing assist
  // PRD DW-04 — inline AI suggestions
  fastify.post('/:id/ai-assist', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id } = req.user;
    const { id } = req.params as { id: string };
    const { selected_text, instruction } = req.body as { selected_text: string; instruction: string };

    const draft = await fastify.prisma.draft.findFirst({
      where: { id, tenant_id },
      include: { case: { select: { title: true, case_type: true, court: true, perspective: true } } },
    });
    if (!draft) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Draft not found' } });
    }

    // Import Anthropic dynamically to avoid circular deps
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: `You are a senior Indian advocate's AI writing assistant.
Case: ${draft.case?.title} | Type: ${draft.case?.case_type} | Court: ${draft.case?.court} | Perspective: ${draft.case?.perspective}
Document: ${draft.title} (${draft.doc_type})

Respond with ONLY the improved/rewritten text. No explanation, no preamble. Maintain formal Indian legal style.
Use proper Indian legal language — "It is humbly submitted", "the Hon'ble Court", "without prejudice" etc.`,
      messages: [{
        role: 'user',
        content: `Selected text:\n"${selected_text}"\n\nInstruction: ${instruction}\n\nProvide the improved version:`,
      }],
    });

    const suggestion = response.content[0].type === 'text' ? response.content[0].text : '';
    return reply.send({ data: { suggestion, original: selected_text } });
  });
};
