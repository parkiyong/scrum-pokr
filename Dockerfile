# Stage 1: Build & Bundle Monorepo
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm ci

COPY tsconfig.base.json vitest.workspace.ts ./
COPY shared/ ./shared/
COPY server/ ./server/
COPY client/ ./client/

RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
RUN npm ci --omit=dev --workspace=@scrumpokr/server --workspace=@scrumpokr/shared

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
