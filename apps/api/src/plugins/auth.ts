import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Fix base64url to base64 before decoding
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
    const payload = Buffer.from(padded, 'base64').toString('utf8');
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
      const payload = decodeJWT(token);

      if (!payload || !payload.sub) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Invalid token format' }
        });
      }

      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Token expired' }
        });
      }

      if (payload.role !== 'authenticated') {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
        });
      }

      const dbUser = await fastify.prisma.user.findUnique({
        where: { id: payload.sub },
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
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication failed' }
      });
    }
  });

  fastify.decorate('requireRole', (allowedRoles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      if (!allowedRoles.includes(user?.role)) {
        return reply.status(403).send({
          error: { code: 'ERR_INSUFFICIENT_ROLE', message: `Requires: ${allowedRoles.join(', ')}` }
        });
      }
    };
  });
});
