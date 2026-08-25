# Minimal REST & SSE API Contract

Type: research
Status: resolved
Blocked by: 01

## Question

What is the precise minimal REST/RPC endpoint interface and SSE event stream contract needed for Basic Scrum Poker, defining the request/response payloads for:
1. Room creation and joining (with nickname, avatar, role)
2. Card voting and Facilitator Reveal Gate flip / reset actions
3. Deck selection and custom scale updates
4. Manual story management (add story, edit, remove, reorder queue, next story, finalize points)?

## Answer

### 1. Architectural Principles

1. **Unidirectional SSE + Stateless REST Commands**:
   - **Downstream** (`GET /api/rooms/:code/events?participantId=:pid`): Persistent HTTP/1.1 or HTTP/2 `text/event-stream` pushing masked `room_state` snapshots and 15s `ping` heartbeats.
   - **Upstream** (HTTP POST / PUT / DELETE): REST endpoints for client state mutations. Every mutating request dispatches an action to the `RoomActor` state machine, which recalculates room state and broadcasts masked SSE frames to all connected participants.
2. **Zero External Infrastructure / Pure In-Memory**:
   - Zero database, zero Redis pub/sub, zero Docker dependencies. All room state lives in `RoomActor` in-memory instances managed by `RoomRegistry`.
3. **Server-Enforced Reveal Gate Privacy Invariant**:
   - In `Idle` and `Voting` phases, SSE streams and GET requests strip other estimators' votes (`vote: null`, `has_voted: boolean`, `consensus: null`).
   - In `Revealed` and `Finalized` phases, full unmasked votes and computed statistical consensus are broadcast.
4. **Complete AI & Issue Tracker Pruning**:
   - All AI endpoints (`/api/rooms/:code/ai/*`), Story Doctor analysis, SPIDR slicing, Point References benchmarks, and external tracker sync routes (Linear, Jira, GitHub) are excised.
5. **End-to-End Type Safety via Hono RPC (`hc<AppType>`)**:
   - Exported `AppType` ensures the client's `api` client is strictly typed across routes, params, and validated request/response payloads.

---

### 2. Complete REST Endpoint Specification

All endpoints are prefixed with `/api/rooms`.

#### A. Room Lifecycle & Presence

| Method & Route | Access | Request Body | Response (200/201) | Error Codes | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST /api/rooms` | Public | `{ initial_story?: StoryInput, deck?: DeckConfig }` | `{ slug: string, short_code: string }` | `400` | Creates a new ephemeral room with unique slug/short_code. |
| `GET /api/rooms/:code` | Public | None (Query: `?participantId=string`) | `RoomState` (Masked) | `404` | Retrieves current masked snapshot for reconnect / bootstrap. |
| `POST /api/rooms/:code/join` | Public | `JoinRequest` | `{ participant_id: string, state: RoomState }` | `400, 404` | Joins or reconnects a participant. First participant becomes Facilitator. |
| `POST /api/rooms/:code/role` | Participant | `UpdateRoleRequest` | `{ success: true }` | `400, 404` | Switches a participant's role between `Estimator` and `Observer`. |
| `POST /api/rooms/:code/transfer-facilitator` | Facilitator | `TransferFacilitatorRequest` | `{ success: true }` | `400, 403, 404` | Explicitly transfers Facilitator authority to another participant. |

#### B. Card Voting & Facilitator Reveal Gate

| Method & Route | Access | Request Body | Response (200) | Error Codes | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST /api/rooms/:code/start-voting` | Facilitator | `ParticipantActionRequest` | `{ success: true }` | `400, 403, 404` | Transitions phase to `Voting`, resets previous round votes. |
| `POST /api/rooms/:code/vote` | Estimator | `VoteRequest` | `{ success: true }` | `400, 404` | Casts or retracts (`vote: null`) a vote. Rejected if phase is `Revealed`/`Finalized`. |
| `POST /api/rooms/:code/reveal` | Facilitator | `ParticipantActionRequest` | `{ success: true }` | `400, 403, 404` | Flips cards: transitions phase to `Revealed`, computes consensus, broadcasts unmasked state. |
| `POST /api/rooms/:code/reset` | Facilitator | `ParticipantActionRequest` | `{ success: true }` | `400, 403, 404` | Resets round to `Idle`, clears votes and consensus for a re-vote. |
| `POST /api/rooms/:code/finalize` | Facilitator | `FinalizeRequest` | `{ success: true }` | `400, 403, 404` | Locks agreed story points: transitions phase to `Finalized`, sets `current_story.points`. |

#### C. Deck Configuration

| Method & Route | Access | Request Body | Response (200) | Error Codes | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST /api/rooms/:code/deck` | Facilitator | `SetDeckRequest` | `{ success: true }` | `400, 403, 404` | Updates active room deck (`fibonacci`, `modified_fibonacci`, `tshirt`, `sequential`, `custom`). |

#### D. Manual Story & Backlog Management

| Method & Route | Access | Request Body | Response (200/201) | Error Codes | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST /api/rooms/:code/story` | Facilitator | `SetStoryRequest` | `{ success: true }` | `400, 403, 404` | Sets active `current_story` and resets voting round to `Idle`. |
| `POST /api/rooms/:code/stories` | Facilitator / Public | `AddStoryRequest` | `{ success: true, story: Story }` | `400, 404` | Appends story to backlog (or makes active if backlog & current are empty). |
| `PUT /api/rooms/:code/stories/:storyId` | Facilitator | `UpdateStoryRequest` | `{ success: true, story: Story }` | `400, 403, 404` | Updates `title`, `description`, or `acceptance_criteria` of a story. |
| `DELETE /api/rooms/:code/stories/:storyId` | Facilitator | `ParticipantActionRequest` | `{ success: true }` | `400, 403, 404` | Deletes a story from backlog. |
| `POST /api/rooms/:code/reorder-backlog` | Facilitator | `ReorderBacklogRequest` | `{ success: true }` | `400, 403, 404` | Reorders backlog stories based on permutation array of `story_ids`. |
| `POST /api/rooms/:code/next-story` | Facilitator | `ParticipantActionRequest` | `{ success: true }` | `400, 403, 404` | Pops head of backlog into `current_story`, clears votes, sets phase to `Idle`. |

---

### 3. Server-Sent Events (SSE) Stream Specification

**Endpoint**: `GET /api/rooms/:code/events?participantId=:participantId`

#### A. HTTP Response Headers
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

#### B. Event Types & Payloads

1. **`room_state` Event**:
   - Sent immediately upon stream establishment.
   - Sent on every room state transition or presence change.
   - **Data**: JSON-serialized `RoomState`, dynamically masked for the requesting `participantId`.
   ```http
   event: room_state
   data: {"slug":"swift-badger-42","short_code":"SWB-42","phase":"Voting","deck":{"type":"fibonacci","cards":["0","1","2","3","5","8","13","21","34","55","89","?"]},"facilitator_id":"p-1","participants":[{"id":"p-1","name":"Alice","avatar":"","role":"Estimator","connected":true,"has_voted":true,"vote":"5"},{"id":"p-2","name":"Bob","avatar":"","role":"Estimator","connected":true,"has_voted":true,"vote":null}],"current_story":{"id":"story-1","title":"Implement SSE Endpoint","description":"","acceptance_criteria":[],"points":null},"backlog":[],"consensus":null}
   ```

2. **`ping` Keep-Alive Event**:
   - Sent every 15 seconds over active idle connections to prevent corporate firewalls and ALB/NGINX proxy timeouts.
   ```http
   event: ping
   data: heartbeat
   ```

#### C. Connection Lifecycle & Failover Handling
- **Connect**: Client mounts `EventSource`, sends `participantId`. `RoomActor` marks participant `connected: true`.
- **Disconnect / Tab Close**: Client stream aborts (`stream.onAbort`). `RoomActor` sets `connected: false` and broadcasts update.
- **Facilitator Failover**: If the disconnected participant is the Facilitator, `RoomActor` arms a 5-minute failover timer. If the Facilitator does not reconnect within 5 minutes, Facilitator authority is automatically transferred to the next oldest connected Estimator. Reconnection by the Facilitator cancels the timer.

---

### 4. Canonical Zod Schemas (`shared/src/schemas.ts`)

```typescript
import { z } from 'zod';

// Roles & Phases
export const roleSchema = z.enum(['Estimator', 'Observer']);
export const deckTypeSchema = z.enum(['fibonacci', 'modified_fibonacci', 'tshirt', 'sequential', 'custom']);

export const deckConfigSchema = z.object({
  type: deckTypeSchema,
  cards: z.array(z.string()).min(1, 'Deck must contain at least one card'),
});

export const storySchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''),
  acceptance_criteria: z.array(z.string()).default([]),
  points: z.string().nullable().optional(),
});

export const storyInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  acceptance_criteria: z.array(z.string()).optional().default([]),
});

// Request Schemas
export const createRoomSchema = z.object({
  initial_story: storyInputSchema.optional(),
  deck: deckConfigSchema.optional(),
}).optional();

export const joinRequestSchema = z.object({
  participant_id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  avatar: z.string().default(''),
  role: roleSchema.optional().default('Estimator'),
});

export const participantActionSchema = z.object({
  participant_id: z.string().min(1, 'participant_id is required'),
});

export const voteRequestSchema = z.object({
  participant_id: z.string().min(1, 'participant_id is required'),
  vote: z.string().nullable().optional(),
});

export const finalizeRequestSchema = z.object({
  participant_id: z.string().min(1, 'participant_id is required'),
  points: z.string().nullable().optional(),
});

export const setDeckSchema = z.object({
  participant_id: z.string().min(1, 'participant_id is required'),
  deck: deckConfigSchema,
});

export const setStoryRequestSchema = z.object({
  participant_id: z.string().min(1, 'participant_id is required'),
  story: storySchema.nullable(),
});

export const addStorySchema = z.object({
  participant_id: z.string().optional(),
  story: z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().default(''),
    acceptance_criteria: z.array(z.string()).optional().default([]),
  }),
});

export const updateStorySchema = z.object({
  participant_id: z.string().min(1, 'participant_id is required'),
  title: z.string().optional(),
  description: z.string().optional(),
  acceptance_criteria: z.array(z.string()).optional(),
});

export const removeStorySchema = z.object({
  participant_id: z.string().min(1, 'participant_id is required'),
  story_id: z.string().min(1, 'story_id is required'),
});

export const reorderBacklogSchema = z.object({
  participant_id: z.string().min(1, 'participant_id is required'),
  story_ids: z.array(z.string()).min(1, 'story_ids array is required'),
});

export const updateRoleSchema = z.object({
  participant_id: z.string().min(1, 'participant_id is required'),
  target_id: z.string().min(1, 'target_id is required'),
  role: roleSchema,
});

export const transferFacilitatorSchema = z.object({
  participant_id: z.string().min(1, 'participant_id is required'),
  target_id: z.string().min(1, 'target_id is required'),
});
```

---

### 5. Excised / Pruned Routes & Bloat

The following obsolete routes and AI/tracker endpoints are permanently deleted:
1. `routes/ai.ts` (excised completely from server router).
2. `POST /api/rooms/:code/point-references` (removed; AI benchmark library excised).
3. `POST /api/rooms/:code/edge-case` (removed; AI edge case checklist excised).
4. `POST /api/rooms/:code/connect-tracker` (removed).
5. `POST /api/rooms/:code/disconnect-tracker` (removed).
6. `POST /api/rooms/:code/test-tracker` (removed).
7. `POST /api/rooms/:code/fetch-backlog` (removed).
8. `POST /api/rooms/:code/sync-estimate` (removed).
9. `POST /api/rooms/:code/push-slices` (removed).
10. `POST /api/rooms/:code/import-backlog` (replaced by standard `addStory` or client-side JSON/markdown batch import via `addStory`).
