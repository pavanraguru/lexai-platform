#!/bin/bash
# ============================================================
# LexAI India — Fix Agents Script (macOS compatible)
# Run from your lexai-platform root:
#   cd ~/Desktop/lexai-platform && bash fix-agents.sh
# ============================================================

set -e

if [ ! -f "package.json" ] || [ ! -d "apps/api" ]; then
  echo "❌  Run this from the lexai-platform root directory."
  echo "    cd ~/Desktop/lexai-platform && bash fix-agents.sh"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║     LexAI India — Fix Agents (3 files)      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

TARGET1="apps/api/src/routes/agents.ts"
TARGET2="apps/api/src/jobs/agent.worker.ts"
TARGET3="apps/api/src/routes/cases.ts"

# ── FIX 1: agents.ts — wrong model name ──────────────────────
echo "📄  Patching $TARGET1 ..."
python3 << PYEOF
path = 'apps/api/src/routes/agents.ts'
with open(path, 'r') as f:
    c = f.read()
c = c.replace("model: 'claude-sonnet-4-5'", "model: 'claude-sonnet-4-6'")
c = c.replace("model_used: 'claude-sonnet-4-5'", "model_used: 'claude-sonnet-4-6'")
with open(path, 'w') as f:
    f.write(c)
count = c.count('claude-sonnet-4-6')
print(f'    ✅  claude-sonnet-4-6 now appears {count} times')
PYEOF

# ── FIX 2: agent.worker.ts — wrong model name ────────────────
echo ""
echo "📄  Patching $TARGET2 ..."
python3 << PYEOF
path = 'apps/api/src/jobs/agent.worker.ts'
with open(path, 'r') as f:
    c = f.read()
c = c.replace("model: 'claude-sonnet-4-5'", "model: 'claude-sonnet-4-6'")
with open(path, 'w') as f:
    f.write(c)
print('    ✅  Model name fixed')
PYEOF

# ── FIX 3: cases.ts — add output fields to agent_jobs select ─
echo ""
echo "📄  Patching $TARGET3 ..."
python3 << PYEOF
path = 'apps/api/src/routes/cases.ts'
with open(path, 'r') as f:
    c = f.read()

old = "          select: {\n            id: true, agent_type: true, status: true,\n            model_used: true, cost_inr: true,\n            created_at: true, completed_at: true,\n          },"
new = "          select: {\n            id: true, agent_type: true, status: true,\n            model_used: true, cost_inr: true,\n            created_at: true, completed_at: true,\n            output: true, error_message: true,\n            tokens_input: true, tokens_output: true,\n          },"

if old in c:
    c = c.replace(old, new)
    with open(path, 'w') as f:
        f.write(c)
    print('    ✅  output + error_message fields added')
elif 'output: true' in c and 'error_message: true' in c:
    print('    ℹ️   Already patched — skipping')
else:
    print('    ❌  Could not find select block — check file manually')
    exit(1)
PYEOF

# ── GIT COMMIT & PUSH ─────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  All 3 files patched. Pushing to git..."
echo "══════════════════════════════════════════════"
echo ""

git add "$TARGET1" "$TARGET2" "$TARGET3"
git commit -m "fix: agents — claude-sonnet-4-5 to claude-sonnet-4-6, add output fields to agent_jobs select"
git push origin main

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅  Done! Pushed to main.                   ║"
echo "║                                              ║"
echo "║  Railway redeploys in ~2 minutes.            ║"
echo "║  Then: Case → Agents tab → Run Evidence      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
