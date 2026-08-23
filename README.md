# 🃏 Scrum Pokr AI

> A real-time, zero-auth Planning Poker estimation platform featuring a high-performance **Rust (Tokio / Axum)** backend, **React 18 + TypeScript + Tailwind CSS** frontend, and a **server-enforced reveal gate** that eliminates cognitive anchoring bias.

📖 [User Guide](USER_GUIDE.md) · 🛠️ [Developer Guide](DEVELOPER_GUIDE.md) · 🤝 [Contributing](CONTRIBUTING.md) · 🧠 [OKF Knowledge Bundle](.okf/index.md) · 🌐 [Product Spec](.scratch/scrum-poker/spec.md)

---

## ⚡ Highlights

* **Zero-Auth Simplicity**: No accounts, passwords, or signup required. Join or create rooms instantly via memorable 6-character codes (e.g. `SWB-42`, `ZBE-55`).
* **Server-Enforced Reveal Gate**: Votes and AI baseline recommendations are physically masked at the protocol level (`has_voted: bool`) until cards are formally revealed, preventing inspection via browser DevTools.
* **3D Felt Poker Arena**: Realistic central felt poker table with 3D flip card animations, consensus indicators, and outlier spread detection.
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
                                    │ WebSocket (JSON RPC)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Rust Backend (Tokio / Axum)                      │
│  ┌─────────────────────────┐ ┌──────────────────────────────────────┐  │
│  │   In-Memory Room Actors │ │    AI Advisory Engine                │  │
│  │   - 7-Phase State Mach. │ │    - Story Doctor (INVEST + Edge)    │  │
│  │   - Reveal Gate Filter  │ │    - Divergence Analyzer (Spread)    │  │
│  │   - Socket Reconnection │ │    - SPIDR Vertical Slicer           │  │
│  └────────────┬────────────┘ └──────────────────┬───────────────────┘  │
└───────────────┼─────────────────────────────────┼──────────────────────┘
                │ Async Persistence               │ Nearest-Neighbor Vector Lookups
┌───────────────▼─────────────────────────────────▼──────────────────────┐
│                    PostgreSQL + pgvector Database                      │
│   - historical_stories (1536-dim IVFFlat index, team_namespace)        │
│   - team_estimation_profiles (velocity bands, calibration weights)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
* **Rust**: `1.80+` (`cargo`)
* **Node.js**: `v20+` & `npm`
* **Docker & Docker Compose**

### Running the Application

#### Option A: Containerized App (Recommended for Quick Start)
```bash
docker compose up --build
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

#### Option B: Development Mode (Vite Hot-Reload)
```bash
# Terminal 1: Backend WebSocket & REST server
cargo run --bin server

# Terminal 2: Frontend with Vite hot-reloading
cd client && npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

#### Option C: Standalone Binary Mode
```bash
# 1. Build the React client bundle
cd client && npm run build && cd ..

# 2. Start the Rust server
cargo run --bin server
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Test Suites

```bash
# Backend Rust tests (unit, actor state machine, reveal gate, and WebSocket integration)
cargo test

# Frontend React tests (components, hooks, and session storage)
cd client && npm test
```

---

## 📂 Project Structure

```
├── server/               # Rust (Tokio / Axum) server
│   ├── src/
│   │   ├── actor/        # In-memory RoomActor state machine & RoomRegistry
│   │   ├── domain/       # Models, 6-char Room Code generator & Reveal Gate projections
│   │   ├── ws/           # Axum WebSocket connection & broadcast dispatchers
│   │   ├── routes.rs     # REST endpoints & static frontend asset serving
│   │   └── main.rs       # Server entrypoint
│   └── tests/            # Automated unit and integration test suites
│
├── client/               # React 18 + TypeScript + Tailwind CSS client
│   ├── src/
│   │   ├── components/   # Felt Poker Arena, 3D Flip Cards, Deck Selector, Facilitator Bar
│   │   ├── hooks/        # useRoomSocket hook with zero-auth session recovery
│   │   ├── views/        # LobbyView (Home) & RoomView (Live Poker Arena)
│   │   └── utils/        # localStorage session management
│   └── src/__tests__/    # Vitest component and hook test suites
│
├── .okf/                 # Open Knowledge Format (v0.2) knowledge bundle
│   ├── architecture/     # Tokio actor model & multi-room registry concepts
│   ├── domain/           # Estimation phases, roles, room codes & consensus engine
│   ├── security/         # Server reveal gate & zero-auth session recovery
│   ├── protocol/         # Tagged JSON RPC WebSocket schemas
│   └── decisions/        # Architectural Decision Records (ADRs)
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
* 🧠 **[OKF Knowledge Bundle](.okf/index.md)** — Architectural decision records, domain definitions, and protocol specifications.
* 🛡️ **[Security Policy](SECURITY.md)** — Vulnerability disclosure process and Server Reveal Gate security invariants.
* 📋 **[Changelog](CHANGELOG.md)** — Release notes and milestone progress.
* 📜 **[Code of Conduct](CODE_OF_CONDUCT.md)** — Community standards and enforcement guidelines.

---

## 📄 License
 
Copyright &copy; 2026 **Park Kiyong**.
 
This project is open source and available under the terms of the [MIT License](LICENSE).
