// ============================================================
// LexAI India — Invoices + Time Entries Route
// PRD v1.1 Phase 2c — Billing & Time Tracking
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const CreateTimeEntrySchema = z.object({
  case_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().min(0.1).max(24),
  description: z.string().min(1).max(500),
  hourly_rate_paise: z.number().min(0).optional(),
  billable: z.boolean().default(true),
});

const CreateInvoiceSchema = z.object({
  client_id: z.string().uuid(),
  case_id: z.string().uuid().optional(),
  time_entry_ids: z.array(z.string()).optional(),
  line_items: z.array(z.object({
    description: z.string(),
    quantity: z.number().default(1),
    rate_paise: z.number(),
    amount_paise: z.number(),
    type: z.enum(['time', 'fixed', 'expense']).default('fixed'),
  })).optional(),
  gst_rate: z.number().default(18),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

export const invoiceRoutes: FastifyPluginAsync = async (fastify) => {

  // ── Time Entries ─────────────────────────────────────────────

  // GET /v1/invoices/time-entries?case_id=...&unbilled=true
  fastify.get('/time-entries', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id } = req.user;
    const { case_id, unbilled, client_id } = req.query as any;

    const where: any = { tenant_id };
    if (case_id) where.case_id = case_id;
    if (unbilled === 'true') where.billed = false;
    if (client_id) {
      where.case = { client_id };
    }

    // Use raw query since time_entries table needs to be created separately
    let entries: any[] = [];
    try {
      entries = await fastify.prisma.$queryRaw<any[]>`
        SELECT te.*, c.title as case_title, c.client_id, u.full_name as user_name
        FROM time_entries te
        LEFT JOIN cases c ON te.case_id = c.id
        LEFT JOIN users u ON te.user_id = u.id
        WHERE te.tenant_id = ${tenant_id}::uuid
        ORDER BY te.date DESC, te.created_at DESC LIMIT 100
      `;
    } catch { /* table may not exist yet */ }

    return reply.send({ data: entries });
  });

  // POST /v1/invoices/time-entries
  fastify.post('/time-entries', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id, id: user_id } = req.user;
    const body = CreateTimeEntrySchema.parse(req.body);

    // Get user's default hourly rate from tenant settings if not provided
    const user = await fastify.prisma.user.findUnique({ where: { id: user_id } });
    const hourlyRate = body.hourly_rate_paise ?? 500000; // Default ₹5000/hr = 500000 paise

    const entry = await fastify.prisma.$executeRaw`
      INSERT INTO time_entries (
        id, tenant_id, case_id, user_id, date, hours,
        description, hourly_rate_paise, billable, billed, created_at
      ) VALUES (
        gen_random_uuid(), ${tenant_id}::uuid, ${body.case_id}::uuid,
        ${user_id}::uuid, ${body.date}::date, ${body.hours},
        ${body.description}, ${hourlyRate}, ${body.billable}, false, now()
      )
    `.catch(async () => {
      // Table doesn't exist yet — create it
      await fastify.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS time_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          case_id UUID NOT NULL,
          user_id UUID NOT NULL,
          date DATE NOT NULL,
          hours DECIMAL(5,2) NOT NULL,
          description TEXT,
          hourly_rate_paise BIGINT NOT NULL DEFAULT 500000,
          billable BOOLEAN DEFAULT true,
          billed BOOLEAN DEFAULT false,
          invoice_id UUID,
          created_at TIMESTAMPTZ DEFAULT now()
        )
      `;
      return fastify.prisma.$executeRaw`
        INSERT INTO time_entries (
          id, tenant_id, case_id, user_id, date, hours,
          description, hourly_rate_paise, billable, billed, created_at
        ) VALUES (
          gen_random_uuid(), ${tenant_id}::uuid, ${body.case_id}::uuid,
          ${user_id}::uuid, ${body.date}::date, ${body.hours},
          ${body.description}, ${hourlyRate}, ${body.billable}, false, now()
        )
      `;
    });

    return reply.status(201).send({ data: { ok: true } });
  });

  // PATCH /v1/invoices/time-entries/:id
  fastify.patch('/time-entries/:id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id } = req.user;
    const { id } = req.params as { id: string };
    const { hours, description, hourly_rate_paise, billable } = req.body as any;

    await fastify.prisma.$executeRaw`
      UPDATE time_entries SET
        hours = COALESCE(${hours}, hours),
        description = COALESCE(${description}, description),
        hourly_rate_paise = COALESCE(${hourly_rate_paise}, hourly_rate_paise),
        billable = COALESCE(${billable}, billable)
      WHERE id = ${id}::uuid AND tenant_id = ${tenant_id}::uuid
    `.catch(() => null);

    return reply.send({ data: { ok: true } });
  });

  // DELETE /v1/invoices/time-entries/:id
  fastify.delete('/time-entries/:id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id } = req.user;
    const { id } = req.params as { id: string };
    await fastify.prisma.$executeRaw`
      DELETE FROM time_entries WHERE id = ${id}::uuid AND tenant_id = ${tenant_id}::uuid AND billed = false
    `.catch(() => null);
    return reply.status(204).send();
  });

  // ── Invoices ─────────────────────────────────────────────────

  // GET /v1/invoices
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id } = req.user;
    const { status, client_id } = req.query as any;

    const where: any = { tenant_id };
    if (status && status !== 'undefined') where.status = status;
    if (client_id) where.client_id = client_id;

    const invoices = await fastify.prisma.invoice.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        client: { select: { id: true, full_name: true, phone: true } },
        case: { select: { id: true, title: true } },
        payments: { select: { id: true, amount_paise: true, payment_date: true } },
      },
    });

    return reply.send({ data: invoices });
  });

  // POST /v1/invoices — generate invoice (from time entries or manual)
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id, id: user_id } = req.user;
    const body = CreateInvoiceSchema.parse(req.body);

    // Build line items from time entries if provided
    let lineItems = body.line_items || [];

    if (body.time_entry_ids && body.time_entry_ids.length > 0) {
      let entries: any[] = [];
      try {
        entries = await fastify.prisma.$queryRaw<any[]>`
          SELECT te.*, c.title as case_title
          FROM time_entries te
          LEFT JOIN cases c ON te.case_id = c.id
          WHERE te.id = ANY(${body.time_entry_ids}::uuid[])
          AND te.tenant_id = ${tenant_id}::uuid
          AND te.billable = true
        `;
      } catch { /* table may not exist yet */ }

      const timeLineItems = entries.map((e: any) => ({
        description: `${e.description} — ${e.case_title || 'Case'} (${e.hours}h @ ₹${Number(e.hourly_rate_paise) / 100}/hr)`,
        quantity: Number(e.hours),
        rate_paise: Number(e.hourly_rate_paise),
        amount_paise: Math.round(Number(e.hours) * Number(e.hourly_rate_paise)),
        type: 'time' as const,
        time_entry_id: e.id,
        date: e.date,
      }));
      lineItems = [...timeLineItems, ...lineItems];
    }

    if (lineItems.length === 0) {
      return reply.status(400).send({
        error: { code: 'NO_LINE_ITEMS', message: 'Invoice must have at least one line item or time entry' },
      });
    }

    const subtotalPaise = lineItems.reduce((sum, item) => sum + item.amount_paise, 0);
    const gstRate = body.gst_rate;
    const gstAmountPaise = Math.round(subtotalPaise * gstRate / 100);
    const totalPaise = subtotalPaise + gstAmountPaise;

    // Generate invoice number: INV-2025-001
    const year = new Date().getFullYear();
    const count = await fastify.prisma.invoice.count({ where: { tenant_id } });
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(3, '0')}`;

    const invoice = await fastify.prisma.invoice.create({
      data: {
        tenant_id,
        client_id: body.client_id,
        case_id: body.case_id || null,
        invoice_number: invoiceNumber,
        invoice_date: new Date(),
        due_date: body.due_date ? new Date(body.due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'draft',
        line_items: lineItems,
        subtotal_paise: subtotalPaise,
        gst_rate: gstRate,
        gst_amount_paise: gstAmountPaise,
        total_paise: totalPaise,
        balance_paise: totalPaise,
        notes: body.notes || null,
        created_by: user_id,
      },
    });

    // Mark time entries as billed
    if (body.time_entry_ids && body.time_entry_ids.length > 0) {
      await fastify.prisma.$executeRaw`
        UPDATE time_entries SET billed = true, invoice_id = ${invoice.id}::uuid
        WHERE id = ANY(${body.time_entry_ids}::uuid[]) AND tenant_id = ${tenant_id}::uuid
      `.catch(() => null);
    }

    return reply.status(201).send({ data: invoice });
  });

  // PATCH /v1/invoices/:id/issue — change draft to issued
  fastify.patch('/:id/issue', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id } = req.user;
    const { id } = req.params as { id: string };

    const invoice = await fastify.prisma.invoice.update({
      where: { id },
      data: { status: 'issued', issued_at: new Date() },
      include: { client: { select: { full_name: true, email: true } } },
    });

    return reply.send({ data: invoice });
  });

  // PATCH /v1/invoices/:id — edit invoice fields (due_date, notes, gst_rate)
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id } = req.user;
    const { id } = req.params as { id: string };
    const { due_date, notes, gst_rate } = req.body as any;

    const invoice = await fastify.prisma.invoice.findFirst({ where: { id, tenant_id } });
    if (!invoice) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    if (invoice.status === 'paid') return reply.status(400).send({ error: { code: 'INVOICE_PAID', message: 'Cannot edit a paid invoice' } });

    const updated = await fastify.prisma.invoice.update({
      where: { id },
      data: {
        ...(due_date !== undefined ? { due_date: due_date ? new Date(due_date) : null } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
        ...(gst_rate !== undefined ? { gst_rate: Number(gst_rate) } : {}),
      },
      include: { client: { select: { full_name: true, email: true } }, case: { select: { title: true } } },
    });

    return reply.send({ data: updated });
  });

  // PATCH /v1/invoices/:id/revoke-payment — revoke payment, set back to issued
  fastify.patch('/:id/revoke-payment', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id } = req.user;
    const { id } = req.params as { id: string };

    const invoice = await fastify.prisma.invoice.findFirst({ where: { id, tenant_id } });
    if (!invoice) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    if (invoice.status !== 'paid') return reply.status(400).send({ error: { code: 'NOT_PAID', message: 'Invoice is not paid' } });

    // Delete all payments for this invoice
    await fastify.prisma.invoicePayment.deleteMany({ where: { invoice_id: id } });

    // Reset invoice to issued state
    const updated = await fastify.prisma.invoice.update({
      where: { id },
      data: {
        status: 'issued',
        amount_paid_paise: 0,
        balance_paise: invoice.total_paise,
      },
    });

    return reply.send({ data: updated });
  });

  // POST /v1/invoices/:id/payment — record payment
  fastify.post('/:id/payment', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id, id: user_id } = req.user;
    const { id } = req.params as { id: string };
    const { amount_paise, payment_mode, reference_number, payment_date, notes } = req.body as any;

    const invoice = await fastify.prisma.invoice.findFirst({ where: { id, tenant_id } });
    if (!invoice) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Invoice not found' } });

    const payment = await fastify.prisma.invoicePayment.create({
      data: {
        tenant_id,
        invoice_id: id,
        client_id: invoice.client_id,
        amount_paise,
        payment_mode,
        reference_number: reference_number || null,
        payment_date: payment_date ? new Date(payment_date) : new Date(),
        notes: notes || null,
        recorded_by: user_id,
      },
    });

    const newPaid = Number(invoice.amount_paid_paise) + amount_paise;
    const newBalance = Number(invoice.total_paise) - newPaid;

    await fastify.prisma.invoice.update({
      where: { id },
      data: {
        amount_paid_paise: newPaid,
        balance_paise: Math.max(0, newBalance),
        status: newBalance <= 0 ? 'paid' : 'issued',
      },
    });

    return reply.status(201).send({ data: payment });
  });
};
