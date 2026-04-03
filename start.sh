#!/bin/bash
# Start both the API server and OCR worker together
node apps/api/dist/jobs/ocr.worker.js &
OCR_PID=$!
echo "OCR Worker started with PID $OCR_PID"

node apps/api/dist/server.js
