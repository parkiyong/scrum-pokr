# 🃏 Scrum Pokr AI

> A real-time, zero-auth Planning Poker estimation platform featuring a high-performance **Java 25 (Spring Boot 4.1+)** backend with **Server-Sent Events (SSE) + REST**, **React 18 + TypeScript + Tailwind CSS** frontend, and a **server-enforced reveal gate** that eliminates cognitive anchoring bias.

📖 [User Guide](USER_GUIDE.md) · 🛠️ [Developer Guide](DEVELOPER_GUIDE.md) · 🤝 [Contributing](CONTRIBUTING.md) · 🌐 [Product Spec](.scratch/scrum-poker/spec.md)

---

## ⚡ Highlights

* **Zero-Auth Simplicity**: No accounts, passwords, or signup required. Join or create rooms instantly via memorable 6-character codes (e.g. `SWB-42`, `ZBE-55`).
* **Server-Enforced Reveal Gate**: Votes and AI baseline recommendations are physically masked at the protocol level (`has_voted: bool`) until cards are formally revealed, preventing inspection via browser DevTools.
* **Unified 2-Way Backlog Sync**: Seamlessly import backlogs and write back finalized story point estimates to **Linear**, **GitHub Issues**, **Jira**, or raw Markdown.
* **SPIDR Story Decomposition**: Breakdown complex or unestimated stories using the SPIDR framework (Spike, Path, Interface, Data, Rules) with automated AI assistance.
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
│                  Java 25 Backend (Spring Boot 4.1+)                    │
│  ┌─────────────────────────┐ ┌──────────────────────────────────────┐  │
│  │   In-Memory Room State  │ │    SSE Emitter Registry & Broadcast  │  │
│  │   - 4-Phase State Mach. │ │    - Masked Room State Fanout        │  │
│  │   - Reveal Gate Filter  │ │    - Heartbeat & Keep-Alive Emitter  │  │
│  │   - Thread-Safe Handles │ │    - Reconnection & Session Recovery │  │
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
* **Java**: `25+` & **Maven**: `3.9+`
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
├── server/               # Spring Boot Java 25 backend
│   ├── pom.xml           # Maven build configuration
│   └── src/
│       ├── main/java/    # REST controllers, SSE streaming endpoints, models & services
│       ├── main/resources/# application.properties & static assets
│       └── test/java/    # Reveal Gate & Spring Boot integration test suites
│
├── client/               # React 18 + TypeScript + Tailwind CSS client (EXP Light Mode)
│   ├── src/
│   │   ├── components/   # Felt Poker Arena, 3D Flip Cards, Backlog Drawer, Connect Modal, SPIDR Slicer
│   │   ├── hooks/        # useRoomSocket hook (SSE + REST) with session recovery
│   │   ├── views/        # LobbyView (Home) & RoomView (Live Poker Arena)
│   │   ├── types/        # TypeScript types and data models
│   │   └── utils/        # localStorage session management
│   └── src/__tests__/    # Vitest component and hook test suites
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
* 🛡️ **[Security Policy](SECURITY.md)** — Vulnerability disclosure process and Server Reveal Gate security invariants.
* 📋 **[Changelog](CHANGELOG.md)** — Release notes and milestone progress.
* 📜 **[Code of Conduct](CODE_OF_CONDUCT.md)** — Community standards and enforcement guidelines.

---

## 📄 License
 
Copyright &copy; 2026 **Park Kiyong**.
 
This project is open source and available under the terms of the [MIT License](LICENSE).
