#!/bin/bash
# ============================================================
# LexAI India — Add expandable output panel to Run History
#
# Adds:
#   - expandedJobId state
#   - cancellingAgent state + handleCancelAgent function
#   - Clickable Run History rows that expand to show full
#     structured output (evidence, timeline, research,
#     deposition, strategy) rendered inline
#   - Cancel button on running agents
#   - Removes Redis stuck-jobs banner
#
# Run from lexai-platform root:
#   cd ~/Desktop/lexai-platform && bash fix-agents-output-panel.sh
# ============================================================

set -e

if [ ! -f "package.json" ] || [ ! -d "apps/api" ]; then
  echo "❌  Run from lexai-platform root: cd ~/Desktop/lexai-platform"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║    LexAI — Add Agent Output Panel to Run History    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

python3 << 'PYEOF'
path = 'apps/web/src/app/cases/[id]/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# ── 1. Add state variables ────────────────────────────────────
old_state = "  // Agent state\n  const [runningAgent, setRunningAgent] = useState<string | null>(null);"
new_state = """  // Agent state
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [cancellingAgent, setCancellingAgent] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);"""

if old_state in content and 'expandedJobId' not in content:
    content = content.replace(old_state, new_state)
    print('✅  State vars added')
elif 'expandedJobId' in content:
    print('ℹ️   State vars already present')

# ── 2. Add handleCancelAgent after handleRunAgent ─────────────
old_after_run = """    } catch (err: any) {
      setError(err.message);
      setRunningAgent(null);
    }
  };

  const handleCreatePresentation"""

new_after_run = """    } catch (err: any) {
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

if old_after_run in content and 'handleCancelAgent' not in content:
    content = content.replace(old_after_run, new_after_run)
    print('✅  handleCancelAgent added')
elif 'handleCancelAgent' in content:
    print('ℹ️   handleCancelAgent already present')

# ── 3. Replace the entire agents tab ─────────────────────────
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

        const renderJobOutput = (job: any) => {
          const o = job.output;
          if (!o) return <p style={{ fontSize: '12px', color: '#74777f', padding: '12px 0', margin: 0 }}>No output data available.</p>;
          const t = job.agent_type;

          const Sec = ({ label, color = '#022448' }: { label: string; color?: string }) => (
            <p style={{ fontSize: '10px', fontWeight: 800, color, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '14px 0 6px' }}>{label}</p>
          );
          const Card = ({ children, bg = '#fafafa', border = 'rgba(196,198,207,0.2)' }: any) => (
            <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '10px 12px', marginBottom: '6px' }}>{children}</div>
          );
          const Pill = ({ text, bg, color }: any) => (
            <span style={{ display: 'inline-block', background: bg, color, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', marginRight: '5px', marginTop: '3px' }}>{text}</span>
          );
          const strengthColor = (v: string) => v === 'Strong' || v === 'High' || v === 'Consistent' ? '#15803d' : v === 'Moderate' || v === 'Medium' || v === 'Minor Gaps' ? '#b45309' : '#93000a';
          const strengthBg = (v: string) => v === 'Strong' || v === 'High' || v === 'Consistent' ? '#dcfce7' : v === 'Moderate' || v === 'Medium' || v === 'Minor Gaps' ? '#fef9c3' : '#ffdad6';

          if (t === 'evidence') return (
            <div>
              {o.key_facts?.length > 0 && <><Sec label="Key Facts" />{(o.key_facts as string[]).map((f, i) => <Card key={i}><p style={{ fontSize: '12px', color: '#191c1e', margin: 0, lineHeight: 1.6 }}>• {f}</p></Card>)}</>}
              {o.exhibits?.length > 0 && <><Sec label="Exhibits" />{(o.exhibits as any[]).map((e, i) => <Card key={i} bg="#f0f9ff" border="rgba(2,36,72,0.1)"><p style={{ fontSize: '12px', fontWeight: 700, color: '#022448', margin: '0 0 3px' }}>Exhibit {e.number}: {e.description}</p><p style={{ fontSize: '11px', color: '#43474e', margin: '0 0 4px', lineHeight: 1.5 }}>{e.relevance}</p>{e.strength && <Pill text={e.strength} bg={strengthBg(e.strength)} color={strengthColor(e.strength)} />}</Card>)}</>}
              {o.contradictions?.length > 0 && <><Sec label="Contradictions" color="#b45309" />{(o.contradictions as any[]).map((c, i) => <Card key={i} bg="#fff7ed" border="rgba(180,83,9,0.15)"><p style={{ fontSize: '12px', color: '#191c1e', margin: 0 }}>• {typeof c === 'string' ? c : c.description || JSON.stringify(c)}</p></Card>)}</>}
              {o.missing_evidence?.length > 0 && <><Sec label="Missing Evidence" color="#93000a" />{(o.missing_evidence as string[]).map((m, i) => <Card key={i} bg="#fff8f8" border="rgba(186,26,26,0.1)"><p style={{ fontSize: '12px', color: '#191c1e', margin: 0 }}>• {m}</p></Card>)}</>}
            </div>
          );

          if (t === 'timeline') return (
            <div>
              {o.events?.length > 0 && <><Sec label={`${(o.events as any[]).length} Events`} />{(o.events as any[]).map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ minWidth: '90px', textAlign: 'right', paddingTop: '3px', flexShrink: 0 }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#022448', margin: 0 }}>{e.date}</p>
                    {e.time && <p style={{ fontSize: '10px', color: '#74777f', margin: 0 }}>{e.time}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#022448', marginTop: '4px', flexShrink: 0 }} />
                    {i < (o.events as any[]).length - 1 && <div style={{ width: '1px', flex: 1, background: '#d5e3ff', marginTop: '2px' }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: '10px' }}>
                    <p style={{ fontSize: '12px', color: '#191c1e', margin: '0 0 3px', lineHeight: 1.5 }}>{e.description}</p>
                    {e.event_type && <Pill text={e.event_type.replace(/_/g,' ')} bg="#d5e3ff" color="#022448" />}
                    {e.importance_score && <Pill text={`Importance: ${e.importance_score}/10`} bg="#f4f5f7" color="#43474e" />}
                  </div>
                </div>
              ))}</>}
              {o.prosecution_gaps?.length > 0 && <><Sec label="Prosecution Gaps" color="#93000a" />{(o.prosecution_gaps as string[]).map((g, i) => <Card key={i} bg="#fff8f8" border="rgba(186,26,26,0.1)"><p style={{ fontSize: '12px', color: '#191c1e', margin: 0 }}>• {g}</p></Card>)}</>}
              {o.defence_opportunities?.length > 0 && <><Sec label="Defence Opportunities" color="#15803d" />{(o.defence_opportunities as string[]).map((g, i) => <Card key={i} bg="#f0fdf4" border="rgba(21,128,61,0.12)"><p style={{ fontSize: '12px', color: '#191c1e', margin: 0 }}>• {g}</p></Card>)}</>}
            </div>
          );

          if (t === 'research') return (
            <div>
              {o.applicable_statutes?.length > 0 && <><Sec label={`${(o.applicable_statutes as any[]).length} Applicable Statutes`} color="#5b21b6" />{(o.applicable_statutes as any[]).map((s, i) => <Card key={i} bg="#f4f0ff" border="rgba(91,33,182,0.1)"><p style={{ fontSize: '12px', fontWeight: 700, color: '#022448', margin: '0 0 2px' }}>{s.section} — {s.act}</p><p style={{ fontSize: '11px', color: '#43474e', margin: '0 0 2px', lineHeight: 1.5 }}>{s.description}</p>{s.relevance && <p style={{ fontSize: '11px', color: '#5b21b6', margin: 0, fontStyle: 'italic' }}>{s.relevance}</p>}</Card>)}</>}
              {o.favorable_precedents?.length > 0 && <><Sec label={`${(o.favorable_precedents as any[]).length} Favourable Precedents`} color="#15803d" />{(o.favorable_precedents as any[]).map((p, i) => <Card key={i} bg="#f0fdf4" border="rgba(21,128,61,0.12)"><p style={{ fontSize: '12px', fontWeight: 700, color: '#022448', margin: '0 0 1px' }}>{p.citation}</p><p style={{ fontSize: '10px', color: '#74777f', margin: '0 0 4px' }}>{p.court} · {p.year}</p><p style={{ fontSize: '11px', color: '#43474e', margin: '0 0 3px', lineHeight: 1.5 }}>{p.held}</p>{p.relevance && <p style={{ fontSize: '11px', color: '#15803d', margin: 0, fontWeight: 600 }}>↳ Why it helps: {p.relevance}</p>}</Card>)}</>}
              {o.adverse_precedents?.length > 0 && <><Sec label={`${(o.adverse_precedents as any[]).length} Adverse Precedents`} color="#93000a" />{(o.adverse_precedents as any[]).map((p, i) => <Card key={i} bg="#fff8f8" border="rgba(186,26,26,0.1)"><p style={{ fontSize: '12px', fontWeight: 700, color: '#022448', margin: '0 0 1px' }}>{p.citation}</p><p style={{ fontSize: '10px', color: '#74777f', margin: '0 0 4px' }}>{p.court} · {p.year}</p><p style={{ fontSize: '11px', color: '#43474e', margin: '0 0 3px', lineHeight: 1.5 }}>{p.held}</p>{p.how_to_distinguish && <p style={{ fontSize: '11px', color: '#b45309', margin: 0, fontWeight: 600 }}>↳ Distinguish: {p.how_to_distinguish}</p>}</Card>)}</>}
              {o.disclaimer && <p style={{ fontSize: '10px', color: '#74777f', marginTop: '12px', fontStyle: 'italic' }}>⚠️ {o.disclaimer}</p>}
            </div>
          );

          if (t === 'deposition') return (
            <div>
              {(o.witness_name || o.credibility_assessment) && <Card bg="#f0f4ff" border="rgba(2,36,72,0.1)">
                {o.witness_name && <p style={{ fontSize: '13px', fontWeight: 700, color: '#022448', margin: '0 0 4px' }}>Witness: {o.witness_name}</p>}
                {o.credibility_assessment && <><span style={{ fontSize: '11px', color: '#74777f' }}>Credibility: </span><Pill text={o.credibility_assessment} bg={strengthBg(o.credibility_assessment)} color={strengthColor(o.credibility_assessment)} /></>}
                {o.credibility_reasoning && <p style={{ fontSize: '11px', color: '#43474e', margin: '6px 0 0', lineHeight: 1.5 }}>{o.credibility_reasoning}</p>}
              </Card>}
              {o.inconsistencies?.length > 0 && <><Sec label={`${(o.inconsistencies as any[]).length} Inconsistencies`} color="#b45309" />{(o.inconsistencies as any[]).map((inc, i) => <Card key={i} bg="#fff7ed" border="rgba(180,83,9,0.15)"><p style={{ fontSize: '12px', color: '#191c1e', margin: '0 0 3px' }}><strong>Statement:</strong> {inc.statement}</p><p style={{ fontSize: '11px', color: '#93000a', margin: '0 0 2px' }}><strong>Contradiction:</strong> {inc.contradiction}</p>{inc.page && <p style={{ fontSize: '10px', color: '#74777f', margin: 0 }}>Page: {inc.page}</p>}</Card>)}</>}
              {o.cross_examination_questions?.length > 0 && <><Sec label="Cross-Examination Questions" />{(o.cross_examination_questions as string[]).map((q, i) => <Card key={i}><p style={{ fontSize: '12px', color: '#191c1e', margin: 0 }}><span style={{ fontWeight: 700, color: '#022448' }}>Q{i+1}.</span> {q}</p></Card>)}</>}
            </div>
          );

          if (t === 'strategy') return (
            <div>
              {o.sentiment && <Card bg="#f0f4ff" border="rgba(2,36,72,0.1)">
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center', minWidth: '70px' }}>
                    <p style={{ fontFamily: 'Newsreader, serif', fontSize: '2.2rem', fontWeight: 800, color: strengthColor(o.sentiment.score >= 65 ? 'Strong' : o.sentiment.score >= 45 ? 'Moderate' : 'Weak'), margin: 0, lineHeight: 1 }}>{o.sentiment.score}%</p>
                    <p style={{ fontSize: '9px', fontWeight: 800, color: '#74777f', margin: '2px 0 0', letterSpacing: '0.06em' }}>WIN PROB</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '12px', color: '#191c1e', margin: '0 0 6px', lineHeight: 1.6 }}>{o.sentiment.reasoning}</p>
                    <div>
                      {o.sentiment.evidence_strength && <Pill text={`Evidence: ${o.sentiment.evidence_strength}`} bg={strengthBg(o.sentiment.evidence_strength)} color={strengthColor(o.sentiment.evidence_strength)} />}
                      {o.sentiment.precedent_strength && <Pill text={`Precedents: ${o.sentiment.precedent_strength}`} bg={strengthBg(o.sentiment.precedent_strength)} color={strengthColor(o.sentiment.precedent_strength)} />}
                      {o.sentiment.timeline_consistency && <Pill text={`Timeline: ${o.sentiment.timeline_consistency}`} bg={strengthBg(o.sentiment.timeline_consistency)} color={strengthColor(o.sentiment.timeline_consistency)} />}
                    </div>
                  </div>
                </div>
              </Card>}
              {o.strengths?.length > 0 && <><Sec label={`${(o.strengths as string[]).length} Strong Pointers`} color="#15803d" />{(o.strengths as string[]).map((s, i) => <Card key={i} bg="#f0fdf4" border="rgba(21,128,61,0.12)"><p style={{ fontSize: '12px', color: '#191c1e', margin: 0 }}>✓ {s}</p></Card>)}</>}
              {o.vulnerabilities?.length > 0 && <><Sec label={`${(o.vulnerabilities as any[]).length} Key Risks`} color="#b45309" />{(o.vulnerabilities as any[]).map((v, i) => <Card key={i} bg="#fff7ed" border="rgba(180,83,9,0.15)"><p style={{ fontSize: '12px', fontWeight: 600, color: '#191c1e', margin: '0 0 4px' }}>• {v.issue}</p>{v.mitigation && <p style={{ fontSize: '11px', color: '#15803d', margin: 0 }}>↳ Mitigation: {v.mitigation}</p>}</Card>)}</>}
              {o.opening_statement && <><Sec label="Opening Statement" /><Card bg="#022448" border="transparent"><p style={{ fontSize: '12px', color: '#e0e8f4', margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{o.opening_statement}</p></Card></>}
              {o.closing_skeleton && <><Sec label="Closing Skeleton" /><Card><p style={{ fontSize: '12px', color: '#191c1e', margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{o.closing_skeleton}</p></Card></>}
              {o.bench_questions?.length > 0 && <><Sec label="Anticipated Bench Questions" />{(o.bench_questions as any[]).map((q, i) => <Card key={i}><p style={{ fontSize: '12px', fontWeight: 600, color: '#022448', margin: '0 0 3px' }}>Q: {q.question}</p><p style={{ fontSize: '11px', color: '#43474e', margin: 0 }}>A: {q.suggested_answer}</p></Card>)}</>}
            </div>
          );

          return <pre style={{ fontSize: '11px', color: '#74777f', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{JSON.stringify(o, null, 2)}</pre>;
        };

        return (
          <div>
            {/* Agent cards */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              {AGENTS.map(({ type, Icon, label, desc }) => {
                const isRunning = runningAgent === type;
                const lastRun = (agents as any[]).find((j: any) => j.agent_type === type && j.status === 'completed');
                const isDone = !!lastRun;
                const isFailed = !isDone && (agents as any[]).some((j: any) => j.agent_type === type && j.status === 'failed');
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
                    {isDone && lastRun.completed_at && <p style={{ fontSize: '10px', color: '#15803d', fontWeight: 600, margin: '0 0 2px' }}>📄 Saved to Drafts · {new Date(lastRun.completed_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</p>}
                    {lastRun?.cost_inr && <p style={{ fontSize: '10px', color: '#74777f', margin: '0 0 10px' }}>Cost: ₹{Number(lastRun.cost_inr).toFixed(2)}</p>}
                    {!isDone && !isFailed && <div style={{ marginBottom: '10px' }} />}
                    {isRunning ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button disabled style={{ ...btnPrimary, flex: 1, justifyContent: 'center', background: '#edeef0', color: '#43474e', cursor: 'not-allowed' }}>
                          <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Running...
                        </button>
                        <button onClick={handleCancelAgent} disabled={cancellingAgent} title="Cancel" style={{ padding: '9px 12px', background: '#ffdad6', color: '#93000a', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => handleRunAgent(type)} disabled={!!runningAgent} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', opacity: runningAgent ? 0.4 : 1, background: isFailed ? '#93000a' : '#022448' }}>
                        <Play size={13} /> {isDone ? 'Re-run' : isFailed ? '↺ Retry' : 'Run Agent'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Run History with expandable output */}
            {(agents as any[]).length > 0 && (
              <div style={{ ...cardStyle, overflow: 'hidden' }}>
                <p style={{ ...sectionHeader, padding: '14px 20px 0' }}>RUN HISTORY — click a row to view full output</p>
                {(agents as any[]).slice(0, 15).map((job: any) => (
                  <div key={job.id}>
                    <button
                      onClick={() => job.status === 'completed' && setExpandedJobId(expandedJobId === job.id ? null : job.id)}
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
                        }}>{job.status.toUpperCase()}</span>
                        {job.status === 'completed' && (
                          <span style={{ fontSize: '12px', color: '#74777f', fontWeight: 700 }}>{expandedJobId === job.id ? '▲' : '▼'}</span>
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
                      <div style={{ padding: '8px 20px 10px', background: '#ffdad6', borderBottom: '1px solid rgba(196,198,207,0.08)' }}>
                        <p style={{ fontSize: '11px', color: '#93000a', margin: 0 }}><strong>Error:</strong> {job.error_message}</p>
                      </div>
                    )}
                    {expandedJobId === job.id && (
                      <div style={{ padding: '16px 20px 20px', background: '#f8faff', borderBottom: '2px solid #d5e3ff' }}>
                        {renderJobOutput(job)}
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
    print('✅  Agents tab replaced — expandable output panel added')
else:
    print('❌  Could not find agents tab block')
    print('    Checking for partial match...')
    if 'Stuck jobs banner' in content:
        print('    Found "Stuck jobs banner" — the block is present but whitespace may differ')
    if 'tr(\'run_history\')' in content:
        print('    Found run_history — partial old tab still present')
PYEOF

git add "apps/web/src/app/cases/[id]/page.tsx"
git commit -m "feat: expandable agent output panel in Run History — click any row to see full structured data"
git push origin main

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  Done! Pushed to main.                           ║"
echo "║                                                      ║"
echo "║  After Vercel deploys:                               ║"
echo "║  Go to any case → Agents tab → Run History          ║"
echo "║  Click any COMPLETED row to expand full output       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
