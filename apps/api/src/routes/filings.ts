// ============================================================
// LexAI India — Filing Repository AI Draft Route
// POST /v1/filings/ai-draft
// Proxies the Anthropic API call server-side to avoid CORS
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const filingRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /v1/filings/ai-draft
  fastify.post('/ai-draft', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { filing_name, ai_prompt_hint, relevant_sections, case_context } = request.body as {
      filing_name: string;
      ai_prompt_hint: string;
      relevant_sections?: string[];
      case_context?: {
        title?: string;
        court?: string;
        case_type?: string;
        perspective?: string;
        cnr_number?: string;
        filed_date?: string;
        metadata?: {
          sections_charged?: string[];
          client_name?: string;
          accused_names?: string[];
        };
      };
    };

    if (!filing_name || !ai_prompt_hint) {
      return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'filing_name and ai_prompt_hint are required' } });
    }

    const caseInfo = case_context
      ? `
Case Title: ${case_context.title || '[Case Title]'}
Court: ${case_context.court || '[Court Name]'}
Case Type: ${(case_context.case_type || '').replace(/_/g, ' ')}
Perspective: ${case_context.perspective || 'defence'}
Sections: ${(case_context.metadata?.sections_charged || []).join(', ') || 'Not specified'}
CNR Number: ${case_context.cnr_number || '[CNR Number]'}
Filed Date: ${case_context.filed_date ? new Date(case_context.filed_date).toLocaleDateString('en-IN') : '[Date]'}
`.trim()
      : 'No specific case selected — use placeholders in [SQUARE BRACKETS] for case-specific details.';

    const prompt = `You are a senior Indian advocate with 20+ years of experience drafting court documents. Draft the following legal document.

DOCUMENT TYPE: ${filing_name}
INSTRUCTIONS: ${ai_prompt_hint}

CASE INFORMATION:
${caseInfo}

APPLICABLE LAW: ${(relevant_sections || []).join(', ') || 'As applicable under Indian law'}

DRAFTING RULES:
1. Use formal Indian court language and proper legal terminology throughout
2. For matters post-July 2024: use BNS/BNSS/BSA; for older matters: use IPC/CrPC/IEA
3. Address the court appropriately (My Lord for SC/HC, Your Honour for district courts)
4. Include all standard sections: Header, Parties, Facts, Grounds, Prayer
5. Use [PLACEHOLDER] for any missing information
6. Do NOT use markdown — plain text only, suitable for printing
7. Number the paragraphs
8. End with a proper Prayer clause starting "It is therefore most respectfully prayed..."
9. Include signature block at the end

Draft the complete ${filing_name} now:`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content.find(c => c.type === 'text')?.text || '';

      return reply.send({
        data: {
          draft: text,
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
