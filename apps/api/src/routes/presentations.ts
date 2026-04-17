// ============================================================
// LexAI India — Presentations Route
// PRD v1.1 PRES-01 to PRES-07
// POST /v1/presentations/:id/generate — AI deck generation
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface Slide {
  id: string;
  type: 'title' | 'text' | 'evidence' | 'timeline' | 'arguments' | 'qa' | 'blank' | 'section';
  title?: string;
  content?: string;
  bullets?: string[];
  notes?: string;
  doc_id?: string;
  exhibit_number?: string;
  background?: string;
  layout?: 'default' | 'split' | 'centered' | 'full';
}

// ── Deterministic fallback templates per perspective ──────────
function buildFallbackSlides(c: any, perspective: string, focus: string): Slide[] {
  const perspLabel = perspective.charAt(0).toUpperCase() + perspective.slice(1);
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const caseType = (c.case_type || '').replace(/_/g, ' ');
  const cnr = c.cnr_number ? `CNR: ${c.cnr_number}` : '';
  const judge = c.judge_name ? `Before: Hon'ble ${c.judge_name}` : '';

  // Focus-specific content
  const focusSlides: Record<string, Slide[]> = {
    bail: [
      {
        id: crypto.randomUUID(), type: 'section',
        title: 'Grounds for Bail', layout: 'default',
        notes: 'Outline the primary grounds supporting the bail application.',
      },
      {
        id: crypto.randomUUID(), type: 'arguments',
        title: 'Bail Grounds',
        bullets: [
          'Nature and gravity of the alleged offence does not warrant continued detention',
          'Accused has deep roots in the community — not a flight risk',
          'No prior criminal antecedents — first-time accused',
          'Investigation is complete; custodial interrogation no longer required',
          'Accused is willing to comply with any conditions imposed by this Hon\'ble Court',
        ],
        layout: 'default',
        notes: 'Each ground should be supported by citation and affidavit.',
      },
      {
        id: crypto.randomUUID(), type: 'arguments',
        title: 'Supporting Precedents',
        bullets: [
          'Sanjay Chandra v. CBI (2012) 1 SCC 40 — bail is the rule, jail the exception',
          'Arnesh Kumar v. State of Bihar (2014) 8 SCC 273 — unnecessary arrest deprecated',
          'State through CBI v. Amarmani Tripathi (2005) 8 SCC 21 — factors for bail',
          '[Add relevant High Court precedent here]',
        ],
        layout: 'default', notes: '',
      },
    ],
    arguments: [
      {
        id: crypto.randomUUID(), type: 'section',
        title: 'Submissions on Merits', layout: 'default', notes: '',
      },
      {
        id: crypto.randomUUID(), type: 'arguments',
        title: `Primary Contentions — ${perspLabel}`,
        bullets: [
          'Contention 1: [State your primary legal argument here]',
          'Contention 2: [Supporting statutory provision — cite section]',
          'Contention 3: [Key factual basis for contention]',
          'Contention 4: [Distinguish adverse precedents]',
          'Contention 5: [Relief prayed for flows from above]',
        ],
        layout: 'default', notes: 'Deliver each contention clearly; pause for Bench questions.',
      },
      {
        id: crypto.randomUUID(), type: 'arguments',
        title: 'Applicable Statutes',
        bullets: [
          '[Primary section of BNS/IPC/CrPC/IBC — cite in full]',
          '[Secondary provision — explain applicability]',
          '[Constitutional provision if relevant — Art. 14/19/21]',
          '[Special legislation applicable to facts]',
        ],
        layout: 'default', notes: '',
      },
    ],
    evidence: [
      {
        id: crypto.randomUUID(), type: 'section',
        title: 'Evidence Analysis', layout: 'default', notes: '',
      },
      {
        id: crypto.randomUUID(), type: 'evidence',
        title: 'Documentary Evidence',
        bullets: [
          'Exhibit A: [Document name] — establishes [what fact]',
          'Exhibit B: [Document name] — proves [what element]',
          'Exhibit C: [Document name] — corroborates [testimony/fact]',
          '[Add further exhibits from case file]',
        ],
        layout: 'default', notes: 'Ensure all exhibits are duly marked and admitted.',
      },
      {
        id: crypto.randomUUID(), type: 'arguments',
        title: 'Witness Evidence',
        bullets: [
          'PW-1 / DW-1: [Name & designation] — establishes [key fact]',
          'PW-2 / DW-2: [Name & designation] — corroborates [fact]',
          'Expert witness: [Name] — opines on [technical matter]',
          'Contradictions in opposition witnesses: [note key inconsistencies]',
        ],
        layout: 'default', notes: '',
      },
    ],
    hearing: [
      {
        id: crypto.randomUUID(), type: 'section',
        title: 'Hearing Submissions', layout: 'default', notes: '',
      },
      {
        id: crypto.randomUUID(), type: 'text',
        title: 'Status of Proceedings',
        bullets: [
          `Stage: ${focus || 'Regular Hearing'}`,
          'Previous order dated: [Insert date]',
          'Compliance status: [Complied / Partial / Pending]',
          'Next step requested: [What order you are seeking today]',
        ],
        layout: 'default', notes: '',
      },
    ],
  };

  const focusKey = focus?.toLowerCase() || 'arguments';
  const focusSpecific = focusSlides[focusKey] || focusSlides['arguments'];

  const slides: Slide[] = [
    // 1. Title
    {
      id: crypto.randomUUID(), type: 'title',
      title: c.title,
      content: [c.court, caseType, cnr, judge, today].filter(Boolean).join('  •  '),
      layout: 'centered',
      notes: `Opening slide. This is a ${perspLabel} submission.`,
    },
    // 2. Case overview section
    {
      id: crypto.randomUUID(), type: 'section',
      title: 'Case Overview', layout: 'default', notes: '',
    },
    // 3. Facts
    {
      id: crypto.randomUUID(), type: 'text',
      title: 'Facts of the Case',
      bullets: [
        `[Fact 1] — Brief the background and parties involved`,
        `[Fact 2] — Describe the incident / transaction / dispute`,
        `[Fact 3] — State when and where events occurred`,
        `[Fact 4] — Prior proceedings or orders if any`,
        `[Fact 5] — Current status that brings the matter before this Court`,
      ],
      layout: 'default',
      notes: 'State facts objectively. Refer to page numbers in the paper book.',
    },
    // 4. Issues
    {
      id: crypto.randomUUID(), type: 'arguments',
      title: 'Issues for Consideration',
      bullets: [
        'Issue I: [Primary legal question before this Court]',
        'Issue II: [Secondary or consequential legal question]',
        'Issue III: [Factual issue if disputed]',
        'Issue IV: [Relief-related issue]',
      ],
      layout: 'default',
      notes: 'Frame issues precisely — courts appreciate clarity on what they are deciding.',
    },
    // 5. Focus-specific slides
    ...focusSpecific,
    // 6. Legal framework
    {
      id: crypto.randomUUID(), type: 'section',
      title: 'Legal Framework', layout: 'default', notes: '',
    },
    {
      id: crypto.randomUUID(), type: 'arguments',
      title: 'Favourable Precedents',
      bullets: [
        '[Case Name] (Year) [SCC/SCR cite] — [Principle/Ratio]',
        '[Case Name] (Year) [SCC/SCR cite] — [How it applies]',
        '[High Court judgment] — [Local precedent if applicable]',
        '[Add further citations from legal research]',
      ],
      layout: 'default',
      notes: 'Have full copies of judgments ready for the Bench.',
    },
    // 7. Relief
    {
      id: crypto.randomUUID(), type: 'text',
      title: 'Prayer / Relief Sought',
      bullets: [
        `a) [Primary relief — be specific and precise]`,
        `b) [Alternative relief if primary is not granted]`,
        `c) Costs of this petition / application`,
        `d) Such further relief as this Hon'ble Court deems fit`,
      ],
      layout: 'default',
      notes: 'Match prayer exactly with the reliefs in your petition/application.',
    },
    // 8. Q&A prep
    {
      id: crypto.randomUUID(), type: 'qa',
      title: 'Anticipated Bench Questions',
      bullets: [
        'Q: [Most likely question from the Bench] — A: [Your prepared answer]',
        'Q: [Question on a weak point in your case] — A: [How you address it]',
        'Q: [Jurisdictional or procedural question] — A: [Response]',
        'Q: [Question distinguishing adverse precedent] — A: [Distinguish on facts]',
      ],
      layout: 'default',
      notes: 'Prepare for these before the hearing. Do not read — know these answers.',
    },
    // 9. End
    {
      id: crypto.randomUUID(), type: 'title',
      title: 'Much Obliged, My Lord',
      content: `${perspLabel} Submissions — ${c.title}`,
      layout: 'centered',
      notes: 'End of submission. Be prepared for oral arguments.',
    },
  ];

  return slides;
}

export const presentationRoutes: FastifyPluginAsync = async (fastify) => {

  // ── GET /v1/presentations?case_id=xxx ─────────────────
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { case_id } = request.query as { case_id?: string };

    const presentations = await fastify.prisma.presentation.findMany({
      where: { tenant_id, ...(case_id ? { case_id } : {}) },
      include: { case: { select: { id: true, title: true, court: true } } },
      orderBy: { created_at: 'desc' },
    });
    return reply.send({ data: presentations });
  });

  // ── POST /v1/presentations ────────────────────────────
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { tenant_id, id: user_id } = request.user;
    const { case_id, title } = request.body as { case_id: string; title: string };

    const caseRecord = await fastify.prisma.case.findFirst({ where: { id: case_id, tenant_id } });
    if (!caseRecord) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Case not found' } });

    const defaultSlides: Slide[] = [
      { id: crypto.randomUUID(), type: 'title', title: title || caseRecord.title, content: caseRecord.court, layout: 'centered', notes: 'Opening slide' },
      { id: crypto.randomUUID(), type: 'section', title: 'Case Overview', layout: 'default', notes: '' },
      { id: crypto.randomUUID(), type: 'text', title: 'Key Facts', bullets: ['Add key fact 1', 'Add key fact 2', 'Add key fact 3'], layout: 'default', notes: '' },
    ];

    const presentation = await fastify.prisma.presentation.create({
      data: { tenant_id, case_id, title: title || `${caseRecord.title} — Presentation`, slides: defaultSlides as any, created_by: user_id },
    });
    return reply.status(201).send({ data: presentation });
  });

  // ── GET /v1/presentations/:id ─────────────────────────
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };

    const presentation = await fastify.prisma.presentation.findFirst({
      where: { id, tenant_id },
      include: {
        case: {
          select: {
            id: true, title: true, court: true, cnr_number: true, case_type: true,
            judge_name: true, perspective: true, case_type: true,
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
  fastify.patch('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };
    const body = request.body as { title?: string; slides?: Slide[] };

    const existing = await fastify.prisma.presentation.findFirst({ where: { id, tenant_id } });
    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Presentation not found' } });

    const updated = await fastify.prisma.presentation.update({
      where: { id },
      data: { ...(body.title ? { title: body.title } : {}), ...(body.slides ? { slides: body.slides as any } : {}) },
    });
    return reply.send({ data: updated });
  });

  // ── DELETE /v1/presentations/:id ──────────────────────
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };

    const existing = await fastify.prisma.presentation.findFirst({ where: { id, tenant_id } });
    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Presentation not found' } });

    await fastify.prisma.presentation.delete({ where: { id } });
    return reply.send({ data: { deleted: true } });
  });

  // ── POST /v1/presentations/:id/generate ───────────────
  fastify.post('/:id/generate', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };
    const { perspective = 'defence', focus = 'arguments' } = request.body as { perspective?: string; focus?: string };

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
    const strategyJob = c.agent_jobs?.find((j: any) => j.agent_type === 'strategy');
    const evidenceJob  = c.agent_jobs?.find((j: any) => j.agent_type === 'evidence');
    const researchJob  = c.agent_jobs?.find((j: any) => j.agent_type === 'research');

    const hasAgentContext = strategyJob || evidenceJob || researchJob;

    // Build AI prompt only if we have agent context
    if (hasAgentContext) {
      const contextParts = [
        `Case: ${c.title}`,
        `Court: ${c.court}`,
        `Case Type: ${(c.case_type || '').replace(/_/g, ' ')}`,
        `Perspective: ${perspective}`,
        `Focus area: ${focus}`,
        c.judge_name ? `Judge: ${c.judge_name}` : '',
        c.cnr_number ? `CNR: ${c.cnr_number}` : '',
        strategyJob?.output ? `Strategy analysis:\n${JSON.stringify(strategyJob.output).slice(0, 2500)}` : '',
        evidenceJob?.output  ? `Evidence summary:\n${JSON.stringify(evidenceJob.output).slice(0, 2000)}`  : '',
        researchJob?.output  ? `Legal research:\n${JSON.stringify(researchJob.output).slice(0, 2000)}`    : '',
      ].filter(Boolean);

      const focusInstructions: Record<string, string> = {
        bail:      'Focus slides on bail grounds, surety details, absence of flight risk, precedents favouring bail.',
        arguments: 'Focus on legal arguments, statutory provisions, precedents, and submissions on merits.',
        evidence:  'Focus on documentary and oral evidence, exhibit list, witness testimony analysis.',
        hearing:   'Focus on current hearing stage, compliance, orders sought, and procedural status.',
      };

      const prompt = `You are an expert Indian advocate preparing a court presentation deck.

${contextParts.join('\n')}

${focusInstructions[focus] || focusInstructions['arguments']}

Generate a structured 10-14 slide presentation deck. Return ONLY a valid JSON array. Each slide object:
{
  "id": "unique-string",
  "type": "title"|"section"|"text"|"arguments"|"evidence"|"qa"|"blank",
  "title": "Slide title",
  "content": "optional paragraph text",
  "bullets": ["bullet 1", "bullet 2"],  // max 5 bullets
  "notes": "Speaker notes",
  "layout": "default"|"centered"|"split"
}

Use formal Indian court language. Use placeholders like [Insert date] for specific facts the lawyer must fill. Include a Q&A prep slide with anticipated bench questions.
Return ONLY the JSON array. No markdown. No explanation.`;

      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        });

        const text = (response.content[0] as any).text;
        const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const aiSlides: Slide[] = JSON.parse(clean);
        const slidesWithIds = aiSlides.map(s => ({ ...s, id: s.id || crypto.randomUUID() }));

        const updated = await fastify.prisma.presentation.update({
          where: { id },
          data: { slides: slidesWithIds as any },
        });
        return reply.send({ data: updated, meta: { slides_generated: slidesWithIds.length, source: 'ai' } });
      } catch (err: any) {
        console.error('[Presentations] AI generation failed, using template:', err.message);
        // Fall through to template
      }
    }

    // ── Fallback: deterministic template (always works) ──
    const templateSlides = buildFallbackSlides(c, perspective, focus);
    const updated = await fastify.prisma.presentation.update({
      where: { id },
      data: { slides: templateSlides as any },
    });

    return reply.send({
      data: updated,
      meta: {
        slides_generated: templateSlides.length,
        source: 'template',
        message: hasAgentContext ? 'AI generation failed — template used' : 'Template generated. Run AI agents for richer content.',
      },
    });
  });

  // ── POST /v1/presentations/:id/share ──────────────────
  fastify.post('/:id/share', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
