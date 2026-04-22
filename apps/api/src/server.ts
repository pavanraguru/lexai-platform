// ============================================================
// LexAI India — Fastify API Server  v1.1.0
// ============================================================

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';

// Route imports
import { authRoutes }         from './routes/auth.js';
import { tenantRoutes }       from './routes/tenants.js';
import { userRoutes }         from './routes/users.js';
import { caseRoutes }         from './routes/cases.js';
import { documentRoutes }     from './routes/documents.js';
import { hearingRoutes }      from './routes/hearings.js';
import { taskRoutes }         from './routes/tasks.js';
import { agentRoutes }        from './routes/agents.js';
import { draftRoutes }        from './routes/drafts.js';
import { clientRoutes }       from './routes/clients.js';
import { invoiceRoutes }      from './routes/invoices.js';
import { notificationRoutes } from './routes/notifications.js';
import { calendarRoutes }     from './routes/calendar.js';
import { dashboardRoutes }    from './routes/dashboard.js';
import { presentationRoutes }  from './routes/presentations.js';
import { filingRoutes }        from './routes/filings.js';
import { billingRoutes }       from './routes/billing.js';
import { translationRoutes }   from './routes/translation.js';

// Plugin imports
import { prismaPlugin } from './plugins/prisma.js';
import { authPlugin }   from './plugins/auth.js';
import { redisPlugin }  from './plugins/redis.js';

// Fix BigInt serialization — Prisma returns BigInt for all paise/amount fields
(BigInt.prototype as any).toJSON = function () { return Number(this); };

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

async function bootstrap() {
  await server.register(cors, {
    origin: true,  // allow all origins — Vercel + localhost + any client
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Type'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    sign: { expiresIn: '30d' },
  });

  await server.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  await server.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
  });

  await server.register(prismaPlugin);
  await server.register(authPlugin);
  await server.register(redisPlugin);

  // Health check
  server.get('/health', async () => ({
    status: 'ok',
    service: 'LexAI India API',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  }));

  // All routes under /v1
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
    await app.register(presentationRoutes, { prefix: '/presentations' });
    await app.register(filingRoutes,        { prefix: '/filings' });
    await app.register(billingRoutes,       { prefix: '/billing' });
    await app.register(translationRoutes,  { prefix: '/documents' });
  }, { prefix: '/v1' });


  // Global error handler
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error);
    if (error.statusCode === 429) {
      return reply.status(429).send({ error: { code: 'RATE_LIMITED', message: 'Too many requests.' } });
    }
    if (error.validation) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
    return reply.status(error.statusCode || 500).send({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' ? 'An internal error occurred' : error.message,
      },
    });
  });

  const port = parseInt(process.env.API_PORT || '3001');
  const host = process.env.API_HOST || '0.0.0.0';
  await server.listen({ port, host });
  console.log(`🚀 LexAI India API running on ${host}:${port}`);
}

bootstrap().catch((err) => {
  console.error('Fatal: Failed to start server', err);
  process.exit(1);
});

export default server;
