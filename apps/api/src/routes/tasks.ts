// ============================================================
// LexAI India — Tasks Route
// PRD v1.1 Section 7.3 — Task Management
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const CreateTaskSchema = z.object({
  case_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  assigned_to: z.array(z.string().uuid()).default([]),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

const UpdateTaskSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
  title: z.string().min(1).max(500).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  assigned_to: z.array(z.string().uuid()).optional(),
});

export const taskRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /v1/tasks?case_id=...&status=...
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id, role } = request.user;
    const { case_id, status } = request.query as { case_id?: string; status?: string };

    const where: any = { tenant_id };
    if (case_id) where.case_id = case_id;
    if (status) where.status = status;
    if (['junior_associate', 'clerk'].includes(role)) {
      where.assigned_to = { has: user_id };
    }

    const tasks = await fastify.prisma.task.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { due_date: 'asc' }],
      take: 100,
      include: {
        case: { select: { id: true, title: true } },
      },
    });

    return reply.send({ data: tasks });
  });

  // POST /v1/tasks
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id } = request.user;
    const body = CreateTaskSchema.parse(request.body);

    const caseRecord = await fastify.prisma.case.findFirst({
      where: { id: body.case_id, tenant_id },
    });
    if (!caseRecord) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Case not found' } });
    }

    const task = await fastify.prisma.task.create({
      data: {
        tenant_id,
        case_id: body.case_id,
        title: body.title,
        description: body.description || null,
        priority: body.priority as any,
        assigned_to: body.assigned_to.length > 0 ? body.assigned_to : [user_id],
        due_date: body.due_date ? new Date(body.due_date) : null,
        created_by: user_id,
      },
    });

    return reply.status(201).send({ data: task });
  });

  // PATCH /v1/tasks/:id
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id } = request.user;
    const { id } = request.params as { id: string };
    const body = UpdateTaskSchema.parse(request.body);

    const existing = await fastify.prisma.task.findFirst({ where: { id, tenant_id } });
    if (!existing) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Task not found' } });
    }

    const updateData: any = { ...body };
    if (body.due_date) updateData.due_date = new Date(body.due_date);
    if (body.due_date === null) updateData.due_date = null;
    if (body.status === 'done') updateData.completed_at = new Date();
    if (body.status && body.status !== 'done') updateData.completed_at = null;

    const task = await fastify.prisma.task.update({
      where: { id },
      data: updateData,
    });

    return reply.send({ data: task });
  });

  // DELETE /v1/tasks/:id
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };

    await fastify.prisma.task.updateMany({
      where: { id, tenant_id },
      data: { status: 'cancelled' },
    });

    return reply.status(204).send();
  });
};
