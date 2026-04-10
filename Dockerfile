FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first for Docker layer caching
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/db/package*.json ./packages/db/
COPY apps/api/package*.json ./apps/api/

# Install root workspace deps
RUN npm install --legacy-peer-deps

# Explicitly install inside apps/api — ensures all packages resolve correctly
# regardless of workspace hoisting behaviour
RUN cd apps/api && npm install --legacy-peer-deps

# Copy all source
COPY packages/core ./packages/core
COPY packages/db ./packages/db
COPY apps/api ./apps/api
COPY start.sh ./start.sh

# Generate Prisma client
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

# Build core package first, then API
RUN cd packages/core && npx tsc --skipLibCheck
RUN cd apps/api && npx tsc --skipLibCheck

EXPOSE 3001
HEALTHCHECK NONE
CMD ["bash", "start.sh"]
