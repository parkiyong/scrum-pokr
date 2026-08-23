# 02: Unified Issue Tracker Integration & 2-Way Backlog Sync (Linear, GitHub, Jira)

**What to build:** Direct system integration with external issue trackers via a unified `IssueTrackerAdapter` in Rust (Axum/Tokio) and React UI. Facilitators can connect their workspace using ephemeral credentials (Linear API Key, GitHub PAT, or Jira API Token) held only in-memory in the room actor session. The room can fetch backlog stories by Sprint, Cycle, Milestone, or Project, sync the active story in real time to all estimators, and write back finalized consensus estimates directly to the tracker API upon round completion.

**Blocked by:** 01 (Core Real-Time Poker Arena)

**Status:** resolved

## Acceptance criteria

- [x] Rust backend defines unified `IssueTrackerAdapter` trait (`fetch_backlog`, `sync_estimate`, `post_summary_comment`, `push_slices`).
- [x] Provider adapter implementation:
  - **Linear Client**: Live GraphQL client implementation (`api.linear.app/graphql`) for team/cycle queries, estimate mutations, and sub-issue creation.
  - **GitHub & Jira Harnesses**: Mock and live adapter implementations validating unified trait compliance, contract isolation, and error handling.
- [x] Ephemeral Zero-Auth Security: Facilitator credentials (API tokens) reside strictly in Tokio actor memory and browser `sessionStorage`, never stored on disk/database or leaked to estimators/observers.
- [x] Facilitator "Connect Issue Tracker" modal featuring live "Test Connection" step that previews available Teams, Cycles, Projects, or Sprints before importing.
- [x] Backlog queue renders external issue keys (e.g. `ENG-123`, `#42`), titles, status, and external tracker link badges.
- [x] Selecting a story syncs the active story (title, description, acceptance criteria list, tracker URL) to all connected clients in real time.
- [x] Explicit 2-Way Sync: Finalizing a story presents an explicit Facilitator "Sync Estimate to Tracker" action that calls `sync_estimate` (including `points: <N>` label & comment for GitHub).
- [x] SPIDR Slice Mapping: Triggering slice creation calls `push_slices` on the active adapter to create child sub-issues linked to the parent story.
- [x] Full test coverage for unified adapter dispatch, mock error handling, credential isolation, and estimate writeback.

## Answer

Implemented the unified issue tracker architecture and real-time 2-way backlog sync:
- **Rust Backend**:
  - `server/src/domain/tracker.rs`: Defined `IssueTrackerAdapter` trait, `LinearAdapter` (live GraphQL client for `api.linear.app/graphql`), `GitHubAdapter` (REST API with `points: <N>` labels), `JiraAdapter` (REST v3 with custom story points field), and `MockTrackerAdapter` (thread-safe test harness).
  - `server/src/domain/markdown_parser.rs`: Smart parser for multi-format Markdown notes, extracting checklist acceptance criteria (`- [ ]`), and summary formatters for Markdown tables and CSV export.
  - `server/src/actor/room_actor.rs`: Ephemeral in-memory adapter session handling in Tokio RAM, real-time backlog queue management, story selection dispatch, 2-way estimate writeback (`SyncEstimateToTracker`), and SPIDR slice sub-issue generation (`PushStorySlices`).
  - `server/src/domain/reveal_gate.rs`: Strictly isolated public snapshot projections ensuring API keys/tokens are never leaked to Estimators or Observers.
- **React Client**:
  - `client/src/components/ConnectTrackerModal.tsx`: Modal supporting Linear, GitHub, Jira, and Markdown paste with live "Test Connection" step, team/cycle/milestone filtering, and browser `sessionStorage` caching.
  - `client/src/components/BacklogDrawer.tsx`: Collapsible drawer rendering external issue badges, titles, statuses, points, 1-click estimation selection, and Markdown/CSV clipboard export.
  - `client/src/components/SPIDRSliceModal.tsx`: Interactive vertical slicer mapping SPIDR child slices directly into remote tracker sub-tasks and appending to the live queue.
  - `client/src/components/FacilitatorBar.tsx` & `RoomView.tsx`: Facilitator 2-way sync controls and active story banner displaying issue keys, external tracker links, and acceptance criteria.
- **Testing**:
  - Full test suites across backend (`tracker_adapter_tests.rs`, `tracker_room_actor_tests.rs`, `markdown_parser_tests.rs`) and frontend (`ConnectTrackerModal.test.tsx`, `BacklogDrawer.test.tsx`, `FacilitatorBar.test.tsx`), with all 19 Rust tests and 17 Vitest tests passing cleanly.


