// ============================================================
// LexAI India — Fastify API Server
// PRD v1.1 Section 10 — API Design Conventions
// ============================================================

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';

// Route imports
import { authRoutes } from './routes/auth.js';
import { tenantRoutes } from './routes/tenants.js';
import { userRoutes } from './routes/users.js';
import { caseRoutes } from './routes/cases.js';
import { documentRoutes } from './routes/documents.js';
import { hearingRoutes } from './routes/hearings.js';
import { taskRoutes } from './routes/tasks.js';
import { agentRoutes } from './routes/agents.js';
import { draftRoutes } from './routes/drafts.js';
import { clientRoutes } from './routes/clients.js';
import { invoiceRoutes } from './routes/invoices.js';
import { notificationRoutes } from './routes/notifications.js';
import { calendarRoutes } from './routes/calendar.js';
import { billingRoutes } from './routes/billing.js';
import { dashboardRoutes } from './routes/dashboard.js';

// Plugin imports
import { prismaPlugin } from './plugins/prisma.js';
import { authPlugin } from './plugins/auth.js';
import { redisPlugin } from './plugins/redis.js';

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

async function bootstrap() {
  // ── Register Core Plugins ──────────────────────────────────

  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    sign: { expiresIn: '1h' },
  });

  await server.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max per file
  });

  await server.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
    redis: undefined, // will use in-memory for dev; override with Redis in prod
  });

  // ── Register App Plugins ───────────────────────────────────
  await server.register(prismaPlugin);
  await server.register(authPlugin);
  await server.register(redisPlugin);

  // ── Health Check ───────────────────────────────────────────
  server.get('/health', async () => ({
    status: 'ok',
    service: 'LexAI India API',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  }));

  // ── API Routes (all prefixed /v1) ──────────────────────────
  await server.register(async (app) => {
    await app.register(authRoutes,         { prefix: '/auth' });
    await app.register(tenantRoutes,       { prefix: '/tenants' });
    await app.register(userRoutes,         { prefix: '/users' });
    await app.register(caseRoutes,         { prefix: '/cases' });
    await app.register(documentRoutes,     { prefix: '/documents' });
    await app.register(hearingRoutes,      { prefix: '/hearings' });
    await app.register(taskRoutes,         { prefix: '/tasks' });
    await app.register(agentRoutes,        { prefix: '/agents' });
    await app.register(draftRoutes,        { prefix: '/drafts' });
    await app.register(clientRoutes,       { prefix: '/clients' });
    await app.register(invoiceRoutes,      { prefix: '/invoices' });
    await app.register(notificationRoutes, { prefix: '/notifications' });
    await app.register(calendarRoutes,     { prefix: '/calendar' });
    await app.register(dashboardRoutes,    { prefix: '/dashboard' });
    await app.register(billingRoutes,      { prefix: '/billing' });
  }, { prefix: '/v1' });

  // ── Global Error Handler ───────────────────────────────────
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error);

    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' }
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: error.message }
      });
    }

    return reply.status(error.statusCode || 500).send({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production'
          ? 'An internal error occurred'
          : error.message,
      }
    });
  });

  // ── Start Server ───────────────────────────────────────────
  const port = parseInt(process.env.API_PORT || '3001');
  const host = process.env.API_HOST || '0.0.0.0';

  await server.listen({ port, host });
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║         LexAI India API v1.1.0            ║
  ║  ⚖  AI-Powered Legal Platform for India  ║
  ╠═══════════════════════════════════════════╣
  ║  Server: http://${host}:${port}           ║
  ║  Health: http://${host}:${port}/health    ║
  ║  Env:    ${(process.env.NODE_ENV || 'development').padEnd(32)}║
  ╚═══════════════════════════════════════════╝
  `);
}

bootstrap().catch((err) => {
  console.error('Fatal: Failed to start server', err);
  process.exit(1);
});

export default server;
