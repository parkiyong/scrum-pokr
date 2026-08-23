---
title: Agent Instructions
description: Operational rules, governance policies, and workflows for AI agents.
type: governance
status: stable
---

# Agent Instructions

## Branch Policy

* **Read-Only `main` Branch**: The `main` branch is strictly **read-only**. Agents and contributors must never commit directly to `main`. Always create and work on dedicated feature or fix branches (e.g., `feat/<issue-number>-<short-description>`, `fix/<issue-number>-<short-description>`).
* **Sync Before Branching**: Always pull the latest `main` branch from `origin` (e.g., `git checkout main && git pull origin main` or `git fetch origin main`) before branching out or creating a git worktree.

## Agent skills

### Issue tracker

Local markdown files in `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context (`CONTEXT.md` at root, ADRs in `.okf/decisions/` and `docs/adr/`). See `docs/agents/domain.md`.

---

## Documentation Structure, Standards & Formats

This repository organizes documentation following standard open-source frameworks to maintain high signal-to-noise ratio and prevent documentation drift.

### 1. Diátaxis Documentation Framework

Documentation is strictly separated across the 4 Diátaxis quadrants:

* **Tutorials (Learning-Oriented)**:
  * [`README.md`](README.md): Project overview, core highlights, and 3-step quick start.
* **How-To Guides (Task/Operation-Oriented)**:
  * [`USER_GUIDE.md`](USER_GUIDE.md): End-user and Facilitator room creation, voting, and multi-browser testing recipes.
  * [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md): Developer operational workflows (Docker `pgvector` provisioning, Cargo/Vite servers, test execution, linting).
* **Reference (Information/Contract-Oriented)**:
  * [`.okf/protocol/`](.okf/protocol/index.md): WebSocket tagged JSON RPC message schemas and payload contracts.
  * [`.okf/architecture/`](.okf/architecture/index.md): Technical subsystem models (Tokio actors, React client, Docker stack).
* **Explanation (Understanding/Rationale-Oriented)**:
  * [`CONTEXT.md`](CONTEXT.md): Authoritative domain glossary and terminology boundaries.
  * [`.okf/domain/`](.okf/domain/index.md): Estimation phases, consensus calculations, and participant role models.
  * [`.okf/decisions/`](.okf/decisions/index.md): Architectural Decision Records (ADRs).

---

### 2. Open Knowledge Format (OKF v0.2) Standard

The [`.okf/`](.okf/index.md) bundle serves as the **canonical single source of truth** for all architectural and domain concepts.

* **Hard Conformance Rule**: Every non-reserved `.md` file must contain valid YAML frontmatter with a non-empty `type` field.
* **Standard Metadata**: Use `title`, `description`, `status` (`draft` | `stable` | `deprecated`), `generated` (`by`, `at`), `sources` (`id`, `resource`, `title`), and `tags`.
* **Reserved Files**:
  * `index.md`: Directory tree navigation (bundle root includes `okf_version: "0.2"`).
  * `log.md`: ISO-dated chronological change history (newest first).
* **Anti-Drift Rule**: Operational guides (`DEVELOPER_GUIDE.md`, `USER_GUIDE.md`) must link to `.okf/` concepts rather than inlining duplicate architectural or protocol explanations.

---

### 3. Markdown Architectural Decision Records (MADR)

Significant technical decisions and trade-offs are documented under [`.okf/decisions/`](.okf/decisions/index.md) using the MADR standard:
* **Naming**: `ADR-XXX-<short-slug>.md`
* **Structure**: `Context` → `Decision` → `Consequences` (Positive & Negative) → `Sources & Invariants`.

---

### 4. Contributing & Repository Health Standards

* [`CONTRIBUTING.md`](CONTRIBUTING.md): Outlines the TDD (Red-Green-Refactor) workflow, conventional commit formatting, and the **Two-Axis PR Review Checklist** (Axis 1: Code Quality & Lints; Axis 2: Spec & Reveal Gate Invariant Adherence).
* **Branch Policy**: The `main` branch is strictly **read-only**. Always pull the latest `origin/main` before branching out or creating a worktree, and never commit directly to `main`.
* All agents and contributors must strictly enforce domain terms from [`CONTEXT.md`](CONTEXT.md) (*Facilitator*, *Estimator*, *Observer*, *Story*, *Deck*, *Reveal Gate*).

---

## Terminal & Agent Orchestration (Herdr Workflow)

This project uses **Herdr** as the terminal multiplexer for managing concurrent agent sessions and long-running tasks.

### 1. Parallel Task Decomposition
* **Avoid Silent Background Subagents for Major Tasks**: For complex sub-tasks, parallel investigations, or independent feature tracks, do not spawn silent internal subagents. Instead, break the work down into modular, self-contained tasks.
* **Format for Pane Handoff**: When a sub-task is suitable for parallel execution, provide:
  1. A clear command or prompt ready to copy-paste into a new `agy` session in a new Herdr pane.
  2. The target working branch or Git worktree directory to operate in.
  3. The expected output or contract needed by the primary session.

### 2. Long-Running Processes & Watchers
* **Externalize Servers and Watchers**: Do not run blocking servers (e.g. dev servers, file watchers, continuous test runners) as background CLI tasks in the primary session.
* **Pane Recommendations**: Prompt the user to start long-running services in a separate Herdr pane (e.g., `cargo watch`, `npm run dev`, or `docker compose logs -f`) so Herdr can monitor process health and idle/active states directly.

### 3. Worktree & File Safety
* Whenever advising parallel agent sessions in separate Herdr panes, always specify separate Git worktrees (e.g., `.worktrees/<feature-name>`) to prevent concurrent file editing conflicts.

