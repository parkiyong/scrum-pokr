# Server Decoupling & Pure In-Memory Room Registry

Type: research
Status: resolved
Blocked by: 01

## Question

How should the Hono server in `server/` be refactored to completely detach from PostgreSQL, pgvector, Drizzle ORM, and the Google GenAI SDK, transforming `server/src/room/registry.ts` and `server/src/room/room-actor.ts` into a lightweight, self-contained in-memory room management system with configurable TTL eviction and zero external service dependencies?

## Answer

### 1. Database & AI Service Decoupling

The server is converted into a 100% self-contained, zero-database application:
- **Pruned Directories**:
  - `server/src/ai/`: Completely deleted.
  - `server/src/routes/ai.ts`: Completely deleted.
  - `server/src/db/`: Completely deleted (`schema.ts`, `migrate.ts`, `seed.ts`, `index.ts`).
- **Pruned Package Dependencies**:
  - Removed `@google/genai`, `postgres`, `drizzle-orm`, `drizzle-kit`.
  - Retained only `@hono/node-server`, `@hono/zod-validator`, `hono`, `zod`, `dotenv`, and `@scrumpokr/shared`.
- **Root Cleanup**:
  - Removed database npm scripts (`db:generate`, `db:migrate`, `db:seed`) from root `package.json` and `server/package.json`.
  - Removed PostgreSQL container service from `docker-compose.yml`.

### 2. Streamlined `RoomActor` Lifecycle (`server/src/room/room-actor.ts`)

`RoomActor` operates as an in-memory stateful actor for a single estimation room:
- **Clean Initial State**:
  Initializes `RoomState` with the default `fibonacci` deck, empty backlog, and an initial placeholder story, without any AI reports or point reference benchmark data.
- **Presence & Participant Reconnects**:
  - Reconnecting clients pass their cached `participant_id`. If found in `participants`, their connectivity is updated to `connected: true` without resetting their role or name.
  - If a disconnected participant is the Facilitator, a 5-minute failover timer starts. If they do not reconnect within 5 minutes, facilitator authority promotes to the oldest connected Estimator. If they rejoin, the failover timer is cancelled.
- **SSE Broadcast Engine**:
  - Maintains `Map<string, Set<Subscriber>>` mapping `participantId` to active SSE response streams.
  - On any `dispatch(action)`, updates `lastActiveAt`, computes `nextState = roomReducer(state, action)`, and broadcasts state masked individually per participant via `maskRoomStateForParticipant`.

### 3. Pure In-Memory `RoomRegistry` (`server/src/room/registry.ts`)

- **Addressing & Indexing**:
  - Dual lookup maps: `rooms: Map<string, RoomActor>` (by slug) and `codeIndex: Map<string, string>` (case-insensitive short code and slug aliases).
  - Slug generator produces pronounceable 3-word slugs (e.g. `swift-badger-42`) and 6-char short codes (e.g. `SWB-42`).
- **TTL Eviction Sweeper**:
  - Configurable room TTL (`ROOM_TTL_MS = 4 hours`, customizable via `ROOM_TTL_HOURS`).
  - Interval timer runs every 10 minutes checking `now - room.lastActiveAt > ROOM_TTL_MS`.
  - Rooms are only evicted if they have **no active SSE subscribers**, preventing active sessions from being interrupted.
  - Eviction cleans up all subscriber sets and removes index entries to guarantee zero memory leaks.

### 4. Simplified Hono Application (`server/src/index.ts`)

- Routes are simplified to:
  ```typescript
  import { Hono } from 'hono';
  import { cors } from 'hono/cors';
  import { serveStatic } from '@hono/node-server/serve-static';
  import { roomRoutes } from './routes/rooms';
  import { eventRoutes } from './routes/events';

  const app = new Hono();
  app.use('*', cors());
  app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

  export const routes = app
    .route('', roomRoutes)
    .route('', eventRoutes);

  export type AppType = typeof routes;
  ```
- The typed RPC contract (`AppType`) exposes only core room lifecycle and SSE event routes.
