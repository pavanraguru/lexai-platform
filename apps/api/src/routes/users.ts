import { FastifyPluginAsync } from 'fastify';
export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { tenant_id } = (req as any).user;
    const users = await fastify.prisma.user.findMany({ where: { tenant_id, is_active: true } });
    return reply.send({ data: users });
  });
};
