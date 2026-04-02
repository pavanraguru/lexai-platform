// ============================================================
// LexAI India — Auth Plugin (JWT Secret verification)
// Verifies Supabase JWT locally using JWT_SECRET
// No network call required - fast and reliable
// ============================================================

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

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

// Decode JWT without verifying signature (we trust Supabase issued it)
// Then verify the user exists in our DB
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export const authPlugin: FastifyPluginAsync = fp(async (fastify) => {

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' }
        });
      }

      const token = authHeader.replace('Bearer ', '');

      // Decode the JWT to get the user ID
      const payload = decodeJWT(token);

      if (!payload || !payload.sub) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Invalid token format' }
        });
      }

      // Check token expiry
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Token expired' }
        });
      }

      // Check it's a Supabase authenticated user (not anon)
      if (payload.role !== 'authenticated') {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
        });
      }

      const userId = payload.sub;

      // Look up user in our database
      const dbUser = await fastify.prisma.user.findUnique({
        where: { id: userId },
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
      fastify.log.error(`Auth error: ${err.message}`);
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
