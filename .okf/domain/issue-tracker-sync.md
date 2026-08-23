---
type: Domain Model
title: Unified Issue Tracker Sync & Backlog Ingestion
description: Integrated 2-way backlog synchronization with Linear, GitHub, and Jira, alongside SPIDR story decomposition.
tags:
  - domain
  - issue-tracker
  - linear
  - github
  - jira
  - spidr
resource: file:///server/src/domain/tracker.rs
generated:
  by: human:developer
  at: "2026-08-23T12:06:00Z"
status: stable
sources:
  - id: tracker-domain
    resource: /server/src/domain/tracker.rs
    title: Tracker Adapter Trait & Backlog Engine
  - id: markdown-parser
    resource: /server/src/domain/markdown_parser.rs
    title: Markdown Ingestion & SPIDR Parser
  - id: adr-005
    resource: /.okf/decisions/ADR-005-unified-issue-tracker-sync.md
    title: ADR-005 Unified Issue Tracker Sync
---

# Unified Issue Tracker Sync & Backlog Ingestion

Scrum Pokr AI supports 2-way backlog integration with popular project management trackers (Linear, GitHub Issues, Jira) as well as raw Markdown backlog ingestion.

## Supported Adapters & Integration Modes

| Provider | Authentication | Sync Capability | Features |
| :--- | :--- | :--- | :--- |
| **Linear** | Personal Access Token / OAuth | 2-Way Sync | Fetch team backlogs, update story points upon estimation finalization |
| **GitHub Issues** | Personal Access Token | 2-Way Sync | Fetch open repository issues, append estimate metadata/labels |
| **Jira** | API Token & Domain URL | 2-Way Sync | Ingest sprint issues, sync story points back to custom fields |
| **Markdown** | Direct Copy / File Upload | Ingestion & Slice | Parse Markdown stories into backlog items; apply SPIDR breakdown |

## Backlog Drawer & SPIDR Story Breakdown

1. **Backlog Ingestion**: Facilitators connect their issue tracker or paste markdown content via `ConnectTrackerModal`.
2. **SPIDR Decomposition**: High-complexity or unestimated stories can be decomposed into smaller actionable slices using the SPIDR framework (Spike, Path, Interface, Data, Rules) via `SPIDRSliceModal`.
3. **2-Way Estimate Writeback**: When an estimation round is finalized by the Facilitator, the agreed story points are automatically synced back to the source tracker issue.
