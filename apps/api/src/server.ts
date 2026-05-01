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
import { presentationRoutes } from './routes/presentations.js';
import { filingRoutes }       from './routes/filings.js';
import { billingRoutes }      from './routes/billing.js';
import { searchRoutes }       from './routes/search.js';
import { translationRoutes }  from './routes/translation.js';
import { clientPortalRoutes } from './routes/clientPortal.js';
import { bulkUploadRoutes }   from './routes/bulkUpload.js';

// Plugin imports
import { prismaPlugin } from './plugins/prisma.js';
import { authPlugin }   from './plugins/auth.js';
import { redisPlugin }  from './plugins/redis.js';

export async function buildServer() {
  const server = Fastify({
    logger: process.env.NODE_ENV !== 'production',
  });

  // ── Plugins ────────────────────────────────────────────────
  await server.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? [
          'https://lexai-platform-web.vercel.app',
          /\.vercel\.app$/,
        ]
      : true,
    credentials: true,
  });

  await server.register(jwt, {
    secret: process.env.JWT_SECRET!,
  });

  await server.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  await server.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  await server.register(prismaPlugin);
  await server.register(authPlugin);
  await server.register(redisPlugin);

  // ── Auth routes (rate-limited separately) ─────────────────
  await server.register(async (app) => {
    await app.register(rateLimit, {
      max: 10,
      timeWindow: '1 minute',
    });
    await app.register(authRoutes, { prefix: '/auth' });
  }, { prefix: '/v1' });

  // ── Main API routes (JWT protected) ───────────────────────
  await server.register(async (app) => {
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
    await app.register(filingRoutes,       { prefix: '/filings' });
    await app.register(billingRoutes,      { prefix: '/billing' });
    await app.register(searchRoutes,       { prefix: '/search' });
    await app.register(translationRoutes,  { prefix: '/documents' });
    await app.register(bulkUploadRoutes,   { prefix: '/bulk-upload' });
  }, { prefix: '/v1' });

  // ── Client portal routes (own JWT, no advocate auth) ──────
  await server.register(clientPortalRoutes, { prefix: '/v1/portal' });

  server.get("/health", async () => ({ status: "ok" }));

  return server;
}

// ── Start server ──────────────────────────────────────────────
const PORT = Number(process.env.PORT || 3001);
buildServer()
  .then(server => server.listen({ port: PORT, host: '0.0.0.0' }))
  .then(() => console.log(`API running on port ${PORT}`))
  .catch(err => { console.error(err); process.exit(1); });
