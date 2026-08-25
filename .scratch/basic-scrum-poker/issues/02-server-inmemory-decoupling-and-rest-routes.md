# 02: In-Memory Server Actor, Database & AI Purge, REST Routes

**What to build:**
Complete decoupling and removal of PostgreSQL / Drizzle ORM and Gemini AI dependencies from `server/`, refactoring `RoomActor` to be a pure in-memory stateful actor backed by `@scrumpokr/shared`, implementing a memory-efficient `RoomRegistry` with 4-hour inactivity sweeping and 5-minute facilitator failover, and exposing the complete 4-category REST route interface.

**Blocked by:** 01 (Shared Domain Slimming & Reducer Invariants)

**Status:** done

- [x] Deleted `server/src/db/` directory (`index.ts`, `schema.ts`, `migrate.ts`, `seed.ts`).
- [x] Deleted `server/src/ai/` directory (`gemini-client.ts`) and `server/src/routes/ai.ts`.
- [x] Refactored `server/src/room/room-actor.ts` to operate purely in-memory using lean `@scrumpokr/shared` domain and reducer.
- [x] Refactored `server/src/room/registry.ts` with 4-hour TTL sweeper and 5-minute facilitator failover.
- [x] Refactored `server/src/routes/rooms.ts` to implement the 4-category REST endpoints (`/rooms`, `/join`, `/vote`, `/reveal`, `/reset`, `/finalize`, `/deck`, `/stories`, `/stories/:storyId`, `/next-story`, `/role`, `/transfer-facilitator`) and excised all tracker/AI routes.
- [x] Unmounted `aiRoutes` from `server/src/index.ts`.
- [x] `server/src/__tests__/server.test.ts` and `registry.test.ts` pass without Docker or PostgreSQL running.
