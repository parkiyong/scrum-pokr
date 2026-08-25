# Basic Scrum Poker: Architecture Specification & Refactoring Plan

---

## 1. Executive Summary

**Basic Scrum Poker** is a lean, lightning-fast, zero-auth, pure in-memory real-time Planning Poker application.

This specification unifies the architectural decisions ([01](decisions/01-shared-domain-slimming.md), [02](decisions/02-server-decoupling-inmemory-architecture.md), [03](decisions/03-rest-sse-api-contract.md), [04](decisions/04-client-ui-pruning-and-core-experience.md), [05](decisions/05-test-suite-and-migration-strategy.md)) to strip all AI advisory layers (Story Doctor, SPIDR slicer, Invest scorecards, Reference Matcher) and external issue tracker sync mechanisms (Linear, Jira, GitHub) from the codebase.

The resulting application requires **zero external infrastructure** (no Docker, no PostgreSQL, no Redis, no cloud API keys), operating entirely in-memory with a Hono REST + SSE backend and a React/Vite/Tailwind frontend.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            React 18 + Vite Frontend                         │
│  - Single-column virtual table arena with dynamic seat layout               │
│  - Docked dynamic card deck with custom preset switcher                     │
│  - In-room manual backlog manager with 1-click Markdown / CSV export        │
└───────────────────────┬─────────────────────────────▲───────────────────────┘
                        │ HTTP POST (Actions)         │ Server-Sent Events
                        │ (Join, Vote, Reveal, Reset) │ (Masked RoomState + Ping)
                        ▼                             │
┌─────────────────────────────────────────────────────┴───────────────────────┐
│                           Hono In-Memory Backend                            │
│  - Pure in-memory RoomRegistry & RoomActor state machines                   │
│  - Automatic server-side Reveal Gate privacy masking per participant        │
│  - 4-hour idle room TTL cleanup & 5-minute facilitator failover             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Excised Bloat & Dependencies Inventory

### Removed NPM Dependencies
- **Server**: `drizzle-orm`, `drizzle-kit`, `postgres`, `@google/genai`
- **Root / Dev**: Database scripts (`db:generate`, `db:migrate`, `db:seed`)

### Excised Code & Modules
| Package | Directory / File | Description of Excised Bloat |
| :--- | :--- | :--- |
| **`server/`** | `src/db/` | Deleted entire database directory (`index.ts`, `schema.ts`, `migrate.ts`, `seed.ts`). |
| **`server/`** | `src/ai/` & `src/routes/ai.ts` | Deleted Google GenAI client and all `/api/rooms/:code/ai/*` routes. |
| **`client/`** | `src/components/StoryDoctorPanel.tsx` | Deleted AI story quality gate, INVEST scorecard, and edge cases checklist. |
| **`client/`** | `src/components/ConnectTrackerModal.tsx` | Deleted Linear/GitHub/Jira OAuth & API key configuration modal. |
| **`client/`** | `src/components/SPIDRSliceModal.tsx` | Deleted AI vertical story slicing modal. |
| **`client/`** | `src/components/PointReferenceLibrary.tsx` | Deleted AI estimation benchmark library drawer. |
| **`shared/`** | `src/schemas.ts` & `src/domain.ts` | Deleted 8 AI interfaces, tracker schemas, and 3 bloated phases (`StoryDoctorReview`, `Discussing`, `Slicing`). |

---

## 3. Shared Domain Models & Reducer (`packages/shared`)

### Domain Types (`shared/src/domain.ts`)
```typescript
export type Role = 'Estimator' | 'Observer';

export type EstimationPhase = 'Idle' | 'Voting' | 'Revealed' | 'Finalized';

export type DeckType = 'fibonacci' | 'modified_fibonacci' | 'tshirt' | 'sequential' | 'custom';

export interface DeckConfig {
  type: DeckType;
  cards: string[];
}

export const DEFAULT_DECKS: Record<DeckType, string[]> = {
  fibonacci: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?'],
  modified_fibonacci: ['0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?'],
  tshirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
  sequential: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?'],
  custom: ['1', '2', '3', '5', '8', '?'],
};

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  role: Role;
  connected: boolean;
  has_voted: boolean;
  vote: string | null;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  points?: string | null;
}

export type ConsensusCategory =
  | 'Consensus'
  | 'HighOutlier'
  | 'LowOutlier'
  | 'BimodalSplit'
  | 'WideSpread';

export interface ConsensusSummary {
  category: ConsensusCategory;
  consensus_pct: number;
  agreement_count: number;
  total_votes: number;
  suggested_points?: string;
  min_vote?: string;
  max_vote?: string;
}

export interface RoomState {
  slug: string;
  short_code: string;
  phase: EstimationPhase;
  deck: DeckConfig;
  facilitator_id: string;
  participants: Participant[];
  current_story: Story | null;
  backlog: Story[];
  consensus: ConsensusSummary | null;
}
```

### 16 Canonical Reducer Actions (`shared/src/room-reducer.ts`)
1. `JOIN`: Adds participant or reconnects existing; assigns Facilitator to first joiner.
2. `SET_CONNECTED`: Toggles connectivity flag on SSE connect/abort.
3. `UPDATE_ROLE`: Toggles participant between `Estimator` and `Observer`.
4. `TRANSFER_FACILITATOR`: Transfers facilitator authority to another participant.
5. `SET_DECK`: Sets active `DeckConfig` scale.
6. `START_VOTING`: Sets phase to `Voting`, clears prior round votes.
7. `CAST_VOTE`: Records participant vote (only in `Idle` / `Voting` phase).
8. `REVEAL_CARDS`: Sets phase to `Revealed`, computes `ConsensusSummary`.
9. `RESET_ROUND`: Sets phase to `Idle`, clears votes and consensus for re-vote.
10. `FINALIZE_STORY`: Sets phase to `Finalized`, locks agreed points to `current_story.points`.
11. `SET_STORY`: Sets `current_story` and resets round to `Idle`.
12. `ADD_STORY`: Appends story to backlog (or sets as active if backlog and current are empty).
13. `UPDATE_STORY`: Updates title, description, or acceptance criteria of a story.
14. `REMOVE_STORY`: Removes a story from backlog by ID.
15. `REORDER_BACKLOG`: Reorders backlog based on validated permutation array of `story_ids`.
16. `NEXT_STORY`: Pops head of backlog into `current_story`, clears votes, resets phase to `Idle`.

### Server-Side Reveal Gate Privacy (`shared/src/reveal-gate.ts`)
```typescript
export function maskRoomStateForParticipant(state: RoomState, requestingParticipantId: string): RoomState {
  if (state.phase === 'Revealed' || state.phase === 'Finalized') {
    return { ...state };
  }

  return {
    ...state,
    consensus: null,
    participants: state.participants.map((p) => {
      if (p.id === requestingParticipantId) {
        return { ...p };
      }
      return {
        ...p,
        vote: null, // Concealed from peers during Idle/Voting
      };
    }),
  };
}
```

---

## 4. Server In-Memory Architecture & API Contract (`packages/server`)

### In-Memory RoomActor & Registry Lifecycle
- **Pure In-Memory Storage**: Rooms live in `Map<string, RoomActor>` inside `RoomRegistry`.
- **TTL Sweeper**: Runs every 15 minutes; automatically purges rooms inactive for > 4 hours that have zero active SSE subscribers.
- **Facilitator Failover**: When the Facilitator disconnects, a 5-minute timer is armed. If no reconnect occurs within 5 minutes, Facilitator authority is transferred to the next oldest connected Estimator.

### REST Command Interface (`/api/rooms`)
| Method & Route | Body | Description |
| :--- | :--- | :--- |
| `POST /api/rooms` | `{ initial_story?, deck? }` | Create new ephemeral room (returns `{ slug, short_code }`). |
| `GET /api/rooms/:code` | (Query `?participantId=pid`) | Get current masked room snapshot. |
| `POST /api/rooms/:code/join` | `joinRequestSchema` | Join room with name, avatar, role. Returns `{ participant_id, state }`. |
| `POST /api/rooms/:code/start-voting` | `participantActionSchema` | (Facilitator) Transition phase to `Voting`. |
| `POST /api/rooms/:code/vote` | `voteRequestSchema` | Cast or retract (`vote: null`) card vote. |
| `POST /api/rooms/:code/reveal` | `participantActionSchema` | (Facilitator) Transition phase to `Revealed`, compute consensus. |
| `POST /api/rooms/:code/reset` | `participantActionSchema` | (Facilitator) Reset round to `Idle`, clear votes. |
| `POST /api/rooms/:code/finalize` | `finalizeRequestSchema` | (Facilitator) Lock agreed points into current story. |
| `POST /api/rooms/:code/deck` | `setDeckSchema` | (Facilitator) Update active deck configuration. |
| `POST /api/rooms/:code/story` | `setStoryRequestSchema` | (Facilitator) Set active story. |
| `POST /api/rooms/:code/stories` | `addStorySchema` | Add story to backlog. |
| `PUT /api/rooms/:code/stories/:storyId` | `updateStorySchema` | Edit backlog or current story details. |
| `DELETE /api/rooms/:code/stories/:storyId` | `removeStorySchema` | Remove story from backlog. |
| `POST /api/rooms/:code/reorder-backlog` | `reorderBacklogSchema` | (Facilitator) Permute backlog story order. |
| `POST /api/rooms/:code/next-story` | `participantActionSchema` | (Facilitator) Advance queue to next story. |
| `POST /api/rooms/:code/role` | `updateRoleSchema` | Toggle participant role between `Estimator` and `Observer`. |
| `POST /api/rooms/:code/transfer-facilitator` | `transferFacilitatorSchema` | (Facilitator) Transfer facilitator authority. |

### SSE Stream Endpoint (`GET /api/rooms/:code/events`)
- **Protocol**: `text/event-stream` with `X-Accel-Buffering: no` and `Cache-Control: no-cache`.
- **Events**:
  1. `event: room_state\ndata: <JSON-stringified masked RoomState>\n\n` (pushed on connection and on every state dispatch).
  2. `event: ping\ndata: heartbeat\n\n` (pushed every 15s to keep connections alive).

---

## 5. Client UI & Experience (`packages/client`)

### Core Components
1. **`RoomView.tsx`**: Single-column arena layout coordinating real-time state, header, active story banner, facilitator controls, table arena, and docked card deck.
2. **`PokerTableArena.tsx`**: Sky-blue stadium table with dynamic perimeter seating and center consensus hub (consensus %, mode points, min ↔ max spread).
3. **`DeckSelector.tsx` & `DeckConfigModal.tsx`**: Interactive card scale supporting Fibonacci, Modified Fibonacci, T-Shirt, Sequential, and Custom scales.
4. **`BacklogDrawer.tsx`**: Manual in-room backlog drawer with story creation, active story selection (`Estimate`), up/down reordering, removal, and Markdown/CSV clipboard export.
5. **`FacilitatorBar.tsx`**: Clean, phase-aware facilitator action toolbar (`Start Voting`, `Reveal Cards`, `Re-Vote`, `Finalize Estimate`, `Next Story`, `Configure Deck`).
6. **`useRoomSocket.ts`**: High-performance React hook consuming Server-Sent Events and dispatching typed Hono RPC actions via `api.api.rooms[':code']`.

---

## 6. Test Suite & Verification Matrix

All tests run via **Vitest** without external services:

| Workspace | Test File | Key Invariants Verified |
| :--- | :--- | :--- |
| **`shared`** | `room-reducer.test.ts` | All 16 actions, initial facilitator assignment, role toggling, strict permutation backlog reordering, multi-round resets. |
| **`shared`** | `reveal-gate.test.ts` | Masked peer votes during `Idle`/`Voting`, unmasked votes during `Revealed`/`Finalized`, consensus mode and outlier calculations. |
| **`shared`** | `schemas.test.ts` | Request payload schema validation and error handling. |
| **`server`** | `server.test.ts` | End-to-end Hono REST endpoint tests (`/health`, `/rooms`, `/join`, `/vote`, `/reveal`, `/reset`, `/next-story`, `/deck`). |
| **`server`** | `registry.test.ts` | In-memory room actor lifecycle, shortCode resolution, 4-hour TTL sweeper, 5-minute facilitator failover. |
| **`server`** | `sse-events.test.ts` | SSE stream lifecycle, initial masked push, reactive broadcast fan-out, 15s heartbeat pings. |
| **`client`** | `useRoomSocket.test.ts` | SSE connection, profile auto-reconnect, typed RPC action dispatching, consensus calculation. |
| **`client`** | `PokerTableArena.test.tsx` | 4-phase hub display, dynamic seat distribution, card back vs card face rendering. |
| **`client`** | `DeckSelector.test.tsx` | Dynamic card rendering, card selection, vote retraction, disabled non-voting state. |
| **`client`** | `BacklogDrawer.test.tsx` | In-room backlog CRUD, queue reorder, active story selection, Markdown & CSV exports. |
| **`client`** | `FacilitatorBar.test.tsx` | Phase-dependent action buttons and facilitator permission gating. |

---

## 7. Migration & Execution Checklist

- [ ] **Step 1: Shared Domain Refactoring**
  - [ ] Prune `shared/src/domain.ts` to lean domain models (`DeckConfig`, 4 phases, lean `Story`, `Participant`).
  - [ ] Update `shared/src/room-reducer.ts` to 16 canonical actions.
  - [ ] Update `shared/src/reveal-gate.ts` to support dynamic deck consensus and Reveal Gate masking.
  - [ ] Prune `shared/src/schemas.ts` to lean Zod request schemas.
  - [ ] Verify with `npm run test -w shared`.
- [ ] **Step 2: Server In-Memory Decoupling**
  - [ ] Delete `server/src/db/` and `server/src/ai/`.
  - [ ] Remove `drizzle-orm`, `drizzle-kit`, `postgres`, `@google/genai` from `server/package.json`.
  - [ ] Update `server/src/room/room-actor.ts` and `server/src/room/registry.ts` with 4-hour TTL sweeper and failover.
  - [ ] Update `server/src/routes/rooms.ts` and `server/src/routes/events.ts`.
  - [ ] Delete `server/src/routes/ai.ts` and unmount from `server/src/index.ts`.
  - [ ] Verify with `npm run test -w server`.
- [ ] **Step 3: Client UI Pruning & Refactoring**
  - [ ] Delete `StoryDoctorPanel.tsx`, `ConnectTrackerModal.tsx`, `SPIDRSliceModal.tsx`, `PointReferenceLibrary.tsx`.
  - [ ] Delete corresponding unit tests in `client/src/__tests__/`.
  - [ ] Refactor `RoomView.tsx` to clean single-column layout.
  - [ ] Add `DeckConfigModal.tsx` and enhance `DeckSelector.tsx`.
  - [ ] Enhance `BacklogDrawer.tsx` for manual story CRUD.
  - [ ] Update `useRoomSocket.ts` hook for typed Hono RPC actions.
  - [ ] Verify with `npm run test -w client`.
- [ ] **Step 4: Monorepo Build & Verification**
  - [ ] Run `npm run build` across all workspaces.
  - [ ] Run `npm test` across all 3 workspaces.
