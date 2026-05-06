// apps/api/src/routes/team.ts
// Team Management — Custom Roles, Invites, Members, Audit Log
// Mount: app.register(teamRoutes, { prefix: '/v1/team' })

import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';

const FEATURES = [
  'cases', 'documents', 'hearings', 'tasks',
  'clients', 'invoices', 'drafts', 'agents',
  'calendar', 'filings', 'analytics',
];

const ACCESS_LEVELS = ['none', 'view', 'edit'];

// Admin guard — managing_partner or super_admin only
async function requireAdmin(req: any, reply: any) {
  const role = req.user?.role;
  if (!['managing_partner', 'super_admin'].includes(role)) {
    return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Admin access required' } });
  }
}

// Audit log helper
async function logEvent(prisma: any, {
  tenant_id, user_id, action, entity_type, entity_id,
  event_type, resource_name, metadata, ip_address, user_agent,
}: any) {
  try {
    await prisma.auditLog.create({
      data: {
        tenant_id, user_id, action, entity_type,
        entity_id: entity_id || '00000000-0000-0000-0000-000000000000',
        event_type, resource_name, metadata,
        ip_address, user_agent,
      },
    });
  } catch (e) {
    console.error('[AuditLog] Failed to write:', e);
  }
}

export const teamRoutes: FastifyPluginAsync = async (fastify) => {
  const prisma = (fastify as any).prisma;

  // ── GET /v1/team/members ─────────────────────────────────
  fastify.get('/members', { preHandler: [fastify.authenticate] }, async (req: any, reply) => {
    const { tenant_id } = req.user;

    const users = await prisma.user.findMany({
      where: { tenant_id, is_active: true },
      select: {
        id: true, email: true, full_name: true, role: true,
        avatar_url: true, last_seen_at: true, created_at: true,
      },
      orderBy: { created_at: 'asc' },
    });

    // Get custom role assignments
    const assignments = await prisma.userRoleAssignment.findMany({
      where: { tenant_id },
      include: { role: { select: { id: true, name: true } } },
    });

    const assignMap: Record<string, any[]> = {};
    for (const a of assignments) {
      if (!assignMap[a.user_id]) assignMap[a.user_id] = [];
      assignMap[a.user_id].push(a.role);
    }

    const result = users.map((u: any) => ({
      ...u,
      custom_roles: assignMap[u.id] || [],
    }));

    return reply.send({ data: result });
  });

  // ── GET /v1/team/invites ─────────────────────────────────
  fastify.get('/invites', { preHandler: [fastify.authenticate, requireAdmin] }, async (req: any, reply) => {
    const invites = await prisma.teamInvite.findMany({
      where: { tenant_id: req.user.tenant_id, accepted_at: null, expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' },
    });
    return reply.send({ data: invites });
  });

  // ── POST /v1/team/invites ────────────────────────────────
  fastify.post('/invites', { preHandler: [fastify.authenticate, requireAdmin] }, async (req: any, reply) => {
    const { email, full_name, base_role, custom_role_id } = req.body as any;
    if (!email || !full_name) return reply.status(400).send({ error: 'email and full_name required' });

    const tenant_id = req.user.tenant_id;

    // Check if user already exists
    const existing = await prisma.user.findFirst({ where: { tenant_id, email: email.toLowerCase() } });
    if (existing) return reply.status(400).send({ error: 'User with this email already exists' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.teamInvite.create({
      data: {
        tenant_id,
        email: email.toLowerCase(),
        full_name,
        base_role: base_role || 'junior_associate',
        custom_role_id: custom_role_id || null,
        invite_token: token,
        invited_by: req.user.id,
        expires_at: expires,
      },
    });

    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://lexai-platform-web.vercel.app';
    const inviteUrl = `${webUrl}/signup?invite=${token}`;

    // Log the invite action
    await logEvent(prisma, {
      tenant_id, user_id: req.user.id,
      action: 'invite_sent', entity_type: 'team_invite', entity_id: invite.id,
      event_type: 'invite', resource_name: email,
      metadata: { email, full_name, base_role },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    return reply.status(201).send({ data: invite, invite_url: inviteUrl });
  });

  // ── DELETE /v1/team/invites/:id ──────────────────────────
  fastify.delete('/invites/:id', { preHandler: [fastify.authenticate, requireAdmin] }, async (req: any, reply) => {
    const { id } = req.params as any;
    await prisma.teamInvite.deleteMany({ where: { id, tenant_id: req.user.tenant_id } });
    return reply.send({ data: { success: true } });
  });

  // ── PATCH /v1/team/members/:id ───────────────────────────
  // Update member role or deactivate
  fastify.patch('/members/:id', { preHandler: [fastify.authenticate, requireAdmin] }, async (req: any, reply) => {
    const { id } = req.params as any;
    const { role, is_active } = req.body as any;
    const tenant_id = req.user.tenant_id;

    // Prevent self-demotion
    if (id === req.user.id && role && role !== req.user.role) {
      return reply.status(400).send({ error: 'You cannot change your own role' });
    }

    const user = await prisma.user.findFirst({ where: { id, tenant_id } });
    if (!user) return reply.status(404).send({ error: 'Member not found' });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(role ? { role } : {}),
        ...(is_active !== undefined ? { is_active } : {}),
      },
      select: { id: true, email: true, full_name: true, role: true, is_active: true },
    });

    await logEvent(prisma, {
      tenant_id, user_id: req.user.id,
      action: 'member_updated', entity_type: 'user', entity_id: id,
      event_type: 'role_change', resource_name: user.full_name,
      metadata: { old_role: user.role, new_role: role, is_active },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    return reply.send({ data: updated });
  });

  // ── DELETE /v1/team/members/:id ──────────────────────────
  fastify.delete('/members/:id', { preHandler: [fastify.authenticate, requireAdmin] }, async (req: any, reply) => {
    const { id } = req.params as any;
    if (id === req.user.id) return reply.status(400).send({ error: 'Cannot remove yourself' });

    const user = await prisma.user.findFirst({ where: { id, tenant_id: req.user.tenant_id } });
    if (!user) return reply.status(404).send({ error: 'Member not found' });

    await prisma.user.update({ where: { id }, data: { is_active: false } });

    await logEvent(prisma, {
      tenant_id: req.user.tenant_id, user_id: req.user.id,
      action: 'member_removed', entity_type: 'user', entity_id: id,
      event_type: 'delete', resource_name: user.full_name,
      metadata: { email: user.email },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    return reply.send({ data: { success: true } });
  });

  // ── GET /v1/team/roles ───────────────────────────────────
  fastify.get('/roles', { preHandler: [fastify.authenticate] }, async (req: any, reply) => {
    const roles = await prisma.customRole.findMany({
      where: { tenant_id: req.user.tenant_id },
      include: { permissions: true },
      orderBy: { created_at: 'asc' },
    });
    return reply.send({ data: roles });
  });

  // ── POST /v1/team/roles ──────────────────────────────────
  fastify.post('/roles', { preHandler: [fastify.authenticate, requireAdmin] }, async (req: any, reply) => {
    const { name, description, permissions } = req.body as {
      name: string;
      description?: string;
      permissions: Array<{ feature: string; access_level: string }>;
    };

    if (!name) return reply.status(400).send({ error: 'name required' });

    const role = await prisma.customRole.create({
      data: {
        tenant_id: req.user.tenant_id,
        name,
        description: description || null,
        created_by: req.user.id,
        permissions: {
          create: (permissions || [])
            .filter(p => FEATURES.includes(p.feature) && ACCESS_LEVELS.includes(p.access_level))
            .map(p => ({ feature: p.feature, access_level: p.access_level })),
        },
      },
      include: { permissions: true },
    });

    return reply.status(201).send({ data: role });
  });

  // ── PATCH /v1/team/roles/:id ─────────────────────────────
  fastify.patch('/roles/:id', { preHandler: [fastify.authenticate, requireAdmin] }, async (req: any, reply) => {
    const { id } = req.params as any;
    const { name, description, permissions } = req.body as any;

    const role = await prisma.customRole.findFirst({
      where: { id, tenant_id: req.user.tenant_id },
    });
    if (!role) return reply.status(404).send({ error: 'Role not found' });

    // Update permissions — delete all and recreate
    await prisma.rolePermission.deleteMany({ where: { role_id: id } });

    const updated = await prisma.customRole.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        permissions: {
          create: (permissions || [])
            .filter((p: any) => FEATURES.includes(p.feature) && ACCESS_LEVELS.includes(p.access_level))
            .map((p: any) => ({ feature: p.feature, access_level: p.access_level })),
        },
      },
      include: { permissions: true },
    });

    return reply.send({ data: updated });
  });

  // ── DELETE /v1/team/roles/:id ────────────────────────────
  fastify.delete('/roles/:id', { preHandler: [fastify.authenticate, requireAdmin] }, async (req: any, reply) => {
    const { id } = req.params as any;
    const role = await prisma.customRole.findFirst({
      where: { id, tenant_id: req.user.tenant_id },
    });
    if (!role) return reply.status(404).send({ error: 'Role not found' });
    if (role.is_default) return reply.status(400).send({ error: 'Cannot delete default role' });

    await prisma.customRole.delete({ where: { id } });
    return reply.send({ data: { success: true } });
  });

  // ── POST /v1/team/members/:id/roles ──────────────────────
  // Assign a custom role to a member
  fastify.post('/members/:id/roles', { preHandler: [fastify.authenticate, requireAdmin] }, async (req: any, reply) => {
    const { id } = req.params as any;
    const { role_id } = req.body as any;

    await prisma.userRoleAssignment.upsert({
      where: { user_id_role_id: { user_id: id, role_id } },
      create: { tenant_id: req.user.tenant_id, user_id: id, role_id, assigned_by: req.user.id },
      update: { assigned_by: req.user.id },
    });

    return reply.status(201).send({ data: { success: true } });
  });

  // ── DELETE /v1/team/members/:id/roles/:role_id ───────────
  fastify.delete('/members/:id/roles/:role_id', { preHandler: [fastify.authenticate, requireAdmin] }, async (req: any, reply) => {
    const { id, role_id } = req.params as any;
    await prisma.userRoleAssignment.deleteMany({ where: { user_id: id, role_id } });
    return reply.send({ data: { success: true } });
  });

  // ── GET /v1/team/audit-log ───────────────────────────────
  fastify.get('/audit-log', { preHandler: [fastify.authenticate, requireAdmin] }, async (req: any, reply) => {
    const { page = 1, limit = 50, user_id, event_type, from, to } = req.query as any;
    const tenant_id = req.user.tenant_id;

    const where: any = { tenant_id };
    if (user_id) where.user_id = user_id;
    if (event_type) where.event_type = event_type;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = new Date(from);
      if (to) where.created_at.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, full_name: true, email: true, avatar_url: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    return reply.send({ data: logs, meta: { total, page: Number(page), limit: Number(limit) } });
  });

  // ── POST /v1/team/audit-log ──────────────────────────────
  // Frontend sends client-side events (doc view, screenshot attempt, etc.)
  fastify.post('/audit-log', { preHandler: [fastify.authenticate] }, async (req: any, reply) => {
    const { event_type, entity_type, entity_id, resource_name, metadata } = req.body as any;

    const ACTION_MAP: Record<string, string> = {
      doc_view: 'viewed_document',
      doc_download: 'downloaded_document',
      case_view: 'viewed_case',
      screenshot_attempt: 'attempted_screenshot',
      tab_hidden: 'tab_hidden',
    };

    await logEvent(prisma, {
      tenant_id: req.user.tenant_id,
      user_id: req.user.id,
      action: ACTION_MAP[event_type] || event_type,
      entity_type: entity_type || 'unknown',
      entity_id,
      event_type,
      resource_name,
      metadata,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    return reply.send({ data: { success: true } });
  });
};
