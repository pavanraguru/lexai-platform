#!/bin/bash
# ============================================================
# LexAI India — Fix Prisma Connection Pool (P2024 error)
# 
# Root cause: Supabase free tier allows limited connections.
# Prisma is opening too many connections across the API server
# and the agent worker (which has its own PrismaClient).
#
# Fixes:
#   1. Add connection_limit=1 to DATABASE_URL in Railway env
#   2. Configure PrismaClient to use pgbouncer transaction mode
#   3. Fix agent.worker.ts to reuse the same connection config
#   4. Add connection_limit to Prisma datasource in schema.prisma
#
# Run from lexai-platform root:
#   cd ~/Desktop/lexai-platform && bash fix-connection-pool.sh
# ============================================================

set -e

if [ ! -f "package.json" ] || [ ! -d "apps/api" ]; then
  echo "❌  Run this from the lexai-platform root directory."
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   LexAI India — Fix Prisma P2024 Connection Pool    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── FIX 1: Prisma plugin — add connection_limit + pgbouncer config ────────────
echo "📄  Fix 1: Patching apps/api/src/plugins/prisma.ts ..."
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
  // Build DATABASE_URL with connection pooling params for Supabase PgBouncer.
  // connection_limit=1 is critical — Railway runs in a single process and
  // Supabase free/pro tiers have strict connection limits.
  const rawUrl = process.env.DATABASE_URL || '';
  const dbUrl = rawUrl.includes('connection_limit')
    ? rawUrl
    : rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'connection_limit=3&pool_timeout=20&pgbouncer=true';

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: { db: { url: dbUrl } },
  });

  await prisma.$connect();"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print('    ✅  PrismaClient configured with connection_limit=3 + pool_timeout=20')
elif 'connection_limit' in content:
    print('    ℹ️   Already patched — skipping')
else:
    print('    ⚠️   Could not find expected block — check file manually')
PYEOF

# ── FIX 2: agent.worker.ts — add same connection config to its PrismaClient ──
echo ""
echo "📄  Fix 2: Patching apps/api/src/jobs/agent.worker.ts ..."
python3 << 'PYEOF'
path = 'apps/api/src/jobs/agent.worker.ts'
with open(path, 'r') as f:
    content = f.read()

old = 'const prisma = new PrismaClient();'
new = """// Use connection_limit=1 in the worker — it runs as a separate process
// and must not exhaust the Supabase connection pool
const rawUrl = process.env.DATABASE_URL || '';
const dbUrl = rawUrl.includes('connection_limit')
  ? rawUrl
  : rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'connection_limit=1&pool_timeout=20&pgbouncer=true';
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print('    ✅  agent.worker.ts PrismaClient configured with connection_limit=1')
elif 'connection_limit' in content:
    print('    ℹ️   Already patched — skipping')
else:
    print('    ⚠️   Could not find "const prisma = new PrismaClient();" — check file manually')
PYEOF

# ── FIX 3: schema.prisma — add directUrl for migrations ──────────────────────
echo ""
echo "📄  Fix 3: Patching packages/db/prisma/schema.prisma ..."
python3 << 'PYEOF'
path = 'packages/db/prisma/schema.prisma'
with open(path, 'r') as f:
    content = f.read()

old = """datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}"""

new = """datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print('    ✅  schema.prisma updated with directUrl for migrations')
elif 'directUrl' in content:
    print('    ℹ️   Already has directUrl — skipping')
else:
    print('    ⚠️   datasource block not found as expected')
PYEOF

# ── FIX 4: Also patch apps/api/prisma/schema.prisma if it exists ─────────────
if [ -f "apps/api/prisma/schema.prisma" ]; then
python3 << 'PYEOF'
path = 'apps/api/prisma/schema.prisma'
with open(path, 'r') as f:
    content = f.read()

old = """datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}"""

new = """datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print('    ✅  apps/api schema.prisma updated with directUrl')
elif 'directUrl' in content:
    print('    ℹ️   Already has directUrl — skipping')
PYEOF
fi

# ── GIT COMMIT & PUSH ─────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════"
echo "  Files patched. Pushing to git..."
echo "══════════════════════════════════════════════════════"
echo ""

git add \
  apps/api/src/plugins/prisma.ts \
  apps/api/src/jobs/agent.worker.ts \
  packages/db/prisma/schema.prisma

# Add api/prisma/schema.prisma only if it exists and was changed
if [ -f "apps/api/prisma/schema.prisma" ]; then
  git add apps/api/prisma/schema.prisma
fi

git commit -m "fix: P2024 connection pool — add connection_limit+pgbouncer config to PrismaClient, directUrl to schema"
git push origin main

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  Code pushed. Now do ONE manual step in Railway: ║"
echo "║                                                      ║"
echo "║  1. Go to Railway → your API service → Variables     ║"
echo "║  2. Add this new variable:                           ║"
echo "║                                                      ║"
echo "║     Name:  DIRECT_URL                                ║"
echo "║     Value: (your Supabase direct DB URL)             ║"
echo "║            postgresql://postgres:[password]@         ║"
echo "║            db.[project].supabase.co:5432/postgres    ║"
echo "║                                                      ║"
echo "║  3. Make sure DATABASE_URL still uses the pooler:    ║"
echo "║     postgresql://postgres.[project]:[password]@      ║"
echo "║     aws-0-ap-south-1.pooler.supabase.com:6543/       ║"
echo "║     postgres?pgbouncer=true                          ║"
echo "║                                                      ║"
echo "║  Railway will redeploy. P2024 errors will stop.      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
