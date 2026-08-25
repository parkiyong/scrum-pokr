## Destination

A complete, clean refactoring plan and architecture specification in `.scratch/basic-scrum-poker/spec.md` to strip AI advisory layers and external issue tracker integrations from the codebase, establishing a lean, standalone, zero-database, pure in-memory Basic Scrum Poker application with Hono (REST + SSE), React/Vite, configurable decks, in-room story queue, and server-enforced Reveal Gate.

## Notes

- Effort: Basic Scrum Poker (No AI, No Tracker Integrations)
- Destination Type: Refactoring Roadmap & Architecture Specification
- Tech Stack: TypeScript Monorepo (Hono REST + SSE backend, React 18 / Vite / Tailwind client, Shared domain reducer).
- Storage & Persistence: Pure in-memory ephemeral rooms with TTL expiry (zero database, zero Docker/Postgres/pgvector requirements).
- Real-time Sync: Server-Sent Events (SSE) for unidirectional room state broadcast + Hono REST / RPC actions.
- Issue Tracker: Local markdown under `.scratch/basic-scrum-poker/`.
- Domain Terms: Facilitator, Estimator, Observer, Room, Story, Deck, Reveal Gate (per `CONTEXT.md`).
- Relevant Skills: `domain-modeling`, `grilling`, `prototype`, `research`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Shared Domain Model & Reducer Slimming](decisions/01-shared-domain-slimming.md): Excised AI/tracker types, 4-phase estimation lifecycle, first-class `DeckConfig` presets, 16 canonical reducer actions, and server-side Reveal Gate masking.
- [Server Decoupling & Pure In-Memory Room Registry](decisions/02-server-decoupling-inmemory-architecture.md): Zero database/AI dependencies, in-memory RoomActor with participant presence and failover, and 4-hour TTL sweeper eviction.

## Not yet specified

<!-- see "Fog of war": in-scope fog you can't ticket yet; graduates as the frontier advances -->

- Reconnection token expiration & heartbeats for long-idle estimators.
- Room-level customizable deck presets persisted to local browser storage.
- Facilitator handover protocol on browser tab closure without refresh.

## Out of scope

<!-- see "Out of scope": work ruled beyond the destination; closed, never graduates -->

- AI Story Doctor, Reference Matcher, Divergence Analyzer, Vertical Slicer (all AI capabilities removed).
- External issue tracker integrations (Jira, Linear, GitHub 2-way sync removed).
- Persistent relational database / pgvector embeddings / Drizzle migrations.
- Enterprise SSO or user authentication accounts.
