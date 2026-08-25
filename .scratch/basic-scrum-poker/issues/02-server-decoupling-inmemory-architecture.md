# Server Decoupling & Pure In-Memory Room Registry

Status: open
Type: research
Blocked by: 01

## Question

How should the Hono server in `server/` be refactored to completely detach from PostgreSQL, pgvector, Drizzle ORM, and the Google GenAI SDK, transforming `server/src/room/registry.ts` and `server/src/room/room-actor.ts` into a lightweight, self-contained in-memory room management system with configurable TTL eviction and zero external service dependencies?
