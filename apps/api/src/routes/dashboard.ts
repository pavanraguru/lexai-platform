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

// GET /v1/dashboard/analytics — Practice Insights aggregated data
async function getAnalytics(fastify: any, tenant_id: string) {
  const [cases, hearings, invoices] = await Promise.all([
    fastify.prisma.case.findMany({
      where: { tenant_id },
      select: { id: true, case_type: true, status: true, created_at: true },
    }),
    fastify.prisma.hearing.findMany({
      where: { case: { tenant_id } },
      select: { id: true, date: true, outcome: true, case_id: true },
    }),
    fastify.prisma.invoice.findMany({
      where: { tenant_id },
      select: { id: true, total_paise: true, status: true, invoice_date: true },
    }).catch(() => []),
  ]);

  const now = new Date();

  // Case outcomes — derive from hearing outcomes + case status
  let won = 0, settled = 0, lostOrPending = 0;
  for (const c of (cases as any[])) {
    const caseHearings = (hearings as any[]).filter((h: any) => h.case_id === c.id && h.outcome);
    const outcomeTexts = caseHearings.map((h: any) => (h.outcome || '').toLowerCase());
    const isDecided = c.status === 'decided' || c.status === 'closed';
    if (isDecided && outcomeTexts.some((o: string) => o.includes('allow') || o.includes('grant') || o.includes('acquit') || o.includes('favour') || o.includes('disposed') || o.includes('decree'))) {
      won++;
    } else if (outcomeTexts.some((o: string) => o.includes('settl') || o.includes('compro') || o.includes('consent'))) {
      settled++;
    } else if (isDecided) {
      lostOrPending++;
    } else {
      lostOrPending++;
    }
  }

  const winRate = won + settled + lostOrPending > 0
    ? Math.round((won / Math.max(won + settled + lostOrPending, 1)) * 100)
    : 0;

  // Matter volume — last 6 months
  const volumeByMonth: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    volumeByMonth[key] = 0;
  }
  for (const c of cases) {
    const d = new Date(c.created_at);
    const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    if (key in volumeByMonth) volumeByMonth[key]++;
  }

  // Practice areas breakdown
  const byType: Record<string, number> = {};
  for (const c of cases) {
    const t = c.case_type || 'other';
    byType[t] = (byType[t] || 0) + 1;
  }
  const total = cases.length || 1;
  const practiceAreas = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([type, count]) => ({
      type, count,
      pct: Math.round((count / total) * 100),
      label: type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    }));

  // Revenue
  const totalRevPaise = (invoices as any[])
    .filter((inv: any) => inv.status === 'paid')
    .reduce((s: number, inv: any) => s + Number(inv.total_paise || 0), 0);

  return {
    win_rate: winRate,
    active_matters: cases.filter((c: any) => !['closed', 'decided'].includes(c.status)).length,
    total_cases: cases.length,
    outcomes: { won, settled, lost_pending: lostOrPending },
    volume_by_month: Object.entries(volumeByMonth).map(([month, count]) => ({ month, count })),
    practice_areas: practiceAreas,
    total_revenue_paise: totalRevPaise,
    avg_revenue_per_matter_paise: cases.length > 0 ? Math.round(totalRevPaise / cases.length) : 0,
  };
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

  // GET /v1/dashboard/analytics — Practice Insights
  fastify.get('/analytics', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    try {
      const data = await getAnalytics(fastify, tenant_id);
      return reply.send({ data });
    } catch (err: any) {
      fastify.log.error('[Analytics] ' + err.message);
      return reply.status(500).send({ error: { code: 'ANALYTICS_ERROR', message: err.message } });
    }
  });
};
