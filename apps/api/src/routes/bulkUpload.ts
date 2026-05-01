// apps/api/src/routes/bulkUpload.ts
// Bulk Document Upload + AI Auto-Categorisation
// Mount in server.ts: app.register(bulkUploadRoutes, { prefix: '/v1/bulk-upload' })

import { FastifyInstance } from 'fastify'
import Anthropic from '@anthropic-ai/sdk'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Canonical document categories for Indian legal practice
const LEGAL_CATEGORIES = [
  'FIR',
  'Chargesheet',
  'Bail Application',
  'Bail Order',
  'Court Order',
  'Judgment',
  'Petition',
  'Written Statement',
  'Affidavit',
  'Vakalatnama',
  'Evidence',
  'Witness Statement',
  'Police Report',
  'Medical Report',
  'Financial Document',
  'Identity Document',
  'Property Document',
  'Contract',
  'Notice',
  'Correspondence',
  'Application',
  'Other',
]

// ── Categorise a single filename + mime via Claude ────────────
async function categoriseDocument(filename: string, mimeType: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `You are an Indian legal document classifier. Given a filename and MIME type, return ONLY the most appropriate category from this list (return exact string, nothing else):

${LEGAL_CATEGORIES.join(', ')}

Filename: "${filename}"
MIME type: "${mimeType}"

Return only the category name.`,
        },
      ],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : 'Other'
    return LEGAL_CATEGORIES.includes(text) ? text : 'Other'
  } catch {
    return 'Other'
  }
}

export async function bulkUploadRoutes(app: FastifyInstance) {
  const prisma = app.prisma

  // ── POST /v1/bulk-upload/presign ────────────────────────────
  // Returns signed URLs for all files + creates a BulkUploadJob
  app.post('/presign', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { case_id, files } = req.body as {
      case_id?: string
      files: Array<{ filename: string; mime_type: string; size_bytes: number }>
    }

    if (!files?.length) return reply.status(400).send({ error: 'files array required' })
    if (files.length > 50) return reply.status(400).send({ error: 'Max 50 files per batch' })

    const tenant_id = req.user.tenant_id

    // Verify case ownership if provided
    if (case_id) {
      const case_ = await prisma.case.findFirst({ where: { id: case_id, tenant_id } })
      if (!case_) return reply.status(404).send({ error: 'Case not found' })
    }

    // Create job record
    const job = await prisma.bulkUploadJob.create({
      data: {
        tenant_id,
        case_id: case_id || null,
        created_by: req.user.id,
        status: 'pending',
        total_files: files.length,
        results: [],
      },
    })

    // Pre-classify all filenames in parallel (fast, no content needed)
    const classifications = await Promise.all(
      files.map(f => categoriseDocument(f.filename, f.mime_type))
    )

    // Generate presigned S3 URLs
    const presigned = await Promise.all(
      files.map(async (f, i) => {
        const safeName = f.filename.replace(/[/\\`\0]/g, '_')
        const s3Key = `tenants/${tenant_id}/${case_id || 'unlinked'}/${Date.now()}_${i}_${safeName}`
        const command = new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: s3Key,
          ContentType: f.mime_type,
        })
        const url = await getSignedUrl(s3, command, { expiresIn: 900 }) // 15 min
        return {
          filename: f.filename,
          s3_key: s3Key,
          upload_url: url,
          suggested_category: classifications[i],
          mime_type: f.mime_type,
          size_bytes: f.size_bytes,
        }
      })
    )

    return reply.send({ job_id: job.id, files: presigned })
  })

  // ── POST /v1/bulk-upload/confirm ────────────────────────────
  // After S3 uploads complete, register all documents
  app.post('/confirm', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { job_id, files } = req.body as {
      job_id: string
      files: Array<{
        filename: string
        s3_key: string
        mime_type: string
        size_bytes: number
        category: string // final category (user may have overridden)
      }>
    }

    if (!job_id || !files?.length) return reply.status(400).send({ error: 'job_id and files required' })

    const tenant_id = req.user.tenant_id
    const job = await prisma.bulkUploadJob.findFirst({ where: { id: job_id, tenant_id } })
    if (!job) return reply.status(404).send({ error: 'Upload job not found' })

    await prisma.bulkUploadJob.update({ where: { id: job_id }, data: { status: 'processing' } })

    const results: any[] = []
    let processed = 0
    let failed = 0

    // Register each document in DB
    for (const f of files) {
      try {
        // Validate S3 key belongs to this tenant
        if (!f.s3_key.startsWith(`tenants/${tenant_id}/`)) {
          results.push({ filename: f.filename, status: 'failed', error: 'Invalid S3 key' })
          failed++
          continue
        }

        const doc = await prisma.document.create({
          data: {
            tenant_id,
            case_id: job.case_id || undefined,
            filename: f.filename,
            s3_key: f.s3_key,
            mime_type: f.mime_type,
            size_bytes: f.size_bytes,
            category: f.category,
            processing_status: 'pending',
            uploaded_by: req.user.id,
          },
        })

        results.push({ filename: f.filename, document_id: doc.id, category: f.category, status: 'ok' })
        processed++
      } catch (e: any) {
        results.push({ filename: f.filename, status: 'failed', error: e.message })
        failed++
      }
    }

    const finalJob = await prisma.bulkUploadJob.update({
      where: { id: job_id },
      data: {
        status: failed === files.length ? 'failed' : 'done',
        processed_files: processed,
        failed_files: failed,
        results,
      },
    })

    return reply.send({ job: finalJob, results })
  })

  // ── GET /v1/bulk-upload/jobs/:id ────────────────────────────
  app.get('/jobs/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const job = await prisma.bulkUploadJob.findFirst({
      where: { id, tenant_id: req.user.tenant_id },
    })
    if (!job) return reply.status(404).send({ error: 'Job not found' })
    return reply.send({ job })
  })
}
