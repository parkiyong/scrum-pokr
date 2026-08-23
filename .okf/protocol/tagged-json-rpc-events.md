---
type: Protocol Specification
title: Tagged JSON RPC Events
description: Full WebSocket wire protocol specification for client commands and server broadcast events.
tags:
  - protocol
  - websocket
  - json-rpc
  - events
resource: file:///server/src/domain/protocol.rs
generated:
  by: antigravity/2.0
  at: "2026-08-22T02:40:00Z"
status: stable
sources:
  - id: protocol-src
    resource: /server/src/domain/protocol.rs
    title: Protocol Source
---

# Tagged JSON RPC Events

All WebSocket communication between client and server uses Serde internally tagged JSON RPC structures (`{ "type": "...", "payload": { ... } }`).

## Client Commands (`ClientCommand`)

| Command `type` | Payload Fields | Description |
| :--- | :--- | :--- |
| `JoinRoom` | `participant_id`, `nickname`, `avatar`, `role?` | Registers or reconnects a participant session. |
| `SelectStory` | `story?: Story \| null` | Facilitator selects active backlog item (or null to clear active_story selection). |
| `StartVoting` | *None* | Facilitator initiates private voting phase. |
| `CastVote` | `value: string` | Estimator submits a Fibonacci point choice. |
| `RetractVote` | *None* | Estimator cancels/retracts their pending vote. |
| `RevealCards` | *None* | Facilitator unlocks Reveal Gate and exposes cards. |
| `TriggerReVote` | *None* | Facilitator starts a subsequent round for the same story. |
| `FinalizeStory` | `points?: string` | Facilitator commits the final estimate. |
| `UpdateRole` | `target_id`, `new_role` | Modifies participant role (`Estimator` / `Observer`). |
| `TransferFacilitator`| `target_id` | Transfers Facilitator authority to a peer. |
| `Ping` | *None* | Heartbeat health check. |

## Server Events (`ServerEvent`)

| Event `type` | Payload Fields | Description |
| :--- | :--- | :--- |
| `RoomSnapshot` | `state: RoomSnapshotData` | Comprehensive personalized room state. |
| `ParticipantJoined` | `participant_id`, `nickname`, `avatar`, `role` | Notification of a new or reconnected peer. |
| `ParticipantLeft` | `participant_id` | Notification of socket disconnection. |
| `VoteCast` | `participant_id` | Peer vote readiness indicator (value withheld). |
| `VoteRetracted` | `participant_id` | Peer vote retracted indicator. |
| `CardsRevealed` | `votes: Record<string, string>`, `distribution` | Broadcast of unmasked votes & consensus. |
| `RoundReset` | `round_number: number` | Round increment notification. |
| `StoryFinalized` | `story_id?`, `points` | Estimate locked confirmation. |
| `FacilitatorChanged`| `facilitator_id` | Notification of Facilitator authority change. |
| `Pong` | *None* | Heartbeat response. |
