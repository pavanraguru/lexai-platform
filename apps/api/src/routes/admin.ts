// ============================================================
// LexAI India — Admin Panel Routes
// GET /v1/admin/stats   — platform-wide stats
// GET /v1/admin/tenants — tenant list with usage
// PATCH /v1/admin/tenants/:id — update tenant plan/status
// All routes: managing_partner role only
// PRD ADMIN-01 to ADMIN-05
// ============================================================

import { FastifyPluginAsync } from 'fastify';

// Role guard — managing_partner only
async function requireAdmin(req: any, reply: any) {
  if (req.user?.role !== 'managing_partner') {
    return reply.status(403).send({
      error: { code: 'FORBIDDEN', message: 'Admin panel requires Managing Partner role' },
    });
  }
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export const adminRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /v1/admin/stats — platform-wide summary
  fastify.get('/stats', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (req, reply) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalTenants,
      activeTenants,
      totalUsers,
      activeUsers,
      totalCases,
      activeCases,
      totalDocuments,
      totalAgentRuns,
      agentRunsThisMonth,
      totalDrafts,
      totalHearings,
    ] = await Promise.all([
      safe(() => fastify.prisma.tenant.count(), 0),
      safe(() => fastify.prisma.tenant.count({ where: { active: true } }), 0),
      safe(() => fastify.prisma.user.count(), 0),
      safe(() => fastify.prisma.user.count({ where: { is_active: true } }), 0),
      safe(() => fastify.prisma.case.count(), 0),
      safe(() => fastify.prisma.case.count({ where: { status: { notIn: ['closed', 'decided'] } } }), 0),
      safe(() => fastify.prisma.document.count(), 0),
      safe(() => fastify.prisma.agentJob.count({ where: { status: 'completed' } }), 0),
      safe(() => fastify.prisma.agentJob.count({
        where: { status: 'completed', created_at: { gte: startOfMonth } },
      }), 0),
      safe(() => fastify.prisma.draft.count(), 0),
      safe(() => fastify.prisma.hearing.count(), 0),
    ]);

    // Plan distribution
    const planBreakdown = await safe(() =>
      fastify.prisma.tenant.groupBy({
        by: ['plan'],
        _count: { plan: true },
        where: { active: true },
      }), []
    );

    return reply.send({
      data: {
        tenants:             { total: totalTenants, active: activeTenants, inactive: totalTenants - activeTenants },
        users:               { total: totalUsers, active: activeUsers },
        cases:               { total: totalCases, active: activeCases },
        documents:           { total: totalDocuments },
        agent_runs:          { total: totalAgentRuns, this_month: agentRunsThisMonth },
        drafts:              { total: totalDrafts },
        hearings:            { total: totalHearings },
        plan_breakdown:      planBreakdown.reduce((acc: any, row: any) => {
          acc[row.plan] = row._count.plan;
          return acc;
        }, {}),
        generated_at:        now.toISOString(),
      },
    });
  });

  // GET /v1/admin/tenants — paginated tenant list with usage
  fastify.get('/tenants', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (req, reply) => {
    const { page = '1', limit = '20', search } = req.query as {
      page?: string; limit?: string; search?: string;
    };

    const take = Math.min(parseInt(limit) || 20, 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

    const where: any = {};
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { slug: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      fastify.prisma.tenant.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: {
              users:     true,
              cases:     true,
              documents: true,
              agent_jobs: true,
            },
          },
          subscriptions: {
            take: 1,
            orderBy: { created_at: 'desc' },
            select: {
              plan:               true,
              status:             true,
              trial_ends_at:      true,
              current_period_end: true,
              agent_runs_this_period: true,
              storage_bytes_used: true,
            },
          },
        },
      }),
      fastify.prisma.tenant.count({ where }),
    ]);

    // Flatten subscription into each tenant
    const result = tenants.map((t: any) => {
      const sub = t.subscriptions?.[0] || null;
      const { subscriptions, ...rest } = t;
      return {
        ...rest,
        subscription: sub,
      };
    });

    return reply.send({
      data: result,
      meta: {
        total,
        page:  parseInt(page) || 1,
        limit: take,
        pages: Math.ceil(total / take),
      },
    });
  });

  // GET /v1/admin/tenants/:id — single tenant detail with users
  fastify.get('/tenants/:id', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const tenant = await fastify.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true, email: true, full_name: true, role: true,
            is_active: true, last_seen_at: true, created_at: true,
          },
          orderBy: { created_at: 'asc' },
        },
        subscriptions: {
          take: 1,
          orderBy: { created_at: 'desc' },
        },
        _count: {
          select: { cases: true, documents: true, agent_jobs: true, drafts: true },
        },
      },
    });

    if (!tenant) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Tenant not found' } });
    }

    return reply.send({ data: tenant });
  });

  // PATCH /v1/admin/tenants/:id — update plan or active status
  fastify.patch('/tenants/:id', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { active, plan } = req.body as { active?: boolean; plan?: string };

    const validPlans = ['starter', 'professional', 'enterprise'];
    if (plan && !validPlans.includes(plan)) {
      return reply.status(400).send({
        error: { code: 'INVALID_PLAN', message: `Plan must be one of: ${validPlans.join(', ')}` },
      });
    }

    const existing = await fastify.prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Tenant not found' } });
    }

    const updated = await fastify.prisma.tenant.update({
      where: { id },
      data: {
        ...(active !== undefined && { active }),
        ...(plan && { plan: plan as any }),
      },
    });

    // Also update subscription plan if plan changed
    if (plan) {
      await fastify.prisma.subscription.updateMany({
        where: { tenant_id: id },
        data:  { plan: plan as any },
      }).catch(() => {}); // subscription may not exist yet
    }

    return reply.send({ data: updated });
  });
};
