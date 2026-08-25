# Server Decoupling & Pure In-Memory Room Registry

Status: resolved
Type: research
Blocked by: 01

## Question

How should the Hono server in `server/` be refactored to completely detach from PostgreSQL, pgvector, Drizzle ORM, and the Google GenAI SDK, transforming `server/src/room/registry.ts` and `server/src/room/room-actor.ts` into a lightweight, self-contained in-memory room management system with configurable TTL eviction and zero external service dependencies?

## Answer

Resolved in [decisions/02-server-decoupling-inmemory-architecture.md](../decisions/02-server-decoupling-inmemory-architecture.md):
- Pruned `server/src/ai/`, `server/src/routes/ai.ts`, and `server/src/db/` completely.
- Removed dependencies: `@google/genai`, `postgres`, `drizzle-orm`, `drizzle-kit`.
- Redesigned `RoomActor` to initialize pure `RoomState` with default `fibonacci` deck, managing participant reconnects, 5-minute facilitator failover timers, and per-subscriber masked SSE broadcasts.
- Configured `RoomRegistry` with dual slug/shortCode index and a 4-hour TTL sweeper that evicts empty rooms to prevent memory leaks.
- Simplified `server/src/index.ts` to expose typed `AppType` over `roomRoutes` and `eventRoutes`.
