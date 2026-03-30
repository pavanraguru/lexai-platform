FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/db/package*.json ./packages/db/
COPY apps/api/package*.json ./apps/api/

# Install all dependencies
RUN npm install --workspaces

# Copy source
COPY packages/core ./packages/core
COPY packages/db ./packages/db
COPY apps/api ./apps/api
COPY tsconfig.json ./

# Build only the API
RUN cd apps/api && npx tsc --skipLibCheck

# Start the API server
EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]
