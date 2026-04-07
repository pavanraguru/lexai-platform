// ============================================================
// LexAI India — Dashboard Stats Route
// PRD v1.1 CM-02 — Live dashboard metrics
// GET /v1/dashboard/stats
// ============================================================

import { FastifyPluginAsync } from 'fastify';

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /v1/dashboard/stats
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
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // For non-partner roles, scope to assigned cases only
    const caseFilter: any = { tenant_id };
    if (['junior_associate', 'clerk'].includes(role)) {
      caseFilter.assigned_advocates = { has: user_id };
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
      // Active cases (not closed or decided)
      fastify.prisma.case.count({
        where: { ...caseFilter, status: { notIn: ['closed', 'decided'] } },
      }),

      // Hearings this week
      fastify.prisma.hearing.count({
        where: {
          tenant_id,
          date: { gte: startOfWeek, lt: endOfWeek },
          ...(caseFilter.assigned_advocates ? {
            case: { assigned_advocates: { has: user_id } }
          } : {}),
        },
      }),

      // Today's hearings
      fastify.prisma.hearing.count({
        where: {
          tenant_id,
          date: { gte: today, lt: tomorrow },
          ...(caseFilter.assigned_advocates ? {
            case: { assigned_advocates: { has: user_id } }
          } : {}),
        },
      }),

      // Pending tasks
      fastify.prisma.task.count({
        where: {
          tenant_id,
          status: { in: ['todo', 'in_progress'] },
          ...(caseFilter.assigned_advocates ? { assigned_to: { has: user_id } } : {}),
        },
      }),

      // Overdue tasks
      fastify.prisma.task.count({
        where: {
          tenant_id,
          status: { in: ['todo', 'in_progress'] },
          due_date: { lt: today },
          ...(caseFilter.assigned_advocates ? { assigned_to: { has: user_id } } : {}),
        },
      }),

      // Agent runs this month
      fastify.prisma.agentJob.count({
        where: {
          tenant_id,
          created_at: { gte: startOfMonth, lte: endOfMonth },
          status: 'completed',
        },
      }),

      // Recent cases (last 5)
      fastify.prisma.case.findMany({
        where: { ...caseFilter, status: { notIn: ['closed'] } },
        orderBy: { updated_at: 'desc' },
        take: 5,
        select: {
          id: true, title: true, case_type: true, court: true,
          status: true, priority: true, next_hearing_date: true,
        },
      }),

      // Upcoming hearings (next 7 days)
      fastify.prisma.hearing.findMany({
        where: {
          tenant_id,
          date: { gte: today },
          outcome: null,
          ...(caseFilter.assigned_advocates ? {
            case: { assigned_advocates: { has: user_id } }
          } : {}),
        },
        orderBy: { date: 'asc' },
        take: 5,
        include: {
          case: { select: { id: true, title: true, court: true } },
        },
      }),

      // Unread notifications
      fastify.prisma.notification.count({
        where: { user_id, read: false },
      }),
    ]);

    // Subscription info for plan limits
    const subscription = await fastify.prisma.subscription.findFirst({
      where: { tenant_id },
      select: { plan: true, agent_runs_this_period: true },
    });

    return reply.send({
      data: {
        active_cases: activeCases,
        hearings_this_week: hearingsThisWeek,
        today_hearings: todayHearings,
        pending_tasks: pendingTasks,
        overdue_tasks: overdueTasks,
        agent_runs_this_month: agentRunsThisMonth,
        unread_notifications: unreadNotifications,
        plan: subscription?.plan || 'starter',
        recent_cases: recentCases,
        upcoming_hearings: upcomingHearings,
      },
    });
  });
};
