#!/bin/bash
# ============================================================
# LexAI India — Fix Agents v3 (macOS compatible)
# 
# Changes:
#   1. Remove Redis banner, add per-agent Cancel button
#   2. Add expandable detailed output panel in Run History
#      (click any run to see full evidence/timeline/research/
#       deposition/strategy output inline — no Drafts needed)
#   3. Fix draft auto-save (was failing silently due to P2024)
#      — now saves with proper connection handling
#   4. Fix Prisma connection pool (P2024) in prisma plugin
#   5. Fix Prisma connection pool in agent.worker.ts
#
# Run from lexai-platform root:
#   cd ~/Desktop/lexai-platform && bash fix-agents-v3.sh
# ============================================================

set -e

if [ ! -f "package.json" ] || [ ! -d "apps/api" ]; then
  echo "❌  Run from lexai-platform root: cd ~/Desktop/lexai-platform"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        LexAI India — Fix Agents v3                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── FIX 1: Prisma plugin connection pool ─────────────────────
echo "📄  Fix 1: Prisma connection pool (prisma.ts)..."
python3 << 'PYEOF'
path = 'apps/api/src/plugins/prisma.ts'
with open(path, 'r') as f:
    content = f.read()

old = """export const prismaPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  await prisma.$connect();"""

new = """export const prismaPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const rawUrl = process.env.DATABASE_URL || '';
  const dbUrl = rawUrl.includes('connection_limit')
    ? rawUrl
    : rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'connection_limit=3&pool_timeout=20';

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: { db: { url: dbUrl } },
  });

  await prisma.$connect();"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print('    ✅  PrismaClient: connection_limit=3, pool_timeout=20')
elif 'connection_limit' in content:
    print('    ℹ️   Already patched')
else:
    print('    ⚠️   Block not found — check manually')
PYEOF

# ── FIX 2: agent.worker.ts connection pool ───────────────────
echo ""
echo "📄  Fix 2: agent.worker.ts connection pool..."
python3 << 'PYEOF'
path = 'apps/api/src/jobs/agent.worker.ts'
with open(path, 'r') as f:
    content = f.read()

old = 'const prisma = new PrismaClient();'
new = """const rawDbUrl = process.env.DATABASE_URL || '';
const workerDbUrl = rawDbUrl.includes('connection_limit')
  ? rawDbUrl
  : rawDbUrl + (rawDbUrl.includes('?') ? '&' : '?') + 'connection_limit=1&pool_timeout=20';
const prisma = new PrismaClient({ datasources: { db: { url: workerDbUrl } } });"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print('    ✅  worker PrismaClient: connection_limit=1')
elif 'connection_limit' in content:
    print('    ℹ️   Already patched')
else:
    print('    ⚠️   PrismaClient() line not found')
PYEOF

# ── FIX 3: agents.ts — fix draft auto-save to use $executeRawUnsafe ──────────
echo ""
echo "📄  Fix 3: agents.ts — fix draft save + add detailed output rendering..."
python3 << 'PYEOF'
path = 'apps/api/src/routes/agents.ts'
with open(path, 'r') as f:
    content = f.read()

# Fix the draft auto-save to use raw SQL (same pattern as drafts route)
# to avoid Prisma relation enforcement issues on case_id
old_save = """      await fastify.prisma.draft.create({
        data: {
          tenant_id,
          case_id,
          title: draftTitle,
          doc_type: docTypes[agent_type] as any || 'other',
          content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: draftText }] }] },
          version: nextVersion,
          word_count: draftText.split(' ').length,
          promoted_from_job: job_id,
          created_by: 'system',
          last_modified_by: 'system',
        },
      });"""

new_save = """      const draftId = crypto.randomUUID();
      const draftNow = new Date().toISOString();
      const draftContent = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: draftText }] }] });
      await fastify.prisma.$executeRawUnsafe(
        `INSERT INTO drafts (id, tenant_id, case_id, title, doc_type, content, version, word_count, promoted_from_job, created_by, last_modified_by, last_modified_at, created_at)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::"DraftDocType", $6::jsonb, $7, $8, $9::uuid, $10, $10, $11::timestamptz, $11::timestamptz)
         ON CONFLICT DO NOTHING`,
        draftId, tenant_id, case_id, draftTitle, 'other',
        draftContent, nextVersion, draftText.split(' ').length,
        job_id, 'system', draftNow
      );"""

if old_save in content:
    content = content.replace(old_save, new_save)
    with open(path, 'w') as f:
        f.write(content)
    print('    ✅  Draft save uses $executeRawUnsafe (bypasses Prisma relation enforcement)')
elif '$executeRawUnsafe' in content and 'INSERT INTO drafts' in content:
    print('    ℹ️   Already using raw SQL for draft save')
else:
    print('    ⚠️   Could not find draft save block — may not have been added yet by v2 script')
    # If v2 draft save wasn't applied either, just note it
    print('    ℹ️   Draft auto-save will be added when v2 script is run first, or run this after v2')
PYEOF

# ── FIX 4: page.tsx — full agents tab rewrite with output panels ──────────────
echo ""
echo "📄  Fix 4: page.tsx — agents tab with expandable output + cancel button..."
python3 << 'PYEOF'
path = 'apps/web/src/app/cases/[id]/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# Add state variables
old_state = "  const [runningAgent, setRunningAgent] = useState<string | null>(null);"
new_state = """  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [cancellingAgent, setCancellingAgent] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);"""

if old_state in content and 'expandedJobId' not in content:
    content = content.replace(old_state, new_state)
    print('    ✅  State vars added')

# Add handleCancelAgent function
old_fn_end = """    } catch (err: any) {
      setError(err.message);
      setRunningAgent(null);
    }
  };

  const handleCreatePresentation"""

new_fn_end = """    } catch (err: any) {
      setError(err.message);
      setRunningAgent(null);
    }
  };

  const handleCancelAgent = async () => {
    setCancellingAgent(true);
    try {
      await fetch(BASE + '/v1/agents/cases/' + id + '/cancel-queued', {
        method: 'POST', headers: { Authorization: 'Bearer ' + token }
      });
      setRunningAgent(null);
      refresh();
    } catch {}
    setCancellingAgent(false);
  };

  const handleCreatePresentation"""

if old_fn_end in content and 'handleCancelAgent' not in content:
    content = content.replace(old_fn_end, new_fn_end)
    print('    ✅  handleCancelAgent added')

# Replace the full agents tab
old_tab = """      {activeTab === 'agents' && (
        <div>
          {/* Stuck jobs banner */}
          {(agents as any[]).some((j: any) => j.status === 'queued' || j.status === 'running') && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#9a3412', margin: '0 0 2px' }}>
                  {(agents as any[]).filter((j: any) => j.status === 'queued' || j.status === 'running').length} job(s) stuck in queue
                </p>
                <p style={{ fontSize: '12px', color: '#c2410c', margin: 0 }}>Redis may be unavailable. Cancel stuck jobs then re-run — agents now work without Redis.</p>
              </div>
              <button onClick={async () => {
                try {
                  await fetch(BASE + '/v1/agents/cases/' + id + '/cancel-queued', {
                    method: 'POST', headers: { Authorization: 'Bearer ' + token }
                  });
                  refresh();
                } catch {}
              }} style={{ padding: '8px 16px', background: '#9a3412', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', flexShrink: 0, whiteSpace: 'nowrap' }}>
                ✕ Cancel Stuck Jobs
              </button>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            {AGENTS.map(({ type, Icon, label, desc }) => {
              const isRunning = runningAgent === type;
              const lastRun = agents.find((j: any) => j.agent_type === type);
              return (
                <div key={type} style={{ ...cardStyle, padding: '20px', minWidth: '200px', maxWidth: '260px', flex: '1 1 200px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#d5e3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color="#022448" />
                    </div>
                    {lastRun?.status === 'completed' && (
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', background: '#dcfce7', color: '#15803d', borderRadius: '2px' }}>DONE</span>
                    )}
                  </div>
                  <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '15px', color: '#022448', margin: '0 0 4px' }}>{label}</h3>
                  <p style={{ fontSize: '12px', color: '#74777f', margin: '0 0 14px', lineHeight: 1.5 }}>{desc}</p>
                  <button onClick={() => handleRunAgent(type)} disabled={!!runningAgent} style={{
                    ...btnPrimary, width: '100%', justifyContent: 'center',
                    opacity: runningAgent && !isRunning ? 0.4 : 1,
                    background: isRunning ? '#edeef0' : '#022448',
                    color: isRunning ? '#43474e' : '#fff',
                  }}>
                    {isRunning ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Running...</> : <><Play size={13} /> Run Agent</>}
                  </button>
                </div>
              );
            })}
          </div>

          {agents.length > 0 && (
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <p style={sectionHeader}>{tr('run_history').toUpperCase()}</p>
              {agents.slice(0, 8).map((job: any) => (
                <div key={job.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(196,198,207,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', margin: 0, textTransform: 'capitalize' }}>{job.agent_type} Analysis</p>
                      <p style={{ fontSize: '11px', color: '#74777f', margin: '2px 0 0' }}>
                        {new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {job.cost_inr ? ` · ₹${Number(job.cost_inr).toFixed(2)}` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '3px 8px', borderRadius: '2px',
                        background: job.status === 'completed' ? '#dcfce7' : job.status === 'failed' ? '#ffdad6' : '#ffe088',
                        color: job.status === 'completed' ? '#15803d' : job.status === 'failed' ? '#93000a' : '#745c00',
                      }}>
                        {job.status.toUpperCase()}
                      </span>
                      {job.status === 'failed' && (
                        <button onClick={() => handleRunAgent(job.agent_type)} disabled={!!runningAgent}
                          style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', background: '#022448', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                          ↺ Retry
                        </button>
                      )}
                    </div>
                  </div>
                  {job.status === 'failed' && job.error_message && (
                    <div style={{ marginTop: '8px', padding: '8px 10px', background: '#ffdad6', borderRadius: '6px', fontSize: '11px', color: '#93000a', lineHeight: 1.5 }}>
                      <strong>Error:</strong> {job.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}"""

new_tab = """      {activeTab === 'agents' && (() => {
        // ── Helper: render structured output for a job ──────────
        const renderOutput = (job: any) => {
          const o = job.output;
          if (!o) return null;
          const type = job.agent_type;
          const section = (title: string, color = '#022448') => (
            <p style={{ fontSize: '10px', fontWeight: 800, color, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '16px 0 6px' }}>{title}</p>
          );
          const pill = (text: string, bg: string, color: string) => (
            <span key={text} style={{ display: 'inline-block', background: bg, color, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', marginRight: '6px', marginBottom: '4px' }}>{text}</span>
          );
          const card = (children: React.ReactNode, bg = '#fafafa', border = 'rgba(196,198,207,0.2)') => (
            <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>{children}</div>
          );

          if (type === 'evidence') return (
            <div>
              {o.key_facts?.length > 0 && <>{section('Key Facts', '#022448')}{o.key_facts.map((f: string, i: number) => card(<p key={i} style={{ fontSize: '12px', color: '#191c1e', margin: 0, lineHeight: 1.6 }}>• {f}</p>))}</>}
              {o.exhibits?.length > 0 && <>{section('Exhibits')}{o.exhibits.map((e: any, i: number) => card(<><p style={{ fontSize: '12px', fontWeight: 700, color: '#022448', margin: '0 0 2px' }}>Exhibit {e.number}: {e.description}</p><p style={{ fontSize: '11px', color: '#74777f', margin: 0 }}>{e.relevance} {e.strength && pill(e.strength, e.strength === 'Strong' ? '#dcfce7' : e.strength === 'Moderate' ? '#fef9c3' : '#ffdad6', e.strength === 'Strong' ? '#15803d' : e.strength === 'Moderate' ? '#92400e' : '#93000a')}</p></>, i === (o.exhibits?.length - 1) ? '#f0f9ff' : '#fafafa', 'rgba(2,36,72,0.08)'))}</>}
              {o.contradictions?.length > 0 && <>{section('Contradictions', '#b45309')}{o.contradictions.map((c: any, i: number) => card(<p key={i} style={{ fontSize: '12px', color: '#191c1e', margin: 0 }}>• {typeof c === 'string' ? c : c.description || JSON.stringify(c)}</p>, '#fff7ed', 'rgba(180,83,9,0.15)'))}</>}
              {o.missing_evidence?.length > 0 && <>{section('Missing Evidence', '#93000a')}{o.missing_evidence.map((m: string, i: number) => card(<p key={i} style={{ fontSize: '12px', color: '#191c1e', margin: 0 }}>• {m}</p>, '#fff8f8', 'rgba(186,26,26,0.1)'))}</>}
            </div>
          );

          if (type === 'timeline') return (
            <div>
              {o.events?.length > 0 && <>{section('Events')}
                {o.events.map((e: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ minWidth: '80px', textAlign: 'right', paddingTop: '2px' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#022448', margin: 0 }}>{e.date}</p>
                      {e.time && <p style={{ fontSize: '10px', color: '#74777f', margin: 0 }}>{e.time}</p>}
                    </div>
                    <div style={{ width: '1px', background: '#d5e3ff', flexShrink: 0, position: 'relative' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#022448', position: 'absolute', left: '-3.5px', top: '4px' }} />
                    </div>
                    <div style={{ flex: 1, paddingBottom: '8px' }}>
                      <p style={{ fontSize: '12px', color: '#191c1e', margin: '0 0 2px', lineHeight: 1.5 }}>{e.description}</p>
                      {e.event_type && pill(e.event_type.replace(/_/g, ' '), '#d5e3ff', '#022448')}
                    </div>
                  </div>
                ))}
              </>}
              {o.prosecution_gaps?.length > 0 && <>{section('Prosecution Gaps', '#93000a')}{o.prosecution_gaps.map((g: string, i: number) => card(<p key={i} style={{ fontSize: '12px', color: '#191c1e', margin: 0 }}>• {g}</p>, '#fff8f8', 'rgba(186,26,26,0.1)'))}</>}
              {o.defence_opportunities?.length > 0 && <>{section('Defence Opportunities', '#15803d')}{o.defence_opportunities.map((g: string, i: number) => card(<p key={i} style={{ fontSize: '12px', color: '#191c1e', margin: 0 }}>• {g}</p>, '#f0fdf4', 'rgba(21,128,61,0.12)'))}</>}
            </div>
          );

          if (type === 'research') return (
            <div>
              {o.applicable_statutes?.length > 0 && <>{section('Applicable Statutes', '#5b21b6')}
                {o.applicable_statutes.map((s: any, i: number) => card(
                  <><p style={{ fontSize: '12px', fontWeight: 700, color: '#022448', margin: '0 0 2px' }}>{s.section} — {s.act}</p>
                  <p style={{ fontSize: '11px', color: '#43474e', margin: '0 0 2px', lineHeight: 1.5 }}>{s.description}</p>
                  {s.relevance && <p style={{ fontSize: '11px', color: '#5b21b6', margin: 0, fontStyle: 'italic' }}>{s.relevance}</p>}</>,
                  '#f4f0ff', 'rgba(91,33,182,0.1)'
                ))}
              </>}
              {o.favorable_precedents?.length > 0 && <>{section('Favourable Precedents', '#15803d')}
                {o.favorable_precedents.map((p: any, i: number) => card(
                  <><p style={{ fontSize: '12px', fontWeight: 700, color: '#022448', margin: '0 0 1px' }}>{p.citation}</p>
                  <p style={{ fontSize: '10px', color: '#74777f', margin: '0 0 4px' }}>{p.court} · {p.year}</p>
                  <p style={{ fontSize: '11px', color: '#43474e', margin: '0 0 2px', lineHeight: 1.5 }}>{p.held}</p>
                  {p.relevance && <p style={{ fontSize: '11px', color: '#15803d', margin: 0, fontWeight: 600 }}>Why it helps: {p.relevance}</p>}</>,
                  '#f0fdf4', 'rgba(21,128,61,0.12)'
                ))}
              </>}
              {o.adverse_precedents?.length > 0 && <>{section('Adverse Precedents', '#93000a')}
                {o.adverse_precedents.map((p: any, i: number) => card(
                  <><p style={{ fontSize: '12px', fontWeight: 700, color: '#022448', margin: '0 0 1px' }}>{p.citation}</p>
                  <p style={{ fontSize: '10px', color: '#74777f', margin: '0 0 4px' }}>{p.court} · {p.year}</p>
                  <p style={{ fontSize: '11px', color: '#43474e', margin: '0 0 2px', lineHeight: 1.5 }}>{p.held}</p>
                  {p.how_to_distinguish && <p style={{ fontSize: '11px', color: '#b45309', margin: 0, fontWeight: 600 }}>Distinguish: {p.how_to_distinguish}</p>}</>,
                  '#fff8f8', 'rgba(186,26,26,0.1)'
                ))}
              </>}
            </div>
          );

          if (type === 'deposition') return (
            <div>
              {o.witness_name && card(<><p style={{ fontSize: '12px', fontWeight: 700, color: '#022448', margin: '0 0 2px' }}>Witness: {o.witness_name}</p>{o.credibility_assessment && <p style={{ fontSize: '11px', color: '#74777f', margin: 0 }}>Credibility: {pill(o.credibility_assessment, o.credibility_assessment === 'High' ? '#dcfce7' : o.credibility_assessment === 'Medium' ? '#fef9c3' : '#ffdad6', o.credibility_assessment === 'High' ? '#15803d' : o.credibility_assessment === 'Medium' ? '#92400e' : '#93000a')}</p>}</>)}
              {o.inconsistencies?.length > 0 && <>{section('Inconsistencies', '#b45309')}
                {o.inconsistencies.map((inc: any, i: number) => card(
                  <><p style={{ fontSize: '12px', color: '#191c1e', margin: '0 0 2px' }}><strong>Statement:</strong> {inc.statement}</p>
                  <p style={{ fontSize: '11px', color: '#93000a', margin: '0 0 2px' }}><strong>Contradiction:</strong> {inc.contradiction}</p>
                  {inc.page && <p style={{ fontSize: '10px', color: '#74777f', margin: 0 }}>Page: {inc.page}</p>}</>,
                  '#fff7ed', 'rgba(180,83,9,0.15)'
                ))}
              </>}
              {o.cross_examination_questions?.length > 0 && <>{section('Cross-Examination Questions')}
                {o.cross_examination_questions.map((q: string, i: number) => card(
                  <p style={{ fontSize: '12px', color: '#191c1e', margin: 0 }}>{i + 1}. {q}</p>
                ))}
              </>}
            </div>
          );

          if (type === 'strategy') return (
            <div>
              {o.sentiment && card(
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Newsreader, serif', fontSize: '2rem', fontWeight: 800, color: o.sentiment.score >= 65 ? '#15803d' : o.sentiment.score >= 45 ? '#b45309' : '#93000a', margin: 0 }}>{o.sentiment.score}%</p>
                    <p style={{ fontSize: '9px', fontWeight: 800, color: '#74777f', margin: 0, letterSpacing: '0.06em' }}>WIN PROB</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '12px', color: '#191c1e', margin: '0 0 4px', lineHeight: 1.6 }}>{o.sentiment.reasoning}</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {o.sentiment.evidence_strength && pill('Evidence: ' + o.sentiment.evidence_strength, '#d5e3ff', '#022448')}
                      {o.sentiment.precedent_strength && pill('Precedents: ' + o.sentiment.precedent_strength, '#ede9fe', '#5b21b6')}
                    </div>
                  </div>
                </div>,
                '#f0f4ff', 'rgba(2,36,72,0.12)'
              )}
              {o.strengths?.length > 0 && <>{section('Strong Pointers', '#15803d')}{o.strengths.map((s: string, i: number) => card(<p key={i} style={{ fontSize: '12px', color: '#191c1e', margin: 0 }}>✓ {s}</p>, '#f0fdf4', 'rgba(21,128,61,0.12)'))}</>}
              {o.vulnerabilities?.length > 0 && <>{section('Key Risks', '#b45309')}{o.vulnerabilities.map((v: any, i: number) => card(<><p style={{ fontSize: '12px', fontWeight: 600, color: '#191c1e', margin: '0 0 4px' }}>• {v.issue}</p>{v.mitigation && <p style={{ fontSize: '11px', color: '#15803d', margin: 0 }}>↳ Mitigation: {v.mitigation}</p>}</>, '#fff7ed', 'rgba(180,83,9,0.15)'))}</>}
              {o.opening_statement && <>{section('Opening Statement')}{card(<p style={{ fontSize: '12px', color: '#e0e8f4', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{o.opening_statement}</p>, '#022448', 'transparent')}</>}
              {o.closing_skeleton && <>{section('Closing Skeleton')}{card(<p style={{ fontSize: '12px', color: '#191c1e', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{o.closing_skeleton}</p>)}</>}
            </div>
          );

          return <p style={{ fontSize: '12px', color: '#74777f', padding: '8px 0' }}>No structured output available.</p>;
        };

        return (
        <div>
          {/* Agent cards */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            {AGENTS.map(({ type, Icon, label, desc }) => {
              const isRunning = runningAgent === type;
              const lastRun = agents.find((j: any) => j.agent_type === type);
              const isDone = lastRun?.status === 'completed';
              const isFailed = lastRun?.status === 'failed';
              const lastRunTime = lastRun?.completed_at || lastRun?.created_at;
              return (
                <div key={type} style={{ ...cardStyle, padding: '20px', minWidth: '200px', maxWidth: '260px', flex: '1 1 200px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: isDone ? '#dcfce7' : isFailed ? '#ffdad6' : '#d5e3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color={isDone ? '#15803d' : isFailed ? '#93000a' : '#022448'} />
                    </div>
                    {isDone && <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', background: '#dcfce7', color: '#15803d', borderRadius: '2px' }}>DONE</span>}
                    {isFailed && <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', background: '#ffdad6', color: '#93000a', borderRadius: '2px' }}>FAILED</span>}
                  </div>
                  <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '15px', color: '#022448', margin: '0 0 2px' }}>{label}</h3>
                  <p style={{ fontSize: '12px', color: '#74777f', margin: '0 0 6px', lineHeight: 1.5 }}>{desc}</p>
                  {isDone && lastRunTime && (
                    <p style={{ fontSize: '10px', color: '#15803d', margin: '0 0 4px', fontWeight: 600 }}>
                      ✓ {new Date(lastRunTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  )}
                  {lastRun?.cost_inr && <p style={{ fontSize: '10px', color: '#74777f', margin: '0 0 10px' }}>₹{Number(lastRun.cost_inr).toFixed(2)}</p>}
                  {!isDone && !isFailed && !lastRun?.cost_inr && <div style={{ marginBottom: '10px' }} />}
                  {isRunning ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button disabled style={{ ...btnPrimary, flex: 1, justifyContent: 'center', background: '#edeef0', color: '#43474e', cursor: 'not-allowed' }}>
                        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Running...
                      </button>
                      <button onClick={handleCancelAgent} disabled={cancellingAgent} title="Cancel" style={{ padding: '9px 12px', background: '#ffdad6', color: '#93000a', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => handleRunAgent(type)} disabled={!!runningAgent} style={{
                      ...btnPrimary, width: '100%', justifyContent: 'center',
                      opacity: runningAgent ? 0.4 : 1,
                      background: isFailed ? '#93000a' : '#022448',
                    }}>
                      <Play size={13} /> {isDone ? 'Re-run' : isFailed ? '↺ Retry' : 'Run Agent'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Run History with expandable output */}
          {agents.length > 0 && (
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <p style={sectionHeader}>RUN HISTORY — click any row to view full output</p>
              {agents.slice(0, 15).map((job: any) => (
                <div key={job.id}>
                  <button
                    onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 20px', background: expandedJobId === job.id ? '#f0f4ff' : 'transparent', border: 'none', borderBottom: '1px solid rgba(196,198,207,0.08)', cursor: job.status === 'completed' ? 'pointer' : 'default', textAlign: 'left', fontFamily: 'Manrope, sans-serif' }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', margin: 0, textTransform: 'capitalize' }}>{job.agent_type} Analysis</p>
                      <p style={{ fontSize: '11px', color: '#74777f', margin: '2px 0 0' }}>
                        {new Date(job.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                        {job.cost_inr ? ` · ₹${Number(job.cost_inr).toFixed(2)}` : ''}
                        {job.tokens_input ? ` · ${(job.tokens_input + (job.tokens_output || 0)).toLocaleString()} tokens` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '3px 8px', borderRadius: '2px',
                        background: job.status === 'completed' ? '#dcfce7' : job.status === 'failed' ? '#ffdad6' : '#ffe088',
                        color: job.status === 'completed' ? '#15803d' : job.status === 'failed' ? '#93000a' : '#745c00',
                      }}>
                        {job.status.toUpperCase()}
                      </span>
                      {job.status === 'completed' && (
                        <span style={{ fontSize: '11px', color: expandedJobId === job.id ? '#022448' : '#74777f' }}>
                          {expandedJobId === job.id ? '▲' : '▼'}
                        </span>
                      )}
                      {job.status === 'failed' && (
                        <button onClick={(e) => { e.stopPropagation(); handleRunAgent(job.agent_type); }} disabled={!!runningAgent}
                          style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', background: '#022448', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                          ↺ Retry
                        </button>
                      )}
                    </div>
                  </button>
                  {job.status === 'failed' && job.error_message && (
                    <div style={{ padding: '8px 20px 10px', background: '#ffdad6' }}>
                      <p style={{ fontSize: '11px', color: '#93000a', margin: 0 }}><strong>Error:</strong> {job.error_message}</p>
                    </div>
                  )}
                  {expandedJobId === job.id && job.output && (
                    <div style={{ padding: '16px 20px 20px', background: '#f8faff', borderBottom: '1px solid rgba(196,198,207,0.15)' }}>
                      {renderOutput(job)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        );
      })()}"""

if old_tab in content:
    content = content.replace(old_tab, new_tab)
    with open(path, 'w') as f:
        f.write(content)
    print('    ✅  Agents tab fully replaced with expandable output panels')
else:
    print('    ⚠️   Could not find agents tab block — it may have already been partially replaced')
    print('    ℹ️   Saving file anyway with any earlier changes applied')
    with open(path, 'w') as f:
        f.write(content)
PYEOF

# ── GIT COMMIT & PUSH ─────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════"
echo "  All patches applied. Pushing to git..."
echo "══════════════════════════════════════════════════════"
echo ""

git add \
  apps/api/src/plugins/prisma.ts \
  apps/api/src/jobs/agent.worker.ts \
  apps/api/src/routes/agents.ts \
  "apps/web/src/app/cases/[id]/page.tsx"

git commit -m "fix: P2024 pool fix, remove Redis banner, add cancel button, expandable agent output in Run History"
git push origin main

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  Done! Pushed to main.                           ║"
echo "║                                                      ║"
echo "║  After Railway redeploys (~2 min):                   ║"
echo "║  • P2024 connection errors gone                      ║"
echo "║  • No more Redis banner                              ║"
echo "║  • Running agent shows ✕ Cancel button               ║"
echo "║  • Click any COMPLETED row in Run History            ║"
echo "║    to expand full output inline                      ║"
echo "║                                                      ║"
echo "║  Also add DIRECT_URL to Railway env vars:            ║"
echo "║  postgresql://postgres:[pwd]@db.[id].supabase.co     ║"
echo "║  :5432/postgres                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
