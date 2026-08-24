Title: Implement Axum REST Command Endpoints
Status: resolved
Type: task
Blocked by: 01

## Question

How should we structure and implement the Axum REST endpoints in `server/src/routes.rs` for room management, voting, participant roles, backlog management, and tracker operations, dispatching `RoomCommand::ClientMsg` directly to the `RoomActor`?

## Answer

Implemented comprehensive Axum REST endpoints in [`server/src/routes.rs`](file:///home/widi/GitHub/scrum-poke-ai/server/src/routes.rs):
- `GET /api/rooms/:slug/state`: Query room state snapshot with Reveal Gate projection for a given `participant_id`.
- `POST /api/rooms/:slug/participants`: Join room or update identity.
- `PATCH /api/rooms/:slug/participants/:id/role`: Update participant role (Estimator/Observer).
- `POST /api/rooms/:slug/facilitator`: Transfer facilitator authority.
- `POST /api/rooms/:slug/voting/start`, `POST /api/rooms/:slug/voting/vote`, `POST /api/rooms/:slug/voting/retract`, `POST /api/rooms/:slug/voting/reveal`, `POST /api/rooms/:slug/voting/revote`, `POST /api/rooms/:slug/voting/finalize`.
- `POST /api/rooms/:slug/active-story`: Select or clear active story.
- `PUT /api/rooms/:slug/point-references`: Update point references.
- `PATCH /api/rooms/:slug/edge-cases/:id`: Toggle edge case checklist.
- `POST /api/rooms/:slug/backlog/import`, `POST /api/rooms/:slug/backlog/markdown`, `PUT /api/rooms/:slug/backlog/order`, `DELETE /api/rooms/:slug/backlog/:id`.
- `POST /api/rooms/:slug/tracker/connect`, `POST /api/rooms/:slug/tracker/disconnect`, `POST /api/rooms/:slug/tracker/test`, `POST /api/rooms/:slug/tracker/fetch`, `POST /api/rooms/:slug/tracker/sync`, `POST /api/rooms/:slug/tracker/slices`.
- Implemented `dispatch_command` helper with sender identification via `X-Participant-ID` header.
- Verified with integration tests in [`server/tests/rest_command_tests.rs`](file:///home/widi/GitHub/scrum-poke-ai/server/tests/rest_command_tests.rs).
