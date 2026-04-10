FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/db/package*.json ./packages/db/
COPY apps/api/package*.json ./apps/api/

RUN npm install --legacy-peer-deps

WORKDIR /app/apps/api
RUN npm install --legacy-peer-deps
RUN npm install dotenv bullmq ioredis fastify fastify-plugin @fastify/cors @fastify/jwt @fastify/multipart @fastify/rate-limit @anthropic-ai/sdk @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @supabase/supabase-js zod pino-pretty --legacy-peer-deps
WORKDIR /app

COPY packages/core ./packages/core
COPY packages/db ./packages/db
COPY apps/api ./apps/api
COPY start.sh ./start.sh

RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

RUN cd packages/core && npx tsc --skipLibCheck
RUN cd apps/api && npx tsc --skipLibCheck || true

RUN test -f apps/api/dist/server.js || (echo "ERROR: server.js not emitted" && exit 1)

EXPOSE 3001
HEALTHCHECK NONE
CMD ["bash", "start.sh"]
