# 07: Docker & Dev Workflow Consolidation

Type: task
Status: resolved
Blocked by: 06

## Question

How should `Dockerfile`, `docker-compose.yml`, `package.json`, and `DEVELOPER_GUIDE.md` be updated to completely remove Java 25, Maven, and JVM dependencies, consolidating into a fast single-engine Node.js 20+ / npm workspaces build?

## Background & Context

- Currently, the project contains `pom.xml`, `server/pom.xml`, `mvnw`, and Java 25 dependencies.
- Consolidating to full-stack TypeScript simplifies developer onboarding:
  1. Root `package.json` scripts: `npm run dev` (runs both Hono server and Vite client concurrently).
  2. Single multi-stage `Dockerfile` creating a lightweight (~100MB) Node.js production image.
  3. Cleaned `DEVELOPER_GUIDE.md` and `README.md` reflecting the new 1-command startup.

## Answer

### 1. Root `package.json` Workspace Configuration

The unified npm workspaces root manifest unifies scripts and development lifecycle:

```json
{
  "name": "scrum-pokr-ai",
  "private": true,
  "type": "module",
  "workspaces": [
    "shared",
    "server",
    "client"
  ],
  "scripts": {
    "dev": "concurrently -n \"server,client\" -c \"cyan,green\" \"npm run dev -w server\" \"npm run dev -w client\"",
    "build": "npm run build -w shared && npm run build -w server && npm run build -w client",
    "test": "vitest run",
    "lint": "eslint . --ext .ts,.tsx",
    "db:generate": "npm run db:generate -w server",
    "db:migrate": "npm run db:migrate -w server",
    "db:seed": "npm run db:seed -w server"
  },
  "devDependencies": {
    "concurrently": "^9.1.0",
    "typescript": "~5.6.3",
    "vitest": "^2.1.8"
  }
}
```

---

### 2. Multi-Stage Production `Dockerfile` (~95MB Alpine Image)

Replaces the dual JDK/Node Docker builds with a single 2-stage Alpine container:

```dockerfile
# Stage 1: Build & Bundle
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm ci

COPY tsconfig.base.json ./
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
RUN npm ci --omit=dev --workspace=server --workspace=shared

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
```

---

### 3. Docker Compose Environment (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/scrumpokr
      - GEMINI_API_KEY=${GEMINI_API_KEY:-}
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=scrumpokr
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d scrumpokr"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

---

### 4. Deprecation & Cleanup Checklist

1. **Delete Java/Maven Files**: `pom.xml`, `server/pom.xml`, `mvnw`, `mvnw.cmd`, `.mvn/`, `server/src/main/java/`, `server/src/test/java/`.
2. **Update Developer Guides**: Rewrite `DEVELOPER_GUIDE.md` and `README.md` to specify Node 20+, `npm install`, and `npm run dev` with zero JDK installation requirements.

