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

GitHub Issues and pull requests.

### Triage labels

Default triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).

### Domain docs

Single-context (`CONTEXT.md` at root and ADRs in `docs/adr/`).

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
* **Explanation (Understanding/Rationale-Oriented)**:
  * [`CONTEXT.md`](CONTEXT.md): Authoritative domain glossary and terminology boundaries.
  * [`docs/adr/`](docs/adr/): Architectural Decision Records (ADRs).

---

### 2. Contributing & Repository Health Standards

* [`CONTRIBUTING.md`](CONTRIBUTING.md): Outlines the TDD (Red-Green-Refactor) workflow, conventional commit formatting, and the **Two-Axis PR Review Checklist** (Axis 1: Code Quality & Lints; Axis 2: Spec & Reveal Gate Invariant Adherence).
* **Branch Policy**: The `main` branch is strictly **read-only**. Always pull the latest `origin/main` before branching out or creating a worktree, and never commit directly to `main`.
* All agents and contributors must strictly enforce domain terms from [`CONTEXT.md`](CONTEXT.md) (*Facilitator*, *Estimator*, *Observer*, *Story*, *Deck*, *Reveal Gate*).
