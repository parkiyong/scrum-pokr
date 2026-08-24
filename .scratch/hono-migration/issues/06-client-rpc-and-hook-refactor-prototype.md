# 06: Client RPC & useRoomSocket Hook Refactor Prototype

Type: prototype
Status: resolved
Blocked by: 01, 02

## Question

How should the React client's `useRoomSocket` hook and API client be refactored to consume Hono's SSE streaming endpoint and type-safe `hc<AppType>` RPC actions while maintaining 100% compatibility with existing React UI components and 3D card animations?

## Background & Context

- Currently, `client/src/hooks/useRoomSocket.ts` connects via native `EventSource` to `/api/rooms/${slug}/events` and sends raw `fetch()` POST requests.
- Hono's RPC client (`hc<AppType>`) allows typed calls:
  `await api.api.rooms[':code'].vote.$post({ param: { code: slug }, json: { participantId, vote } })`
- We should create a working prototype/adapter verifying:
  1. Complete type safety from server route definitions to React hooks.
  2. Clean reconnections with `localStorage` participant session recovery.
  3. Zero regressions in UI components (`PokerTableArena`, `FacilitatorBar`, `DeckSelector`, `StoryDoctorPanel`).

## Answer

### 1. Typed RPC Client Architecture (`src/api/contracts.ts` & `src/api/index.ts`)

The Hono RPC client is structured to decouple server-side implementation from client bundle while maintaining strict static typing via `AppType`:

1. **Route Contract Definition (`src/api/contracts.ts`)**:
   - The route schema defines all REST mutations and SSE endpoints using Hono route chaining and typed validator middleware.
   - Infers parameterized URL segments (e.g. `:code` as `{ param: { code: string } }`) and validated JSON request payloads (`{ json: { participant_id: string, ... } }`).
2. **Client Factory & Singleton (`src/api/index.ts`)**:
   - Exports singleton `api = hc<AppType>('')` for same-origin requests and `createApiClient(baseUrl)` for multi-environment configurations.

```typescript
// client/src/api/index.ts
import { hc } from 'hono/client';
import type { AppType } from './contracts';

export const api = hc<AppType>('');

export function createApiClient(baseUrl: string = '', options?: Parameters<typeof hc>[1]) {
  return hc<AppType>(baseUrl, options);
}

export type { AppType } from './contracts';
```

### 2. Refactored `useRoomSocket` Hook (`src/hooks/useRoomSocket.ts`)

The `useRoomSocket` hook has been refactored from raw untyped `fetch()` calls to pure Hono RPC and native SSE stream processing:

1. **SSE Stream Lifecycle & Keep-Alive**:
   - Establishes a native browser `EventSource` to `/api/rooms/:code/events?participantId=<pid>`.
   - Listens for `room_state` events and keep-alive `ping` events.
   - Automatically transitions status between `'connecting'`, `'connected'`, and `'error'`.
2. **Session Recovery with `localStorage`**:
   - Restores the participant's persistent UUID via `getOrCreateParticipantId()`.
   - On SSE connection establishment (`onopen`), checks `getStoredProfile(slug)` and automatically rejoins the room with the saved profile (nickname, avatar, role).
3. **Server-Enforced Reveal Gate & State Mapping**:
   - Safely parses incoming JSON state and normalizes enum variations (e.g. `'VOTING'`, `'Voting'`).
   - Maps participant array preserving server-side masked votes (`vote: null` during `Voting` phase, while `voted: true` shows the face-down status).
   - Dynamically calculates statistical consensus metrics (`computeConsensusFromParticipants`) when phase transitions to `'Revealed'`, `'Finalized'`, `'Discussing'`, or `'Slicing'`.
4. **Typed RPC Command Dispatches**:
   - All room mutations use type-safe RPC methods:
     ```typescript
     // Voting
     await api.api.rooms[':code'].vote.$post({
       param: { code: slug },
       json: { participant_id: participantIdRef.current, vote: value }
     });

     // Reveal Gate Trigger
     await api.api.rooms[':code'].reveal.$post({
       param: { code: slug },
       json: { participant_id: participantIdRef.current }
     });

     // Story Finalization
     await api.api.rooms[':code'].finalize.$post({
       param: { code: slug },
       json: { participant_id: participantIdRef.current, estimate: points }
     });
     ```

### 3. UI Component Compatibility & 3D Card Animation

All UI components and animations remain 100% compatible with zero regressions:
- **`PokerTableArena` & `PokerCard`**: The 3D CSS flip animation (`perspective-1000`, `card-flip`, `rotate-y-180`) operates seamlessly based on the `isFlipped = isRevealed && hasVote` invariant. During voting, cards show "✓ Voted" or "Thinking" without revealing peer votes. Upon reveal, the card flips with gradient consensus/outlier styling.
- **`FacilitatorBar`**: Actions (`startVoting`, `revealCards`, `triggerReVote`, `finalizeStory`) trigger typed RPC endpoints while reflecting active round state.
- **`DeckSelector`**: Card selection and retract vote toggling map directly to `castVote` and `retractVote`.
- **`StoryDoctorPanel` & `PointReferenceLibrary`**: Edge case toggles and reference updates dispatch typed mutations without flickering.

### 4. Verification & Validation

- **Unit Test Suite (`src/__tests__/useRoomSocket.test.ts`)**: Added 5 comprehensive test cases covering SSE initialization, automatic session profile recovery, Reveal Gate vote masking, typed RPC action dispatching, and consensus calculation.
- **Full Test Suite**: All 9 test suites and 33 unit tests pass cleanly in Vitest (`npm test`).
- **Strict Type Checking**: `npx tsc --noEmit` validates with 0 errors across client codebase.
- **Production Bundle**: `npm run build` compiles cleanly with Vite in under 2 seconds.
