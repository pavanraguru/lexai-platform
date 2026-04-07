// ============================================================
// LexAI India — Notifications Route
// ============================================================

import { FastifyPluginAsync } from 'fastify';

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /v1/notifications
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { id: user_id } = req.user;
    const notifs = await fastify.prisma.notification.findMany({
      where: { user_id },
      orderBy: { created_at: 'desc' },
      take: 30,
    });
    return reply.send({ data: notifs });
  });

  // PATCH /v1/notifications/:id/read
  fastify.patch('/:id/read', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { id: user_id } = req.user;
    const { id } = req.params as { id: string };
    await fastify.prisma.notification.updateMany({
      where: { id, user_id },
      data: { read: true },
    });
    return reply.send({ data: { ok: true } });
  });

  // PATCH /v1/notifications/read-all
  fastify.patch('/read-all', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { id: user_id } = req.user;
    await fastify.prisma.notification.updateMany({
      where: { user_id, read: false },
      data: { read: true },
    });
    return reply.send({ data: { ok: true } });
  });
};
