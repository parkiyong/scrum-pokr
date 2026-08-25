# 03: Real-Time SSE Stream Endpoint & Reveal Gate Broadcast

**What to build:**
A robust Server-Sent Events stream at `GET /api/rooms/:code/events?participantId=<pid>` using `hono/streaming`, publishing immediate masked state upon connection, multicasting reducer state transitions, broadcasting 15-second keep-alive heartbeats (`ping`), and managing participant disconnects and cleanup.

**Blocked by:** 02 (In-Memory Server Actor, Database & AI Purge, REST Routes)

**Status:** done

- [x] Streamlined `server/src/routes/events.ts` to manage SSE client life cycle via `streamSSE`.
- [x] Initial state push upon connection with participant-specific Reveal Gate masking.
- [x] Multicast event distribution to active room subscribers on any state transition.
- [x] Periodic 15-second `ping` heartbeat keep-alive loop.
- [x] `stream.onAbort` handler triggering `unsubscribe()` and `handleParticipantDisconnect(pid)`.
- [x] Verified zero database/ORM dependencies in the event pipeline.
