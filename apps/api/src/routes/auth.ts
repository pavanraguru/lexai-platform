import { FastifyPluginAsync } from 'fastify';
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/token', async (request, reply) => {
    return reply.send({ data: { message: 'Auth — Phase 1 implementation. Use Supabase Auth SDK directly.' } });
  });
};
