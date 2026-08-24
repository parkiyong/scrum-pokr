## Destination

A complete, production-grade architectural specification and validated migration path for replacing the Java 25 / Spring Boot & Rust backends with a unified Full-Stack TypeScript architecture powered by Hono (`@hono/node-server`), Server-Sent Events (SSE), shared end-to-end type contracts (`shared/types`), Drizzle ORM + pgvector, and `@google/genai` SDK for AI advisory services.

## Notes

- Effort: Hono Full-Stack TypeScript Migration
- Framework: Hono (`@hono/node-server`) with native `streamSSE` and `hono/client` (hc) RPC.
- State & Real-Time Model: In-memory RoomRegistry actor + Server-Sent Events (SSE) with per-participant Reveal Gate masking + REST command actions.
- Database: PostgreSQL 16 + pgvector for historical story reference embeddings.
- AI Stack: Official `@google/genai` Gemini SDK with structured JSON outputs.
- Issue Tracker: Local markdown under `.scratch/hono-migration/`.
- Skills: `domain-modeling`, `grilling`, `prototype`, `research`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Monorepo Layout & Shared Types Contract](issues/01-monorepo-layout-and-shared-types.md): Native npm workspaces (`shared`, `server`, `client`), single-source Zod schemas & inferred types in `@scrumpokr/shared`, pure Reveal Gate masking function, and type-only Hono RPC (`hc<AppType>`) client bindings.
- [Hono SSE Stream Lifecycle & Reveal Gate Fan-out Masking](issues/02-hono-sse-stream-and-reveal-gate.md): Hono `streamSSE` on `@hono/node-server`, per-participant subscription dispatching, 15s keep-alive heartbeats, `onAbort` resource cleanup, and server-side Reveal Gate masking.
- [In-Memory Room State Machine & Lifecycle Semantics](issues/04-in-memory-state-machine-and-lifecycle.md): 4-hour inactivity room TTL, 5-minute facilitator disconnect failover timer, and pure deterministic state reducers in `@scrumpokr/shared` dispatched by server `RoomActor`.
- [AI Advisory Services & Gemini SDK Integration Contract](issues/05-ai-advisory-gemini-sdk-integration.md): Official `@google/genai` TypeScript SDK (`gemini-2.5-flash`), native JSON `responseSchema` validation for Story Doctor & SPIDR slicing, and strict Reveal Gate confinement.
- [TypeScript pgvector ORM & Vector Indexing Architecture](issues/03-pgvector-orm-and-database-layer.md): Drizzle ORM + `postgres.js` with native `vector(1536)` IVFFlat cosine search (`<=>`), cold-start benchmark auto-seeding, and automated migrations via `drizzle-kit`.
- [Client RPC & useRoomSocket Hook Refactor Prototype](issues/06-client-rpc-and-hook-refactor-prototype.md): Decoupled `AppType` contracts with `hc<AppType>` RPC client, native SSE lifecycle, local session recovery, and 100% test coverage with 3D card animations preserved.
- [Docker & Dev Workflow Consolidation](issues/07-docker-and-dev-workflow-consolidation.md): Root npm workspaces scripts (`npm run dev`), multi-stage Alpine Dockerfile (<100MB), docker-compose with pgvector, and total decommission of Java/Maven toolchains.

## Not yet specified

<!-- see "Fog of war": in-scope fog you can't ticket yet; graduates as the frontier advances -->

- Distributed multi-node clustering with Redis Pub/Sub for SSE horizontal scaling across instances.
- Zero-downtime database migration rollout from existing schema.
- Native WebSocket fallback mode for environments with HTTP/1.1 connection limit constraints without HTTP/2.

## Out of scope

<!-- see "Out of scope": work ruled beyond the destination; closed, never graduates -->

- Maintaining dual Java and TypeScript backend implementations in parallel (Java codebase will be completely decommissioned).
- Rewriting the React 18 / Tailwind CSS client UI components from scratch (only client network/state adapters are modified).
