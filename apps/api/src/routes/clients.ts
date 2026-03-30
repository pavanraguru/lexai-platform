import { FastifyPluginAsync } from 'fastify';
export const clientRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { tenant_id } = (req as any).user;
    const clients = await fastify.prisma.client.findMany({ where: { tenant_id }, orderBy: { full_name: 'asc' } });
    return reply.send({ data: clients });
  });
};
