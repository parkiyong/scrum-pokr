Title: Implement Axum SSE Route and Event Broadcast Stream
Status: resolved
Type: task
Blocked by:

## Question

How should we implement the `/api/rooms/:slug/events` SSE handler in Axum to subscribe to the RoomActor events and stream them to clients while applying the server-side Reveal Gate projection?

## Answer

Implemented the Axum SSE handler in [`server/src/sse/handler.rs`](file:///home/widi/GitHub/scrum-poke-ai/server/src/sse/handler.rs) and registered the route `/api/rooms/:slug/events` in [`server/src/routes.rs`](file:///home/widi/GitHub/scrum-poke-ai/server/src/routes.rs).
- On client stream initialization (`GET /api/rooms/:slug/events?participant_id=<pid>`), an initial `RoomSnapshot` is dispatched with personalized Reveal Gate masking for the connecting participant.
- Subsequent broadcast events from the Tokio `RoomActor` are intercepted, masked via the Reveal Gate when emitting `RoomSnapshot`, and formatted as standard SSE frames with typed event names and JSON data.
- Configured 15-second Keep-Alive heartbeats to prevent proxy/firewall idle connection drops.
- Verified with end-to-end unit and integration tests in [`server/tests/sse_handler_tests.rs`](file:///home/widi/GitHub/scrum-poke-ai/server/tests/sse_handler_tests.rs).
