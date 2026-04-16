// ============================================================
// LexAI India — Filing Repository AI Draft Route
// POST /v1/filings/ai-draft
// Generates or improves legal document drafts using Claude
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const filingRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /v1/filings/ai-draft
  fastify.post('/ai-draft', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const {
      filing_name,
      doc_type,
      ai_prompt_hint,
      relevant_sections,
      case_context,
      existing_content,
    } = request.body as {
      filing_name: string;
      doc_type?: string;
      ai_prompt_hint?: string;
      relevant_sections?: string[];
      existing_content?: string | null;
      case_context?: {
        title?: string;
        court?: string;
        case_type?: string;
        court_level?: string;
        perspective?: string;
        cnr_number?: string;
        filed_date?: string;
        status?: string;
        metadata?: {
          sections_charged?: string[];
          client_name?: string;
          accused_names?: string[];
          opposite_party?: string;
          judge_name?: string;
          police_station?: string;
          fir_number?: string;
        };
      };
    };

    if (!filing_name) {
      return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'filing_name is required' } });
    }

    const hasCase = case_context && (case_context.title || case_context.court || case_context.cnr_number);

    const caseBlock = hasCase ? `
CASE DETAILS (use these exact values — do not use placeholders for these fields):
- Case Title: ${case_context!.title || '[Case Title]'}
- Court: ${case_context!.court || '[Court]'}
- CNR Number: ${case_context!.cnr_number || '[CNR Number]'}
- Case Type: ${(case_context!.case_type || '').replace(/_/g, ' ') || '[Case Type]'}
- Court Level: ${(case_context!.court_level || '').replace(/_/g, ' ') || '[Court Level]'}
- Perspective: We appear for the ${case_context!.perspective === 'prosecution' ? 'prosecution / complainant' : case_context!.perspective === 'defence' ? 'accused / defendant' : 'petitioner'}
- Filed Date: ${case_context!.filed_date ? new Date(case_context!.filed_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '[Date]'}
- Case Status: ${(case_context!.status || '').replace(/_/g, ' ') || '[Status]'}
- Sections / Law: ${(case_context!.metadata?.sections_charged || []).join(', ') || 'As applicable'}
- Client Name: ${case_context!.metadata?.client_name || '[Client Name]'}
- Opposite Party: ${case_context!.metadata?.accused_names?.join(', ') || case_context!.metadata?.opposite_party || '[Opposite Party]'}
- Police Station: ${case_context!.metadata?.police_station || '[If applicable]'}
- FIR Number: ${case_context!.metadata?.fir_number || '[If applicable]'}`.trim()
    : 'No case selected — use [PLACEHOLDER] for all case-specific details.';

    const docTypeLabel = (doc_type || filing_name).replace(/_/g, ' ');
    const isImproving = existing_content && existing_content.trim().length > 50;

    const prompt = isImproving
      ? `You are a senior Indian advocate. Improve the following draft legal document.

DOCUMENT: ${filing_name}

${caseBlock}

CURRENT DRAFT TO IMPROVE:
${existing_content}

INSTRUCTIONS:
1. Replace every [PLACEHOLDER] with the actual case details above
2. Fill case title, court, CNR number, party names throughout the document
3. Improve legal language — make it more precise and formal
4. Ensure all sections exist: Header, Parties, Facts, Grounds, Prayer, Signature
5. Fix any errors in citations, section numbers, or legal terminology
6. Use BNS/BNSS/BSA for post-July 2024; IPC/CrPC for older matters
7. Plain text only — no markdown
8. Return the COMPLETE improved document

Improved ${filing_name}:`

      : `You are a senior Indian advocate with 20+ years of experience. Draft a complete legal document for an Indian court.

DOCUMENT: ${filing_name} (${docTypeLabel})
${ai_prompt_hint ? `BRIEF: ${ai_prompt_hint}` : ''}

${caseBlock}

APPLICABLE LAW: ${(relevant_sections || []).join(', ') || 'As applicable under Indian law'}

RULES:
1. Formal Indian court language throughout
2. Address as "My Lord"/"Your Lordship" for SC/HC; "Your Honour" for district courts
3. BNS/BNSS/BSA for post-July 2024 matters; IPC/CrPC/IEA for older matters
4. Structure: Court Header → Case/CNR Number → Parties → Document Title → Numbered Facts → Lettered Grounds → Prayer → Signature
5. Use the EXACT case details above — the case title, court, CNR, party names must appear verbatim in the document
6. Only use [PLACEHOLDER] for details genuinely not provided
7. Plain text only — no markdown, no asterisks, no headers with ##
8. Number all paragraphs in Facts section
9. Prayer: "It is therefore most respectfully prayed that this Hon'ble Court may be pleased to:"
10. End with signature block: "Filed by: Advocate for [Party]\nDate: [Date]\nPlace: [City]"

Draft the complete ${filing_name} now:`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content.find((c: any) => c.type === 'text')?.text || '';

      if (!text) {
        return reply.status(500).send({
          error: { code: 'EMPTY_RESPONSE', message: 'AI returned empty response. Please try again.' },
        });
      }

      return reply.send({
        data: {
          draft: text,
          mode: isImproving ? 'improved' : 'generated',
          tokens_used: response.usage.input_tokens + response.usage.output_tokens,
        },
      });

    } catch (err: any) {
      console.error('[Filings] AI draft failed:', err.message);
      return reply.status(500).send({
        error: { code: 'AI_FAILED', message: 'Failed to generate draft. Please try again.' },
      });
    }
  });
};
