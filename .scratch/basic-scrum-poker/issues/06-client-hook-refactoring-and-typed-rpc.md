# 06: Client Hook Refactoring (useRoomSocket) & Typed Hono RPC Integration

**What to build:**
A streamlined, high-performance React hook (`client/src/hooks/useRoomSocket.ts`) that manages real-time SSE stream events (`room_state`, `ping`), auto-reconnects using stored localStorage profiles, and dispatches end-to-end type-safe Hono RPC requests to `/api/rooms/:code/*`.

**Blocked by:** 03 (Real-Time SSE Stream Endpoint & Reveal Gate Broadcast), 05 (In-Room Story Backlog Drawer & Export Utilities)

**Status:** ready-for-agent

- [ ] Refactored `client/src/hooks/useRoomSocket.ts` to manage pure `RoomState` from `@scrumpokr/shared`.
- [ ] Excised all tracker RPC calls (`connectTracker`, `disconnectTracker`, `testTrackerConnection`, `fetchBacklog`, `syncEstimateToTracker`, `pushStorySlices`) and AI RPC calls (`toggleEdgeCaseCheck`, `updatePointReferences`).
- [ ] Implemented typed RPC actions: `joinRoom`, `updateRole`, `transferFacilitator`, `startVoting`, `castVote`, `retractVote`, `revealCards`, `triggerReVote`, `finalizeStory`, `setDeck`, `selectStory`, `addStory`, `updateStory`, `removeStory`, `reorderBacklog`, `nextStory`.
- [ ] Managed `localStorage` profile persistence and auto-rejoin on stream open.
- [ ] Retained accurate statistical consensus calculation helper in client.
- [ ] `client/src/__tests__/useRoomSocket.test.ts` passes with mocked EventSource and RPC assertions.
