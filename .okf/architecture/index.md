# Architecture Concepts

This section covers the core backend and frontend architecture of Scrum Pokr AI.

## Concepts

* [Tokio In-Memory Actor Model](/architecture/tokio-in-memory-actor-model.md) — Asynchronous state machine managing room state in-memory.
* [Multi-Room Registry](/architecture/multi-room-registry.md) — Thread-safe routing and lifecycle manager for all active poker rooms.
* [React Arena Client](/architecture/react-arena-client.md) — Frontend 3-column layout, 3D felt table arena, EXP Light Mode theme, and real-time WebSocket hook.
* [Local Infrastructure & Docker](/architecture/local-infrastructure-and-docker.md) — Containerized local PostgreSQL + pgvector database and multi-stage container deployment.
