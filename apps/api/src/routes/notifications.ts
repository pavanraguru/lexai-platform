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
    // Deduplicate by id in case of any DB anomalies
    const seen = new Set<string>();
    const unique = notifs.filter((n: any) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
    return reply.send({ data: unique });
  });

  // PATCH /v1/notifications/mark-all-read
  // IMPORTANT: must be registered BEFORE /:id/read to avoid route conflict
  fastify.patch('/mark-all-read', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { id: user_id } = req.user;
    await fastify.prisma.notification.updateMany({
      where: { user_id, read: false },
      data: { read: true },
    });
    return reply.code(200).header('Content-Type', 'application/json').send({ data: { ok: true } });
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
    return reply.code(200).send({ data: { ok: true } });
  });
};
