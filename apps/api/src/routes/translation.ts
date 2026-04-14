// ============================================================
// LexAI India — Document Translation Route
// Auto-detects language from extracted_text / OCR
// Translates all 22 Indian scheduled languages → English
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

// All 22 Indian scheduled languages + common variants
const INDIAN_LANGUAGES: Record<string, string> = {
  // Indic scripts
  'hi': 'Hindi', 'mr': 'Marathi', 'gu': 'Gujarati', 'pa': 'Punjabi',
  'bn': 'Bengali', 'or': 'Odia', 'as': 'Assamese', 'sa': 'Sanskrit',
  'ne': 'Nepali', 'kok': 'Konkani', 'mai': 'Maithili', 'doi': 'Dogri',
  'ks': 'Kashmiri', 'sd': 'Sindhi', 'bho': 'Bhojpuri',
  // Dravidian
  'ta': 'Tamil', 'te': 'Telugu', 'kn': 'Kannada', 'ml': 'Malayalam',
  // Others
  'ur': 'Urdu', 'mni': 'Manipuri', 'sat': 'Santali',
};

export const translationRoutes: FastifyPluginAsync = async (fastify) => {

  // ── POST /v1/documents/:id/translate ──────────────────
  // Triggers translation — uses extracted_text if available, else fetches from S3 as image
  fastify.post('/:id/translate', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };
    const { force = false } = request.body as { force?: boolean };

    const doc = await fastify.prisma.document.findFirst({
      where: { id, tenant_id },
    });

    if (!doc) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Document not found' } });

    // Check if already translated (stored in a JSON metadata field or we use a separate approach)
    // We store translation in extracted_text prefixed with [TRANSLATION] marker
    // and detected language in doc metadata JSONB
    const meta = (doc as any).metadata as any || {};
    if (meta.translation && !force) {
      return reply.send({
        data: {
          status: 'already_translated',
          detected_language: meta.detected_language,
          translation: meta.translation,
        },
      });
    }

    // Start async translation — return immediately, client polls
    reply.send({ data: { status: 'translating', doc_id: id } });

    // Run translation in background
    setImmediate(async () => {
      try {
        let textToTranslate = doc.extracted_text || '';
        let isImageDoc = false;

        // If no extracted text, fetch the document as image for vision-based OCR+translation
        if (!textToTranslate && doc.processing_status === 'ready') {
          const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: doc.s3_key,
          });
          // We'll pass the S3 URL to Claude vision
          const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
          isImageDoc = true;

          // Use Claude vision to OCR + translate in one shot
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'url', url: signedUrl },
                },
                {
                  type: 'text',
                  text: `This is a legal document from India. It may be in any Indian language (Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia, Urdu, or any other Indian language) or a mix of languages.

Please:
1. Identify the primary language of this document
2. Extract all text from the document (OCR if needed)
3. Translate the full text to English, preserving legal terminology and structure

Respond in this exact JSON format:
{
  "detected_language": "language name in English",
  "language_code": "ISO code",
  "confidence": "high|medium|low",
  "original_text": "full extracted text in original language",
  "english_translation": "complete English translation",
  "legal_terms": ["list", "of", "key", "legal", "terms", "found"],
  "document_type": "FIR|Chargesheet|Order|Judgment|Affidavit|Other",
  "summary": "2-3 sentence English summary of what this document is about"
}

Return ONLY valid JSON, no markdown.`,
                },
              ],
            }],
          });

          const text = (response.content[0] as any).text;
          const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const result = JSON.parse(clean);

          // Store back in document metadata
          await (fastify.prisma as any).$executeRaw`
            UPDATE documents SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
              detected_language: result.detected_language,
              language_code: result.language_code,
              translation: result.english_translation,
              original_text_extracted: result.original_text,
              translation_confidence: result.confidence,
              legal_terms: result.legal_terms,
              document_type_detected: result.document_type,
              translation_summary: result.summary,
              translated_at: new Date().toISOString(),
              translation_model: 'claude-sonnet-4-6',
            })}::jsonb
            WHERE id = ${id}::uuid
          `;

          // Also update extracted_text if it was empty
          if (!doc.extracted_text && result.original_text) {
            await fastify.prisma.document.update({
              where: { id },
              data: { extracted_text: result.original_text },
            });
          }

          console.log(`[Translation] ✅ Image doc ${id}: ${result.detected_language} → English`);

        } else if (textToTranslate) {
          // Text-based translation — we have extracted_text already
          // First detect language
          const detectResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 3000,
            messages: [{
              role: 'user',
              content: `This is extracted text from an Indian legal document. Translate it to English.

Original text (first 4000 chars):
${textToTranslate.slice(0, 4000)}

Respond in this exact JSON format:
{
  "detected_language": "language name in English",
  "language_code": "ISO code or 'en' if already English",
  "confidence": "high|medium|low",
  "is_already_english": true/false,
  "english_translation": "complete English translation (or original if already English)",
  "legal_terms": ["key", "legal", "terms"],
  "document_type": "FIR|Chargesheet|Order|Judgment|Affidavit|Deposition|Other",
  "summary": "2-3 sentence English summary"
}

Return ONLY valid JSON.`,
            }],
          });

          const text2 = (detectResponse.content[0] as any).text;
          const clean2 = text2.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const result2 = JSON.parse(clean2);

          if (result2.is_already_english) {
            await (fastify.prisma as any).$executeRaw`
              UPDATE documents SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
                detected_language: 'English',
                language_code: 'en',
                translation: null,
                is_already_english: true,
                legal_terms: result2.legal_terms,
                document_type_detected: result2.document_type,
                translation_summary: result2.summary,
                translated_at: new Date().toISOString(),
              })}::jsonb
              WHERE id = ${id}::uuid
            `;
            console.log(`[Translation] Doc ${id} is already in English`);
          } else {
            await (fastify.prisma as any).$executeRaw`
              UPDATE documents SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
                detected_language: result2.detected_language,
                language_code: result2.language_code,
                translation: result2.english_translation,
                translation_confidence: result2.confidence,
                legal_terms: result2.legal_terms,
                document_type_detected: result2.document_type,
                translation_summary: result2.summary,
                translated_at: new Date().toISOString(),
                translation_model: 'claude-sonnet-4-6',
              })}::jsonb
              WHERE id = ${id}::uuid
            `;
            console.log(`[Translation] ✅ Text doc ${id}: ${result2.detected_language} → English`);
          }
        }
      } catch (err: any) {
        console.error(`[Translation] ❌ Failed for doc ${id}:`, err.message);
        await (fastify.prisma as any).$executeRaw`
          UPDATE documents SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
            translation_error: err.message,
            translation_failed_at: new Date().toISOString(),
          })}::jsonb
          WHERE id = ${id}::uuid
        `;
      }
    });
  });

  // ── GET /v1/documents/:id/translation ─────────────────
  // Poll for translation status + result
  fastify.get('/:id/translation', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { id } = request.params as { id: string };

    const doc = await fastify.prisma.document.findFirst({
      where: { id, tenant_id },
      select: { id: true, filename: true, processing_status: true, extracted_text: true },
    });

    if (!doc) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Document not found' } });

    // Read metadata via raw query since Prisma model doesn't have it typed
    const result = await (fastify.prisma as any).$queryRaw`
      SELECT metadata FROM documents WHERE id = ${id}::uuid
    `;

    const meta = result?.[0]?.metadata || {};

    if (meta.translation_error) {
      return reply.send({
        data: {
          status: 'failed',
          error: meta.translation_error,
          doc_id: id,
        },
      });
    }

    if (meta.translation || meta.is_already_english) {
      return reply.send({
        data: {
          status: 'done',
          doc_id: id,
          filename: doc.filename,
          detected_language: meta.detected_language,
          language_code: meta.language_code,
          is_already_english: meta.is_already_english || false,
          translation: meta.translation || null,
          translation_confidence: meta.translation_confidence,
          legal_terms: meta.legal_terms || [],
          document_type: meta.document_type_detected,
          summary: meta.translation_summary,
          translated_at: meta.translated_at,
        },
      });
    }

    // Still translating
    return reply.send({
      data: {
        status: 'translating',
        doc_id: id,
      },
    });
  });

  // ── POST /v1/documents/auto-translate-batch ────────────
  // Called after OCR completes — auto-detect and translate if non-English
  fastify.post('/auto-translate-batch', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { case_id } = request.body as { case_id: string };

    // Find all ready docs in the case without translation yet
    const docs = await fastify.prisma.document.findMany({
      where: { case_id, tenant_id, processing_status: 'ready' },
      select: { id: true, filename: true, extracted_text: true },
    });

    // Filter to docs without translation (check metadata via raw query)
    const untranslated = await Promise.all(
      docs.map(async (doc) => {
        const result = await (fastify.prisma as any).$queryRaw`
          SELECT metadata->>'detected_language' as lang FROM documents WHERE id = ${doc.id}::uuid
        `;
        return result?.[0]?.lang ? null : doc.id;
      })
    );

    const toTranslate = untranslated.filter(Boolean) as string[];

    // Queue each for translation (non-blocking)
    toTranslate.forEach(docId => {
      // Simulate the translate POST internally
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/documents/${docId}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${request.headers.authorization?.split(' ')[1]}` },
        body: JSON.stringify({}),
      }).catch(() => {});
    });

    return reply.send({ data: { queued: toTranslate.length, doc_ids: toTranslate } });
  });
};
