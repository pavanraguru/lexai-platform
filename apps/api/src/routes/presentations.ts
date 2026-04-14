// ============================================================
// LexAI India — Presentations Route
// PRD v1.1 PRES-01 to PRES-07
// GET/POST /v1/presentations
// GET/PATCH/DELETE /v1/presentations/:id
// POST /v1/presentations/:id/generate — AI deck generation
// POST /v1/presentations/:id/export  — PDF/PPTX export
// GET  /v1/presentations/share/:token — public share link
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Slide type definitions
export interface Slide {
  id: string;
  type: 'title' | 'text' | 'evidence' | 'timeline' | 'arguments' | 'qa' | 'blank' | 'section';
  title?: string;
  content?: string;
  bullets?: string[];
  notes?: string;
  doc_id?: string;
  doc_page?: number;
  exhibit_number?: string;
  background?: string;
  layout?: 'default' | 'split' | 'centered' | 'full';
}

export const presentationRoutes: FastifyPluginAsync = async (fastify) => {

  // ── GET /v1/presentations?case_id=xxx ─────────────────
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { case_id } = request.query as { case_id?: string };

    const presentations = await fastify.prisma.presentation.findMany({
      where: { tenant_id, ...(case_id ? { case_id } : {}) },
      include: {
        case: { select: { id: true, title: true, court: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return reply.send({ data: presentations });
  });

  // ── POST /v1/presentations ────────────────────────────
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id } = request.user;
    const { case_id, title } = request.body as { case_id: string; title: string };

    const caseRecord = await fastify.prisma.case.findFirst({
      where: { id: case_id, tenant_id },
    });
    if (!caseRecord) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Case not found' } });

    const defaultSlides: Slide[] = [
      {
        id: crypto.randomUUID(),
        type: 'title',
        title: title || caseRecord.title,
        content: caseRecord.court,
        layout: 'centered',
        notes: 'Opening slide — introduce the case',
      },
      {
        id: crypto.randomUUID(),
        type: 'section',
        title: 'Case Overview',
        layout: 'default',
        notes: '',
      },
      {
        id: crypto.randomUUID(),
        type: 'text',
        title: 'Key Facts',
        bullets: ['Add key fact 1', 'Add key fact 2', 'Add key fact 3'],
        layout: 'default',
        notes: '',
      },
    ];

    const presentation = await fastify.prisma.presentation.create({
      data: {
        tenant_id,
        case_id,
        title: title || `${caseRecord.title} — Presentation`,
        slides: defaultSlides as any,
        created_by: user_id,
      },
    });

    return reply.status(201).send({ data: presentation });
  });

  // ── GET /v1/presentations/:id ─────────────────────────
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };

    const presentation = await fastify.prisma.presentation.findFirst({
      where: { id, tenant_id },
      include: {
        case: {
          select: {
            id: true, title: true, court: true, cnr_number: true,
            documents: { select: { id: true, filename: true, doc_category: true, page_count: true, processing_status: true } },
            agent_jobs: { where: { status: 'completed' }, orderBy: { created_at: 'desc' }, take: 5 },
          },
        },
      },
    });

    if (!presentation) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Presentation not found' } });

    return reply.send({ data: presentation });
  });

  // ── PATCH /v1/presentations/:id ───────────────────────
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };
    const body = request.body as { title?: string; slides?: Slide[] };

    const existing = await fastify.prisma.presentation.findFirst({ where: { id, tenant_id } });
    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Presentation not found' } });

    const updated = await fastify.prisma.presentation.update({
      where: { id },
      data: {
        ...(body.title ? { title: body.title } : {}),
        ...(body.slides ? { slides: body.slides as any } : {}),
      },
    });

    return reply.send({ data: updated });
  });

  // ── DELETE /v1/presentations/:id ──────────────────────
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };

    const existing = await fastify.prisma.presentation.findFirst({ where: { id, tenant_id } });
    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Presentation not found' } });

    await fastify.prisma.presentation.delete({ where: { id } });
    return reply.send({ data: { deleted: true } });
  });

  // ── POST /v1/presentations/:id/generate ───────────────
  // AI deck generation from Strategy agent output
  fastify.post('/:id/generate', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };
    const { perspective = 'defence', focus } = request.body as { perspective?: string; focus?: string };

    const presentation = await fastify.prisma.presentation.findFirst({
      where: { id, tenant_id },
      include: {
        case: {
          include: {
            agent_jobs: { where: { status: 'completed' }, orderBy: { created_at: 'desc' } },
            documents: { where: { processing_status: 'ready' }, select: { id: true, filename: true, doc_category: true } },
          },
        },
      },
    });

    if (!presentation) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Presentation not found' } });

    const c = presentation.case as any;

    // Gather context from completed agent jobs
    const strategyJob = c.agent_jobs?.find((j: any) => j.agent_type === 'strategy');
    const evidenceJob  = c.agent_jobs?.find((j: any) => j.agent_type === 'evidence');
    const researchJob  = c.agent_jobs?.find((j: any) => j.agent_type === 'research');

    const contextParts: string[] = [
      `Case: ${c.title}`,
      `Court: ${c.court}`,
      `Perspective: ${perspective}`,
      focus ? `Focus area: ${focus}` : '',
      strategyJob?.output ? `Strategy analysis: ${JSON.stringify(strategyJob.output).slice(0, 3000)}` : '',
      evidenceJob?.output ? `Evidence summary: ${JSON.stringify(evidenceJob.output).slice(0, 2000)}` : '',
      researchJob?.output ? `Legal research: ${JSON.stringify(researchJob.output).slice(0, 2000)}` : '',
    ].filter(Boolean);

    const prompt = `You are an expert Indian court advocate preparing a presentation deck for ${c.court}.

Context:
${contextParts.join('\n')}

Generate a structured presentation deck with 10-15 slides. Return ONLY valid JSON array of slides. Each slide has:
- id: unique string
- type: one of "title" | "section" | "text" | "arguments" | "evidence" | "qa" | "blank"
- title: string
- content: optional string (for text slides)
- bullets: optional string array (for argument/text slides, max 5 items)
- notes: speaker notes string
- layout: "default" | "centered" | "split"

Slide sequence for an Indian High Court presentation:
1. Title slide (case name + court)
2. Section: "Case Background"
3. Text: Facts of the Case (5 bullet points)
4. Text: Charges / Issues for Consideration
5. Section: "Evidence"
6. Arguments slide: Key Evidence Points
7. Section: "Legal Framework"
8. Arguments: Applicable Statutes (BNS/IPC sections)
9. Arguments: Precedents in our favour
10. Section: "Our Submissions"
11. Arguments: Primary Contentions (numbered)
12. Arguments: Distinguishing Adverse Cases
13. Text: Relief Sought / Prayer
14. QA: Anticipated Bench Questions (format as bullets: "Q: ... A: ...")
15. Title: Thank You / End

Use formal Indian court language. Address as appropriate for ${c.court}.
Return ONLY the JSON array, no markdown, no explanation.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = (response.content[0] as any).text;
      // Strip markdown fences if present
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const slides: Slide[] = JSON.parse(clean);

      // Ensure all slides have IDs
      const slidesWithIds = slides.map(s => ({ ...s, id: s.id || crypto.randomUUID() }));

      const updated = await fastify.prisma.presentation.update({
        where: { id },
        data: { slides: slidesWithIds as any },
      });

      return reply.send({ data: updated, meta: { slides_generated: slidesWithIds.length } });
    } catch (err: any) {
      console.error('[Presentations] AI generation failed:', err.message);
      return reply.status(500).send({ error: { code: 'AI_FAILED', message: 'Slide generation failed. Please try again.' } });
    }
  });

  // ── POST /v1/presentations/:id/share ──────────────────
  fastify.post('/:id/share', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };
    const { expires_in_days = 7 } = request.body as { expires_in_days?: number };

    const existing = await fastify.prisma.presentation.findFirst({ where: { id, tenant_id } });
    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Presentation not found' } });

    const shareToken = crypto.randomUUID();
    const expiresAt  = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000);

    const updated = await fastify.prisma.presentation.update({
      where: { id },
      data: { is_shared: true, share_token: shareToken, share_expires_at: expiresAt },
    });

    const shareUrl = `${process.env.APP_URL || 'https://lexai-platform-web.vercel.app'}/presentations/share/${shareToken}`;
    return reply.send({ data: { share_url: shareUrl, expires_at: expiresAt, token: shareToken } });
  });

  // ── GET /v1/presentations/share/:token ────────────────
  // Public — no auth required
  fastify.get('/share/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const presentation = await fastify.prisma.presentation.findFirst({
      where: { share_token: token, is_shared: true },
      include: { case: { select: { title: true, court: true } } },
    });

    if (!presentation) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Presentation not found or link expired' } });

    if (presentation.share_expires_at && new Date() > presentation.share_expires_at) {
      return reply.status(410).send({ error: { code: 'EXPIRED', message: 'Share link has expired' } });
    }

    return reply.send({ data: presentation });
  });
};
