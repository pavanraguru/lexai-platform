'use client';
import { useState, useRef, useCallback } from 'react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Snippet { page: number; text: string; matches: string[]; }
interface SearchResult {
  id: string; filename: string; doc_category: string | null;
  page_count: number | null; match_count: number; metadata_match: boolean;
  snippets: Snippet[];
}

interface Props { caseId: string; token: string; }

const CAT_LABELS: Record<string, string> = {
  fir: 'FIR', chargesheet: 'Chargesheet', affidavit: 'Affidavit',
  court_order: 'Court Order', judgment: 'Judgment', petition: 'Petition',
  written_statement: 'Written Statement', evidence: 'Evidence', other: 'Other',
};

export default function SearchPanel({ caseId, token }: Props) {
  const [query, setQuery] = useState('');
  const [searchIn, setSearchIn] = useState<'content'|'metadata'|'both'>('both');
  const [fuzziness, setFuzziness] = useState(false);
  const [fuzzCorr, setFuzzCorr] = useState(10);
  const [nearness, setNearness] = useState(false);
  const [nearWords, setNearWords] = useState(2);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [totalSearched, setTotalSearched] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const appendOperator = (op: string) => {
    setQuery(q => q ? q + ' ' + op + ' ' : op + ' ');
    inputRef.current?.focus();
  };

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setResults(null); setExpanded(new Set());
    try {
      const res = await fetch(`${BASE}/v1/search/cases/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query, search_in: searchIn, fuzziness, fuzziness_corrections: fuzzCorr, nearness, nearness_words: nearWords }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error?.message || 'Search failed');
      setResults(j.data.results);
      setTotalSearched(j.data.total_docs_searched);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [query, searchIn, fuzziness, fuzzCorr, nearness, nearWords, caseId, token]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const highlightText = (text: string, terms: string[]) => {
    if (!terms.length) return text;
    let result = text;
    const sorted = [...terms].sort((a, b) => b.length - a.length);
    sorted.forEach(term => {
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(regex, '|||MARK|||$1|||/MARK|||');
    });
    return result.split('|||').map((part, i) => {
      if (part.startsWith('MARK|||')) return <mark key={i} style={{ background: '#ffe588', padding: '0 1px', borderRadius: '2px' }}>{part.slice(7)}</mark>;
      if (part === '/MARK|||') return null;
      return part;
    });
  };

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '8px', fontSize: '13px', fontFamily: 'Manrope, sans-serif', outline: 'none', boxSizing: 'border-box' };
  const chip: React.CSSProperties = { padding: '4px 12px', border: '1px solid rgba(2,36,72,0.25)', borderRadius: '99px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'none', fontFamily: 'Manrope, sans-serif', color: '#022448' };
  const radio = (val: string, cur: string, set: (v: any) => void, label: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', cursor: 'pointer', color: '#43474e' }}>
      <input type="radio" checked={cur === val} onChange={() => set(val)} style={{ accentColor: '#022448' }} />
      {label}
    </label>
  );

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(196,198,207,0.12)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#74777f', letterSpacing: '0.04em' }}>Search in</span>
          <div style={{ display: 'flex', gap: '16px' }}>
            {radio('content', searchIn, setSearchIn, 'Content')}
            {radio('metadata', searchIn, setSearchIn, 'Metadata')}
            {radio('both', searchIn, setSearchIn, 'Both')}
          </div>
        </div>

        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(196,198,207,0.12)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="Word or phrase to search..." style={{ ...inp, flex: 1 }} />
            <button onClick={doSearch} disabled={loading || !query.trim()}
              style={{ padding: '9px 20px', background: query.trim() ? '#022448' : '#edeef0', color: query.trim() ? '#fff' : '#74777f', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: query.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Manrope, sans-serif', whiteSpace: 'nowrap' as const }}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
            {['AND', 'OR', 'AND NOT', 'BEFORE', 'NEAR'].map(op => (
              <button key={op} onClick={() => appendOperator(op)} style={chip}>{op}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 800, color: '#74777f', letterSpacing: '0.05em', textTransform: 'uppercase' as const, margin: '0 0 10px' }}>Search criteria</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer', fontSize: '13px', color: '#43474e' }}>
              <input type="checkbox" checked={nearness} onChange={e => setNearness(e.target.checked)} style={{ accentColor: '#022448' }} />
              Nearness within
              <input type="number" value={nearWords} min={1} max={20} onChange={e => setNearWords(Number(e.target.value))}
                style={{ width: '52px', padding: '3px 7px', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '6px', fontSize: '13px', textAlign: 'center' }} />
              words
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#43474e' }}>
              <input type="checkbox" checked={fuzziness} onChange={e => setFuzziness(e.target.checked)} style={{ accentColor: '#022448' }} />
              Fuzziness up to
              <input type="number" value={fuzzCorr} min={1} max={20} onChange={e => setFuzzCorr(Number(e.target.value))}
                style={{ width: '52px', padding: '3px 7px', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '6px', fontSize: '13px', textAlign: 'center' }} />
              corrections
            </label>
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 800, color: '#74777f', letterSpacing: '0.05em', textTransform: 'uppercase' as const, margin: '0 0 10px' }}>Where to search</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              {radio('all', 'all', () => {}, 'All documents')}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#ffdad6', borderRadius: '8px', fontSize: '12px', color: '#93000a', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {results !== null && (
        <div>
          <p style={{ fontSize: '11px', color: '#74777f', marginBottom: '10px' }}>
            {results.length === 0
              ? `No matches found in ${totalSearched} document${totalSearched !== 1 ? 's' : ''}`
              : `${results.length} document${results.length !== 1 ? 's' : ''} matched across ${totalSearched} searched — ${results.reduce((s, r) => s + r.match_count, 0)} total matches`}
          </p>

          {results.map(result => {
            const isOpen = expanded.has(result.id);
            return (
              <div key={result.id} style={{ background: '#fff', borderRadius: '10px', border: '1px solid rgba(196,198,207,0.2)', marginBottom: '8px', overflow: 'hidden' }}>
                <div onClick={() => toggleExpand(result.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', background: isOpen ? '#f0f4ff' : 'transparent' }}>
                  <span style={{ fontSize: '13px', color: isOpen ? '#022448' : '#74777f', flexShrink: 0 }}>{isOpen ? '▼' : '▶'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {result.filename}
                    </p>
                    <p style={{ fontSize: '11px', color: '#74777f', margin: '2px 0 0' }}>
                      {result.doc_category ? CAT_LABELS[result.doc_category] || result.doc_category : 'Document'}
                      {result.page_count ? ` · ${result.page_count} pages` : ''}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {result.metadata_match && (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', background: '#d5e3ff', color: '#001c3b', borderRadius: '4px' }}>NAME</span>
                    )}
                    {result.match_count > 0 && (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', background: '#ffe088', color: '#735c00', borderRadius: '4px' }}>
                        {result.match_count} match{result.match_count !== 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {isOpen && result.snippets.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(196,198,207,0.1)' }}>
                    {result.snippets.map((snippet, si) => (
                      <div key={si} style={{ display: 'flex', gap: '16px', padding: '12px 16px', borderBottom: si < result.snippets.length - 1 ? '1px solid rgba(196,198,207,0.06)' : 'none', background: si % 2 === 1 ? '#fafafa' : '#fff' }}>
                        <div style={{ flexShrink: 0, width: '60px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#74777f' }}>Page {snippet.page}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#43474e', margin: 0, lineHeight: 1.7, flex: 1 }}>
                          {highlightText(snippet.text, snippet.matches)}
                        </p>
                      </div>
                    ))}
                    {result.match_count > 10 && (
                      <div style={{ padding: '8px 16px', background: '#f8f9fb', borderTop: '1px solid rgba(196,198,207,0.1)' }}>
                        <p style={{ fontSize: '11px', color: '#74777f', margin: 0 }}>
                          Showing 10 of {result.match_count} matches in this document
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {isOpen && result.snippets.length === 0 && result.metadata_match && (
                  <div style={{ padding: '12px 16px', background: '#f8f9fb', borderTop: '1px solid rgba(196,198,207,0.1)' }}>
                    <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>Matched on filename/category</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
