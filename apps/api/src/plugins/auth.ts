// ============================================================
// LexAI India — Auth Plugin
// Validates JWT, extracts tenant_id, sets RLS context
// PRD v1.1 Section 6 — Authentication
// ============================================================

import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      tenant_id: string;
      role: string;
      email: string;
    };
  }
}

export const authPlugin: FastifyPluginAsync = fp(async (fastify) => {

  // Decorator: require valid JWT on any route that uses preHandler: [fastify.authenticate]
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: any) => {
    try {
      await request.jwtVerify();
      const payload = request.user as any;

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

  // Decorator: require specific roles
  fastify.decorate('requireRole', (allowedRoles: string[]) => {
    return async (request: FastifyRequest, reply: any) => {
      const { role } = request.user;
      if (!allowedRoles.includes(role)) {
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
