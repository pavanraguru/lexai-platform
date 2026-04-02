// ============================================================
// LexAI India — Auth Plugin with Debug
// ============================================================

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createClient } from '@supabase/supabase-js';

interface LexAIUser {
  id: string;
  tenant_id: string;
  role: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: LexAIUser;
  }
}

export const authPlugin: FastifyPluginAsync = fp(async (fastify) => {

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  fastify.log.info(`Auth plugin: SUPABASE_URL=${supabaseUrl ? 'set' : 'MISSING'}, SERVICE_ROLE_KEY=${supabaseKey ? 'set (' + supabaseKey.length + ' chars)' : 'MISSING'}`);

  const supabase = createClient(supabaseUrl!, supabaseKey!);

  // Debug endpoint - remove after fixing
  fastify.get('/auth-debug', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || '';

    const result = {
      supabase_url_set: !!supabaseUrl,
      service_role_key_set: !!supabaseKey,
      service_role_key_length: supabaseKey?.length || 0,
      token_received: !!token,
      token_length: token.length,
      token_starts_with: token.substring(0, 10),
    };

    try {
      const { data, error } = await supabase.auth.getUser(token);
      return reply.send({
        ...result,
        supabase_call: error ? `ERROR: ${error.message}` : 'SUCCESS',
        user_id: data?.user?.id || null,
      });
    } catch (err: any) {
      return reply.send({ ...result, supabase_call: `EXCEPTION: ${err.message}` });
    }
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' }
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user: supaUser }, error } = await supabase.auth.getUser(token);

      if (error || !supaUser) {
        fastify.log.error(`Auth failed: ${error?.message || 'no user returned'}`);
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
        });
      }

      const dbUser = await fastify.prisma.user.findUnique({
        where: { id: supaUser.id },
        select: { id: true, tenant_id: true, role: true, email: true },
      });

      if (!dbUser) {
        return reply.status(401).send({
          error: { code: 'USER_NOT_FOUND', message: 'User not found in database' }
        });
      }

      (request as any).user = {
        id: dbUser.id,
        tenant_id: dbUser.tenant_id,
        role: dbUser.role,
        email: dbUser.email,
      };

    } catch (err: any) {
      fastify.log.error(`Auth exception: ${err.message}`);
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication failed' }
      });
    }
  });

  fastify.decorate('requireRole', (allowedRoles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user as LexAIUser;
      if (!allowedRoles.includes(user.role)) {
        return reply.status(403).send({
          error: { code: 'ERR_INSUFFICIENT_ROLE', message: `Requires: ${allowedRoles.join(', ')}` }
        });
      }
    };
  });
});
