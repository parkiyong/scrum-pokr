# Scrum Pokr AI — Developer Guide

> Operational guide for setting up, running, testing, and developing **Scrum Pokr AI**.

📖 [User Guide](USER_GUIDE.md) · 🛠️ [Developer Guide](DEVELOPER_GUIDE.md) · 🤝 [Contributing](CONTRIBUTING.md) · 🌐 [Product Spec](.scratch/scrum-poker/spec.md)

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

* **Java**: `25+` (JDK 25)
* **Maven**: `3.9+`
* **Node.js**: `v20+` & `npm`
* **Docker & Docker Compose**: For containerized deployment

---

## 2. Local Environment Setup

### 2.1 Clone Repository

```bash
git clone https://github.com/parkiyong/scrum-poker-ai.git
cd scrum-poke-ai
```

### 2.2 Install Client Dependencies

```bash
cd client
npm install
cd ..
```

---

## 3. Running the Application

### Option A: Development Mode (Recommended)

Run the backend and frontend in separate terminals with hot reloading:

```bash
# Terminal 1: Backend Java Spring Boot server (from root or server/)
./mvnw spring-boot:run

# Terminal 2: Frontend Vite dev server
cd client && npm run dev
```

* **Browser Access**: Open **[http://localhost:5173](http://localhost:5173)** in your browser for hot-reloading development.
* **Backend Port**: `http://localhost:3000` runs headlessly in the background (Vite automatically proxies `/api` calls to port 3000).

> **Note**: You must run **both** terminals simultaneously during development, but you should **only open port 5173** in your browser.

### Option B: Standalone Mode (Packaged JAR)

Build the frontend bundle and serve everything from the Spring Boot JAR:

```bash
# 1. Build frontend bundle
cd client && npm run build && cd ..

# 2. Package and run Spring Boot JAR
./mvnw clean package && java -jar server/target/server-0.1.0-SNAPSHOT.jar
```
* **Unified Web App**: [http://localhost:3000](http://localhost:3000)

### Option C: Containerized Stack (Docker)

```bash
docker compose up --build
```
* **Unified Web App in Docker**: [http://localhost:3000](http://localhost:3000)

---

## 4. Testing & Quality Verification

### 4.1 Backend Java Tests

Run all unit, reveal gate, and Spring Boot integration test suites:

```bash
cd server && mvn test
```

### 4.2 Frontend React Tests

Run Vitest unit and component tests:

```bash
cd client
npm test

# Run tests in watch mode
npm run test:watch
```

### 4.3 Formatting & Quality Checks

Before submitting code, ensure all linters and tests pass:

```bash
# Backend test verification
cd server && mvn test

# Frontend TypeScript checking & linting
cd client
npm run build
```

---

## 5. Project Directory Layout

```
scrum-poke-ai/
├── server/                     # Spring Boot Java 25 backend
│   ├── pom.xml                 # Maven build configuration & Spring Boot parent
│   └── src/
│       ├── main/java/com/scrumpokr/server/
│       │   ├── controller/     # RoomRestController (REST actions & SSE /events stream)
│       │   ├── model/          # Models (Records, Enums, DTO payloads)
│       │   ├── service/        # RoomHandle, RoomRegistryService
│       │   └── util/           # SlugGenerator
│       ├── main/resources/     # application.properties & static web assets
│       └── test/java/com/scrumpokr/server/ # ServerApplicationTests (Reveal Gate & Room lifecycle)
│
├── client/                     # React frontend application (EXP Light Mode)
│   ├── src/
│   │   ├── components/         # Poker Arena, Backlog Drawer, Connect Modal, SPIDR Slicer
│   │   ├── hooks/              # useRoomSocket (SSE + REST), useSessionStorage
│   │   ├── views/              # LobbyView (Home) and RoomView (Poker Arena)
│   │   ├── types/              # TypeScript types and data models
│   │   └── utils/              # Session persistence and short code formatting
│   └── src/__tests__/          # Frontend component and integration tests
│
├── .scratch/scrum-poker/       # Local issue tracker & system specifications
│   ├── map.md                  # Project roadmap
│   ├── spec.md                 # Product & system technical specification
│   ├── issues/                 # Individual feature tickets
│   └── decisions/              # Architectural decision tickets
│
├── docker-compose.yml          # Local container services
├── Dockerfile                  # Multi-stage production container build (Node + Maven Java 25)
├── USER_GUIDE.md               # User & facilitator documentation
├── DEVELOPER_GUIDE.md          # Developer operational guide (this document)
├── CONTRIBUTING.md             # Contribution guidelines & workflow
└── README.md                   # Project overview & quick start
```

---

## 6. Architecture & Design Specifications

Key architectural principles, domain definitions, and API specifications are maintained across:

* 🏛️ **Architecture & Backend Specification**:
  * [Java Migration Architecture & Stack Recommendation](docs/JAVA_MIGRATION_RECOMMENDATION.md)
  * [Product & System Technical Specification](.scratch/scrum-poker/spec.md)
* 🧠 **Domain Glossary & Invariants**:
  * [Domain Vocabulary & Rules](CONTEXT.md)
* 🛡️ **Security Invariants**:
  * Server-enforced Reveal Gate masking unrevealed votes across REST/SSE state broadcasts.
  * Zero-auth session recovery backed by client-side storage and session IDs.
