# Contributing to Scrum Pokr AI

> Development workflows, coding standards, issue tracker conventions, and pull request procedures for **Scrum Pokr AI**.

📖 [User Guide](USER_GUIDE.md) · 🛠️ [Developer Guide](DEVELOPER_GUIDE.md) · 🤝 [Contributing](CONTRIBUTING.md) · 📋 [Product Spec](.scratch/basic-scrum-poker/spec.md)

---

## Table of Contents

1. [Ground Rules & Principles](#1-ground-rules--principles)
2. [Getting Started](#2-getting-started)
3. [Development Workflow](#3-development-workflow)
4. [Quality Verification & Testing](#4-quality-verification--testing)
5. [Pull Request & Two-Axis Code Review](#5-pull-request--two-axis-code-review)
6. [Architectural Decisions (ADRs)](#6-architectural-decisions-adrs)
7. [Code of Conduct](#7-code-of-conduct)

---

## 1. Ground Rules & Principles

> [!IMPORTANT]
> All contributions must adhere to the following non-negotiable principles:

1. **Strict Domain Vocabulary**:
   - We maintain a single source of truth for all domain concepts in [CONTEXT.md](CONTEXT.md).
   - Use **Facilitator** (never host/admin), **Estimator** (never voter/player), **Observer** (never spectator), **Story** (never task/ticket), **Deck** (never card set), and **Reveal Gate** (never flip lock).
2. **Server-Enforced Reveal Gate Invariant**:
   - The platform's cognitive bias prevention relies on server-enforced reveal gates. Code that serializes unrevealed peer votes prematurely will be rejected.
3. **Tracer-Bullet Vertical Slices**:
   - All major features are built end-to-end as runnable tracer bullets that touch the domain model, reducer, Hono routes, and React UI in thin, test-driven slices.

---

## 2. Getting Started

1. **Review Key Documentation**:
   - Read [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for architecture, environment setup, and testing.
   - Read [USER_GUIDE.md](USER_GUIDE.md) to understand end-user interaction models.
   - Read [CONTEXT.md](CONTEXT.md) for domain terminology.
2. **Check the Local Issue Tracker**:
   - Active development issues and dependencies are tracked locally in `.scratch/basic-scrum-poker/issues/`.
   - Tickets declare explicit blockers (`Blocked by:`). Pick up unblocked tickets labeled `ready-for-agent` or `ready-for-human`.

---

## 3. Development Workflow

### 3.1 Branching Strategy

- `main`: Production-ready, always passing tests. Strictly read-only (never commit directly to `main`). Always pull latest `origin/main` before branching out or creating a worktree.
- Feature branches: `feat/<issue-number>-<short-description>` (e.g. `feat/05-in-room-backlog`)
- Fix branches: `fix/<issue-number>-<short-description>` (e.g. `fix/08-card-flip-overlap`)

### 3.2 Test-Driven Development (TDD)

We practice test-first development for all state transitions, message protocols, and UI components:
1. **Red**: Write a failing unit or integration test defining the new invariant or behavior.
2. **Green**: Implement the minimum code required to make the test pass.
3. **Refactor**: Clean up the design while ensuring all tests remain green.

### 3.3 Commit Message Guidelines

Use conventional commit messages with clear scope and rationale:

```
feat(reducer): add story reordering and active story selection
fix(events): prevent premature SSE stream termination on reconnect
test(gate): verify peer votes masked during voting phase
docs(dev): update local dev and testing instructions
```

---

## 4. Quality Verification & Testing

Before opening a pull request, run all verification suites locally:

```bash
# 1. Run all unit and integration tests across workspaces
npm test

# 2. Run type checking and production builds
npm run build

# 3. Test individual workspaces if needed
npm run test:shared
npm run test:server
npm run test:client
```

---

## 5. Pull Request & Two-Axis Code Review

All PRs are reviewed against two independent axes before merging:

### Axis 1: Standards & Code Quality
- [ ] TypeScript type checks pass without errors (`npm run build`).
- [ ] Pure deterministic reducer logic in `@scrumpokr/shared` with immutable state updates.
- [ ] Responsive UI: Verified across Desktop (≥1024px), Tablet (768–1023px), and Mobile (<768px).
- [ ] Error resilience: Graceful fallbacks for network reconnects, SSE aborts, or room not found.

### Axis 2: Spec & Invariant Adherence
- [ ] Reveal Gate invariant: No unmasked card values leaked in `Voting` state across REST/SSE state broadcasts.
- [ ] Domain terminology adheres strictly to [CONTEXT.md](CONTEXT.md).
- [ ] Acceptance criteria in the corresponding `.scratch/` ticket are fully satisfied.
- [ ] Automated tests accompany every new behavior.

---

## 6. Architectural Decisions (ADRs)

If a change introduces a significant architectural shift, new dependency, or protocol alteration:
1. Propose and document the decision in `.scratch/basic-scrum-poker/decisions/` or `docs/adr/`.
2. Follow the established ADR format (Context, Decision, Consequences, Invariants).
3. Update [spec.md](.scratch/basic-scrum-poker/spec.md) and [CONTEXT.md](CONTEXT.md) accordingly.

---

## 7. Code of Conduct

Be respectful, constructive, and supportive in all interactions, code reviews, and issue discussions.
