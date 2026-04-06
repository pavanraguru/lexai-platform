FROM node:20-slim

# Install OpenSSL - required by Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/db/package*.json ./packages/db/
COPY apps/api/package*.json ./apps/api/

RUN npm install

COPY packages/core ./packages/core
COPY packages/db ./packages/db
COPY apps/api ./apps/api
COPY start.sh ./start.sh

# Generate Prisma client
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

# Build core then API
RUN cd packages/core && npx tsc --skipLibCheck
RUN cd apps/api && npx tsc --skipLibCheck

EXPOSE 3001
HEALTHCHECK NONE
CMD ["/bin/bash", "start.sh"]
