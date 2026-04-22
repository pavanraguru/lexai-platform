#!/bin/bash
# ============================================================
# LexAI India — Fix OCR Worker (no Redis)
#
# Problem: OCR worker uses BullMQ which requires Redis.
# Railway has no Redis → worker crashes on startup.
#
# Fix:
#   1. Rewrite ocr.worker.ts to poll DB for pending documents
#      (same inline pattern as agent worker — zero Redis)
#   2. Rewrite documents.ts to trigger OCR inline (fire-and-forget)
#      instead of pushing to a BullMQ queue
#
# Run from lexai-platform root:
#   cd ~/Desktop/lexai-platform && bash fix-ocr-worker.sh
# ============================================================

set -e

if [ ! -f "package.json" ] || [ ! -d "apps/api" ]; then
  echo "❌  Run from lexai-platform root: cd ~/Desktop/lexai-platform"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       LexAI India — Fix OCR Worker (no Redis)       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── FIX 1: Rewrite ocr.worker.ts — remove Redis, poll DB instead ─────────────
echo "📄  Fix 1: Rewriting apps/api/src/jobs/ocr.worker.ts ..."
python3 << 'PYEOF'
path = 'apps/api/src/jobs/ocr.worker.ts'

new_content = '''// ============================================================
// LexAI India — Document OCR Worker (No-Redis Mode)
// Polls DB every 5s for pending documents and processes inline.
// No BullMQ / Redis dependency — works on Railway without Redis.
// ============================================================

import \'dotenv/config\';
import { PrismaClient } from \'@prisma/client\';

const rawDbUrl = process.env.DATABASE_URL || \'\';
const workerDbUrl = rawDbUrl.includes(\'connection_limit\')
  ? rawDbUrl
  : rawDbUrl + (rawDbUrl.includes(\'?\') ? \'&\' : \'?\') + \'connection_limit=1&pool_timeout=20\';

const prisma = new PrismaClient({ datasources: { db: { url: workerDbUrl } } });

// ── LlamaParse OCR ────────────────────────────────────────────
async function extractTextWithLlamaParse(buffer: Buffer, mimeType: string): Promise<string> {
  if (!process.env.LLAMA_CLOUD_API_KEY) {
    console.warn(\'[OCR Worker] LLAMA_CLOUD_API_KEY not set — using text fallback\');
    return buffer.toString(\'utf-8\').substring(0, 50000);
  }

  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append(\'file\', blob, \'document.pdf\');
  formData.append(\'result_type\', \'text\');
  formData.append(\'language\', \'en\');
  formData.append(\'page_separator\', \'\\n--- Page Break ---\\n\');

  const uploadRes = await fetch(\'https://api.cloud.llamaindex.ai/api/parsing/upload\', {
    method: \'POST\',
    headers: { Authorization: `Bearer ${process.env.LLAMA_CLOUD_API_KEY}` },
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error(`LlamaParse upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  }

  const uploadData = await uploadRes.json() as { id: string };
  const jobId = uploadData.id;

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
      headers: { Authorization: `Bearer ${process.env.LLAMA_CLOUD_API_KEY}` },
    });
    const status = await statusRes.json() as { status: string; error?: string };

    if (status.status === \'SUCCESS\') {
      const resultRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/text`, {
        headers: { Authorization: `Bearer ${process.env.LLAMA_CLOUD_API_KEY}` },
      });
      const result = await resultRes.json() as { text?: string };
      return result.text || \'\';
    }
    if (status.status === \'ERROR\') {
      throw new Error(`LlamaParse job failed: ${status.error || \'Unknown error\'}`);
    }
  }
  throw new Error(\'LlamaParse timed out after 120 seconds\');
}

// ── Download from Supabase Storage ───────────────────────────
async function downloadFile(s3Key: string): Promise<Buffer> {
  // Supabase Storage public URL pattern
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl && supabaseKey) {
    const bucket = \'documents\';
    const url = `${supabaseUrl}/storage/v1/object/${bucket}/${s3Key}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
    });
    if (!res.ok) throw new Error(`Storage download failed: ${res.status} for key ${s3Key}`);
    return Buffer.from(await res.arrayBuffer());
  }

  // Fallback: AWS S3
  const { S3Client, GetObjectCommand } = await import(\'@aws-sdk/client-s3\') as any;
  const { Readable } = await import(\'stream\') as any;
  const s3 = new S3Client({ region: process.env.AWS_REGION || \'ap-south-1\' });
  const response = await s3.send(new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET!, Key: s3Key }));
  const stream = response.Body as any;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function estimatePageCount(text: string): number {
  return Math.max(1, (text.match(/--- Page Break ---/g) || []).length + 1);
}

function suggestCategory(filename: string, text: string): string | null {
  const lower = (filename + \' \' + text.substring(0, 500)).toLowerCase();
  if (lower.includes(\'first information report\') || lower.includes(\'f.i.r\') || lower.includes(\'fir no\')) return \'fir\';
  if (lower.includes(\'chargesheet\') || lower.includes(\'charge sheet\')) return \'chargesheet\';
  if (lower.includes(\'bail\') && (lower.includes(\'granted\') || lower.includes(\'order\'))) return \'bail_order\';
  if (lower.includes(\'examination-in-chief\') || lower.includes(\'cross examination\') || lower.includes(\'deposition\')) return \'deposition\';
  if (lower.includes(\'judgment\') || lower.includes(\'judgement\')) return \'judgment\';
  if (lower.includes(\'affidavit\')) return \'affidavit\';
  if (lower.includes(\'plaint\') || lower.includes(\'suit no\')) return \'plaint\';
  if (lower.includes(\'written statement\')) return \'written_statement\';
  if (lower.includes(\'vakalatnama\') || lower.includes(\'vakalat\')) return \'vakalatnama\';
  if (lower.includes(\'forensic\') || lower.includes(\'post mortem\') || lower.includes(\'mlc\')) return \'forensic_report\';
  if (lower.includes(\'witness\') && lower.includes(\'statement\')) return \'witness_statement\';
  return null;
}

// ── Process a single pending document ────────────────────────
async function processDocument(doc: {
  id: string; s3_key: string; mime_type: string;
  filename: string; doc_category: string | null;
  tenant_id: string; case_id: string | null;
  uploaded_by: string;
}) {
  console.log(`[OCR Worker] Processing ${doc.id} — ${doc.filename} (${doc.mime_type})`);

  await prisma.document.update({
    where: { id: doc.id },
    data: { processing_status: \'processing\' },
  });

  try {
    const buffer = await downloadFile(doc.s3_key);

    let extractedText = \'\';
    if (doc.mime_type === \'text/plain\') {
      extractedText = buffer.toString(\'utf-8\');
    } else if (doc.mime_type.startsWith(\'image/\') || doc.mime_type === \'application/pdf\') {
      extractedText = await extractTextWithLlamaParse(buffer, doc.mime_type);
    } else {
      try { extractedText = await extractTextWithLlamaParse(buffer, doc.mime_type); }
      catch { console.warn(`[OCR Worker] Could not extract text from ${doc.mime_type}`); }
    }

    const pageCount = estimatePageCount(extractedText);
    const suggestedCat = !doc.doc_category && extractedText
      ? suggestCategory(doc.filename, extractedText)
      : null;

    await prisma.document.update({
      where: { id: doc.id },
      data: {
        processing_status: \'ready\',
        extracted_text: extractedText.substring(0, 1000000),
        page_count: pageCount,
        ...(suggestedCat ? { doc_category: suggestedCat as any } : {}),
      },
    });

    // Notify uploader
    if (doc.uploaded_by && doc.case_id) {
      await prisma.notification.create({
        data: {
          tenant_id: doc.tenant_id,
          user_id: doc.uploaded_by,
          type: \'document_processed\',
          title: \'Document ready\',
          message: `"${doc.filename}" has been processed and is ready for AI analysis.`,
          action_url: `/cases/${doc.case_id}?tab=documents`,
          related_case_id: doc.case_id,
        },
      }).catch(() => {});
    }

    console.log(`[OCR Worker] ✅ ${doc.id} done — ${pageCount} pages, ${extractedText.length} chars`);
  } catch (err: any) {
    console.error(`[OCR Worker] ❌ Failed ${doc.id}:`, err.message);
    await prisma.document.update({
      where: { id: doc.id },
      data: { processing_status: \'failed\' },
    }).catch(() => {});
  }
}

// ── Polling loop — check DB every 5s for pending docs ────────
let isProcessing = false;

async function pollAndProcess() {
  if (isProcessing) return;
  isProcessing = true;
  try {
    const pending = await prisma.document.findMany({
      where: { processing_status: { in: [\'pending\', \'processing\'] } },
      orderBy: { created_at: \'asc\' },
      take: 3,
      select: {
        id: true, s3_key: true, mime_type: true, filename: true,
        doc_category: true, tenant_id: true, case_id: true, uploaded_by: true,
        created_at: true,
      },
    });

    // Skip documents stuck in \'processing\' for more than 10 minutes (stalled)
    const now = Date.now();
    const toProcess = pending.filter(d => {
      if (d.processing_status === \'processing\') {
        const age = now - new Date(d.created_at).getTime();
        return age > 10 * 60 * 1000; // retry after 10 min
      }
      return true;
    });

    for (const doc of toProcess) {
      await processDocument(doc as any);
    }
  } catch (err: any) {
    console.error(\'[OCR Worker] Poll error:\', err.message);
  }
  isProcessing = false;
}

console.log(\'📄 LexAI OCR Worker started (no-Redis DB polling mode)\');
setInterval(pollAndProcess, 5000);
pollAndProcess(); // run immediately on startup

process.on(\'SIGTERM\', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
'''

with open(path, 'w') as f:
    f.write(new_content)
print('    ✅  ocr.worker.ts rewritten — polls DB every 5s, zero Redis dependency')
PYEOF

# ── FIX 2: documents.ts — trigger OCR inline instead of BullMQ queue ─────────
echo ""
echo "📄  Fix 2: Patching apps/api/src/routes/documents.ts ..."
python3 << 'PYEOF'
path = 'apps/api/src/routes/documents.ts'
with open(path, 'r') as f:
    content = f.read()

# Remove bullmq import
content = content.replace("import { Queue } from 'bullmq';\n", '')
content = content.replace('import { Queue } from "bullmq";\n', '')

# Replace the ocrQueue.add block (upload route)
old_queue = """    // Enqueue OCR processing job — always catch so upload succeeds even if Redis is down/over-limit
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
    }"""

new_queue = """    // OCR is handled by the polling worker (ocr.worker.ts) which picks up
    // any document with processing_status='pending' every 5 seconds.
    // No queue push needed — document is already saved with status 'pending'.
    fastify.log.info(`[Documents] Document ${document.id} saved as pending — OCR worker will pick it up`);"""

if old_queue in content:
    content = content.replace(old_queue, new_queue)
    print('    ✅  Upload route: removed BullMQ queue push')
else:
    print('    ⚠️   Could not find ocrQueue block in upload route — check manually')

# Replace retry-ocr route queue push
old_retry = """      const ocrQueue = new Queue('document-ocr', { connection: fastify.redis });
      await ocrQueue.add('process-document', {"""
new_retry = """      // OCR worker polls for pending docs — just reset status to pending
      await fastify.prisma.document.update({ where: { id }, data: { processing_status: 'pending' } });
      // Legacy queue push removed — worker will pick it up within 5 seconds
      if (false) await (async () => { const _unused = {"""

if old_retry in content:
    # Find and replace the whole retry block more carefully
    import_idx = content.find("      const ocrQueue = new Queue('document-ocr', { connection: fastify.redis });")
    if import_idx != -1:
        # Find the end of the try block for retry
        end_marker = "      fastify.log.info(`[Documents] Retry OCR job queued for"
        end_idx = content.find(end_marker, import_idx)
        if end_idx != -1:
            end_line_end = content.find('\n', end_idx) + 1
            content = content[:import_idx] + "      // Status reset to pending — OCR worker will pick it up within 5s\n      await fastify.prisma.document.update({ where: { id }, data: { processing_status: 'pending' } });\n      fastify.log.info(`[Documents] Document ${id} reset to pending for OCR retry`);\n" + content[end_line_end:]
            print('    ✅  Retry route: removed BullMQ queue push')
        else:
            print('    ⚠️   Could not find end of retry queue block')
    else:
        print('    ⚠️   Could not find retry ocrQueue line')
else:
    print('    ℹ️   Retry queue block not found (may already be patched)')

with open(path, 'w') as f:
    f.write(content)
print('    ✅  documents.ts saved')
PYEOF

# ── GIT COMMIT & PUSH ─────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════"
echo "  Pushing to git..."
echo "══════════════════════════════════════════════════════"
echo ""

git add \
  apps/api/src/jobs/ocr.worker.ts \
  apps/api/src/routes/documents.ts

git commit -m "fix: OCR worker — remove Redis/BullMQ, poll DB every 5s for pending docs (no-Redis mode)"
git push origin main

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  Done! Pushed to main.                           ║"
echo "║                                                      ║"
echo "║  After Railway redeploys (~2 min):                   ║"
echo "║  • OCR worker starts without crashing               ║"
echo "║  • Any document uploaded will be picked up          ║"
echo "║    within 5 seconds automatically                   ║"
echo "║  • Retry OCR button also works                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
