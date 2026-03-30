import { FastifyPluginAsync } from 'fastify';
export const draftRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/case/:case_id', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { tenant_id } = (req as any).user;
    const { case_id } = req.params as any;
    const drafts = await fastify.prisma.draft.findMany({ where: { tenant_id, case_id }, orderBy: { last_modified_at: 'desc' } });
    return reply.send({ data: drafts });
  });
};
