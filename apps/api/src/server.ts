// ============================================================
// LexAI India — Fastify API Server  v1.2.0 — HARDENED
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

// Fix BigInt serialization
(BigInt.prototype as any).toJSON = function () { return Number(this); };

// ── Allowed origins ───────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://lexai-platform-web.vercel.app',
  'https://lexai-platform-ddneill4x-pavanragurus-projects.vercel.app',
  'https://lexai-platform-web-git-main-pavanragurus-projects.vercel.app',
];
if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000');
}
const ALLOWED_ORIGIN_PATTERN = /\.vercel\.app$/;

// ── Abort if JWT secret is default ───────────────────────────
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET env var is not set in production. Exiting.');
  process.exit(1);
}

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
  // Reject payloads over 10MB at server level
  bodyLimit: 10 * 1024 * 1024,
  // Reject requests with too many headers
  maxHeaderSize: 16384,
  // Never expose Fastify version in headers
  disableRequestLogging: false,
});

async function bootstrap() {

  // ── 1. Security headers (Helmet-equivalent) ─────────────────
  server.addHook('onSend', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    // Remove server fingerprinting
    reply.removeHeader('x-powered-by');
    reply.removeHeader('server');
  });

  // ── 2. Custom body parser — handles empty JSON bodies ────────
  server.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body: string, done) => {
    if (!body || body.trim() === '') { done(null, {}); return; }
    // Reject bodies over 1MB of text (prevents JSON bomb)
    if (body.length > 1_000_000) {
      done(new Error('Request body too large'), undefined);
      return;
    }
    try { done(null, JSON.parse(body)); } catch (err: any) { done(err, undefined); }
  });

  // ── 3. CORS — strict allowlist ───────────────────────────────
  await server.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (Railway health checks, curl, mobile apps)
      if (!origin) return cb(null, true);
      if (
        ALLOWED_ORIGINS.includes(origin) ||
        ALLOWED_ORIGIN_PATTERN.test(origin) ||
        (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost'))
      ) {
        return cb(null, true);
      }
      cb(new Error(`CORS: origin not allowed: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Type'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // ── 4. JWT — no fallback in production ───────────────────────
  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    sign: { expiresIn: '24h' }, // reduced from 30d — shorter sessions = less exposure
  });

  // ── 5. File uploads — strict limits ─────────────────────────
  await server.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,  // 50MB max file
      files: 5,                     // max 5 files per request
      fields: 20,                   // max 20 fields
      fieldSize: 1 * 1024 * 1024,   // 1MB max field value
    },
  });

  // ── 6. Rate limiting — tiered ────────────────────────────────
  await server.register(rateLimit, {
    global: true,
    max: 200,           // 200 req/min globally (was 1000 — way too high)
    timeWindow: '1 minute',
    allowList: [],
    ban: 10,            // ban IP after 10 rate limit violations
    onBanReach: (req) => {
      server.log.warn({ ip: req.ip, url: req.url }, 'IP banned for rate limit abuse');
    },
    keyGenerator: (req) => {
      // Key by IP + user ID if authenticated
      const userId = (req.user as any)?.id || 'anon';
      return `${req.ip}-${userId}`;
    },
  });

  await server.register(prismaPlugin);
  await server.register(authPlugin);
  await server.register(redisPlugin);

  // ── 7. Health check — minimal info exposure ──────────────────
  server.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // ── 8. Block common attack paths ─────────────────────────────
  server.addHook('onRequest', async (request, reply) => {
    const url = request.url.toLowerCase();
    // Block common vulnerability probes
    const blocked = [
      '/wp-admin', '/wp-login', '/.env', '/phpinfo', '/admin.php',
      '/xmlrpc.php', '/.git/', '/config.json', '/actuator', '/api/v1/pods',
      '/console', '/manager/html', '/../', '/etc/passwd',
    ];
    if (blocked.some(b => url.includes(b))) {
      return reply.status(404).send({ error: 'Not found' });
    }

    // Block suspicious user agents
    const ua = (request.headers['user-agent'] || '').toLowerCase();
    const blockedUAs = ['sqlmap', 'nikto', 'nessus', 'masscan', 'zgrab', 'nmap'];
    if (blockedUAs.some(b => ua.includes(b))) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    // Enforce JSON content-type on POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const ct = request.headers['content-type'] || '';
      if (ct && !ct.includes('application/json') && !ct.includes('multipart/form-data')) {
        return reply.status(415).send({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json' } });
      }
    }
  });

  // ── 9. All routes under /v1 ───────────────────────────────────
  await server.register(async (app) => {

    // Stricter rate limit on auth routes — brute force protection
    await app.register(rateLimit, {
      max: 10,
      timeWindow: '1 minute',
      ban: 5,
      errorResponseBuilder: () => ({
        error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please wait 1 minute.' }
      }),
    });
    await app.register(authRoutes, { prefix: '/auth' });

  }, { prefix: '/v1' });

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

  await server.register(clientPortalRoutes, { prefix: '/v1/portal' });

  // ── 10. Global error handler — never leak internals ──────────
  server.setErrorHandler((error, request, reply) => {
    // Always log full error server-side
    server.log.error({
      err: error,
      url: request.url,
      method: request.method,
      ip: request.ip,
    });

    if (error.statusCode === 429) {
      return reply.status(429).send({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' } });
    }
    if (error.validation) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request data' } });
    }
    if (error.message?.includes('CORS')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Origin not allowed' } });
    }
    // Never expose stack traces or internal messages in production
    return reply.status(error.statusCode || 500).send({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production'
          ? 'An error occurred. Please try again.'
          : error.message,
      },
    });
  });

  // ── 11. 404 handler ──────────────────────────────────────────
  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  const port = parseInt(process.env.API_PORT || '3001');
  const host = process.env.API_HOST || '0.0.0.0';
  await server.listen({ port, host });
  console.log(`LexAI India API running on ${host}:${port}`);
}

bootstrap().catch((err) => {
  console.error('Fatal: Failed to start server', err);
  process.exit(1);
});

export default server;
