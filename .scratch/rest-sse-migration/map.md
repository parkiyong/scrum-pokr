# Map: REST + SSE Migration

## Destination

A complete and clean replacement of the real-time WebSocket protocol with standard HTTP REST endpoints for client commands and Server-Sent Events (SSE) for server-to-client broadcasts, while fully preserving the Server-Enforced Reveal Gate security invariants and seamless UX.

## Notes

- Operating on dedicated branch: `feat/rest-sse-migration`
- Invariants to preserve:
  - **Server-Enforced Reveal Gate** ([`ADR-002`](file:///home/widi/GitHub/scrum-poke-ai/.okf/decisions/ADR-002-server-enforced-reveal-gate.md)): Peer vote values must remain masked from network payloads during the `Voting` phase.
  - **Zero-Auth Handshake**: Reconnecting/rejoining clients must restore state seamlessly using their cached participant profile.
  - **Facilitator Failover**: Disconnects must trigger facilitator promotion to active participants.
  - **Zero React UI breakage**: The public signature of `useRoomSocket` (or alias `useRoomStream`) must remain unchanged so existing React views require no refactoring.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Implement Axum SSE Route and Event Broadcast Stream](issues/01-sse-handler.md): Added `/api/rooms/:slug/events` SSE streaming endpoint with Reveal Gate projection and 15s keep-alive heartbeats.
- [Implement Axum REST Command Endpoints](issues/02-rest-commands.md): Added 22 REST endpoints for room state queries, participant lifecycle, voting phases, story selection, backlog operations, and issue tracker synchronization.
- [SSE Stream Lifecycle & Disconnect Presence Detection](issues/03-presence-and-disconnect.md): Implemented `DisconnectGuard` on SSE streams to automatically trigger participant disconnect and Facilitator failover on stream drops, plus `POST /api/rooms/:slug/leave`.
- [React Client Hook Migration to EventSource and REST](issues/04-client-hook-migration.md): Refactored `useRoomSocket` to subscribe to Server-Sent Events via `EventSource` and dispatch actions over HTTP `fetch`, preserving component interfaces and passing all Vitest suites.
- [End-to-End REST & SSE Integration Test Suite](issues/05-integration-test-suite.md): Replaced legacy WebSocket integration tests with `rest_sse_integration_tests.rs`, fully purged WebSocket crates/modules, and updated developer guides.

## Not yet specified

- **Handling concurrent HTTP/1.1 browser connection limits**: Assessing if SSE multiplexing over HTTP/2 needs special fallback documentation for older proxies.
- **Client reconnect backoff**: Fine-tuning exponential backoff intervals on client `EventSource` onerror handlers.

## Out of scope

- WebTransport / QUIC implementation (not required for standard browser REST/SSE compliance).
- Persistent database storage for in-memory active rooms (governed by [`ADR-001`](file:///home/widi/GitHub/scrum-poke-ai/.okf/decisions/ADR-001-in-memory-tokio-actor-state.md)).
