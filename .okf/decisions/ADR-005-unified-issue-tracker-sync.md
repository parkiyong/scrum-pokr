---
type: Architectural Decision Record
title: "ADR-005: Unified Issue Tracker Integration & 2-Way Sync"
description: Architectural design for multi-provider issue tracker integration (Linear, GitHub, Jira) with zero-auth ephemeral token handling and 2-way writeback.
status: stable
supersedes: ".scratch/scrum-poker/decisions/03-linear-sync-contract.md"
tags:
  - decision
  - adr
  - rust
  - integration
  - linear
  - github
  - jira
generated:
  by: antigravity/2.0
  at: "2026-08-22T19:58:00Z"
sources:
  - id: tracker-sync
    resource: /.scratch/scrum-poker/decisions/03-linear-sync-contract.md
    title: "Unified Issue Tracker Integration Decision (superseded)"
---

# ADR-005: Unified Issue Tracker Integration & 2-Way Sync

## Context

> **Supersedes:** [`.scratch/scrum-poker/decisions/03-linear-sync-contract.md`](../../.scratch/scrum-poker/decisions/03-linear-sync-contract.md) — that decision recorded the Linear integration as out-of-scope pending further research. This ADR formally reverses that decision and establishes the unified adapter architecture.

Scrum Poker teams use diverse external issue trackers (Linear, GitHub Issues, Jira Cloud) to manage their product backlogs. Manually copying and pasting stories into the estimation arena or typing story points back into external systems causes friction and human error. However, Scrum Pokr AI is designed around a **zero-auth model** without persistent user accounts or stored secrets.

## Decision

1. **Unified Trait (`IssueTrackerAdapter`)**:
   We define a generic asynchronous Rust trait in the backend that abstracts all tracker operations (`fetch_backlog`, `sync_estimate`, `post_summary_comment`, `push_slices`).
2. **Implementation Phasing**:
   - Deliver the unified trait architecture + full live **Linear GraphQL** client in the first phase.
   - Provide complete mock adapter test harnesses for **GitHub Issues** and **Jira Cloud**, followed immediately by live clients.
3. **Zero-Auth Ephemeral Credentials**:
   - The Facilitator enters their Personal Access Token (PAT) / API Key in an interactive "Connect Tracker" modal with a live "Test Connection" step.
   - Credentials are held strictly in Tokio actor RAM and Facilitator `sessionStorage`. They are never written to disk or the database, and never broadcast over WebSockets to Estimators or Observers.
4. **Explicit Writeback & GitHub Handling**:
   - Finalizing a story presents an explicit "Sync Estimate to Tracker" action for the Facilitator before pushing points to the remote API.
   - For GitHub Issues (which lacks a native integer story points field), the adapter applies a `points: <N>` label (e.g. `points: 5`) and appends a summary discussion comment.
5. **SPIDR Slice Mapping**:
   - When the SPIDR vertical slicer decomposes a story, accepting slices immediately calls `push_slices` on the active adapter to create child sub-issues linked to the parent story.

## Consequences

* **Positive**: Clean separation of tracker concerns behind a single trait; zero friction for teams with no manual copy-pasting; strict credential isolation preserving zero-auth security.
* **Negative**: Ephemeral tokens must be re-entered if the room completely closes; provider-specific rate limits apply to the Facilitator's token.
