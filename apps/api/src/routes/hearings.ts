// ============================================================
// LexAI India — Hearings Route + Calendar
// PRD v1.1 Section 7.4 — CAL-01 to CAL-08
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const CreateHearingSchema = z.object({
  case_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  court_room: z.string().optional().nullable(),
  judge_name: z.string().optional().nullable(),
  purpose: z.enum([
    'framing_of_charges','bail','arguments','judgment','evidence',
    'examination','cross_examination','interim_order','return_of_summons','misc'
  ]),
  client_instruction: z.string().optional().nullable(),
});

const UpdateOutcomeSchema = z.object({
  outcome: z.string(),
  order_summary: z.string().optional(),
  next_hearing_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const hearingRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /v1/hearings/case/:case_id
  fastify.get('/case/:case_id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { case_id } = request.params as { case_id: string };

    const hearings = await fastify.prisma.hearing.findMany({
      where: { case_id, tenant_id },
      orderBy: { date: 'asc' },
    });

    return reply.send({ data: hearings });
  });

  // POST /v1/hearings
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id } = request.user;
    const body = CreateHearingSchema.parse(request.body);

    // Verify case
    const caseRecord = await fastify.prisma.case.findFirst({
      where: { id: body.case_id, tenant_id },
    });
    if (!caseRecord) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Case not found' } });
    }

    const hearing = await fastify.prisma.hearing.create({
      data: {
        tenant_id,
        case_id: body.case_id,
        date: new Date(body.date),
        time: body.time || null,
        court_room: body.court_room || null,
        judge_name: body.judge_name || null,
        purpose: body.purpose as any,
        client_instruction: body.client_instruction || null,
        created_by: user_id,
      },
    });

    // Update case.next_hearing_date if this is the nearest upcoming hearing
    const today = new Date();
    if (new Date(body.date) >= today) {
      const existingNext = caseRecord.next_hearing_date;
      if (!existingNext || new Date(body.date) < new Date(existingNext)) {
        await fastify.prisma.case.update({
          where: { id: body.case_id },
          data: { next_hearing_date: new Date(body.date) },
        });
      }
    }

    return reply.status(201).send({ data: hearing });
  });

  // PATCH /v1/hearings/:id/outcome — record what happened
  fastify.patch('/:id/outcome', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };
    const body = UpdateOutcomeSchema.parse(request.body);

    const hearing = await fastify.prisma.hearing.findFirst({
      where: { id, tenant_id },
      include: { case: { select: { assigned_advocates: true, title: true, client_id: true } } },
    });
    if (!hearing) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Hearing not found' } });
    }

    const updated = await fastify.prisma.hearing.update({
      where: { id },
      data: {
        outcome: body.outcome,
        order_summary: body.order_summary || null,
      },
    });

    // If next hearing date provided, create new hearing record
    if (body.next_hearing_date) {
      await fastify.prisma.hearing.create({
        data: {
          tenant_id,
          case_id: hearing.case_id,
          date: new Date(body.next_hearing_date),
          purpose: 'misc',
          created_by: hearing.created_by,
        },
      });

      // Update case next_hearing_date
      await fastify.prisma.case.update({
        where: { id: hearing.case_id },
        data: { next_hearing_date: new Date(body.next_hearing_date) },
      });
    }

    // TODO Phase 2c: Trigger CN-02 — send outcome notification to client

    return reply.send({ data: updated });
  });
};

// ── Calendar Routes ────────────────────────────────────────────
export const calendarRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /v1/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id, role } = request.user;
    const { from, to, view = 'all' } = request.query as { from?: string; to?: string; view?: string };

    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Build hearing query
    const hearingWhere: any = {
      tenant_id,
      date: { gte: fromDate, lte: toDate },
    };

    // If personal view, filter by assigned cases
    if (view === 'personal' || ['junior_associate', 'clerk'].includes(role)) {
      const userCases = await fastify.prisma.case.findMany({
        where: { tenant_id, assigned_advocates: { has: user_id } },
        select: { id: true },
      });
      hearingWhere.case_id = { in: userCases.map(c => c.id) };
    }

    const [hearings, tasks] = await Promise.all([
      fastify.prisma.hearing.findMany({
        where: hearingWhere,
        include: { case: { select: { id: true, title: true, court: true, cnr_number: true } } },
        orderBy: { date: 'asc' },
      }),
      fastify.prisma.task.findMany({
        where: {
          tenant_id,
          due_date: { gte: fromDate, lte: toDate },
          status: { not: 'cancelled' },
        },
        include: { case: { select: { id: true, title: true } } },
        orderBy: { due_date: 'asc' },
      }),
    ]);

    return reply.send({
      data: {
        hearings,
        tasks,
        period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      }
    });
  });

  // GET /v1/calendar/today-briefing
  // PRD CAL-07 — Day-of briefing notification
  fastify.get('/today-briefing', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id } = request.user;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const userCases = await fastify.prisma.case.findMany({
      where: { tenant_id, assigned_advocates: { has: user_id } },
      select: { id: true },
    });

    const todayHearings = await fastify.prisma.hearing.findMany({
      where: {
        case_id: { in: userCases.map(c => c.id) },
        date: { gte: today, lt: tomorrow },
      },
      include: {
        case: {
          select: {
            id: true, title: true, court: true, cnr_number: true,
            metadata: true,
          },
        },
      },
      orderBy: { time: 'asc' },
    });

    // Get open tasks for each today's hearing
    const hearingWithTasks = await Promise.all(
      todayHearings.map(async (h) => {
        const openTasks = await fastify.prisma.task.count({
          where: {
            case_id: h.case_id,
            status: { in: ['todo', 'in_progress'] },
          },
        });
        return { ...h, open_tasks_count: openTasks };
      })
    );

    return reply.send({
      data: {
        date: today.toISOString().split('T')[0],
        hearings_today: hearingWithTasks.length,
        hearings: hearingWithTasks,
        generated_at: new Date().toISOString(),
      }
    });
  });
};
