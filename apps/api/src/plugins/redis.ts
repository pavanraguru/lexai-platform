import { FastifyPluginAsync } from 'fastify';
import { Redis } from 'ioredis';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

export const redisPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  redis.on('error', (err: Error) => {
    fastify.log.error({ err }, 'Redis error');
  });
  redis.on('connect', () => fastify.log.info('✅ Redis connected'));

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    await redis.quit();
  });
});
