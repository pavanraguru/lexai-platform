// ============================================================
// LexAI India — Clients Route
// PRD v1.1 Section 7.5 — Client Management
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const CreateClientSchema = z.object({
  full_name: z.string().min(1).max(255),
  phone: z.string().min(10).max(20),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  whatsapp_opted_in: z.boolean().default(true),
  email_opted_in: z.boolean().default(true),
});

export const clientRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /v1/clients
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id } = req.user;
    const { search } = req.query as { search?: string };

    const where: any = { tenant_id };
    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const clients = await fastify.prisma.client.findMany({
      where,
      orderBy: { full_name: 'asc' },
      include: {
        _count: { select: { invoices: true } },
      },
    });

    return reply.send({ data: clients });
  });

  // GET /v1/clients/:id
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id } = req.user;
    const { id } = req.params as { id: string };

    const client = await fastify.prisma.client.findFirst({
      where: { id, tenant_id },
      include: {
        invoices: {
          orderBy: { created_at: 'desc' },
          take: 10,
        },
        _count: { select: { invoices: true } },
      },
    });

    if (!client) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Client not found' } });
    }

    return reply.send({ data: client });
  });

  // POST /v1/clients
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id, id: user_id } = req.user;
    const body = CreateClientSchema.parse(req.body);

    const client = await fastify.prisma.client.create({
      data: {
        tenant_id,
        full_name: body.full_name,
        phone: body.phone,
        email: body.email || null,
        address: body.address || null,
        notes: body.notes || null,
        whatsapp_opted_in: body.whatsapp_opted_in,
        email_opted_in: body.email_opted_in,
        created_by: user_id,
      },
    });

    return reply.status(201).send({ data: client });
  });

  // PATCH /v1/clients/:id
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id } = req.user;
    const { id } = req.params as { id: string };
    const body = req.body as any;

    const client = await fastify.prisma.client.update({
      where: { id },
      data: { ...body, updated_at: new Date() },
    });

    return reply.send({ data: client });
  });
};
