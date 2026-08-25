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

Single-context (`CONTEXT.md` at root and ADRs in `docs/adr/`). See `docs/agents/domain.md`.

---

## Documentation Structure, Standards & Formats

This repository organizes documentation following standard open-source frameworks to maintain high signal-to-noise ratio and prevent documentation drift.

### 1. Diátaxis Documentation Framework

Documentation is separated across the 4 Diátaxis quadrants:

* **Tutorials (Learning-Oriented)**:
  * [`README.md`](README.md): Project overview, core highlights, and 3-step quick start.
* **How-To Guides (Task/Operation-Oriented)**:
  * [`USER_GUIDE.md`](USER_GUIDE.md): End-user and Facilitator room creation, voting, and multi-browser testing recipes.
  * [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md): Developer operational workflows (Docker provisioning, Hono / Vite servers, test execution, linting).
* **Reference (Information/Contract-Oriented)**:
  * [`docs/JAVA_MIGRATION_RECOMMENDATION.md`](docs/JAVA_MIGRATION_RECOMMENDATION.md): Reference evaluation for SSE + REST message schemas, endpoints, and architecture.
* **Explanation (Understanding/Rationale-Oriented)**:
  * [`CONTEXT.md`](CONTEXT.md): Authoritative domain glossary and terminology boundaries.
  * [`.scratch/basic-scrum-poker/decisions/`](.scratch/basic-scrum-poker/decisions/): Architectural Decision Records (ADRs).

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
* **Pane Recommendations**: Prompt the user to start long-running services in a separate Herdr pane (e.g., `npm run dev`, `npm test`, or `docker compose logs -f`) so Herdr can monitor process health and idle/active states directly.

### 3. Worktree & File Safety
* Whenever advising parallel agent sessions in separate Herdr panes, always specify separate Git worktrees (e.g., `.worktrees/<feature-name>`) to prevent concurrent file editing conflicts.

