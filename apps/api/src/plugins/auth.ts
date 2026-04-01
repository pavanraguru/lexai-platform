// ============================================================
// LexAI India — Auth Plugin (Fixed for Supabase JWT)
// Verifies Supabase JWT and looks up user from database
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

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: LexAIUser;
    user: LexAIUser;
  }
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

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' }
        });
      }

      const token = authHeader.replace('Bearer ', '');

      // Verify the Supabase JWT
      const { data: { user: supaUser }, error } = await supabase.auth.getUser(token);

      if (error || !supaUser) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
        });
      }

      // Look up user in our database
      const dbUser = await fastify.prisma.user.findUnique({
        where: { id: supaUser.id },
        select: { id: true, tenant_id: true, role: true, email: true },
      });

      if (!dbUser) {
        return reply.status(401).send({
          error: { code: 'USER_NOT_FOUND', message: 'User not found in database. Please contact your administrator.' }
        });
      }

      // Set user on request
      (request as any).user = {
        id: dbUser.id,
        tenant_id: dbUser.tenant_id,
        role: dbUser.role,
        email: dbUser.email,
      };

    } catch (err) {
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
          error: {
            code: 'ERR_INSUFFICIENT_ROLE',
            message: `This action requires one of: ${allowedRoles.join(', ')}`
          }
        });
      }
    };
  });
});
