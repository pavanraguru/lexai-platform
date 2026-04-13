#!/bin/bash
# ── LexAI Start Script ───────────────────────────────────
# Redis (Upstash) is used ONLY for:
#   1. OCR Worker: processes new documents (triggered on upload only)
#   2. Agent Worker: runs AI analysis (triggered manually only)
# Scheduler uses node-cron — ZERO Redis calls for scheduling

# Start OCR worker (polls Redis only every 5s, not continuously)
node apps/api/dist/jobs/ocr.worker.js &
echo "OCR Worker started (low-Redis mode)"

# Start Agent worker (polls Redis only every 10s)
node apps/api/dist/jobs/agent.worker.js &
echo "Agent Worker started (low-Redis mode)"

# Start Scheduler worker (uses node-cron, no Redis at all)
node apps/api/dist/jobs/scheduler.worker.js &
echo "Scheduler Worker started (node-cron, zero Redis)"

# Start API server in foreground
node apps/api/dist/server.js
