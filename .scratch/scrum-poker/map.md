## Destination

A complete, buildable Product & System Specification in `.scratch/scrum-poker/spec.md` covering PRD requirements, UX wireframe states, a Rust real-time backend architecture (Tokio/Axum + WebSockets + PostgreSQL/pgvector), zero-auth room lifecycle, standalone story ingestion/export (Markdown, CSV, JSON), and exact schemas/prompts for all 7 AI advisory capabilities.

## Notes

- Effort: Scrum Poker AI
- Tech Stack: Rust (Axum/Tokio) backend + WebSockets, PostgreSQL + pgvector, React web client.
- Auth Model: Zero-auth (room code / session token based, nickname entry, facilitator token).
- Integration Model: Standalone (no external issue tracker dependencies; manual creation, Markdown/CSV/JSON bulk import, Markdown export).
- AI Policy: Advisory only; AI never votes; suggestions and divergence analyses strictly gated behind the server-enforced Reveal Gate. No individual developer scoring surfaces.
- Issue Tracker: Local markdown under `.scratch/scrum-poker/`.
- Relevant Skills: `domain-modeling`, `grilling`, `prototype`, `research`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Zero-Auth Session & Room State Lifecycle](decisions/01-zero-auth-room-lifecycle.md): Human-readable slugs + 6-char codes, socket-bound facilitator promotion on disconnect, localStorage participant IDs for seamless reconnects, and pure in-memory Tokio room actors.
- [Rust Real-time WebSocket Protocol & State Machine](decisions/02-rust-websocket-state-machine.md): 7-phase estimation state machine in Tokio/Axum, state-dependent serializer projections enforcing server-side reveal gate, and tagged JSON enum contracts.
- [Story Doctor & Point Reference Library Specs](decisions/04-story-doctor-and-reference-library.md): INVEST audit scoring with non-blocking review banner, 3-axis complexity summary (Data/APIs/Blast Radius), 4-category interactive edge-case checklist, and customizable sidebar benchmark cards.
- [Divergence Analyzer & Vertical Slicer Prompt Contracts](decisions/06-divergence-analyzer-and-vertical-slicer.md): 5-category vote classifier, strictly neutral divergence axis synthesis, supportive outlier spotlight, and SPIDR-based vertical slicing with one-click queue insertion.
- [Frontend UX State Flows & Wireframe Specifications](decisions/08-frontend-ux-and-wireframes.md): 3-column Hybrid Command Center + Poker Arena layout, 3D card reveal animations, and responsive desktop/tablet/mobile flows.
- [Unified Issue Tracker Integration & 2-Way Sync](decisions/03-linear-sync-contract.md): Multi-provider adapter architecture (Linear, GitHub, Jira), ephemeral in-memory Facilitator credentials, 2-way estimate writeback, and SPIDR slice sub-issue push.
- [Standalone Story Management & Ingestion/Export Formats](decisions/10-standalone-story-management.md): Multi-format parser (Markdown/CSV/JSON) with visual staging preview, 1-click Markdown clipboard export, and PostgreSQL historical embedding indexing.
- [Reference Matcher & Embedding Architecture](decisions/05-reference-matcher-and-embeddings.md): 1536-dim pgvector cosine similarity index, similarity-weighted Fibonacci mapping, Point Reference Library auto-seeding, and background reveal gate confinement.
- [Team Estimation Profile & Rolling Calibration Model](decisions/07-team-estimation-profile-and-calibration.md): Strict privacy boundary excluding individual metrics, 4 core health metrics (Velocity Band, Consensus Rate, Slicing Rate, Category Bias), and 50-story decaying calibration window.
- [Spec Synthesis & Hand-off Document Assembly](decisions/09-spec-synthesis-and-handoff.md): Synthesis of canonical Product & System Specification in `.scratch/scrum-poker/spec.md` ready for implementation.

## Not yet specified

<!-- see "Fog of war": in-scope fog you can't ticket yet; graduates as the frontier advances -->

- Real-time offline PWA capabilities & push notifications for async estimators.
- Custom localized embedding model evaluation and private LLM inference endpoints.
- In-room audio/video WebRTC breakout channels for outlier debriefs.

## Out of scope

<!-- see "Out of scope": work ruled beyond the destination; closed, never graduates -->

- Individual developer performance metrics / velocity leaderboards (strictly omitted to preserve team psychological safety).
- Autonomous AI voting (AI casting story points or participating as an estimator).
- Enterprise SSO / centralized user directory accounts (ruled out by zero-auth requirement).
