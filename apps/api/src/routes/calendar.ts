// ============================================================
// LexAI India — Calendar Routes
// PRD v1.1 Section 7.4 — CAL-01 to CAL-08
// GET /v1/calendar
// GET /v1/calendar/today-briefing
// ============================================================

import { FastifyPluginAsync } from 'fastify';

export const calendarRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /v1/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id, role } = request.user;
    const { from, to, view = 'all' } = request.query as { from?: string; to?: string; view?: string };

    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const hearingWhere: any = {
      tenant_id,
      date: { gte: fromDate, lte: toDate },
    };

    if (view === 'personal' || ['junior_associate', 'clerk'].includes(role)) {
      const userCases = await fastify.prisma.case.findMany({
        where: { tenant_id, assigned_advocates: { has: user_id } },
        select: { id: true },
      });
      hearingWhere.case_id = { in: userCases.map((c: any) => c.id) };
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
      },
    });
  });

  // GET /v1/calendar/today-briefing
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
        case_id: { in: userCases.map((c: any) => c.id) },
        date: { gte: today, lt: tomorrow },
      },
      include: {
        case: { select: { id: true, title: true, court: true, cnr_number: true, metadata: true } },
      },
      orderBy: { time: 'asc' },
    });

    return reply.send({
      data: {
        date: today.toISOString().split('T')[0],
        hearings_today: todayHearings.length,
        hearings: todayHearings,
        generated_at: new Date().toISOString(),
      },
    });
  });
};
