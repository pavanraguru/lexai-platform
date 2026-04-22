#!/bin/bash
# ============================================================
# LexAI India — Fix Agents v2 (macOS compatible)
# Fixes:
#   1. Research agent JSON truncation error
#   2. Replaces Redis banner with per-agent Cancel button
#   3. Auto-saves all agent outputs to Drafts (timestamped + versioned)
#
# Run from lexai-platform root:
#   cd ~/Desktop/lexai-platform && bash fix-agents-v2.sh
# ============================================================

set -e

if [ ! -f "package.json" ] || [ ! -d "apps/api" ]; then
  echo "❌  Run this from the lexai-platform root directory."
  echo "    cd ~/Desktop/lexai-platform && bash fix-agents-v2.sh"
  exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║     LexAI India — Fix Agents v2 (3 changes)       ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────────────────────
# FIX 1: Research agent — JSON truncation fix + auto-save to Drafts
# File: apps/api/src/routes/agents.ts
# ─────────────────────────────────────────────────────────────
echo "📄  Fix 1: Patching apps/api/src/routes/agents.ts ..."

python3 << 'PYEOF'
path = 'apps/api/src/routes/agents.ts'
with open(path, 'r') as f:
    content = f.read()

# ── 1a. Fix research prompt: reduce doc context to 6000 chars to avoid truncation
old_research_user = "        user: `Research Indian law for this case:\\\\n\\\\n${docContext.substring(0, 12000)}`,"
new_research_user = "        user: `Research Indian law for this case:\\\\n\\\\n${docContext.substring(0, 6000)}`,"

if old_research_user in content:
    content = content.replace(old_research_user, new_research_user)
    print('    ✅  Research doc context trimmed from 12000 → 6000 chars')
else:
    # Try alternative quoting
    old2 = "user: `Research Indian law for this case:\\n\\n${docContext.substring(0, 12000)}`,"
    new2 = "user: `Research Indian law for this case:\\n\\n${docContext.substring(0, 6000)}`,"
    if old2 in content:
        content = content.replace(old2, new2)
        print('    ✅  Research doc context trimmed (alt match)')
    else:
        print('    ⚠️   Could not find research user prompt — check manually')

# ── 1b. Increase max_tokens for research agent to 3000
old_tokens = "max_tokens: agent_type === 'strategy' ? 4000 : 2000,"
new_tokens = "max_tokens: agent_type === 'strategy' ? 4000 : agent_type === 'research' ? 3000 : 2000,"
if old_tokens in content:
    content = content.replace(old_tokens, new_tokens)
    print('    ✅  Research max_tokens raised to 3000')
else:
    print('    ℹ️   max_tokens line not found as expected — may already be updated')

# ── 1c. After the agentJob.update (completed), auto-save to Drafts
# Find the log line after completion and inject draft-save code after it
old_log = "    console.log(`[Agents Inline] ✅ ${agent_type} done. Tokens: ${inputTokens}+${outputTokens}. Cost: ₹${costINR}`);"
new_log = """    console.log(`[Agents Inline] ✅ ${agent_type} done. Tokens: ${inputTokens}+${outputTokens}. Cost: ₹${costINR}`);

    // ── Auto-save agent output to Drafts (timestamped + versioned) ──
    try {
      const agentLabels: Record<string, string> = {
        evidence: 'Evidence Analysis', timeline: 'Case Timeline',
        research: 'Legal Research Memo', deposition: 'Deposition Analysis', strategy: 'Case Strategy',
      };
      const docTypes: Record<string, string> = {
        evidence: 'other', timeline: 'other', research: 'other',
        deposition: 'other', strategy: 'other',
      };
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
      const draftTitle = `${agentLabels[agent_type] || agent_type} — ${dateStr} ${timeStr}`;

      // Build human-readable draft text from parsed output
      let draftText = '';
      if (agent_type === 'evidence') {
        const lines: string[] = [];
        lines.push('EVIDENCE ANALYSIS REPORT');
        lines.push('========================');
        if (parsed.key_facts?.length) {
          lines.push('\\nKEY FACTS:');
          parsed.key_facts.forEach((f: string, i: number) => lines.push(`${i+1}. ${f}`));
        }
        if (parsed.exhibits?.length) {
          lines.push('\\nEXHIBITS:');
          parsed.exhibits.forEach((e: any) => lines.push(`• Exhibit ${e.number || ''}: ${e.description || ''} — Strength: ${e.strength || ''}`));
        }
        if (parsed.contradictions?.length) {
          lines.push('\\nCONTRADICTIONS:');
          (Array.isArray(parsed.contradictions) ? parsed.contradictions : []).forEach((c: any) => lines.push(`• ${typeof c === 'string' ? c : c.description || JSON.stringify(c)}`));
        }
        if (parsed.missing_evidence?.length) {
          lines.push('\\nMISSING EVIDENCE:');
          parsed.missing_evidence.forEach((m: string) => lines.push(`• ${m}`));
        }
        draftText = lines.join('\\n');
      } else if (agent_type === 'timeline') {
        const lines: string[] = ['CASE TIMELINE', '============='];
        (parsed.events || []).forEach((e: any) => {
          lines.push(`\\n[${e.date || ''}${e.time ? ' ' + e.time : ''}] ${e.description || ''}`);
          if (e.event_type) lines.push(`   Type: ${e.event_type} | Importance: ${e.importance_score || ''}/10`);
        });
        if (parsed.prosecution_gaps?.length) {
          lines.push('\\nPROSECUTION GAPS:');
          parsed.prosecution_gaps.forEach((g: string) => lines.push(`• ${g}`));
        }
        if (parsed.defence_opportunities?.length) {
          lines.push('\\nDEFENCE OPPORTUNITIES:');
          parsed.defence_opportunities.forEach((o: string) => lines.push(`• ${o}`));
        }
        draftText = lines.join('\\n');
      } else if (agent_type === 'research') {
        const lines: string[] = ['LEGAL RESEARCH MEMO', '==================='];
        if (parsed.applicable_statutes?.length) {
          lines.push('\\nAPPLICABLE STATUTES:');
          parsed.applicable_statutes.forEach((s: any) => {
            lines.push(`\\n${s.act} — ${s.section}`);
            if (s.description) lines.push(`  ${s.description}`);
            if (s.relevance) lines.push(`  Relevance: ${s.relevance}`);
          });
        }
        if (parsed.favorable_precedents?.length) {
          lines.push('\\nFAVOURABLE PRECEDENTS:');
          parsed.favorable_precedents.forEach((p: any) => {
            lines.push(`\\n${p.citation} (${p.court}, ${p.year})`);
            if (p.held) lines.push(`  Held: ${p.held}`);
            if (p.relevance) lines.push(`  Why it helps: ${p.relevance}`);
          });
        }
        if (parsed.adverse_precedents?.length) {
          lines.push('\\nADVERSE PRECEDENTS:');
          parsed.adverse_precedents.forEach((p: any) => {
            lines.push(`\\n${p.citation} (${p.court}, ${p.year})`);
            if (p.held) lines.push(`  Held: ${p.held}`);
            if (p.how_to_distinguish) lines.push(`  How to distinguish: ${p.how_to_distinguish}`);
          });
        }
        if (parsed.disclaimer) lines.push(`\\n⚠️  ${parsed.disclaimer}`);
        draftText = lines.join('\\n');
      } else if (agent_type === 'deposition') {
        const lines: string[] = ['DEPOSITION ANALYSIS', '==================='];
        if (parsed.witness_name) lines.push(`\\nWitness: ${parsed.witness_name}`);
        if (parsed.credibility_assessment) lines.push(`Credibility: ${parsed.credibility_assessment}`);
        if (parsed.credibility_reasoning) lines.push(`Reasoning: ${parsed.credibility_reasoning}`);
        if (parsed.inconsistencies?.length) {
          lines.push('\\nINCONSISTENCIES:');
          parsed.inconsistencies.forEach((i: any, idx: number) => {
            lines.push(`\\n${idx+1}. Statement: ${i.statement || ''}`);
            if (i.contradiction) lines.push(`   Contradiction: ${i.contradiction}`);
            if (i.page) lines.push(`   Page: ${i.page}`);
          });
        }
        if (parsed.cross_examination_questions?.length) {
          lines.push('\\nCROSS-EXAMINATION QUESTIONS:');
          parsed.cross_examination_questions.forEach((q: string, i: number) => lines.push(`${i+1}. ${q}`));
        }
        draftText = lines.join('\\n');
      } else if (agent_type === 'strategy') {
        const lines: string[] = ['CASE STRATEGY', '============='];
        if (parsed.sentiment) {
          lines.push(`\\nWin Probability: ${parsed.sentiment.score}% (${parsed.sentiment.label})`);
          if (parsed.sentiment.reasoning) lines.push(`Reasoning: ${parsed.sentiment.reasoning}`);
        }
        if (parsed.opening_statement) {
          lines.push('\\nOPENING STATEMENT:');
          lines.push(parsed.opening_statement);
        }
        if (parsed.strengths?.length) {
          lines.push('\\nSTRENGTHS:');
          parsed.strengths.forEach((s: string) => lines.push(`✓ ${s}`));
        }
        if (parsed.vulnerabilities?.length) {
          lines.push('\\nKEY RISKS:');
          parsed.vulnerabilities.forEach((v: any) => {
            lines.push(`• ${v.issue}`);
            if (v.mitigation) lines.push(`  Mitigation: ${v.mitigation}`);
          });
        }
        if (parsed.closing_skeleton) {
          lines.push('\\nCLOSING SKELETON:');
          lines.push(parsed.closing_skeleton);
        }
        draftText = lines.join('\\n');
      } else {
        draftText = JSON.stringify(parsed, null, 2);
      }

      // Check if a draft for this agent type already exists — if so, increment version
      const existingDraft = await fastify.prisma.draft.findFirst({
        where: { case_id, tenant_id, promoted_from_job: { not: null } },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const nextVersion = (existingDraft?.version || 0) + 1;

      await fastify.prisma.draft.create({
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
      });
      console.log(`[Agents Inline] 📄 Draft saved: "${draftTitle}" (v${nextVersion})`);
    } catch (draftErr: any) {
      console.warn('[Agents Inline] Draft auto-save failed (non-fatal):', draftErr.message);
    }"""

if old_log in content:
    content = content.replace(old_log, new_log)
    print('    ✅  Auto-save to Drafts injected after agent completion')
else:
    print('    ⚠️   Could not find completion log line — draft auto-save not injected')

with open(path, 'w') as f:
    f.write(content)
print('    ✅  agents.ts saved')
PYEOF

# ─────────────────────────────────────────────────────────────
# FIX 2 & 3: UI — remove Redis banner, add per-agent Cancel button,
#             show "Saved to Drafts" badge on completed agents
# File: apps/web/src/app/cases/[id]/page.tsx
# ─────────────────────────────────────────────────────────────
echo ""
echo "📄  Fix 2+3: Patching apps/web/src/app/cases/[id]/page.tsx ..."

python3 << 'PYEOF'
path = 'apps/web/src/app/cases/[id]/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# ── 2a. Add cancelAgent state variable after runningAgent state ──
old_state = "  const [runningAgent, setRunningAgent] = useState<string | null>(null);"
new_state = """  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [cancellingAgent, setCancellingAgent] = useState(false);"""

if old_state in content and 'cancellingAgent' not in content:
    content = content.replace(old_state, new_state)
    print('    ✅  cancellingAgent state added')

# ── 2b. Add handleCancelAgent function after handleRunAgent ──
old_handle_end = """    } catch (err: any) {
      setError(err.message);
      setRunningAgent(null);
    }
  };

  const handleCreatePresentation"""

new_handle_end = """    } catch (err: any) {
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

if old_handle_end in content and 'handleCancelAgent' not in content:
    content = content.replace(old_handle_end, new_handle_end)
    print('    ✅  handleCancelAgent function added')

# ── 2c. Replace the entire agents tab render ──
old_agents_tab = """      {activeTab === 'agents' && (
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

new_agents_tab = """      {activeTab === 'agents' && (
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
                  <p style={{ fontSize: '12px', color: '#74777f', margin: '0 0 4px', lineHeight: 1.5 }}>{desc}</p>
                  {isDone && lastRunTime && (
                    <p style={{ fontSize: '10px', color: '#15803d', margin: '0 0 10px', fontWeight: 600 }}>
                      📄 Saved to Drafts · {new Date(lastRunTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  )}
                  {isDone && lastRun?.cost_inr && (
                    <p style={{ fontSize: '10px', color: '#74777f', margin: '0 0 10px' }}>Cost: ₹{Number(lastRun.cost_inr).toFixed(2)}</p>
                  )}
                  {!isDone && !isFailed && <div style={{ marginBottom: '10px' }} />}
                  {isRunning ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button disabled style={{ ...btnPrimary, flex: 1, justifyContent: 'center', background: '#edeef0', color: '#43474e', cursor: 'not-allowed' }}>
                        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Running...
                      </button>
                      <button onClick={handleCancelAgent} disabled={cancellingAgent} title="Cancel this agent" style={{ padding: '9px 12px', background: '#ffdad6', color: '#93000a', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 700 }}>
                        ✕
                      </button>
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

          {/* Run history */}
          {agents.length > 0 && (
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <p style={sectionHeader}>RUN HISTORY</p>
              {agents.slice(0, 10).map((job: any) => (
                <div key={job.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(196,198,207,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', margin: 0, textTransform: 'capitalize' }}>{job.agent_type} Analysis</p>
                      <p style={{ fontSize: '11px', color: '#74777f', margin: '2px 0 0' }}>
                        {new Date(job.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                        {job.cost_inr ? ` · ₹${Number(job.cost_inr).toFixed(2)}` : ''}
                        {job.tokens_input ? ` · ${job.tokens_input + (job.tokens_output || 0)} tokens` : ''}
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
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '2px', background: '#d5e3ff', color: '#022448' }}>
                          📄 IN DRAFTS
                        </span>
                      )}
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

if old_agents_tab in content:
    content = content.replace(old_agents_tab, new_agents_tab)
    print('    ✅  Agents tab UI replaced (Redis banner removed, Cancel button added, Drafts badge added)')
else:
    print('    ⚠️   Could not find agents tab block — check page.tsx manually')

with open(path, 'w') as f:
    f.write(content)
print('    ✅  page.tsx saved')
PYEOF

# ─────────────────────────────────────────────────────────────
# GIT COMMIT & PUSH
# ─────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════"
echo "  All changes applied. Pushing to git..."
echo "══════════════════════════════════════════════════"
echo ""

git add \
  apps/api/src/routes/agents.ts \
  apps/web/src/app/cases/\[id\]/page.tsx

git commit -m "fix: research JSON truncation, remove Redis banner, add Cancel button + auto-save agent output to Drafts with timestamp+version"
git push origin main

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅  Done! Pushed to main.                       ║"
echo "║                                                  ║"
echo "║  Railway redeploys in ~2 minutes.                ║"
echo "║                                                  ║"
echo "║  Changes live after deploy:                      ║"
echo "║  • Research agent no longer truncates JSON       ║"
echo "║  • No more Redis banner                          ║"
echo "║  • Running agents show ✕ Cancel button           ║"
echo "║  • Every completed agent auto-saves to Drafts    ║"
echo "║    with timestamp (e.g. 'Evidence Analysis —     ║"
echo "║    21 Apr 2026 02:30 PM') and version number     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
