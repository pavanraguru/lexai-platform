import { FastifyPluginAsync } from 'fastify';

export const userRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /v1/users/me — returns current user profile + tenant
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id: user_id, tenant_id } = (request as any).user;

    const user = await fastify.prisma.user.findUnique({
      where: { id: user_id },
      include: {
        tenant: {
          select: { id: true, name: true, plan: true, slug: true },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    return reply.send({ data: user });
  });

  // GET /v1/users — list all users in tenant
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = (request as any).user;
    const users = await fastify.prisma.user.findMany({
      where: { tenant_id, is_active: true },
      select: {
        id: true, email: true, full_name: true,
        role: true, bar_enrollment_no: true, avatar_url: true,
      },
    });
    return reply.send({ data: users });
  });
};
