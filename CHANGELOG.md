# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Custom themes and visual customization.
- Integration connectors for external issue trackers (Linear, Jira, GitHub).
- Sound effects and celebratory haptics on consensus rounds.

---

## [0.1.0] - 2026-08-25

### Added
- **Full-Stack TypeScript Architecture**: Unified monorepo powered by Hono (`@hono/node-server`), React 18, Tailwind CSS, and shared domain models (`@scrumpokr/shared`).
- **Zero-Auth Room Lifecycle**: Instant room creation with 6-character short codes (`AAA-99`) and custom code overrides.
- **Pure In-Memory State Machine**: High-throughput `RoomActor` state machine managing 4-phase estimation lifecycles (`Idle` → `Voting` → `Revealed` → `Finalized`) and automatic 4-hour inactivity TTL cleanup.
- **Server-Sent Events (SSE) & REST**: Real-time event streaming (`streamSSE`) with 15-second heartbeat keep-alives and typed REST command dispatch via `@hono/zod-validator`.
- **Server-Enforced Reveal Gate**: Protocol-level vote masking (`maskRoomStateForParticipant`) projecting peer votes as `has_voted: bool` until cards are revealed.
- **3D Felt Poker Arena**: Realistic central felt poker table with 3D flip card animations, consensus percentage indicators, and outlier spread calculation.
- **In-Room Backlog Management**: Interactive backlog drawer with story creation (title, description, acceptance criteria), story activation, reordering, and 1-click Markdown / CSV exports.
- **Flexible Deck Presets & Custom Scales**: Support for Fibonacci, Modified Fibonacci, T-Shirt sizes, Powers of 2, and custom scale configurations via `DeckConfigModal`.
- **Participant Roles & Facilitator Failover**: Support for voting and non-voting Facilitators, Estimators, and Observers with automatic facilitator failover on disconnect.
- **Session Recovery**: Seamless `localStorage` identity and vote recovery on page refresh or reconnection.
- **Documentation Suite**: Synchronized `README.md`, `USER_GUIDE.md`, `DEVELOPER_GUIDE.md`, `CONTEXT.md`, and `CONTRIBUTING.md`.
