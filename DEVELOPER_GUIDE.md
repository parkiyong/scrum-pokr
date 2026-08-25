# Scrum Pokr AI — Developer Guide

> Operational guide for setting up, running, testing, and developing **Scrum Pokr AI** with a unified Full-Stack TypeScript architecture.

📖 [User Guide](USER_GUIDE.md) · 🛠️ [Developer Guide](DEVELOPER_GUIDE.md) · 🤝 [Contributing](CONTRIBUTING.md) · 📋 [Product Spec](.scratch/basic-scrum-poker/spec.md)

---

## Table of Contents

1. [Prerequisites & Toolchain](#1-prerequisites--toolchain)
2. [Local Environment Setup](#2-local-environment-setup)
3. [Running the Application](#3-running-the-application)
4. [Testing & Quality Verification](#4-testing--quality-verification)
5. [Project Directory Layout](#5-project-directory-layout)
6. [Architecture & Design Specifications](#6-architecture--design-specifications)

---

## 1. Prerequisites & Toolchain

* **Node.js**: `v20+` LTS
* **npm**: `v10+` (native npm workspaces support)
* **Docker & Docker Compose** (optional, for containerized execution)

---

## 2. Local Environment Setup

### 2.1 Clone Repository

```bash
git clone https://github.com/parkiyong/scrum-pokr.git
cd scrum-pokr
```

### 2.2 Install Monorepo Dependencies

```bash
npm install
```

---

## 3. Running the Application

### Option A: Development Mode (Single Command)

Run both the Hono backend server and the Vite React frontend concurrently with hot-reloading:

```bash
npm run dev
```

* **Frontend UI**: Open **[http://localhost:5173](http://localhost:5173)** in your browser.
* **Backend API & SSE**: `http://localhost:3000` (Vite automatically proxies `/api` requests to port 3000).

### Option B: Standalone Production Build

Build the full monorepo and start the unified Node.js server:

```bash
# 1. Build shared, server, and client bundles
npm run build

# 2. Start Hono production server (serves API, SSE, and static SPA)
npm start --workspace=@scrumpokr/server
```

* **Unified Web App**: [http://localhost:3000](http://localhost:3000)

### Option C: Containerized Stack (Docker Compose)

```bash
docker compose up --build
```

* **Unified Web App in Docker**: [http://localhost:3000](http://localhost:3000)

---

## 4. Testing & Quality Verification

### 4.1 Run All Tests Across Workspaces

Run all unit, integration, and Reveal Gate test suites across `shared`, `server`, and `client`:

```bash
npm test
```

### 4.2 Run Specific Package Tests

```bash
# Test shared domain models, schemas, and Reveal Gate invariants
npm run test:shared

# Test Hono server REST & SSE routes and RoomActor state machine
npm run test:server

# Test React client components and useRoomSocket hook
npm run test:client
```

### 4.3 Type Checking & Build Verification

```bash
npm run build
```

---

## 5. Project Directory Layout

```
scrum-pokr/
├── package.json                   # Root monorepo workspace manifest
├── tsconfig.base.json             # Shared TypeScript configuration
├── vitest.workspace.ts            # Vitest multi-project workspace configuration
│
├── shared/                        # @scrumpokr/shared (Zero dependencies)
│   ├── src/domain.ts              # Authoritative domain types (RoomState, Story, Participant)
│   ├── src/schemas.ts             # Zod validation schemas & inferred types
│   ├── src/room-reducer.ts        # Pure deterministic state transition functions (16 actions)
│   ├── src/reveal-gate.ts         # maskRoomStateForParticipant projection function
│   └── src/__tests__/             # Reveal Gate invariant & Reducer unit tests
│
├── server/                        # @scrumpokr/server (Hono Node.js backend)
│   ├── src/index.ts               # App entry point + `export type AppType = typeof routes;`
│   ├── src/routes/
│   │   ├── rooms.ts               # REST command endpoints (zValidator)
│   │   └── events.ts              # SSE stream endpoint (streamSSE + heartbeats)
│   ├── src/room/
│   │   ├── room-actor.ts          # In-memory Room state actor & subscriptions
│   │   └── registry.ts            # RoomRegistry with 4h TTL eviction sweeper
│   ├── src/util/
│   │   └── slug.ts                # Memorable 6-char slug & short code generator
│   └── src/__tests__/             # Hono endpoint & SSE integration tests
│
├── client/                        # @scrumpokr/client (React 18 + Vite SPA)
│   ├── src/api/contracts.ts       # Typed RPC route contracts
│   ├── src/api/index.ts           # Typed Hono RPC client `hc<AppType>('')`
│   ├── src/hooks/useRoomSocket.ts # Native SSE event listener + typed RPC dispatches
│   ├── src/components/            # PokerTableArena, FacilitatorBar, DeckSelector, DeckConfigModal, BacklogDrawer
│   ├── src/utils/session.ts       # LocalStorage session identity helpers
│   └── src/__tests__/             # React component & hook integration tests
│
├── docker-compose.yml             # Local Docker service (Unified App)
├── Dockerfile                     # Multi-stage production container build (Alpine)
├── USER_GUIDE.md                  # User & facilitator documentation
├── DEVELOPER_GUIDE.md             # Developer operational guide (this document)
├── CONTRIBUTING.md                # Contribution guidelines & workflow
└── README.md                      # Project overview & quick start
```

---

## 6. Architecture & Design Specifications

Key architectural principles, domain definitions, and API specifications are maintained across:

* 🏛️ **Architecture & Backend Specification**:
  * [Basic Scrum Poker Specification](.scratch/basic-scrum-poker/spec.md)
  * [Basic Scrum Poker Map & Decisions](.scratch/basic-scrum-poker/map.md)
* 📖 **Domain Glossary & Invariants**:
  * [Domain Vocabulary & Rules](CONTEXT.md)
* 🛡️ **Security Invariants**:
  * Server-enforced Reveal Gate masking unrevealed votes across REST/SSE state broadcasts.
  * Zero-auth session recovery backed by client-side storage and session IDs.
