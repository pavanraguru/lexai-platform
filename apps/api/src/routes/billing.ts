import { FastifyPluginAsync } from 'fastify';
export const billingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/subscription', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { tenant_id } = (req as any).user;
    const sub = await fastify.prisma.subscription.findFirst({ where: { tenant_id } });
    return reply.send({ data: sub });
  });
};
