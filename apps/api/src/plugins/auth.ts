// ============================================================
// LexAI India — Auth Plugin (Fixed)
// ============================================================

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

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
}

export const authPlugin: FastifyPluginAsync = fp(async (fastify) => {

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const payload = request.user as LexAIUser;
      if (!payload.tenant_id || !payload.role) {
        return reply.status(401).send({
          error: { code: 'INVALID_TOKEN', message: 'Token missing required claims' }
        });
      }
    } catch (err) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
      });
    }
  });

  fastify.decorate('requireRole', (allowedRoles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as LexAIUser;
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
