import { FastifyPluginAsync } from 'fastify';
export const taskRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { tenant_id } = (req as any).user;
    const tasks = await fastify.prisma.task.findMany({ where: { tenant_id }, orderBy: { due_date: 'asc' }, take: 50 });
    return reply.send({ data: tasks });
  });
};
