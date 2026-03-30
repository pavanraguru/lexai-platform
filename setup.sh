#!/bin/bash
# ============================================================
# LexAI India — Phase 0 Setup Script
# Run this once after cloning the repository
# ============================================================

set -e

BOLD='\033[1m'
BLUE='\033[0;34m'
GOLD='\033[0;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BOLD}${BLUE}  ╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}  ║${NC}${GOLD}        ⚖  LexAI India  Setup              ${NC}${BOLD}${BLUE}║${NC}"
echo -e "${BOLD}${BLUE}  ╚═══════════════════════════════════════════════╝${NC}"
echo ""

# ── Check prerequisites ───────────────────────────────────────
echo -e "${BOLD}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found. Install from nodejs.org (v20+)${NC}"
  exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}✗ Node.js v20+ required. Found: $(node --version)${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version)${NC}"
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

# ── Environment setup ─────────────────────────────────────────
echo ""
echo -e "${BOLD}Setting up environment...${NC}"

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo -e "${GOLD}⚠  Created .env.local from .env.example${NC}"
  echo -e "${GOLD}   → Open .env.local and add your ANTHROPIC_API_KEY${NC}"
else
  echo -e "${GREEN}✓ .env.local already exists${NC}"
fi

# ── CLI quick setup (for Week 1) ──────────────────────────────
echo ""
echo -e "${BOLD}Setting up CLI (Week 1 tool)...${NC}"

cd apps/cli
npm install --silent
echo -e "${GREEN}✓ CLI dependencies installed${NC}"

# Copy env for CLI
if [ ! -f .env ]; then
  cp ../../.env.local .env 2>/dev/null || cp ../../.env.example .env
  echo -e "${GREEN}✓ CLI .env configured${NC}"
fi

# Create required directories
mkdir -p cases docs outputs
echo -e "${GREEN}✓ CLI directories ready (cases/, docs/, outputs/)${NC}"
cd ../..

# ── Summary ───────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}✅ Phase 0 Setup Complete!${NC}"
echo ""
echo -e "${BOLD}Next steps:${NC}"
echo ""
echo -e "  1. Add your Anthropic API key to ${GOLD}.env.local${NC}"
echo -e "     ${GOLD}ANTHROPIC_API_KEY=sk-ant-api03-...${NC}"
echo ""
echo -e "  2. Test the CLI with the sample case:"
echo -e "     ${BLUE}cd apps/cli${NC}"
echo -e "     ${BLUE}node src/index.ts run-agent --case cases/case_001.json --agent evidence${NC}"
echo ""
echo -e "  3. For full stack (Phase 1):"
echo -e "     ${BLUE}npm run db:migrate${NC}  (requires DATABASE_URL in .env.local)"
echo -e "     ${BLUE}npm run dev${NC}          (starts API + Web)"
echo ""
echo -e "  📖 Read ${GOLD}README.md${NC} for complete setup instructions."
echo -e "  📋 Refer to ${GOLD}LexAI India PRD v1.1${NC} for all feature specifications."
echo ""
