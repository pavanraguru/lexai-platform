#!/bin/bash
# Start OCR worker in background
node apps/api/dist/jobs/ocr.worker.js &
echo "OCR Worker started"

# Start API server in foreground
node apps/api/dist/server.js
