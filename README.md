# 🃏 Scrum Pokr

> A real-time, zero-auth Planning Poker estimation platform featuring a high-performance **Full-Stack TypeScript** architecture powered by **Hono (`@hono/node-server`)**, **Server-Sent Events (SSE) + REST**, **React 18 + Tailwind CSS** frontend, and a **server-enforced reveal gate** that eliminates cognitive anchoring bias.

📖 [User Guide](USER_GUIDE.md) · 🛠️ [Developer Guide](DEVELOPER_GUIDE.md) · 🤝 [Contributing](CONTRIBUTING.md) · 🛡️ [Security](SECURITY.md)

---

## ⚡ Highlights

* **Zero-Auth Simplicity**: No accounts, passwords, or signup required. Join or create rooms instantly via memorable 6-character codes (e.g. `SWB-42`, `ZBE-55`).
* **Server-Enforced Reveal Gate**: Votes are physically masked at the protocol level (`has_voted: bool`) until cards are formally revealed, preventing inspection via browser DevTools.
* **Full-Stack TypeScript & Zero Serialization Drift**: Shared domain models, pure state reducer, and validation schemas (`@scrumpokr/shared`) with typed Hono RPC (`hc<AppType>`) for end-to-end static type safety.
* **In-Memory Zero-Database Architecture**: Lightweight and fast in-memory room actors with automatic 4-hour inactivity TTL cleanup.
* **Real-Time SSE Stream & REST**: Server-Sent Events stream with 15-second keep-alive heartbeats and typed REST endpoints for actions.
* **3D Felt Poker Arena**: Realistic central felt poker table with 3D flip card animations, consensus indicators, and outlier spread detection in an EXP Light Mode interface.
* **In-Room Backlog Management**: Integrated backlog drawer with manual story creation, active story switching, drag-and-drop reordering, and 1-click Markdown / CSV exports.
* **Custom Deck Configuration**: Support for standard Fibonacci, Modified Fibonacci, T-Shirt Sizes, Powers of 2, or custom card arrays.
* **Non-Voting Facilitator Support**: Scrum Masters and PMs can lead estimation rounds with full facilitator controls without being forced to vote or altering team quorum.
* **Automatic Facilitator Failover**: If the Facilitator disconnects, authority automatically promotes to the next connected Estimator.
* **Seamless Session Recovery**: Participants automatically reclaim their seat and voting state on page refresh through client-side `localStorage` caching.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Web Client (SPA)                          │
│   ┌──────────────────────┬──────────────────────┬───────────────────┐  │
│   │  Backlog Drawer      │ 3D Felt Poker Arena  │ Custom Deck Modal │  │
│   │  & Markdown/CSV Export│ & Card Flipping     │ & Facilitator Bar │  │
│   └──────────────────────┴──────────────────────┴───────────────────┘  │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ SSE (GET /api/rooms/:code/events)
                                    │ REST (POST /api/rooms, /join, /vote, /action)
┌───────────────────────────────────▼────────────────────────────────────┐
│                  Hono Backend Server (@hono/node-server)               │
│  ┌─────────────────────────┐ ┌──────────────────────────────────────┐  │
│  │   In-Memory Room State  │ │    SSE Stream Registry & Broadcast   │  │
│  │   - Deterministic Reducer│ │   - Masked Room State Fanout        │  │
│  │   - Reveal Gate Filter  │ │    - 15s Heartbeat & Keep-Alive Loop │  │
│  │   - 4h TTL Inactivity   │ │    - Reconnection & Session Recovery │  │
│  └─────────────────────────┘ └──────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
* **Node.js**: `v20+` LTS & **npm**: `v10+`
* **Docker & Docker Compose** (optional, for containerized execution)

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

## 📁 Project Structure

```text
├── shared/               # @scrumpokr/shared (Domain models, Zod schemas, Reducer, Reveal Gate)
│   └── src/              # domain.ts, schemas.ts, reveal-gate.ts, room-reducer.ts
│
├── server/               # @scrumpokr/server (Hono Node.js backend)
│   └── src/
│       ├── routes/       # REST endpoints (rooms.ts), SSE streaming (events.ts)
│       ├── room/         # RoomActor & RoomRegistry (in-memory state machine)
│       └── util/         # Slug & short code generator (slug.ts)
│
├── client/               # React 18 + TypeScript + Vite + Tailwind CSS client (EXP Light Mode)
│   └── src/
│       ├── api/          # Typed Hono RPC client (hc<AppType>) & contracts
│       ├── components/   # Felt Poker Arena, 3D Flip Cards, Backlog Drawer, Deck Selector & Config
│       ├── hooks/        # useRoomSocket hook (SSE + REST) with session recovery
│       ├── utils/        # Session storage helpers (session.ts)
│       └── views/        # LobbyView (Home) & RoomView (Live Poker Arena)
│
├── USER_GUIDE.md         # Comprehensive user & facilitator guide
├── DEVELOPER_GUIDE.md    # Developer setup, architecture & testing guide
├── CONTRIBUTING.md       # Contribution guidelines, TDD & PR review standards
└── README.md             # Project overview & quick start
```

---

## 📚 Documentation Index

* 📖 **[User Guide](USER_GUIDE.md)** — Step-by-step facilitator and estimator workflows, room code routing, backlog drawer, and multi-user testing.
* 🛠️ **[Developer Guide](DEVELOPER_GUIDE.md)** — Deep dive into system architecture, environment configuration, testing, and security invariants.
* 🤝 **[Contributing Guidelines](CONTRIBUTING.md)** — Branching, commit conventions, TDD practices, and the Two-Axis review checklist.
* 🛡️ **[Security Policy](SECURITY.md)** — Vulnerability disclosure process and Server Reveal Gate security invariants.
* 📜 **[Changelog](CHANGELOG.md)** — Release notes and milestone progress.
* 👥 **[Code of Conduct](CODE_OF_CONDUCT.md)** — Community standards and enforcement guidelines.

---

## 📄 License
 
Copyright &copy; 2026 **Park Kiyong**.
 
This project is open source and available under the terms of the [MIT License](LICENSE).
