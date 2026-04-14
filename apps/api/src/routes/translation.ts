// ============================================================
// LexAI India — Document Translation Route  v2
// Stores translation as a sibling Document record with
// filename = "[original] — English Translation"
// Original file is always preserved untouched.
//
// POST /v1/documents/:id/translate
// GET  /v1/documents/:id/translation
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const translationRoutes: FastifyPluginAsync = async (fastify) => {

  // ── GET /v1/documents/:id/translation ─────────────────
  fastify.get('/:id/translation', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };

    const doc = await fastify.prisma.document.findFirst({
      where: { id, tenant_id },
      select: { id: true, filename: true, processing_status: true },
    });

    if (!doc) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Document not found' } });

    // Find the translated sibling document
    const translatedDoc = await fastify.prisma.document.findFirst({
      where: {
        tenant_id,
        previous_version_id: id,
        filename: { contains: 'English Translation' },
      },
      select: { id: true, filename: true, extracted_text: true, processing_status: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });

    if (!translatedDoc) {
      return reply.send({ data: { status: 'idle', doc_id: id } });
    }

    if (translatedDoc.processing_status === 'processing') {
      return reply.send({ data: { status: 'translating', doc_id: id } });
    }

    if (translatedDoc.processing_status === 'failed') {
      const errData = translatedDoc.extracted_text ? JSON.parse(translatedDoc.extracted_text) : {};
      return reply.send({ data: { status: 'failed', doc_id: id, error: errData.error || 'Translation failed' } });
    }

    if (translatedDoc.processing_status === 'ready' && translatedDoc.extracted_text) {
      try {
        const stored = JSON.parse(translatedDoc.extracted_text);
        return reply.send({
          data: {
            status: 'done',
            doc_id: id,
            translated_doc_id: translatedDoc.id,
            filename: doc.filename,
            translated_filename: translatedDoc.filename,
            detected_language: stored.detected_language,
            language_code: stored.language_code,
            is_already_english: stored.is_already_english || false,
            translation: stored.translation,
            translation_confidence: stored.confidence,
            legal_terms: stored.legal_terms || [],
            document_type: stored.document_type,
            summary: stored.summary,
            translated_at: translatedDoc.created_at,
          },
        });
      } catch {
        return reply.send({
          data: {
            status: 'done',
            doc_id: id,
            translated_doc_id: translatedDoc.id,
            filename: doc.filename,
            translated_filename: translatedDoc.filename,
            translation: translatedDoc.extracted_text,
          },
        });
      }
    }

    return reply.send({ data: { status: 'idle', doc_id: id } });
  });

  // ── POST /v1/documents/:id/translate ──────────────────
  fastify.post('/:id/translate', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id, id: user_id } = request.user;
    const { id } = request.params as { id: string };
    const { force = false } = request.body as { force?: boolean };

    const doc = await fastify.prisma.document.findFirst({
      where: { id, tenant_id },
    });

    if (!doc) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Document not found' } });

    // Check if already translated (and not forcing)
    if (!force) {
      const existing = await fastify.prisma.document.findFirst({
        where: { tenant_id, previous_version_id: id, filename: { contains: 'English Translation' }, processing_status: { in: ['ready', 'processing'] } },
      });
      if (existing) {
        return reply.send({ data: { status: existing.processing_status === 'processing' ? 'translating' : 'already_translated', translated_doc_id: existing.id } });
      }
    }

    // Build translated filename
    const ext = doc.filename.match(/\.(pdf|jpg|jpeg|png|docx?)$/i)?.[1] || '';
    const baseName = ext ? doc.filename.slice(0, -(ext.length + 1)) : doc.filename;
    const translatedFilename = `${baseName} — English Translation.txt`;

    // Create placeholder record immediately so GET can poll it
    const placeholder = await fastify.prisma.document.create({
      data: {
        tenant_id,
        case_id: doc.case_id,
        filename: translatedFilename,
        s3_key: `tenants/${tenant_id}/translations/${id}_${Date.now()}.txt`,
        mime_type: 'text/plain',
        file_size_bytes: BigInt(0),
        doc_category: doc.doc_category,
        processing_status: 'processing',
        previous_version_id: id,
        uploaded_by: user_id,
        version_number: 1,
      },
    });

    // Respond immediately
    reply.send({ data: { status: 'translating', doc_id: id, translated_doc_id: placeholder.id } });

    // Run translation in background
    setImmediate(async () => {
      try {
        let result: any = null;

        const hasText = doc.extracted_text && doc.extracted_text.trim().length > 80;
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.filename);

        if (hasText) {
          // ── Text-based translation ──────────────────────
          console.log(`[Translation] Text translation for ${doc.filename} (${doc.extracted_text!.length} chars)`);

          const res = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: `This is text from an Indian legal document. Detect its language and translate to English.

Text (first 6000 chars):
${doc.extracted_text!.slice(0, 6000)}

Reply ONLY with valid JSON — no markdown, no explanation:
{
  "detected_language": "Hindi",
  "language_code": "hi",
  "confidence": "high",
  "is_already_english": false,
  "translation": "full English translation here",
  "legal_terms": ["term1", "term2"],
  "document_type": "FIR",
  "summary": "2-3 sentence summary in English"
}`,
            }],
          });

          const raw = (res.content[0] as any).text;
          result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

        } else if (isImage) {
          // ── Vision OCR + translation ─────────────────────
          console.log(`[Translation] Vision OCR+translation for ${doc.filename}`);

          const signedUrl = await getSignedUrl(s3, new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: doc.s3_key,
          }), { expiresIn: 300 });

          const res = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'url', url: signedUrl } },
                {
                  type: 'text',
                  text: `This is an image of an Indian legal document. OCR all text, identify the language, then translate to English.

Reply ONLY with valid JSON — no markdown, no explanation:
{
  "detected_language": "Hindi",
  "language_code": "hi",
  "confidence": "high",
  "is_already_english": false,
  "original_text": "full OCR'd text in original language",
  "translation": "full English translation",
  "legal_terms": ["term1", "term2"],
  "document_type": "FIR",
  "summary": "2-3 sentence summary in English"
}`,
                },
              ],
            }],
          });

          const raw = (res.content[0] as any).text;
          result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

          // Save OCR'd text back to original doc
          if (result.original_text) {
            await fastify.prisma.document.update({
              where: { id },
              data: { extracted_text: result.original_text },
            }).catch(() => {});
          }

        } else {
          throw new Error('Document has no extracted text yet. Please wait for OCR to complete, then try again.');
        }

        if (!result?.translation && !result?.is_already_english) {
          throw new Error('Claude returned an empty translation.');
        }

        // Store translation result as JSON in the placeholder doc's extracted_text
        const stored = JSON.stringify({
          detected_language: result.detected_language || 'Unknown',
          language_code: result.language_code || 'xx',
          confidence: result.confidence || 'medium',
          is_already_english: result.is_already_english || false,
          translation: result.is_already_english
            ? (doc.extracted_text || result.original_text || '')
            : (result.translation || ''),
          legal_terms: result.legal_terms || [],
          document_type: result.document_type || 'Other',
          summary: result.summary || '',
        });

        await fastify.prisma.document.update({
          where: { id: placeholder.id },
          data: {
            processing_status: 'ready',
            extracted_text: stored,
            file_size_bytes: BigInt(stored.length),
            page_count: 1,
          },
        });

        console.log(`[Translation] ✅ ${doc.filename}: ${result.detected_language} → English`);

      } catch (err: any) {
        console.error(`[Translation] ❌ ${doc.filename}:`, err.message);
        await fastify.prisma.document.update({
          where: { id: placeholder.id },
          data: {
            processing_status: 'failed',
            extracted_text: JSON.stringify({ error: err.message }),
          },
        }).catch(() => {});
      }
    });
  });
};
