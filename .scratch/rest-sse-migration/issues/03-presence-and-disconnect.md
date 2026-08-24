Title: SSE Stream Lifecycle & Disconnect Presence Detection
Status: resolved
Type: task
Blocked by: 01

## Question

How can we reliably detect SSE stream termination / client drops in Axum to trigger `RoomCommand::Disconnect` and Facilitator failover, and configure Keep-Alive heartbeats to prevent proxy timeouts?

## Answer

- Implemented `DisconnectGuard` with `Drop` implementation in [`server/src/sse/handler.rs`](file:///home/widi/GitHub/scrum-poke-ai/server/src/sse/handler.rs) to catch client disconnections, tab closes, and stream cancellations, asynchronously dispatching `RoomCommand::Disconnect { participant_id }` to the `RoomActor`.
- Added explicit `POST /api/rooms/:slug/leave` route in [`server/src/routes.rs`](file:///home/widi/GitHub/scrum-poke-ai/server/src/routes.rs).
- Verified that facilitator drop immediately triggers promotion of the next connected participant via `FacilitatorChanged` broadcast over SSE in [`server/tests/presence_disconnect_tests.rs`](file:///home/widi/GitHub/scrum-poke-ai/server/tests/presence_disconnect_tests.rs).
