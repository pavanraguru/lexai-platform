import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin: FastifyPluginAsync = fp(async (fastify) => {
  // Build DATABASE_URL with connection pooling params for Supabase PgBouncer.
  // connection_limit=1 is critical — Railway runs in a single process and
  // Supabase free/pro tiers have strict connection limits.
  const rawUrl = process.env.DATABASE_URL || '';
  const dbUrl = rawUrl.includes('connection_limit')
    ? rawUrl
    : rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'connection_limit=3&pool_timeout=20&pgbouncer=true';

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: { db: { url: dbUrl } },
  });

  await prisma.$connect();

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async (app) => {
    await app.prisma.$disconnect();
  });

  fastify.log.info('✅ Prisma connected to PostgreSQL');
});
