// ============================================================
// LexAI India — Documents Route
// PRD v1.1 CM-05, DM-01 to DM-04
// S3 presigned upload → DB record → OCR pipeline trigger
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Queue } from 'bullmq';
import { z } from 'zod';
import crypto from 'crypto';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const PresignRequestSchema = z.object({
  filename: z.string().min(1).max(500),
  mime_type: z.string(),
  file_size_bytes: z.number().positive().max(50 * 1024 * 1024), // 50MB
  case_id: z.string().uuid(),
  doc_category: z.enum([
    'fir','chargesheet','bail_order','witness_statement','forensic_report',
    'affidavit','plaint','written_statement','vakalatnama','order','judgment',
    'deposition','evidence_exhibit','consultation_recording','other'
  ]).optional(),
});

const RegisterDocumentSchema = z.object({
  s3_key: z.string(),
  filename: z.string(),
  mime_type: z.string(),
  file_size_bytes: z.number(),
  case_id: z.string().uuid(),
  doc_category: z.string().optional(),
});

export const documentRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /v1/documents/presign
  // Step 1: Get a presigned S3 URL — client uploads directly to S3
  fastify.post('/presign', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const body = PresignRequestSchema.parse(request.body);

    // Verify case belongs to tenant
    const caseRecord = await fastify.prisma.case.findFirst({
      where: { id: body.case_id, tenant_id },
    });
    if (!caseRecord) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Case not found' } });
    }

    // Generate unique S3 key
    const ext = body.filename.split('.').pop() || 'bin';
    const docId = crypto.randomUUID();
    const s3Key = `tenants/${tenant_id}/cases/${body.case_id}/docs/${docId}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: s3Key,
      ContentType: body.mime_type,
      Metadata: {
        tenant_id,
        case_id: body.case_id,
        original_filename: encodeURIComponent(body.filename),
      },
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min

    return reply.send({
      data: {
        presigned_url: presignedUrl,
        s3_key: s3Key,
        doc_id: docId,
        expires_in: 300,
      },
    });
  });

  // POST /v1/documents — register document in DB after S3 upload
  // Step 2: After client uploads to S3, call this to create the DB record
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id } = request.user;
    const body = RegisterDocumentSchema.parse(request.body);

    // Verify case belongs to tenant
    const caseRecord = await fastify.prisma.case.findFirst({
      where: { id: body.case_id, tenant_id },
    });
    if (!caseRecord) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Case not found' } });
    }

    const document = await fastify.prisma.document.create({
      data: {
        tenant_id,
        case_id: body.case_id,
        filename: body.filename,
        s3_key: body.s3_key,
        mime_type: body.mime_type,
        file_size_bytes: BigInt(body.file_size_bytes),
        doc_category: (body.doc_category as any) || null,
        processing_status: 'pending',
        uploaded_by: user_id,
      },
    });

    // Update tenant storage usage
    await fastify.prisma.subscription.updateMany({
      where: { tenant_id },
      data: {
        storage_bytes_used: {
          increment: BigInt(body.file_size_bytes),
        },
      },
    });

    // Enqueue OCR processing job — always catch so upload succeeds even if Redis is down/over-limit
    try {
      const ocrQueue = new Queue('document-ocr', {
        connection: fastify.redis,
      });
      await ocrQueue.add('process-document', {
        document_id: document.id,
        s3_key: body.s3_key,
        mime_type: body.mime_type,
        tenant_id,
        case_id: body.case_id,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });
      fastify.log.info(`[Documents] OCR job queued for ${document.id}`);
    } catch (queueErr: any) {
      // Redis unavailable or over request limit — document is saved, OCR skipped.
      // User can still view and manually re-process the document.
      fastify.log.warn(`[Documents] OCR queue unavailable (${queueErr.message}) — document saved, OCR pending`);
      try {
        await fastify.prisma.document.update({
          where: { id: document.id },
          data: { processing_status: 'pending' }, // keep as pending, not failed — can retry
        });
      } catch {} // ignore secondary error
    }

    await fastify.prisma.auditLog.create({
      data: {
        tenant_id, user_id,
        action: 'DOCUMENT_UPLOADED',
        entity_type: 'document',
        entity_id: document.id,
        new_value: { filename: body.filename, case_id: body.case_id } as any,
      },
    });

    return reply.status(201).send({ data: document });
  });

  // GET /v1/documents/:id/download — presigned download URL (forces download)
  fastify.get('/:id/download', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };

    const document = await fastify.prisma.document.findFirst({
      where: { id, tenant_id },
    });
    if (!document) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: document.s3_key,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 900 });
    return reply.send({ data: { download_url: url, expires_in: 900 } });
  });

  // GET /v1/documents/:id/preview — presigned URL for inline browser preview
  fastify.get('/:id/preview', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };

    const document = await fastify.prisma.document.findFirst({
      where: { id, tenant_id },
    });
    if (!document) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: document.s3_key,
      // 'inline' tells browser to render it (PDF viewer, image) instead of downloading
      ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
      ResponseContentType: document.mime_type || 'application/octet-stream',
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 900 });
    return reply.send({ data: { preview_url: url, mime_type: document.mime_type, expires_in: 900 } });
  });


  // POST /v1/documents/:id/retry-ocr — manually retry OCR processing
  // Used when Redis/BullMQ queue is unavailable (Upstash over limit)
  fastify.post('/:id/retry-ocr', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };

    const document = await fastify.prisma.document.findFirst({
      where: { id, tenant_id },
    });
    if (!document) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    // Try to queue via Redis first
    try {
      const ocrQueue = new Queue('document-ocr', { connection: fastify.redis });
      await ocrQueue.add('process-document', {
        document_id: document.id,
        s3_key: document.s3_key,
        mime_type: document.mime_type || 'application/pdf',
        tenant_id,
        case_id: document.case_id,
      }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

      await fastify.prisma.document.update({
        where: { id },
        data: { processing_status: 'pending' },
      });

      return reply.send({ data: { status: 'queued', message: 'OCR job queued successfully' } });
    } catch (queueErr: any) {
      // Redis unavailable — return helpful error with upgrade instructions
      fastify.log.warn(`[Documents] OCR retry queue failed: ${queueErr.message}`);
      return reply.status(503).send({
        error: {
          code: 'QUEUE_UNAVAILABLE',
          message: 'OCR queue unavailable. Please upgrade Upstash Redis at console.upstash.com to resume processing.',
        },
      });
    }
  });

  // GET /v1/documents/search — semantic + keyword search across all case docs
  // PRD DM-03 — Instant Document Search
  fastify.get('/search', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { q, case_id, category, mode = 'keyword', limit = 20 } = request.query as any;

    if (!q || q.length < 2) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Query too short' } });
    }

    const where: any = {
      tenant_id,
      processing_status: 'ready',
      extracted_text: { not: null },
    };
    if (case_id) where.case_id = case_id;
    if (category) where.doc_category = category;

    if (mode === 'keyword') {
      // PostgreSQL full-text search
      const results = await fastify.prisma.$queryRaw<any[]>`
        SELECT d.id, d.filename, d.doc_category, d.case_id,
               ts_headline('english', d.extracted_text, plainto_tsquery(${q}),
                 'MaxWords=30, MinWords=15, StartSel=<mark>, StopSel=</mark>') as excerpt
        FROM documents d
        WHERE d.tenant_id = ${tenant_id}::uuid
          AND d.processing_status = 'ready'
          AND to_tsvector('english', coalesce(d.extracted_text,'')) @@ plainto_tsquery(${q})
          ${case_id ? fastify.prisma.$queryRaw`AND d.case_id = ${case_id}::uuid` : fastify.prisma.$queryRaw``}
        ORDER BY ts_rank(to_tsvector('english', coalesce(d.extracted_text,'')), plainto_tsquery(${q})) DESC
        LIMIT ${limit}
      `;
      return reply.send({ data: results, meta: { mode: 'keyword', query: q } });
    }

    // Semantic search — placeholder until embedding service integrated
    return reply.send({
      data: [],
      meta: {
        mode: 'semantic',
        query: q,
        note: 'Semantic search requires Voyage AI embeddings to be generated first. Run document processing pipeline.',
      },
    });
  });

  // PATCH /v1/documents/:id/share — toggle client portal visibility
  // PRD CM-06, CP-03
  fastify.patch('/:id/share', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id, role } = request.user;
    const { id } = request.params as { id: string };
    const { shared_with_client } = request.body as { shared_with_client: boolean };

    if (!['super_admin', 'managing_partner', 'senior_advocate', 'junior_associate'].includes(role)) {
      return reply.status(403).send({ error: { code: 'ERR_INSUFFICIENT_ROLE', message: 'Cannot share documents' } });
    }

    const document = await fastify.prisma.document.findFirst({ where: { id, tenant_id } });
    if (!document) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    const updated = await fastify.prisma.document.update({
      where: { id },
      data: { shared_with_client: Boolean(shared_with_client) },
    });

    return reply.send({ data: updated });
  });

  // DELETE /v1/documents/:id — soft delete (removes from S3 + marks inactive)
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id, role } = request.user;
    const { id } = request.params as { id: string };

    if (!['super_admin', 'managing_partner', 'senior_advocate'].includes(role)) {
      return reply.status(403).send({ error: { code: 'ERR_INSUFFICIENT_ROLE', message: 'Cannot delete documents' } });
    }

    const document = await fastify.prisma.document.findFirst({ where: { id, tenant_id } });
    if (!document) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    // Delete from S3
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: document.s3_key,
    }));

    // Delete DB record
    await fastify.prisma.document.delete({ where: { id } });

    // Update storage quota
    await fastify.prisma.subscription.updateMany({
      where: { tenant_id },
      data: { storage_bytes_used: { decrement: document.file_size_bytes } },
    });

    await fastify.prisma.auditLog.create({
      data: {
        tenant_id, user_id,
        action: 'DOCUMENT_DELETED',
        entity_type: 'document',
        entity_id: id,
        old_value: { filename: document.filename } as any,
      },
    });

    return reply.status(204).send();
  });
};
