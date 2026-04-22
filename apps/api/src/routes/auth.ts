// ============================================================
// LexAI India — Auth Routes
// POST /v1/auth/login     — email + password → LexAI JWT
// POST /v1/auth/token     — supabase_token   → LexAI JWT
// GET  /v1/auth/me        — return current user
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { createClient } from '@supabase/supabase-js';

export const authRoutes: FastifyPluginAsync = async (fastify) => {

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Helper: look up user and issue LexAI JWT
  async function issueToken(userId: string, reply: any) {
    const dbUser = await fastify.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: { select: { id: true, name: true, plan: true, slug: true, active: true } }
      }
    });

    if (!dbUser) {
      return reply.status(401).send({ error: { code: 'USER_NOT_FOUND', message: 'User not found.' } });
    }
    if (!dbUser.is_active) {
      return reply.status(401).send({ error: { code: 'USER_INACTIVE', message: 'Account deactivated.' } });
    }

    // Auto-upgrade to super_admin if this is the ADMIN_EMAIL account
    const adminEmail = process.env.ADMIN_EMAIL || '';
    if (adminEmail && dbUser.email && dbUser.email.toLowerCase() === adminEmail.toLowerCase() && dbUser.role !== 'super_admin') {
      await fastify.prisma.user.update({ where: { id: dbUser.id }, data: { role: 'super_admin' } });
      dbUser.role = 'super_admin' as any;
      fastify.log.info(`[Auth] Auto-upgraded ${dbUser.email} to super_admin`);
      // Also ensure Pro subscription
      const existingSub = await fastify.prisma.subscription.findFirst({ where: { tenant_id: dbUser.tenant_id } });
      if (existingSub && existingSub.status !== 'active') {
        await fastify.prisma.subscription.update({
          where: { tenant_id: dbUser.tenant_id },
          data: { status: 'active', plan: 'professional', current_period_end: new Date('2099-12-31'), agent_runs_this_period: 0 },
        }).catch(() => {});
        await fastify.prisma.tenant.update({ where: { id: dbUser.tenant_id }, data: { plan: 'professional' } }).catch(() => {});
      }
    }

    // Fetch subscription status
    const sub = await fastify.prisma.subscription.findFirst({
      where: { tenant_id: dbUser.tenant_id },
      select: { status: true, trial_ends_at: true, plan: true },
    }).catch(() => null);

    const now = new Date();
    const trialEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null;
    const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000)) : 0;
    // super_admin is always Pro regardless of subscription
    const isPro = dbUser.role === 'super_admin' || sub?.status === 'active';

    const lexaiToken = fastify.jwt.sign({
      id: dbUser.id,
      tenant_id: dbUser.tenant_id,
      role: dbUser.role,
      email: dbUser.email,
    }, { expiresIn: '30d' });

    await fastify.prisma.user.update({
      where: { id: dbUser.id },
      data: { last_seen_at: new Date() }
    });

    const payload = {
      access_token: lexaiToken,
      token: lexaiToken,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        full_name: dbUser.full_name,
        role: dbUser.role,
        bar_enrollment_no: dbUser.bar_enrollment_no,
        avatar_url: dbUser.avatar_url,
        tenant_id: dbUser.tenant_id,
        tenant_name: dbUser.tenant?.name,
        tenant_plan: dbUser.tenant?.plan,
        tenant_slug: dbUser.tenant?.slug,
        is_pro: isPro,
        trial_days_left: trialDaysLeft,
        trial_ends_at: sub?.trial_ends_at || null,
        subscription_status: sub?.status || 'no_subscription',
      }
    };

    return reply.send({ data: payload });
  }

  // POST /v1/auth/login — direct email + password (uses Supabase internally)
  // Used by QA agent and any direct API clients
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as { email?: string; password?: string };

    if (!email || !password) {
      return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'email and password are required' } });
    }

    // Authenticate via Supabase
    const sbClient = createClient(
      process.env.SUPABASE_URL!,
      (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
    );

    const { data, error } = await sbClient.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return reply.status(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    return issueToken(data.user.id, reply);
  });

  // POST /v1/auth/token — exchange Supabase JWT for LexAI JWT (existing flow)
  fastify.post('/token', async (request, reply) => {
    const { supabase_token } = request.body as { supabase_token?: string };

    if (!supabase_token) {
      return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'supabase_token is required' } });
    }

    const { data: { user: supaUser }, error } = await supabase.auth.getUser(supabase_token);

    if (error || !supaUser) {
      return reply.status(401).send({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired Supabase token' } });
    }

    return issueToken(supaUser.id, reply);
  });

  // GET /v1/auth/me
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id: user_id } = request.user as any;
    const dbUser = await fastify.prisma.user.findUnique({
      where: { id: user_id },
      include: { tenant: { select: { id: true, name: true, plan: true, slug: true } } }
    });
    if (!dbUser) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    return reply.send({ data: dbUser });
  });
};
