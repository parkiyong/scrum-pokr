# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Multi-format backlog ingestion (Markdown checkboxes, CSV/TSV, JSON arrays).
- 1-Click Clipboard table export for finalized story points.
- Pre-vote Story Doctor quality gate with INVEST scorecards and edge-case generators.
- PostgreSQL `pgvector` semantic reference matcher for historical story baselines.
- SPIDR vertical slicer and neutral divergence analysis prompts.
- Team estimation profile and longitudinal calibration curves.

---

## [0.1.0] - 2026-08-22

### Added
- **Zero-Auth Room Creation**: Instant room generation with 6-character short codes (`AAA-99`) and custom code overrides.
- **In-Memory Tokio State Machine**: High-throughput `RoomActor` managing estimation transitions (`Idle` → `Voting` → `Revealed` → `Finalized`).
- **Server-Enforced Reveal Gate**: Protocol-level vote masking projecting peer votes as `has_voted: bool` until cards are revealed.
- **3D Felt Poker Arena**: React 18 frontend with realistic green felt table, 3D flip card animations, and outlier spread detection.
- **Session Continuity**: Automatic `localStorage` participant session recovery on disconnect or page refresh.
- **Facilitator Failover**: Automatic authority promotion to senior connected estimator on facilitator disconnect.
- **Local Infrastructure**: Docker Compose configuration for PostgreSQL with `pgvector` extension and multi-stage container build.
- **Documentation Suite**: Standardized `README.md`, `USER_GUIDE.md`, `DEVELOPER_GUIDE.md`, and `CONTRIBUTING.md`.
