FROM node:20-alpine

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

RUN cd apps/api && npx tsc --skipLibCheck

EXPOSE 3001

HEALTHCHECK NONE

CMD ["node", "apps/api/dist/server.js"]
