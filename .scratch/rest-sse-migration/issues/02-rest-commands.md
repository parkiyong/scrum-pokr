Title: Implement Axum REST Command Endpoints
Status: open
Type: task
Blocked by: 01

## Question

How should we structure and implement the Axum REST endpoints in `server/src/routes.rs` for room management, voting, participant roles, backlog management, and tracker operations, dispatching `RoomCommand::ClientMsg` directly to the `RoomActor`?
