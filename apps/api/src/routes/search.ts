// ============================================================
// LexAI India — Document Search Route
// POST /v1/search/cases/:case_id
// Supports: content search, metadata search, fuzzy, nearness
// ============================================================

import { FastifyPluginAsync } from 'fastify';

export const searchRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /v1/search/cases/:case_id
  fastify.post('/cases/:case_id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { case_id } = request.params as { case_id: string };
    const body = request.body as any;

    const {
      query = '',
      search_in = 'both',     // 'content' | 'metadata' | 'both'
      fuzziness = false,       // boolean
      fuzziness_corrections = 10,
      nearness = false,        // boolean
      nearness_words = 2,
      doc_ids,                 // optional: limit to specific doc IDs
    } = body;

    if (!query.trim()) {
      return reply.status(400).send({ error: { code: 'EMPTY_QUERY', message: 'Search query is required' } });
    }

    // Verify case belongs to tenant
    const caseRecord = await fastify.prisma.case.findFirst({
      where: { id: case_id, tenant_id },
      select: { id: true },
    });
    if (!caseRecord) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Case not found' } });

    // Fetch documents for the case (all or selected)
    const whereClause: any = {
      case_id,
      tenant_id,
      processing_status: 'ready',
    };
    if (doc_ids && Array.isArray(doc_ids) && doc_ids.length > 0) {
      whereClause.id = { in: doc_ids };
    }

    const documents = await fastify.prisma.document.findMany({
      where: whereClause,
      select: {
        id: true,
        filename: true,
        doc_category: true,
        mime_type: true,
        processing_status: true,
        file_size_bytes: true,
        extracted_text: true,
        page_count: true,
        created_at: true,
      },
    });

    const rawTerms = query.trim().split(/\s+AND NOT\s+|\s+AND\s+|\s+OR\s+|\s+NEAR\s+|\s+BEFORE\s+|\s+/);
    const searchTerms = rawTerms.map((t: string) => t.trim().toLowerCase()).filter(Boolean);

    const results: any[] = [];

    for (const doc of documents) {
      const text = doc.extracted_text || '';
      const textLower = text.toLowerCase();
      const filenameMatch = search_in !== 'content' && doc.filename.toLowerCase().includes(query.toLowerCase());

      // Split text into pages (LlamaParse inserts --- Page Break ---)
      const pageBlocks = text.split(/---\s*Page Break\s*---/i);

      const snippets: Array<{ page: number; text: string; matches: string[] }> = [];

      for (let pageIdx = 0; pageIdx < pageBlocks.length; pageIdx++) {
        const pageText = pageBlocks[pageIdx];
        const pageTextLower = pageText.toLowerCase();

        if (search_in === 'metadata') continue; // skip content search

        const foundTerms: string[] = [];

        for (const term of searchTerms) {
          if (!term) continue;

          if (fuzziness) {
            // Fuzzy: adaptive Levenshtein + Soundex phonetic matching
            // Max edits scales with WORD LENGTH not the corrections slider:
            //   1-3 chars: 0 edits (exact), 4-6 chars: 1 edit, 7+ chars: 2 edits
            // The corrections slider (1-20) is a percentage tolerance multiplier
            // Soundex phonetic match catches spelling/pronunciation variants
            const words = pageTextLower.split(/\s+/);
            const originalWords = pageText.split(/\s+/);
            const termClean = term.replace(/[^a-z]/g, '');
            const termSoundex = soundex(termClean);
            // Base max edits by word length, scaled by corrections (default 10 = 100%)
            const corrScale = Math.min(fuzziness_corrections, 20) / 10;
            const baseMaxEdits = termClean.length <= 3 ? 0 : termClean.length <= 6 ? 1 : 2;
            const maxEdits = Math.round(baseMaxEdits * corrScale);

            for (let wi = 0; wi < words.length; wi++) {
              const clean = words[wi].replace(/[^a-z]/g, '');
              if (clean.length < 2) continue;
              // Skip if length difference alone exceeds max edits (fast path)
              if (Math.abs(clean.length - termClean.length) > maxEdits + 1) continue;
              const editDist = levenshtein(clean, termClean);
              const phonetic = soundex(clean) === termSoundex;
              if (editDist <= maxEdits || phonetic) {
                const actualWord = originalWords[wi].replace(/[^a-zA-Z0-9]/g, '');
                foundTerms.push(actualWord || term);
                break;
              }
            }
          } else if (nearness && searchTerms.length > 1) {
            // Nearness: all terms within nearness_words words of each other
            const words = pageTextLower.split(/\s+/);
            let allFound = true;
            const positions: number[] = [];
            for (const t of searchTerms) {
              const idx = words.findIndex((w: string) => w.includes(t));
              if (idx === -1) { allFound = false; break; }
              positions.push(idx);
            }
            if (allFound) {
              const span = Math.max(...positions) - Math.min(...positions);
              if (span <= nearness_words) foundTerms.push(...searchTerms);
            }
          } else {
            // Exact / boolean
            if (pageTextLower.includes(term)) {
              foundTerms.push(term);
            }
          }
        }

        if (foundTerms.length > 0) {
          // Extract snippet around first match
          const firstTerm = foundTerms[0];
          const matchIdx = pageTextLower.indexOf(firstTerm);
          const snippetStart = Math.max(0, matchIdx - 120);
          const snippetEnd = Math.min(pageText.length, matchIdx + 300);
          const snippet = (snippetStart > 0 ? '...' : '') + pageText.substring(snippetStart, snippetEnd).trim() + (snippetEnd < pageText.length ? '...' : '');

          snippets.push({
            page: pageIdx + 1,
            text: snippet,
            matches: [...new Set(foundTerms)],
          });
        }
      }

      const q = query.toLowerCase();
      const metadataMatch = search_in !== 'content' ? (
        doc.filename.toLowerCase().includes(q) ||
        (doc.doc_category || '').toLowerCase().replace(/_/g, ' ').includes(q) ||
        (doc.mime_type || '').toLowerCase().includes(q) ||
        (doc.processing_status || '').toLowerCase().includes(q) ||
        new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase().includes(q)
      ) : false;

      if (snippets.length > 0 || metadataMatch) {
        results.push({
          id: doc.id,
          filename: doc.filename,
          doc_category: doc.doc_category,
          mime_type: doc.mime_type,
          processing_status: doc.processing_status,
          file_size_bytes: doc.file_size_bytes ? Number(doc.file_size_bytes) : 0,
          page_count: doc.page_count,
          created_at: doc.created_at,
          match_count: snippets.length,
          metadata_match: metadataMatch,
          snippets: snippets.slice(0, 10), // max 10 snippets per doc
        });
      }
    }

    // Sort by match count descending
    results.sort((a, b) => b.match_count - a.match_count);

    return reply.send({
      data: {
        query,
        total_docs_searched: documents.length,
        total_results: results.length,
        results,
      },
    });
  });
};

// Levenshtein edit distance
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i-1] === a[j-1]
        ? matrix[i-1][j-1]
        : Math.min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

// Soundex phonetic encoding — groups words that sound alike
// e.g. "insurance" and "innsurance" and "ensurance" all produce same code
function soundex(s: string): string {
  if (!s) return '';
  const MAP: Record<string, string> = {
    b:'1',f:'1',p:'1',v:'1',
    c:'2',g:'2',j:'2',k:'2',q:'2',s:'2',x:'2',z:'2',
    d:'3',t:'3', l:'4', m:'5',n:'5', r:'6',
  };
  const upper = s.toLowerCase();
  let result = upper[0].toUpperCase();
  let prev = MAP[upper[0]] || '0';
  for (let i = 1; i < upper.length && result.length < 4; i++) {
    const code = MAP[upper[i]] || '0';
    if (code !== '0' && code !== prev) result += code;
    prev = code;
  }
  return result.padEnd(4, '0');
}
