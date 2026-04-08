// ============================================================
// LexAI India — Dashboard Stats Route
// GET /v1/dashboard/stats
// ============================================================

import { FastifyPluginAsync } from 'fastify';

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try { return await fn(); } catch { return 0; }
}

async function safeFind(fn: () => Promise<any[]>): Promise<any[]> {
  try { return await fn(); } catch { return []; }
}

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.get('/stats', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id, role } = request.user;

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    const isRestricted = ['junior_associate', 'clerk'].includes(role);

    // Pre-fetch assigned case IDs for restricted roles — avoids nested relation filters
    let assignedCaseIds: string[] = [];
    if (isRestricted) {
      const userCases = await safeFind(() =>
        fastify.prisma.case.findMany({
          where: { tenant_id, assigned_advocates: { has: user_id } },
          select: { id: true },
        })
      );
      assignedCaseIds = (userCases as any[]).map((c: any) => c.id);
    }

    const caseWhere:    any = { tenant_id, status: { notIn: ['closed', 'decided'] } };
    const hearingWhere: any = { tenant_id };
    const taskWhere:    any = { tenant_id, status: { in: ['todo', 'in_progress'] } };

    if (isRestricted) {
      caseWhere.id         = { in: assignedCaseIds };
      hearingWhere.case_id = { in: assignedCaseIds };
      taskWhere.assigned_to = { has: user_id };
    }

    const [
      activeCases,
      hearingsThisWeek,
      todayHearings,
      pendingTasks,
      overdueTasks,
      agentRunsThisMonth,
      recentCases,
      upcomingHearings,
      unreadNotifications,
    ] = await Promise.all([
      safeCount(() => fastify.prisma.case.count({ where: caseWhere })),
      safeCount(() => fastify.prisma.hearing.count({
        where: { ...hearingWhere, date: { gte: startOfWeek, lt: endOfWeek } },
      })),
      safeCount(() => fastify.prisma.hearing.count({
        where: { ...hearingWhere, date: { gte: today, lt: tomorrow } },
      })),
      safeCount(() => fastify.prisma.task.count({ where: taskWhere })),
      safeCount(() => fastify.prisma.task.count({
        where: { ...taskWhere, due_date: { lt: today } },
      })),
      safeCount(() => fastify.prisma.agentJob.count({
        where: { tenant_id, created_at: { gte: startOfMonth, lte: endOfMonth }, status: 'completed' },
      })),
      safeFind(() => fastify.prisma.case.findMany({
        where: { tenant_id, status: { notIn: ['closed'] } },
        orderBy: { updated_at: 'desc' },
        take: 5,
        select: {
          id: true, title: true, case_type: true, court: true,
          status: true, priority: true, next_hearing_date: true,
        },
      })),
      safeFind(() => fastify.prisma.hearing.findMany({
        where: { ...hearingWhere, date: { gte: today }, outcome: null },
        orderBy: { date: 'asc' },
        take: 5,
        include: { case: { select: { id: true, title: true, court: true } } },
      })),
      safeCount(() => fastify.prisma.notification.count({ where: { user_id, read: false } })),
    ]);

    const subscription = await fastify.prisma.subscription.findFirst({
      where: { tenant_id },
      select: { plan: true },
    }).catch(() => null);

    return reply.send({
      data: {
        active_cases:           activeCases,
        hearings_this_week:     hearingsThisWeek,
        today_hearings:         todayHearings,
        pending_tasks:          pendingTasks,
        overdue_tasks:          overdueTasks,
        agent_runs_this_month:  agentRunsThisMonth,
        unread_notifications:   unreadNotifications,
        plan:                   subscription?.plan || 'starter',
        recent_cases:           recentCases,
        upcoming_hearings:      upcomingHearings,
      },
    });
  });
};
