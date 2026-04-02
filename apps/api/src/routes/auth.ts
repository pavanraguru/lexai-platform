// ============================================================
// LexAI India — Auth Routes
// PRD v1.1 Section 6 — Authentication
// Flow: Supabase token → verify → lookup user → issue LexAI JWT
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { createClient } from '@supabase/supabase-js';

export const authRoutes: FastifyPluginAsync = async (fastify) => {

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // POST /v1/auth/token
  // Exchanges a Supabase JWT for a LexAI signed JWT
  fastify.post('/token', async (request, reply) => {
    const { supabase_token } = request.body as { supabase_token: string };

    if (!supabase_token) {
      return reply.status(400).send({
        error: { code: 'MISSING_TOKEN', message: 'supabase_token is required' }
      });
    }

    // Step 1: Verify the Supabase token
    const { data: { user: supaUser }, error } = await supabase.auth.getUser(supabase_token);

    if (error || !supaUser) {
      return reply.status(401).send({
        error: { code: 'INVALID_SUPABASE_TOKEN', message: 'Invalid or expired Supabase token' }
      });
    }

    // Step 2: Look up user in our database
    const dbUser = await fastify.prisma.user.findUnique({
      where: { id: supaUser.id },
      include: {
        tenant: {
          select: { id: true, name: true, plan: true, slug: true, active: true }
        }
      }
    });

    if (!dbUser) {
      return reply.status(401).send({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found. Please contact your administrator.'
        }
      });
    }

    if (!dbUser.is_active) {
      return reply.status(401).send({
        error: { code: 'USER_INACTIVE', message: 'Your account has been deactivated.' }
      });
    }

    // Step 3: Issue our own signed JWT with tenant_id and role embedded
    const lexaiToken = fastify.jwt.sign({
      id: dbUser.id,
      tenant_id: dbUser.tenant_id,
      role: dbUser.role,
      email: dbUser.email,
    });

    // Step 4: Update last_seen_at
    await fastify.prisma.user.update({
      where: { id: dbUser.id },
      data: { last_seen_at: new Date() }
    });

    return reply.send({
      data: {
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
        }
      }
    });
  });

  // GET /v1/auth/me
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id: user_id } = request.user as any;
    const dbUser = await fastify.prisma.user.findUnique({
      where: { id: user_id },
      include: {
        tenant: { select: { id: true, name: true, plan: true, slug: true } }
      }
    });
    if (!dbUser) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    return reply.send({ data: dbUser });
  });
};
