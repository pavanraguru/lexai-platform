FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/db/package*.json ./packages/db/
COPY apps/api/package*.json ./apps/api/

RUN npm install

# Copy all source
COPY packages/core ./packages/core
COPY packages/db ./packages/db
COPY apps/api ./apps/api

# Step 1: Generate Prisma client
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

# Step 2: Compile core package
RUN cd packages/core && npx tsc --skipLibCheck

# Step 3: Compile API
RUN cd apps/api && npx tsc --skipLibCheck

EXPOSE 3001
HEALTHCHECK NONE
CMD ["node", "apps/api/dist/server.js"]
