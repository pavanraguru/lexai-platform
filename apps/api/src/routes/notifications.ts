import { FastifyPluginAsync } from 'fastify';
export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { id: user_id } = (req as any).user;
    const notifs = await fastify.prisma.notification.findMany({ where: { user_id, read: false }, orderBy: { created_at: 'desc' }, take: 20 });
    return reply.send({ data: notifs });
  });
};
