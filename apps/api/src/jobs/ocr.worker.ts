// ============================================================
// LexAI India — Document OCR Worker
// PRD v1.1 DM-01 — Document Digitisation Pipeline
// LlamaParse → text extraction → Voyage AI embeddings → pgvector
// ============================================================

import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const prisma = new PrismaClient();
const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

// ── Download file from S3 as Buffer ──────────────────────────
async function downloadFromS3(s3Key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: s3Key,
  });
  const response = await s3.send(command);
  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// ── LlamaParse OCR ────────────────────────────────────────────
async function extractTextWithLlamaParse(buffer: Buffer, mimeType: string): Promise<string> {
  if (!process.env.LLAMA_CLOUD_API_KEY) {
    console.warn('[OCR Worker] LLAMA_CLOUD_API_KEY not set — using basic text extraction fallback');
    // Fallback: try to decode as UTF-8 text (works for .txt files)
    return buffer.toString('utf-8').substring(0, 50000);
  }

  // LlamaParse API — upload file for parsing
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append('file', blob, 'document.pdf');
  formData.append('result_type', 'text');
  formData.append('language', 'en');
  formData.append('page_separator', '\n--- Page Break ---\n');

  const uploadRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.LLAMA_CLOUD_API_KEY}` },
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error(`LlamaParse upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  }

  const uploadData = await uploadRes.json() as { id: string };
  const jobId = uploadData.id;

  // Poll for result (max 120 seconds)
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
      headers: { Authorization: `Bearer ${process.env.LLAMA_CLOUD_API_KEY}` },
    });
    const status = await statusRes.json() as { status: string; error?: string };

    if (status.status === 'SUCCESS') {
      const resultRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/text`, {
        headers: { Authorization: `Bearer ${process.env.LLAMA_CLOUD_API_KEY}` },
      });
      const result = await resultRes.json() as { text?: string };
      return result.text || '';
    }

    if (status.status === 'ERROR') {
      throw new Error(`LlamaParse job failed: ${status.error || 'Unknown error'}`);
    }
  }

  throw new Error('LlamaParse timed out after 120 seconds');
}

// ── Voyage AI Embeddings ──────────────────────────────────────
async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.VOYAGE_API_KEY) {
    console.warn('[OCR Worker] VOYAGE_API_KEY not set — skipping embeddings');
    return [];
  }

  // Truncate to ~100k characters (Voyage Law-2 context limit)
  const truncated = text.substring(0, 100000);

  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'voyage-law-2',
      input: truncated,
      input_type: 'document',
    }),
  });

  if (!res.ok) {
    throw new Error(`Voyage AI error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding; // 1536-dimensional vector
}

// ── Count pages ───────────────────────────────────────────────
function estimatePageCount(text: string): number {
  const breaks = (text.match(/--- Page Break ---/g) || []).length;
  return Math.max(1, breaks + 1);
}

// ── Auto-suggest document category ───────────────────────────
function suggestCategory(filename: string, text: string): string | null {
  const lower = (filename + ' ' + text.substring(0, 500)).toLowerCase();

  if (lower.includes('first information report') || lower.includes('f.i.r') || lower.includes('fir no')) return 'fir';
  if (lower.includes('chargesheet') || lower.includes('charge sheet') || lower.includes('police report')) return 'chargesheet';
  if (lower.includes('bail') && (lower.includes('granted') || lower.includes('order'))) return 'bail_order';
  if (lower.includes('examination-in-chief') || lower.includes('cross examination') || lower.includes('deposition')) return 'deposition';
  if (lower.includes('judgment') || lower.includes('judgement')) return 'judgment';
  if (lower.includes('order') && lower.includes('court')) return 'order';
  if (lower.includes('affidavit')) return 'affidavit';
  if (lower.includes('plaint') || lower.includes('suit no')) return 'plaint';
  if (lower.includes('written statement')) return 'written_statement';
  if (lower.includes('vakalatnama') || lower.includes('vakalat')) return 'vakalatnama';
  if (lower.includes('forensic') || lower.includes('medical') || lower.includes('post mortem') || lower.includes('mlc')) return 'forensic_report';
  if (lower.includes('statement') && lower.includes('witness')) return 'witness_statement';

  return null;
}

// ── Main Worker ───────────────────────────────────────────────
const worker = new Worker('document-ocr', async (job: Job) => {
  const { document_id, s3_key, mime_type, tenant_id, case_id } = job.data;

  console.log(`[OCR Worker] Processing document ${document_id} (${mime_type})`);

  // Mark as processing
  await prisma.document.update({
    where: { id: document_id },
    data: { processing_status: 'processing' },
  });

  try {
    const document = await prisma.document.findUnique({
      where: { id: document_id },
      select: { filename: true, doc_category: true },
    });

    // 1. Download from S3
    console.log(`[OCR Worker] Downloading from S3: ${s3_key}`);
    const buffer = await downloadFromS3(s3_key);

    // 2. Extract text
    let extractedText = '';

    if (mime_type === 'text/plain') {
      // Plain text — read directly
      extractedText = buffer.toString('utf-8');
    } else if (mime_type.startsWith('image/')) {
      // Image — use LlamaParse (handles OCR)
      extractedText = await extractTextWithLlamaParse(buffer, mime_type);
    } else if (mime_type === 'application/pdf') {
      // PDF — use LlamaParse
      extractedText = await extractTextWithLlamaParse(buffer, mime_type);
    } else {
      // Other formats (docx etc.) — try LlamaParse or skip
      try {
        extractedText = await extractTextWithLlamaParse(buffer, mime_type);
      } catch {
        console.warn(`[OCR Worker] Could not extract text from ${mime_type} — storing without text`);
      }
    }

    const pageCount = estimatePageCount(extractedText);

    // 3. Auto-suggest category if not set
    let suggestedCategory = document?.doc_category;
    if (!suggestedCategory && extractedText && document?.filename) {
      suggestedCategory = suggestCategory(document.filename, extractedText) as any;
    }

    // 4. Generate embeddings (async — don't block status update)
    let embedding: number[] = [];
    if (extractedText.length > 50) {
      try {
        embedding = await generateEmbedding(extractedText);
      } catch (embedErr: any) {
        console.warn(`[OCR Worker] Embedding generation failed: ${embedErr.message}`);
      }
    }

    // 5. Update document record
    await prisma.document.update({
      where: { id: document_id },
      data: {
        processing_status: 'ready',
        extracted_text: extractedText.substring(0, 1000000), // 1MB text limit
        page_count: pageCount,
        ...(suggestedCategory ? { doc_category: suggestedCategory } : {}),
      },
    });

    // 6. Store embedding via raw SQL (pgvector)
    if (embedding.length > 0) {
      const vectorStr = `[${embedding.join(',')}]`;
      await prisma.$executeRaw`
        UPDATE documents
        SET embedding = ${vectorStr}::vector
        WHERE id = ${document_id}::uuid
      `;
    }

    console.log(`[OCR Worker] ✅ Document ${document_id} processed. ${pageCount} pages, ${extractedText.length} chars, embedding: ${embedding.length > 0 ? 'yes' : 'no'}`);

    // 7. Notify the uploader that document is ready
    const document2 = await prisma.document.findUnique({
      where: { id: document_id },
      select: { uploaded_by: true, filename: true },
    });

    if (document2) {
      await prisma.notification.create({
        data: {
          tenant_id,
          user_id: document2.uploaded_by,
          type: 'system',
          title: 'Document ready',
          message: `"${document2.filename}" has been processed and is ready for AI analysis.`,
          action_url: `/cases/${case_id}/documents`,
          related_case_id: case_id,
        },
      });
    }

    return { document_id, pages: pageCount, text_length: extractedText.length };

  } catch (error: any) {
    console.error(`[OCR Worker] ❌ Failed to process ${document_id}:`, error.message);

    await prisma.document.update({
      where: { id: document_id },
      data: { processing_status: 'failed' },
    });

    throw error;
  }
}, {
  connection: redis,
  concurrency: 2,           // reduced from 5
  stalledInterval: 300000,  // check for stalled jobs every 5 min (default 30s) — saves ~90% Redis polls
  lockDuration: 300000,     // 5 min lock (matches stalledInterval)
  lockRenewTime: 150000,    // renew lock every 2.5 min
  drainDelay: 5000,         // wait 5s between polling for new jobs (default 5ms!) — massive saving
  maxStalledCount: 2,
});

worker.on('completed', (job) => {
  console.log(`[OCR Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[OCR Worker] Job ${job?.id} failed:`, err.message);
});

console.log('📄 LexAI Document OCR Worker started...');

process.on('SIGTERM', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
