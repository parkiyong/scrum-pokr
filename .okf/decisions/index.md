# Architectural Decision Records (ADRs)

This section records significant architectural decisions, trade-offs, and design rationales for Scrum Pokr AI.

## Decisions

* [ADR-001: In-Memory Tokio Actor State](/decisions/ADR-001-in-memory-tokio-actor-state.md) — Why active poker room states live entirely in memory.
* [ADR-002: Server-Enforced Reveal Gate](/decisions/ADR-002-server-enforced-reveal-gate.md) — Why vote masking is enforced at the JSON serialization layer.
* [ADR-003: Single 6-Character Room Code Format](/decisions/ADR-003-single-6-char-room-code.md) — Why the system standardizes on a single unified code format (`SWB-42`).
* [ADR-004: Docker Compose for Local pgvector Infrastructure](/decisions/ADR-004-docker-compose-pgvector-infrastructure.md) — Why Docker Compose is used for local vector database provisioning and container deployment.
* [ADR-005: Unified Issue Tracker Integration & 2-Way Sync](/decisions/ADR-005-unified-issue-tracker-sync.md) — Architecture for multi-provider tracker integration (Linear, GitHub, Jira) with ephemeral credentials.
