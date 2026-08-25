# 03: Real-Time SSE Stream Endpoint & Reveal Gate Broadcast

**What to build:**
A robust, real-time Server-Sent Events (SSE) stream endpoint (`GET /api/rooms/:code/events`) in `server/src/routes/events.ts` that pushes initial masked state snapshots upon connection, broadcasts dynamically masked `room_state` updates on room state changes, sends periodic 15-second `ping` keep-alive frames, and handles stream disconnection and presence updates.

**Blocked by:** 02 (In-Memory Server Actor, Database & AI Purge, REST Routes)

**Status:** ready-for-agent

- [ ] Implemented `GET /api/rooms/:code/events` in `server/src/routes/events.ts` utilizing `hono/streaming`'s `streamSSE`.
- [ ] On connection with `?participantId=:pid`, pushes initial masked `room_state` event immediately.
- [ ] Subscribes to `RoomActor` state broadcasts, ensuring each participant receives their individually masked `RoomState` payload (`vote: null` during `Idle`/`Voting` for peers).
- [ ] Implemented 15-second `ping` heartbeat loop (`event: ping\ndata: heartbeat\n\n`) while stream is active.
- [ ] `stream.onAbort` unregisters subscriber, triggers `SET_CONNECTED { connected: false }`, and starts the 5-minute facilitator failover timer if applicable.
- [ ] SSE integration tests verify immediate push, broadcast fan-out, and heartbeat framing.
