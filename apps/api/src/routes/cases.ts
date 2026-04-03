// ============================================================
// LexAI India — Cases Route
// PRD v1.1 Section 7.1 — Case Management (CM-01 to CM-10)
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const CreateCaseSchema = z.object({
  title: z.string().min(3).max(500),
  case_type: z.enum([
    'criminal_sessions','criminal_magistrate','civil_district','writ_hc',
    'corporate_nclt','family','labour','ip','tax','arbitration','consumer'
  ]),
  court: z.string().min(2).max(200),
  court_level: z.enum(['supreme_court','high_court','district_court','tribunal','magistrate']),
  perspective: z.enum(['defence','prosecution','petitioner','respondent','appellant','claimant']).default('defence'),
  cnr_number: z.string().min(1).max(30).optional().nullable(),
  judge_name: z.string().optional().nullable(),
  priority: z.enum(['low','normal','high','urgent']).default('normal'),
  filed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  assigned_advocates: z.array(z.string().uuid()).min(1),
  client_id: z.string().uuid().optional().nullable(),
  metadata: z.object({
    fir_number: z.string().optional(),
    police_station: z.string().optional(),
    complainant_name: z.string().optional(),
    accused_names: z.array(z.string()).optional(),
    sections_charged: z.array(z.string()).optional(),
    opposing_counsel: z.string().optional(),
    case_value_inr: z.number().optional(),
    tags: z.array(z.string()).optional(),
  }).optional().default({}),
});

const UpdateCaseStatusSchema = z.object({
  status: z.enum(['intake','filed','pending_hearing','arguments','reserved','decided','appeal','closed']),
});

export const caseRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /v1/cases — list all cases for the tenant
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          case_type: { type: 'string' },
          assigned_to: { type: 'string' },
          search: { type: 'string' },
          limit: { type: 'integer', default: 20, maximum: 100 },
          cursor: { type: 'string' },
        }
      }
    }
  }, async (request, reply) => {
    const { tenant_id, id: user_id, role } = request.user;
    const { status, case_type, assigned_to, search, limit = 20, cursor } = request.query as any;

    // Build where clause — clerks and associates only see assigned cases
    const where: any = { tenant_id };

    if (['junior_associate', 'clerk', 'client'].includes(role)) {
      where.assigned_advocates = { has: user_id };
    }
    if (status) where.status = status;
    if (case_type) where.case_type = case_type;
    if (assigned_to) where.assigned_advocates = { has: assigned_to };
    if (cursor) where.id = { gt: cursor };

    const cases = await fastify.prisma.case.findMany({
      where,
      take: limit + 1,
      orderBy: [
        { next_hearing_date: 'asc' },
        { updated_at: 'desc' },
      ],
      include: {
        _count: {
          select: { documents: true, tasks: true, agent_jobs: true },
        },
      },
    });

    const hasMore = cases.length > limit;
    const items = hasMore ? cases.slice(0, limit) : cases;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return reply.send({
      data: items,
      meta: { limit, cursor: nextCursor, has_more: hasMore },
    });
  });

  // POST /v1/cases — create new case
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id, role } = request.user;

    // Only managing_partner, senior_advocate, super_admin can create cases
    if (!['super_admin', 'managing_partner', 'senior_advocate'].includes(role)) {
      return reply.status(403).send({
        error: { code: 'ERR_INSUFFICIENT_ROLE', message: 'Only advocates can create cases' }
      });
    }

    const body = CreateCaseSchema.parse(request.body);

    const newCase = await fastify.prisma.case.create({
      data: {
        tenant_id,
        title: body.title,
        case_type: body.case_type as any,
        court: body.court,
        court_level: body.court_level as any,
        perspective: body.perspective as any,
        cnr_number: body.cnr_number || null,
        judge_name: body.judge_name || null,
        priority: body.priority as any,
        filed_date: body.filed_date ? new Date(body.filed_date) : null,
        assigned_advocates: body.assigned_advocates,
        client_id: body.client_id || null,
        metadata: body.metadata,
        created_by: user_id,
        ecourts_sync_enabled: !!body.cnr_number,
      },
    });

    // Write audit log
    await fastify.prisma.auditLog.create({
      data: {
        tenant_id,
        user_id,
        action: 'CASE_CREATED',
        entity_type: 'case',
        entity_id: newCase.id,
        new_value: newCase as any,
      },
    });

    // TODO Phase 1: Create default task checklist from template

    return reply.status(201).send({ data: newCase });
  });

  // GET /v1/cases/:id — get single case with all relations
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id, role } = request.user;
    const { id } = request.params as { id: string };

    const caseRecord = await fastify.prisma.case.findFirst({
      where: { id, tenant_id },
      include: {
        documents: {
          orderBy: { created_at: 'desc' },
          select: {
            id: true, filename: true, doc_category: true,
            processing_status: true, page_count: true,
            file_size_bytes: true, created_at: true, shared_with_client: true,
          },
        },
        hearings: {
          orderBy: { date: 'asc' },
        },
        tasks: {
          where: { status: { not: 'cancelled' } },
          orderBy: [{ priority: 'desc' }, { due_date: 'asc' }],
        },
        agent_jobs: {
          orderBy: { created_at: 'desc' },
          select: {
            id: true, agent_type: true, status: true,
            model_used: true, cost_inr: true,
            created_at: true, completed_at: true,
          },
        },
        _count: {
          select: { documents: true, tasks: true, agent_jobs: true },
        },
      },
    });

    if (!caseRecord) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Case not found' }
      });
    }

    // Enforce assignment-based access for non-partner roles
    if (['junior_associate', 'clerk'].includes(role)) {
      if (!caseRecord.assigned_advocates.includes(user_id)) {
        return reply.status(403).send({
          error: { code: 'ERR_INSUFFICIENT_ROLE', message: 'You are not assigned to this case' }
        });
      }
    }

    return reply.send({ data: caseRecord });
  });

  // PATCH /v1/cases/:id — update case fields
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id } = request.user;
    const { id } = request.params as { id: string };

    const existing = await fastify.prisma.case.findFirst({ where: { id, tenant_id } });
    if (!existing) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Case not found' } });
    }

    const updateData = request.body as any;
    // Strip fields that cannot be updated directly
    delete updateData.id;
    delete updateData.tenant_id;
    delete updateData.created_by;
    delete updateData.created_at;

    const updated = await fastify.prisma.case.update({
      where: { id },
      data: { ...updateData, updated_at: new Date() },
    });

    await fastify.prisma.auditLog.create({
      data: {
        tenant_id, user_id,
        action: 'CASE_UPDATED',
        entity_type: 'case',
        entity_id: id,
        old_value: existing as any,
        new_value: updated as any,
      },
    });

    return reply.send({ data: updated });
  });

  // PATCH /v1/cases/:id/status — change case status (state machine)
  fastify.patch('/:id/status', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id, role } = request.user;
    const { id } = request.params as { id: string };

    const { status } = UpdateCaseStatusSchema.parse(request.body);

    // Only managing_partner can close a case (PRD state machine rule)
    if (status === 'closed' && !['super_admin', 'managing_partner'].includes(role)) {
      return reply.status(403).send({
        error: { code: 'ERR_INSUFFICIENT_ROLE', message: 'Only Managing Partner can close a case' }
      });
    }

    const existing = await fastify.prisma.case.findFirst({ where: { id, tenant_id } });
    if (!existing) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Case not found' } });
    }

    const updated = await fastify.prisma.case.update({
      where: { id },
      data: { status: status as any, updated_at: new Date() },
    });

    // Notify all assigned advocates of status change
    for (const advocateId of existing.assigned_advocates) {
      await fastify.prisma.notification.create({
        data: {
          tenant_id,
          user_id: advocateId,
          type: 'case_status_changed',
          title: `Case status updated: ${existing.title}`,
          message: `Status changed to: ${status.replace(/_/g, ' ')}`,
          action_url: `/cases/${id}`,
          related_case_id: id,
        },
      });
    }

    await fastify.prisma.auditLog.create({
      data: {
        tenant_id, user_id,
        action: 'CASE_STATUS_CHANGED',
        entity_type: 'case',
        entity_id: id,
        old_value: { status: existing.status },
        new_value: { status },
      },
    });

    return reply.send({ data: updated });
  });
};
