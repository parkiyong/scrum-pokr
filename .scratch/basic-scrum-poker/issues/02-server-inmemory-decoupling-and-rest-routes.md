# 02: In-Memory Server Actor, Database & AI Purge, REST Routes

**What to build:**
A lightweight, self-contained Hono server in `server/` that is completely detached from PostgreSQL, Drizzle ORM, and Google GenAI SDK. Implements an in-memory `RoomActor` state machine and `RoomRegistry` with a 4-hour idle TTL sweeper and 5-minute automated Facilitator failover, alongside the 4-category Hono REST command endpoints.

**Blocked by:** 01 (Shared Domain Slimming & Reducer Invariants)

**Status:** ready-for-agent

- [ ] Deleted entire `server/src/db/` directory (`index.ts`, `schema.ts`, `migrate.ts`, `seed.ts`).
- [ ] Deleted `server/src/ai/` directory (`gemini-client.ts`) and `server/src/routes/ai.ts`.
- [ ] Refactored `server/src/room/room-actor.ts` to operate purely in-memory using the lean `@scrumpokr/shared` domain and reducer.
- [ ] Refactored `server/src/room/registry.ts` with 4-hour TTL sweeper and 5-minute facilitator failover.
- [ ] Refactored `server/src/routes/rooms.ts` to implement the 4-category REST endpoints (`/rooms`, `/join`, `/vote`, `/reveal`, `/reset`, `/finalize`, `/deck`, `/stories`, `/next-story`, `/role`, `/transfer-facilitator`) and excised all 10 obsolete tracker/AI routes.
- [ ] Unmounted `aiRoutes` from `server/src/index.ts`.
- [ ] `server/src/__tests__/server.test.ts` passes without Docker or PostgreSQL running.
