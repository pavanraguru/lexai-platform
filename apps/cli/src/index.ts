#!/usr/bin/env tsx
// ============================================================
// LexAI India — CLI Engine
// PRD v1.1 Week 1 Founder's Guide
// Usage: node lexai.js <command> [options]
// ============================================================

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';
import ora from 'ora';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── CLI Helpers ───────────────────────────────────────────────
const C = {
  header: (t: string) => chalk.bold.hex('#1E3A5F')(t),
  gold:   (t: string) => chalk.hex('#D4AF37')(t),
  green:  (t: string) => chalk.green(t),
  red:    (t: string) => chalk.red(t),
  dim:    (t: string) => chalk.dim(t),
  bold:   (t: string) => chalk.bold(t),
  blue:   (t: string) => chalk.blue(t),
};

function printBanner() {
  console.log('');
  console.log(C.header('  ╔═══════════════════════════════════════════════╗'));
  console.log(C.header('  ║') + C.gold('        ⚖  LexAI India  CLI  v1.1.0         ') + C.header('║'));
  console.log(C.header('  ║') + C.dim('    AI-Powered Legal Platform for India      ') + C.header('║'));
  console.log(C.header('  ╚═══════════════════════════════════════════════╝'));
  console.log('');
}

function printHelp() {
  printBanner();
  console.log(C.bold('  COMMANDS:\n'));
  console.log(`  ${C.gold('run-agent')}     Run an AI agent on a case`);
  console.log(`  ${C.gold('list-cases')}    List all case JSON files`);
  console.log(`  ${C.gold('show-output')}   Display the output of a previous agent run`);
  console.log(`  ${C.gold('chain')}         Run the full agent chain (all 5 agents)`);
  console.log(`  ${C.gold('new-case')}      Create a new case JSON interactively`);
  console.log(`  ${C.gold('help')}          Show this help message\n`);

  console.log(C.bold('  EXAMPLES:\n'));
  console.log(C.dim('  # Run evidence agent on a case'));
  console.log('  node src/index.ts run-agent --case cases/case_001.json --agent evidence\n');
  console.log(C.dim('  # Run all agents in sequence (full chain)'));
  console.log('  node src/index.ts chain --case cases/case_001.json\n');
  console.log(C.dim('  # Show last evidence output'));
  console.log('  node src/index.ts show-output --case case_001 --agent evidence\n');

  console.log(C.bold('  AGENTS:'));
  console.log('  evidence   — Extracts exhibits, facts, witnesses, contradictions');
  console.log('  timeline   — Reconstructs chronological sequence of events');
  console.log('  deposition — Analyses witness depositions for inconsistencies');
  console.log('  research   — Finds applicable Indian statutes and precedents');
  console.log('  strategy   — Generates opening statement, bench Q&A, sentiment\n');
}

function loadCase(caseFile: string): any {
  const filePath = path.resolve(caseFile);
  if (!fs.existsSync(filePath)) {
    console.error(C.red(`\n  ✗ Case file not found: ${filePath}\n`));
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function loadDocuments(caseData: any): string {
  if (!caseData.documents || caseData.documents.length === 0) {
    console.error(C.red('\n  ✗ No documents found in case JSON. Add a documents[] array.\n'));
    process.exit(1);
  }

  const docParts: string[] = [];
  for (const doc of caseData.documents) {
    const textFile = path.resolve(doc.text_file);
    if (!fs.existsSync(textFile)) {
      console.warn(C.gold(`  ⚠ Document text file not found: ${textFile} — skipping`));
      continue;
    }
    const text = fs.readFileSync(textFile, 'utf-8');
    docParts.push(
      `--- DOCUMENT: ${doc.name || doc.id} (${doc.category || 'unknown'}) [ID: ${doc.id}] ---\n${text}`
    );
  }

  if (docParts.length === 0) {
    console.error(C.red('\n  ✗ No readable documents found. Check your text_file paths.\n'));
    process.exit(1);
  }

  return docParts.join('\n\n');
}

function saveOutput(caseId: string, agentType: string, output: any): string {
  const outputDir = path.resolve('outputs');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const date = new Date().toISOString().split('T')[0];
  const filename = `${caseId}_${agentType}_${date}.json`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(output, null, 2), 'utf-8');
  return filepath;
}

function loadPriorOutput(caseId: string, agentType: string): any | null {
  const outputDir = path.resolve('outputs');
  if (!fs.existsSync(outputDir)) return null;

  const files = fs.readdirSync(outputDir)
    .filter(f => f.startsWith(`${caseId}_${agentType}_`) && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  try {
    return JSON.parse(fs.readFileSync(path.join(outputDir, files[0]), 'utf-8'));
  } catch {
    return null;
  }
}

// ── Indian Legal Context ─────────────────────────────────────
const INDIAN_LEGAL_CONTEXT = `
INDIAN LEGAL CONTEXT:
- Current criminal law: BNS 2023 (replaces IPC), BNSS 2023 (replaces CrPC), BSA 2023 (replaces Evidence Act)
- FIR delay >12 hours from offence is legally significant (per Supreme Court precedents)
- Witness types: PW = Prosecution Witness, DW = Defence Witness, CW = Court Witness  
- Evidence marking: E- (Exhibits), MO- (Material Objects), X- (X-rays/maps)
- Timezone: Indian Standard Time (IST = UTC+5:30)
- Citation format: (2024) 4 SCC 123 for SC; 2024 SCC OnLine Del 456 for HCs
- Court address: High Court/SC = "My Lord", District Court = "Your Honour", Tribunals = "Honourable Member"
`;

// ── Prompts ───────────────────────────────────────────────────
function buildPrompt(agentType: string, caseData: any, docContext: string, priorOutputs: Record<string, any>): { system: string; user: string } {
  const base = `You are an AI assistant to a senior Indian advocate.
${INDIAN_LEGAL_CONTEXT}
CASE: ${caseData.title}
Type: ${caseData.case_type} | Court: ${caseData.court} | Perspective: ${caseData.perspective || 'defence'}
${caseData.metadata?.sections_charged ? `Sections: ${caseData.metadata.sections_charged.join(', ')}` : ''}
${caseData.metadata?.fir_number ? `FIR: ${caseData.metadata.fir_number}` : ''}
Return ONLY valid JSON. No markdown. No explanation.`;

  switch (agentType) {
    case 'evidence':
      return {
        system: `${base}
Extract from the documents:
1. All exhibits with exhibit numbers (E-1, E-2, MO-1 etc.)
2. Key facts with source document ID and page number, importance: high/medium/low
3. All witnesses (PW/DW/CW) with numbering
4. Contradictions between documents (flag FIR vs chargesheet gaps especially)  
5. Standard documents MISSING for this case type

Return JSON: {"exhibits":[{"number","description","doc_id","page"}],"key_facts":[{"fact","doc_id","page","importance"}],"witnesses":[{"name","type","number","doc_id"}],"contradictions":[{"description","doc1_id","doc2_id","significance"}],"missing_docs":["..."]}`,
        user: `Analyse these documents:\n\n${docContext}`,
      };

    case 'timeline':
      return {
        system: `${base}
Reconstruct a chronological timeline from the documents.
Identify: offence date/time, FIR registration gap (flag if >12 hours), arrest date, court dates, prosecution narrative gaps, alibi windows.
All times in IST.

Return JSON: {"events":[{"date":"YYYY-MM-DD","time":"HH:MM or null","description","source_doc_id","source_page","event_type","importance_score","gap_after_minutes"}],"prosecution_gaps":[{"description","start_date","end_date","significance"}],"alibi_windows":[{"start","end","description"}]}`,
        user: `Reconstruct timeline from these documents:\n\n${docContext}${priorOutputs.evidence ? `\n\nEVIDENCE CONTEXT:\n${JSON.stringify(priorOutputs.evidence.key_facts?.slice(0,5))}` : ''}`,
      };

    case 'deposition':
      return {
        system: `${base}
Analyse the deposition for: self-contradictions, inconsistencies with FIR/chargesheet, suggested cross-examination questions, credibility score (0-10), objectionable questions.
Use Indian deposition stages: Examination-in-Chief, Cross-Examination, Re-Examination.

Return JSON: {"witness_name","witness_type","witness_number","credibility_score","credibility_reasoning","inconsistencies":[{"description","stmt1_location","stmt2_location","significance"}],"suggested_cross_questions":[{"question","based_on"}],"objectionable_questions":[{"quote","reason"}]}`,
        user: `Analyse this deposition:\n\n${docContext}`,
      };

    case 'research':
      return {
        system: `${base}
Find applicable Indian law: statutes with section numbers, favourable SC/HC precedents (post-2015 preferred), adverse precedents with distinguishing strategy.
Always include the standard disclaimer.

Return JSON: {"applicable_statutes":[{"act","section","description","relevance"}],"favorable_precedents":[{"citation","court","year","held","relevance_score","distinguishing_factors"}],"adverse_precedents":[{"citation","court","year","held","how_to_distinguish"}],"disclaimer":"AI-generated research. Verify all citations on SCC Online or Manupatra before relying in court."}`,
        user: `Research Indian law for this case:\n\n${docContext.substring(0, 15000)}`,
      };

    case 'strategy': {
      const addressAs = caseData.court_level === 'high_court' || caseData.court_level === 'supreme_court'
        ? 'My Lord' : 'Your Honour';
      const priorSummary = [
        priorOutputs.evidence ? `Evidence: ${priorOutputs.evidence.key_facts?.length || 0} facts, ${priorOutputs.evidence.contradictions?.length || 0} contradictions found` : '',
        priorOutputs.timeline ? `Timeline: ${priorOutputs.timeline.prosecution_gaps?.length || 0} prosecution gaps identified` : '',
        priorOutputs.research ? `Research: ${priorOutputs.research.favorable_precedents?.length || 0} favourable precedents found` : '',
      ].filter(Boolean).join('\n');

      return {
        system: `${base}
Prepare complete court strategy. Address judge as "${addressAs}".
Generate: full opening statement (2-4 pages, proper Indian court style), 15 bench questions with answers, closing argument skeleton, sentiment analysis, top 3 strengths and vulnerabilities.

Return JSON: {"perspective","opening_statement","closing_skeleton","bench_questions":[{"question","suggested_answer"}],"sentiment":{"label":"Favorable|Neutral|Unfavorable","score","reasoning","evidence_strength","precedent_strength","timeline_consistency","witness_credibility"},"strengths":["..."],"vulnerabilities":[{"issue","mitigation"}]}`,
        user: `Develop strategy based on analysis:\n${priorSummary}\n\nDocuments:\n${docContext.substring(0, 12000)}`,
      };
    }

    default:
      throw new Error(`Unknown agent: ${agentType}`);
  }
}

// ── Display Output ────────────────────────────────────────────
function displayOutput(agentType: string, output: any, costINR: number, tokens: { input: number; output: number }) {
  console.log('');
  console.log(C.green('  ✅  ANALYSIS COMPLETE'));
  console.log(C.dim('  ' + '─'.repeat(60)));

  switch (agentType) {
    case 'evidence':
      console.log(C.bold(`  Exhibits Found:       `) + C.gold(String(output.exhibits?.length || 0)));
      console.log(C.bold(`  Key Facts:            `) + (output.key_facts?.length || 0));
      console.log(C.bold(`  Witnesses:            `) + (output.witnesses?.length || 0));
      console.log(C.bold(`  Contradictions:       `) + C.red(String(output.contradictions?.length || 0)) + (output.contradictions?.length > 0 ? C.red(' ⚠') : ''));
      console.log(C.bold(`  Missing Documents:    `) + (output.missing_docs?.length || 0));
      if (output.contradictions?.length > 0) {
        console.log('');
        console.log(C.red('  ⚠  CONTRADICTIONS FOUND:'));
        for (const c of output.contradictions) {
          console.log(C.red(`     • [${c.significance?.toUpperCase()}] ${c.description}`));
        }
      }
      if (output.key_facts?.length > 0) {
        const highFacts = output.key_facts.filter((f: any) => f.importance === 'high');
        if (highFacts.length > 0) {
          console.log('');
          console.log(C.gold('  ⭐  HIGH IMPORTANCE FACTS:'));
          for (const f of highFacts.slice(0, 3)) {
            console.log(C.gold(`     • ${f.fact}`));
          }
        }
      }
      break;

    case 'timeline':
      console.log(C.bold(`  Timeline Events:      `) + (output.events?.length || 0));
      console.log(C.bold(`  Prosecution Gaps:     `) + C.red(String(output.prosecution_gaps?.length || 0)));
      console.log(C.bold(`  Alibi Windows:        `) + C.green(String(output.alibi_windows?.length || 0)));
      if (output.prosecution_gaps?.length > 0) {
        console.log('');
        console.log(C.red('  ⚠  PROSECUTION NARRATIVE GAPS:'));
        for (const g of output.prosecution_gaps) {
          console.log(C.red(`     • [${g.significance?.toUpperCase()}] ${g.description}`));
        }
      }
      break;

    case 'deposition':
      console.log(C.bold(`  Witness:              `) + (output.witness_name || 'Unknown'));
      console.log(C.bold(`  Credibility Score:    `) + C.gold(`${output.credibility_score || 0}/10`));
      console.log(C.bold(`  Inconsistencies:      `) + C.red(String(output.inconsistencies?.length || 0)));
      console.log(C.bold(`  Cross Questions:      `) + (output.suggested_cross_questions?.length || 0));
      if (output.inconsistencies?.length > 0) {
        console.log('');
        console.log(C.red('  ⚠  KEY INCONSISTENCIES:'));
        for (const i of output.inconsistencies.slice(0, 3)) {
          console.log(C.red(`     • [${i.significance?.toUpperCase()}] ${i.description}`));
        }
      }
      break;

    case 'research':
      console.log(C.bold(`  Applicable Statutes:  `) + (output.applicable_statutes?.length || 0));
      console.log(C.bold(`  Favourable Precedents:`) + C.green(String(output.favorable_precedents?.length || 0)));
      console.log(C.bold(`  Adverse Precedents:   `) + C.red(String(output.adverse_precedents?.length || 0)));
      if (output.favorable_precedents?.length > 0) {
        console.log('');
        console.log(C.green('  ✓  TOP FAVOURABLE PRECEDENTS:'));
        for (const p of output.favorable_precedents.slice(0, 3)) {
          console.log(C.green(`     • ${p.citation} (${p.court}, ${p.year})`));
          console.log(C.dim(`       ${p.held?.substring(0, 100)}...`));
        }
      }
      console.log('');
      console.log(C.dim(`  ⚠  ${output.disclaimer}`));
      break;

    case 'strategy':
      const sentiment = output.sentiment;
      const sentColor = sentiment?.label === 'Favorable' ? C.green : sentiment?.label === 'Unfavorable' ? C.red : C.gold;
      console.log(C.bold(`  Perspective:          `) + (output.perspective || ''));
      console.log(C.bold(`  Case Sentiment:       `) + sentColor(`${sentiment?.label || 'Unknown'} (${sentiment?.score || 0}/100)`));
      console.log(C.bold(`  Evidence Strength:    `) + (sentiment?.evidence_strength || 'Unknown'));
      console.log(C.bold(`  Bench Questions:      `) + (output.bench_questions?.length || 0));
      console.log(C.bold(`  Strengths Found:      `) + C.green(String(output.strengths?.length || 0)));
      console.log(C.bold(`  Vulnerabilities:      `) + C.red(String(output.vulnerabilities?.length || 0)));
      if (output.strengths?.length > 0) {
        console.log('');
        console.log(C.green('  ✓  TOP STRENGTHS:'));
        for (const s of output.strengths) {
          console.log(C.green(`     • ${s}`));
        }
      }
      if (output.opening_statement) {
        console.log('');
        console.log(C.gold('  📄  OPENING STATEMENT (first 300 chars):'));
        console.log(C.dim(`     "${output.opening_statement.substring(0, 300)}..."`));
      }
      break;
  }

  console.log('');
  console.log(C.dim('  ' + '─'.repeat(60)));
  console.log(C.dim(`  Tokens: ${tokens.input} input + ${tokens.output} output  |  Cost: `) + C.gold(`₹${costINR}`));
}

// ── Run Agent ─────────────────────────────────────────────────
async function runAgent(caseFile: string, agentType: string, options: { chain?: boolean } = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(C.red('\n  ✗ ANTHROPIC_API_KEY not set. Copy .env.example to .env and add your key.\n'));
    process.exit(1);
  }

  printBanner();
  const caseData = loadCase(caseFile);
  const caseId = caseData.id || path.basename(caseFile, '.json');

  console.log(C.blue(`  🔍  Agent: `) + C.bold(agentType.toUpperCase()));
  console.log(C.blue(`  📁  Case:  `) + caseData.title);
  console.log(C.blue(`  ⚖   Court: `) + caseData.court);
  console.log('');

  const spinner = ora({ text: 'Loading documents...', color: 'blue' }).start();

  const docContext = loadDocuments(caseData);
  const docCount = caseData.documents?.length || 0;

  // Load prior outputs for chained agents
  const priorOutputs: Record<string, any> = {};
  const DEPENDENCIES: Record<string, string[]> = {
    evidence: [], timeline: ['evidence'], deposition: [],
    research: [], strategy: ['evidence', 'timeline', 'research'],
  };

  for (const dep of DEPENDENCIES[agentType] || []) {
    const prior = loadPriorOutput(caseId, dep);
    if (prior) {
      priorOutputs[dep] = prior;
      spinner.text = `Loaded prior ${dep} output...`;
    } else {
      spinner.warn(`No prior ${dep} output found. ${agentType} will work without it but quality may be lower.`);
      spinner.start();
    }
  }

  spinner.text = `Sending ${docCount} document(s) to Claude claude-sonnet-4-6...`;

  try {
    const { system, user } = buildPrompt(agentType, caseData, docContext, priorOutputs);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: agentType === 'strategy' ? 8000 : 6000,
      system,
      messages: [{ role: 'user', content: user }],
    });

    spinner.succeed('Analysis complete');

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const costINR = Math.round(((inputTokens / 1_000_000 * 3) + (outputTokens / 1_000_000 * 15)) * 83.5 * 100) / 100;

    // Parse output — handle markdown fences, truncated JSON, and extra text
    let output: any;
    try {
      // Step 1: strip markdown code fences
      let clean = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      // Step 2: if JSON is truncated (Claude hit token limit mid-stream),
      // find the last complete top-level property and close the object
      if (!clean.endsWith('}')) {
        // Find the last complete property by looking for the last "},\n    {" pattern
        // and close off the JSON gracefully
        const lastGoodPos = clean.lastIndexOf('"},');
        const lastGoodArr  = clean.lastIndexOf('"}');
        const cutAt = Math.max(lastGoodPos, lastGoodArr);
        if (cutAt > 0) {
          clean = clean.substring(0, cutAt + 2); // include the closing "}"
          // Count unclosed brackets and close them
          const opens  = (clean.match(/\[/g) || []).length;
          const closes = (clean.match(/\]/g) || []).length;
          const objOpens  = (clean.match(/\{/g) || []).length;
          const objCloses = (clean.match(/\}/g) || []).length;
          for (let i = 0; i < opens - closes; i++)  clean += ']';
          for (let i = 0; i < objOpens - objCloses; i++) clean += '}';
        }
      }

      output = JSON.parse(clean);
    } catch {
      // Step 3: last resort — extract whatever partial JSON we can
      console.warn(C.gold('\n  ⚠ Response was truncated — showing partial results.\n'));
      try {
        // Try to pull out individual arrays using regex
        const extractArray = (key: string) => {
          const match = rawText.match(new RegExp(`"${key}"\\s*:\\s*(\\[[\\s\\S]*?\\])\\s*[,}]`));
          if (match) { try { return JSON.parse(match[1]); } catch { return []; } }
          return [];
        };
        output = {
          exhibits: extractArray('exhibits'),
          key_facts: extractArray('key_facts'),
          witnesses: extractArray('witnesses'),
          contradictions: extractArray('contradictions'),
          missing_docs: extractArray('missing_docs'),
          _truncated: true,
        };
      } catch {
        output = { raw: rawText, parse_error: true };
      }
    }

    output.case_id = caseId;
    output.agent_type = agentType;
    output.run_at = new Date().toISOString();
    output.tokens = { input: inputTokens, output: outputTokens };
    output.cost_inr = costINR;

    // Display results
    displayOutput(agentType, output, costINR, { input: inputTokens, output: outputTokens });

    // Save output
    const outputPath = saveOutput(caseId, agentType, output);
    console.log(C.bold('  📄  Output saved: ') + C.dim(outputPath));
    console.log('');

    return output;

  } catch (error: any) {
    spinner.fail(`Agent failed: ${error.message}`);
    console.error(C.red(`\n  Error details: ${error.message}\n`));
    process.exit(1);
  }
}

// ── Run Full Chain ────────────────────────────────────────────
async function runChain(caseFile: string) {
  printBanner();
  console.log(C.gold('  🔗  Running FULL AGENT CHAIN (all 5 agents in sequence)\n'));

  const agents = ['evidence', 'timeline', 'research', 'deposition', 'strategy'];
  const outputs: Record<string, any> = {};

  for (const agent of agents) {
    console.log(C.header(`\n  ═══ RUNNING: ${agent.toUpperCase()} AGENT ═══\n`));
    try {
      outputs[agent] = await runAgent(caseFile, agent);
    } catch (e: any) {
      console.warn(C.gold(`  ⚠ ${agent} agent skipped: ${e.message}`));
    }
  }

  console.log('');
  console.log(C.green('  ✅  FULL CHAIN COMPLETE'));
  console.log(C.dim('  All agent outputs saved to outputs/ directory'));
  const totalCost = Object.values(outputs).reduce((sum: number, o: any) => sum + (o?.cost_inr || 0), 0);
  console.log(C.bold('  Total cost: ') + C.gold(`₹${totalCost.toFixed(2)}`));
  console.log('');
}

// ── List Cases ────────────────────────────────────────────────
function listCases() {
  printBanner();
  const casesDir = path.resolve('cases');

  if (!fs.existsSync(casesDir)) {
    console.log(C.gold('  No cases/ directory found. Create cases/case_001.json to get started.\n'));
    return;
  }

  const files = fs.readdirSync(casesDir).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    console.log(C.dim('  No case files found in cases/\n'));
    return;
  }

  console.log(C.bold('  CASES:\n'));
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(casesDir, file), 'utf-8'));
      const nextHearing = data.next_hearing_date ? C.gold(data.next_hearing_date) : C.dim('No hearing set');
      console.log(`  ${C.bold(data.id || file.replace('.json',''))}  ${data.title}`);
      console.log(`  ${C.dim('  Court:')} ${data.court}  ${C.dim('Status:')} ${data.status || 'unknown'}  ${C.dim('Next:')} ${nextHearing}`);
      console.log('');
    } catch {
      console.log(`  ${C.red('✗')} ${file} — invalid JSON`);
    }
  }
}

// ── Show Output ───────────────────────────────────────────────
function showOutput(caseId: string, agentType: string) {
  const output = loadPriorOutput(caseId, agentType);
  if (!output) {
    console.log(C.red(`\n  No output found for case ${caseId}, agent ${agentType}\n`));
    process.exit(1);
  }
  console.log(JSON.stringify(output, null, 2));
}

// ── Parse CLI Args ────────────────────────────────────────────
function parseArgs(args: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace('--', '');
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        result[key] = args[i + 1];
        i++;
      } else {
        result[key] = true;
      }
    } else if (!result._command) {
      result._command = args[i];
    }
  }
  return result;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    return;
  }

  const parsed = parseArgs(args);
  const command = args[0];

  switch (command) {
    case 'run-agent': {
      const caseFile = parsed.case as string;
      const agentType = parsed.agent as string;
      if (!caseFile || !agentType) {
        console.error(C.red('\n  Usage: lexai run-agent --case cases/case_001.json --agent evidence\n'));
        process.exit(1);
      }
      await runAgent(caseFile, agentType, { chain: parsed.chain === true });
      break;
    }

    case 'chain': {
      const caseFile = parsed.case as string;
      if (!caseFile) {
        console.error(C.red('\n  Usage: lexai chain --case cases/case_001.json\n'));
        process.exit(1);
      }
      await runChain(caseFile);
      break;
    }

    case 'list-cases': {
      listCases();
      break;
    }

    case 'show-output': {
      const caseId = parsed.case as string;
      const agentType = parsed.agent as string;
      if (!caseId || !agentType) {
        console.error(C.red('\n  Usage: lexai show-output --case case_001 --agent evidence\n'));
        process.exit(1);
      }
      showOutput(caseId, agentType);
      break;
    }

    default:
      console.error(C.red(`\n  Unknown command: ${command}\n`));
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(C.red(`\n  Fatal error: ${err.message}\n`));
  process.exit(1);
});
