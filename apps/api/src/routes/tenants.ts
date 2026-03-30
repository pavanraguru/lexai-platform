import { FastifyPluginAsync } from 'fastify';
export const tenantRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { tenant_id } = (req as any).user;
    const tenant = await fastify.prisma.tenant.findUnique({ where: { id: tenant_id } });
    return reply.send({ data: tenant });
  });
};
