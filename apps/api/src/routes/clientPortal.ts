// apps/api/src/routes/clientPortal.ts
// Uses only: crypto (Node built-in), @fastify/jwt (already in API), bcryptjs (lazy)
import { FastifyInstance } from 'fastify';
import crypto from 'crypto';

const PORTAL_SECRET = (process.env.JWT_SECRET || 'fallback') + '_portal';

export async function clientPortalRoutes(app: FastifyInstance) {
  const prisma = (app as any).prisma;

  // ── JWT helpers using Node crypto (no jsonwebtoken needed) ─
  function signPortalJwt(payload: Record<string, unknown>): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 })).toString('base64url');
    const sig = crypto.createHmac('sha256', PORTAL_SECRET).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
  }

  function verifyPortalJwt(token: string): Record<string, unknown> {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token');
    const expected = crypto.createHmac('sha256', PORTAL_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if (expected !== parts[2]) throw new Error('Invalid signature');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
    return payload;
  }

  // ── Portal auth middleware ────────────────────────────────
  async function portalAuth(req: any, reply: any) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return reply.status(401).send({ error: 'Unauthorized' });
    try {
      req.portalUser = verifyPortalJwt(auth.slice(7));
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired session' });
    }
  }

  // ── POST /v1/portal/invite ───────────────────────────────
  app.post('/invite', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { client_id, email, name } = req.body as { client_id: string; email: string; name: string };
    if (!client_id || !email || !name) return reply.status(400).send({ error: 'client_id, email, name required' });

    const tenant_id = req.user.tenant_id;
    const client = await prisma.client.findFirst({ where: { id: client_id, tenant_id } });
    if (!client) return reply.status(404).send({ error: 'Client not found' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const existing = await prisma.clientPortalUser.findFirst({ where: { tenant_id, email: email.toLowerCase() } });
    if (existing) {
      await prisma.clientPortalUser.update({
        where: { id: existing.id },
        data: { invite_token: token, invite_expires_at: expires, is_active: true },
      });
    } else {
      await prisma.clientPortalUser.create({
        data: { tenant_id, client_id, email: email.toLowerCase(), name, password_hash: '', invite_token: token, invite_expires_at: expires },
      });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenant_id }, select: { name: true } });
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://lexai-platform-web.vercel.app';
    const inviteUrl = `${webUrl}/portal/accept-invite?token=${token}`;

    // Send email if SMTP configured
    if (process.env.SMTP_HOST) {
      try {
        const nodemailer = await import('nodemailer');
        const transport = nodemailer.default.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transport.sendMail({
          from: `"${tenant?.name || 'Sovereign Counsel'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: email,
          subject: `${tenant?.name || 'Your legal firm'} — Your case portal access`,
          html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#022448">Your case portal is ready</h2>
            <p>Dear ${name},</p>
            <p>Your advocate has set up a secure portal so you can track your case progress.</p>
            <a href="${inviteUrl}" style="display:inline-block;background:#022448;color:#ffe088;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
              Set up my account
            </a>
            <p style="color:#666;font-size:13px">This link expires in 48 hours.</p>
          </div>`,
        });
      } catch (e) {
        console.error('[Portal] Email failed:', e);
      }
    } else {
      console.log('[Portal] Invite URL (SMTP not configured):', inviteUrl);
    }

    return reply.send({ success: true, invite_url: inviteUrl });
  });

  // ── POST /v1/portal/accept-invite ───────────────────────
  app.post('/accept-invite', async (req: any, reply) => {
    const { token, password } = req.body as { token: string; password: string };
    if (!token || !password) return reply.status(400).send({ error: 'token and password required' });
    if (password.length < 8) return reply.status(400).send({ error: 'Password must be at least 8 characters' });

    const user = await prisma.clientPortalUser.findFirst({ where: { invite_token: token } });
    if (!user) return reply.status(404).send({ error: 'Invalid or expired invite' });
    if (user.invite_expires_at && user.invite_expires_at < new Date()) {
      return reply.status(410).send({ error: 'Invite link has expired. Please ask your advocate to re-invite you.' });
    }

    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.default.hash(password, 12);
    await prisma.clientPortalUser.update({
      where: { id: user.id },
      data: { password_hash: hash, invite_token: null, invite_expires_at: null, is_active: true },
    });

    const jwtToken = signPortalJwt({ portal_user_id: user.id, client_id: user.client_id, tenant_id: user.tenant_id });
    return reply.send({ token: jwtToken, name: user.name });
  });

  // ── POST /v1/portal/login ────────────────────────────────
  app.post('/login', async (req: any, reply) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return reply.status(400).send({ error: 'email and password required' });

    const user = await prisma.clientPortalUser.findFirst({
      where: { email: email.toLowerCase().trim(), is_active: true },
    });

    const bcrypt = await import('bcryptjs');
    const dummyHash = '$2b$12$invalidhashfortimingsafety00000';
    const valid = await bcrypt.default.compare(password, user?.password_hash || dummyHash);

    if (!user || !valid || !user.password_hash) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    await prisma.clientPortalUser.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
    const token = signPortalJwt({ portal_user_id: user.id, client_id: user.client_id, tenant_id: user.tenant_id });
    return reply.send({ token, name: user.name, client_id: user.client_id });
  });

  // ── GET /v1/portal/me ────────────────────────────────────
  app.get('/me', { preHandler: [portalAuth] }, async (req: any, reply) => {
    const user = await prisma.clientPortalUser.findUnique({
      where: { id: req.portalUser.portal_user_id },
      select: { id: true, name: true, email: true, last_login_at: true },
    });
    return reply.send({ user });
  });

  // ── GET /v1/portal/cases ─────────────────────────────────
  app.get('/cases', { preHandler: [portalAuth] }, async (req: any, reply) => {
    const { client_id, tenant_id } = req.portalUser as any;

    const caseClients = await prisma.caseClient.findMany({
      where: { client_id },
      select: { case_id: true },
    });
    const caseIds = caseClients.map((cc: any) => cc.case_id);

    const cases = await prisma.case.findMany({
      where: { id: { in: caseIds }, tenant_id },
      select: {
        id: true, title: true, case_number: true, status: true,
        court_name: true, case_type: true, next_hearing_date: true, created_at: true,
        hearings: {
          orderBy: { date: 'desc' }, take: 5,
          select: { id: true, date: true, purpose: true, outcome: true, next_hearing_date: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return reply.send({ cases });
  });

  // ── GET /v1/portal/cases/:id ─────────────────────────────
  app.get('/cases/:id', { preHandler: [portalAuth] }, async (req: any, reply) => {
    const { id } = req.params as { id: string };
    const { client_id, tenant_id } = req.portalUser as any;

    const link = await prisma.caseClient.findFirst({ where: { case_id: id, client_id } });
    if (!link) return reply.status(403).send({ error: 'Access denied' });

    const caseData = await prisma.case.findFirst({
      where: { id, tenant_id },
      select: {
        id: true, title: true, case_number: true, status: true,
        court_name: true, case_type: true, description: true,
        next_hearing_date: true, created_at: true,
        hearings: {
          orderBy: { date: 'desc' },
          select: { id: true, date: true, purpose: true, outcome: true, next_hearing_date: true },
        },
        tasks: {
          where: { status: { not: 'done' } },
          select: { id: true, title: true, due_date: true, priority: true, status: true },
          orderBy: { due_date: 'asc' }, take: 10,
        },
      },
    });

    if (!caseData) return reply.status(404).send({ error: 'Case not found' });
    return reply.send({ case: caseData });
  });

  // ── GET /v1/portal/invoices ──────────────────────────────
  app.get('/invoices', { preHandler: [portalAuth] }, async (req: any, reply) => {
    const { client_id, tenant_id } = req.portalUser as any;

    const invoices = await prisma.invoice.findMany({
      where: { client_id, tenant_id },
      select: {
        id: true, invoice_number: true, status: true,
        total_amount: true, paid_amount: true, due_date: true,
        client_view_token: true, created_at: true,
        case: { select: { id: true, title: true, case_number: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return reply.send({ invoices });
  });

  // ── POST /v1/portal/change-password ─────────────────────────
  app.post('/change-password', { preHandler: [portalAuth] }, async (req: any, reply) => {
    const { old_password, new_password } = req.body as { old_password: string; new_password: string };
    if (!old_password || !new_password) return reply.status(400).send({ error: 'old_password and new_password required' });
    if (new_password.length < 8) return reply.status(400).send({ error: 'Password must be at least 8 characters' });

    const user = await prisma.clientPortalUser.findUnique({ where: { id: req.portalUser.portal_user_id } });
    if (!user) return reply.status(404).send({ error: 'User not found' });

    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.default.compare(old_password, user.password_hash);
    if (!valid) return reply.status(401).send({ error: 'Current password is incorrect' });

    const hash = await bcrypt.default.hash(new_password, 12);
    await prisma.clientPortalUser.update({ where: { id: user.id }, data: { password_hash: hash } });
    return reply.send({ success: true });
  });
}
