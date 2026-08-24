# 🃏 Scrum Pokr AI

> A real-time, zero-auth Planning Poker estimation platform featuring a high-performance **Full-Stack TypeScript** architecture powered by **Hono (`@hono/node-server`)**, **Server-Sent Events (SSE) + REST**, **React 18 + Tailwind CSS** frontend, and a **server-enforced reveal gate** that eliminates cognitive anchoring bias.

📖 [User Guide](USER_GUIDE.md) · 🛠️ [Developer Guide](DEVELOPER_GUIDE.md) · 🤝 [Contributing](CONTRIBUTING.md) · 🌐 [Product Spec](.scratch/scrum-poker/spec.md)

---

## ⚡ Highlights

* **Zero-Auth Simplicity**: No accounts, passwords, or signup required. Join or create rooms instantly via memorable 6-character codes (e.g. `SWB-42`, `ZBE-55`).
* **Server-Enforced Reveal Gate**: Votes and AI baseline recommendations are physically masked at the protocol level (`has_voted: bool`) until cards are formally revealed, preventing inspection via browser DevTools.
* **Full-Stack TypeScript & Zero Serialization Drift**: Shared domain models and validation schemas (`@scrumpokr/shared`) with typed Hono RPC (`hc<AppType>`) for end-to-end static type safety.
* **SPIDR Story Decomposition**: Breakdown complex or unestimated stories using the SPIDR framework (Spike, Path, Interface, Data, Rules) with automated Gemini AI assistance.
* **3D Felt Poker Arena**: Realistic central felt poker table with 3D flip card animations, consensus indicators, and outlier spread detection in an EXP Light Mode interface.
* **Non-Voting Facilitator Support**: Scrum Masters and PMs can lead estimation rounds with full facilitator controls without being forced to vote or altering team quorum.
* **Seamless Session Recovery**: Participants automatically reclaim their seat and voting state on page refresh through client-side `localStorage` caching.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Web Client (SPA)                          │
│   ┌──────────────────────┬──────────────────────┬───────────────────┐  │
│   │  Left: Story Doctor  │ Center: Poker Arena  │ Right: AI Advisory│  │
│   │  & INVEST Scorecard  │ & 3D Card Flipping   │ & Reference Deck  │  │
│   └──────────────────────┴──────────────────────┴───────────────────┘  │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ SSE (GET /events) + REST (POST)
┌───────────────────────────────────▼────────────────────────────────────┐
│                  Hono Backend Server (@hono/node-server)               │
│  ┌─────────────────────────┐ ┌──────────────────────────────────────┐  │
│  │   In-Memory Room State  │ │    SSE Stream Registry & Broadcast   │  │
│  │   - 4-Phase Reducer     │ │    - Masked Room State Fanout        │  │
│  │   - Reveal Gate Filter  │ │    - 15s Heartbeat & Keep-Alive Loop │  │
│  │   - 4h TTL Inactivity   │ │    - Reconnection & Session Recovery │  │
│  └────────────┬────────────┘ └──────────────────┬───────────────────┘  │
└───────────────┼─────────────────────────────────┼──────────────────────┘
                │ Drizzle ORM                     │ Nearest-Neighbor Vector Lookups
┌───────────────▼─────────────────────────────────▼──────────────────────┐
│                    PostgreSQL + pgvector Database                      │
│   - historical_stories (1536-dim IVFFlat index, team_namespace)        │
│   - point_reference_benchmarks (global & namespace calibration anchors)│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
* **Node.js**: `v20+` LTS & **npm**: `v10+`
* **Docker & Docker Compose** (for containerized PostgreSQL + pgvector)

### Running the Application

#### Option A: Development Mode (Single Command)
```bash
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser for hot-reloading development.

#### Option B: Containerized App (Docker Compose)
```bash
docker compose up --build
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

#### Option C: Production Standalone Build
```bash
npm run build
npm start --workspace=@scrumpokr/server
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Test Suites

```bash
# Run all unit, integration, and Reveal Gate test suites across workspaces
npm test

# Run individual package tests
npm run test:shared
npm run test:server
npm run test:client
```

---

## 📂 Project Structure

```text
├── shared/               # @scrumpokr/shared (Domain models, Zod schemas, Reveal Gate logic)
│   └── src/              # domain.ts, schemas.ts, reveal-gate.ts, room-reducer.ts
│
├── server/               # @scrumpokr/server (Hono Node.js backend)
│   └── src/
│       ├── routes/       # REST endpoints (rooms.ts), SSE streaming (events.ts), AI (ai.ts)
│       ├── room/         # RoomActor & RoomRegistry
│       ├── db/           # Drizzle ORM + pgvector similarity search
│       └── ai/           # @google/genai SDK integration
│
├── client/               # React 18 + TypeScript + Tailwind CSS client (EXP Light Mode)
│   └── src/
│       ├── api/          # Typed Hono RPC client (hc<AppType>)
│       ├── components/   # Felt Poker Arena, 3D Flip Cards, Backlog Drawer, Story Doctor
│       ├── hooks/        # useRoomSocket hook (SSE + REST) with session recovery
│       └── views/        # LobbyView (Home) & RoomView (Live Poker Arena)
│
├── USER_GUIDE.md         # Comprehensive user & facilitator guide
├── DEVELOPER_GUIDE.md    # Developer setup, architecture & testing guide
├── CONTRIBUTING.md       # Contribution guidelines, TDD & PR review standards
└── README.md             # Project overview & quick start
```

---

## 📚 Documentation Index

* 📖 **[User Guide](USER_GUIDE.md)** — Step-by-step facilitator and estimator workflows, room code routing, and multi-user testing.
* 🛠️ **[Developer Guide](DEVELOPER_GUIDE.md)** — Deep dive into system architecture, environment configuration, testing, and security invariants.
* 🤝 **[Contributing Guidelines](CONTRIBUTING.md)** — Branching, commit conventions, TDD practices, and the Two-Axis review checklist.
* 🌐 **[Product Spec](.scratch/scrum-poker/spec.md)** — Technical product specification and roadmap.
* 🗺️ **[Hono Migration Map](.scratch/hono-migration/map.md)** — Architectural decisions for the Full-Stack TypeScript transition.
* 🛡️ **[Security Policy](SECURITY.md)** — Vulnerability disclosure process and Server Reveal Gate security invariants.
* 📋 **[Changelog](CHANGELOG.md)** — Release notes and milestone progress.
* 📜 **[Code of Conduct](CODE_OF_CONDUCT.md)** — Community standards and enforcement guidelines.

---

## 📄 License
 
Copyright &copy; 2026 **Park Kiyong**.
 
This project is open source and available under the terms of the [MIT License](LICENSE).
