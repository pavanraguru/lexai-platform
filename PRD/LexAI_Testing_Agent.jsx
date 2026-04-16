import { useState, useEffect, useRef } from "react";

// ── LexAI India — Autonomous Testing Agent ─────────────────────
// Runs all test suites against the live API and reports bugs.
// Set your credentials below before running.

const API_BASE = "https://lexai-platform-production.up.railway.app";

// ── Test Suites Definition ─────────────────────────────────────
const TEST_SUITES = [
  {
    id: "auth",
    name: "Authentication",
    icon: "🔐",
    tests: [
      {
        id: "auth_login_valid",
        name: "Login with valid credentials",
        run: async ({ email, password }) => {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
          if (!data.data?.access_token) throw new Error("No access_token in response");
          if (!data.data?.user?.id) throw new Error("No user.id in response");
          return { token: data.data.access_token, user: data.data.user, detail: `Logged in as ${data.data.user.full_name} (${data.data.user.role})` };
        },
      },
      {
        id: "auth_login_invalid",
        name: "Login with wrong password returns 401",
        run: async ({ email }) => {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: "wrongpassword123!" }),
          });
          if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
          return { detail: "Correctly returns 401 for invalid credentials" };
        },
      },
    ],
  },
  {
    id: "cases",
    name: "Case Management",
    icon: "⚖️",
    tests: [
      {
        id: "cases_list",
        name: "GET /v1/cases returns case list",
        run: async ({ token }) => {
          const res = await fetch(`${API_BASE}/v1/cases`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
          if (!Array.isArray(data.data)) throw new Error("data.data is not an array");
          return { detail: `Found ${data.data.length} cases`, caseId: data.data[0]?.id, caseType: data.data[0]?.case_type };
        },
      },
      {
        id: "cases_create",
        name: "POST /v1/cases creates a test case",
        run: async ({ token }) => {
          const res = await fetch(`${API_BASE}/v1/cases`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              title: `[TEST] Auto-test case ${Date.now()}`,
              court: "Delhi High Court",
              case_type: "civil_district",
              court_level: "high_court",
              perspective: "defence",
              status: "intake",
              priority: "medium",
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
          if (!data.data?.id) throw new Error("No case id returned");
          return { detail: `Created case: ${data.data.title}`, testCaseId: data.data.id };
        },
      },
      {
        id: "cases_get_single",
        name: "GET /v1/cases/:id returns case detail",
        run: async ({ token, testCaseId, caseId }) => {
          const id = testCaseId || caseId;
          if (!id) throw new Error("No case ID available — run cases_list first");
          const res = await fetch(`${API_BASE}/v1/cases/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
          if (!data.data?.id) throw new Error("No case detail in response");
          return { detail: `Case: ${data.data.title} | Status: ${data.data.status}` };
        },
      },
      {
        id: "cases_delete_test",
        name: "DELETE /v1/cases/:id removes test case",
        run: async ({ token, testCaseId }) => {
          if (!testCaseId) return { detail: "Skipped — no test case to delete", skipped: true };
          const res = await fetch(`${API_BASE}/v1/cases/${testCaseId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || `HTTP ${res.status}`);
          }
          return { detail: "Test case deleted successfully" };
        },
      },
    ],
  },
  {
    id: "drafts",
    name: "Drafting Workspace",
    icon: "📝",
    tests: [
      {
        id: "drafts_all_types",
        name: "Create draft for each valid doc_type",
        run: async ({ token, caseId }) => {
          if (!caseId) throw new Error("No case ID — run cases_list first");
          const VALID_TYPES = ["bail_application", "plaint", "written_statement", "writ_petition", "affidavit", "vakalatnama", "opening_statement", "closing_statement", "rejoinder", "memo_of_appeal", "other"];
          const results = [];
          const createdIds = [];
          for (const docType of VALID_TYPES) {
            const res = await fetch(`${API_BASE}/v1/drafts`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ case_id: caseId, title: `Test ${docType}`, doc_type: docType, content: { type: "doc", content: [] } }),
            });
            const data = await res.json();
            if (!res.ok) {
              results.push(`❌ ${docType}: ${data.message}`);
            } else {
              results.push(`✅ ${docType}`);
              createdIds.push(data.data?.id);
            }
          }
          // Cleanup
          for (const id of createdIds) {
            if (id) await fetch(`${API_BASE}/v1/drafts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
          }
          const failed = results.filter(r => r.startsWith("❌"));
          if (failed.length > 0) throw new Error(`Failed types: ${failed.join(", ")}`);
          return { detail: `All ${VALID_TYPES.length} doc types accepted` };
        },
      },
      {
        id: "drafts_list_for_case",
        name: "GET /v1/drafts/case/:id returns drafts",
        run: async ({ token, caseId }) => {
          if (!caseId) throw new Error("No case ID — run cases_list first");
          const res = await fetch(`${API_BASE}/v1/drafts/case/${caseId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
          if (!Array.isArray(data.data)) throw new Error("data.data is not an array");
          return { detail: `Found ${data.data.length} drafts for case` };
        },
      },
    ],
  },
  {
    id: "notifications",
    name: "Notification Centre",
    icon: "🔔",
    tests: [
      {
        id: "notif_list",
        name: "GET /v1/notifications returns list",
        run: async ({ token }) => {
          const res = await fetch(`${API_BASE}/v1/notifications`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
          if (!Array.isArray(data.data)) throw new Error("data.data is not an array");
          return { detail: `Found ${data.data.length} notifications` };
        },
      },
      {
        id: "notif_mark_all_read",
        name: "PATCH /v1/notifications/read-all works",
        run: async ({ token }) => {
          const res = await fetch(`${API_BASE}/v1/notifications/read-all`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
          return { detail: "Mark all read returned OK" };
        },
      },
    ],
  },
  {
    id: "filings",
    name: "Filings AI Draft",
    icon: "📋",
    tests: [
      {
        id: "filings_ai_draft",
        name: "POST /v1/filings/ai-draft generates content",
        run: async ({ token }) => {
          const res = await fetch(`${API_BASE}/v1/filings/ai-draft`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              filing_name: "Vakalatnama",
              ai_prompt_hint: "Draft a vakalatnama appointing an advocate for a civil case.",
              relevant_sections: ["Order III Rule 4 CPC"],
              case_context: { title: "Test Case", court: "Delhi High Court", perspective: "defence" },
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
          if (!data.data?.draft) throw new Error("No draft text in response");
          if (data.data.draft.length < 100) throw new Error("Draft too short — likely failed");
          return { detail: `Draft generated (${data.data.draft.length} chars, ${data.data.tokens_used} tokens)` };
        },
      },
    ],
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: "📅",
    tests: [
      {
        id: "calendar_get",
        name: "GET /v1/calendar returns hearings + tasks",
        run: async ({ token }) => {
          const from = new Date().toISOString().split("T")[0];
          const to = new Date(Date.now() + 30 * 864e5).toISOString().split("T")[0];
          const res = await fetch(`${API_BASE}/v1/calendar?from=${from}&to=${to}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
          if (!Array.isArray(data.data?.hearings)) throw new Error("hearings is not an array");
          if (!Array.isArray(data.data?.tasks)) throw new Error("tasks is not an array");
          return { detail: `${data.data.hearings.length} hearings, ${data.data.tasks.length} tasks in next 30 days` };
        },
      },
      {
        id: "calendar_briefing",
        name: "GET /v1/calendar/today-briefing works",
        run: async ({ token }) => {
          const res = await fetch(`${API_BASE}/v1/calendar/today-briefing`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
          if (!data.data?.date) throw new Error("No date in briefing response");
          return { detail: `Today: ${data.data.date}, ${data.data.hearings_today} hearings` };
        },
      },
    ],
  },
  {
    id: "presentations",
    name: "Presentations",
    icon: "🎯",
    tests: [
      {
        id: "pres_list",
        name: "GET /v1/presentations returns list",
        run: async ({ token }) => {
          const res = await fetch(`${API_BASE}/v1/presentations`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
          if (!Array.isArray(data.data)) throw new Error("data.data is not array");
          return { detail: `Found ${data.data.length} presentations` };
        },
      },
    ],
  },
  {
    id: "dashboard",
    name: "Dashboard",
    icon: "📊",
    tests: [
      {
        id: "dashboard_stats",
        name: "GET /v1/dashboard returns stats",
        run: async ({ token }) => {
          const res = await fetch(`${API_BASE}/v1/dashboard`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
          return { detail: `Dashboard OK — ${JSON.stringify(data.data).slice(0, 80)}...` };
        },
      },
    ],
  },
  {
    id: "agents",
    name: "AI Agents",
    icon: "🤖",
    tests: [
      {
        id: "agents_list",
        name: "GET /v1/agents returns job list",
        run: async ({ token }) => {
          const res = await fetch(`${API_BASE}/v1/agents`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
          if (!Array.isArray(data.data)) throw new Error("data.data is not array");
          return { detail: `Found ${data.data.length} agent jobs` };
        },
      },
      {
        id: "agents_create_strategy",
        name: "POST /v1/agents creates a strategy job",
        run: async ({ token, caseId }) => {
          if (!caseId) throw new Error("No case ID — run cases_list first");
          const res = await fetch(`${API_BASE}/v1/agents`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ case_id: caseId, type: "strategy" }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error?.message || data.message || `HTTP ${res.status}`);
          if (!data.data?.id) throw new Error("No job ID in response");
          return { detail: `Agent job created: ${data.data.id} (status: ${data.data.status})` };
        },
      },
    ],
  },
];

// ── Helper ─────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Main Component ─────────────────────────────────────────────
export default function LexAITestingAgent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState({});
  const [logs, setLogs] = useState([]);
  const [ctx, setCtx] = useState({});
  const [activeTab, setActiveTab] = useState("runner");
  const [selectedSuites, setSelectedSuites] = useState(new Set(TEST_SUITES.map(s => s.id)));
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (msg, type = "info") => {
    setLogs(prev => [...prev, { msg, type, ts: new Date().toLocaleTimeString("en-IN") }]);
  };

  const updateResult = (testId, result) => {
    setResults(prev => ({ ...prev, [testId]: result }));
  };

  const runTests = async () => {
    if (!email || !password) return;
    setRunning(true);
    setResults({});
    setLogs([]);
    setActiveTab("runner");
    let context = { email, password };

    addLog("🚀 LexAI Testing Agent started", "info");
    addLog(`📡 Target: ${API_BASE}`, "info");
    addLog("─".repeat(50), "divider");

    for (const suite of TEST_SUITES) {
      if (!selectedSuites.has(suite.id)) continue;
      addLog(`\n${suite.icon} Suite: ${suite.name}`, "suite");

      for (const test of suite.tests) {
        addLog(`  ▸ ${test.name}...`, "running");
        updateResult(test.id, { status: "running" });

        try {
          const result = await test.run(context);

          // Merge any context outputs
          if (result?.token) context.token = result.token;
          if (result?.user) context.user = result.user;
          if (result?.caseId) context.caseId = result.caseId;
          if (result?.testCaseId) context.testCaseId = result.testCaseId;

          if (result?.skipped) {
            addLog(`    ⏭ Skipped: ${result.detail}`, "skip");
            updateResult(test.id, { status: "skipped", detail: result.detail });
          } else {
            addLog(`    ✅ ${result?.detail || "Passed"}`, "pass");
            updateResult(test.id, { status: "pass", detail: result?.detail });
          }
        } catch (err) {
          addLog(`    ❌ FAILED: ${err.message}`, "fail");
          updateResult(test.id, { status: "fail", error: err.message });
        }

        await sleep(200); // Rate limit protection
      }
    }

    addLog("\n" + "─".repeat(50), "divider");

    const all = Object.values(results);
    // Count from final state
    setResults(prev => {
      const vals = Object.values(prev);
      const passed = vals.filter(r => r.status === "pass").length;
      const failed = vals.filter(r => r.status === "fail").length;
      const skipped = vals.filter(r => r.status === "skipped").length;
      addLog(`\n📊 Results: ${passed} passed · ${failed} failed · ${skipped} skipped`, failed > 0 ? "fail" : "pass");
      if (failed > 0) {
        addLog("\n🐛 Bugs to fix:", "fail");
        Object.entries(prev).forEach(([id, r]) => {
          if (r.status === "fail") addLog(`  • ${id}: ${r.error}`, "fail");
        });
      } else {
        addLog("🎉 All tests passed!", "pass");
      }
      return prev;
    });

    setRunning(false);
    setCtx(context);
    setActiveTab("report");
  };

  // Stats
  const total = Object.values(results).length;
  const passed = Object.values(results).filter(r => r.status === "pass").length;
  const failed = Object.values(results).filter(r => r.status === "fail").length;
  const running_ = Object.values(results).filter(r => r.status === "running").length;
  const skipped = Object.values(results).filter(r => r.status === "skipped").length;

  const statusIcon = { pass: "✅", fail: "❌", running: "⏳", skipped: "⏭", undefined: "○" };
  const statusColor = { pass: "#15803d", fail: "#93000a", running: "#5b21b6", skipped: "#74777f" };

  return (
    <div style={{ fontFamily: "'Courier New', monospace", background: "#0a0e1a", minHeight: "100vh", color: "#e2e8f0", padding: "0" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #022448 0%, #0f172a 100%)", padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>🧪</span>
            <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: "18px", color: "#ffe088", letterSpacing: "0.04em" }}>LEXAI TESTING AGENT</span>
          </div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "4px 0 0", letterSpacing: "0.08em" }}>AUTONOMOUS QA · SOVEREIGN COUNSEL PLATFORM</p>
        </div>
        {total > 0 && (
          <div style={{ display: "flex", gap: "16px" }}>
            {[["✅", passed, "#16a34a"], ["❌", failed, "#dc2626"], ["⏭", skipped, "#74777f"]].map(([icon, count, color]) => (
              <div key={icon} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: 800, color }}>{count}</div>
                <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>{icon}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", height: "calc(100vh - 80px)" }}>

        {/* Left panel — Config + Suites */}
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)", padding: "20px 16px", overflowY: "auto" }}>

          {/* Credentials */}
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "9px", fontWeight: 800, color: "#ffe088", letterSpacing: "0.12em", margin: "0 0 10px" }}>CREDENTIALS</p>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              style={{ width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#e2e8f0", fontSize: "12px", fontFamily: "Courier New", marginBottom: "8px", boxSizing: "border-box", outline: "none" }}
            />
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              style={{ width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#e2e8f0", fontSize: "12px", fontFamily: "Courier New", boxSizing: "border-box", outline: "none" }}
            />
          </div>

          {/* Test Suites */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <p style={{ fontSize: "9px", fontWeight: 800, color: "#ffe088", letterSpacing: "0.12em", margin: 0 }}>TEST SUITES</p>
              <button onClick={() => setSelectedSuites(selectedSuites.size === TEST_SUITES.length ? new Set() : new Set(TEST_SUITES.map(s => s.id)))}
                style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", fontFamily: "Courier New" }}>
                {selectedSuites.size === TEST_SUITES.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            {TEST_SUITES.map(suite => {
              const suiteResults = suite.tests.map(t => results[t.id]).filter(Boolean);
              const suiteFailed = suiteResults.filter(r => r.status === "fail").length;
              const suitePassed = suiteResults.filter(r => r.status === "pass").length;
              return (
                <div key={suite.id} onClick={() => {
                  const next = new Set(selectedSuites);
                  if (next.has(suite.id)) next.delete(suite.id); else next.add(suite.id);
                  setSelectedSuites(next);
                }} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "6px", marginBottom: "4px", background: selectedSuites.has(suite.id) ? "rgba(255,224,136,0.06)" : "transparent", border: `1px solid ${selectedSuites.has(suite.id) ? "rgba(255,224,136,0.15)" : "rgba(255,255,255,0.04)"}`, cursor: "pointer" }}>
                  <span style={{ fontSize: "14px" }}>{suite.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: selectedSuites.has(suite.id) ? "#e2e8f0" : "rgba(255,255,255,0.3)", margin: 0 }}>{suite.name}</p>
                    <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", margin: "1px 0 0" }}>{suite.tests.length} tests</p>
                  </div>
                  {suiteResults.length > 0 && (
                    <span style={{ fontSize: "10px", fontWeight: 700, color: suiteFailed > 0 ? "#dc2626" : "#16a34a" }}>
                      {suiteFailed > 0 ? `${suiteFailed}❌` : `${suitePassed}✅`}
                    </span>
                  )}
                  <div style={{ width: "12px", height: "12px", borderRadius: "3px", border: "1px solid rgba(255,255,255,0.2)", background: selectedSuites.has(suite.id) ? "#ffe088" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {selectedSuites.has(suite.id) && <span style={{ fontSize: "8px", color: "#0a0e1a" }}>✓</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Run Button */}
          <button
            onClick={runTests}
            disabled={running || !email || !password}
            style={{
              width: "100%", padding: "12px", background: running ? "rgba(255,224,136,0.1)" : "#ffe088",
              color: running ? "#ffe088" : "#0a0e1a", border: running ? "1px solid rgba(255,224,136,0.3)" : "none",
              borderRadius: "8px", fontSize: "13px", fontWeight: 800, cursor: running || !email || !password ? "not-allowed" : "pointer",
              fontFamily: "Courier New", letterSpacing: "0.06em", opacity: !email || !password ? 0.4 : 1,
            }}>
            {running ? "⏳ RUNNING..." : "▶ RUN TESTS"}
          </button>
        </div>

        {/* Right panel — Tabs */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Tab nav */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            {[["runner", "LIVE LOG"], ["report", "BUG REPORT"], ["suites", "TEST DETAIL"]].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{ padding: "12px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: "10px", fontWeight: 800, letterSpacing: "0.1em", color: activeTab === id ? "#ffe088" : "rgba(255,255,255,0.3)", borderBottom: activeTab === id ? "2px solid #ffe088" : "2px solid transparent", fontFamily: "Courier New" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>

            {/* LIVE LOG */}
            {activeTab === "runner" && (
              <div>
                {logs.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>🧪</div>
                    <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)", fontFamily: "Courier New" }}>Configure credentials and click RUN TESTS</p>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: "8px" }}>Tests will run against the live Railway API</p>
                  </div>
                )}
                {logs.map((log, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "3px", fontFamily: "Courier New", fontSize: "12px" }}>
                    <span style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0, fontSize: "10px", paddingTop: "1px" }}>{log.ts}</span>
                    <span style={{ color: log.type === "pass" ? "#4ade80" : log.type === "fail" ? "#f87171" : log.type === "suite" ? "#ffe088" : log.type === "skip" ? "#94a3b8" : log.type === "divider" ? "rgba(255,255,255,0.1)" : "#94a3b8", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {log.msg}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}

            {/* BUG REPORT */}
            {activeTab === "report" && (
              <div>
                {total === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px" }}>
                    <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)", fontFamily: "Courier New" }}>Run tests first to generate a bug report</p>
                  </div>
                ) : (
                  <div>
                    {/* Summary */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
                      {[
                        { label: "TOTAL", value: total, color: "#94a3b8" },
                        { label: "PASSED", value: passed, color: "#4ade80" },
                        { label: "FAILED", value: failed, color: "#f87171" },
                        { label: "SKIPPED", value: skipped, color: "#94a3b8" },
                      ].map(stat => (
                        <div key={stat.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "16px", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                          <div style={{ fontSize: "28px", fontWeight: 800, color: stat.color, fontFamily: "Courier New" }}>{stat.value}</div>
                          <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Failures */}
                    {failed > 0 && (
                      <div style={{ marginBottom: "24px" }}>
                        <p style={{ fontSize: "11px", fontWeight: 800, color: "#f87171", letterSpacing: "0.1em", margin: "0 0 12px" }}>🐛 BUGS FOUND ({failed})</p>
                        {Object.entries(results).filter(([, r]) => r.status === "fail").map(([testId, r]) => {
                          const suite = TEST_SUITES.find(s => s.tests.some(t => t.id === testId));
                          const test = suite?.tests.find(t => t.id === testId);
                          return (
                            <div key={testId} style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "8px", padding: "14px 16px", marginBottom: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                <span style={{ fontSize: "12px" }}>{suite?.icon}</span>
                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#fca5a5", fontFamily: "Courier New" }}>{suite?.name} → {test?.name}</span>
                              </div>
                              <p style={{ fontSize: "11px", color: "#fca5a5", margin: 0, fontFamily: "Courier New", opacity: 0.8 }}>ERROR: {r.error}</p>
                              <p style={{ fontSize: "10px", color: "#74777f", margin: "6px 0 0", fontFamily: "Courier New" }}>Test ID: {testId}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* All results */}
                    <p style={{ fontSize: "11px", fontWeight: 800, color: "#ffe088", letterSpacing: "0.1em", margin: "0 0 12px" }}>ALL RESULTS</p>
                    {TEST_SUITES.map(suite => {
                      const suiteTests = suite.tests.filter(t => results[t.id]);
                      if (suiteTests.length === 0) return null;
                      return (
                        <div key={suite.id} style={{ marginBottom: "16px" }}>
                          <p style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", margin: "0 0 6px" }}>{suite.icon} {suite.name.toUpperCase()}</p>
                          {suite.tests.map(test => {
                            const r = results[test.id];
                            if (!r) return null;
                            return (
                              <div key={test.id} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "8px 12px", borderRadius: "6px", marginBottom: "4px", background: r.status === "fail" ? "rgba(220,38,38,0.06)" : "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                                <span style={{ fontSize: "13px", flexShrink: 0 }}>{statusIcon[r.status]}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: "11px", color: r.status === "fail" ? "#fca5a5" : "rgba(255,255,255,0.7)", margin: 0, fontFamily: "Courier New" }}>{test.name}</p>
                                  {r.detail && <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", margin: "2px 0 0", fontFamily: "Courier New" }}>{r.detail}</p>}
                                  {r.error && <p style={{ fontSize: "10px", color: "#f87171", margin: "2px 0 0", fontFamily: "Courier New" }}>❌ {r.error}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TEST DETAIL */}
            {activeTab === "suites" && (
              <div>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "20px", fontFamily: "Courier New" }}>
                  {TEST_SUITES.reduce((a, s) => a + s.tests.length, 0)} total tests across {TEST_SUITES.length} suites
                </p>
                {TEST_SUITES.map(suite => (
                  <div key={suite.id} style={{ marginBottom: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.02)" }}>
                      <span style={{ fontSize: "16px" }}>{suite.icon}</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#ffe088", fontFamily: "Courier New", letterSpacing: "0.06em" }}>{suite.name.toUpperCase()}</span>
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>{suite.tests.length} tests</span>
                    </div>
                    {suite.tests.map(test => (
                      <div key={test.id} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "12px" }}>{statusIcon[results[test.id]?.status] || "○"}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", margin: 0, fontFamily: "Courier New" }}>{test.name}</p>
                          <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)", margin: "2px 0 0", fontFamily: "Courier New" }}>ID: {test.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
