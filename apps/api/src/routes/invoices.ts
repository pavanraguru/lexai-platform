import { FastifyPluginAsync } from 'fastify';
export const invoiceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { tenant_id } = (req as any).user;
    const invoices = await fastify.prisma.invoice.findMany({ where: { tenant_id }, orderBy: { created_at: 'desc' }, take: 50 });
    return reply.send({ data: invoices });
  });
};
