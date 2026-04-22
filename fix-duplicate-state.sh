#!/bin/bash
# ============================================================
# LexAI India — Fix duplicate state variable (build error)
# Removes the duplicate cancellingAgent declaration on line 1186
#
# Run from lexai-platform root:
#   cd ~/Desktop/lexai-platform && bash fix-duplicate-state.sh
# ============================================================

set -e

if [ ! -f "package.json" ] || [ ! -d "apps/api" ]; then
  echo "❌  Run from lexai-platform root: cd ~/Desktop/lexai-platform"
  exit 1
fi

echo ""
echo "Fixing duplicate cancellingAgent state variable..."

python3 << 'PYEOF'
path = 'apps/web/src/app/cases/[id]/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# The v2 script added cancellingAgent, then v3 added it again
# Remove the SECOND occurrence (the duplicate)
duplicate = """  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [cancellingAgent, setCancellingAgent] = useState(false);"""

correct = "  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);"

if duplicate in content:
    content = content.replace(duplicate, correct)
    with open(path, 'w') as f:
        f.write(content)
    print('✅  Duplicate removed — cancellingAgent now declared once')
else:
    # Try the other order
    duplicate2 = """  const [cancellingAgent, setCancellingAgent] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [cancellingAgent, setCancellingAgent] = useState(false);"""
    correct2 = """  const [cancellingAgent, setCancellingAgent] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);"""
    if duplicate2 in content:
        content = content.replace(duplicate2, correct2)
        with open(path, 'w') as f:
            f.write(content)
        print('✅  Duplicate removed (alt pattern)')
    else:
        # Count occurrences
        count = content.count('const [cancellingAgent, setCancellingAgent]')
        print(f'Found {count} occurrence(s) of cancellingAgent')
        if count >= 2:
            # Remove all, add back once
            clean = content.replace('  const [cancellingAgent, setCancellingAgent] = useState(false);\n', '', count - 1)
            with open(clean_path := path, 'w') as f:
                f.write(clean)
            print('✅  Removed extra occurrences, kept one')
        else:
            print('ℹ️   No duplicate found — may already be fixed')
PYEOF

git add "apps/web/src/app/cases/[id]/page.tsx"
git commit -m "fix: remove duplicate cancellingAgent state variable (build error)"
git push origin main

echo ""
echo "✅  Pushed. Vercel will rebuild now — should pass."
echo ""
